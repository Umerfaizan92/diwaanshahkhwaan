import type { ReactNode } from "react";

/** Long-form text styling for policy pages */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[68ch] space-y-4 text-[1.03rem] leading-7 text-text/90 [&_a]:text-gold [&_a]:underline [&_h2]:pt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-text [&_h3]:pt-2 [&_h3]:font-semibold [&_h3]:text-text [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6 [&_strong]:text-text [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">
      {children}
    </div>
  );
}

export function DraftNotice({ updated }: { updated: string }) {
  return (
    <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text/90">
      Last updated {updated}. This policy is provided in good faith and is being reviewed; contact us if anything is unclear.
    </p>
  );
}
