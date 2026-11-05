# Diwaan Shah Khwaan — Architecture & Implementation Plan

**Brand:** DSK · Diwaan Shah Khwaan — "Taste the Royalty" · "Royal flavours served with love"
**Business:** home-cooked Pakistani/Mughlai takeaway, advance orders, **pickup only** in the Langford WA 6147 area.

## 0. Repository status

- **New project.** No existing repository was connected, so this is a fresh codebase.
- It is **fully isolated** from the Super Pro AI / AI Office Manager repo and its Render services. It has its own
  folder, git history, database and (when deployed) its own GitHub repo and Render services.

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript `strict`) | Server components and server actions; route handlers for webhooks and cron |
| Styling | Tailwind CSS 4 with CSS design tokens | Dark charcoal and gold by default; cream light mode via `data-theme` |
| Motion | `motion` (Framer Motion) | All animation is disabled under `prefers-reduced-motion` |
| Fonts | Cinzel (display) and Figtree (text), self-hosted woff2 | No third-party font requests |
| Database | PostgreSQL 16 | |
| ORM | **Drizzle ORM** and drizzle-kit SQL migrations | See note below |
| Auth | Server-side sessions (DB-backed, revocable) in httpOnly signed cookies (`jose` HS256); bcrypt (cost 12) | Separate staff and customer sessions; login rate-limiting |
| Payments | Stripe Checkout (hosted, AUD, **test mode**), plus a built-in **demo** provider for staging | Card data never touches this app |
| Email | Provider adapter: `console` (dev) or Resend (HTTP API) | Durable Postgres job queue |
| SMS | Optional adapter: `none` or Twilio | Off by default |
| Images | Seed photos in `/public`; owner uploads are re-encoded with `sharp` to WebP and stored in Postgres (`media`) | Strips metadata; survives Render's ephemeral disk |
| Tests | Vitest (unit and integration on a real Postgres test DB), Playwright (end-to-end, responsive, axe accessibility) | |
| Hosting | Render Blueprint (`render.yaml`): a web service and Postgres | Pre-deploy runs migrations and an idempotent seed |

**ORM note:** Prisma was the preferred ORM. Its CLI needs to download native engine binaries from
`binaries.prisma.sh`, and the build environment blocks that host, so migrations and client generation could not be
run or verified here. Drizzle is pure TypeScript, generates plain SQL migrations (`/drizzle`) and has the same
capabilities this app needs (transactions, row locks, typed queries). This keeps every stage verifiable.

## 2. Structure

```
src/
  app/
    (site)/        public pages: home, menu, menu/[slug], specials, weekly-menu, order-ahead, about,
                   contact, faq, privacy, terms, refunds, allergens
    (shop)/        cart, checkout, order/[ref] (tracking and receipt), account, pay/demo/[id]
    admin/         owner dashboard (login plus protected sections)
    api/           payments/webhook/[provider], cart/quote, slots, media/[id], cron/jobs, health
  components/      ui/ (primitives), site/ (public sections), shop/, admin/
  lib/
    domain/        PURE business logic, unit-tested: money/GST, pricing, scheduling/slots, order state machine,
                   permissions, validation schemas, timezone
    server/        DB-touching services: menu, settings, orders (reservations), payments, refunds, auth,
                   notifications queue and worker, audit, rate limiting, media
    db/            Drizzle schema and client
    config/        business defaults
scripts/           migrate, seed
drizzle/           SQL migrations
tests/             unit/, integration/
e2e/               Playwright specs
docs/              this file, PROGRESS.md, COMPLIANCE.md, OWNER_VERIFICATION.md, READINESS_REPORT.md
```

Customer pages, owner admin and server logic are separated. Admin pages call server actions, and **every** server
action re-checks the session and role. `proxy.ts` only adds an optimistic redirect for signed-out users.

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
8. **Audit:** every staff mutation writes `audit_logs`.

## 4. GST

Display prices are GST-inclusive. Each dish has a `gst_treatment` (`TAXABLE` or `GST_FREE`), and the business has a
`gst_registered` flag (default **off**). While it is off, no GST is shown and receipts are plain receipts. When it is
on and an ABN is set, receipts become "Tax invoice" and show GST as 1/11 of the taxable lines. **No tax assumptions
are made; the owner must confirm the treatment with a registered tax agent or the ATO.**

## 5. Milestones and dependencies

| Phase | Scope | Depends on |
|---|---|---|
| 1 | Cinematic public site and design system | scaffold |
| 2 | DB menu, dish pages, options, allergens, cart, server pricing | 1 |
| 3 | Scheduling engine and pickup selector, owner schedule config | 2 |
| 4 | Checkout, payments, webhooks, reconciliation, refunds | 3 |
| 5 | Owner dashboard and RBAC | 2–4 |
| 6 | Notifications (email and SMS), queue | 4–5 |
| 7 | SEO, accessibility, legal pages, compliance | 1–6 |
| 8 | Independent audit, fixes, readiness report, staging deploy | all |
