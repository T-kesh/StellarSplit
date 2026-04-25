import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { verify, JwtPayload } from "jsonwebtoken";
import { AuthUser } from "../types/auth-user.interface";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Optional() private readonly configService?: ConfigService) {}

  private getJwtSecret(): string {
    const secret =
      this.configService?.get<string>("JWT_SECRET") || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET must be configured");
    }
    return secret;
  }

  private isDevBypassEnabled(): boolean {
    const env =
      this.configService?.get<string>("NODE_ENV", "development") ||
      process.env.NODE_ENV ||
      "development";
    const allowed =
      this.configService?.get<string>("AUTH_ALLOW_DEV_BYPASS", "true") ||
      process.env.AUTH_ALLOW_DEV_BYPASS ||
      "true";
    return env !== "production" && allowed.toLowerCase() !== "false";
  }

  private buildJwtVerifyOptions() {
    const audience =
      this.configService?.get<string>("JWT_AUDIENCE") ||
      process.env.JWT_AUDIENCE;
    const issuer =
      this.configService?.get<string>("JWT_ISSUER") || process.env.JWT_ISSUER;
    const options: Record<string, any> = {
      algorithms: ["HS256"],
    };
    if (audience) options.audience = audience;
    if (issuer) options.issuer = issuer;
    return options;
  }
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Real token validation
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const secret = this.getJwtSecret();
        const decoded = verify(token, secret, this.buildJwtVerifyOptions());

        const payload = decoded as JwtPayload & {
          sub?: string;
          email?: string;
          walletAddress?: string;
        };
        if (!payload || !payload.sub) {
          throw new UnauthorizedException("JWT missing subject claim");
        }

        const user: AuthUser = {
          id: payload.sub,
          walletAddress: payload.walletAddress || payload.sub,
          email: payload.email,
          raw: payload,
        };

        // Backward compatibility: set wallet property to match walletAddress
        (user as any).wallet = user.walletAddress;

        request.user = user;
        return true;
      } catch (error) {
        throw new UnauthorizedException("Invalid or expired token");
      }
    }

    // Allow development bypass via x-user-id header
    const devUserId = request.headers["x-user-id"];
    if (devUserId && this.isDevBypassEnabled()) {
      const user: AuthUser = {
        id: devUserId as string,
        walletAddress: devUserId as string,
        raw: { sub: devUserId },
      };
      // Backward compatibility
      (user as any).wallet = user.walletAddress;
      request.user = user;
      return true;
    }

    throw new UnauthorizedException("Missing or invalid authorization token");
  }
}
