import type { ReactNode } from "react";

/** Compact interior page header with the arch motif behind the title */
export function PageHeader({ title, intro, children }: { title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-line/60 bg-sunken pb-10 pt-28 lg:pb-14 lg:pt-36">
      <svg viewBox="0 0 400 300" aria-hidden className="pointer-events-none absolute -right-16 bottom-0 h-[130%] text-gold/15" fill="none" preserveAspectRatio="xMaxYMax meet">
        <path d="M8 300V160C8 100 76 70 124 52c32-12 52-22 76-48 24 26 44 36 76 48 48 18 116 48 116 108v140" stroke="currentColor" strokeWidth="1.5" />
        <path d="M48 300V170c0-46 50-70 86-84 26-10 46-20 66-42 20 22 40 32 66 42 36 14 86 38 86 84v130" stroke="currentColor" strokeWidth="1" />
      </svg>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">{title}</h1>
        {intro ? <div className="mt-4 max-w-2xl text-lg text-muted">{intro}</div> : null}
        {children}
      </div>
    </section>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function SectionTitle({ title, intro, id }: { title: string; intro?: ReactNode; id?: string }) {
  return (
    <div className="mb-8 max-w-2xl lg:mb-10">
      <h2 id={id} className="font-display text-3xl font-semibold sm:text-4xl">
        {title}
      </h2>
      {intro ? <p className="mt-3 text-lg text-muted">{intro}</p> : null}
    </div>
  );
}
