"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archiveMenuItemAction, moveMenuItemAction, quickUpdateAction, setAvailabilityAction } from "@/app/admin/(panel)/menu/actions";
import { formatCents, parseDollarsToCents } from "@/lib/domain/money";

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${checked ? "border-success bg-success/80" : "border-line bg-sunken"}`}
    >
      <span className={`inline-block size-4.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5.5" : "translate-x-0.5"}`} />
    </button>
  );
}

type Row = { id: string; name: string; priceCents: number; isAvailable: boolean; isFeatured: boolean; isDailySpecial: boolean; isArchived: boolean; imagePath: string | null; allergensConfirmed: boolean };

export function MenuRow({ item, canEdit, first, last }: { item: Row; canEdit: boolean; first: boolean; last: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [price, setPrice] = useState((item.priceCents / 100).toFixed(2));
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okText?: string) {
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (okText ? { tone: "ok", text: okText } : null) : { tone: "err", text: r.error ?? "Failed" });
      router.refresh();
    });
  }

  function savePrice() {
    const cents = parseDollarsToCents(price);
    if (cents === null) {
      setMsg({ tone: "err", text: "Enter a price like 12 or 12.50" });
      return;
    }
    if (cents === item.priceCents) return;
    run(() => quickUpdateAction(item.id, { priceCents: cents }), `Price saved: ${formatCents(cents)}`);
  }

  return (
    <li className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_7.5rem_auto_auto] ${item.isArchived ? "opacity-55" : ""}`} aria-busy={pending}>
      <div className="min-w-0">
        <p className="truncate font-medium">
          {canEdit ? (
            <Link href={`/admin/menu/${item.id}`} className="hover:text-gold">
              {item.name}
            </Link>
          ) : (
            item.name
          )}
        </p>
        <p className="flex flex-wrap gap-x-3 text-xs text-muted">
          {item.isArchived ? <span className="text-warning">Archived</span> : null}
          {!item.imagePath ? <span>No photo</span> : null}
          {!item.allergensConfirmed ? <span className="text-warning">Allergens unconfirmed</span> : null}
          {msg ? (
            <span role={msg.tone === "err" ? "alert" : "status"} className={msg.tone === "err" ? "text-danger" : "text-success"}>
              {msg.text}
            </span>
          ) : null}
        </p>
      </div>

      {canEdit ? (
        <div className="relative col-start-1 sm:col-start-auto">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
          <input
            aria-label={`Price of ${item.name}`}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={savePrice}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            className="h-9 w-full rounded-lg border border-line bg-sunken pl-6 pr-2 text-right tabular-nums outline-none focus:border-gold"
          />
        </div>
      ) : (
        <span className="text-right tabular-nums text-muted">{formatCents(item.priceCents)}</span>
      )}

      <label className="row-start-1 col-start-2 flex items-center gap-2 text-sm sm:row-start-auto sm:col-start-auto">
        <Switch checked={item.isAvailable} disabled={pending || item.isArchived} onChange={(v) => run(() => setAvailabilityAction(item.id, v), v ? "Back on the menu" : "Marked sold out")} label={`${item.name} available`} />
        <span className="w-16">{item.isAvailable ? "On sale" : "Sold out"}</span>
      </label>

      {canEdit ? (
        <div className="col-span-2 flex flex-wrap items-center gap-1 sm:col-span-1">
          <button
            type="button"
            aria-pressed={item.isFeatured}
            onClick={() => run(() => quickUpdateAction(item.id, { isFeatured: !item.isFeatured }))}
            className={`rounded-full border px-2.5 py-1 text-xs ${item.isFeatured ? "border-gold bg-gold/15 text-gold" : "border-line text-muted"}`}
          >
            Featured
          </button>
          <button
            type="button"
            aria-pressed={item.isDailySpecial}
            onClick={() => run(() => quickUpdateAction(item.id, { isDailySpecial: !item.isDailySpecial }))}
            className={`rounded-full border px-2.5 py-1 text-xs ${item.isDailySpecial ? "border-maroon bg-maroon text-[#f6e7cf]" : "border-line text-muted"}`}
          >
            Special
          </button>
          <button type="button" disabled={first || pending} onClick={() => run(() => moveMenuItemAction(item.id, -1))} aria-label={`Move ${item.name} up`} className="rounded px-2 py-1 text-muted hover:text-text disabled:opacity-30">
            ↑
          </button>
          <button type="button" disabled={last || pending} onClick={() => run(() => moveMenuItemAction(item.id, 1))} aria-label={`Move ${item.name} down`} className="rounded px-2 py-1 text-muted hover:text-text disabled:opacity-30">
            ↓
          </button>
          <button type="button" onClick={() => run(() => archiveMenuItemAction(item.id, !item.isArchived), item.isArchived ? "Restored" : "Archived")} className="rounded px-2 py-1 text-xs text-muted hover:text-danger">
            {item.isArchived ? "Restore" : "Archive"}
          </button>
        </div>
      ) : null}
    </li>
  );
}
