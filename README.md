# Diwaan Shah Khwaan — online ordering

Premium ordering website and owner dashboard for **DSK · Diwaan Shah Khwaan** ("Taste the Royalty"), a home-cooked,
**halal-certified** Pakistani takeaway taking advance orders for **pickup in Langford WA 6147**.

- **Live:** https://www.diwaan.com.au (once the domain is connected) · staging https://diwaanshahkhwaan-soh8.onrender.com
- **Website designed and managed by Faizan Sabir.**

## What's inside

**Customer website**
- Cinematic homepage: kitchen-photo slideshow, fast dish carousel, Halal Certified seal, "Customer favourites"
  (ranked automatically from real orders), "Explore the menu" tiles, the royal-feast kitchen story.
- Menu (31 dishes, 7 categories) with photos, portions and options, spice levels, allergens with Call / Message
  buttons, specials, weekly menu, FAQ, policies, contact form.
- Cart, pickup date and time picker, checkout with **card (Stripe)** or **cash at pickup**, **10% GST** added at
  checkout, order tracking link, printable receipt / tax invoice.
- Confirmation email with the full receipt and pickup address; optional text messages.

**Owner dashboard (`/admin`) — owner only**
- Orders board, kitchen schedule, cash received, refunds, payments.
- Menu: change names, prices, photos (upload from the phone), availability, specials — live instantly.
- Customers with automatic order counts and "Returning" / "Regular" badges; "Most loved" dish ranking.
- Pickup hours and capacity, closed dates, GST mode, payment options, Halal certificate, notifications.
- Secure owner setup and "Forgot password" by 6-digit code to the business mobile and email.

## Documents

| File | What it covers |
|---|---|
| `docs/DEPLOY.md` | **Start here.** New GitHub account → Render → domain → Stripe, email and SMS keys |
| `.env.example` | Every setting the server reads, with explanations |
| `docs/OWNER_GUIDE.md` | Using the dashboard, and the launch checklist |
| `docs/ARCHITECTURE.md` | How the code is organised and the key business rules |
| `docs/COMPLIANCE.md` | Food business registration, allergens, GST, consumer law, privacy |
| `docs/SEO_AND_BACKLINKS.md` | Google listing, Search Console, backlinks |
| `docs/CHANGELOG.md` | What was built and changed, and how it was tested |

## Run on a computer (developers)

Requirements: Node 22+ and PostgreSQL 16.

```bash
cp .env.example .env          # fill in DATABASE_URL, AUTH_SECRET, DEMO_PAYMENT_SECRET
npm ci
npm run db:migrate && npm run db:seed
npm run dev                   # http://localhost:3000 — owner sign-in at /admin/login
```

## Tests

```bash
npm run typecheck && npm run lint
npm run db:test:prepare && npm test        # 100 unit + integration tests (uses TEST_DATABASE_URL)
npm run build && npm start &               # then:
npm run test:e2e                           # 22 Playwright tests: accessibility, phone sizes, ordering, security
```

## Deploy

See **`docs/DEPLOY.md`**. In short: push this folder to a new GitHub repository, create a Render Blueprint from it
(`render.yaml` creates the web service and Postgres database), then connect www.diwaan.com.au.
