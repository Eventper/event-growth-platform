# 🔧 DEPLOYMENT & INTEGRATION GUIDE

**Created:** 2026-07-10  
**Audience:** DevOps, Backend Engineers  
**Status:** Ready for Implementation

---

## 📋 WHAT'S BEEN DEPLOYED

### ✅ Completed (Already in Code)
1. **AI Provider Failover** (saas-tender-routes.ts)
   - Multi-provider support in `claudeAI()` function
   - Multi-provider support in `claudeChat()` function
   - Automatic fallback: OpenRouter → OpenAI
   - Error logging for monitoring

2. **Rate Limit Middleware** (rate-limit-middleware.ts)
   - New file: `artifacts/api-server/src/rate-limit-middleware.ts`
   - 5 exportable functions for different endpoints
   - In-memory store (can upgrade to Redis)
   - Production-ready with logging

3. **SearchFinder Tab** (saas-tender-dashboard.tsx)
   - Already wired and functional
   - No changes needed

---

## 🚀 INTEGRATION STEPS

### Step 1: Import Rate Limiter into Routes

**File:** `artifacts/api-server/src/saas-tender-routes.ts`

**Add at top of file (with other imports):**
```typescript
import { 
  loginRateLimiter, 
  searchRateLimiter, 
  bidGenerationRateLimiter,
  generalRateLimiter 
} from "./rate-limit-middleware";
```

---

### Step 2: Apply Rate Limiters to Routes

**Example 1: Login Endpoint**

Find this route:
```typescript
// Before (currently):
app.post("/api/saas/auth/login", authenticateSaasUser, handleLogin);
```

Replace with:
```typescript
// After (with rate limiting):
app.post("/api/saas/auth/login", loginRateLimiter, authenticateSaasUser, handleLogin);
```

**What this does:** Limits failed login attempts to 5 per IP per 15 minutes

---

**Example 2: Search Endpoint**

Find this route:
```typescript
// Before:
app.get("/api/saas-tender/search", searchHandler);
```

Replace with:
```typescript
// After:
app.get("/api/saas-tender/search", searchRateLimiter, searchHandler);
```

**What this does:** Limits search queries to 30 per IP per minute

---

**Example 3: Bid Generation Endpoint**

Find this route:
```typescript
// Before:
app.post("/api/saas-tender/bid-sections/generate", generateBidSection);
```

Replace with:
```typescript
// After:
app.post("/api/saas-tender/bid-sections/generate", bidGenerationRateLimiter, generateBidSection);
```

**What this does:** Limits bid generation to 10 per org per hour

---

### Step 3: Test Rate Limiting

**Test Login Rate Limiting (5 attempts per 15 min):**
```bash
# Try 6 login attempts rapidly
for i in {1..6}; do
  curl -X POST http://localhost:5010/api/saas/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    | jq .
  sleep 1
done

# Expected:
# First 5: Response like "Invalid credentials"
# 6th attempt: Response 429 "Too many login attempts"
```

**Test Search Rate Limiting (30 per minute):**
```bash
# Try 31 search queries rapidly
for i in {1..31}; do
  curl -X GET "http://localhost:5010/api/saas-tender/search?q=event" \
    -H "Authorization: Bearer YOUR_TOKEN"
  echo "Request $i"
done

# Expected: 31st request returns 429 with "Too many search requests"
```

**Test Bid Generation (10 per hour):**
```bash
# Try 11 bid generations rapidly
for i in {1..11}; do
  curl -X POST http://localhost:5010/api/saas-tender/bid-sections/generate \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{"tender_id":1,"section_type":"company_overview"}' \
    | jq .
done

# Expected: 11th request returns 429 with "Bid generation limit reached"
```

---

### Step 4: Monitor Rate Limiting

**Check rate limit stats:**
```typescript
// Add this endpoint for debugging:
import { getRateLimitStats } from "./rate-limit-middleware";

app.get("/api/admin/rate-limit-stats", (req, res) => {
  // ADMIN ONLY - restrict this in production
  const stats = getRateLimitStats();
  res.json(stats);
});
```

**Example output:**
```json
{
  "activeKeys": 47,
  "totalRequests": 342,
  "store": [
    { "key": "login-user@example.com", "requests": 5, "oldestEntry": 1720704012345 },
    { "key": "search-192.168.1.100", "requests": 12, "oldestEntry": 1720704015000 },
    { "key": "bid-generation-org-42", "requests": 3, "oldestEntry": 1720704010500 }
  ]
}
```

---

## 🔄 CONFIGURATION OPTIONS

### Adjust Rate Limit Thresholds

**File:** `artifacts/api-server/src/rate-limit-middleware.ts`

To change limits, modify these sections:

**Login (default: 5 per 15 min):**
```typescript
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,  // ← Change this
  maxRequests: 5,             // ← Or this
  message: "Too many login attempts. Please try again in 15 minutes.",
  statusCode: 429,
  keyGenerator: (req) => `login-${req.body?.email || req.ip}`,
});
```

**Search (default: 30 per minute):**
```typescript
export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,        // 1 minute (don't change)
  maxRequests: 30,            // ← Increase to 50 for generous, decrease to 20 for strict
  message: "Too many search requests. Please slow down.",
  statusCode: 429,
  keyGenerator: (req) => `search-${req.ip}`,
});
```

