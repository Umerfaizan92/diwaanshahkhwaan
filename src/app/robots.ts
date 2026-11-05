import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config/app-url";

export default function robots(): MetadataRoute.Robots {
  const base = appUrl();
  // Staging must never be indexed
  if (process.env.SITE_INDEXABLE !== "true") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/cart", "/checkout", "/order", "/account", "/pay"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
