# StellarSplit Monorepo

**Split bills instantly with crypto. No awkward conversations.**

StellarSplit is a mobile-friendly web app that makes splitting bills with friends effortless. Snap a photo of your receipt, let AI do the math, and settle up instantly using Stellar's lightning-fast payments in XLM or USDC.

## 📁 Repository Structure

This repository is organized as a monorepo:

- **[/frontend](./frontend)**: React + TypeScript + Tailwind CSS application for the user interface.
- **[/backend](./backend)**: NestJS + PostgreSQL API server for processing splits and payments.
- **[/docs](./docs)**: Comprehensive project documentation.

## 📚 Documentation

- **[API Reference](./docs/API.md)**: Complete API endpoint documentation with validated payloads.
- **[Component Catalog](./docs/COMPONENTS.md)**: Reusable frontend components and hooks.
- **[Authentication Guide](./docs/AUTHENTICATION.md)**: JWT and development bypass headers.
- **[Receipt Flow](./docs/RECEIPT_FLOW.md)**: End-to-end guide on OCR and receipt processing.
- **[Data Provenance](./docs/data-provenance.md)**: Status of live vs. mock data across the app.

## 🚀 Getting Started

From the root directory, you can manage both projects:

### Prerequisites
- Node.js 18+
- npm 9+
- PostgreSQL (for backend)

### Installation
```bash
# Install dependencies for all workspaces
npm install
```

### Development
```bash
# Start frontend
npm run dev:frontend

# Start backend
npm run dev:backend
```

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS v4, Vitest
- **Backend**: NestJS, TypeORM, PostgreSQL
- **Blockchain**: Stellar Network

---
Built for the Stellar Drips Wave Program.
