# PROMPT.md — Build Prompt and Milestones

## Kickoff prompt (paste to start the agent)

> Read `AGENTS.md` fully, then `spec.md`. We are building the backend MVP described there, one milestone at a time, in the order listed in `PROMPT.md`.
>
> Start with **Milestone 1** only. Before writing code, give me a short plan (files you'll create, packages you'll install — all from the pinned stack in `AGENTS.md`). Then create the milestone branch, implement, run the tests, commit as you go under the Git rules in `AGENTS.md`, and report what passed plus the commit list.
>
> Stop at the end of each milestone and wait for me to say "next". Do not start a later milestone early. If something in `spec.md` is ambiguous, choose the safer reading, say what you chose, and continue. Stop and ask only if a decision is irreversible or changes scope.

## Continue prompt (between milestones)

> Milestone N is accepted and merged into `main`. Switch to `main`, create the branch for **Milestone N+1**, re-read the relevant sections of `spec.md`, and proceed under the same rules. Plan briefly, implement, test, commit as you go, report.

## Milestones

Each milestone ends with every exit check passing and `npm test` green.

### M1 — Foundation
Scope: `git init` (if needed) with `.gitignore` committed first, project scaffold and npm scripts, `env.js`, DB client (`pg` Pool), full schema + first migration, seed (`seed-data.js`, idempotent), error handler and response shape, zod validation middleware, `authenticate` + `requireRole`, `/healthz`, pino request logging with redaction, `.env.example`.
Exit checks:
- `db:migrate` applies to an empty DB; `seed` runs twice with no duplicates and no admin password change.
- Missing production secret fails startup.
- Auth middleware tests: bad/expired/wrong-audience/`alg`-swapped JWTs rejected; role mismatch is `403`.

### M2 — Provider registration and ID upload
Scope: phone normalization, provider/customer registration and login, token issue and refresh rotation with reuse detection, logout, storage adapter (S3 + in-memory fake), upload validation (size, magic bytes), registration transaction with orphan cleanup, login/registration rate limits.
Exit checks:
- Registration creates `PENDING` + inactive provider and a document row; failed DB write deletes the uploaded object.
- Refresh reuse revokes the family. Login errors are indistinguishable.
- Phone normalization table tests (all accepted forms; every rejection).

### M3 — Admin verification and activation
Scope: admin login, pending list, signed-URL document access + audit log, verification transitions (§3.2 table), activation/suspension, provider resubmission (§7 rule), provider `me` endpoints (profile, availability), stats.
Exit checks:
- Every transition row tested, plus illegal transitions → `409`.
- Reject/revoke sets `isActive=false` atomically; resubmission allowed/blocked per the rule.
- Non-admins cannot obtain signed URLs; responses contain no keys or hashes.

### M4 — Public directory and call-click
Scope: categories, locations, provider list/detail with the shared eligibility helper, rating summaries (ready for M6), `POST /api/leads/call` with HMAC + advisory-lock dedup, trust-proxy config, call-click rate limit, `totalCallsReceived`.
Exit checks:
- Only approved + active providers visible; availability affects badge/filter only.
- 20 parallel identical clicks → exactly one row; click after the window records again.
- Ineligible providers cannot accrue clicks.

### M5 — Password reset and hardening
Scope: admin reset endpoint (temporary password once, `mustChangePassword`, session revocation), provider password change, `mustChangePassword` gating, all remaining rate-limit policies, CSRF checks on refresh/logout, CORS allowlist, security headers.
Exit checks:
- Reset revokes sessions and forces change; gated provider reaches only password-change and logout.
- Temporary password never appears in logs or audit entries (assert in a test).
- Rate-limit tests return `429` without leaking account existence.

### M6 — Reviews (P1)
Scope: customer review create/edit/delete, public review list, rating averages excluding hidden/deleted, admin moderation (with reason + audit), review reports.
Exit checks:
- One review per customer per provider enforced by the DB; ownership checks; average excludes hidden reviews.

### M7 — Phone change by admin request (P1)
Scope: `phone_change_requests` table, provider create/view/cancel endpoints, admin list and approve/reject, atomic approval with uniqueness re-check, session revocation, audit entry (spec §4.5). No SMS or OTP.
Exit checks:
- One pending request per provider (DB-enforced); wrong current password and duplicate or malformed numbers fail.
- Approval updates the phone, revokes refresh families, and writes an audit entry; rejection leaves the phone unchanged; non-admins cannot decide requests.

### M8 — Render readiness
Scope: confirm pre-deploy migration command, `/healthz`, binding and `PORT`, `TRUST_PROXY_HOPS` check in staging (log `req.ip` behind Render), README with env setup, test and deploy steps.
Exit checks:
- A fresh Render deploy migrates, seeds manually, and passes a smoke script (register → admin approve → activate → public list → call-click).
- Staging confirms `req.ip` is the real client IP.
