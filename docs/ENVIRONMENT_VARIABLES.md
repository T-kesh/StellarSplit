# Environment Variable Reference

This document is the authoritative catalog of every environment variable used
across the StellarSplit monorepo. Variables are grouped by service. For each
variable the table shows whether it is required or optional, its default value
(if any), and where it is consumed.

---

## Table of Contents

1. [Backend](#backend)
   - [Core Application](#core-application)
   - [Database (PostgreSQL)](#database-postgresql)
   - [Redis](#redis)
   - [Authentication](#authentication)
   - [Stellar / Blockchain](#stellar--blockchain)
   - [Email / SMTP](#email--smtp)
   - [Storage (S3 / Local)](#storage-s3--local)
   - [Analytics (ClickHouse)](#analytics-clickhouse)
   - [Message Queue (Kafka)](#message-queue-kafka)
   - [API Documentation (Swagger)](#api-documentation-swagger)
   - [CORS & Security](#cors--security)
2. [Frontend](#frontend)
3. [ML Service](#ml-service)
4. [Notes](#notes)

---

## Backend

Create a `.env` file in the `backend/` directory. The backend validates
required variables at startup and will refuse to start in production if any
are missing.

### Core Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | **Yes** | — | Runtime environment: `development`, `test`, or `production` |
| `PORT` | No | `3000` | Port the NestJS server listens on |
| `REQUEST_SIZE_LIMIT` | No | `1mb` | Maximum request body size (e.g. `5mb`) |
| `DEBUG` | No | — | Set to `true` to enable verbose debug logging (not recommended in production) |

### Database (PostgreSQL)

Two naming conventions are supported. `DATABASE_URL` (a full connection URI)
takes precedence over the individual `DB_*` variables.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** (or individual vars) | — | Full PostgreSQL connection URI, e.g. `postgresql://user:pass@host:5432/db` |
| `DB_HOST` | **Yes** (if no `DATABASE_URL`) | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_USERNAME` | **Yes** (if no `DATABASE_URL`) | `postgres` | Database username |
| `DB_PASSWORD` | **Yes** (if no `DATABASE_URL`) | `postgres` | Database password |
| `DB_NAME` | **Yes** (if no `DATABASE_URL`) | `stellarsplit_dev` | Database name |
| `DB_SYNCHRONIZE` | No | `false` | Auto-sync TypeORM schema — **never `true` in production** |
| `DB_LOGGING` | No | `false` | Log all SQL queries |
| `DATABASE_SSL` | No | — | Set to `true` to require SSL for the database connection |

> **Deprecated**: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`,
> `DATABASE_PASSWORD`, `DATABASE_NAME` are accepted by the validation layer
> but the canonical names are the `DB_*` variants above.

### Redis

`REDIS_URL` (a full connection URI) takes precedence over the individual
`REDIS_HOST` / `REDIS_PORT` variables.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | **Yes** (or individual vars) | — | Full Redis connection URI, e.g. `redis://user:pass@host:6379` |
| `REDIS_HOST` | No | `localhost` | Redis host (used when `REDIS_URL` is not set) |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_USERNAME` | No | — | Redis username (ACL) |
| `REDIS_PASSWORD` | No | — | Redis password |

> **Deprecated**: `REDISHOST`, `REDISPORT`, `REDISUSER`, `REDISPASSWORD` are
> also accepted as fallbacks by `redis.config.ts`.

### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | — | Secret used to sign JWT tokens. Must be at least 32 characters in production. |

### Stellar / Blockchain

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STELLAR_NETWORK` | No | — | Stellar network to connect to: `mainnet` or `testnet` |
| `STELLAR_SECRET_KEY` | No | — | Stellar secret key for the platform signing account |
| `PLATFORM_WALLET` | No | — | Platform wallet address used to receive fees |

### Email / SMTP

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | No | — | SMTP server hostname |
| `SMTP_PORT` | No | — | SMTP port (typically `587` for TLS, `465` for SSL) |
| `SMTP_SECURE` | No | — | Set to `true` to use SSL (port 465) |
| `SMTP_USER` | No | — | SMTP authentication username |
| `SMTP_PASSWORD` | No | — | SMTP authentication password |
| `EMAIL_FROM` | No | — | Default sender address, e.g. `noreply@stellarsplit.com` |

### Storage (S3 / Local)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `USE_S3_STORAGE` | No | `false` | Set to `true` to use AWS S3 for file exports |
| `AWS_S3_BUCKET` | No | — | S3 bucket name for exports (when `USE_S3_STORAGE=true`) |
| `AWS_REGION` | No | — | AWS region, e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | No | — | AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | No | — | AWS secret access key |
| `AWS_ACCESS_KEY` | No | — | Legacy alias for `AWS_ACCESS_KEY_ID` (env.schema.ts) |
| `AWS_SECRET_KEY` | No | — | Legacy alias for `AWS_SECRET_ACCESS_KEY` (env.schema.ts) |
| `AWS_BUCKET` | No | — | Legacy alias for `AWS_S3_BUCKET` (env.schema.ts) |
| `LOCAL_STORAGE_PATH` | No | `./storage/exports` | Local filesystem path used when S3 is disabled |

### Analytics (ClickHouse)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLICKHOUSE_HOST` | No | `localhost` | ClickHouse server host |
| `CLICKHOUSE_PORT` | No | `8123` | ClickHouse HTTP port |
| `CLICKHOUSE_USER` | No | `default` | ClickHouse username |
| `CLICKHOUSE_PASSWORD` | No | — | ClickHouse password |
| `CLICKHOUSE_DB` | No | `analytics` | ClickHouse database name |
| `ANALYTICS_EXPORT_DIR` | No | `./analytics-exports` | Directory for analytics export files |

### Message Queue (Kafka)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KAFKA_BROKERS` | No | — | Comma-separated list of Kafka broker addresses, e.g. `broker1:9092,broker2:9092` |

### API Documentation (Swagger)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SWAGGER_PATH` | No | `/api/docs` | URL path where Swagger UI is served |
| `SWAGGER_TITLE` | No | `StellarSplit API` | Swagger UI page title |
| `SWAGGER_DESCRIPTION` | No | `API for StellarSplit` | Swagger UI description |
| `SWAGGER_VERSION` | No | `1.0.0` | API version shown in Swagger UI |

### CORS & Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGIN` | No | — | Allowed CORS origin(s). Must not be `*` in production. |
| `APP_URL` | No | — | Backend API base URL (used in emails and generated links) |
| `FRONTEND_URL` | No | — | Frontend base URL (used for CORS and redirect targets) |

---

## Frontend

Create a `.env` file in the `frontend/` directory (copy from `.env.example`).
All frontend variables must be prefixed with `VITE_` to be exposed to the
browser bundle by Vite.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | **Yes** | — | Backend API base URL, e.g. `http://localhost:3000/api/v1` |
| `VITE_APP_NAME` | No | `StellarSplit` | Application display name shown in the UI |
| `VITE_WALLET_CONNECT_ID` | No | — | WalletConnect project ID for wallet integration |

---

## ML Service

The ML service (`ml-service/`) is a Python application. Configure it via a
`.env` file or environment variables in your deployment environment.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ML_SERVICE_PORT` | No | `8000` | Port the ML service listens on |
| `BACKEND_URL` | No | — | Backend API URL for result callbacks |

> The ML service does not currently have a formal env schema. Check
> `ml-service/app/config.py` (if present) for the latest variable list.

---

## Notes

- **Secret management**: Never commit `.env` files containing real secrets.
  Use `.env.local` (git-ignored) for local development and a secrets manager
  (AWS Secrets Manager, HashiCorp Vault, etc.) for production.
- **Validation**: The backend validates required variables at startup via
  `backend/src/config/env.schema.ts` and `backend/src/config/env.validation.ts`.
  Missing required variables cause a startup failure in production.
- **Deprecation**: Variables marked as deprecated are still accepted but may be
  removed in a future release. Migrate to the canonical names listed above.
