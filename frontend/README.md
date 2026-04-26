# StellarSplit — Frontend

This is the React + Vite frontend for StellarSplit — a smart bill splitting
app with wallet integration. Follow this guide to get your local UI running.

---

## Prerequisites

Make sure you have these installed before starting:

| Tool    | Minimum Version |
| ------- | --------------- |
| Node.js | v18+            |
| npm     | v9+             |

---

## 1. Clone and Install

If you have not already cloned the repo:

```bash
git clone https://github.com/Dataguru-tech/StellarSplit.git
cd StellarSplit/frontend
```

Install dependencies:

```bash
npm install
```

---

## 2. Environment Setup

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

### Environment Variable Reference

| Variable                 | Description              | Example                        |
| ------------------------ | ------------------------ | ------------------------------ |
| `VITE_API_BASE_URL`      | Backend API base URL     | `http://localhost:3000/api/v1` |
| `VITE_APP_NAME`          | App display name         | `StellarSplit`                 |
| `VITE_WALLET_CONNECT_ID` | WalletConnect project ID | `<your-project-id>`            |
| `VITE_ENVIRONMENT`       | Runtime environment      | `development`                  |

> ⚠️ All frontend env variables must be prefixed with `VITE_` to be
> accessible in the browser. Never commit your `.env` file.

---

## 3. Running the App

### Development server (with hot reload)

```bash
npm run dev
```

The app will be available at:
