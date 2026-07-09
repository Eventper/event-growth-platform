# Deployment Plan: EventPerfekt Monorepo to Railway or Render

**Status:** Deployment-ready with identified blockers  
**Target:** Railway.app or Render.com  
**Last Updated:** 2026-07-09  

---

## 1. Services Requiring Separate Deployment

The monorepo contains **4 deployable services**. All are co-located in the current Replit setup but should be deployed separately for production.

### 1.1 API Server (artifacts/api-server)

**Purpose:** Express 5.2.1 backend serving all API endpoints  
**Type:** Node.js (Server)  
**Port:** 5010 (configurable via PORT env)  
**Build Output:** `dist/index.mjs` (esbuild bundle)

**Responsibilities:**
- Growth Platform API (CRM, outreach, analytics, AI)
- Event Perfekt backend (tenders, events, payments, email)
- I Am Her (stories, partnerships, community)
- Health checks and webhooks
- Proxy routing to frontends

**Key Routes:**
```
/api/growth/*              → Growth Platform endpoints
/api/event-august/*        → I Am Her event endpoints
/api/auth/*                → Authentication (JWT)
/api/health, /healthz      → Health probes (DB-independent)
/api/flutterwave/webhook   → Payment webhook receiver
```

**Async Services Running:**
- Tender sweeper (daily 07:00 UK time)
- Deadline mailer (daily 07:30 UK time)
- Campaign scheduler (7am, 9am, 6pm)
- Sequence executor (send queued emails)
- Reply poller (monitor inbound replies)
- Visitor notification scheduler
- Invitation reminder scheduler

---

### 1.2 Growth Platform Frontend (artifacts/growth-platform)

**Purpose:** React 18 + Vite SPA for Growth Platform UI  
**Type:** Node.js (Build) + Static (Server)  
**Port:** 5010/growth-platform (via base path)  
**Build Output:** `dist/public/` (Vite static build)

**Key Pages:**
- `/growth-platform/login` — JWT login
- `/growth-platform/dashboard` — Main CRM dashboard
- `/growth-platform/outreach-analytics` — Analytics dashboard (NEW - Elizabeth AI)
- `/growth-platform/events` — Event management
- `/growth-platform/prospects` — Prospect discovery
- `/growth-platform/campaigns` — Campaign builder
- `/growth-platform/pipeline` — Kanban pipeline

**Build Requirements:**
- Must set `BASE_PATH=/growth-platform` during build
- Vite will output to `dist/public/`
- All API calls target `/api/` prefix (served by API server)

---

### 1.3 Event Perfekt Frontend (artifacts/event-perfekt)

**Purpose:** React 18 + Vite marketing website + portal  
**Type:** Node.js (Build) + Static (Server)  
**Port:** 5010/` (root path)  
**Build Output:** `dist/public/` (Vite static build)

**Key Pages:**
- `/` — Marketing homepage
- `/iamher` — I Am Her landing
- `/iamher/stories` — Community stories
- `/iamher/analytics` — I Am Her analytics (admin only)
- `/projects-and-programmes` — Portfolio
- `/client-portal` — Client dashboard
- `/booking-enquiry` — Booking form
- SEO-injected prerendered pages (200+)

**Build Requirements:**
- Must set `BASE_PATH=/` during build
- SEO meta injection via Node.js (prerender)
- Static output to `dist/public/`

---

### 1.4 Mockup Sandbox (artifacts/mockup-sandbox)

**Purpose:** Component preview server (dev-only, can skip production)  
**Type:** Node.js + Vite  
**Port:** 8081 (local dev only)  
**Status:** Non-critical for production

**Decision:** 
- ✅ **Skip in production** — Used only for local development
- Remove from Railway/Render deployment

---

## 2. Start Commands for Each Service

### 2.1 API Server Deployment

#### Build Phase
```bash
cd artifacts/api-server
pnpm install
pnpm run typecheck
pnpm run build
```

**Build Output:** `dist/index.mjs`

#### Start Command
```bash
PORT=5010 node --enable-source-maps ./dist/index.mjs
```

**Environment Detection:**
- Reads `DATABASE_URL` or falls back to individual `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` env vars
- If no database URL provided, attempts local Postgres at `127.0.0.1:5432`
- Graceful degradation: starts without DB if unavailable (degraded mode)

**Health Check:**
- URL: `GET /api/health` or `GET /api/healthz` or `GET /healthz`
- Response: `{ status: "ok", db: { available, degraded, error }, sweep: {...} }`
- Independent of database (no DB required for health check)

---

### 2.2 Growth Platform Frontend Deployment

#### Build Phase
```bash
cd artifacts/growth-platform
pnpm install
pnpm run typecheck
BASE_PATH=/growth-platform pnpm run build
```

**Build Output:** `dist/public/`

#### Start Command
```bash
# Option A: Serve static files directly from dist/public/
node --enable-source-maps server.mjs

