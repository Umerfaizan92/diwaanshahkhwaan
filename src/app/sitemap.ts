import type { MetadataRoute } from "next";
import { getPublicMenu } from "@/lib/server/menu";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  const pages: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["/", 1, "weekly"],
    ["/menu", 0.9, "daily"],
    ["/specials", 0.8, "daily"],
    ["/weekly-menu", 0.6, "weekly"],
    ["/order-ahead", 0.6, "monthly"],
    ["/about", 0.6, "monthly"],
    ["/contact", 0.6, "monthly"],
    ["/faq", 0.5, "monthly"],
    ["/allergens", 0.5, "weekly"],
    ["/refunds", 0.3, "yearly"],
    ["/terms", 0.3, "yearly"],
    ["/privacy", 0.3, "yearly"],
  ];
  let dishes: MetadataRoute.Sitemap = [];
  try {
    const menu = await getPublicMenu();
    dishes = menu.flatMap((c) => c.dishes).map((d) => ({ url: `${base}/menu/${d.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7, images: d.image ? [`${base}${d.image}`] : undefined }));
  } catch {
    /* database unavailable: still serve the static pages */
  }
  return [...pages.map(([p, priority, changeFrequency]) => ({ url: `${base}${p}`, lastModified: now, changeFrequency, priority })), ...dishes];
}
