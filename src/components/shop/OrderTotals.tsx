import { formatCents } from "@/lib/domain/money";

/**
 * Subtotal, GST and total for a quote or a saved order. When GST is added on top of menu prices
 * (total > subtotal) it's shown as its own line; otherwise GST is shown as "included".
 */
export function OrderTotals({
  subtotalCents,
  gstCents,
  totalCents,
  totalLabel = "Total",
  size = "lg",
  className = "",
}: {
  subtotalCents: number;
  gstCents: number;
  totalCents: number;
  totalLabel?: string;
  size?: "lg" | "md";
  className?: string;
}) {
  const addOn = totalCents > subtotalCents;
  return (
    <dl className={`space-y-1.5 ${className}`}>
      {addOn ? (
        <>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatCents(subtotalCents)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">GST (10%)</dt>
            <dd className="tabular-nums">{formatCents(gstCents)}</dd>
          </div>
        </>
      ) : null}
      <div className={`flex items-baseline justify-between gap-3 ${addOn ? "border-t border-line pt-2" : ""}`}>
        <dt className="font-semibold">{totalLabel}</dt>
        <dd className={`tabular-nums text-gold ${size === "lg" ? "font-display text-2xl" : "text-lg font-semibold"}`}>{formatCents(totalCents)}</dd>
      </div>
      {!addOn && gstCents > 0 ? (
        <div className="flex justify-between gap-3 text-sm text-muted">
          <dt>Includes GST</dt>
          <dd className="tabular-nums">{formatCents(gstCents)}</dd>
        </div>
      ) : null}
    </dl>
  );
}
