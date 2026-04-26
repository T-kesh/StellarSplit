# API Route Matrix

This document is the single reference for understanding how routes are
structured in StellarSplit. It distinguishes canonical, legacy, and
transitional paths so contributors always know the correct format to use.

---

## How Versioning Works in This Project

StellarSplit uses NestJS global prefix and versioning configured in `main.ts`.
The setup enables two valid base paths:

| Base Path  | Meaning                                                   |
| ---------- | --------------------------------------------------------- |
| `/api/v1/` | Canonical versioned path — all new routes go here         |
| `/api/`    | Legacy unversioned path — kept for backward compatibility |

### How to Spot the Config in `main.ts`

Look for lines similar to these in `main.ts`:

```typescript
app.setGlobalPrefix("api");
app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
```

This means a controller decorated with `@Controller('users')` and
`@Version('1')` will be reachable at `/api/v1/users`.
If versioning is not declared on the controller, it falls back to `/api/users`.

---

## Route Status Definitions

| Status            | Meaning                                             |
| ----------------- | --------------------------------------------------- |
| ✅ Canonical      | Correct current path. Use this for all new work.    |
| ⚠️ Legacy         | Old path still active. Do not add new routes here.  |
| 🔄 Transitional   | Being migrated. Both paths work temporarily.        |
| ❌ Broken/Doubled | Known prefix bug (e.g. `/api/api/`). Needs cleanup. |

---

## Full Route Matrix

### Authentication

| Endpoint      | Canonical Path               | Legacy Path               | Status          |
| ------------- | ---------------------------- | ------------------------- | --------------- |
| Register      | `POST /api/v1/auth/register` | `POST /api/auth/register` | 🔄 Transitional |
| Login         | `POST /api/v1/auth/login`    | `POST /api/auth/login`    | 🔄 Transitional |
| Logout        | `POST /api/v1/auth/logout`   | `POST /api/auth/logout`   | 🔄 Transitional |
| Refresh Token | `POST /api/v1/auth/refresh`  | `POST /api/auth/refresh`  | 🔄 Transitional |

### Users

| Endpoint         | Canonical Path            | Legacy Path            | Status          |
| ---------------- | ------------------------- | ---------------------- | --------------- |
| Get current user | `GET /api/v1/users/me`    | `GET /api/users/me`    | 🔄 Transitional |
| Update profile   | `PATCH /api/v1/users/me`  | `PATCH /api/users/me`  | 🔄 Transitional |
| Delete account   | `DELETE /api/v1/users/me` | `DELETE /api/users/me` | 🔄 Transitional |

### Groups / Splits

| Endpoint        | Canonical Path              | Legacy Path              | Status          |
| --------------- | --------------------------- | ------------------------ | --------------- |
| Create group    | `POST /api/v1/groups`       | `POST /api/groups`       | 🔄 Transitional |
| Get all groups  | `GET /api/v1/groups`        | `GET /api/groups`        | 🔄 Transitional |
| Get group by ID | `GET /api/v1/groups/:id`    | `GET /api/groups/:id`    | 🔄 Transitional |
| Update group    | `PATCH /api/v1/groups/:id`  | `PATCH /api/groups/:id`  | 🔄 Transitional |
| Delete group    | `DELETE /api/v1/groups/:id` | `DELETE /api/groups/:id` | 🔄 Transitional |

### Expenses

| Endpoint          | Canonical Path                | Legacy Path                | Status          |
| ----------------- | ----------------------------- | -------------------------- | --------------- |
| Add expense       | `POST /api/v1/expenses`       | `POST /api/expenses`       | 🔄 Transitional |
| Get expenses      | `GET /api/v1/expenses`        | `GET /api/expenses`        | 🔄 Transitional |
| Get expense by ID | `GET /api/v1/expenses/:id`    | `GET /api/expenses/:id`    | 🔄 Transitional |
| Update expense    | `PATCH /api/v1/expenses/:id`  | `PATCH /api/expenses/:id`  | 🔄 Transitional |
| Delete expense    | `DELETE /api/v1/expenses/:id` | `DELETE /api/expenses/:id` | 🔄 Transitional |

### Settlements

| Endpoint          | Canonical Path                  | Legacy Path                  | Status          |
| ----------------- | ------------------------------- | ---------------------------- | --------------- |
| Create settlement | `POST /api/v1/settlements`      | `POST /api/settlements`      | 🔄 Transitional |
| Get settlements   | `GET /api/v1/settlements`       | `GET /api/settlements`       | 🔄 Transitional |
| Mark as settled   | `PATCH /api/v1/settlements/:id` | `PATCH /api/settlements/:id` | 🔄 Transitional |

---

## Known Problem: Doubled Prefixes

Some modules may produce routes like `/api/api/users` due to a prefix being
declared both globally in `main.ts` and again inside the controller decorator.

### How to Identify the Bug

Look for controllers written like this:

```typescript
// ❌ Wrong — "api" is already set globally, this doubles it
@Controller("api/users")
export class UsersController {}
```

### How to Fix It

```typescript
// ✅ Correct — only declare the resource name, not the full prefix
@Controller("users")
export class UsersController {}
```

### Modules to Audit

If you find a controller using a full path prefix, flag it by opening an issue
titled `fix: doubled route prefix in [ModuleName]` and link it to this document.

---

## How to Spot-Check a Route

Follow these steps to verify any endpoint is correctly documented:

1. Open the controller file for the module (e.g. `src/users/users.controller.ts`).
2. Check the `@Controller()` decorator — note the path segment.
3. Check the method decorator (`@Get()`, `@Post()`, etc.) — note the sub-path.
4. Open `main.ts` — confirm the global prefix (`api`) and versioning type.
5. Assemble the full path:
   `/<globalPrefix>/v<version>/<controllerPath>/<methodPath>`
6. Compare the assembled path against the matching row in this matrix.
7. If they differ, update this matrix and `docs/API.md` in the same PR.

---

## Contributor Rules for Route Changes

- ✅ Always register new endpoints under `/api/v1/`.
- ✅ Update this matrix in the same PR as your controller change.
- ⚠️ Do not add new routes to the legacy `/api/` path.
- ❌ Never replicate the doubled-prefix pattern (`/api/api/...`).
- 🔄 If migrating a legacy route, mark it as Transitional until the old
  path is fully removed, then update the status to Canonical.