# Option B: Use Railway/Render static hosting
# Configure web root = artifacts/growth-platform/dist/public
```

**Environment Variables Needed:**
- `PORT` — Port to listen on (default 5174)
- `BASE_PATH=/growth-platform` — Must match build

**Note:** Growth Platform is a SPA. It requires:
- Fallback routing: all non-file requests → `index.html`
- API proxy: `/api/*` → API server (via reverse proxy upstream)

---

### 2.3 Event Perfekt Frontend Deployment

#### Build Phase
```bash
cd artifacts/event-perfekt
pnpm install
pnpm run typecheck
BASE_PATH=/ pnpm run build
```

**Build Output:** `dist/public/`

#### Start Command
```bash
# Option A: Serve static files directly
node --enable-source-maps server.mjs

# Option B: Use Railway/Render static hosting
# Configure web root = artifacts/event-perfekt/dist/public
```

**Environment Variables Needed:**
- `PORT` — Port to listen on (default 5173)
- `BASE_PATH=/` — Root path

**Note:** Event Perfekt includes SEO prerendering. Build phase may take 2-3 minutes due to prerender-seo.ts.

---

## 3. Build & Start Commands — Recommended Deployments

### Option A: Railway.app

#### Railway.toml
```toml
[build]
builder = "nixpacks"
root = "."

[build.nixPackages]
packages = ["postgresql", "node"]

[[services]]
name = "api-server"
build.builder = "nixpacks"
build.context = "./artifacts/api-server"
build.nixPackages = ["nodejs"]

start = "PORT=$PORT node --enable-source-maps ./dist/index.mjs"
envPrefix = "API_"

[[services]]
name = "growth-platform"
build.builder = "nixpacks"
build.context = "./artifacts/growth-platform"
buildCommand = "pnpm install && BASE_PATH=/growth-platform pnpm run build"
start = "PORT=$PORT node server.mjs"
envPrefix = "GP_"

[[services]]
name = "event-perfekt"
build.builder = "nixpacks"
build.context = "./artifacts/event-perfekt"
buildCommand = "pnpm install && BASE_PATH=/ pnpm run build"
start = "PORT=$PORT node server.mjs"
envPrefix = "EP_"

[[services]]
name = "postgres"
image = "postgres:16"
```

#### Deployment Command
```bash
railway up
```

---

### Option B: Render.com (Recommended)

Render requires separate service configs. Create `render.yaml`:

```yaml
services:
  # API Server
  - type: web
    name: eventperfekt-api
    env: node
    region: eu-west-1
    plan: standard
    buildCommand: "cd artifacts/api-server && pnpm install && pnpm run build"
    startCommand: "node --enable-source-maps artifacts/api-server/dist/index.mjs"
    envVars:
      - key: PORT
        value: 5010
      - key: NODE_ENV
        value: production
    autoDeploy: false
    
  # Growth Platform Frontend
  - type: static_site
    name: eventperfekt-growth-platform
    buildCommand: "cd artifacts/growth-platform && pnpm install && BASE_PATH=/growth-platform pnpm run build"
    staticPublicPath: artifacts/growth-platform/dist/public
    routes:
      - path: "/*"
        destination: /index.html
        
  # Event Perfekt Frontend
  - type: static_site
    name: eventperfekt-web
    buildCommand: "cd artifacts/event-perfekt && pnpm install && BASE_PATH=/ pnpm run build"
    staticPublicPath: artifacts/event-perfekt/dist/public
    routes:
      - path: "/*"
        destination: /index.html

  # PostgreSQL Database
  - type: pserv
    name: eventperfekt-postgres
    plan: standard
    version: 16
    ipAllowList: 
      - source: 0.0.0.0/0
        description: "All IPs (restrict in production)"
```

#### Deployment Command
```bash
render deploy
```

---

## 4. Required Environment Variables

### 4.1 Critical (Application Won't Start)

| Variable | Service(s) | Purpose | Example |
|----------|-----------|---------|---------|
| `DATABASE_URL` | API Server | PostgreSQL connection | `postgresql://user:pass@host:5432/epdb?sslmode=require` |
| `JWT_SECRET` | API Server | JWT signing/verification | `640e16...` (64+ hex chars) |
| `OPENROUTER_API_KEY` | API Server | Claude/GPT-4o access | `sk-or-v1-...` |

**Blocker:** Without these three, API server will fail to start.

---

### 4.2 Feature-Critical (Missing disables specific features)

| Variable | Service(s) | Purpose | Default | If Missing |
|----------|-----------|---------|---------|-----------|
| `APOLLO_API_KEY` | API Server | Prospect enrichment via Apollo.io | — | Enrichment disabled |
| `FLW_PUBLIC_KEY` | API Server | Flutterwave public key (payments) | — | Payments disabled |
| `FLW_SECRET_KEY` | API Server | Flutterwave secret key (payments) | — | Payments disabled |
| `LYNDA_EMAIL` | API Server | Email from address (Namecheap) | — | Gmail fallback used |
| `LYNDA_EMAIL_PASSWORD` | API Server | Email SMTP password | — | Gmail fallback used |
| `GMAIL_EMAIL` | API Server | Gmail fallback email | — | No email fallback |
| `GMAIL_PASSWORD` | API Server | Gmail app password | — | No email fallback |
| `SENDGRID_API_KEY` | API Server | SendGrid (optional) | — | Email via Namecheap/Gmail only |

---

### 4.3 Optional (Deployments work without these)

| Variable | Service(s) | Purpose | Default |
|----------|-----------|---------|---------|
| `REPLIT_DOMAINS` | API Server | Replit deployment domains | Auto-detected (not needed) |
| `FRONTEND_URL` | API Server | Explicit frontend URL for CORS | `http://localhost:5173/5174` |
| `PORT` | All | Server port | 5010 / 5173 / 5174 |
| `BASE_PATH` | Growth Platform / Event Perfekt | URL base path during build | `/growth-platform` / `/` |
| `NODE_ENV` | All | Environment mode | `production` |
| `PG_CONNECT_TIMEOUT_MS` | API Server | DB connection timeout | 2000ms |
| `OPS_RECIPIENT` | API Server | Ops alert email address | `DIGEST_RECIPIENT` fallback |
| `DIGEST_RECIPIENT` | API Server | Tender digest email | — |
| `TWIN_TRADE_SYNC_URL` | API Server | Group Portal signoff webhook | — |
| `EP_CROSS_SYSTEM_KEY` | API Server | Cross-system validation key | — |

---

### 4.4 Environment Variable Checklist for Railway/Render

**Required in production (must set):**
```
✅ DATABASE_URL
✅ JWT_SECRET
✅ OPENROUTER_API_KEY
✅ APOLLO_API_KEY (strongly recommended)
✅ FLW_PUBLIC_KEY (if payments enabled)
✅ FLW_SECRET_KEY (if payments enabled)
```

**Highly recommended:**
```
✅ LYNDA_EMAIL
✅ LYNDA_EMAIL_PASSWORD
✅ GMAIL_EMAIL (fallback)
✅ GMAIL_PASSWORD (fallback)
```

**Example Railway/Render .env file:**
```env
# Critical
DATABASE_URL=postgresql://user:pass@host:5432/ep?sslmode=require
JWT_SECRET=640e16072dd6fe1c26cbad26f5ed30d204c0a55e9441a2c961886bea45b009d7
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
APOLLO_API_KEY=xxxxxxxxxxxxx

# Payments
FLW_PUBLIC_KEY=FLWPUBK_TEST_xxxxx
FLW_SECRET_KEY=FLWSECK_TEST_xxxxx

# Email
LYNDA_EMAIL=lyndajohnson@eventperfekt.com
LYNDA_EMAIL_PASSWORD=xxxxxxxxxxxxxxxx
GMAIL_EMAIL=noreply+eventperfekt@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx

# Optional
NODE_ENV=production
PORT=5010
FRONTEND_URL=https://eventperfekt.net
OPS_RECIPIENT=admin@eventperfekt.com
DIGEST_RECIPIENT=admin@eventperfekt.com
EP_CROSS_SYSTEM_KEY=test-key-prod
```

---

## 5. Database Requirements

### 5.1 PostgreSQL Version & Setup

| Requirement | Specification |
|------------|---------------|
| **Version** | PostgreSQL 16+ (tested on 16.10) |
| **Connection Mode** | Direct TCP or managed cloud (Railway/Render PostgreSQL) |
| **SSL Mode** | `require` for remote connections, `disable` for localhost |
| **Schema** | Managed by Drizzle ORM (no migrations needed on deploy) |
| **Tables** | 100+ tables pre-defined (auto-created on first DB init) |

### 5.2 Database Connection Options

#### Option A: Railway PostgreSQL (Recommended)
- **Setup:** Railway → Create PostgreSQL service → Copy connection string
- **Connection String Format:** `postgresql://user:pass@pw-xxxxx.railroad.app:5432/railway?sslmode=require`
- **Advantage:** Managed backups, point-in-time recovery, auto-scaling
- **Cost:** ~$12-15/month for starter plan

#### Option B: Render PostgreSQL (Alternative)
- **Setup:** Render → Create PostgreSQL → Copy connection string
- **Connection String Format:** `postgresql://user:pass@dpg-xxxxx.render.com:5432/epdb?sslmode=require`
- **Advantage:** Free tier available (limited), integrated with Render deployments
- **Cost:** Free tier (512 MB) or $15+/month

#### Option C: External Managed Postgres (Neon, Supabase, etc.)
- Recommended: **Neon** (serverless, auto-scaling, $5-50/month)
- Connection String: `postgresql://user:pass@ep-xxxxx.neon.tech/epdb?sslmode=require`

### 5.3 Database Initialization

**First Deployment Only:**

The API server will auto-initialize the database schema on startup. Drizzle ORM will:
1. Check if schema exists
2. Create all tables if missing
3. Apply any pending migrations

**No manual SQL required.** Just ensure `DATABASE_URL` is set before first startup.

### 5.4 Backup Strategy

**CRITICAL:** Set up backups before production.

#### Option A: Platform-Managed (Recommended)
- **Railway:** Database → Settings → Backups → Enable automatic backups (daily)
- **Render:** PostgreSQL → Dashboard → Backups → Enable automated backups
- **Retention:** 7 days minimum (platform default)

#### Option B: Manual Backup (Additional Safety)
```bash
# One-off backup
pg_dump $DATABASE_URL -Fc -f backup_$(date +%Y%m%d_%H%M%S).dump

# Store backup securely (upload to S3 / Render object storage)
```

#### Option C: Point-in-Time Recovery (PITR)
- **Railway PostgreSQL:** PITR enabled for all backups (Pro+ plans)
- **Render PostgreSQL:** PITR available with Enterprise

---

## 6. Deployment Blockers & Risks

### 6.1 🔴 Critical Blockers (Must Fix Before Deployment)

#### Blocker #1: Missing Environment Variables

**Status:** ❌ **BLOCKS DEPLOYMENT**

**Issue:** The API server will crash on startup if these are not set:
- `DATABASE_URL` — No database connection possible
- `JWT_SECRET` — Authentication will fail
- `OPENROUTER_API_KEY` — AI features will crash

**Impact:** Complete API server failure → entire platform down

**Resolution:**
```bash
# Before deployment, verify:
1. DATABASE_URL is set and valid (test with psql)
2. JWT_SECRET is >64 characters (strong random string)
3. OPENROUTER_API_KEY is valid (test with curl)
```

**Test Command (SSH into Railway/Render):**
```bash
node -e "console.log('DB:', process.env.DATABASE_URL ? '✓' : '✗')"
node -e "console.log('JWT:', process.env.JWT_SECRET?.length > 64 ? '✓' : '✗')"
node -e "console.log('OpenRouter:', process.env.OPENROUTER_API_KEY ? '✓' : '✗')"
```

---

#### Blocker #2: Node/pnpm Version Mismatch

**Status:** ⚠️ **LIKELY ISSUE**

**Issue:** Monorepo requires:
- **Node.js:** 24.0.0+ (currently using Node 24)
- **pnpm:** 8.0.0+

Railway/Render default to older versions (Node 18, pnpm 6).

**Impact:** Build fails with missing features or incompatible lock file

**Resolution:**

For **Railway:**
```toml
[build.nixPackages]
packages = ["nodejs_24", "pnpm"]
```

For **Render:**
```yaml
buildCommand: "npm install -g pnpm@latest && pnpm install && ..."
```

---

#### Blocker #3: Database Not Ready Before API Startup

**Status:** ⚠️ **RARE BUT POSSIBLE**

**Issue:** If PostgreSQL service takes >5 seconds to initialize after deployment, API server might start before DB is reachable, causing a connection timeout.

**Impact:** API server reports "degraded mode" (DB unavailable)

**Resolution:**
- Railway/Render auto-handles DB startup orchestration (usually fine)
- If needed, add explicit health check retry in deployment:

```bash
# Deployment script
for i in {1..30}; do
  if pg_isready -h $PGHOST -U $PGUSER; then
    echo "DB ready, starting API server..."
    node dist/index.mjs
    break
  fi
  echo "Waiting for DB... ($i/30)"
  sleep 2
done
```

---

#### Blocker #4: Frontend SPA Routing Misconfiguration

**Status:** ⚠️ **COMMON ISSUE**

**Issue:** Vite SPAs (Growth Platform & Event Perfekt) require fallback routing. Without it:
- `/growth-platform/prospects` → 404 (not `/index.html`)
- Browser back/forward doesn't work

**Impact:** Frontend appears broken (blank page after navigation)

**Resolution:**

For **Railway static hosting:**
```yaml
routes:
  - path: "/*"
    destination: /index.html
    status: 200
```

For **Render static hosting:**
```yaml
routes:
  - path: "/*"
    destination: /index.html
```

For **custom static server**, use fallback middleware:
```javascript
app.use(express.static('dist/public'));
app.get('*', (req, res) => res.sendFile('dist/public/index.html'));
```

---

#### Blocker #5: CORS Misconfiguration

**Status:** ⚠️ **COMMON ISSUE**

**Issue:** Growth Platform & Event Perfekt frontends make XHR requests to `/api/*`. If CORS is misconfigured, requests are blocked.

**Impact:** Blank dashboard, form submission failures

**Current Code (index.ts, lines 130-150):**
```typescript
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : [
      "http://localhost:5173",
      "http://localhost:5174",
      ...(process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(",") : [])
    ];
```

**Problem:** Production needs explicit `FRONTEND_URL` env var. Otherwise defaults are localhost-only.

**Resolution:**
```bash
# Set in Railway/Render environment:
FRONTEND_URL=https://eventperfekt.net
```

**Recommended Config for Production:**
```bash
# If Growth Platform at: growth.eventperfekt.net
# If Event Perfekt at: eventperfekt.net
FRONTEND_URL=https://eventperfekt.net,https://growth.eventperfekt.net
```

---

### 6.2 ⚠️ Medium-Severity Issues (Should Fix Before Going Live)

#### Issue #1: Tender Sweeper Scheduler Reliability

**Status:** ⚠️ **NEEDS MONITORING**

**Issue:** API server starts a tender sweeper at startup (daily 07:00 UK). If:
- API server crashes, sweeper stops
- DB goes offline, sweeper fails silently
- No alerting configured

**Impact:** Tender updates missed, daily digest email not sent

**Mitigation:**
1. Set up health check alerts (Uptime Robot, PagerDuty)
2. Configure email alerts on sweep failure (OPS_RECIPIENT env var)
3. Implement external scheduler (cron job to call `/api/sweep` endpoint)

**Health Check:**
```bash
curl https://eventperfekt.net/api/health
# Check "sweep" field for last run time
```

---

#### Issue #2: Email Configuration

**Status:** ⚠️ **FRAGILE**

**Current Setup:**
1. Try Namecheap (LYNDA_EMAIL + LYNDA_EMAIL_PASSWORD)
2. Fallback to Gmail (GMAIL_EMAIL + GMAIL_PASSWORD)
3. If both fail, only log (no send)

**Production Risk:**
- Gmail app passwords expire or get revoked
- Namecheap SMTP blocked if IP not whitelisted
- No monitoring if email fails silently

**Mitigation:**
```bash
# Test email configuration before deploying
curl -X POST https://eventperfekt.net/api/email/test \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"to":"test@example.com"}'
```

---

#### Issue #3: Apollo.io API Quota Management

**Status:** ⚠️ **COST CONTROL**

**Issue:** Elizabeth workflow caps enrichment at 15 per run to prevent quota exhaustion (~$1.50/run). But:
- No global monthly limit enforced
- If runs 3x/day, costs ~$45/month on enrichment alone
- No auto-shutdown if quota approaching

**Mitigation:**
1. Set Apollo API key spending limit in Apollo dashboard
2. Monitor via `/api/ai-comms/health` for quota status
3. Log all enrichment spend to `growth_spend_logs` table

**Recommended Config:**
```bash
# In Elizabeth workflow initialization:
enrichmentBudgetPerRun = 15  # Already enforced
maxRunsPerDay = 2              # Add limit
monthlyBudget = $50            # Add hard cap
```

---

#### Issue #4: SSL/TLS Certificate Management

**Status:** ⚠️ **INFRASTRUCTURE**

**Issue:** Railway & Render auto-provision SSL for platform subdomains but not custom domains.

**If using custom domain (eventperfekt.net):**
- Must manually provision SSL via Let's Encrypt or custom cert
- Certificate renewal must be automated
- Redirects HTTP → HTTPS required

**Resolution:**
```bash
# Railway: Settings → Custom Domain → Add eventperfekt.net
# Render: Environment → Deployments → Custom Domain → eventperfekt.net

# Both auto-provision SSL via Let's Encrypt (auto-renewal)
```

---

### 6.3 🟡 Minor Warnings (Nice-to-Have Fixes)

#### Warning #1: No Horizontal Scaling Built-in

**Status:** ℹ️ **INFORMATIONAL**

**Issue:** API server stores in-memory state (tender sweep health, async schedulers). Scaling to multiple instances would lose this state.

**Current:** Single instance sufficient for event traffic. Not a blocker.

**Future:** Implement Redis for distributed state if scaling needed.

---

#### Warning #2: Growth Platform Analytics Caching

**Status:** ℹ️ **PERFORMANCE**

**Issue:** Every `/api/growth/outreach/analytics-dashboard` request queries the database (expensive).

**Current:** Works fine for <100 users. 

**Future:** Add Redis caching layer if needed.

---

#### Warning #3: No Rate Limiting on Public Endpoints

**Status:** ℹ️ **SECURITY**

**Issue:** Public endpoints (`/api/event-august/stories`, `/api/event-august/contact`) have rate limits (10 req/15min) but no DDoS protection.

**Mitigation:**
- Use Railway/Render DDoS protection (built-in)
- Or add Cloudflare in front (reverse proxy)

---

## 7. Deployment Checklist

### Pre-Deployment (1-2 hours)

- [ ] **Verify Node.js & pnpm versions**
  ```bash
  node --version  # Should be 24+
  pnpm --version  # Should be 8+
  ```

- [ ] **Test build locally**
  ```bash
  pnpm run build
  cd artifacts/api-server && pnpm run build
  cd artifacts/growth-platform && BASE_PATH=/growth-platform pnpm run build
  cd artifacts/event-perfekt && BASE_PATH=/ pnpm run build
  ```

- [ ] **Prepare environment variables** (all from §4)
  - [ ] DATABASE_URL (test with `psql $DATABASE_URL -c "SELECT 1"`)
  - [ ] JWT_SECRET (generate with `openssl rand -hex 32`)
  - [ ] OPENROUTER_API_KEY (test with API)
  - [ ] APOLLO_API_KEY
  - [ ] FLW_PUBLIC_KEY & FLW_SECRET_KEY
  - [ ] LYNDA_EMAIL & LYNDA_EMAIL_PASSWORD
  - [ ] GMAIL_EMAIL & GMAIL_PASSWORD
  - [ ] FRONTEND_URL (production domain)

- [ ] **Set up PostgreSQL database**
  - [ ] Create Railway/Render PostgreSQL service
  - [ ] Note connection string
  - [ ] Configure backups (daily minimum)
  - [ ] Test connection from local machine

- [ ] **Configure DNS (if custom domain)**
  - [ ] Add Railway/Render nameservers to domain registrar
  - [ ] Wait for propagation (~5 min)

---

### Deployment (Railway.app)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Create project
railway init

# 4. Set environment variables
railway variables set DATABASE_URL=...
railway variables set JWT_SECRET=...
railway variables set OPENROUTER_API_KEY=...
# ... (repeat for all vars)

# 5. Deploy
railway up

# 6. Monitor
railway logs -s api-server
railway logs -s growth-platform
railway logs -s event-perfekt
```

---

### Deployment (Render.com)

```bash
# 1. Create render.yaml (see §3.2)

# 2. Push to GitHub
git add render.yaml
git commit -m "Add render deployment config"
git push

# 3. Go to Render.com → New → Web Service
#    Connect GitHub repo → Deploy

# 4. Set environment variables in Render dashboard
#    Environment → Add variable (repeat for all vars)

# 5. Monitor
#    Logs tab → watch real-time output
```

---

### Post-Deployment (30 min)

- [ ] **Test API health**
  ```bash
  curl https://eventperfekt.net/api/health
  # Should return: { status: "ok", db: { available: true }, sweep: {...} }
  ```

- [ ] **Test Growth Platform**
  ```
  Visit: https://eventperfekt.net/growth-platform/login
  Login with test credentials → Verify dashboard loads
  ```

- [ ] **Test Event Perfekt**
  ```
  Visit: https://eventperfekt.net/
  Verify homepage loads, forms work
  ```

- [ ] **Test Email**
  ```bash
  curl -X POST https://eventperfekt.net/api/email/test \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d '{"to":"test@example.com","subject":"Test"}'
  ```

- [ ] **Test AI Workflow**
  ```bash
  curl -X POST https://eventperfekt.net/api/growth/elizabeth/workflow \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d '{"eventId":"test","apolloProspects":[...]}'
  ```

- [ ] **Monitor logs for errors**
  ```bash
  # Check for unexpected errors, warnings, or failed connections
  ```

- [ ] **Verify backups are running**
  ```bash
  # Railway/Render dashboard → Database → Backups → Confirm recent backup
  ```

---

## 8. Estimated Resource Requirements

### Compute

| Service | Recommended | Minimum | Railway Plan | Render Plan |
|---------|-------------|---------|-------------|------------|
| API Server | 2 CPU, 2GB RAM | 1 CPU, 512MB | Standard ($12/mo) | $7/mo Starter |
| Growth Platform | Static (no compute) | — | Static | Free tier |
| Event Perfekt | Static (no compute) | — | Static | Free tier |
| **Total Monthly** | — | — | **~$27-40/mo** | **~$20-25/mo** |

### Network

| Item | Estimate |
|------|----------|
| Growth Platform requests/day | 10,000-50,000 |
| Event Perfekt requests/day | 50,000-200,000 |
| Database queries/day | 100,000-500,000 |
| Email volume/day | 100-500 |
| Bandwidth (monthly) | 50-200 GB |

**Note:** Railway & Render include generous free tier for outbound bandwidth. No overage charges expected unless traffic >1TB/month.

---

## 9. Rollback Plan

If production breaks after deployment:

### 9.1 Quick Rollback (< 5 min)

1. **Revert environment variables** to last known-good state
2. **Restart API server**
   ```bash
   railway redeploy api-server   # Railway
   # or
   # Render: Dashboard → Deployments → Previous version → Redeploy
   ```

### 9.2 Full Rollback (< 15 min)

1. **Switch traffic back to previous URL** (if using canary deployment)
2. **Restore database from backup**
   ```bash
   # Railway: Database → Backups → Restore to timestamp
   # Render: PostgreSQL → Backups → Restore
   ```
3. **Redeploy API server**

### 9.3 Failover to Replit (Emergency)

If both Railway & Render are down:
1. Switch DNS to Replit domain (eventperfekt.replit.dev)
2. Service runs on existing Replit deployment

---

## 10. Success Criteria

Deployment is successful when:

- [ ] API server starts without errors and reports `"db": { "available": true }`
- [ ] Health endpoint responds within 1 second
- [ ] Growth Platform login works (JWT generated)
- [ ] Event Perfekt homepage loads (all 200 pages prerendered)
- [ ] Outreach dashboard loads with analytics (Elizabeth AI endpoints responsive)
- [ ] Test email sends successfully
- [ ] Database backups have completed at least once
- [ ] Logs show no ERROR or WARN messages
- [ ] All 3 frontends respond within 2 seconds (p95 latency)
- [ ] Zero downtime during deployment (using blue-green or canary strategy)

---

## 11. Post-Deployment Operations

### Weekly
- [ ] Check tender sweeper ran (logs, `/api/health` → sweep.at)
- [ ] Verify database backups exist (Railway/Render dashboard)
- [ ] Monitor error rate (< 1%)

### Monthly
- [ ] Review AI spend logs (`growth_spend_logs` table)
- [ ] Check storage usage (Railway/Render dashboard)
- [ ] Review email delivery stats (bounce rate < 2%)

### Quarterly
- [ ] Full backup restoration test (restore to staging, verify data)
- [ ] Load test (simulate 100+ concurrent users)
- [ ] Security audit (review auth logs, access patterns)

---

## 12. Contact & Support

| Role | Responsibility |
|------|-----------------|
| **DevOps** | Infrastructure, backups, scaling |
| **Backend** | API fixes, deployments, database |
| **Frontend** | SPA fixes, routing, UI/UX |

**Emergency Contacts:**
- Render Support: support@render.com (< 1 hour response)
- Railway Support: support@railway.app (< 2 hour response)
- PostgreSQL Emergency: Database backups (always available)

---

**Deployment Plan Approved:** ✓  
**Target Go-Live Date:** [TO BE SET]  
**Prepared By:** AI Assistant  
**Last Updated:** 2026-07-09  
