# Development Progress

Status key: ✅ done and verified · 🟡 in progress · ⬜ not started

| Phase | Scope | Status | Verified by |
|---|---|---|---|
| 0 | Fresh isolated repo, architecture, schema, migrations, seed | ✅ | migrate and seed ran on a clean DB |
| 1 | Cinematic public website | ⬜ | |
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

## Unresolved issues / next steps

See `OWNER_VERIFICATION.md` (created in Phase 7) for everything the owner must confirm.
