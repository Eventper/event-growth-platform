# Railway Deployment Checklist

**Print this out or use it as a reference while deploying to Railway.**

---

## PRE-DEPLOYMENT (Do Locally)

- [ ] Open terminal in project root
- [ ] Run: `git status` (verify all changes committed)
- [ ] Run: `git log --oneline -3` (verify latest commits)
- [ ] Open: `railway.toml` (verify exists and readable)
- [ ] Verify: `artifacts/growth-platform/server.mjs` exists
- [ ] Verify: `artifacts/event-perfekt/server.mjs` exists

---

## GENERATE SECRETS

- [ ] Open terminal
- [ ] Run: `openssl rand -hex 32`
- [ ] **Copy the output** (this is your JWT_SECRET)
- [ ] Save to notepad (you'll paste in Railway)

---

## GATHER API KEYS

- [ ] Open https://openrouter.ai → Get API key → Copy
- [ ] (Optional) Open https://apollo.io → Get API key → Copy
- [ ] (Optional) Email accounts ready: LYNDA_EMAIL & GMAIL_EMAIL

---

## RAILWAY DASHBOARD - CREATE PROJECT

- [ ] Go to https://railway.app
- [ ] Sign up or log in
- [ ] Click "Start a New Project"
- [ ] Select "GitHub repo"
- [ ] Select your repository
- [ ] Click "Deploy Now"
- [ ] ⏳ Wait for initial detection (1-2 min)
- [ ] Verify railway.toml detected ✅

---

## RAILWAY DASHBOARD - ADD DATABASE

- [ ] Project Dashboard → "Add Service"
- [ ] Select "PostgreSQL 16"
- [ ] ⏳ Wait for PostgreSQL to initialize (2-3 min)
- [ ] Verify DATABASE_URL appears in Variables ✅

---

## RAILWAY DASHBOARD - SET VARIABLES (CRITICAL)

- [ ] Go to Project → "Variables" tab
- [ ] Click "New Variable"
- [ ] **JWT_SECRET**: Paste the secret from openssl command
- [ ] **OPENROUTER_API_KEY**: Paste from openrouter.ai
- [ ] **FRONTEND_URL**: Enter your domain (e.g., https://yourdomain.com)
- [ ] **DATABASE_URL**: Already set from PostgreSQL ✅
- [ ] Verify all 4 variables show in list

---

## RAILWAY DASHBOARD - SET VARIABLES (RECOMMENDED)

- [ ] **APOLLO_API_KEY**: Paste from apollo.io (or skip)
- [ ] **LYNDA_EMAIL**: Enter email address
- [ ] **LYNDA_EMAIL_PASSWORD**: Enter email password
- [ ] **GMAIL_EMAIL**: Enter backup email
- [ ] **GMAIL_PASSWORD**: Enter email app password
- [ ] **FLW_PUBLIC_KEY**: Flutterwave public (or skip)
- [ ] **FLW_SECRET_KEY**: Flutterwave secret (or skip)

---

## RAILWAY DASHBOARD - DEPLOY

- [ ] Verify all variables set ✅
- [ ] Click "Deploy" button
- [ ] ⏳ Watch build logs (should see):
  - "Building api-server..." (2-3 min)
  - "Building growth-platform..." (1-2 min)
  - "Building event-perfekt..." (2-3 min)
  - ✅ "Deployment successful"
- [ ] ⏳ Wait for services to start (2-3 min)
- [ ] Verify all 3 services show "Healthy" ✅

---

## VERIFY DEPLOYMENT

- [ ] Click on "api-server" service
- [ ] Copy the URL (e.g., https://api-server-xxxxx.railway.app)
- [ ] Paste in browser + "/api/health"
- [ ] Should show: `{"status":"ok","db":{"available":true},...}`
- [ ] ✅ API Server is working

- [ ] Click on "growth-platform" service
- [ ] Copy the URL
- [ ] Paste in browser
- [ ] Should show Growth Platform login page
- [ ] ✅ Growth Platform is working

- [ ] Click on "event-perfekt" service
- [ ] Copy the URL
- [ ] Paste in browser
- [ ] Should show Event Perfekt homepage
- [ ] ✅ Event Perfekt is working

---

## CUSTOM DOMAIN (OPTIONAL)

**Only do this if you have a custom domain (not required for testing):**

- [ ] Railway Dashboard → api-server service → "Settings"
- [ ] Click "Domain" section
- [ ] Click "Add Domain"
- [ ] Enter your domain (e.g., api.yourdomain.com)
- [ ] Follow Railway's DNS instructions
- [ ] ⏳ Wait 5-10 minutes for DNS propagation
- [ ] Test: `https://api.yourdomain.com/api/health`

---

## TROUBLESHOOTING

**If deployment fails during build:**
- [ ] Go to Deployments tab → View logs
- [ ] Look for error messages
- [ ] Common issue: Missing DATABASE_URL
  - [ ] Solution: Go to Variables, verify DATABASE_URL exists
  - [ ] Restart deployment

**If API shows "db unavailable":**
- [ ] PostgreSQL still starting
- [ ] Wait 30-60 seconds
- [ ] Refresh the health endpoint
- [ ] If still fails, restart api-server service

**If Growth Platform shows blank page:**
- [ ] Open browser DevTools (F12)
- [ ] Go to "Console" tab
- [ ] Look for error messages
- [ ] Common issue: API endpoint not responding
  - [ ] Verify api-server is healthy first

**If build takes >30 minutes:**
- [ ] This is normal for Event Perfekt (200+ SEO prerendered pages)
- [ ] First deploy takes longer than subsequent deploys
- [ ] Don't cancel, wait for completion

---

## SUCCESS INDICATORS

When deployment is complete, you should have:

- ✅ 3 services showing "Healthy"
- ✅ API health check returns `{"status":"ok"}`
- ✅ Growth Platform login page loads
- ✅ Event Perfekt homepage loads
- ✅ Build took 10-20 minutes (normal)
- ✅ No error messages in logs

---

## NEXT STEPS AFTER DEPLOYMENT

1. **Test login:**
   - Go to Growth Platform
   - Log in with credentials
   - Verify dashboard loads

2. **Test API:**
   - Verify `/api/health` endpoint works
   - Check logs for any warnings

3. **Monitor:**
   - Keep Railway Dashboard open
   - Watch for service restarts
   - Check logs periodically

4. **Scale (if needed):**
   - Railway Dashboard → Service → Settings
   - Adjust resources if needed
   - Default is sufficient for most cases

---

## CONTACT SUPPORT

- **Railway Support:** support@railway.app
- **OpenRouter Support:** support@openrouter.ai
- **Troubleshooting Guide:** See RAILWAY_SETUP.md

---

**Status: READY TO DEPLOY**

You have everything you need. Follow the steps above in order.
