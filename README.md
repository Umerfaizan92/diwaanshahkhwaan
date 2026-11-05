# Diwaan Shah Khwaan — online ordering

Premium ordering website and kitchen dashboard for **DSK · Diwaan Shah Khwaan**, a home-cooked Pakistani takeaway
offering advance orders for pickup in the Langford WA 6147 area.

This is a standalone project. It shares nothing with any other repository or Render service.

## What's inside

- **Customer site:** cinematic homepage, menu, dish pages with portions and options, allergens, weekly menu,
  specials, cart, pickup scheduling, secure checkout, order tracking, receipts, optional accounts, and policy pages.
- **Kitchen dashboard (`/admin`):** order board, kitchen schedule, menu and photos, pickup capacity, payments and
  refunds, customers, sales reports and CSV export, notifications, settings, staff roles and the audit log.
- **Server-side engines:** pricing, scheduling (Perth time) with transactional reservations, verified payments with
  reconciliation, and a durable notification queue.

See `docs/ARCHITECTURE.md`, `docs/PROGRESS.md`, `docs/READINESS_REPORT.md`, `docs/COMPLIANCE.md` and
`docs/OWNER_VERIFICATION.md`.

## Run locally

Requirements: Node 22+ and PostgreSQL 16.

```bash
cp .env.example .env          # fill in DATABASE_URL, AUTH_SECRET, DEMO_PAYMENT_SECRET, SEED_OWNER_*
npm ci
npm run db:migrate && npm run db:seed
npm run dev                   # http://localhost:3000 — staff sign-in at /admin
```

## Tests

```bash
npm run typecheck && npm run lint
npm run db:test:prepare && npm test        # unit + integration (uses TEST_DATABASE_URL)
npm run build && npm start &               # then:
npm run test:e2e                           # Playwright: accessibility, responsive, ordering, security
```

## Deploy (Render)

`render.yaml` creates a **new** web service and a **new** Postgres database in Singapore (the closest region to
Perth). Set `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD` in the dashboard. The service runs migrations and an
idempotent seed on start, and `/api/health` is the health check.

Payments stay in **test mode**:

- The default is the built-in demo provider, which never takes money.
- To use Stripe, add Stripe **test** keys (`PAYMENT_PROVIDER=stripe`) and register the webhook
  `https://<your-domain>/api/payments/webhook/stripe` for the events `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`
  and `refund.updated`.
- Live keys are refused unless `ALLOW_LIVE_PAYMENTS=true` — **only with the owner's explicit approval**.

Set `SITE_INDEXABLE=true` only on the final production domain.
