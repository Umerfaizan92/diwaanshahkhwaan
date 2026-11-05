import "server-only";
import type { BusinessSettings, Order } from "@/lib/db/schema";
import { formatCents } from "@/lib/domain/money";
import { formatDateLong } from "@/lib/domain/time";
import { formatTime12 } from "@/lib/domain/hours";

export type TemplateName =
  | "order_confirmed"
  | "order_accepted"
  | "order_ready"
  | "order_cancelled"
  | "order_refunded"
  | "order_partially_refunded"
  | "pickup_reminder"
  | "owner_new_order"
  | "test";

type Item = { name: string; quantity: number; lineTotalCents: number; options: { choice: string }[] };
export type TemplateData = { order: Order & { items: Item[] }; settings: BusinessSettings; orderUrl: string; adminUrl: string; extra: Record<string, unknown> };
export type Rendered = { subject: string; html: string; text: string; sms: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(s: BusinessSettings, preheader: string, heading: string, body: string, cta?: { href: string; label: string }) {
  const phones = s.contacts.map((c) => `<a href="tel:${esc(c.phone.replace(/\s/g, ""))}" style="color:#c9a24a;text-decoration:none">${esc(c.phone)}</a>`).join(" &nbsp;·&nbsp; ");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#f4efe6;font-family:Helvetica,Arial,sans-serif;color:#2a1d14">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4efe6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#17110d;padding:28px 32px;text-align:center">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:3px;color:#c9a24a">DSK</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#e7c873;margin-top:4px">${esc(s.businessName)}</div>
<div style="font-size:13px;color:#b9a88c;margin-top:4px">${esc(s.tagline)}</div>
</td></tr>
<tr><td style="padding:32px">
<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;margin:0 0 16px;color:#2a1d14">${esc(heading)}</h1>
${body}
${cta ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px"><tr><td style="border-radius:999px;background:#c9a24a"><a href="${esc(cta.href)}" style="display:inline-block;padding:13px 26px;font-weight:bold;color:#1a1209;text-decoration:none;border-radius:999px">${esc(cta.label)}</a></td></tr></table>` : ""}
</td></tr>
<tr><td style="padding:20px 32px;background:#faf6ef;font-size:13px;color:#6d5a45;line-height:1.6">
Questions? Call or text ${phones}<br>Pickup: ${esc(s.pickupArea)}${s.abn ? `<br>ABN ${esc(s.abn)}` : ""}
</td></tr></table></td></tr></table></body></html>`;
}

/** Receipt table: items, subtotal, GST and total, plus how it was or will be paid */
function itemsTable(o: TemplateData["order"]) {
  const rows = o.items
    .map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee4d3">${i.quantity} × ${esc(i.name)}${i.options.length ? `<br><span style="font-size:13px;color:#6d5a45">${esc(i.options.map((x) => x.choice).join(", "))}</span>` : ""}</td><td style="padding:8px 0;border-bottom:1px solid #eee4d3;text-align:right;white-space:nowrap">${formatCents(i.lineTotalCents)}</td></tr>`)
    .join("");
  const addOn = o.totalCents > o.subtotalCents;
  const small = (l: string, v: string) => `<tr><td style="padding:4px 0;font-size:14px;color:#6d5a45">${l}</td><td style="padding:4px 0;font-size:14px;color:#6d5a45;text-align:right">${v}</td></tr>`;
  const cash = o.paymentMethod === "CASH";
  const totalLabel = cash ? (o.paidAt ? "Total paid (cash)" : "Total to pay in cash at pickup") : "Total paid by card";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:15px;margin:16px 0">${rows}
${addOn ? small("Subtotal", formatCents(o.subtotalCents)) + small("GST (10%)", formatCents(o.gstCents)) : ""}
<tr><td style="padding:10px 0;font-weight:bold">${totalLabel}</td><td style="padding:10px 0;text-align:right;font-weight:bold">${formatCents(o.totalCents)}</td></tr>
${!addOn && o.gstCents ? small("Includes GST", formatCents(o.gstCents)) : ""}</table>`;
}

function receiptMeta(o: TemplateData["order"], s: BusinessSettings) {
  const placed = new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: s.timezone }).format(o.createdAt);
  return `<p style="font-size:13px;color:#6d5a45;margin:16px 0 0">${s.gstRegistered && s.abn ? "Tax invoice" : "Receipt"} · Order ${esc(o.reference)} · ${esc(placed)}${s.abn ? ` · ABN ${esc(s.abn)}` : ""}<br>Payment: ${o.paymentMethod === "CASH" ? "Cash at pickup" : "Card (Stripe secure checkout)"}</p>`;
}

const when = (o: Order) => `${formatDateLong(o.pickupDate)} at ${formatTime12(o.pickupTime)}`;
const p = (t: string) => `<p style="font-size:16px;line-height:1.6;margin:0 0 12px">${t}</p>`;
const box = (t: string) => `<div style="background:#faf6ef;border:1px solid #eee4d3;border-radius:12px;padding:16px;margin:16px 0;font-size:15px;line-height:1.6">${t}</div>`;

function pickupBlock(d: TemplateData) {
  const addr = d.settings.pickupAddress ? esc(d.settings.pickupAddress).replace(/\n/g, "<br>") : `${esc(d.settings.pickupArea)} — we'll confirm the exact address with you before pickup.`;
  return box(`<strong>Pickup</strong><br>${esc(when(d.order))}<br>${addr}${d.settings.pickupInstructions ? `<br><span style="color:#6d5a45">${esc(d.settings.pickupInstructions)}</span>` : ""}`);
}

export function renderTemplate(name: TemplateName, d: TemplateData): Rendered {
  const s = d.settings;
  if (name === "test") {
    return {
      subject: `Test email from ${s.businessName}`,
      html: layout(s, "Your email notifications are working.", "Email is working", p("This is a test message from your ordering dashboard. Customer emails will look like this.")),
      text: "This is a test message from your ordering dashboard.",
      sms: `${s.businessName}: test message.`,
    };
  }
  const o = d.order;
  if (!o) throw new Error(`Template ${name} needs an order`);
  const first = esc(o.customerName.split(" ")[0]);
  switch (name) {
    case "order_confirmed":
      return {
        subject: `Order ${o.reference} confirmed: your receipt and pickup details`,
        html: layout(
          s,
          `We've got your order for ${when(o)}.`,
          `Thank you, ${first}. Your order is in`,
          p(o.paymentMethod === "CASH" ? `Your order <strong>${o.reference}</strong> is booked in. Please bring <strong>${formatCents(o.totalCents)}</strong> in cash when you pick up.` : `We've received your card payment and your order <strong>${o.reference}</strong> is booked in.`) +
            pickupBlock(d) +
            itemsTable(o) +
            receiptMeta(o, s) +
            p("<br>We'll let you know when it's ready to collect."),
          { href: d.orderUrl, label: "View your order and receipt" },
        ),
        text: `Thank you ${o.customerName.split(" ")[0]}. Order ${o.reference} is confirmed.\nPickup: ${when(o)}, ${s.pickupAddress ?? s.pickupArea}\n${o.totalCents > o.subtotalCents ? `Subtotal: ${formatCents(o.subtotalCents)}\nGST (10%): ${formatCents(o.gstCents)}\n` : ""}Total: ${formatCents(o.totalCents)} (${o.paymentMethod === "CASH" ? "pay cash at pickup" : "paid by card"})\nView your order and receipt: ${d.orderUrl}`,
        sms: `${s.businessName}: order ${o.reference} confirmed. Pickup ${when(o)} at ${s.pickupAddress ?? s.pickupArea}. Total ${formatCents(o.totalCents)}${o.paymentMethod === "CASH" ? " cash at pickup" : " paid"}. ${d.orderUrl}`,
      };
    case "order_accepted":
      return {
        subject: `The kitchen has accepted order ${o.reference}`,
        html: layout(s, "Your order is confirmed by the kitchen.", "Your order is confirmed by the kitchen", p(`Good news, ${first} — we've checked your order and it's on our cooking schedule.`) + pickupBlock(d), { href: d.orderUrl, label: "Track your order" }),
        text: `The kitchen has accepted order ${o.reference}. Pickup: ${when(o)}. ${d.orderUrl}`,
        sms: `${s.businessName}: order ${o.reference} accepted. Pickup ${when(o)}.`,
      };
    case "order_ready":
      return {
        subject: `Your order ${o.reference} is ready to collect`,
        html: layout(s, "Hot and packed — see you soon.", "Your order is ready", p(`${first}, your food is hot, packed and waiting for you.`) + pickupBlock(d) + p(`Please bring your order number: <strong>${o.reference}</strong>.`), { href: d.orderUrl, label: "View your order" }),
        text: `Your order ${o.reference} is ready to collect. Pickup: ${s.pickupAddress ?? s.pickupArea}. ${d.orderUrl}`,
        sms: `${s.businessName}: order ${o.reference} is READY to collect. ${s.pickupAddress ? s.pickupAddress.split("\n")[0] : s.pickupArea}`,
      };
    case "pickup_reminder":
      return {
        subject: `Reminder: pickup ${formatTime12(o.pickupTime)} — order ${o.reference}`,
        html: layout(s, `See you at ${formatTime12(o.pickupTime)}.`, "See you soon", p(`A quick reminder that your order is due for pickup.`) + pickupBlock(d), { href: d.orderUrl, label: "View your order" }),
        text: `Reminder: order ${o.reference} pickup ${when(o)}. ${d.orderUrl}`,
        sms: `${s.businessName}: reminder — pickup ${when(o)}, order ${o.reference}.`,
      };
    case "order_cancelled": {
      const reason = typeof d.extra.reason === "string" && d.extra.reason ? d.extra.reason : null;
      return {
        subject: `Order ${o.reference} has been cancelled`,
        html: layout(s, "Your order has been cancelled.", "Your order has been cancelled", p(`We're sorry, ${first} — order <strong>${o.reference}</strong> for ${esc(when(o))} has been cancelled.`) + (reason ? box(`Reason: ${esc(reason)}`) : "") + p(o.paidAt ? "If you've paid, we'll refund you and email you once it's done. Refunds usually show in 5–10 business days." : "No payment was taken."), { href: d.orderUrl, label: "View your order" }),
        text: `Order ${o.reference} has been cancelled.${reason ? ` Reason: ${reason}.` : ""} ${o.paidAt ? "We'll refund you and confirm by email." : ""}`,
        sms: `${s.businessName}: order ${o.reference} has been cancelled. We'll be in touch about any refund.`,
      };
    }
    case "order_refunded":
    case "order_partially_refunded": {
      const amt = typeof d.extra.amountCents === "number" ? d.extra.amountCents : o.refundedCents;
      return {
        subject: `Refund of ${formatCents(amt)} for order ${o.reference}`,
        html: layout(s, `We've refunded ${formatCents(amt)}.`, "Your refund is on its way", (o.paymentMethod === "CASH" ? p(`We've refunded <strong>${formatCents(amt)}</strong> in cash for order ${o.reference}.`) : p(`We've refunded <strong>${formatCents(amt)}</strong> for order ${o.reference} to the card you paid with.`) + p("Banks usually take 5–10 business days to show refunds.")), { href: d.orderUrl, label: "View your order" }),
        text: `We've refunded ${formatCents(amt)} for order ${o.reference}. Banks usually take 5–10 business days.`,
        sms: `${s.businessName}: refund of ${formatCents(amt)} for order ${o.reference} processed.`,
      };
    }
    case "owner_new_order":
      return {
        subject: `New order ${o.reference}: ${formatCents(o.totalCents)} — ${formatDateLong(o.pickupDate)} ${formatTime12(o.pickupTime)}`,
        html: layout(s, o.paymentMethod === "CASH" ? "A new cash-at-pickup order." : "A new paid order.", `New order from ${esc(o.customerName)}`, box(`${esc(when(o))}<br>${esc(o.customerName)} · ${esc(o.customerPhone)}<br><strong>${o.paymentMethod === "CASH" ? "Cash at pickup (collect payment)" : "Paid by card"}</strong>${o.notes ? `<br><strong>Note:</strong> ${esc(o.notes)}` : ""}`) + itemsTable(o), { href: d.adminUrl, label: "Open in dashboard" }),
        text: `New order ${o.reference} from ${o.customerName} (${o.customerPhone}) for ${when(o)}. Total ${formatCents(o.totalCents)} (${o.paymentMethod === "CASH" ? "CASH at pickup" : "paid by card"}). ${d.adminUrl}`,
        sms: `NEW ORDER ${o.reference}: ${o.customerName} ${o.customerPhone}, ${formatCents(o.totalCents)} ${o.paymentMethod === "CASH" ? "CASH at pickup" : "card PAID"}, pickup ${when(o)}. ${d.adminUrl}`,
      };
  }
}
