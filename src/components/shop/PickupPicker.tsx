"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Day } from "@/lib/domain/schedule";
import { formatDateLong } from "@/lib/domain/time";
import { formatTime12 } from "@/lib/domain/hours";

type Value = { date: string; time: string } | null;

function dayParts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-AU", { ...o, timeZone: "UTC" }).format(dt);
  return { wd: fmt({ weekday: "short" }), day: fmt({ day: "numeric" }), mon: fmt({ month: "short" }) };
}

/** Pickup date + time selector driven entirely by the server's availability */
export function PickupPicker({ lines, value, onChange, error, refreshKey }: { lines: { menuItemId: string; quantity: number }[]; value: Value; onChange: (v: Value) => void; error?: string; refreshKey?: number }) {
  const uid = useId();
  const reduce = useReducedMotion();
  const [days, setDays] = useState<Day[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [activeDate, setActiveDate] = useState<string | null>(value?.date ?? null);
  const dateRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sig = JSON.stringify(lines);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/slots", { method: "POST", headers: { "content-type": "application/json" }, body: sig === "[]" ? '{"lines":[]}' : JSON.stringify({ lines: JSON.parse(sig) }), signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d: { days: Day[] }) => {
        setFailed(false);
        setDays(d.days);
        setActiveDate((cur) => {
          if (cur && d.days.some((x) => x.date === cur && x.status === "open")) return cur;
          return d.days.find((x) => x.status === "open")?.date ?? null;
        });
      })
      .catch((e) => e.name !== "AbortError" && setFailed(true));
    return () => ctrl.abort();
  }, [sig, refreshKey]);

  // If the chosen slot is no longer offered after a refresh, clear it
  useEffect(() => {
    if (!days || !value) return;
    const ok = days.find((d) => d.date === value.date)?.slots.find((s) => s.time === value.time)?.available;
    if (!ok) onChange(null);
  }, [days, value, onChange]);

  if (failed) {
    return (
      <p role="alert" className="rounded-xl border border-danger/50 bg-danger/10 p-4">
        We couldn&apos;t load pickup times. Check your connection and refresh the page.
      </p>
    );
  }
  if (!days) {
    return (
      <div aria-busy="true" aria-label="Loading pickup times" className="space-y-4">
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-20 w-16 shrink-0 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-11 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  if (!days.length) return <p className="rounded-xl border border-warning/50 bg-warning/10 p-4">We&apos;re not taking online orders right now. Please call us to order.</p>;
  if (!days.some((d) => d.status === "open")) {
    return <p className="rounded-xl border border-warning/50 bg-warning/10 p-4">There are no pickup times left in the booking window for this order. Try removing a dish with limited availability, or call us.</p>;
  }

  const day = days.find((d) => d.date === activeDate);
  const visibleDays = days;

  function onDateKey(e: KeyboardEvent, i: number) {
    let n = i;
    if (e.key === "ArrowRight") n = Math.min(visibleDays.length - 1, i + 1);
    else if (e.key === "ArrowLeft") n = Math.max(0, i - 1);
    else return;
    e.preventDefault();
    dateRefs.current[n]?.focus();
  }

  return (
    <div className="space-y-5">
      <div>
        <p id={`${uid}-dl`} className="mb-2 text-sm font-semibold">
          Pickup date
        </p>
        <div role="group" aria-labelledby={`${uid}-dl`} className="rail -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {visibleDays.map((d, i) => {
            const p = dayParts(d.date);
            const open = d.status === "open";
            const active = d.date === activeDate;
            return (
              <button
                key={d.date}
                ref={(el) => {
                  dateRefs.current[i] = el;
                }}
                type="button"
                disabled={!open}
                aria-pressed={active}
                title={open ? formatDateLong(d.date) : d.reason}
                onKeyDown={(e) => onDateKey(e, i)}
                onClick={() => setActiveDate(d.date)}
                className={`relative flex w-16 shrink-0 flex-col items-center rounded-2xl border px-1 py-2.5 transition-colors ${
                  active ? "border-gold bg-gold text-gold-ink" : open ? "border-line bg-sunken hover:border-gold/70" : "cursor-not-allowed border-line/50 text-muted/60 line-through decoration-1"
                }`}
              >
                <span className="text-xs">{p.wd}</span>{" "}
                <span className="font-display text-xl leading-tight">{p.day}</span>{" "}
                <span className="text-xs">{p.mon}</span>
                {open ? null : <span className="sr-only"> — {d.reason ?? "unavailable"}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {day ? (
          <motion.fieldset
            key={day.date}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            aria-describedby={error ? `${uid}-err` : undefined}
          >
            <legend className="mb-2 text-sm font-semibold">Pickup time on {formatDateLong(day.date)}</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {day.slots.map((s) => {
                const checked = value?.date === day.date && value.time === s.time;
                return (
                  <label
                    key={s.time}
                    className={`relative flex h-12 cursor-pointer flex-col items-center justify-center rounded-xl border text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] ${
                      checked ? "border-gold bg-gold/20 font-semibold" : s.available ? "border-line bg-sunken hover:border-gold/70" : "cursor-not-allowed border-line/40 text-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${uid}-slot`}
                      className="sr-only"
                      disabled={!s.available}
                      checked={checked}
                      onChange={() => onChange({ date: day.date, time: s.time })}
                      aria-label={`${formatTime12(s.time)}${s.available ? (s.remaining <= 2 ? `, ${s.remaining} left` : "") : `, ${s.reason ?? "unavailable"}`}`}
                    />
                    <span>{formatTime12(s.time)}</span>
                    {s.available && s.remaining <= 2 ? <span className="text-[0.7rem] text-warning">{s.remaining} left</span> : null}
                    {!s.available ? <span className="text-[0.7rem]">{s.reason === "Too soon" ? "Too soon" : "Full"}</span> : null}
                  </label>
                );
              })}
            </div>
          </motion.fieldset>
        ) : null}
      </AnimatePresence>
      {error ? (
        <p id={`${uid}-err`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
