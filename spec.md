# spec.md — Domestic Services Platform API (MVP)

Detailed requirements. Standing rules and invariants are in `AGENTS.md`; build order is in `PROMPT.md`. Each rule is stated once here — reference it instead of restating it.

## 1. Scope

- Public discovery without an account. Customers contact providers by native call (`tel:+251…`).
- Each provider has exactly one category, one city, one sub-city.
- Launch geography: Addis Ababa and its 11 sub-cities. Model stays extensible to more cities via the admin API.
- Core metric: **call-click events**. Never describe them as answered or completed calls.
- Admins control verification and activation. Providers control only `isAvailable`.
- Customers with accounts can rate and review. Reviews are not "verified transactions" (no booking exists).
- Out of scope: pricing, booking, chat, payments, escrow, multi-category providers, customer phone change, SMS and one-time codes.

## 2. Data model

`src/db/schema.js` is the source of truth. This section lists what must exist; do not paste the schema here.

**Reference tables**
- `cities`: `nameEn`, `nameAm`, `slug` (unique), `isActive`.
- `sub_cities`: `cityId`, `nameEn`, `nameAm`, `slug`, `isActive`. Unique `(cityId, slug)` and unique `(cityId, id)` (target for the composite FK).
- `categories`: `nameEn`, `nameAm`, `slug` (unique), `iconName`, `displayOrder`, `isActive`.

**providers**
- Identity/profile: `fullName`, `phone` (unique, E.164), `passwordHash`, `mustChangePassword`, `cityId`, `subCityId`, `woreda`, `categoryId`, `bio`, `experienceYears`, `avatarUrl`, `workSamples` (jsonb array).
- Admin-controlled state: `verificationStatus`, `verificationRejectionReason`, `verificationReviewedAt/By`, `isActive`, `activatedAt/By`, `suspendedAt/By`, `suspensionReason`.
- Provider-controlled: `isAvailable` (default `false`).
- Defaults on registration: `verificationStatus='PENDING'`, `isActive=false`.
- Constraints: FK `(cityId, subCityId)` → `sub_cities(cityId, id)` plus FK `cityId` → `cities`. Index for public search on `(verificationStatus, isActive, cityId, subCityId, categoryId)`.

**provider_verification_documents** — one row per submission, never overwritten
- `providerId` (cascade), `objectKey` (private bucket key, never a URL), `status`, `rejectionReason`, `reviewedAt/By`, `uploadedAt`.

**admin_users**: `email` (unique), `passwordHash`. Created only by the seed. No public admin registration.

**customer_users**: `fullName` (required), `phone` (unique, E.164), `passwordHash`.

**provider_reviews**
- `providerId`, `customerId` (both cascade), `rating`, `comment` (≤ 2000), `status` (`PUBLISHED` | `HIDDEN`), `moderatedBy`, `moderatedAt`, `moderationReason`, timestamps.
- Unique `(providerId, customerId)`. Check `rating BETWEEN 1 AND 5`. Index `(providerId, status, createdAt)`.
- Public reviewer name is `customer_users.fullName`. Never expose phone or ID.

**call_logs**: `providerId`, `clientIpHmac`, `createdAt`. Indexes `(providerId, createdAt)` and `(clientIpHmac, providerId, createdAt)`.

**refresh_tokens**
- `tokenHash` (unique, SHA-256 hex), exactly one of `providerId` / `customerId` / `adminUserId` (check with `num_nonnulls = 1`), `familyId` (uuid, shared by all tokens descending from one login), `expiresAt`, `revokedAt`, `replacedByTokenHash`.
- Reuse detection revokes every token with the same `familyId`.

**phone_change_requests** (providers only; see §4.5)
- `providerId` (cascade), `newPhone` (E.164), `reason`, `status` (`PENDING` | `APPROVED` | `REJECTED` | `CANCELLED`), `rejectionReason`, `reviewedAt/By`, `createdAt`.
- Partial unique index on `providerId` where `status = 'PENDING'`: at most one open request per provider.

**admin_audit_log**: `adminId`, `action`, `targetType`, `targetId`, `reason`, `createdAt`. Written for: document access, verification changes, activation/suspension, password resets, phone-change decisions, review moderation. Never store secrets or temporary passwords here.

**review_reports** (P1): `reviewId`, `reporterCustomerId`, `reason`, `createdAt`; unique `(reviewId, reporterCustomerId)`.

## 3. Provider state

