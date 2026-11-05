"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { checkPayment } from "@/app/(site)/order/[ref]/actions";

/** Polls the server (which asks the payment provider) until the payment is confirmed */
export function PaymentPending({ reference, token }: { reference: string; token: string }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries > 20) return;
    const t = setTimeout(async () => {
      const r = await checkPayment(reference, token);
      router.refresh();
      if (!r.changed) setTries((n) => n + 1);
    }, tries === 0 ? 1200 : 3000);
    return () => clearTimeout(t);
  }, [tries, reference, token, router]);
  return (
    <div role="status" className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4">
      <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      <span>{tries > 20 ? "We're still waiting for confirmation from the payment provider. Refresh in a minute, or call us." : "Confirming your payment with our payment provider…"}</span>
    </div>
  );
}
