# Tender SaaS Operational Status & Issues

## Current Date: 2026-07-10 | Status: ⚠️ PARTIALLY OPERATIONAL

---

## ✅ OPERATIONAL COMPONENTS

### Backend (API Server)
- ✅ Tender Sweeper (`tender-sweeper.ts`) — runs daily 07:00 UK
- ✅ Deadline Mailer (`tender-deadline-mailer.ts`) — scheduled 07:30 UK
- ✅ Email Service (`emailService.ts`) — Namecheap → Gmail fallback chain
- ✅ SaaS Tender Routes (`saas-tender-routes.ts`) — Auth, tenders CRUD
- ✅ Search Configuration (`saas-tender-search-config` table + endpoints)
- ✅ Contracts Finder API integration (wired 2026-07-10)
- ✅ Find a Tender API integration (wired 2026-07-10)
- ✅ Starter scheduled via `startDeadlineMailer()` in index.ts line 342

### Frontend (React Dashboard)
- ✅ Tender Dashboard (`saas-tender-dashboard.tsx`)
- ✅ Discovery Tenders view (`DiscoveryTenders.tsx`)
- ✅ Bid Writer (`BidWriter.tsx`)
- ✅ Elizabeth Chat (`ElizabethTenderChat.tsx`)
- ✅ NEW Tender Finder (`SearchFinder.tsx`) — added 2026-07-10

### Database
- ✅ Core tables: `saas_tenders`, `saas_organizations`, `saas_tender_bid_sections`
- ✅ Automation log: `saas_automation_log`
- ✅ NEW Search config: `saas_tender_search_config` (created 2026-07-10)

---

## ❌ CRITICAL ISSUES BLOCKING RIGHT TENDER DISCOVERY

### Issue 1: Digest Only Shows "committed"/"drafting"/"submitting" Tenders
**File:** `tender-deadline-mailer.ts` line 65–77
**Problem:** `fetchDeadlinesThisWeek()` filters by status IN ('committed','drafting','submitting') ONLY
- Empty list when nothing is committed (incorrect signal)
- New discoveries never appear in deadline section
- Dashboard shows Researching/Reviewing, but digest hides them

**Impact:** User sees candidates but digest says "0 deadlines" → confusion

**Fix Needed:**
```sql
-- Include ALL live statuses except completed/won/lost/closed
WHERE deadline IS NOT NULL AND deadline != ''
  AND deadline::date >= CURRENT_DATE
  AND deadline::date <= CURRENT_DATE + INTERVAL '7 days'
  AND LOWER(status) NOT IN ('committed','drafting','submitting','won','lost','closed','no bid','declined','awarded to other','awarded','cancelled','withdrawn','unsuccessful','expired')
```

---

### Issue 2: Status Enum Mismatch Across Codebase
**Files Affected:** 
- `saas-tender-routes.ts` — defines statuses in various filters
- `tender-deadline-mailer.ts` — uses hardcoded status sets
- `tender-sweeper.ts` — writes "auto-discovered", "qualifying", "researching"
- Dashboard — shows "Researching", "Reviewing", "Committed", etc.

**Problem:** No single source of truth for valid statuses
- Same tender gets different statuses in different code paths
- Digest queries miss valid tenders due to status mismatch
- Frontend shows status that doesn't match backend filter

**Current Status Flow:**
1. Sweeper ingest → `auto-discovered` or `qualifying` (saas_tenders.status)
2. User manual → `researching` (dashboard change)
3. User decision → `committed`, `no bid`, `declined`
4. Drafting → `drafting`
5. Final → `submitted`, then `won`/`lost`/`cancelled`

**Fix Needed:** Define canonical status enum:
```typescript
// lib/db/src/schema/tender-statuses.ts
export const TENDER_STATUSES = [
  "auto_discovered",      // Auto-discovered from sweeper (passive discovery)
  "qualifying",           // Passed relevance gate (can bid)
  "researching",          // Under evaluation
  "reviewing",            // In bid review
  "committed",            // Decision made → will bid
  "no_bid",               // Decision made → will NOT bid
  "declined",             // No longer interested
  "drafting",             // Writing proposal
  "submitted",            // Proposal submitted
  "won",                  // Contract awarded
  "lost",                 // Not selected
  "cancelled",            // Buyer cancelled tender
  "withdrawn",            // Buyer withdrew
  "unsuccessful",         // No winner
  "expired",              // Deadline passed
  "closed",               // Closed by system (old)
  "awarded"               // Legacy — same as 'won'
] as const;
```

---

### Issue 3: Tender Status Column Data Type Issue
**File:** `saas_tenders` table
**Problem:** Status is VARCHAR, not enforced ENUM
- Typos slip through (e.g., "Reserching" vs "researching")
- Case inconsistency (COMMITTED vs committed vs Committed)
- Old values linger ("closed", "awarded" still used alongside "won", "lost")

