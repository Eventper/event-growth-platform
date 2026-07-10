/**
 * Rate Limiting Middleware for Express
 * Protects against brute-force attacks and spam
 * 
 * Configuration:
 * - Login endpoint: 5 attempts per 15 minutes
 * - Search endpoints: 30 requests per minute per IP
 * - Bid generation: 10 requests per hour per org
 * - General API: 100 requests per minute per IP
 */

import type { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number }[];
}

// In-memory store (replace with Redis for production)
const store: RateLimitStore = {};

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
}

/**
 * Generic rate limiter middleware factory
 */
export function createRateLimiter(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyGenerator ? options.keyGenerator(req) : req.ip || "unknown";
    const now = Date.now();
    
    // Initialize store for this key if needed
    if (!store[key]) {
      store[key] = [];
    }
    
    // Remove old entries outside the window
    store[key] = store[key].filter(entry => entry.resetTime > now);
    
    // Check if limit exceeded
    if (store[key].length >= options.maxRequests) {
      res.status(options.statusCode || 429).json({
        error: options.message || "Too many requests, please try again later.",
        retryAfter: Math.ceil((options.windowMs) / 1000),
      });
      return;
    }
    
    // Record this request
    store[key].push({ count: 1, resetTime: now + options.windowMs });
    
    // Set Retry-After header
    res.set("Retry-After", String(Math.ceil((options.windowMs) / 1000)));
    
    next();
  };
}

/**
 * Login rate limiter: 5 attempts per 15 minutes
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: "Too many login attempts. Please try again in 15 minutes.",
  statusCode: 429,
  keyGenerator: (req) => `login-${req.body?.email || req.ip}`,
});

/**
 * Search rate limiter: 30 requests per minute
 */
export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  message: "Too many search requests. Please slow down.",
  statusCode: 429,
  keyGenerator: (req) => `search-${req.ip}`,
});

/**
 * Bid generation limiter: 10 per hour per organization
 */
export const bidGenerationRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const orgId = (req as any).user?.orgId || "unknown";
  const key = `bid-generation-${orgId}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 10;
  
  if (!store[key]) {
    store[key] = [];
  }
  
  store[key] = store[key].filter(entry => entry.resetTime > now);
  
  if (store[key].length >= maxRequests) {
    res.status(429).json({
      error: `Bid generation limit reached (${maxRequests} per hour). Please try again later.`,
      retryAfter: Math.ceil((windowMs) / 1000),
    });
    return;
  }
  
  store[key].push({ count: 1, resetTime: now + windowMs });
  res.set("Retry-After", String(Math.ceil((windowMs) / 1000)));
  
  next();
};

/**
 * General API rate limiter: 100 requests per minute
 */
export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: "API rate limit exceeded. Please try again later.",
  statusCode: 429,
  keyGenerator: (req) => `api-${req.ip}`,
});

/**
 * Clear rate limit store (for testing or maintenance)
 */
export function clearRateLimitStore(): void {
  Object.keys(store).forEach(key => delete store[key]);
}

/**
 * Get rate limit stats (for monitoring)
 */
export function getRateLimitStats() {
  return {
    activeKeys: Object.keys(store).length,
    totalRequests: Object.values(store).reduce((sum, entries) => sum + entries.length, 0),
    store: Object.entries(store).map(([key, entries]) => ({
      key,
      requests: entries.length,
      oldestEntry: entries[0]?.resetTime,
    })),
  };
}

/**
 * Cleanup old entries periodically (runs every 5 minutes)
 */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const key of Object.keys(store)) {
    const before = store[key].length;
    store[key] = store[key].filter(entry => entry.resetTime > now);
    const after = store[key].length;
    cleaned += before - after;
    
    // Remove empty keys
    if (store[key].length === 0) {
      delete store[key];
    }
  }
  
  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned ${cleaned} old entries`);
  }
}, 5 * 60 * 1000);
