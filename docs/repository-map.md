# StellarSplit Repository Map

Complete guide to the monorepo structure and each package's purpose.

---

## Directory Overview

```
stellar-split/
├── frontend/               # React 19 + TypeScript dashboard
├── backend/               # NestJS + PostgreSQL REST API
├── contracts/             # Soroban smart contracts (Rust)
├── ml-service/           # Python ML service for receipt OCR
├── docs/                 # Project documentation
├── test/                 # Integration and e2e tests
├── .github/              # GitHub Actions CI/CD workflows
├── docker-compose.yml    # PostgreSQL and shared service configs
├── vercel.json          # Vercel deployment config (frontend)
├── jest.config.js       # Jest test configuration
├── README.md            # Main project overview
└── package.json         # Root package (minimal, no scripts)
```

---

## Packages

### `/frontend` — React Dashboard

The user-facing web application for creating, managing, and settling bill splits.

| Directory | Purpose |
|-----------|---------|
| `src/components/` | Reusable React components (Forms, Cards, Layout, Modals, Collaboration) |
| `src/pages/` | Route-level components (Dashboard, SplitDetail, Receipts, etc.) |
| `src/hooks/` | Custom React hooks (useAnalytics, useWallet, useCollaboration, etc.) |
| `src/utils/` | Utilities (api-client, auth, formatting, session management) |
| `src/services/` | Business logic (analytics data provider, split group CRUD, receipt OCR, collaboration) |
| `src/types/` | TypeScript interfaces (Split, Participant, Receipt, Collaboration types) |
| `src/constants/` | App constants (API base URL, timeouts, feature flags) |
| `public/` | Static assets (favicons, locales) |
| `vite.config.ts` | Vite dev server config with API proxy |

**Key Technologies:**
- React 19, TypeScript, Vite (dev server & build)
- TailwindCSS v4 for styling
- i18next for internationalization
- axios for HTTP requests (wrapped by `api-client.ts`)
- Socket.io-client for real-time collaboration
- Lucide React for icons

