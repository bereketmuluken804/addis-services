# Domestic Services Platform — Addis Ababa

Full-stack marketplace connecting customers with domestic-service providers in Addis Ababa (plumbers, electricians, dish installers, painters, appliance repair, clothes washing). Customers contact service providers directly via `tel:`.

---

## Monorepo Layout

```text
hsp/
├── backend/            # Express, PostgreSQL (Neon), Drizzle ORM, Vitest
│   ├── src/            # Application source code
│   ├── tests/          # Test suite (20 test files, 158 tests)
│   ├── drizzle/        # Database migrations
│   ├── scripts/        # Operational scripts (e.g., smoke verification)
│   ├── package.json    # Backend dependencies & scripts
│   └── README.md       # Backend-specific architecture & deploy guide
├── frontend/           # Frontend client application (ready for setup)
├── spec.md             # Functional and technical specifications
├── AGENTS.md           # Engineering guidelines, stack pinning & invariants
├── render.yaml         # Render deployment blueprint (rootDir: backend)
└── package.json        # Workspace scripts
```

---

## Quick Start

### Backend
Navigate to [`backend/`](file:///C:/Users/hp/insa-dev/hsp/backend) or use root workspace scripts:

```bash
# Install backend dependencies
cd backend && npm install

# Run database migrations
npm run db:migrate

# Seed initial categories, locations & admin account
npm run seed

# Start development server
npm run dev

# Run all 158 tests
npm test

# Run ESLint
npm run lint
```

From root:
```bash
npm run test:backend
npm run lint:backend
```

### Frontend
Frontend directory is ready for frontend initialization and prompts.
