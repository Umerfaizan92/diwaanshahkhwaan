/** Public base URL. On Render, RENDER_EXTERNAL_URL is provided automatically. */
export function appUrl(): string {
  return (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000").replace(/\/$/, "");
}
