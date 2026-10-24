# Domestic Services Platform — Addis Ababa

## Live Deployment
- **Live Site URL:** [https://addis-services.onrender.com/](https://addis-services.onrender.com/)
- **Health Check Endpoint:** [https://addis-services.onrender.com/healthz](https://addis-services.onrender.com/healthz)

## Student & Project Information
- **Full Name:** Bereket Muluken Abera
- **CTC Number:** CTC-5450-26
- **Classroom Number:** 2

---

## Project Overview

### Short Description
A full-stack, mobile-first marketplace platform connecting residents and businesses across Addis Ababa, Ethiopia, with verified local domestic service professionals (plumbers, electricians, satellite dish installers, painters, appliance repair technicians, and clothes washers). The platform prioritizes customer trust and frictionless direct communication through native phone calls (`tel:`).

### The Problem It Solves
Finding reliable, skilled, and vetted domestic service technicians in Addis Ababa is traditionally difficult and fragmented. Householders typically rely on informal word-of-mouth or street-corner brokers ("delalas"), leading to:
1. **Safety & Credibility Risks:** Hiring unverified strangers with no identity verification or background checks.
2. **Quality & Accountability Issues:** No past track record, verifiable reviews, or ratings to gauge technical competence.
3. **Unnecessary Intermediary Costs:** Middlemen taking commission cuts or charging arbitrary fees.
4. **Poor Localized Discovery:** Difficulty finding specialized help located within one's own sub-city or woreda.

This platform solves these problems by providing an admin-verified marketplace where providers undergo government ID review before their profiles become public, customers can filter verified specialists by sub-city and trade, and direct phone contact happens without middleman fees or mandatory payment escrow.

### Main Features Planned & Developed
- **Public Directory & Sub-City Filtering:**
  - Real-time search and filtering across 6 domestic categories and all 11 Addis Ababa sub-cities.
  - Live availability badge toggle ("Available for Work" vs. "Busy / Offline").
  - Detailed provider profiles showing verified credentials, trade experience, woreda, bio, and portfolio photos.
- **Direct Contact & Call Lead Analytics:**
  - One-tap mobile `tel:` dialer and desktop contact modal.
  - Transparent call-click tracking with server-side HMAC deduplication to record genuine customer leads.
- **Multi-Step Provider Onboarding & Vault:**
  - 3-step registration with Ethiopian E.164 phone normalization (`+2519...` / `+2517...`).
  - Private cloud object storage for national ID / passport uploads with server-side mime sniffing.
  - Dedicated provider dashboard for metrics, availability toggling, profile editing, and ID resubmission.
- **Customer Ratings & Community Reviews:**
  - Frictionless customer authentication for submitting star ratings (1–5) and written feedback.
  - Strict one-review-per-customer constraint per provider to prevent rating manipulation.
  - Review reporting mechanism for community moderation.
- **Comprehensive Administrative Control Console:**
  - Pending provider verification queue with secure, time-limited signed URL document viewing (120s TTL).
  - Verification state machine (`PENDING`, `APPROVED`, `REJECTED`, `REVOKED`).
  - Provider listing activation, suspension with audit logs, and admin-assisted temporary password reset.
  - Community review moderation (hide/publish) and provider phone change request review workflows.

---

## Monorepo Layout

```text
app/
├── backend/            # Express, PostgreSQL (Neon), Drizzle ORM, Vitest
│   ├── src/            # Application source code
│   ├── tests/          # Test suite (21 test files, 165 tests)
│   ├── drizzle/        # Database migrations
│   ├── scripts/        # Operational scripts (e.g., smoke verification)
│   ├── package.json    # Backend dependencies & scripts
│   └── README.md       # Backend-specific architecture & deploy guide
├── frontend/           # React 18, Vite, Tailwind CSS, TanStack Query, Zustand
│   ├── src/            # Components, hooks, pages, stores, UI primitives
│   ├── package.json    # Frontend dependencies & scripts
│   └── vite.config.js  # Vite bundler configuration
├── AGENTS.md           # Engineering guidelines, stack pinning & invariants
├── api-spec.md         # Functional and technical API specifications
├── frontend-spec.md    # Frontend architecture and UI/UX design specifications
├── render.yaml         # Render deployment blueprint (rootDir: backend)
└── package.json        # Workspace root scripts
```

