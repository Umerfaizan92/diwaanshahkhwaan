# Development Progress

Status key: ✅ done and verified · 🟡 in progress · ⬜ not started

| Phase | Scope | Status | Verified by |
|---|---|---|---|
| 0 | Fresh isolated repo, architecture, schema, migrations, seed | ✅ | migrate and seed ran on a clean DB |
| 1 | Cinematic public website | ✅ | build; 14 routes return 200; no horizontal overflow at 375/768/1024/1440; axe WCAG 2.2 AA = 0 violations in both themes; mobile nav, contact form and theme toggle tested in a browser |
| 2 | Database menu, dish pages, options, cart, server pricing | ⬜ | |
| 3 | Scheduling engine | ⬜ | |
| 4 | Checkout and payments (test mode) | ⬜ | |
| 5 | Owner dashboard and RBAC | ⬜ | |
| 6 | Notifications | ⬜ | |
| 7 | SEO, accessibility, legal, compliance | ⬜ | |
| 8 | Audit and readiness report | ⬜ | |

## Business facts captured

- Name: DSK · Diwaan Shah Khwaan — "Taste the Royalty" / "Royal flavours served with love"
- Orders and enquiries: **0452 401 786 (Sayed Hasnain Shah)** and **0469 975 901**
- Pickup: **Langford WA 6147 area** (the exact address is only sent with paid order confirmations)
- Timezone Australia/Perth; currency AUD
- Menu and prices: transcribed from the Introductory Price List (31 dishes, 7 categories)
- Large BBQ and bulk orders: enquiry-based (contact form or phone)

## Log

- Phase 0: Next.js 16.4.5 scaffold; Drizzle schema (24 tables); initial migration; idempotent seed (menu, settings,
  opening hours, owner login from env).

- Phase 1: design system (charcoal and gold with a cream mode, Cinzel and Figtree, the Mughal arch motif); animated hero
  (one arch-draw moment, push-in, parallax, all disabled under reduced motion); header with mobile drawer; footer;
  home, menu, dish, specials, weekly menu, how ordering works, about, contact (working form, DB-stored, rate-limited,
  honeypot), FAQ, allergens, refunds, terms and privacy; skeletons; 404 and error pages. Dishes without photos show a
  clearly labelled "Photo coming soon" placeholder. Unit tests found and fixed a price formatting bug ($12.5 → $12.50).

## Unresolved issues / next steps

See `OWNER_VERIFICATION.md` (created in Phase 7) for everything the owner must confirm.