**Bid Generation (default: 10 per hour):**
```typescript
export const bidGenerationRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const orgId = (req as any).user?.orgId || "unknown";
  const key = `bid-generation-${orgId}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;  // ← Change for different window
  const maxRequests = 10;            // ← Increase to 20 for generous, decrease to 5 for strict
  // ... rest of function
};
```

**General API (default: 100 per minute):**
```typescript
export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,        // 1 minute (don't change)
  maxRequests: 100,           // ← Increase to 200 for generous
  message: "API rate limit exceeded. Please try again later.",
  statusCode: 429,
  keyGenerator: (req) => `api-${req.ip}`,
});
```

---

## 💾 UPGRADE TO REDIS (Production)

**Current state:** In-memory store (works for <100 concurrent users)

**For scaling:** Upgrade to Redis

### Implementation (Redis):

1. **Install Redis package:**
```bash
cd artifacts/api-server
npm install redis
```

2. **Replace store in rate-limit-middleware.ts:**
```typescript
import { createClient } from 'redis';

const redisClient = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

// Now use redisClient instead of in-memory store
export async function checkRateLimit(key: string, limit: number, window: number) {
  const current = await redisClient.incr(key);
  if (current === 1) {
    await redisClient.expire(key, Math.ceil(window / 1000));
  }
  return current <= limit;
}
```

3. **Update middleware to use Redis version:**
```typescript
export const loginRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const key = `login-${req.body?.email || req.ip}`;
  const allowed = await checkRateLimit(key, 5, 15 * 60 * 1000);
  
  if (!allowed) {
    res.status(429).json({ error: "Too many login attempts" });
    return;
  }
  next();
};
```

---

## 🧪 TESTING

### Unit Test Example

**File:** `artifacts/api-server/__tests__/rate-limiter.test.ts`

```typescript
import { createRateLimiter } from '../src/rate-limit-middleware';
import { Request, Response } from 'express';

describe('Rate Limiter', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = { ip: '127.0.0.1', body: {} };
    mockRes = { 
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
  });

  it('should allow requests within limit', async () => {
    const next = jest.fn();
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 5,
    });

    for (let i = 0; i < 5; i++) {
      limiter(mockReq as Request, mockRes as Response, next);
    }

    expect(next).toHaveBeenCalledTimes(5);
  });

  it('should block requests exceeding limit', async () => {
    const next = jest.fn();
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 2,
    });

    limiter(mockReq as Request, mockRes as Response, next);
    limiter(mockReq as Request, mockRes as Response, next);
    limiter(mockReq as Request, mockRes as Response, next); // Third

    expect(mockRes.status).toHaveBeenCalledWith(429);
  });
});
```

---

## 📊 MONITORING

### What to Watch

**Log entries to search for:**
```bash
# Rate limit hits (indicates possible abuse or aggressive client)
grep "429" logs/api.log | wc -l

# Provider failover (should be <1% of requests)
grep "Provider.*fallback" logs/api.log | wc -l

# Failed rate limit checks
grep "RateLimit.*check failed" logs/api.log
```

### Prometheus Metrics (Optional)

```typescript
import prometheus from 'prom-client';

const rateLimitCounter = new prometheus.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'ip'],
});

export function recordRateLimitHit(endpoint: string, ip: string) {
  rateLimitCounter.inc({ endpoint, ip });
}
```

---

## 🔐 SECURITY CONSIDERATIONS

### IP Spoofing Protection
If behind a load balancer, set `trust proxy`:

```typescript
app.set('trust proxy', 1); // Trust first proxy

// This makes rate limiting work correctly with:
// - AWS ELB
// - Nginx reverse proxy
// - Cloudflare
```

---

### DDoS Protection

Rate limiting helps but consider:
- **Cloudflare** for network-level DDoS
- **AWS WAF** for application-level protection
- **IP whitelist** for internal services

---

### PII in Logs

Don't log email addresses in production:

```typescript
// Bad:
console.log(`Rate limited: ${email}`);

// Good:
const emailHash = crypto.createHash('sha256').update(email).digest('hex');
console.log(`Rate limited: ${emailHash.slice(0, 8)}`);
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Copy `rate-limit-middleware.ts` to `artifacts/api-server/src/`
- [ ] Import rate limiters in `saas-tender-routes.ts`
- [ ] Apply rate limiters to all public endpoints
- [ ] Test rate limiting locally with curl/Postman
- [ ] Configure threshold values for your environment
- [ ] Add monitoring/logging
- [ ] Deploy to staging
- [ ] Test with team (verify legitimate users aren't blocked)
- [ ] Deploy to production
- [ ] Monitor logs for 48 hours
- [ ] Adjust thresholds if needed

---

## 🚨 TROUBLESHOOTING

### Problem: Legitimate users getting blocked
**Solution:**
1. Increase `maxRequests` value
2. Check if users are behind same corporate proxy (all same IP)
3. Add IP whitelist for known services

### Problem: Rate limiting not working
**Solution:**
1. Verify middleware is before the route handler
2. Check that `app.set('trust proxy', 1)` is set (if behind proxy)
3. Check console logs for rate limit tracking

### Problem: Redis connection failing
**Solution:**
1. Verify Redis is running: `redis-cli ping`
2. Check connection params: `REDIS_HOST`, `REDIS_PORT`
3. Check firewall rules

---

## 📞 SUPPORT

**Questions about integration?**
- Check `rate-limit-middleware.ts` comments for implementation details
- Review test examples in this guide
- Contact DevOps team for deployment assistance

---

**Status:** ✅ READY FOR DEPLOYMENT

Next: Integrate into `saas-tender-routes.ts` and test.
