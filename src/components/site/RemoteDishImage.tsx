"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Stock (remote) dish photo with a graceful fallback: if the photo host is slow or blocked,
 * the labelled placeholder is shown instead of a broken image.
 */
export function RemoteDishImage({ src, alt, priority, className, fallback }: { src: string; alt: string; priority?: boolean; className: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // Catches an error that happened before hydration
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return <>{fallback}</>;
  return (
    <div className={`relative overflow-hidden bg-sunken ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={img}
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-0.5 text-[0.62rem] font-medium tracking-wide text-white/90">Serving suggestion</span>
    </div>
  );
}