### 3.1 Concerns kept separate

| Field | Controlled by | Meaning |
|---|---|---|
| `verificationStatus` | admin | identity review outcome |
| `isActive` | admin | approved to operate and not suspended |
| `isAvailable` | provider | public Available/Unavailable badge only |

- Public eligibility: `verificationStatus='APPROVED' AND isActive=true` (single shared helper).
- Eligible-but-unavailable providers stay in results with an Unavailable badge. `availableOnly=true` narrows results.
- Providers can never write `verificationStatus`, `isActive`, or any activation, suspension, or review metadata.

### 3.2 Verification transitions

Any transition not listed returns `409 INVALID_TRANSITION`.

| From | To | Actor | Requirements and side effects |
|---|---|---|---|
| `PENDING` | `APPROVED` | admin | A `PENDING` document row must exist. Marks it `APPROVED`. Does **not** activate. |
| `PENDING` | `REJECTED` | admin | Reason required. Marks the document `REJECTED`. Sets `isActive=false` (same transaction). |
| `APPROVED` | `REVOKED` | admin | Reason required. Marks the latest approved document `REVOKED`. Sets `isActive=false` (same transaction). |
| `REJECTED` | `PENDING` | provider | By uploading a replacement document (§7). |
| `REVOKED` | `PENDING` | admin | Explicit reopen. Provider may then upload a replacement. |

Each transition runs in one transaction updating the document row, the provider row, and `admin_audit_log`.

### 3.3 Activation

- Admin only. Activate requires `verificationStatus='APPROVED'`; otherwise `409`.
- Suspend sets `isActive=false`, records admin, timestamp, and reason (required). Re-activation clears suspension fields and records `activatedAt/By`.
- Activation never changes `verificationStatus`.
- "New and inactive" vs "suspended" is distinguishable by `suspendedAt IS NULL`.

### 3.4 What the provider frontend should show (API supplies the data)

- `PENDING`: documents awaiting review; no resubmission.
- `APPROVED`: approval message; listing still requires `isActive`.
- `REJECTED`: rejection reason; replacement upload allowed.
- `REVOKED`: contact support; uploading alone does not restore anything.

## 4. Authentication

### 4.1 Tokens

- Access JWT: HS256, 15 min (`ACCESS_TOKEN_TTL`), claims `sub`, `role` (`PROVIDER`|`CUSTOMER`|`ADMIN`), `iss`, `aud`. Verify with the algorithm pinned and issuer/audience/expiry checked.
- Refresh token: 32+ random bytes, base64url. Store only SHA-256. TTL 7 days (`REFRESH_TOKEN_TTL_DAYS`). Rotated on every refresh (new token, same `familyId`, old one `revokedAt` + `replacedByTokenHash`). Revoked on logout.
- Reuse of a rotated or revoked token revokes the whole `familyId`; the client must log in again.
- Browser delivery: `HttpOnly; Secure; SameSite=None; Path=/api/auth` cookie (frontend and API are on different Render origins). Never in `localStorage`. CSRF protection on `/refresh` and `/logout`: require the `Origin` header to match `CORS_ORIGINS` **and** a custom `X-Requested-With` header.
- Registration and login may issue tokens to an unverified/inactive provider so they can manage their account and resubmit documents. Such tokens never bypass public-visibility or admin checks.

### 4.2 Middleware

- `authenticate` validates the access token and attaches `{ id, role }`. `requireRole(role)` guards each router. Deny by default: a router with no role guard must be explicitly marked public.
- Provider-role routes load the provider row per request. If `mustChangePassword` is true, only `PATCH /api/provider/me/password` and `POST /api/auth/logout` are allowed (reading the flag from the DB avoids stale-token gaps).

### 4.3 Passwords

- bcrypt, `BCRYPT_ROUNDS` default 10 (benchmark before raising).
- bcrypt silently truncates at 72 bytes: enforce min 8 characters and max 72 **bytes**.
- Login failures return the same generic `401 INVALID_CREDENTIALS` whether the account is missing or the password is wrong. Run a dummy bcrypt compare for unknown accounts to keep timing similar.

### 4.4 Admin-assisted provider password reset

