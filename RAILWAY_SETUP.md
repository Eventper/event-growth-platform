# Railway Deployment Setup Guide

**Status:** Ready for Railway deployment  
**Date:** 2026-07-09  
**Services:** 3 production services  

---

## Files Added for Railway Deployment

| File | Purpose |
|------|---------|
| `railway.toml` | ✅ Main deployment configuration (3 services + database) |
| `artifacts/growth-platform/server.mjs` | ✅ Static file server for Growth Platform SPA |
| `artifacts/event-perfekt/server.mjs` | ✅ Static file server for Event Perfekt SPA |
| `railroad.json` | ❌ DELETE - old format, replace with railway.toml |

**Note:** Delete `railroad.json` before deployment if it exists.

---

## Railway Services Architecture

### Service 1: API Server
- **Name in Railway:** `api-server`
- **Type:** Node.js Application
- **Root Directory:** `artifacts/api-server/`
- **Build Command:** `pnpm install --no-frozen-lockfile && pnpm run build`
- **Start Command:** `PORT=$PORT node --enable-source-maps ./dist/index.mjs`
- **Health Check:** `GET /api/health` (responds with DB status)
- **Port:** `$PORT` environment variable (Railway provides this)

**What it does:**
- Express 5.2.1 API server
- Serves all `/api/*` endpoints
- Runs background jobs (tender sweeper, email scheduler, reply poller)
- Requires: `DATABASE_URL`, `JWT_SECRET`, `OPENROUTER_API_KEY`

---

### Service 2: Growth Platform
- **Name in Railway:** `growth-platform`
- **Type:** Node.js Application
- **Root Directory:** `artifacts/growth-platform/`
- **Build Command:** `pnpm install --no-frozen-lockfile && BASE_PATH=/growth-platform pnpm run build`
- **Start Command:** `PORT=$PORT node --enable-source-maps ./server.mjs`
- **Health Check:** `GET /` (returns index.html)
- **Port:** `$PORT` environment variable (Railway provides this)

**What it does:**
- React SPA for Growth Platform CRM
- Serves from `/growth-platform/` URL path
- All API calls proxy to `/api/*` via network to `api-server` service
- Static file serving with SPA fallback routing

---

### Service 3: Event Perfekt
- **Name in Railway:** `event-perfekt`
- **Type:** Node.js Application
- **Root Directory:** `artifacts/event-perfekt/`
- **Build Command:** `pnpm install --no-frozen-lockfile && BASE_PATH=/ pnpm run build`
- **Start Command:** `PORT=$PORT node --enable-source-maps ./server.mjs`
- **Health Check:** `GET /` (returns index.html)
- **Port:** `$PORT` environment variable (Railway provides this)

**What it does:**
- React SPA for Event Perfekt website
- Serves from root URL path `/`
- Includes 200+ prerendered SEO pages
- All API calls proxy to `/api/*` via network to `api-server` service
- Static file serving with SPA fallback routing

---

### Database: PostgreSQL
- **Name in Railway:** `postgres` or `database`
- **Type:** PostgreSQL 16
- **Setup:** Provision via Railway UI (not in railway.toml)
- **Connection:** Via `DATABASE_URL` environment variable
- **Auto-init:** Drizzle ORM auto-creates schema on first start

---

## Environment Variables Required

