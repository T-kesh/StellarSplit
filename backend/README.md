# StellarSplit — Backend

This is the NestJS backend for StellarSplit. Follow this guide exactly to get
your local environment running correctly against the current codebase.

---

## Prerequisites

Make sure you have these installed before starting:

| Tool       | Minimum Version |
| ---------- | --------------- |
| Node.js    | v18+            |
| npm        | v9+             |
| PostgreSQL | v14+            |

---

## 1. Clone and Install

If you have not already cloned the repo, do so first:

```bash
git clone https://github.com/Dataguru-tech/StellarSplit.git
cd StellarSplit/backend
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

Open `.env` and update every value marked with `<your-value>`.
See the full variable reference in the table below.

### Environment Variable Reference

| Variable            | Description                 | Example                |
| ------------------- | --------------------------- | ---------------------- |
| `DATABASE_HOST`     | PostgreSQL host             | `localhost`            |
| `DATABASE_PORT`     | PostgreSQL port             | `5432`                 |
| `DATABASE_USER`     | PostgreSQL username         | `postgres`             |
| `DATABASE_PASSWORD` | PostgreSQL password         | `yourpassword`         |
| `DATABASE_NAME`     | Database name               | `stellarsplit`         |
| `JWT_SECRET`        | Secret key for signing JWTs | `a-long-random-string` |
| `JWT_EXPIRES_IN`    | JWT expiry duration         | `7d`                   |
| `APP_PORT`          | Port the backend listens on | `3000`                 |
| `NODE_ENV`          | Runtime environment         | `development`          |
| `API_VERSION`       | Default API version         | `1`                    |

> ⚠️ Never commit your `.env` file. It is already listed in `.gitignore`.

---

## 3. Database Setup

Create the database in PostgreSQL before starting the app:

```bash
psql -U postgres -c "CREATE DATABASE stellarsplit;"
```

If you are using a different username, replace `postgres` with your username.

---

## 4. Running the App

### Development (with hot reload)

```bash
npm run start:dev
```

### Production build and run

```bash
npm run build
npm run start:prod
```

### Standard start (no hot reload)

```bash
npm run start
```

---

## 5. API Versioning and Swagger

The backend uses NestJS URI-based versioning configured in `src/main.ts`.

### Base URL Structure
