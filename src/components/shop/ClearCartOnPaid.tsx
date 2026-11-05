"use client";

import { useEffect } from "react";
import { cart } from "@/lib/client/cart-store";

/** Empties the cart once, the first time a paid order page is shown */
export function ClearCartOnPaid({ reference }: { reference: string }) {
  useEffect(() => {
    try {
      const key = `dsk-cleared-${reference}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    cart.clear();
  }, [reference]);
  return null;
}
