import { UnauthorizedException } from "@nestjs/common";
import { sign } from "jsonwebtoken";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  const secret = "test-secret";
  const issuer = "test-issuer";
  const audience = "test-audience";

  const mockConfigService = {
    get: (key: string, defaultValue?: string) => {
      switch (key) {
        case "JWT_SECRET":
          return secret;
        case "JWT_ISSUER":
          return issuer;
        case "JWT_AUDIENCE":
          return audience;
        case "NODE_ENV":
          return "production";
        case "AUTH_ALLOW_DEV_BYPASS":
          return "false";
        default:
          return defaultValue;
      }
    },
  };

  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard(mockConfigService as any);
  });

  function makeContext(headers: any) {
    const request: any = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  }

  it("should allow valid token and set request.user", () => {
    const token = sign(
      { sub: "user-id", email: "user@example.com", walletAddress: "wallet-1" },
      secret,
      {
        algorithm: "HS256",
        expiresIn: "1h",
        issuer: issuer,
        audience: audience,
      },
    );

    const request: any = { headers: { authorization: `Bearer ${token}` } };
    const context = makeContext(request.headers);

    const result = guard.canActivate(context as any);

    expect(result).toBe(true);
    expect(context.switchToHttp().getRequest().user).toMatchObject({
      id: "user-id",
      email: "user@example.com",
      walletAddress: "wallet-1",
    });
  });

  it("should reject invalid token", () => {
    const context = makeContext({
      authorization: "Bearer invalid.token.value",
    });
    expect(() => guard.canActivate(context as any)).toThrow(
      UnauthorizedException,
    );
  });

  it("should reject expired token", () => {
    const token = sign({ sub: "user-id" }, secret, {
      algorithm: "HS256",
      expiresIn: "-1s",
      issuer: issuer,
      audience: audience,
    });
    const context = makeContext({ authorization: `Bearer ${token}` });
    expect(() => guard.canActivate(context as any)).toThrow(
      UnauthorizedException,
    );
  });

  it("should reject missing token when bypass disabled", () => {
    const context = makeContext({});
    expect(() => guard.canActivate(context as any)).toThrow(
      UnauthorizedException,
    );
  });

  it("should allow x-user-id bypass in non-production when enabled", () => {
    const devConfigService = {
      ...mockConfigService,
      get: (key: string, defaultValue?: string) => {
        if (key === "NODE_ENV") return "development";
        if (key === "AUTH_ALLOW_DEV_BYPASS") return "true";
        return mockConfigService.get(key, defaultValue);
      },
    };
    const devGuard = new JwtAuthGuard(devConfigService as any);
    const context = makeContext({ "x-user-id": "dev-user" });
    const result = devGuard.canActivate(context as any);
    expect(result).toBe(true);
    expect(context.switchToHttp().getRequest().user).toEqual({
      id: "dev-user",
      walletAddress: "dev-user",
      raw: { sub: "dev-user" },
      wallet: "dev-user",
    });
  });
});
