import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../types/auth-user.interface';

/**
 * Parameter decorator that extracts the authenticated user from the request
 * Must be used with JwtAuthGuard or similar auth guard that sets req.user
 *
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthUser) {
 *   return { id: user.id, walletAddress: user.walletAddress };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);