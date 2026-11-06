# Owner guide — Diwaan Shah Khwaan dashboard

Sign in at **/admin/login** (only the business owner can sign in). Forgot the password? Tap **Forgot password?** —
a 6-digit code goes to the owner's email and mobile.

## Everyday tasks

| I want to… | Go to |
|---|---|
| See and move orders along (New → Confirmed → Preparing → Ready → Collected) | **Orders** |
| See what to cook today, by dish | **Kitchen schedule** |
| Record cash paid at pickup | Open the order → **Mark cash received** |
| Refund or cancel an order | Open the order → Refund / Cancel |
| Change a dish name, price, description, photo, spice level or allergens | **Menu** → the dish |
| Upload a new dish photo from the phone | **Menu** → the dish → **Upload a new photo** → **Save** |
| Mark a dish sold out / make it a Special | **Menu** (switches on each row) |
| Change pickup days, hours, notice, slots or closed dates | **Pickup & capacity** |
| See customers, how often they order and what they spent | **Customers** |
| See the most-ordered dishes ("Most loved") | **Overview** |
| Sales by day and CSV export | **Sales reports** |
| Business details, pickup address, ABN, GST, payment options, Halal certificate | **Settings** |
| Email/text alerts, test email, delivery log | **Notifications** |
| Change the owner password or add a second owner login | **Owner login** |

Changes appear on the website immediately. Every change is recorded in the **Audit log**.

## Launch checklist

### Business details (Settings)
- [x] Public contact: 0452 401 786 (Sayed Hasnain Shah).
- [x] Pickup address: 25 Osten Dr, Langford WA 6147 (sent only in order confirmations).
- [ ] Legal / trading name and **ABN**. The settings page won't save while GST is on without an ABN.
- [ ] Business email (shown on receipts and the privacy policy).
- [ ] **Halal certificate:** certifier name and certificate number. Switch the seal off if the certificate lapses.
- [ ] **GST:** currently "add 10% on top". Only charge GST while registered; confirm each dish's GST treatment with
      your tax agent. Australian Consumer Law generally expects the total price (incl. GST) to be shown prominently —
      ask your accountant whether to switch to "prices include GST".

### Menu
- [ ] **Allergens for every dish** — until entered, customers are asked to call or message to verify.
- [ ] Check prices, names and short descriptions.
- [ ] Shahi Baingan still uses a stock photo — upload your own.
- [ ] Daily limits or extra notice for dishes that take longer (e.g. Daleem).

### Ordering rules (Pickup & capacity)
- [ ] Days and hours (default every day 12pm–8pm), minimum notice (24 h), booking window (14 days), cut-off,
      slots (30 min, 4 per slot, 30 per day), payment hold (20 min), cancellation (24 h), closed dates.

### Accounts and keys (see DEPLOY.md)
- [ ] Owner login created; password saved in a password manager.
- [ ] Stripe account with the business bank account; test order done; **owner approval** before live keys.
- [ ] Resend (email) with the diwaan.com.au domain verified.
- [ ] Twilio (SMS) with an Australian sender.
- [ ] Domain www.diwaan.com.au connected; `APP_URL` set.
- [ ] Render paid plans (Starter web service, Basic database) so the site never sleeps and data is kept.
- [ ] `SITE_INDEXABLE=true`, Google Business Profile and Search Console (SEO_AND_BACKLINKS.md).

### Compliance (COMPLIANCE.md)
- [ ] City of Gosnells food business registration (and home-based business approval), Food Safety Supervisor,
      food handler training, records, insurance.
- [ ] Review the privacy policy, terms and refund policy (ideally with a lawyer).
