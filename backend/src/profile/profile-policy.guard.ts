import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthorizationService } from '../auth/services/authorization.service';

@Injectable()
export class ProfilePolicyGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const walletAddress = request.params?.walletAddress;

    if (!user || !user.id) {
      throw new UnauthorizedException('User must be authenticated to update profile');
    }

    if (!walletAddress) {
      throw new ForbiddenException('Wallet address is required for profile updates');
    }

    if (user.walletAddress === walletAddress) {
      return true;
    }

    if (await this.authorizationService.isAdmin(user.id)) {
      return true;
    }

    throw new ForbiddenException('You are not authorized to update this profile');
  }
}