1. The provider calls support (login screen shows "Forgot password? Call support / ድጋፍ ይደውሉ").
2. The admin verifies identity per the support procedure (confirm account details, call back the registered number; ID-document access is admin-only).
3. Admin calls `POST /api/admin/providers/:id/reset-password` (empty body or `{ "reason": "..." }`).
4. Server generates a random temporary password (≥ 12 chars, `crypto`-based), stores only its bcrypt hash, sets `mustChangePassword=true`, revokes all of the provider's refresh tokens, and returns the temporary password **once** to the admin.
5. The temporary password is never logged or written to the audit log. The endpoint is strongly rate-limited. The endpoint never accepts an admin-chosen password.

### 4.5 Admin-mediated phone change

There is no SMS or one-time-code flow. The admin is the verification step.

1. The provider, signed in and re-entering their current password, submits a request with the new number and an optional reason.
2. The admin verifies identity per the support procedure: call the currently registered number if the provider still has it, otherwise check the provider against the ID document on file. The admin also confirms control of the new number by calling it.
3. The admin approves or rejects the request.

Rules:
- The new number is normalized (§9) and must not belong to any provider. Check at request time and again at approval; the DB unique constraint is the final guard (`409`).
- At most one `PENDING` request per provider (partial unique index). A second request returns `409` until the first is decided or cancelled.
- The provider can cancel their own pending request (`CANCELLED`).
- **Approval** runs in one transaction: re-check uniqueness, update `providers.phone`, mark the request `APPROVED` with reviewer and time, revoke all of the provider's refresh families, write an `admin_audit_log` entry (target is the request ID). Verification and activation state are unchanged.
- **Rejection** requires a reason, marks the request `REJECTED`, and leaves the phone unchanged.
- Only `PENDING` requests can be decided; anything else returns `409`.
- Customers cannot change their phone number in the MVP.

## 5. Rate limits

Separate, configurable `express-rate-limit` policies. Defaults:

| Endpoint class | Limit | Key |
|---|---|---|
| Login (provider/customer/admin) | 5 / 15 min | IP + normalized identifier |
| Registration | 5 / hour | IP |
| `POST /auth/refresh` | 20 / 15 min | IP + token hash |
| Phone-change request | 3 / hour | provider + IP |
| Document upload/resubmission | 5 / hour | provider + IP |
| `POST /leads/call` | 30 / min | IP (plus dedup, §8) |
| Admin mutations and resets | 10 / min | admin + IP |

Rate-limit responses are `429` and must not reveal whether an account exists. In-memory store, single instance (see §14).

## 6. API

### 6.1 Conventions

- Success: `{ "data": ... }`. Lists: `{ "data": [...], "pagination": { "page", "limit", "total", "totalPages" } }`.
- Errors: `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` with the correct status (`400 401 403 404 409 413 415 422 429 500`). Include the request ID in logs, not in leaked internals.
- Path IDs are positive integers. Pagination: `page ≥ 1`, `limit` 1–100, default 20.
- Update endpoints use allowlists and reject unknown fields.

### 6.2 Auth

| Endpoint | Access | Notes |
|---|---|---|
| `POST /api/auth/provider/register` | public | `multipart/form-data` |
| `POST /api/auth/provider/login` | public | phone + password |
| `POST /api/auth/customer/register` | public | `fullName`, `phone`, `password` |
| `POST /api/auth/customer/login` | public | phone + password |
| `POST /api/auth/admin/login` | public, strict limit | email + password |
| `POST /api/auth/refresh` | refresh cookie | rotates, returns new access JWT |
| `POST /api/auth/logout` | refresh cookie | revokes token family, clears cookie |

Provider registration fields: required `fullName`, `phone`, `password`, `cityId`, `subCityId`, `categoryId`, `idDocument`; optional `woreda`, `bio`, `experienceYears`, `avatarUrl`, `workSamples`. Upload first, then create provider + document rows in one transaction; delete the object if the transaction fails. Validate that the sub-city belongs to the city, and that city and category are active.

### 6.3 Public

- `GET /api/categories` — active, ordered by `displayOrder`.
- `GET /api/locations` — active cities with nested active sub-cities.
- `GET /api/providers` — query `categoryId`, `cityId`, `subCityId`, `availableOnly` (default false), `page`, `limit`. Eligible providers only. Includes safe category/location, `isAvailable`, average published rating, published review count.
- `GET /api/providers/:id` — one eligible provider; `404` if missing or not eligible.
- `GET /api/providers/:id/reviews` — paginated `PUBLISHED` reviews of an eligible provider; reviewer display name, rating, comment, date only.
- `POST /api/leads/call` — see §8.

### 6.4 Provider (`PROVIDER`)

