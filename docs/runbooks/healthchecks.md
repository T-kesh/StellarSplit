# Health Checks Runbook

This guide covers the health probe endpoints exposed by the StellarSplit backend for orchestration, monitoring, and alerting purposes.

## Overview of Endpoints

StellarSplit is configured with a global API prefix (`/api`) and URI versioning (`v1`). All health endpoints respect this versioning scheme.

### 1. General Liveness Probe
**Endpoint:** `GET /api/v1/health`  
**Purpose:** Basic ping to verify the HTTP server is accepting requests. Does not check downstream dependencies.
**Use Case:** Docker `HEALTHCHECK`, Kubernetes `livenessProbe`.

### 2. Deep Readiness Probe
**Endpoint:** `GET /api/v1/health/readiness`
**Purpose:** Verifies connections to the database (PostgreSQL) and cache (Redis).
**Use Case:** Kubernetes `readinessProbe`, Load Balancer health checks.

## Docker Deployment Example

When deploying via Docker, ensure you reference the versioned endpoint:

```dockerfile
# Dockerfile snippet
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1
```

## Troubleshooting Unhealthy Probes

- **503 Service Unavailable on `/api/v1/health/readiness`**:
  Check database and redis connections. Review the application logs for `TypeORM` or `RedisClient` connection timeout errors. Ensure the environment variables `DB_HOST` and `REDIS_HOST` are correct.
- **404 Not Found**:
  Verify you are including the correct global prefix and version (`/api/v1`). If you call `/api/health`, it will return a 404 because the routes are strictly versioned. Note that Swagger is unversioned and accessible directly at `/api/docs`.