**Impact:** Queries using `LOWER(status) IN (...)` may miss tenders

**Fix Needed:** Standardize all queries and add migration to clean existing data

---

### Issue 4: Email Not Being Sent (Possible Causes)

#### A. DIGEST_RECIPIENT Not Set
**File:** `tender-discovery-config.ts` line 271
```typescript
export const DIGEST_RECIPIENT = process.env.DIGEST_RECIPIENT || "adminuk@eventperfekt.com";
```
**Check:** Is `DIGEST_RECIPIENT` env var set? Or is it going to hardcoded `adminuk@eventperfekt.com`?

**Action:** Verify env var is set to correct group alias (e.g., `adminuk@eventperfekt.com` for UK)

#### B. Email Service Credentials Missing
**File:** `emailService.ts` uses `LYNDA_EMAIL` + `LYNDA_EMAIL_PASSWORD` or Gmail fallback

**Check:** Are `LYNDA_EMAIL`, `LYNDA_EMAIL_PASSWORD` set? Is `GMAIL_EMAIL` + `GMAIL_PASSWORD` as fallback ready?

**Action:** Verify both sets of credentials configured

#### C. Mailer Scheduled But Silent Failure
**File:** `tender-deadline-mailer.ts` line 278-290 (scheduler)

**Check:** Does server log show mailer scheduled? (Look for: "[TenderDigest] Next digest scheduled at...")

**Action:** Enable logging in server startup to confirm scheduler active

#### D. No Qualifying Tenders (Empty Digest)
**File:** `tender-deadline-mailer.ts` line 60–68 (fetchNewTenders)

**Check:** Are any tenders in DB with status='qualifying' or 'auto-discovered' from last 24h?

**Query to run:**
```sql
SELECT COUNT(*) as qualifying_count, COUNT(DISTINCT title) as unique_tenders
FROM saas_tenders
WHERE updated_at >= NOW() - INTERVAL '24 hours'
  AND LOWER(status) IN ('qualifying', 'auto-discovered')
  AND (deadline IS NULL OR deadline >= CURRENT_DATE::text);
```

If `qualifying_count = 0` → sweeper not finding tenders, or status not being set correctly

---

### Issue 5: Sweeper Finding Tenders But Not Setting Right Status

**File:** `tender-sweeper.ts`

**Problem:** Sweep runs at 07:00, but may be:
- Finding 0 tenders (API failing, keywords not matching)
- Finding tenders but NOT passing relevance gate
- Finding tenders but setting status='researching' instead of 'qualifying'

**Check:** Server logs at 07:00+ for:
```
[TenderSweep] Starting sweep...
[TenderSweep] New tenders discovered: X
[TenderSweep] Tenders seeded to saas_tenders: Y
```

If Y = 0 → none passed the gate (RELEVANCE_THRESHOLD issue)

---

## 🔧 CRITICAL FIXES NEEDED (Priority Order)

### Priority 1: Fix Status Filtering in Digest (IMMEDIATE)
**File:** `tender-deadline-mailer.ts` line 60–77
**Fix:** Update `fetchNewTenders()` and `fetchDeadlinesThisWeek()` to use inclusive status filter (all active statuses)
**Time:** 5 min edit, 2 min test
**Impact:** Digest will show actual candidates

---

### Priority 2: Verify Email Configuration (IMMEDIATE)
**Files:** `.env` / environment variables
**Checks:**
- [ ] `DIGEST_RECIPIENT` set to group alias (e.g., `adminuk@eventperfekt.com`)
- [ ] `LYNDA_EMAIL` set (e.g., `lyndajohnson@eventperfekt.com`)
- [ ] `LYNDA_EMAIL_PASSWORD` set to SMTP password
- [ ] `GMAIL_EMAIL` set (e.g., `noreply+eventperfekt@gmail.com`)
- [ ] `GMAIL_PASSWORD` set to app password (not account password)
- [ ] `OPS_RECIPIENT` set (or defaults to DIGEST_RECIPIENT)

**Action:** Add these to production .env NOW

---

### Priority 3: Check Sweeper Running & Finding Tenders (TODAY)
**Manual test:**
```bash
# Check server logs for last 2 hours
tail -100 /var/log/api-server.log | grep TenderSweep

# Or curl the health endpoint
curl http://localhost:5000/api/saas-tender/health

# Or query the automation log
SELECT action, timestamp, result FROM saas_automation_log 
WHERE action IN ('sweep', 'discovery_run')
ORDER BY id DESC LIMIT 10;
```

If no sweep entries → sweeper crashed or wasn't started

---

### Priority 4: Standardize Tender Status Enum (THIS WEEK)
**Files to update:**
1. `lib/db/src/schema/tender-statuses.ts` — define enum
2. `tender-sweeper.ts` — use enum values
3. `tender-deadline-mailer.ts` — use enum values
4. `saas-tender-routes.ts` — use enum values
5. Database migration — clean old statuses

