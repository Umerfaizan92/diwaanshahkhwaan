# Production Readiness Report — Diwaan Shah Khwaan

Independent audit, 5 November 2026. Scope: the whole application (customer site, dashboard, server logic, database,
payments, notifications, configuration and deployment).

## Verdict

**Ready for an isolated staging deployment in test mode. Not yet ready for live production.** The code is complete and
verified. What remains is owner-supplied business information, third-party accounts (Stripe, email, optionally SMS)
and regulatory registration — none of which can or should be decided by the developer. See "Blocking items before
going live".

## Verification summary

| Check | Result |
|---|---|
| TypeScript (strict) | 0 errors |
| ESLint | 0 errors, 0 warnings |
| Unit and integration tests (Vitest, real Postgres) | **90 passed** |
| End-to-end tests (Playwright, production build with CSP on) | **20 passed** |
| Accessibility (axe, WCAG 2.2 AA) | 0 violations — 17 public pages × 2 themes, 16 dashboard pages |
| Responsive | No horizontal overflow at 320, 375, 768, 1024 and 1440 px (public); 375 px (dashboard) |
| Link crawl | 46 public and 200 dashboard URLs: 0 broken |
| Lighthouse (mobile, simulated slow 4G) | Performance: home 95, menu 92, dish 98, contact 100; accessibility 100; best practices 100 |
| Migrations | Apply cleanly to an empty database; seed is idempotent (run twice); `drizzle-kit check` clean |
| Production build | Passes; the server refuses to start with unsafe configuration |

## What the audit found and fixed

| # | Area | Problem | Fix |
|---|---|---|---|
| 1 | Payments / DB | Deadlock between refunds and webhooks (opposite lock order) | Lock order then payment everywhere |
| 2 | Notifications | Test-email template crashed with no order (the retry queue preserved it) | Template fixed, regression test |
| 3 | Money | `$12.5` shown instead of `$12.50` | Formatter fixed, unit test |
| 4 | Reports | GROUP BY failed with a parameterised timezone | Validated, inlined timezone |
| 5 | Mobile | Horizontal overflow on checkout, the order board, the notifications page and the home rail | Grid min-width, containment and wrapping fixes |
| 6 | UX | Staff login cleared the email after a failed attempt | Value preserved |
| 7 | Accessibility | Date-button accessible names, light-mode gold contrast, scrollable tables, heading order | Fixed; axe clean |
| 8 | Performance | 990 ms main-thread blocking from the animation library on every page | CSS-only motion; TBT about 150 ms |
| 9 | Copy | Default pickup instructions contradicted the confirmation email; unverified claims (charcoal, allergens) | Neutral text; claims removed or flagged |
| 10 | Security | No Content-Security-Policy | Strict production CSP (`frame-ancestors 'none'`, same-origin only) |
| 11 | Ops | No config validation or health endpoint; sessions and rate-limit rows never cleaned | Boot-time env check, `/api/health`, housekeeping in the worker |
| 12 | Schema | Unused `login_attempts` table | Dropped via migration 0003 |
| 13 | Staging safety | Test payments could be mistaken for real ones | "TEST MODE" ribbon; demo provider refused on an indexable site |

## Security review

- **Authentication:** bcrypt (cost 12); DB-backed sessions in signed httpOnly, SameSite=Lax cookies (Secure in
  production); revoked on logout, deactivation, role change and password reset; login rate limits by IP and email;
  timing-safe for unknown accounts.
- **Authorisation:** a single permission matrix. Every dashboard page calls `requireStaffPage`, every action runs
  through `staffAction`, and route handlers call `requireStaff`. `proxy.ts` is only an optimistic redirect.
  Verified in a browser that a Kitchen account is denied 8 restricted pages and the CSV export (403).
- **Orders:** tracking pages need an unguessable token (timing-safe compare), the owning customer, or staff; unknown
  or tokenless requests get a 404 with no data.
- **Payments:** hosted checkout (no card data); signatures verified (Stripe SDK / HMAC); event-id idempotency stored
  in the same transaction; totals cross-checked; amount mismatches flagged; live keys blocked without explicit
  approval.
- **Input:** Zod validation on every server input; client prices ignored; open-redirect guard on `next=`; CSV
  formula-injection guard; HTML escaping in emails; JSON-LD `<` escaping; uploads decoded and re-encoded (sharp),
  type- and size-limited, with metadata stripped.
- **Abuse:** rate limits on login, registration, contact, checkout and payment checks; a honeypot on contact.
- **Headers:** CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.

## Concurrency and data integrity

- Reservations are serialised per pickup date with `pg_advisory_xact_lock`, and capacity is recounted inside the
  lock. Proven: 12 racing checkouts for 4 places → exactly 4.
- Dish daily limits can't be oversold (proven); expired holds stop counting immediately.
- Order transitions are conditional SQL updates (`WHERE status = expected`) validated by a state machine.
- Refund amounts are reserved under row locks: 5 concurrent refunds can't exceed the amount paid (proven).
- Notifications are claimed with `FOR UPDATE SKIP LOCKED` and a lease. Unique dedupe keys mean 5 concurrent workers
  send each message exactly once (proven).

## Environment variables (see `.env.example`)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | From the Render database |
| `AUTH_SECRET` | yes | 32+ random characters; generated by the blueprint |
| `APP_URL` | recommended | Falls back to `RENDER_EXTERNAL_URL` |
| `PAYMENT_PROVIDER` | yes | `demo` (staging) or `stripe` |
| `DEMO_PAYMENT_SECRET` | with demo | Generated by the blueprint |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | with stripe | **Test** keys until approval |
| `ALLOW_LIVE_PAYMENTS` | no | `true` only with the owner's explicit approval |
| `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` | for real email | Otherwise emails are only logged |
| `SMS_PROVIDER`, `TWILIO_*` | optional | |
| `CRON_SECRET` | recommended | Enables `/api/cron/sweep` for an external scheduler |
| `IN_PROCESS_WORKER` | no | Default on |
| `SITE_INDEXABLE` | no | `true` only on the final production domain |
| `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD` | first deploy | Creates the first owner login |

## Blocking items before going live

1. Owner verification list (`OWNER_VERIFICATION.md`), especially **allergens**, the private **pickup address** and
   **ABN/GST**.
2. City of Gosnells food business registration and Standard 3.2.2A obligations (`COMPLIANCE.md`).
3. Stripe account: test with test keys, then the owner explicitly approves live payments.
4. Email provider with a verified sending domain (customers won't receive emails until then).
5. A custom domain with HTTPS, then `SITE_INDEXABLE=true`.
6. Use a paid Render instance (or an external cron hitting `/api/cron/sweep`) so hold expiry and reminders run
   continuously. The free tier sleeps.

## Known limitations and recommended next steps

- Customers reset passwords by calling the business (there's no self-service reset email yet). Add one once email is
  configured.
- Guest orders aren't merged into an account created later (deliberate: there's no email verification, so merging by
  email would expose orders).
- The dashboard doesn't auto-refresh; staff refresh the order board (polling or push could be added).
- Accessibility was checked with automated tools and keyboard tests; a manual screen-reader pass is recommended.
- Uploaded photos are stored in Postgres, which suits a small menu. Move them to object storage if the library grows
  large.
