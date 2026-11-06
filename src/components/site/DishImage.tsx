import Image from "next/image";
import { HandiIcon } from "./Emblem";
import { isRemoteStock } from "@/lib/domain/images";
import { RemoteDishImage } from "./RemoteDishImage";

/**
 * Dish photo, or a clearly labelled placeholder when the kitchen hasn't supplied a photo yet.
 * Placeholders never pretend to be food photography.
 */
export function DishImage({
  src,
  alt,
  name,
  sizes,
  priority = false,
  shape = "arch",
  className = "",
  showName = false,
}: {
  src: string | null;
  alt: string;
  name: string;
  sizes: string;
  priority?: boolean;
  shape?: "arch" | "rounded";
  className?: string;
  showName?: boolean;
}) {
  const shapeClass = shape === "arch" ? "arch" : "rounded-2xl";
  const placeholder = (
    <div
      className={`relative overflow-hidden ${shapeClass} ${className} flex flex-col items-center justify-center gap-2 border border-gold/25 bg-[radial-gradient(120%_90%_at_50%_20%,color-mix(in_oklab,var(--maroon)_45%,transparent),transparent_70%),var(--bg-sunken)] text-gold/80`}
      role="img"
      aria-label={`Photo coming soon: ${name}`}
    >
      <HandiIcon className="w-1/4 max-w-16" />
      {showName ? <span className="px-3 text-center font-display text-sm leading-tight text-text/80">{name}</span> : null}
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/30 bg-bg/70 px-2.5 py-0.5 text-[0.68rem] font-medium text-muted">
        Photo coming soon
      </span>
    </div>
  );
  if (src && isRemoteStock(src)) {
    return <RemoteDishImage src={src} alt={alt} priority={priority} className={`${shapeClass} ${className}`} fallback={placeholder} />;
  }
  if (src) {
    return (
      <div className={`relative overflow-hidden bg-sunken ${shapeClass} ${className}`}>
        {/* Whole photo always visible: a soft blurred copy fills any spare space behind it */}
        <Image src={src} alt="" aria-hidden fill sizes="64px" className="scale-110 object-cover opacity-60 blur-xl" />
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-contain" />
      </div>
    );
  }
  return placeholder;
}
