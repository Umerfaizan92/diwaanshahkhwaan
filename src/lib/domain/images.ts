/** Resolves a stored image path to a URL. "media:<id>" = owner upload stored in the DB. */
export function resolveImage(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("media:")) return `/api/media/${path.slice(6)}`;
  if (path.startsWith("/")) return path;
  return null;
}
