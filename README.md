# NestIn — Find Your Space

Verified PG, hostel and co-living marketplace for Indian cities, with a resident portal, an owner CRM (leads → visits → bookings → customers → payments), staff role-based access control, owner subscriptions (Starter / Professional / Business), an evidence-backed verification workflow, and a platform admin console with billing and operations panels. Installable as a PWA with web push.

- **Frontend:** React 19, TypeScript, Vite, Tailwind 4, React Router 7
- **Backend:** Node 22+, Express, built-in `node:sqlite` (no native add-ons), scrypt + HS256 JWT sessions
- **Tests:** `node:test` API integration suite, Playwright end-to-end journeys
- **Deploy:** single container (multi-stage Dockerfile), `docker-compose.yml`, GitHub Actions CI

> Audit and design notes: [`docs/AUDIT-2026-09-16.md`](docs/AUDIT-2026-09-16.md)

---

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000 (API + Vite dev server)
```

The first start creates `data/nestin.db` and seeds a demo workspace:

| Role | Login | Password | Where |
|---|---|---|---|
| Resident (tenant) | `tenant@nestin.com` | `NestIn@2026` | Home → **Log in** |
| PG owner | `owner@nestin.com` | `NestIn@2026` | Home → **Log in** → *PG Owner* |
| Staff (property manager) | `staff@nestin.com` | `NestIn@2026` | Same as owner |
| Super admin | `admin@nestin.io` | `Admin@NestIn2026` + code `NESTIN-SUPER-ADMIN-2026` | `/admin/login` |

Demo data (and these accounts) only exist when `SEED_DEMO_DATA=true` (default in development). Production refuses to start without your own secrets — see **Configuration**.

Other scripts:

```bash
npm run check          # typecheck + lint (zero warnings) + prettier — also runs as the pre-commit hook
npm run typecheck      # tsc over server, client and tests
npm run test:api       # API integration tests (in-memory DB, ~3 s)
npm run test:e2e       # Playwright journeys against an isolated server on :3100
VISUAL=true npm run test:e2e   # include visual-regression snapshots
npm run build          # dist/ (client) + dist/server.mjs (API)
npm start              # run the production build
```

---

## What's in the box

```
server/                       API server
  app.ts                      Express app factory, middleware order, static/Vite hosting
  config.ts                   Environment configuration (fails fast in production)
  db/database.ts              SQLite connection, schema, JSON document collections, transactions
  db/repositories.ts          Typed collections (users, sessions, properties, leads, bookings, …)
  db/seed.ts                  Demo workspace + marketplace catalogue seeding
  lib/                        jwt, password (scrypt), validation, ids, events/audit, rate limiting
  middleware/auth.ts          Session resolution, requireRole, requirePermission, owner scoping
  services/                   Domain logic: auth, property, crm (workflows), rbac, tenant, admin, notifications
  routes/                     HTTP routes per area
src/                          React application
  context/                    Auth, PropertyListing, CRM, RBAC, Wishlist — API-backed, optimistic
  lib/apiClient.ts            The only place the UI talks to the API
  lib/domain/                 Rules shared with the server (completeness score, defaults)
  data/                       Seed datasets (used by the server; RBAC catalogue + cities used by the UI)
  pages/, components/         UI