---

### Priority 5: Fix Digest Status Filters to Include All Active Tenders (THIS WEEK)
**File:** `tender-deadline-mailer.ts`

**Change 1 (line 63):** fetchNewTenders status filter
```diff
- AND LOWER(status) IN ('qualifying', 'auto-discovered')
+ AND LOWER(status) IN ('auto_discovered', 'qualifying', 'researching', 'reviewing', 'committed', 'drafting', 'submitted')
+ AND LOWER(status) NOT IN ('won', 'lost', 'closed', 'no_bid', 'declined', 'awarded_to_other', 'cancelled', 'withdrawn', 'unsuccessful', 'expired')
```

**Change 2 (line 71):** fetchDeadlinesThisWeek status filter
```diff
- AND LOWER(status) IN ('committed','drafting','submitting')
+ AND LOWER(status) NOT IN ('won', 'lost', 'closed', 'no_bid', 'declined', 'awarded_to_other', 'cancelled', 'withdrawn', 'unsuccessful', 'expired')
```

---

## 📋 IMMEDIATE ACTION ITEMS (Next 2 Hours)

1. **VERIFY ENVIRONMENT VARIABLES**
   - Check if `DIGEST_RECIPIENT`, email credentials are set
   - Add to `.env` if missing
   - Restart server

2. **FIX DIGEST STATUS FILTERS**
   - Edit `tender-deadline-mailer.ts`
   - Apply Change 1 + Change 2 above
   - Rebuild and restart server

3. **MANUAL TRIGGER DIGEST FOR TESTING**
   ```bash
   # Or call via curl
   curl -X POST http://localhost:5000/api/admin/trigger-digest
   # Or check server logs for scheduled run (07:30 UK time)
   ```

4. **CHECK DATABASE FOR QUALIFYING TENDERS**
   - Run SQL query above
   - If 0 results → sweep not finding tenders → investigate Contracts Finder API

---

## 📧 Digest Should Look Like This

**Subject:** `Daily Tender Digest — 8 new, 3 closing this week`

**Content:**
```
Daily Tender Digest
Event Perfekt Tender Centre — Thursday, 10 July 2026

[Sweep summary: "Found 50 candidates, 8 passed relevance gate, etc."]

New qualifying tenders today (8):
┌─────────────────────────────────────────────────────────┐
│ Tender Title                          Buyer       Deadline
├─────────────────────────────────────────────────────────┤
│ Event Management Services             FCDO        28 Jul
│ Conference Logistics Provider         British Council  22 Jul
└─────────────────────────────────────────────────────────┘

Deadlines this week (3):
┌─────────────────────────────────────────────────────────┐
│ URGENT [Draft Proposal]  Deadline       Days Left
├─────────────────────────────────────────────────────────┤
│ Grant Management System  12 Jul 2026    2 days
│ [View] button for each
└─────────────────────────────────────────────────────────┘

[Discovery activity: 3 runs, 45 candidates reviewed]
[Live pipeline: Qualifying: 8 | Researching: 3 | Committed: 1 | Drafting: 1]

Log in → https://eventperfekt.com/saas-tender-dashboard
```

---

## ⚙️ System Health Check

Run this SQL to get current state:

```sql
-- 1. Tenders in pipeline
SELECT status, COUNT(*) as count
FROM saas_tenders
WHERE updated_at >= NOW() - INTERVAL '30 days'
GROUP BY status
ORDER BY count DESC;

-- 2. Last sweep result
SELECT action, result, timestamp
FROM saas_automation_log
WHERE action = 'sweep'
ORDER BY id DESC
LIMIT 1;

-- 3. Email send log
SELECT action, timestamp, email_sent
FROM saas_automation_log
WHERE action LIKE '%email%'
ORDER BY id DESC
LIMIT 5;

-- 4. Search config loaded
SELECT org_id, country, keywords, digest_email
FROM saas_tender_search_config
LIMIT 3;

-- 5. Tenders with upcoming deadlines (next 7 days)
SELECT COUNT(*) as urgent_count
FROM saas_tenders
WHERE deadline::date >= CURRENT_DATE
  AND deadline::date <= CURRENT_DATE + INTERVAL '7 days'
  AND LOWER(status) NOT IN ('won', 'lost', 'closed', 'no_bid', 'declined');
```

---

## Next Steps

1. **URGENT (Now):** Set env vars + fix digest filters → rebuild → test
2. **TODAY:** Verify sweep running, email sending
3. **THIS WEEK:** Standardize status enum across codebase
4. **ONGOING:** Monitor digest emails in `saas_automation_log`

---

Generated: 2026-07-10 18:15 UTC
Status: ACTION REQUIRED
