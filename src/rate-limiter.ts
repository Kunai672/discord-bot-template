import type { Config } from "./config.js";

/** Per-user rate limiter using sliding window. */
export class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(config: Config) {
    this.maxRequests = config.rateLimitRpm;
    this.windowMs = 60_000; // 1 minute
  }

  /** Check if a request is allowed for the given user. Returns true if allowed, false if rate limited. */
  check(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) ?? [];
    
    // Remove requests outside the window
    const validRequests = userRequests.filter((timestamp) => now - timestamp < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(userId, validRequests);
    return true;
  }

  /** Get remaining requests for a user in the current window. */
  getRemaining(userId: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(userId) ?? [];
    const validRequests = userRequests.filter((timestamp) => now - timestamp < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /** Get reset time (ms until window resets) for a user. */
  getResetTime(userId: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(userId) ?? [];
    const validRequests = userRequests.filter((timestamp) => now - timestamp < this.windowMs);
    
    if (validRequests.length === 0) {
      return 0;
    }
    
    const oldest = validRequests[0];
    return Math.max(0, oldest + this.windowMs - now);
  }
}

/** Create a rate limiter instance. */
export function createRateLimiter(config: Config): RateLimiter {
  return new RateLimiter(config);
}