- `GET /api/provider/me` — safe profile, verification status and rejection reason, `isActive`, `isAvailable`, `totalCallsReceived` (count of call-click events; the name is kept for client compatibility, the meaning is clicks).
- `PATCH /api/provider/me` — allowlist: `fullName`, `cityId`, `subCityId`, `woreda`, `categoryId`, `bio`, `experienceYears`, `avatarUrl`, `workSamples`. Re-validate category/location and the city–sub-city relationship.
- `PATCH /api/provider/me/availability` — `{ "isAvailable": boolean }` only.
- `PATCH /api/provider/me/password` — current password required (except when `mustChangePassword`, where the temporary password is the current password). Clears `mustChangePassword`, revokes refresh families, returns fresh tokens.
- `POST /api/provider/me/verification-document` — §7.
- `POST /api/provider/me/phone-change-requests` — `{ "newPhone", "reason"?, "currentPassword" }`; flow in §4.5. Creates a `PENDING` request; does not change the phone.
- `GET /api/provider/me/phone-change-requests/current` — the provider's latest request with status and rejection reason, or `null`.
- `DELETE /api/provider/me/phone-change-requests/current` — cancel the provider's own pending request.
- There is no provider-side review creation.

`avatarUrl` and `workSamples`: HTTPS URLs only, host must be in `MEDIA_HOST_ALLOWLIST`, max 6 work samples, max 2048 chars per URL.

### 6.5 Customer (`CUSTOMER`)

- `POST /api/providers/:id/reviews` — `{ rating: 1–5, comment? }`; target must be an eligible provider; one review per provider enforced by the DB unique constraint (`409` on conflict).
- `PATCH /api/reviews/:id` — owner only; `rating` and `comment` only.
- `DELETE /api/reviews/:id` — owner only.
- (P1) `POST /api/reviews/:id/report` — report a review; one report per customer per review.

### 6.6 Admin (`ADMIN`)

- `GET /api/admin/providers/pending` — providers with a `PENDING` document; safe details only.
- `GET /api/admin/providers/:id/verification-document` — authorize, then return a signed URL (TTL `ID_DOCUMENT_SIGNED_URL_TTL_SECONDS`, default 120) for the latest document. Writes an audit-log entry.
- `PATCH /api/admin/providers/:id/verification` — body per §3.2 (`status`, optional `rejectionReason`).
- `PATCH /api/admin/providers/:id/activation` — `{ isActive: true }` or `{ isActive: false, reason }`.
- `POST /api/admin/providers/:id/reset-password` — §4.4.
- `GET /api/admin/phone-change-requests` — paginated; `status` filter (default `PENDING`). Each item shows provider ID and name, current phone, requested phone, reason, and created date.
- `PATCH /api/admin/phone-change-requests/:id` — `{ "status": "APPROVED" }` or `{ "status": "REJECTED", "rejectionReason" }`; semantics in §4.5.
- `GET /api/admin/stats` — total, approved, pending, rejected, revoked, active, inactive/suspended providers, and total **call clicks**.
- Categories: `POST /api/admin/categories` (`nameEn`, `nameAm`, `slug`, `iconName`, `displayOrder`), `PATCH /api/admin/categories/:id` (allowlist + `isActive`).
- Cities: `POST /api/admin/cities`, `PATCH /api/admin/cities/:id`. Sub-cities: `POST /api/admin/sub-cities` (needs `cityId`), `PATCH /api/admin/sub-cities/:id`.
- (P1) `PATCH /api/admin/reviews/:id` — set `HIDDEN`/`PUBLISHED` with a reason; never edits the author's rating or text.

## 7. ID-document uploads

