/** Hosts allowed for remote (stock) dish photos. Must match the CSP img-src. */
export const REMOTE_IMAGE_HOSTS = ["images.pexels.com"];

/** Resolves a stored image path to a URL. "media:<id>" = owner upload stored in the DB. */
export function resolveImage(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("media:")) return `/api/media/${path.slice(6)}`;
  if (path.startsWith("/")) return path;
  if (isRemoteStock(path)) return path;
  return null;
}

/** True for allowed remote stock photos (shown with a "serving suggestion" label) */
export function isRemoteStock(path: string | null | undefined): boolean {
  if (!path) return false;
  try {
    const u = new URL(path);
    return u.protocol === "https:" && REMOTE_IMAGE_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

/** Smaller pre-sized variant for cards/thumbnails where one exists */
export function cardImage(src: string | null): string | null {
  if (!src) return null;
  const m = src.match(/^\/images\/dishes\/([^/]+\.webp)$/);
  if (m) return `/images/dishes/sm/${m[1]}`;
  if (isRemoteStock(src)) return src.replace(/([?&])w=\d+/, "$1w=600");
  return src;
}
