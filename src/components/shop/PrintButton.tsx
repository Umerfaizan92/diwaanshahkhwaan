"use client";

import { buttonClass } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("outline", "md")}>
      Print or save as PDF
    </button>
  );
}
