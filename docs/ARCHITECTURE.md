# Diwaan Shah Khwaan — Architecture

**Brand:** DSK · Diwaan Shah Khwaan — "Taste the Royalty" · "Royal flavours served with love"
**Business:** home-cooked Pakistani/Mughlai takeaway, advance orders, **pickup only** in the Langford WA 6147 area.

## 0. Repository status

- A standalone project with its own git history, database, GitHub repository and Render services. It shares nothing
  with any other project.

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript `strict`) | Server components and server actions; route handlers for webhooks and cron |
| Styling | Tailwind CSS 4 with CSS design tokens | Dark charcoal and gold by default; cream light mode via `data-theme` |
| Motion | CSS animations (hero, steam, seal) plus `motion` for small UI transitions (cart, pickup picker) | All animation is disabled under `prefers-reduced-motion` |
| Fonts | Cinzel (display) and Figtree (text), self-hosted woff2 | No third-party font requests |
| Database | PostgreSQL 16 | |
| ORM | **Drizzle ORM** and drizzle-kit SQL migrations | See note below |
| Auth | **Owner-only dashboard.** Server-side sessions (DB-backed, revocable) in httpOnly signed cookies (`jose` HS256); bcrypt (cost 12) | One-time owner setup and "forgot password" verified by 6-digit codes sent to the business mobile and email (HMAC-stored, 10-minute expiry, 5 attempts, single use); login and code requests rate-limited. Customers need no account: each order has a private tracking link |
| Payments | **Card:** Stripe Checkout (hosted, AUD). **Cash at pickup:** booked immediately, owner marks cash received. A built-in **demo** provider for testing | Card data never touches this app; live keys need `ALLOW_LIVE_PAYMENTS=true` |
| Email | Provider adapter: `console` (dev) or Resend (HTTP API) | Durable Postgres job queue |
| SMS | Optional adapter: `none` or Twilio | Off by default |
| Images | Dish photos in `/public/images/dishes/menu` (one per dish, 5:4), kitchen photos in `/public/images/dishes` (+ `sm/` phone sizes); owner uploads re-encoded with `sharp` to WebP and stored in Postgres (`media`) | No on-the-fly image optimisation (keeps the free 512 MB server stable) |
| Tests | Vitest (unit and integration on a real Postgres test DB), Playwright (end-to-end, responsive, axe accessibility) | |
| Hosting | Render Blueprint (`render.yaml`): a web service and Postgres in Singapore | Start command runs migrations and an idempotent seed, then the server |

**ORM note:** Prisma was the preferred ORM. Its CLI needs to download native engine binaries from
`binaries.prisma.sh`, and the build environment blocks that host, so migrations and client generation could not be
run or verified here. Drizzle is pure TypeScript, generates plain SQL migrations (`/drizzle`) and has the same
capabilities this app needs (transactions, row locks, typed queries). This keeps every stage verifiable.

## 2. Structure

```
src/
  app/
    (site)/        public pages: home, menu, menu/[slug], specials, weekly-menu, order-ahead, about, contact,
                   faq, allergens, privacy, terms, refunds, cart, checkout, order/[ref] (tracking + receipt),
                   account (redirects to the owner sign-in)
    admin/         owner dashboard: login (+ first-time setup, forgot password) and protected sections:
                   orders, kitchen schedule, menu, categories, food photos, pickup & capacity, payments,
                   customers, sales reports, messages, notifications, settings, owner login, audit log
    pay/demo/[id]  simulated payment page (demo provider only)
    api/           payments/webhook/[provider], cart/quote, slots, media/[id], cron/sweep, health
  components/      ui/ (buttons, fields), site/ (hero, dish cards, carousel, halal seal…), shop/ (cart,
                   checkout, payment badges), admin/ (dashboard forms and widgets)
  lib/
    domain/        PURE business logic, unit-tested: money/GST, pricing, scheduling, order state machine,
                   permissions, validation schemas, timezone, images
    server/        DB-touching services: menu (incl. automatic "Most loved"), settings, orders (reservations,
                   cash), payments, refunds, auth, owner access codes, notifications queue and worker,
                   email templates, audit, rate limiting, reports, SEO structured data
    db/            Drizzle schema and client
    config/        business defaults (name, phone, pickup area)
    menu/          seed catalogue and dish photo map
scripts/           migrate.ts, seed.ts
drizzle/           SQL migrations (applied in order on every start; never edit or delete old ones)
public/images/     brand emblem, kitchen photos, dish photos
tests/             unit/, integration/ (Vitest on a real Postgres test DB)
e2e/               Playwright: accessibility (axe), responsive, ordering, security
docs/              ARCHITECTURE, DEPLOY, OWNER_GUIDE, COMPLIANCE, SEO_AND_BACKLINKS, CHANGELOG
```

