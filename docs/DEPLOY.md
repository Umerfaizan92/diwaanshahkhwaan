# Deploy guide — new GitHub account → Render → www.diwaan.com.au

Follow the parts in order. Nothing here needs code changes.

## Part 1 — Upload the code to the new GitHub account

1. Sign in to **github.com** with the business account.
2. Top-right **+** → **New repository**.
   - Name: `diwaanshahkhwaan`
   - Visibility: **Private** (recommended)
   - Do **not** tick "Add a README", ".gitignore" or "licence" (the project already has them).
   - **Create repository**.
3. Unzip `diwaanshahkhwaan.zip` on your computer.
4. Upload the files, either way:
   - **Website:** on the new empty repository page click **uploading an existing file**, drag in **everything inside**
     the unzipped `diwaanshahkhwaan` folder (including the hidden `.env.example` and `.gitignore`), then **Commit
     changes**. GitHub's web upload takes up to 100 files at a time, so upload in batches (folder by folder) if needed.
   - **Command line (easier for many files):**
     ```bash
     cd diwaanshahkhwaan
     git init -b main
     git add -A
     git commit -m "Diwaan Shah Khwaan website"
     git remote add origin https://github.com/<business-account>/diwaanshahkhwaan.git
     git push -u origin main
     ```
5. Check the repository shows the folders `src`, `public`, `drizzle`, `docs`, `scripts` and the file `render.yaml`.

> Never upload a file named `.env` (it would contain secrets). Only `.env.example` belongs in GitHub.

## Part 2 — Create the website on Render

1. Sign in to **dashboard.render.com** (the business account, or the same one as before).
2. **Account settings → GitHub** (or "Connect account") and allow Render to see the new `diwaanshahkhwaan` repository.
3. **New → Blueprint** → pick the `diwaanshahkhwaan` repository → **Connect**.
4. Render reads `render.yaml` and shows:
   - a web service **diwaanshahkhwaan** (Node, Singapore)
   - a Postgres database **diwaanshahkhwaan-db**
   It asks for the values marked "sync: false". Fill in what you have now; leave the rest empty (you can add them
   later under **Service → Environment**):
   - `APP_URL` = `https://www.diwaan.com.au`
   - everything else can stay empty for the first launch
5. **Apply**. The first build takes about 5 minutes. When it says **Live**, open the `….onrender.com` address.

**Plans:** the blueprint uses the **free** plan (sleeps when idle; free databases expire after 30 days). For the real
launch change the web service to **Starter** and the database to **Basic-256mb** in Render (paid monthly) so the
site is always on and the data is kept.

**Moving from the old Render service:** a new blueprint creates a new, empty database (menu, photos and settings are
seeded automatically; old test orders are not copied). If you want to keep the old database instead, don't create a
new one: in the old service go to **Settings → Build & Deploy → Repository** and switch it to the new GitHub repository.

## Part 3 — Create the owner login

Open `https://<your-site>/admin/login`. Because no owner exists yet it shows **Set up the owner account**:
1. Enter your name, email and the business mobile on record (**0452 401 786**).
2. A 6-digit code is sent to that mobile and email. *Until email/SMS are connected (Part 6) the code is written to
   Render → service → **Logs** (search for `owner-code`).*
3. Enter the code, tap **Generate strong password**, save it in your password manager, **Create owner account**.

Alternative: set `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD` (12+ characters) in Render → Environment and redeploy.

## Part 4 — Connect www.diwaan.com.au (domain bought on Wix)

1. **Render** → service → **Settings → Custom Domains → Add**: `www.diwaan.com.au`, then add `diwaan.com.au`.
2. **Wix** → manage.wix.com/account/domains → **⋯** next to diwaan.com.au → **Manage DNS Records**:
   - **A (Host):** delete old A records → **+ Add Record** → Host name *blank* → Value `216.24.57.1` → Save.
   - **CNAME (Aliases):** delete any `www` record → **+ Add Record** → Host name `www` → Value
     `<your-service>.onrender.com` (shown in Render, e.g. `diwaanshahkhwaan.onrender.com`) → Save.
   - Delete any **AAAA** records. Leave **MX/TXT** (email) records alone.
   - If Wix says the domain is connected to a Wix site, first choose **Disconnect from site**.
