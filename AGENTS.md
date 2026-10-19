# AGENTS.md — Domestic Services Platform API

Backend MVP for an Addis Ababa marketplace connecting customers with domestic-service providers (plumbers, electricians, dish installers, painters, appliance repair, clothes washing). Customers call providers directly via `tel:`. There is **no** chat, booking, payments, pricing, or multi-category provider in the MVP; do not add them.

Detail lives in `spec.md` (read the relevant section before touching a feature). Build order lives in `PROMPT.md`. If this file and `spec.md` disagree, this file wins; flag the conflict.

## Stack (pinned — ask before adding or swapping)

- Node.js 20+, ES modules, plain JavaScript (no TypeScript)
- Express, `cors`, `helmet`, `express-rate-limit`, `pino` + `pino-http`
- PostgreSQL on Neon via `pg` Pool + `drizzle-orm/node-postgres`; migrations with `drizzle-kit`
- `zod` for all request/env validation
- `jsonwebtoken` (HS256, algorithm pinned on verify), `bcrypt`
- `multer` (memory storage) + `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` behind a storage adapter
- `vitest` + `supertest` for tests

## Commands (create these npm scripts in the first milestone)

- `npm run dev` — server with watch
- `npm start` — production start
- `npm test` — full suite against a local/test database; never touches production
- `npm run lint`
- `npm run db:generate` — create a migration from schema changes
- `npm run db:migrate` — apply migrations (uses `DATABASE_URL_DIRECT`)
- `npm run seed` — idempotent seed

## Layout

```
src/app.js          Express app, no listen() — tests import this
src/server.js       listen + startup checks
src/config/env.js   zod-validated env, fails fast
src/db/             schema.js, client.js, seed.js, seed-data.js
src/middleware/     auth, requireRole, rateLimit, validate, upload, errorHandler
src/modules/        auth | public | provider | customer | admin  (routes, service, schemas)
src/lib/            phone.js, tokens.js, crypto.js, storage/
tests/  drizzle/ (generated migrations — commit them)
```

Routes stay thin: parse and validate, call a service, shape the response. Business rules live in services.

## Invariants (never violate; each has a test)

1. **Public eligibility** is `verificationStatus = 'APPROVED' AND isActive = true`. One shared helper/SQL fragment is used by every public query and by call-click recording. Never re-derive it inline.
2. `verificationStatus` and `isActive` are admin-only. `isAvailable` is provider-only and only changes the badge; it never hides a listing.
3. Rejecting or revoking verification sets `isActive = false` in the same transaction.
4. ID documents live in a **private** bucket. The DB stores only an opaque object key. Only an admin gets a signed URL (120 s). Keys, URLs, hashes, and tokens never appear in public responses or logs.
5. `POST /api/leads/call` records a **call-click event**, not a completed call. IP is HMAC'd with `CALL_IP_HMAC_SECRET`; dedup uses a Postgres advisory lock. Never trust client-supplied IP/HMAC.
6. Phones are stored as E.164 `+251[79]XXXXXXXX`. Reject anything that doesn't normalize; never guess.
7. Access JWT 15 min; refresh tokens are opaque, stored as SHA-256, rotated on use, reuse-detected. Auth middleware is centralized; routes deny by default.
8. No mass assignment. Every update endpoint uses an explicit allowlist. Public endpoints select explicit columns, never whole rows.
9. Errors use the shared shape (`spec.md` §6.1). No SQL errors, stack traces, or storage keys in responses.
10. Multi-row state changes use transactions. The seed is rerunnable and never resets an existing admin password.

## Conventions

- Validate at the boundary with zod; reject unknown fields on write endpoints.
- Config only through `src/config/env.js`. No hard-coded secrets; fail startup when a required secret is missing.
- Use Drizzle for queries. Raw SQL only for advisory locks and check constraints.
- Log with pino using request IDs. Redact `authorization`, cookies, passwords, and tokens.
- Tests use real Postgres (test DB), not mocked queries. Storage uses an in-memory fake.

## Hosting (Render web service)

- Filesystem is ephemeral and uploads must not touch disk: `multer.memoryStorage()` with the size limit, then straight to object storage.
- Bind `0.0.0.0` on `process.env.PORT`. Expose `GET /healthz` (no DB call beyond a trivial `SELECT 1`, no secrets).
- Set Express `trust proxy` from `TRUST_PROXY_HOPS` (default 1). Verify the real client IP in staging before relying on IP limits or dedup.
- Run migrations as Render's pre-deploy command (`npm run db:migrate`), not on app boot.
- App uses Neon's pooled connection string; `drizzle-kit` uses the direct one.
- Rate limiting is in-memory, which is correct for **one** instance only. Do not scale out before moving to a shared store (see `spec.md` §14).

## Git

- **Branches:** one branch per milestone, cut from `main`: `m1-foundation`, `m2-registration`, and so on. Never commit to `main`; the user merges.
- **When to commit:** after each coherent step with tests and lint green. One logical change per commit. A schema change and its generated migration go in the same commit; tests go with the code they cover. Never commit a broken build.
- **Message format** (Conventional Commits): `type(scope): imperative summary`, 72 characters or fewer, no trailing period.
  - Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `build`.
  - Scopes: `config`, `db`, `auth`, `providers`, `admin`, `public`, `leads`, `storage`, `reviews`.
  - Optional body explains *why*, wrapped at 72 characters, and cites the spec (`Refs: spec §3.2`).
  - Examples: `feat(auth): rotate refresh tokens with family reuse detection`; `fix(leads): lock on provider and IP HMAC before dedup check`; `test(admin): cover every verification transition`.
- **Stage deliberately:** `git add <paths>`, never `git add -A` or `git add .`. Run `git status` and `git diff --staged` before each commit.
- **Never commit:** `.env` or any `.env.*` except `.env.example`, secrets, `node_modules/`, uploaded files, logs. `.gitignore` must exist before the first commit. If a secret reaches a commit, stop and tell the user; it needs a history rewrite and a key rotation.
- **Forbidden:** `--no-verify`, force-push, rebasing or amending commits that were already pushed, and pushing at all unless asked. The user pushes.
- **End of milestone:** report `git log --oneline main..HEAD` in the summary.

## Definition of done (per task)

- Tests pass and lint is clean; new behavior has tests, including the authz-denied and validation-failed paths.
- Schema changes ship with a generated migration that applies cleanly to an empty database.
- New endpoints have role checks, zod validation, and an explicit response shape.
- `spec.md` updated if behavior changed. No secrets in the diff. Work is committed per the Git rules above.

## Working agreements

- One milestone at a time (`PROMPT.md`). Finish and verify before starting the next.
- If a requirement is ambiguous, pick the safer reading, note it in the PR/summary, and continue; stop only for irreversible or scope-changing decisions.
- Do not reintroduce pricing, booking, chat, payments, or multi-category providers unless the user changes scope explicitly.
