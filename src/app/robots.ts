import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  // Staging must never be indexed
  if (process.env.SITE_INDEXABLE !== "true") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/cart", "/checkout", "/order", "/account", "/pay"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