**Dev Script:** `npm run dev` (starts at http://localhost:5173)
**Build:** `npm run build` (TypeScript check + Vite bundle)
**Tests:** `npm run test` (Vitest)
**Lint:** `npm run lint` (ESLint)

---

### `/backend` — NestJS API

REST API that manages split data, user profiles, payments, receipts, and real-time collaboration.

| Directory | Purpose |
|-----------|---------|
| `src/` | Application source code (organized by feature) |
| `src/splits/` | Split creation, management, and lifecycle |
| `src/payments/` | Payment submission and tracking |
| `src/receipts/` | Receipt upload, OCR, and storage |
| `src/users/` | User profiles and KYC |
| `src/analytics/` | Analytics aggregation (live vs. fixture data) |
| `src/collaboration/` | WebSocket server and real-time sync |
| `src/recurring-splits/` | Recurring split scheduling |
| `src/disputes/` | Dispute resolution workflow |
| `src/multi-currency/` | Multi-currency support and conversion |
| `src/governance/` | On-chain governance integration |
| `src/audit-trail/` | Activity logging and history |
| `src/auth/` | JWT authentication and authorization |
| `database/` | TypeORM migrations and schemas |
| `data/` | Fixture / seed data |

**Key Technologies:**
- NestJS for HTTP and WebSocket servers
- TypeORM for database ORM
- PostgreSQL as the primary database
- Bull for background job queues
- pino for structured logging
- class-validator + class-transformer for validation
- Stellar SDK for blockchain integration

**Dev Script:** `npm run start:dev` (starts at http://localhost:3001)
**Build:** `npm run build`
**Tests:** `npm run test`

---

### `/contracts` — Soroban Smart Contracts

On-chain escrow and payout logic for trustless settlement.

| File | Purpose |
|------|---------|
| `src/lib.rs` | Main contract: escrow, state machine, payout logic |
| `src/error.rs` | Contract error types |
| `src/events.rs` | Event emissions for indexers |
| `src/test.rs` | Contract unit tests |

**Key Technologies:**
- Soroban Rust SDK
- XLM native asset + USDC token contracts

**Build:** `cargo build --release` (outputs WASM)
**Tests:** `cargo test`

---

### `/ml-service` — Receipt OCR

Python microservice that processes uploaded receipt images and extracts line items via computer vision.

| Directory | Purpose |
|-----------|---------|
| `app/` | Flask/FastAPI application |
| `app/models/` | TensorFlow receipt OCR models |
| `app/utils/` | Image preprocessing and parsing |
| `requirements.txt` | Python dependencies |

**Key Technologies:**
- Python 3.9+
- TensorFlow for OCR
- Flask or FastAPI for HTTP API
- PIL/Pillow for image manipulation

**Dev Script:** `python -m app` (starts at http://localhost:5000)

---

### `/docs` — Project Documentation

Comprehensive guides on architecture, API design, and operations.

| File | Purpose |
|------|---------|
| `API.md` | Complete REST and WebSocket API reference |
| `ARCHITECTURE.md` | System design and component interactions |
| `AUTHENTICATION.md` | JWT, dev bypass headers, token flow |
| `COMPONENTS.md` | Frontend component library catalog |
| `DEPLOYMENT.md` | Production deployment checklist |
| `RECEIPT_FLOW.md` | Receipt upload → OCR → itemization flow |
| `STELLAR_INTEGRATION.md` | Soroban contracts, Freighter wallet |
| `data-provenance.md` | Live vs. mock data status |
| `repository-map.md` | This file |
| `examples/` | Curl examples, webhook payloads |
| `runbooks/` | Operational procedures (e.g., incident response) |
| `scripts/` | Utility scripts (database reset, seed data) |

---

### `/test` — Integration & E2E Tests

Cross-package tests for full user workflows.

| Directory | Purpose |
|-----------|---------|
| `e2e/` | End-to-end tests (Playwright, Cypress) |
| `integration/` | API + frontend integration tests |
| `fixtures/` | Mock data and test utilities |

---

### Root Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | PostgreSQL, Redis, other infra services |
| `vercel.json` | Frontend deployment config for Vercel |
| `jest.config.js` | Jest config for Node tests |
| `package.json` | Root dependencies (build tools, shared scripts) |
| `package-lock.json` | Dependency lock file |
| `CONTRIBUTING.md` | Contribution guidelines |
| `LICENSE` | Apache 2.0 license |

---

## Development Workflow

### Install & Start Everything

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend (in another terminal)
cd backend && npm install
docker-compose up  # Start PostgreSQL
npm run start:dev

# ML Service (in another terminal, optional)
cd ml-service && pip install -r requirements.txt && python -m app
```

### Common Tasks

| Task | Command |
|------|---------|
| Build frontend | `cd frontend && npm run build` |
| Run frontend tests | `cd frontend && npm run test` |
| Check TypeScript | `cd frontend && npm run build` |
| Format code | `cd frontend && npm run lint -- --fix` |
| View API docs | Open `docs/API.md` |
| Reset database | `cd backend && npm run db:reset` |
| Create DB migration | `cd backend && npm run typeorm migration:create` |
| Run E2E tests | `cd test && npm run test:e2e` |

---

## Key Concepts

### API Base URL

Defined in `frontend/src/constants/api.ts` as `VITE_BASE_API_URL` (env var).
- **Dev:** `http://localhost:3001/api`
- **Production:** depends on deployment (Vercel → backend service)

### Authentication

- **Frontend:** Stores JWT in `sessionStore` (prefixed in localStorage)
- **Backend:** Validates JWT in request headers
- **Dev bypass:** `X-User-ID` header skips JWT check

### Real-Time Collaboration

- **WebSocket endpoint:** `/socket.io` on backend
- **Client:** `socket.io-client` library in frontend
- **Server:** NestJS gateway + Bull queues

### Data Persistence

- **Frontend:** `localStorage` via `sessionStore` wrapper (per-session state, participant cache)
- **Backend:** PostgreSQL via TypeORM
- **Cache:** Redis (via Bull for job queues)
- **Files:** Cloud storage (GCS/S3) for receipts and images

---

## Deployment

### Frontend
- **Platform:** Vercel
- **Config:** `vercel.json` (build, environment variables)
- **API proxy:** Configured in `vite.config.ts` for dev; backend URL via env var in production

### Backend
- **Platform:** Railway, Render, or custom hosting
- **Database:** Managed PostgreSQL
- **Secrets:** Environment variables (JWT secret, database URL, etc.)

### Smart Contracts
- **Network:** Stellar Testnet (development) or Mainnet (production)
- **Deployment:** Via Stellar CLI (`stellar contract deploy`)

### ML Service
- **Platform:** Docker container (Railway, GCP Cloud Run, etc.)
- **Model:** Pre-trained TensorFlow model bundled in image

---

## Support & Links

- **Issues:** Check GitHub issues for bugs and feature requests
- **Documentation:** All docs live in `/docs`
- **API Playground:** Postman collection (in `docs/examples/`) or use `curl`
- **Stellar Docs:** https://developers.stellar.org/
- **NestJS Docs:** https://docs.nestjs.com/
