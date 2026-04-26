# Authentication in StellarSplit

StellarSplit supports two primary authentication modes: **Standard JWT** for production and general use, and a **Development Bypass** for local testing and debugging.

## 1. JWT Authentication (Production)

The API uses JSON Web Tokens (JWT) for secure authentication. 

### How it works
1. The user authenticates (typically via their Stellar wallet).
2. The server issues a JWT signed with `JWT_SECRET`.
3. The client includes this token in the `Authorization` header of subsequent requests.

### Header Format
```http
Authorization: Bearer <your_jwt_token>
```

### Security Considerations
- JWTs are validated against `JWT_SECRET`.
- In production, `NODE_ENV=production` must be set to ensure strict validation.
- Standard claims include `sub` (user ID), `email`, and `walletAddress`.

---

## 2. Development Bypass

To simplify local development and testing without a full Stellar wallet lifecycle, a bypass is available via the `x-user-id` header.

### How it works
If the server is NOT running in production mode (`NODE_ENV != production`), you can bypass JWT validation by providing a user identifier directly.

### Header Format
```http
x-user-id: <any_user_identifier_or_wallet_address>
```

### Configuration
The bypass is controlled by two environment variables:
- `NODE_ENV`: Must NOT be `production`.
- `AUTH_ALLOW_DEV_BYPASS`: Must NOT be `false` (defaults to `true`).

### Example (cURL)
```bash
curl -X GET http://localhost:3000/api/splits \
  -H "x-user-id: GDZST3XVCDTUJ76ZAV2HA72KYQODXXZ5PTMAPZGDHZ6CS7RO7MGG3DBM"
```

> [!WARNING]
> This header is **completely ignored** when `NODE_ENV=production`. Never rely on it for production integrations.

---

## 3. Resolving the Authenticated User

Regardless of the authentication mode used, the backend populates `req.user` with an `AuthUser` object:

```typescript
interface AuthUser {
  id: string;             // User identifier
  walletAddress: string;  // Stellar wallet address
  email?: string;         // Optional email (JWT only)
}
```

Many endpoints depend on this object to filter results by the active user (e.g., `/api/groups`, `/api/split-history`).
