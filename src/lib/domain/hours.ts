export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type Hours = { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string };

/** "13:30" -> "1:30pm" */
export function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

/** Groups consecutive days (Mon-first) with identical hours: ["Mon–Fri 12pm–8pm", "Sat–Sun Closed"] */
export function formatHoursSummary(hours: Hours[]): string[] {
  if (!hours.length) return ["Hours to be confirmed"];
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));
  const order = [1, 2, 3, 4, 5, 6, 0];
  const label = (h: Hours | undefined) => (!h || !h.isOpen ? "Closed" : `${formatTime12(h.openTime)}–${formatTime12(h.closeTime)}`);
  const out: string[] = [];
  let start = 0;
  for (let i = 1; i <= order.length; i++) {
    const prev = label(byDay.get(order[i - 1]));
    const cur = i < order.length ? label(byDay.get(order[i])) : null;
    if (cur !== prev) {
      const a = DAY_SHORT[order[start]];
      const b = DAY_SHORT[order[i - 1]];
      out.push(`${start === i - 1 ? a : `${a}–${b}`} ${prev}`);
      start = i;
    }
  }
  return out;
}
