import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// In-memory rate limiter for development/testing
class MemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxLimit: number;
  private window: number;

  constructor(limit: number, window: number) {
    this.maxLimit = limit;
    this.window = window;
  }

  async limit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const now = Date.now();
    const windowStart = now - this.window;

    // Get existing requests
    const existing = this.requests.get(identifier) || [];

    // Filter out old requests
    const recentRequests = existing.filter(time => time > windowStart);

    // Check if limit exceeded
    const success = recentRequests.length < this.maxLimit;

    if (success) {
      recentRequests.push(now);
      this.requests.set(identifier, recentRequests);
    }

    return {
      success,
      limit: this.maxLimit,
      remaining: Math.max(0, this.maxLimit - recentRequests.length),
      reset: now + this.window,
    };
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.window;

    for (const [key, timestamps] of this.requests.entries()) {
      const recentRequests = timestamps.filter(time => time > windowStart);
      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }
  }
}

// Create rate limiters with fallback to in-memory for development
export const createRateLimiter = (requests: number, window: string) => {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    // Production: Use Upstash Redis
    // Convert window string to milliseconds for Duration
    const windowMs = window === '1 m' ? 60000 : window === '1 h' ? 3600000 : 60000;
    return new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(requests, `${windowMs} ms`),
      analytics: true,
      prefix: '@cashpilot/ratelimit',
    });
  } else {
    // Development: Use in-memory rate limiter
    console.warn(
      '⚠️  UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. Using in-memory rate limiting.'
    );

    const windowMs = window === '1 m' ? 60000 : window === '1 h' ? 3600000 : 60000;
    const memoryLimiter = new MemoryRateLimiter(requests, windowMs);

    // Cleanup every 5 minutes
    setInterval(() => memoryLimiter.cleanup(), 300000);

    return memoryLimiter;
  }
};

// Different rate limiters for different endpoints
export const authRateLimiter = createRateLimiter(5, '1 m'); // 5 requests per minute
export const apiRateLimiter = createRateLimiter(30, '1 m'); // 30 requests per minute
export const webhookRateLimiter = createRateLimiter(100, '1 m'); // 100 requests per minute

// Helper function to get client identifier (IP or user ID)
export function getClientIdentifier(req: Request): string {
  // Try to get user ID from headers (set by Clerk)
  const userId = req.headers.get('x-clerk-user-id');
  if (userId) return `user:${userId}`;

  // Fallback to IP address
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

// Helper function to apply rate limiting
export async function rateLimit(
  req: Request,
  limiter: any
): Promise<{ success: boolean; response?: Response }> {
  const identifier = getClientIdentifier(req);
  const { success, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Please try again later',
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limiter.limit?.toString() || 'unknown',
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      ),
    };
  }

  return { success: true };
}
