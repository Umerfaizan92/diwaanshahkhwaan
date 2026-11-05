"use client";

export function QuantityStepper({ value, min = 1, max, onChange, label, size = "lg" }: { value: number; min?: number; max: number; onChange: (n: number) => void; label: string; size?: "sm" | "lg" }) {
  const h = size === "lg" ? "h-13" : "h-10";
  const w = size === "lg" ? "w-12" : "w-10";
  return (
    <div role="group" aria-label={label} className={`inline-flex ${h} items-center rounded-full border border-line bg-sunken`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={`grid ${h} ${w} place-items-center rounded-full text-xl text-text/85 hover:text-gold disabled:opacity-35`}
      >
        −
      </button>
      <output aria-live="polite" className="min-w-8 text-center font-semibold tabular-nums">
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className={`grid ${h} ${w} place-items-center rounded-full text-xl text-text/85 hover:text-gold disabled:opacity-35`}
      >
        +
      </button>
    </div>
  );
}
