import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProfilePolicyGuard } from './profile-policy.guard';
import { AuthorizationService } from '../auth/services/authorization.service';

describe('ProfilePolicyGuard', () => {
  let guard: ProfilePolicyGuard;
  let authorizationService: AuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilePolicyGuard,
        {
          provide: AuthorizationService,
          useValue: {
            isAdmin: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get(ProfilePolicyGuard);
    authorizationService = module.get(AuthorizationService);
  });

  it('should allow profile updates for the authenticated owner', async () => {
    const context = createMockContext({ id: 'user-1', walletAddress: 'GUSER1' }, 'GUSER1');

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(authorizationService.isAdmin).not.toHaveBeenCalled();
  });

  it('should allow profile updates for an admin user', async () => {
    jest.spyOn(authorizationService, 'isAdmin').mockResolvedValue(true);
    const context = createMockContext({ id: 'admin-1', walletAddress: 'GADMIN' }, 'GOTHER');

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(authorizationService.isAdmin).toHaveBeenCalledWith('admin-1');
  });

  it('should deny profile updates for a different non-admin wallet', async () => {
    jest.spyOn(authorizationService, 'isAdmin').mockResolvedValue(false);
    const context = createMockContext({ id: 'user-1', walletAddress: 'GUSER1' }, 'GOTHER');

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should reject anonymous profile update attempts', async () => {
    const context = createMockContext(null, 'GUSER1');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  function createMockContext(user: any, walletAddress: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params: { walletAddress },
        }),
      }),
    } as any;
  }
});
