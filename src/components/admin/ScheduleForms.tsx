"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addClosedDateAction, removeClosedDateAction, saveHoursAction, saveRulesAction } from "@/app/admin/(panel)/schedule/actions";
import { Alert, Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { DAY_NAMES } from "@/lib/domain/hours";
import { formatDateLong } from "@/lib/domain/time";
import { Switch } from "./MenuRow";

type Msg = { tone: "success" | "error"; text: string } | null;
type Rules = {
  acceptingOrders: boolean;
  minNoticeHours: number;
  maxAdvanceDays: number;
  orderCutoffTime: string | null;
  slotMinutes: number;
  slotCapacity: number;
  dailyOrderLimit: number;
  paymentHoldMinutes: number;
  cancelDeadlineHours: number;
};

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> }>) =>
    start(async () => {
      const r = await fn();
      setErrors(r.ok ? {} : (r.fieldErrors ?? {}));
      setMsg(r.ok ? { tone: "success", text: r.message ?? "Saved" } : { tone: "error", text: r.error ?? "Failed" });
      router.refresh();
    });
  return { pending, msg, errors, run };
}

const num = (v: string) => (v.trim() === "" ? NaN : Number(v));

export function RulesForm({ initial }: { initial: Rules }) {
  const [r, setR] = useState({ ...initial, cutoffOn: initial.orderCutoffTime !== null, cutoff: initial.orderCutoffTime ?? "20:00" });
  const { pending, msg, errors, run } = useSave();
  const set = <K extends keyof typeof r>(k: K, v: (typeof r)[K]) => setR((p) => ({ ...p, [k]: v }));
  const numField = (k: "minNoticeHours" | "maxAdvanceDays" | "slotCapacity" | "dailyOrderLimit" | "paymentHoldMinutes" | "cancelDeadlineHours", label: string, hint?: string) => (
    <Field id={k} label={label} error={errors[k]} hint={hint} required>
      <Input id={k} type="number" inputMode="numeric" min={0} value={Number.isNaN(r[k]) ? "" : r[k]} error={errors[k]} onChange={(e) => set(k, num(e.target.value))} />
    </Field>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() =>
          saveRulesAction({
            acceptingOrders: r.acceptingOrders,
            minNoticeHours: r.minNoticeHours,
            maxAdvanceDays: r.maxAdvanceDays,
            orderCutoffTime: r.cutoffOn ? r.cutoff : null,
            slotMinutes: r.slotMinutes,
            slotCapacity: r.slotCapacity,
            dailyOrderLimit: r.dailyOrderLimit,
            paymentHoldMinutes: r.paymentHoldMinutes,
            cancelDeadlineHours: r.cancelDeadlineHours,
          }),
        );
      }}
      className="space-y-5"
      noValidate
    >
      {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
      <label className="flex items-center gap-3 rounded-xl border border-line bg-sunken p-3">
        <Switch checked={r.acceptingOrders} onChange={(v) => set("acceptingOrders", v)} label="Accepting online orders" />
        <span>
          <strong>{r.acceptingOrders ? "Taking online orders" : "Online ordering paused"}</strong>
          <span className="block text-sm text-muted">Pause to stop new orders (e.g. holidays). Existing orders are unaffected.</span>
        </span>
      </label>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {numField("minNoticeHours", "Minimum notice (hours)", "How far ahead an order must be placed")}
        {numField("maxAdvanceDays", "Book up to (days ahead)")}
        <Field id="cutoff" label="Daily cut-off" hint="Orders for a day close at this time the day before" error={errors.orderCutoffTime}>
          <div className="flex items-center gap-3">
            <Switch checked={r.cutoffOn} onChange={(v) => set("cutoffOn", v)} label="Use a daily cut-off" />
            <Input id="cutoff" type="time" value={r.cutoff} disabled={!r.cutoffOn} onChange={(e) => set("cutoff", e.target.value)} />
          </div>
        </Field>
        <Field id="slotMinutes" label="Pickup slot length" required>
          <Select id="slotMinutes" value={r.slotMinutes} onChange={(e) => set("slotMinutes", Number(e.target.value))}>
            {[15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Select>
        </Field>
        {numField("slotCapacity", "Orders per slot")}
        {numField("dailyOrderLimit", "Orders per day")}
        {numField("paymentHoldMinutes", "Hold a slot while paying (minutes)", "Unpaid orders release their slot after this")}
        {numField("cancelDeadlineHours", "Free cancellation until (hours before)")}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save ordering rules"}
      </Button>
    </form>
  );
}

export function HoursForm({ initial }: { initial: { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string }[] }) {
  const [rows, setRows] = useState(() => [1, 2, 3, 4, 5, 6, 0].map((d) => initial.find((h) => h.dayOfWeek === d) ?? { dayOfWeek: d, isOpen: false, openTime: "12:00", closeTime: "20:00" }));
  const { pending, msg, errors, run } = useSave();
  const setRow = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveHoursAction(rows));
      }}
      className="space-y-4"
    >
      {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
      <ul className="divide-y divide-line/70">
        {rows.map((r, i) => (
          <li key={r.dayOfWeek} className="grid grid-cols-[7rem_auto_1fr] items-center gap-3 py-2.5 sm:grid-cols-[8rem_7rem_1fr]">
            <span className="font-medium">{DAY_NAMES[r.dayOfWeek]}</span>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={r.isOpen} onChange={(v) => setRow(i, { isOpen: v })} label={`Open on ${DAY_NAMES[r.dayOfWeek]}`} />
              {r.isOpen ? "Open" : "Closed"}
            </label>
            {r.isOpen ? (
              <div className="col-span-3 flex flex-wrap items-center gap-2 sm:col-span-1">
                <input type="time" aria-label={`${DAY_NAMES[r.dayOfWeek]} first pickup`} value={r.openTime} onChange={(e) => setRow(i, { openTime: e.target.value })} className="h-10 rounded-lg border border-line bg-sunken px-2" />
                <span className="text-muted">to</span>
                <input type="time" aria-label={`${DAY_NAMES[r.dayOfWeek]} closing time`} value={r.closeTime} onChange={(e) => setRow(i, { closeTime: e.target.value })} className="h-10 rounded-lg border border-line bg-sunken px-2" />
                {Object.entries(errors).some(([k]) => k.startsWith(`${i}.`)) ? <span className="text-sm text-danger">Closing must be after opening</span> : null}
              </div>
            ) : (
              <span className="col-span-3 text-sm text-muted sm:col-span-1">No pickups</span>
            )}
          </li>
        ))}
      </ul>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save pickup hours"}
      </Button>
    </form>
  );
}

export function ClosedDates({ dates, today }: { dates: { date: string; reason: string | null }[]; today: string }) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const { pending, msg, errors, run } = useSave();
  return (
    <div className="space-y-4">
      {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
      {dates.length ? (
        <ul className="divide-y divide-line/70">
          {dates.map((d) => (
            <li key={d.date} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                <strong>{formatDateLong(d.date)}</strong>
                {d.reason ? <span className="text-muted"> — {d.reason}</span> : null}
              </span>
              <button type="button" disabled={pending} onClick={() => run(() => removeClosedDateAction(d.date))} className="text-sm text-muted hover:text-danger">
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No upcoming closed dates.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addClosedDateAction({ date, reason: reason || null }));
          setDate("");
          setReason("");
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <Field id="closed-date" label="Date" error={errors.date} required>
          <Input id="closed-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="min-w-48 flex-1">
          <Field id="closed-reason" label="Reason shown to customers">
            <Input id="closed-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Eid holiday" />
          </Field>
        </div>
        <Button type="submit" variant="outline" disabled={pending || !date}>
          Add closed date
        </Button>
      </form>
    </div>
  );
}
