interface RateLimitEntry {
  timestamps: number[];
}

export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly clients: Map<string, RateLimitEntry> = new Map();
  private lastPruneTime: number = Date.now();

  constructor(maxRequests: number = 10, windowSeconds: number = 60) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  /**
   * Evaluates if a client IP is within rate limits.
   * Returns `{ allowed: true, remaining }` or `{ allowed: false, retryAfterSeconds }`.
   */
  public check(clientIp: string): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  } {
    const now = Date.now();
    this.maybePrune(now);

    let entry = this.clients.get(clientIp);
    if (!entry) {
      entry = { timestamps: [] };
      this.clients.set(clientIp, entry);
    }

    // Filter out timestamps outside the active window
    const cutoff = now - this.windowMs;
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    if (entry.timestamps.length >= this.maxRequests) {
      const oldestInWindow = entry.timestamps[0] ?? now;
      const retryAfterMs = oldestInWindow + this.windowMs - now;
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    // Record this request
    entry.timestamps.push(now);
    const remaining = this.maxRequests - entry.timestamps.length;

    return {
      allowed: true,
      remaining,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Periodically cleans up stale client entries to prevent memory leaks.
   */
  private maybePrune(now: number): void {
    if (now - this.lastPruneTime < this.windowMs) return;
    this.lastPruneTime = now;
    const cutoff = now - this.windowMs;

    for (const [ip, entry] of this.clients.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) {
        this.clients.delete(ip);
      }
    }
  }

  /**
   * Resets rate limiter state (useful for tests).
   */
  public reset(): void {
    this.clients.clear();
    this.lastPruneTime = Date.now();
  }
}

// Global default rate limiter instance: 10 requests per 60 seconds
export const dispatchRateLimiter = new RateLimiter(10, 60);
