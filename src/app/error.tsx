"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl">Something went wrong on our side</h1>
      <p className="mt-3 max-w-md text-muted">
        Please try again. If it keeps happening, call us to place your order.
        {error.digest ? <span className="mt-2 block text-sm">Reference: {error.digest}</span> : null}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="inline-flex h-11 items-center rounded-full bg-gold px-5 font-semibold text-gold-ink">Try again</button>
        <Link href="/" className="inline-flex h-11 items-center rounded-full border border-gold/60 px-5 font-semibold">Go home</Link>
      </div>
    </main>
  );
}