3. **Render** → Custom Domains → **Verify** (DNS can take 10 minutes to a few hours). HTTPS is added automatically.
4. Set `APP_URL=https://www.diwaan.com.au` in Render → Environment if you haven't already.

## Part 5 — Card payments into your bank (Stripe)

1. **stripe.com/au** → create the account in the business's name (ABN, address, ID). Website: https://www.diwaan.com.au
2. **Settings → Bank accounts / Payouts** → add the business **BSB and account number**. Stripe pays card money there.
3. Switch Stripe to **Test mode** first:
   - **Developers → API keys** → copy the **Secret key** (`sk_test_…`).
   - **Developers → Webhooks → Add endpoint** → `https://www.diwaan.com.au/api/payments/webhook/stripe`, events:
     `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
     `checkout.session.expired`, `refund.created`, `refund.updated` → copy the **Signing secret** (`whsec_…`).
4. **Render → Environment:** `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY=sk_test_…`, `STRIPE_WEBHOOK_SECRET=whsec_…`.
5. Place a test order with card `4242 4242 4242 4242` (any future date, any CVC).
6. **Go live only when the owner approves:** repeat step 3 in **Live mode**, put the live key and live signing secret
   in Render, and add `ALLOW_LIVE_PAYMENTS=true`. (The server refuses live keys without it.)

Cash at pickup works without Stripe.

## Part 6 — Email and text messages

**Email (Resend)** — confirmations, receipts, owner alerts, sign-in codes
1. **resend.com** → sign up → **Domains → Add domain** `diwaan.com.au` → add the DNS records it shows in **Wix → Manage
   DNS Records** → wait for "Verified".
2. **API Keys → Create** → copy it.
3. Render → Environment: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=…`, `EMAIL_FROM=Diwaan Shah Khwaan <orders@diwaan.com.au>`.
4. Dashboard → Notifications → **Send test email**.

**SMS (Twilio)** — owner new-order texts, customer texts, sign-in codes
1. **twilio.com** → sign up → buy an Australian number (or register an alphanumeric sender ID).
2. Copy the **Account SID** and **Auth Token**.
3. Render → Environment: `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID=…`, `TWILIO_AUTH_TOKEN=…`, `TWILIO_FROM=+61…`.
4. Dashboard → Notifications: switch on texts and set the owner mobile.

## Part 7 — Go public on Google

When the domain works and Stripe is set up: Render → Environment → `SITE_INDEXABLE=true`, then follow
`docs/SEO_AND_BACKLINKS.md` (Google Business Profile, Search Console, sitemap).

## All settings at a glance

Every variable is explained in **`.env.example`**. The blueprint fills in `DATABASE_URL`, `AUTH_SECRET`,
`DEMO_PAYMENT_SECRET` and `CRON_SECRET` automatically.

| Needed for | Variables |
|---|---|
| Always | `DATABASE_URL`, `AUTH_SECRET`, `APP_URL` |
| Card payments | `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (+ `ALLOW_LIVE_PAYMENTS=true` for live) |
| Email | `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` |
| SMS | `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` |
| Google | `SITE_INDEXABLE=true`, `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`, `SOCIAL_LINKS` |
| Server tuning | `NODE_VERSION=22`, `NODE_OPTIONS`, `MALLOC_ARENA_MAX`, `DATABASE_POOL_MAX`, `IN_PROCESS_WORKER` |

## If something goes wrong

- **502 / site won't load:** Render → service → **Events** (look for "out of memory") and **Logs**.
- **Build failed:** Render → **Deploys** → the failed deploy → logs.
- **Health check:** `https://www.diwaan.com.au/api/health` should say `ok`.
- The server refuses to start with unsafe settings and prints the exact reason in the Logs (e.g. a missing key).