tests/api/                    node:test integration suites
tests/e2e/                    Playwright specs
docs/                         Audit report
```

### Business model & verification

- **Plans.** Every owner workspace has one subscription (`subscriptions` table). New owners get a `PLAN_TRIAL_DAYS` Professional trial, then Starter (1 property, 1 staff). Upgrades go through `/billing/checkout` (Razorpay order + signature verification, or simulated without keys), produce a GST invoice, and are reconciled nightly (7-day grace, then downgrade). Operators can grant complimentary plans from Admin → Billing.
- **Platform fee.** `PLATFORM_FEE_PERCENT` of every online tenant payment is recorded as `platformFee` on the payment; Admin → Billing shows MRR, subscription revenue and fees.
- **Verified badge.** Approving a listing with the badge requires all eight checklist items (documents, licences, site visit, photos, caretaker ID + background, safety, pricing), a site-visit date and notes; the record (`property.verification`) carries who verified, when, and an expiry. Badges can be revoked; the sweep expires stale ones and warns 30 days ahead.
- **Honest marketing.** The landing page, city pages and About page read `/public/stats` and the enriched `/properties/public/cities` — there are no hard-coded inventory numbers in the UI.

### Domain & tenancy model

- **Owner tenancy.** Every CRM/RBAC/property record carries `ownerId`. Owners see their own tenancy; employees act inside their employer's tenancy with the permissions of their role (+ per-employee overrides); super admins see everything.
- **Residents (tenants)** own their bookings, payments, documents, tickets and wishlist. A resident booking is the *same record* the owner sees in the CRM.
- **Workflows are server-side and transactional:** booking approval reserves the bed, creates/links the customer, records the move-in payment, converts the lead and notifies both parties. Cancellation and move-out release the bed. Listing status moves `draft → pending_approval → published | rejected` with a completeness gate and admin review.

### API

All endpoints live under `/api/v1` and return `{ success, data | error, metadata: { correlationId, … } }`.

| Area | Highlights |
|---|---|
| `auth` | `POST register/login/google`, `POST admin/login`, `POST forgot-password|reset-password|verify-email|resend-verification`, `GET me`, `PUT profile`, `POST change-password`, `GET/DELETE sessions`, `POST logout`, `DELETE account` |
| `properties` | `GET public` (card projection, filters), `GET public/:slug`, `POST public/:id/reviews`; owner: `GET/POST owner`, `PUT/DELETE owner/:id`, `POST owner/:id/submit`, `PATCH owner/:id/beds` |
| `crm` | `GET snapshot`; support desk (`GET support`, `POST support/:id/messages|resolve`); `POST/PUT/DELETE leads|visitors|customers`; bookings `POST`, `PUT :id`, `POST :id/approve|reject|cancel|complete-move-in`; `POST customers/:id/payments|move-out`; activity & notifications |
| `rbac` | `GET catalog|snapshot`; roles `POST/PUT/DELETE`; employees `POST/PUT/DELETE`, `POST :id/reset-password`; `POST audit` |
| `tenant` | bookings (`GET`, `POST`, `POST :id/cancel`), `POST visits`, payments (`GET`, `POST checkout`, `POST checkout/complete`, receipt), documents, support tickets, wishlist, notifications |
| `billing` | `GET /` (plan, usage vs limits, invoices), `POST checkout` (Razorpay or simulated), `POST checkout/complete`, `POST cancel` |
| `push` | `GET config` (VAPID public key), `POST subscribe|unsubscribe` |
| `files` | `POST` multipart upload (`purpose`: avatar, property, document); `GET :key` authenticated access to private files |
| `webhooks` | `POST razorpay` (raw body, HMAC verified, idempotent) |
| `admin` | `GET stats|users|properties|bookings|inbound|audit|support|outbox|integrations`, `PUT users/:id/status`, `POST properties/:id/approve` (requires the verification checklist + site-visit date for the Verified badge) `|reject|revoke-verification`, `POST properties/verification-sweep`, `PATCH properties/:id/badges`, `PUT inbound/:id`, `GET billing`, `PUT billing/:ownerId`, `GET ops/backups|ops/metrics`, `POST ops/backups` |
| `public` | `GET stats` (live platform numbers for the landing page), `POST contact|owner-demo|newsletter` (rate limited) |

The public catalogue (`GET /properties/public`) filters, sorts and paginates in SQL: `city`, `area`, `q`, `category`, `type`, `minRent`, `maxRent`, `verified=true`, `available=true`, `sort=relevance|rent_asc|rent_desc|rating|newest`, `page`, `pageSize`; totals are returned in `metadata`. Without `page` it returns the whole catalogue (≤500) for the client-side facet UI.

`GET /metrics` (outside `/api`) exposes Prometheus counters and latency histograms per route; it requires `Authorization: Bearer $METRICS_TOKEN`.

Authorization: `Authorization: Bearer <jwt>`. Tokens are bound to a server session; logout, password change, staff deactivation and account suspension revoke them immediately. Auth routes are rate limited per IP + email.

---

## What's new (v3.2 — 19 Sep 2026)

| Area | Features |
|---|---|
| Platform | SQL-backed Find PG search (room type, food, amenities, rating, gender, near-me); durable job queue with retries; persistent rate limits; Sentry hook (`SENTRY_DSN`); client-side image optimisation; short-lived access tokens + httpOnly refresh cookie; `npm run test:load` |
| Owners | Finance (P&L, expense ledger, utility meter readings billed to residents), Insights (occupancy forecast, property comparison, CSV import), Tasks board, Residents (agreements, move-outs & deposit settlement, NPS + maintenance SLA), add-ons (paid verification visit, featured placement), WhatsApp APPROVE/REJECT/STATUS bot |
| Residents | OTP-signed rent agreements, move-out notice & deposit refund tracking, UPI autopay mandates, referral credits, roommate compatibility (opt-in), maintenance requests with photos + SLA, NPS prompt, video tours, Hindi/Telugu UI scaffold |
| Admin | Growth analytics (funnel, conversion, churn, LTV, per-city, weekly) |
| Mobile | `capacitor.config.ts` + `docs/MOBILE.md` for Play Store / App Store shells |

New environment variables: `ACCESS_TOKEN_TTL_SECONDS`, `REFERRAL_CREDIT_INR`, `SENTRY_DSN`, `ALLOW_SIMULATED_PAYMENTS`. Postgres path: `docs/POSTGRES-MIGRATION.md`.

## Configuration

Copy `.env.example` to `.env`. Everything is optional in development. In production the server checks its configuration on start-up (`assertProductionConfig` in `server/config.ts`) and refuses to boot with a clear message rather than running insecurely; it requires:

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | ≥ 32 random characters. `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_ACCESS_CODE` | Admin console credentials (created on first start) |
| `DATABASE_PATH` | SQLite file (default `./data/nestin.db`; `/data/nestin.db` in Docker) |
| `SEED_DEMO_DATA` | Demo workspace + catalogue. Default `true` in development, **`false` in production** (opt in with `SEED_DEMO_DATA=true`, which then also requires a non-default `DEMO_PASSWORD`). |
| `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` | Enables "Continue with Google" (Google Identity Services; verified server-side) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Live Razorpay checkout (orders + signature verification + webhook at `/api/v1/webhooks/razorpay`). In development, missing keys make payments *simulated* successes. **In production the server refuses to start without keys** unless `ALLOW_SIMULATED_PAYMENTS=true` (staging only) — otherwise every checkout answers 503 `PAYMENTS_UNAVAILABLE`. |
| `STORAGE_DRIVER`, `S3_*` | Uploads (listing photos, avatars, KYC documents). Local disk by default; any S3-compatible bucket when set. Private files are served only through authenticated/presigned URLs. |
| `EMAIL_PROVIDER`, `RESEND_API_KEY` / `SENDGRID_API_KEY`, `EMAIL_FROM` | Transactional email (booking updates, password reset, email verification, rent reminders). Default `log` records to the admin Outbox without sending. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | WhatsApp notifications for users who opt in. |
| `RENT_DUE_DAY`, `DISABLE_JOBS` | Scheduler: monthly rent reminders (paid plans), subscription reconciliation, verification-expiry sweep, nightly backup. Every job is idempotent per period. |
| `PLATFORM_FEE_PERCENT`, `PLAN_TRIAL_DAYS`, `SUBSCRIPTION_GST_PERCENT` | Business model: commission on online rent, Professional trial length for new owners, GST on subscription invoices. Plan prices/limits live in `src/lib/domain/plans.ts` and are enforced server-side (402 `PLAN_LIMIT`). |
| `VERIFICATION_VALIDITY_MONTHS` | How long a "NestIn Verified" badge lasts before the sweep expires it and the owner is asked for a re-verification visit. |
| `DISABLE_BACKUPS`, `BACKUP_DIR`, `BACKUP_KEEP`, `BACKUP_S3_PREFIX` | Nightly `VACUUM INTO` snapshots of the SQLite database, rotated locally and mirrored to S3 when configured. Admin → Operations lists them and can trigger one. |
| `LOG_FORMAT`, `METRICS_TOKEN` | JSON request logs with correlation ids; bearer token for the Prometheus `/metrics` endpoint (required in production). |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push. Generate with `npx web-push generate-vapid-keys`. Devices subscribe from Settings → Notifications (residents) or Owner Hub → Notifications. |
| `DOMAIN` | Public hostname for the production stack (Caddy issues TLS automatically). |
| `CORS_ORIGINS`, `TRUST_PROXY` | When the API is called from another origin / behind a proxy |

---

## Deployment

**Single server with automatic HTTPS** (recommended):

```bash
cp .env.example .env
# set DOMAIN, JWT_SECRET, SUPER_ADMIN_*, SEED_DEMO_DATA=false and any providers (Razorpay, S3, email, WhatsApp, Google)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

