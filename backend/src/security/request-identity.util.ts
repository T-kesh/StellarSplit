import { Request } from "express";
import { v4 as uuid } from "uuid";

/**
 * Extracts a deterministic identity string for rate limiting / throttling.
 * - Authenticated user → walletAddress or userId
 * - Dev bypass → x-dev-key header
 * - Anonymous → IP address
 * - Last resort → generated UUID
 */
export function extractRequestIdentity(req: Request): string {
  if (req.user?.walletAddress) {
    return `wallet:${req.user.walletAddress}`;
  }
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  if (req.headers["x-dev-key"]) {
    return `dev:${req.headers["x-dev-key"]}`;
  }
  if (req.ip) {
    return `ip:${req.ip}`;
  }
  return `anon:${uuid()}`;
}
