# Development Progress

Status key: ✅ done and verified · 🟡 in progress · ⬜ not started

| Phase | Scope | Status | Verified by |
|---|---|---|---|
| 0 | Fresh isolated repo, architecture, schema, migrations, seed | ✅ | migrate and seed ran on a clean DB |
| 1 | Cinematic public website | ✅ | build; 14 routes return 200; no horizontal overflow at 375/768/1024/1440; axe WCAG 2.2 AA = 0 violations in both themes; mobile nav, contact form and theme toggle tested in a browser |
| 2 | Database menu, dish pages, options, cart, server pricing | ✅ | 22 unit/integration tests; browser test: add to cart, tampered client price ignored, live sold-out and price edits, portion group created in admin and priced on site |
| 3 | Scheduling engine | ✅ | 15 boundary unit tests (notice, cut-off, DST, capacity, limits); concurrency integration tests (12 racing checkouts for 4 places → exactly 4; dish daily cap never oversold); owner schedule UI tested in a browser |
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

- Phase 2: database-driven menu with categories, dish pages, portion groups and modifiers (required/optional, min/max,
  price deltas, defaults, per-choice availability), allergens with an explicit "confirmed" flag, quantity steppers, a
  persistent localStorage cart synced across tabs, and a floating cart. The server re-prices every cart from the DB
  (`/api/cart/quote`); the browser only sends ids and quantities. Staff sign-in (bcrypt, DB-backed revocable
  sessions, rate-limited, timing-safe) and RBAC. Owner menu admin: inline prices, sold-out switches,
  featured/special flags, reordering, archiving, a full dish editor (options, allergens, GST treatment, limits, days,
  photo) and a category manager. Every change is audit-logged. Fixed: login form cleared the email after a failed
  attempt; admin rows lost their status message after refresh.

- Phase 3: pure, timezone-correct scheduling engine (Australia/Perth wall-clock, UTC instants, DST-safe) covering
  minimum notice, per-dish lead times, opening hours, closed dates, the previous-evening cut-off, the advance window,
  slot capacity, the daily order limit, per-dish daily production limits and weekday-only dishes.
  Reservations run in a transaction under a per-date Postgres advisory lock with capacity re-counted inside it, and
  are idempotent. Unpaid holds stop counting the moment they expire, and a sweeper marks them EXPIRED. `/api/slots`
  feeds the customer pickup picker. Owner "Pickup & capacity" page: rules, weekly hours, closed dates and a
  this-week capacity view.

## Unresolved issues / next steps

See `OWNER_VERIFICATION.md` (created in Phase 7) for everything the owner must confirm.