Customer pages, the owner dashboard and server logic are separated. Dashboard pages call server actions, and
**every** server action re-checks the owner session. `proxy.ts` only adds an optimistic redirect for signed-out users.

## 3. Key server-side rules

1. **Pricing:** the client sends only `{menuItemId, quantity, choiceIds}`. The server loads current prices,
   availability and option rules from the DB, validates them and computes every total. Client prices are ignored.
2. **Reservation:** checkout runs in one transaction. It takes `pg_advisory_xact_lock` keyed on the pickup date, then
   re-checks slot capacity, daily order limit, per-dish daily limits and quantity limits against live orders (paid,
   or pending with an unexpired hold). It then inserts the order as `PENDING_PAYMENT` with `hold_expires_at`.
   Same-date checkouts are therefore serialised, which prevents overbooking.
3. **Hold expiry:** unpaid holds expire after `payment_hold_minutes` and stop counting toward capacity immediately.
   A sweeper marks them `EXPIRED` and expires the provider session.
4. **Payment:** an order becomes paid **only** through (a) a signature-verified webhook or (b) a server-side
   retrieval of the provider session (reconciliation). A browser redirect never marks an order paid. Webhook events
   are recorded in `payment_events` (primary key = event id), and status changes use conditional updates, so
   duplicates and retries are no-ops.
5. **Late payment:** if a payment arrives after a hold expired and capacity is now full, the order is flagged for the
   owner, who can refund it or accept it.
6. **Order state machine:** `PENDING_PAYMENT → NEW → CONFIRMED → PREPARING → READY → COLLECTED`, plus `CANCELLED`,
   `REFUNDED`, `PAYMENT_FAILED` and `EXPIRED`. Transitions are validated by a pure function and enforced in SQL
   (`WHERE status = from`).
7. **Notifications:** jobs have a unique `dedupe_key` (for example `order-confirmed:<id>:EMAIL`) and are claimed with
   `FOR UPDATE SKIP LOCKED`. Failures retry with exponential backoff and every attempt is logged.
8. **Audit:** every dashboard change writes `audit_logs`.
9. **Cash at pickup:** booked straight into `NEW` (no payment hold) and still counted against capacity; the owner
   records the cash, which creates a `cash` payment so reports and receipts treat it like a card payment.
10. **Popularity:** units ordered in paid and live cash orders over 120 days rank dishes; the top 4 (3+ ordered) get
    "Most loved" and lead the homepage carousel. Nothing to maintain by hand.

## 4. GST

Set in Dashboard → Settings. Two modes:

- **Add 10% on top** (current): menu prices are before GST; checkout, receipts and Stripe show Subtotal + GST (10%)
  = Total, with GST on taxable dishes only.
- **Prices include GST:** GST is shown as 1/11 of taxable lines.

Each dish has a `gst_treatment` (`TAXABLE` or `GST_FREE`). Receipts become a "Tax invoice" only when GST-registered
with an ABN. **Confirm GST registration and each dish's treatment with a registered tax agent or the ATO.**
