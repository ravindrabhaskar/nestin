# NestIn — Full Application Test Report

**Date:** 19 September 2026 · **Build under test:** commit `3ea1535` (main) · **Environment:** Node 24.19, Windows 11, Chromium (Playwright 1.62), in-memory SQLite for API tests, file SQLite for e2e · **Result:** all layers pass; 9 defects found during the pass were fixed in the same commit.

---

## 1. Scope and method

The application was tested in five layers, from the outside in. Every layer was run to completion after the fixes, so the numbers below are the final state.

| Layer | What it covers | How | Result |
|---|---|---|---|
| 1. Static | Type safety, lint (zero warnings), formatting, line endings | `npm run check` | ✅ clean |
| 2. API integration | 51 scenario tests across auth, RBAC, tenancy isolation, booking lifecycle, publishing workflow, billing, uploads, webhooks, jobs, ops | `npm run test:api` | ✅ 51 / 51 |
| 3. Adversarial API sweep | 125 probes with hostile or malformed input against every router: bad JSON, 3 MB bodies, `alg=none` JWTs, prototype pollution, SQL/LIKE metacharacters, path traversal, role escalation, cross-tenant IDOR, negative/absurd amounts, executable uploads, forged webhooks | `node --import tsx tests/exploratory/api-sweep.ts` | ✅ 125 probes, 0 findings |
| 4. Browser crawl | Every route (15 public + 11 resident + 13 owner + admin) as anonymous, resident, owner, staff and admin, at 1280 px and 375 px. Per page: console errors, uncaught exceptions, 5xx/404 responses, horizontal overflow, missing `<h1>`, broken images, unlabeled form controls; plus every internal link on the marketing pages | `tests/e2e/crawl.spec.ts` | ✅ 11 / 11 |
| 5. Cross-role UI flows | Real user journeys through the UI, verified on the other side of the relationship (see §3) | `tests/e2e/flows.spec.ts` + `journeys.spec.ts` | ✅ 19 / 19 |
| 6. Production build | `node dist/server.mjs` with `NODE_ENV=production`, clean DB, no demo data: SPA, API, PWA assets, stats endpoint | manual smoke | ✅ all 200; stats report zeros as designed |

Totals: **51 API tests · 125 adversarial probes · 30 browser tests · 1 production smoke**. Bundle: 640 KB main chunk (181 KB gzip).

---

## 2. Defects found in this pass (all fixed)

| # | Sev | Area | Defect | Fix | Regression guard |
|---|---|---|---|---|---|
| T1 | High | Booking UX | The "Reserve & Move-in" modal defaulted to the first room even when it was full, so a listing shown as *available* answered **409 "No vacant beds"** when the resident tried to book. | Modal defaults to the first room with a free bed, shows a room picker with per-room availability, and disables submit for a full room. [PropertyDetailsView.tsx](../src/components/property-details/PropertyDetailsView.tsx) | `flows.spec.ts` books through the UI end to end |
| T2 | High | Inventory | Advertised availability (`availableBedsCount`, catalogue `available_beds`) only subtracted *occupied* beds, not beds held by pending/confirmed reservations. Seeded listings also carried stale counts. | `syncBedAvailability()` runs after every booking transition; one-time normalisation of every listing at startup. [propertyService.ts](../server/services/propertyService.ts) | `hardening.test.ts`: availability drops by 1 on booking, restored on cancel |
| T3 | Medium | Resident UX | An unapproved booking was labelled **UPCOMING** with "Bed Allotted", indistinguishable from a confirmed one. | `approval` state exposed on `TenantBookingItem`; new "Awaiting confirmation" badge and explanatory text. | `flows.spec.ts` asserts the badge appears before approval and disappears after |
| T4 | High | RBAC | `PUT /rbac/roles/:id` with `permissions: {}` on the owner role passed the "cannot be restricted" check (nothing to iterate) and **wiped the owner role's permissions**. | Any permission change on the owner role is refused (409). | `hardening.test.ts` |
| T5 | Medium | Bookings | Residents could book a move-in date in the past. | Tenant-initiated bookings must start today or later (owners may still backfill). | `hardening.test.ts` |
| T6 | Medium | Payments | Legacy `POST /tenant/payments` bypassed the production payments guard, and the tenant projection hid whether a payment was simulated. | Endpoint goes through `assertPaymentsAvailable()`, is refused when a real gateway is configured, and `gateway` is exposed on tenant payments. | `hardening.test.ts` (503 without gateway) |
| T7 | Low | Payments | Amounts accepted fractional paise (`100.999`). | `v.money()` rounds to 2 decimals. | `hardening.test.ts` |
| T8 | Medium | Uploads | An 11 MB upload produced an **unhandled `MulterError` → HTTP 500** with a stack trace in the log. | Error handler maps it to `413 PAYLOAD_TOO_LARGE` / `400 INVALID_UPLOAD`. | `hardening.test.ts` |
| T9 | Low | Mobile layout | `/my-bookings` card overflowed the 375 px viewport by 22 px. | Left column constrained to the card width on small screens. | `crawl.spec.ts` overflow check |
| T10 | Low | Accessibility | ~30 `<select>` filters (CRM, employees, wizard, admin, settings), the profile photo file input and the sort control had no accessible name; the owner Support Desk page had no `<h1>`. | `aria-label`s added; page heading added. | `crawl.spec.ts` unlabeled-control and `<h1>` checks |