This starts the app plus Caddy, which obtains a Let's Encrypt certificate for `DOMAIN` and proxies to the app. Uploads and the SQLite database live in the `nestin-data` volume (back it up). Point your DNS A/AAAA record at the server before starting.

**Without the proxy** (behind your own load balancer): `docker compose up -d --build` exposes `:3000`; set `TRUST_PROXY=true` and `APP_URL` to the public URL.

After the first start, open `/admin/login` with your `SUPER_ADMIN_*` credentials; the **Messaging** tab shows which integrations are active and every email/WhatsApp the platform tried to send.

---

## Testing strategy

- **API integration (`tests/api`)** — boots the real app on an ephemeral port with an in-memory database and drives it over HTTP: authentication hardening (forged/tampered/`alg=none` tokens, rate limiting, escalation attempts), RBAC and tenancy isolation, the complete booking lifecycle with concurrency, the publishing workflow, admin operations.
- **End-to-end (`tests/e2e`)** — Playwright starts an isolated server (`:3100`, fresh DB) and walks the real UI: marketplace, property page, contact form, resident and owner sign-in, protected routes.
- **CI** — `.github/workflows/ci.yml` runs typecheck → API tests → build → e2e on every push/PR.

### PWA

`public/manifest.webmanifest`, `public/sw.js` (offline shell, cached assets, push handlers) and `public/offline.html` make the site installable; the service worker is registered in production builds only. Icons are generated from `Images/NESTIN_logo.png` into `public/icons/`.

### Legal

`/terms`, `/privacy` (DPDP Act 2023) and `/refund-policy` are rendered from `src/pages/LegalPages.tsx`. Replace the `LEGAL_ENTITY` placeholders (entity, address, grievance officer) and have counsel review before launch.
