# SEO, backlinks and speed — Diwaan Shah Khwaan

## Already built into the website
- Page titles, descriptions, canonical URLs, Open Graph and Twitter cards on every public page
- Structured data (schema.org): Restaurant (locality, hours, phone, cuisine, payment types, areas served),
  WebSite, Menu with every dish and price, dish pages with breadcrumbs
- `sitemap.xml` (all pages and dishes, with images) and `robots.txt` (private pages excluded)
- Fast loading: pre-sized WebP photos (720px on phones), self-hosted fonts, CSS-only animation,
  no image processing on the server, preconnect to the stock photo host
- Accessible (WCAG 2.2 AA tested with axe in light and dark mode) — this also helps rankings

## Switch on at launch (Render → Environment)
| Setting | What it does |
|---|---|
| `SITE_INDEXABLE=true` | Lets Google index the site. Keep `false` while testing so the test site isn't indexed |
| `APP_URL=https://your-domain.com.au` | Uses your own domain in links, sitemap and structured data |
| `GOOGLE_SITE_VERIFICATION` | Code from Google Search Console (HTML tag method) |
| `BING_SITE_VERIFICATION` | Code from Bing Webmaster Tools |
| `SOCIAL_LINKS` | Comma-separated profile links (Google Business, Facebook, Instagram, TikTok). Added as `sameAs` so Google links them to the site |

## Backlinks and local listings (do these once, in this order)
Use exactly the same name, phone (0452 401 786) and area ("Langford WA 6147") everywhere.
1. **Google Business Profile** — the most important. Category "Pakistani restaurant" / "Takeout restaurant",
   service area (hide the home address), hours, menu link, photos. Ask happy customers for reviews.
2. **Google Search Console** — add the site, submit `/sitemap.xml`.
3. **Apple Business Connect** (Apple Maps) and **Bing Places**.
4. **Facebook page** and **Instagram** — link to the website in the bio; post dishes with the order link.
5. Free Australian directories: True Local, Yellow Pages (yellow.com.au), Hotfrog, StartLocal, Yelp AU.
6. Local community: City of Gosnells / Canning community groups, Langford & Thornlie Facebook groups,
   Pakistani and South Asian community associations in Perth, mosque and community-event notice boards.
7. Food bloggers and Perth food Instagram accounts — offer a tasting platter in exchange for an honest review.

Avoid paid "link packages" or link farms: Google penalises them.