Three findings from the sweep turned out to be **false positives** after inspection and were corrected in the probe, not the app: the empty `ownerEmail` key on public listings (value is blanked, nothing leaks), an injected `isVerified` key on drafts (inert — the badge derives from the system-controlled `isNestinVerified`), and admin accounts answering 403 rather than 401 on the normal login endpoint (deliberate: "use the admin console").

---

## 3. What was verified to work (by layer)

### Security & access control (sweep + integration)
- Unsigned, garbage and `alg=none` tokens → 401; token dead immediately after logout; sessions listable and revocable.
- Registration cannot create `super_admin`; profile update cannot change `role`, `ownerId` or `email`; password change requires the current password; account deletion requires password confirmation.
- Forgot-password gives identical responses for known and unknown emails; invalid reset tokens rejected.
- Admin login requires the access code; admin cannot use the normal login.
- Tenants blocked from CRM/admin; owners blocked from admin; staff without permission blocked from roles, billing, deletes.
- Owners cannot read, edit, delete or touch beds on another owner's listing; tenants cannot read, cancel, pay, delete documents on, or post into another tenant's bookings, receipts, documents or tickets.
- Owner role locked (edit 409, delete 409); staff cannot be given the owner role; duplicate staff emails rejected.
- Public listings hide owner email, documents and occupant names; path traversal in slugs → 404.
- Malformed JSON → 400; 3 MB body → 413; array/null bodies → 4xx; prototype-pollution payloads inert; unknown origins get no CORS headers; `/metrics` hidden without token and compares timing-safely.
- Uploads: missing file → 400; executable type → 400; 11 MB → 413; traversal filename neutralised; private files need auth.
- Webhooks: unsigned → 401; wrong amount never marks Paid.

### Business rules
- Listings: owner cannot self-publish/self-verify/re-own; incomplete listing cannot be submitted; negative rent / zero capacity rejected; deleted drafts are not public.
- Bookings: unknown property 404; past move-in refused; owner cannot use the resident endpoint; double-booking of a bed refused; cancel is idempotent-safe; cancelled bookings cannot be approved; availability reflects reservations.
- Payments: zero/negative/absurd amounts and unknown types rejected; fractional paise rounded; another user cannot complete my checkout; plan limits enforced (402); MRR correct for annual plans; invoice serials sequential per financial year.
- Catalogue: pagination handles `page=0/-1/abc`, `pageSize=0/-5/1e9` (capped at 500), unknown sort, SQL/LIKE metacharacters and 5 000-char queries.
- Admin: no password hashes in user lists; audit limit capped; unknown plan / months out of range rejected.

### Cross-role journeys (UI)
1. Resident reserves a bed on the listing page → sees it under *Upcoming* as "Awaiting confirmation" → owner approves → resident sees it confirmed → pays rent via the (simulated) UPI checkout → invoice `INV-2026-27-000001` appears.
2. Resident raises a support ticket → it reaches the responsible owner's Support Desk → owner replies → resident sees the reply.
3. Resident saves a listing from its page → persists across reload → appears under *Saved*.
4. Owner adds a staff member → temporary password issued once → staff signs in through the dialog → lands on the workspace with `role=employee`, scoped to the owner.
5. (existing journeys) marketing pages, Find PG, contact form → admin inbox, wrong password rejected, protected routes, live stats, pricing & legal pages, subscription upgrade, admin verification checklist, CSP guard, admin console without 403s.

### Browser health
- 0 console errors, 0 uncaught exceptions, 0 5xx, 0 unexpected 404s, 0 broken images, 0 broken internal links, 0 horizontal overflow, an `<h1>` on every page, an accessible name on every form control — on desktop and phone widths, for all five user types.

---

## 4. What is *not* covered (honest limits)

- **Real payment gateway.** Razorpay was exercised only through signature/webhook verification with synthetic payloads. A live test with Razorpay test keys should be done once keys exist.
- **Email / WhatsApp / push delivery.** Providers are exercised in `log` mode (admin Outbox). Real delivery needs provider credentials.
- **Load / concurrency.** Double-booking is tested with two sequential requests inside a transaction; there is no sustained load test. SQLite in WAL mode is adequate for the launch scale; the audit's ~1 000-listing note for client-side Find PG facets still stands.
- **Cross-browser.** Chromium only. Firefox/WebKit projects can be added to `playwright.config.ts`.
- **Screen-reader semantics** beyond names/headings (focus order, live regions) were not audited with assistive technology.
- **Visual regression** snapshots are opt-in (`VISUAL=true`) and OS-specific; not run in this pass.

---

## 5. How to reproduce

```bash
npm ci
npm run check                                   # static
npm run test:api                                # 51 integration tests
node --import tsx tests/exploratory/api-sweep.ts  # 125 adversarial probes
npm run build
npx playwright test --project=desktop-chrome    # 30 browser tests (journeys, crawl, flows)
```

CI runs the first five automatically on every push; the pre-commit hook runs `npm run check`.
