import Link from "next/link";

export default function RootNotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl text-gold">404</p>
      <h1 className="mt-4 font-display text-3xl">We couldn&apos;t find that page</h1>
      <p className="mt-3 max-w-md text-muted">It may have moved, or the dish may no longer be on the menu.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/menu" className="inline-flex h-11 items-center rounded-full bg-gold px-5 font-semibold text-gold-ink">Browse the menu</Link>
        <Link href="/" className="inline-flex h-11 items-center rounded-full border border-gold/60 px-5 font-semibold">Go home</Link>
      </div>
    </main>
  );
}
