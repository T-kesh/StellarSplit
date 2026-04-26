/**
 * Authenticated user interface
 * This defines the shape of req.user set by the JWT auth guard
 */
export interface AuthUser {
  /** The user's unique identifier (JWT subject claim) */
  id: string;

  /** The user's Stellar wallet address */
  walletAddress: string;

  /** The user's email address (optional) */
  email?: string;

  /** Raw JWT payload for advanced use cases */
  raw: Record<string, any>;
}