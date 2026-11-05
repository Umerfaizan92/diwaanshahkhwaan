# Owner Verification List

Everything below was either assumed, left as a safe default, or needs a decision from the owner before launch.
Most items are changed in the dashboard (no code needed). The location is shown in brackets.

## Business details (Admin → Settings)

- [x] Single public contact: 0452 401 786 (Sayed Hasnain Shah).
- [ ] Legal or trading entity name for receipts, and the **ABN**.
- [ ] Business email address (shown on receipts and the privacy policy).
- [ ] **Exact pickup address.** It is only shown to customers after they pay. Until it's set, confirmations say
      "we'll confirm the exact address with you before pickup".
- [ ] Pickup instructions (parking, which door, what to do on arrival).
- [ ] **GST registration** (default: not registered). Only switch on once registered (see COMPLIANCE.md).

## Menu (Admin → Menu)

- [ ] **Allergens and ingredients for every dish.** None are confirmed. The site tells customers to call before
      ordering if they have allergies until each dish is ticked as confirmed.
- [ ] **GST treatment per dish.** All are seeded as Taxable; confirm with your tax agent.
- [ ] Prices, names and descriptions transcribed from the Introductory Price List. Short descriptions (e.g. "Smoked
      chicken karahi with ginger & green chilli") were written from the photos and dish names — please correct any
      that don't match how you cook them.
- [ ] **Photos.** Real photos are used for: Shahi Chicken Tikka BBQ Platter, Shahi Chicken Biryani and Shahi Chicken
      Koela Karahi. 28 dishes show "Photo coming soon". Upload photos in Admin → Food photos.
- [ ] Spice levels shown on each dish (estimated).
- [ ] Spice level choice (Mild / Medium / Hot) is offered on curries, rice and BBQ. Remove it where it doesn't apply.
- [ ] **Portion sizes** (e.g. Half kg / Full kg) and add-ons (extra dip, naan…) with prices, if you offer them.
- [ ] Daily limits for dishes you can only make a certain number of (e.g. Daleem), and extra notice for dishes
      that take longer (e.g. 48 hours).
- [ ] Featured dishes on the homepage, and which dishes are "Specials".
- [ ] Bulk and BBQ orders: currently enquiry-only (contact form or phone). Decide whether to sell set party packs online.

## Ordering rules (Admin → Pickup & capacity)

Defaults to confirm:

- [ ] Pickup days and hours: every day, 12pm–8pm.
- [ ] Minimum notice: 24 hours.
- [ ] Booking window: 14 days ahead.
- [ ] Daily cut-off: orders for a day close at 8pm the day before.
- [ ] Pickup slots: 30 minutes, 4 orders per slot, 30 orders per day.
- [ ] Payment hold: 20 minutes.
- [ ] Free cancellation until 24 hours before pickup.
- [ ] Holidays and closed dates (e.g. Eid, family events).

## Website copy

- [ ] "About our kitchen" story and the meaning of "Diwaan" and "Khwaan" — written as a draft.
- [ ] Privacy policy, terms, and refund and cancellation policy — templates; please review (ideally with a lawyer).
- [ ] FAQ answers (no card or booking fees, no delivery).

## Notifications (Admin → Notifications)

- [ ] Create an email-sending account (Resend recommended) and a verified sending domain. Until then emails are only
      logged on the server.
- [ ] Owner email for new-order alerts.
- [ ] Optional SMS: a Twilio account and an Australian sender number.

## Payments

- [ ] Stripe account in the business's name (Australian, AUD). Add **test** keys first and run test orders.
- [ ] **Explicit approval to go live** — switch to live keys and set `ALLOW_LIVE_PAYMENTS=true`. The app refuses live
      keys without it.
- [ ] Decide whether to absorb card fees (currently: yes, no surcharge).

## Compliance

- [ ] Work through `COMPLIANCE.md`: City of Gosnells food business registration (and home-based business approval),
      Food Safety Supervisor, food handler training, record keeping, insurance.

## Accounts and access

- [ ] Change the first owner password after the first sign-in (Admin → Staff → Reset password).
- [ ] Add staff accounts with the right roles (Kitchen for helpers).
