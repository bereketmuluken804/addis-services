# Domestic Services Platform API — Backend MVP

Backend MVP for an Addis Ababa marketplace connecting customers with domestic-service providers (plumbers, electricians, dish installers, painters, appliance repair, clothes washing). Customers contact service providers directly via `tel:`.

---

## Stack

- **Runtime:** Node.js 20+, ES modules, plain JavaScript
- **Framework:** Express 4, `cors`, `helmet`, `express-rate-limit`, `pino` + `pino-http`
- **Database:** PostgreSQL on Neon via `pg` Pool + `drizzle-orm/node-postgres`
- **Migrations:** `drizzle-kit` via `npm run db:migrate` (direct connection)
- **Validation:** `zod` for request bodies, query params, and environment variables
- **Auth & Crypto:** `jsonwebtoken` (HS256, pinned algorithm), `bcrypt`, token family rotation with reuse detection
- **Storage:** S3-compatible private object storage (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) + in-memory fake for tests
- **Tests:** `vitest` + `supertest`

---

## Invariants & Design Principles

1. **Public Eligibility:** A provider is publicly visible if and only if `verificationStatus = 'APPROVED' AND isActive = true`. One shared helper (`isPubliclyEligible`) is used across all directory searches and call-click recording.
2. **Role Boundaries:**
   - `verificationStatus` and `isActive` are strictly admin-controlled.
   - `isAvailable` is strictly provider-controlled (controls the availability badge only; never hides listings).
   - Rejecting or revoking verification sets `isActive = false` atomically in the same transaction.
3. **Private Document Storage:** ID documents live in a private S3 bucket. Responses never expose object keys, hashes, or tokens. Admins receive short-lived pre-signed URLs (120 s) with audit logging.
4. **Call Tracking:** `POST /api/leads/call` records call clicks (not completed calls). Client IP is HMAC'd server-side using `CALL_IP_HMAC_SECRET` and deduplicated within a 5-minute window using PostgreSQL advisory locks.
5. **Phone Numbers:** Stored as E.164 `+251[79]XXXXXXXX`. Malformed numbers are rejected with `422 INVALID_PHONE`.
6. **No Mass Assignment:** All update routes explicitly allowlist updateable fields. Unknown fields are rejected.

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Environment mode (`development`, `test`, `production`) | `development` |
| `PORT` | Listening port (Render automatically injects `PORT`) | `5000` |
| `DATABASE_URL` | Neon pooled connection string for application runtime | `postgresql://...-pooler.neon.tech/...` |
| `DATABASE_URL_DIRECT` | Neon direct connection string for migrations | `postgresql://...neon.tech/...` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:3000,http://localhost:5173` |
| `TRUST_PROXY_HOPS` | Number of reverse proxy hops to trust (Render uses `1`) | `1` |
| `JWT_SECRET` | Secret key for access tokens (min 32 characters) | *Random 32+ char secret* |
| `JWT_ISSUER` | Access token issuer claim | `domestic-services-api` |
| `JWT_AUDIENCE` | Access token audience claim | `domestic-services-client` |
| `ACCESS_TOKEN_TTL` | Access token duration | `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token duration in days | `7` |
| `BCRYPT_ROUNDS` | Cost factor for password hashing | `10` (4 for test) |
| `CALL_IP_HMAC_SECRET` | Secret key for IP HMAC hashing | *Random 32+ char secret* |
| `CALL_CLICK_DEDUP_WINDOW_SECONDS` | Call deduplication time window | `300` |
| `CLOUD_STORAGE_BUCKET` | Private S3 bucket name for ID documents | `domestic-services-id-docs` |
| `CLOUD_STORAGE_REGION` | S3 region | `us-east-1` |
| `CLOUD_STORAGE_ENDPOINT` | Optional S3 endpoint (e.g. MinIO, Cloudflare R2) | *(empty for AWS)* |
| `CLOUD_STORAGE_ACCESS_KEY_ID` | S3 Access Key ID | `your_access_key_id` |
| `CLOUD_STORAGE_SECRET_ACCESS_KEY` | S3 Secret Access Key | `your_secret_access_key` |
| `ID_DOCUMENT_MAX_BYTES` | Maximum ID document upload size | `10485760` (10 MB) |
| `ID_DOCUMENT_SIGNED_URL_TTL_SECONDS` | Expiration TTL for admin document signed URLs | `120` (2 minutes) |
| `MEDIA_HOST_ALLOWLIST` | Allowed hostnames for external avatar / work samples | `res.cloudinary.com,images.unsplash.com` |
| `ADMIN_INITIAL_EMAIL` | Initial admin account email for seeding | `admin@example.com` |
| `ADMIN_INITIAL_PASSWORD` | Initial admin account password for seeding | *Initial secure password* |

---

## Local Development & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migrations
Apply migrations to the database using `DATABASE_URL_DIRECT`:
```bash
npm run db:migrate
```

### 3. Seed Database
Idempotent seed creating categories, locations, and the initial admin account:
```bash
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Run Tests & Linter
```bash
# Run test suite
npm test

# Run ESLint
npm run lint
```

---

## Render Deployment Guide

### Deployment Configuration

This repository includes a `render.yaml` Blueprint specification. When deploying as a Render Web Service:

- **Environment:** `Node`
- **Build Command:** `npm install`
- **Pre-Deploy Command:** `npm run db:migrate`
- **Start Command:** `npm start`
- **Health Check Path:** `/healthz`
- **Instance Sizing:** Standard / Starter instance (Rate limiting is in-memory and designed for a single instance)

### Pre-Deploy Migrations
Render automatically executes the **Pre-Deploy Command** before starting the updated application. `npm run db:migrate` executes migrations via `src/db/migrate.js` using the direct Neon database connection (`DATABASE_URL_DIRECT`), preventing pooled transaction lock conflicts during schema DDL updates.

### Health Check Endpoint
The service exposes `GET /healthz`, which runs a lightweight `SELECT 1` query to verify database connectivity without exposing system internals or secrets:
- Returns `200 { "status": "ok" }` when healthy.
- Returns `503 SERVICE_UNAVAILABLE` on database failure.

### Reverse Proxy & `TRUST_PROXY_HOPS` Verification
Behind Render's reverse proxy:
1. `app.set('trust proxy', env.TRUST_PROXY_HOPS)` is configured with `TRUST_PROXY_HOPS=1` (Render's single proxy tier).
2. The request logger records `req.ip` on all requests (`httpLogger`), which reflects the evaluated client IP from the `X-Forwarded-For` header.
3. In staging, send a request with a known public IP and verify that the logged `ip` matches your real client IP before relying on rate limiting or call deduplication in production.

---

## Smoke Verification Script

After deployment or local setup, verify the complete lifecycle end-to-end:

```bash
# Against local server (default http://localhost:5000)
npm run smoke

# Against a remote staging / production deployment
node scripts/smoke.js https://addis-services.onrender.com
```

The smoke script executes and asserts all 7 lifecycle steps:
1. **Health Check:** `GET /healthz` -> `200`
2. **Provider Registration:** `POST /api/auth/register/provider` with ID document -> `201`
3. **Admin Login:** `POST /api/auth/login` -> `200`
4. **Admin Verification:** `PATCH /api/admin/providers/:id/verification` (`APPROVED`) -> `200`
5. **Admin Activation:** `PATCH /api/admin/providers/:id/activation` (`isActive: true`) -> `200`
6. **Public Listing:** `GET /api/providers?categoryId=1` -> verifies provider appears in directory
7. **Lead Call-Click:** `POST /api/leads/call` -> records call lead with server-side HMAC dedup
