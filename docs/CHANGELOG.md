# Changelog

## 1.0.0 — 6–7 November 2026 (current)

**Owner-requested changes**
- Single public phone number: 0452 401 786 (Sayed Hasnain Shah).
- Cinematic hero: kitchen-photo slideshow, gold Mughal arch with the DSK logo and rising steam, fast 2-second dish
  carousel, equal-size buttons, always-readable contrast in light and dark mode.
- **Halal Certified** royal seal (hero, homepage band, menu, dish pages, checkout, footer); certifier and number set
  in Settings.
- Owner's own photo for every dish (except Shahi Baingan), shown complete with its name tag in 5:4 frames.
- "Customer favourites" auto-carousel and automatic **Most loved** badges from real orders.
- "Explore the menu" photo tiles; menu categories as a grid / "Jump to" dropdown — no sideways scrolling anywhere.
- Allergen page as cards by menu section with **Call** / **Message** buttons to verify.
- Payments: **card (Stripe hosted checkout)** or **cash at pickup**; secure-checkout badges and card logos.
- **10% GST added on top** (Subtotal + GST = Total) in cart, checkout, Stripe, receipts and emails.
- Confirmation email is the full receipt with the pickup address; instant owner alerts by email and SMS.
- **Owner-only dashboard:** customer accounts and staff roles removed; one-time owner setup and forgot-password with
  6-digit codes to the business mobile and email; strong-password generator.
- Footer: copyright and "Website designed and managed by Faizan Sabir". Test-mode ribbon removed.
- SEO: Restaurant + WebSite structured data, areas served, verification tags, social links (SEO_AND_BACKLINKS.md).

**Reliability**
- Fixed the 502 errors on Render's free plan: no on-the-fly image optimisation, pre-sized images, memory caps.
- Fixed a millisecond timing race in the notification worker.

**Tests:** 100 unit/integration tests and 22 end-to-end tests pass (axe WCAG 2.2 AA in both themes; no horizontal
overflow at 320–1440 px; ordering by card and cash; owner-only access; rate limits).

## 0.1.0 — 4–5 November 2026 (initial build)

Built in eight phases, each tested before the next:

1. Cinematic public website and design system (charcoal and gold, cream light mode, Cinzel + Figtree).
2. Database menu, dish pages with options and allergens, cart with server-side pricing.
3. Scheduling engine in Perth time: notice, cut-off, slot capacity, daily limits, closed dates; race-proof
   reservations (12 simultaneous checkouts for 4 places → exactly 4).
4. Checkout and payments: hosted Stripe Checkout, verified webhooks, reconciliation, refunds, payment holds.
5. Dashboard: orders, kitchen schedule, menu, photos, capacity, payments, customers, reports, settings, audit log.
6. Notifications: durable email/SMS queue with retries, deduplication and owner controls.
7. SEO, accessibility (WCAG 2.2 AA), legal pages and compliance notes.
8. Independent audit — 13 issues found and fixed — and the Render deployment.

**Security summary:** bcrypt passwords; revocable DB sessions in signed httpOnly cookies; owner-only access checked
on every page and action; rate limits on sign-in, codes, contact and checkout; hosted card payments (no card data on
the site); signed webhooks with idempotency; strict Content-Security-Policy and security headers; all inputs
validated; prices always recalculated on the server; private order links.