### Critical (Application Won't Start)
These MUST be set in Railway:

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
JWT_SECRET=640e16072dd6fe1c26cbad26f5ed30d204c0a55e9441a2c961886bea45b009d7
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=https://yourdomain.com
```

**Where to set:**
1. Railway Dashboard → Project → Variables
2. Add each variable as key-value pair
3. Apply

### Highly Recommended (Features Work Better)
```
APOLLO_API_KEY=xxxxxxxxxxxxxxxxxxxxx
LYNDA_EMAIL=lyndajohnson@eventperfekt.com
LYNDA_EMAIL_PASSWORD=xxxxxxxxxxxxxxxxxxxxx
GMAIL_EMAIL=noreply+eventperfekt@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx
FLW_PUBLIC_KEY=FLWPUBK_TEST_xxxxxxxxxxxxx
FLW_SECRET_KEY=FLWSECK_TEST_xxxxxxxxxxxxx
```

### Optional (Defaults Work)
```
NODE_ENV=production
PG_CONNECT_TIMEOUT_MS=2000
OPS_RECIPIENT=admin@eventperfekt.com
DIGEST_RECIPIENT=admin@eventperfekt.com
EP_CROSS_SYSTEM_KEY=test-key-prod
```

---

## Build & Start Commands Summary

| Service | Build | Start |
|---------|-------|-------|
| **api-server** | `pnpm install && pnpm run build` | `PORT=$PORT node ./dist/index.mjs` |
| **growth-platform** | `pnpm install && BASE_PATH=/growth-platform pnpm run build` | `PORT=$PORT node ./server.mjs` |
| **event-perfekt** | `pnpm install && BASE_PATH=/ pnpm run build` | `PORT=$PORT node ./server.mjs` |

---

## Step-by-Step Railway Deployment

### Phase 1: Prepare Repository
1. Push `railway.toml` to GitHub
2. Ensure `.gitignore` includes `node_modules/`, `dist/`
3. Commit and push all changes

```bash
git add railway.toml artifacts/*/server.mjs artifacts/*/package.json
git commit -m "Add Railway deployment configuration"
git push origin main
```

### Phase 2: Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "GitHub repo" → Select your repository
4. Railway auto-detects `railway.toml` ✅

### Phase 3: Configure Database
1. Railway Dashboard → Project → Add Service
2. Select "PostgreSQL 16"
3. Wait for it to initialize (2-3 minutes)
4. Railway auto-sets `DATABASE_URL` environment variable ✅

### Phase 4: Set Environment Variables
1. Railway Dashboard → Project → Variables
2. Add these critical variables:
   - `JWT_SECRET` (generate: `openssl rand -hex 32`)
   - `OPENROUTER_API_KEY` (from openrouter.ai)
   - `FRONTEND_URL` (your production domain)
   - `DATABASE_URL` (already set from PostgreSQL addon)

3. Add feature-critical variables (email, payments, Apollo):
   - `LYNDA_EMAIL`
   - `LYNDA_EMAIL_PASSWORD`
   - `GMAIL_EMAIL`
   - `GMAIL_PASSWORD`
   - `APOLLO_API_KEY`
   - `FLW_PUBLIC_KEY`
   - `FLW_SECRET_KEY`

### Phase 5: Trigger Deploy
1. Railway Dashboard → Project → Deployments
2. Click "Deploy" button (auto-detects from railway.toml)
3. Monitor build logs:
   - `api-server` builds first (takes ~2-3 min)
   - `growth-platform` builds (takes ~1-2 min)
   - `event-perfekt` builds (takes ~2-3 min due to SEO prerender)

### Phase 6: Verify Deployment
1. **Health Checks:**
   ```
   API:     https://api-server-xxxxx.railway.app/api/health
   GP:      https://growth-platform-xxxxx.railway.app/
   EP:      https://event-perfekt-xxxxx.railway.app/
   ```

2. **Test Endpoints:**
   ```
   curl https://api-server-xxxxx.railway.app/api/health
   # Should return: { "status": "ok", "db": { "available": true } }
   ```

3. **Login Test:**
   - Navigate to Growth Platform
   - Test login with credentials

### Phase 7: Configure DNS (Optional)
If using custom domain:
1. Railway Dashboard → Domain Settings
2. Add custom domain (e.g., `api.example.com`)
3. Update DNS records as instructed
4. SSL auto-provisioned via Let's Encrypt

---

## What NOT to Deploy

- ❌ `artifacts/mockup-sandbox` (dev-only)
- ❌ `lib/api-client-packages` (shared libraries, not services)
- ❌ `lib/db` (shared library, used by api-server)
- ❌ `scripts/` (utilities, not services)

Railway.toml ignores these automatically ✅

---

## Troubleshooting Checklist

### Deploy Fails During Build
- **Check:** Build logs in Railway Dashboard
- **Likely:** `DATABASE_URL` not set → Drizzle ORM schema fails
- **Fix:** Set `DATABASE_URL` before deploying

### API Server Starts but Reports "db unavailable"
- **Check:** `GET /api/health` response
- **Likely:** PostgreSQL service not ready or connection failed
- **Fix:** Wait 30 seconds for PostgreSQL to initialize, restart api-server

### Growth Platform Shows Blank Page
- **Check:** Browser DevTools → Console for errors
- **Likely:** API calls to `/api/*` failing (api-server not responding)
- **Fix:** Verify api-server is healthy, check CORS settings

### Build Takes >30 Minutes
- **Check:** Railway build logs
- **Likely:** Event Perfekt SEO prerender taking time (normal for 200+ pages)
- **Expected:** Up to 10-15 minutes for first deploy

### "Cannot find module" errors during build
- **Check:** Build logs
- **Likely:** Workspace package references broken
- **Fix:** Ensure all `@workspace/*` packages are in `lib/` directory

---

## What Happens After Deploy

1. **Immediate:**
   - ✅ API server starts, connects to database
   - ✅ Growth Platform builds, serves static files
   - ✅ Event Perfekt builds (including SEO prerender), serves static files

2. **First Hour:**
   - ✅ Database schema auto-created by Drizzle ORM
   - ✅ Tender sweeper initializes (runs daily at 07:00 UK)
   - ✅ Email scheduler initializes (sends digests daily)

3. **Ongoing:**
   - ✅ Auto-restarts on failure (restart policy)
   - ✅ Logs streamed to Railway Dashboard
   - ✅ Health checks run every 30 seconds

---

## Monitoring & Logs

### View Real-Time Logs
1. Railway Dashboard → Project → Service (e.g., api-server)
2. Click "Logs" tab
3. Watch for errors, warnings, startup messages

### Common Log Messages (Normal)
```
✓ Event Perfekt platform running
✓ Flutterwave payment gateway configured
✓ Database connection established
```

### Error Messages (Investigation Needed)
```
✗ Database unavailable at startup
✗ OpenRouter authentication not configured
✗ Failed to connect to PostgreSQL
```

---

## Cost Estimate

| Service | Cost (Railway Standard) |
|---------|------------------------|
| API Server | ~$5-10/month (0.5-1 CPU) |
| Growth Platform | ~$2-3/month (static, minimal) |
| Event Perfekt | ~$2-3/month (static, minimal) |
| PostgreSQL 16 | ~$15/month (starter) |
| **Total** | **~$24-31/month** |

---

## Files Checklist

Before deploying, verify these files exist and are correct:

- [x] `railroad.toml` — Main configuration (deploy this)
- [x] `artifacts/api-server/package.json` — Has "start" script (no changes needed)
- [x] `artifacts/growth-platform/package.json` — Has "start" script (ADDED)
- [x] `artifacts/growth-platform/server.mjs` — Static server (CREATED)
- [x] `artifacts/event-perfekt/package.json` — Has "start" script (ADDED)
- [x] `artifacts/event-perfekt/server.mjs` — Static server (CREATED)
- [ ] `railroad.json` — DELETE THIS (old format)

---

## Deployment Status

| Component | Status | Notes |
|-----------|--------|-------|
| API Server | ✅ READY | Build: esbuild, Start: Node |
| Growth Platform | ✅ READY | Build: Vite + BASE_PATH, Start: Static server |
| Event Perfekt | ✅ READY | Build: Vite + prerender + BASE_PATH, Start: Static server |
| Config Files | ✅ READY | railway.toml created |
| Env Vars | ⚠️ MANUAL | Must be set in Railway UI |
| Database | ⚠️ MANUAL | Must be provisioned in Railway UI |

**OVERALL: PARTIAL PASS — Ready to deploy, needs env vars configured**

---

## Quick Reference: What You'll Click in Railway

1. **Create Project** → Select GitHub repo
2. **Add Service** → PostgreSQL 16
3. **Set Variables** → 6-15 environment variables (see section above)
4. **Deploy** → Click "Deploy" button
5. **Monitor** → Watch build logs (10-20 minutes)
6. **Test** → Click service URLs to verify

**No code changes required.** All configuration is declarative in `railway.toml`.

---

## Support Resources

- Railway Docs: https://docs.railway.app
- PostgreSQL Add-on: https://docs.railway.app/databases/postgresql
- TOML Format: https://toml.io
- Node.js on Railway: https://docs.railway.app/languages-and-frameworks/nodejs