- `multer.memoryStorage()` with `limits.fileSize = ID_DOCUMENT_MAX_BYTES` (default 10 MB), single file field `idDocument`.
- Accept JPEG, PNG, WebP. Never trust client filename or MIME: sniff magic bytes server-side and reject mismatches (`415`; oversize `413`).
- Server generates the object key (e.g. `id-docs/<providerId>/<uuid>.<ext>`). Bucket is private. The DB stores the key only.
- Provider resubmission is allowed **iff** `verificationStatus` is `REJECTED` or `PENDING` **and** no document row for the provider has `status='PENDING'`. Otherwise `409`.
- Resubmission flow: upload object → transaction (insert document row `PENDING`, set provider `verificationStatus='PENDING'`) → on failure delete the new object. Never delete a prior object before the new submission commits.
- Superseded documents are retained for audit (default retention: 12 months after the provider's last review; deletion is an operator task, not automatic in the MVP). A document with an open review is never deleted.

## 8. Call-click tracking

- `POST /api/leads/call` with `{ "providerId" }`. Provider must be publicly eligible, else `404`.
- `clientIpHmac = HMAC-SHA256(CALL_IP_HMAC_SECRET, normalizedIp)` (hex). Never accept client-supplied IP or HMAC.
- Dedup window: `CALL_CLICK_DEDUP_WINDOW_SECONDS` (default 300) per `(providerId, clientIpHmac)`.
- Race safety: in one transaction, take `pg_advisory_xact_lock(hashtextextended(providerId || ':' || clientIpHmac, 0))`, check for a row within the window, insert only if none exists.
- Response is `200 { "data": { "recorded": true|false } }`; a deduplicated click is `recorded: false` and inserts nothing.
- Client IP comes from `req.ip` with `trust proxy` configured from `TRUST_PROXY_HOPS`. Never read `X-Forwarded-For` directly.
- Future analytics get new, clearly named metrics (e.g. unique clickers); do not redefine `totalCallsReceived`.

## 9. Phone numbers

- Strip spaces, hyphens, and parentheses, then accept exactly: `0[79]XXXXXXXX`, `251[79]XXXXXXXX`, `+251[79]XXXXXXXX` (8 digits after the `7`/`9`). Output `+251[79]XXXXXXXX`.
- Anything else is rejected with `422 INVALID_PHONE` — including bare 9-digit numbers and landlines.
- Uniqueness is checked after normalization; the DB unique constraint is the final guard (`409`).
- Phone changes are admin-mediated (§4.5). There is no SMS or OTP integration in the MVP.

## 10. Seed (`npm run seed`)

Transactional, conflict-safe, rerunnable. Data lives in `src/db/seed-data.js`.

**City:** Addis Ababa / አዲስ አበባ / `addis-ababa`.

**Sub-cities** (all under Addis Ababa):

| English | Amharic | Slug |
|---|---|---|
| Addis Ketema | አዲስ ከተማ | `addis-ketema` |
| Akaky Kaliti | አቃቂ ቃሊቲ | `akaky-kaliti` |
| Arada | አራዳ | `arada` |
| Bole | ቦሌ | `bole` |
| Gullele | ጉለሌ | `gullele` |
| Kirkos | ቂርቆስ | `kirkos` |
| Kolfe Keranio | ኮልፌ ቀራኒዮ | `kolfe-keranio` |
| Lideta | ልደታ | `lideta` |
| Nifas Silk-Lafto | ንፋስ ስልክ ላፍቶ | `nifas-silk-lafto` |
| Lemi Kura | ለሚ ኩራ | `lemi-kura` |
| Yeka | የካ | `yeka` |

**Categories:**

| English | Amharic | Slug | Icon | Order |
|---|---|---|---|---:|
| Plumbing | የቧንቧ ስራ | `plumbing` | `wrench` | 1 |
| Electrical | የኤሌክትሪክ ስራ | `electrical` | `zap` | 2 |
| Satellite Dish | የዲሽ ስራ | `satellite-dish` | `tv` | 3 |
| Wall Painting | የቀለም ቅብ ስራ | `wall-painting` | `paint-bucket` | 4 |
| Appliance Repair | የቤት እቃዎች ጥገና | `appliance-repair` | `cpu` | 5 |
| Clothes Washing | የልብስ እጥበት | `clothes-washing` | `shirt` | 6 |

**Admin:** if no admin exists for `ADMIN_INITIAL_EMAIL`, create one from `ADMIN_INITIAL_PASSWORD` (bcrypt). If it exists, leave it untouched. Fail with a clear message if creation is needed and the variables are missing or invalid. Never log passwords or secrets.

## 11. Environment variables

`src/config/env.js` validates all of these with zod; production fails fast on missing secrets. Ship `.env.example` with placeholders only.

| Variable | Purpose / default |
|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | Render injects it; local default `5000` |
| `DATABASE_URL` | Neon **pooled** connection (app) |
| `DATABASE_URL_DIRECT` | Neon **direct** connection (migrations) |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `TRUST_PROXY_HOPS` | Default `1`; verify on Render |
| `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` | Access-token signing and validation |
| `ACCESS_TOKEN_TTL` | Default `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | Default `7` |
| `BCRYPT_ROUNDS` | Default `10` |
| `CALL_IP_HMAC_SECRET` | Independent secret for IP HMAC |
| `CALL_CLICK_DEDUP_WINDOW_SECONDS` | Default `300` |
| `CLOUD_STORAGE_BUCKET`, `CLOUD_STORAGE_REGION`, `CLOUD_STORAGE_ENDPOINT` (optional), `CLOUD_STORAGE_ACCESS_KEY_ID`, `CLOUD_STORAGE_SECRET_ACCESS_KEY` | Private ID-document bucket (S3-compatible) |
| `ID_DOCUMENT_MAX_BYTES` | Default `10485760` |
| `ID_DOCUMENT_SIGNED_URL_TTL_SECONDS` | Default `120` |
| `MEDIA_HOST_ALLOWLIST` | Hosts allowed for `avatarUrl`/`workSamples` |
| `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD` | Seed only |

## 12. Required tests

Tests run from `npm test`, use a test database and an in-memory storage fake, and never touch production.

**Auth and authorization**
- Expired, malformed, wrong-audience, wrong-signature, and `alg`-swapped JWTs are rejected.
- Refresh rotates, rejects expired/revoked tokens, detects reuse (family revoked), and logout revokes.
- Each role is denied on the other roles' routes; unauthenticated is denied on protected routes.
- Provider profile patching cannot change `isActive`, `verificationStatus`, phone, password, document keys, or audit fields; unknown fields are rejected.
- `mustChangePassword` restricts a provider to password change and logout.
- Login failures are indistinguishable between unknown account and wrong password; rate limits return `429`.

**Provider lifecycle and privacy**
- New providers are pending, inactive, and absent from public results.
- Only approved + active providers appear; availability changes the badge, not visibility; `availableOnly` narrows.
- Every row of the §3.2 transition table, plus a `409` for an illegal transition; reject/revoke removes the provider from public results immediately.
- Activation requires `APPROVED`; suspend/reactivate metadata is correct.
- Resubmission rule (§7): allowed after rejection and after admin reopen; blocked while pending, approved, or revoked.
- Public and provider responses never contain object keys, signed URLs, password/token hashes, or audit fields.
- Non-admins cannot get signed URLs; admin access writes an audit entry; oversized and type-spoofed files are rejected; a failed DB write deletes the orphaned object.
- Admin password reset sets `mustChangePassword`, revokes refresh families, and returns the temporary password once.

**Validation and integrity**
- Phone normalization accepts every §9 form and rejects the rest; duplicates are `409`.
- Phone change: wrong current password is rejected; only one pending request per provider (DB-enforced); malformed or already-registered numbers are rejected at request time and again at approval; approval updates the phone, revokes refresh families, and writes an audit entry; rejection leaves the phone unchanged; the provider can cancel; non-admins cannot decide requests.
- Provider cannot choose a sub-city from another city; invalid IDs, pagination, ratings, and text lengths are rejected.
- One review per customer per provider (DB-enforced); only the owner edits or deletes; hidden/deleted reviews are excluded from rating averages.
- Seed rerun creates no duplicates and does not change an existing admin password.
- Multi-write operations roll back on failure.

**Call clicks**
- New eligible click creates one event; repeat within the window does not; click after the window does.
- Concurrent duplicate requests (e.g. 20 parallel) produce exactly one row.
- HMAC is computed server-side with the secret; client-supplied IP/HMAC is ignored.
- Ineligible providers (pending, inactive, rejected, revoked) cannot accrue clicks.

## 13. Priorities

**P0:** provider registration/login and public directory; private ID storage and admin document viewing; verification and activation workflow; tokens, middleware, rate limits; admin password reset; call-click tracking; validation, transactions, seed, and the tests above.

**P1 (scheduled, after P0 is green):** admin-approved provider phone change; customer accounts and reviews; review moderation and reporting.

## 14. Known limitations

- **Rate limiting is per-process.** Correct for one Render instance. Before scaling out, move to a shared store (Postgres-backed or Redis) and re-test the limits.
- **Render free instances sleep**, so the first request after idle is slow, and the Neon compute may cold-start too; the DB client sets a connect timeout with one retry.
- Reviews are not proof of a completed service. Moderation beyond hide/republish is manual.
- ID-document retention cleanup is a manual operator task.
- Trusted-proxy hop count must be verified against the real Render setup before IP-based protections are relied on.
