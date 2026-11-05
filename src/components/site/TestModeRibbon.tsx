/** Visible on staging so nobody mistakes test payments for real ones */
export function TestModeRibbon() {
  const provider = process.env.PAYMENT_PROVIDER ?? "demo";
  const testKeys = provider === "stripe" && /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "");
  if (provider !== "demo" && !testKeys) return null;
  return (
    <div className="no-print pointer-events-none fixed bottom-0 left-0 z-50 rounded-tr-lg bg-[#f3c64b] px-2.5 py-1 text-[0.7rem] font-bold text-[#1a1209]" role="note">
      TEST MODE — no real payments
    </div>
  );
}
