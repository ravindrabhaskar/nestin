# NestIn — Find Your Space

Verified PG, hostel and co-living marketplace for Indian cities, with a resident portal, an owner CRM (leads → visits → bookings → customers → payments), staff role-based access control, and a platform admin console.

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

### Domain & tenancy model

- **Owner tenancy.** Every CRM/RBAC/property record carries `ownerId`. Owners see their own tenancy; employees act inside their employer's tenancy with the permissions of their role (+ per-employee overrides); super admins see everything.
- **Residents (tenants)** own their bookings, payments, documents, tickets and wishlist. A resident booking is the *same record* the owner sees in the CRM.
- **Workflows are server-side and transactional:** booking approval reserves the bed, creates/links the customer, records the move-in payment, converts the lead and notifies both parties. Cancellation and move-out release the bed. Listing status moves `draft → pending_approval → published | rejected` with a completeness gate and admin review.

### API

All endpoints live under `/api/v1` and return `{ success, data | error, metadata: { correlationId, … } }`.

| Area | Highlights |
|---|---|
| `auth` | `POST register/login/google`, `POST admin/login`, `GET me`, `PUT profile`, `POST change-password`, `GET/DELETE sessions`, `POST logout`, `DELETE account` |
| `properties` | `GET public` (card projection, filters), `GET public/:slug`, `POST public/:id/reviews`; owner: `GET/POST owner`, `PUT/DELETE owner/:id`, `POST owner/:id/submit`, `PATCH owner/:id/beds` |
| `crm` | `GET snapshot`; `POST/PUT/DELETE leads|visitors|customers`; bookings `POST`, `PUT :id`, `POST :id/approve|reject|cancel|complete-move-in`; `POST customers/:id/payments|move-out`; activity & notifications |
| `rbac` | `GET catalog|snapshot`; roles `POST/PUT/DELETE`; employees `POST/PUT/DELETE`, `POST :id/reset-password`; `POST audit` |
| `tenant` | bookings (`GET`, `POST`, `POST :id/cancel`), `POST visits`, payments (`GET`, `POST`, receipt), documents, support tickets, wishlist, notifications |
| `admin` | `GET stats|users|properties|bookings|inbound|audit`, `PUT users/:id/status`, `POST properties/:id/approve|reject`, `PATCH properties/:id/badges`, `PUT inbound/:id` |
| `public` | `POST contact|owner-demo|newsletter` (rate limited) |

Authorization: `Authorization: Bearer <jwt>`. Tokens are bound to a server session; logout, password change, staff deactivation and account suspension revoke them immediately. Auth routes are rate limited per IP + email.

---

## Configuration

Copy `.env.example` to `.env`. Everything is optional in development; production requires:

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | ≥ 32 random characters. `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_ACCESS_CODE` | Admin console credentials (created on first start) |
| `DATABASE_PATH` | SQLite file (default `./data/nestin.db`; `/data/nestin.db` in Docker) |
| `SEED_DEMO_DATA` | `false` for a clean production database |
| `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` | Enables "Continue with Google" (Google Identity Services; verified server-side) |
| `RAZORPAY_*` | Reserved for the payment gateway integration; without keys online payments are recorded as simulated |
| `CORS_ORIGINS`, `TRUST_PROXY` | When the API is called from another origin / behind a proxy |

---

## Deployment

```bash
cp .env.example .env    # set JWT_SECRET, SUPER_ADMIN_*, optionally SEED_DEMO_DATA=false
docker compose up -d --build
```

The container runs as a non-root user, exposes `:3000`, persists the database in the `nestin-data` volume and reports health at `/api/v1/health`. Put it behind TLS (Caddy/nginx/Cloud load balancer) and set `TRUST_PROXY=true`.

---

## Testing strategy

- **API integration (`tests/api`)** — boots the real app on an ephemeral port with an in-memory database and drives it over HTTP: authentication hardening (forged/tampered/`alg=none` tokens, rate limiting, escalation attempts), RBAC and tenancy isolation, the complete booking lifecycle with concurrency, the publishing workflow, admin operations.
- **End-to-end (`tests/e2e`)** — Playwright starts an isolated server (`:3100`, fresh DB) and walks the real UI: marketplace, property page, contact form, resident and owner sign-in, protected routes.
- **CI** — `.github/workflows/ci.yml` runs typecheck → API tests → build → e2e on every push/PR.
