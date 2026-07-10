# Tender Management System — Quick Reference

**Status at a Glance:**

```
✅ Production-Ready Components:
  • Tender discovery (7 sources, daily sweep at 07:00)
  • Bid writing (16 sections, AI-powered via Claude)
  • Email digests (07:30 UK daily, deadline alerts)
  • Dashboard UI (8 tabs, comprehensive filters)
  • Database schema (42+ tables, org-isolated)
  • Authentication (JWT, 3-role RBAC)

⏳ In Progress / Partial:
  • Mobile responsiveness (desktop-first, partial mobile support)
  • Learning vault (pre-loaded lesson, no auto PDF extraction)
  • Bid governance (manual approval queue, no role routing)

❌ Missing / Not Implemented:
  • Alternative AI failover (OpenRouter only, no backup)
  • Rate limiting (no API limits, brute-force risk)
  • Database-driven feature flags (env-only)
  • End-to-end tests (no automated bid tests)
  • Real-time UI updates (requires page refresh)
```

---

## Quick Navigation

### 🔍 Tender Discovery
- **Daily sweep:** [tender-sweeper.ts](artifacts/api-server/src/tender-sweeper.ts#L1) → 07:00 UK
- **Scoring logic:** [tender-finder-service.ts](artifacts/api-server/src/tender-finder-service.ts#L263) → 6-lane, 30-pt threshold
- **Config:** [tender-discovery-config.ts](artifacts/api-server/src/tender-discovery-config.ts#L1) → Keywords, buyers, CPV codes
- **Sources:** Contracts Finder, Find a Tender, TED EU, SAM.gov, UNGM, World Bank, Nigeria

### 💌 Email & Notifications
- **Digest:** [tender-deadline-mailer.ts](artifacts/api-server/src/tender-deadline-mailer.ts#L233) → 07:30 UK, main digest
- **Recipients:** `DIGEST_RECIPIENT` env var (default: `adminuk@eventperfekt.com`)
- **Content:** New tenders, deadlines (7/3/1 days), discovery summary, pipeline stats
- **Failure alerts:** `OPS_RECIPIENT` env var (fallback if digest fails)

### 📝 Bid Writing
- **Dashboard:** [saas-tender-dashboard.tsx](artifacts/event-perfekt/src/pages/saas-tender-dashboard.tsx#L1) → Bid Writer tab
- **Component:** [BidWriter.tsx](artifacts/event-perfekt/src/components/tender/BidWriter.tsx#L1) → UI for 16 sections
- **16 Sections:** Social Value, Technical, Methodology, Pricing, Team & Experience, Risk, QA, H&S, Sustainability, GDPR, Innovation, Cover, Executive, References, Compliance, Other
- **AI Prompts:** [ep-tender-prompts.ts](artifacts/api-server/src/ep-tender-prompts.ts#L94) → Claude system prompts
- **Playbook:** [ep-bid-playbook.ts](artifacts/api-server/src/ep-bid-playbook.ts#L59) → Company facts, proof points, lessons

### 🧠 Learning Vault
- **Schema:** `saas_learning_vault` table
- **Pre-loaded:** GM BGH Event Management (T25003, Lost 86% vs 88%)
- **Upload:** Click "Save Lesson" in bid writer after tender outcome
- **Use:** Lessons injected into Claude prompts for future bids (sorted by severity)

### 🔐 Security & Auth
- **Auth:** [auth.ts](artifacts/api-server/src/auth.ts#L1) → JWT (7d), bcrypt passwords
- **Roles:** admin, manager, user (defined in [authMiddleware.ts](artifacts/api-server/src/authMiddleware.ts#L1))
- **Org Isolation:** All queries scoped to `org_id` (multi-tenant, no cross-org leakage)
- **API Key:** `JWT_SECRET` env var (required)

### 💾 Database
- **Schema:** [lib/db/src/schema/schema.ts](lib/db/src/schema/schema.ts#L254) → 42+ tables
- **Main Table:** `saas_tenders` (org_id, title, buyer, deadline, score, status, etc.)
- **Related:** bid_sections, pack_docs, fit_scores, learning_vault, governance_log
- **Constraints:** Foreign keys, unique (org_id, ocid), cascade deletes

### ⚙️ Configuration
- **Critical Env Vars:**
  ```
  DATABASE_URL (PostgreSQL)
  JWT_SECRET (token signing)
  OPENROUTER_API_KEY (AI)
  PORT (server port)
  NODE_ENV (dev/production)
  ```
- **Optional Env Vars:**
  ```
  FIND_A_TENDER_CDP_KEY (Find a Tender API)
  SAM_GOV_API_KEY (SAM.gov)
  DIGEST_RECIPIENT (default: adminuk@eventperfekt.com)
  TENDER_RELEVANCE_THRESHOLD (default: 30)
  SME_MAX_CONTRACT_VALUE (default: £250,000)
  ```

### 🚀 Deployment
- **Platform:** Railway or Render (PostgreSQL required)
- **Build:** `pnpm install && pnpm run build`
- **Start:** `pnpm run start` (on PORT env var)
- **Database:** Auto-created on first run via Drizzle migrations
- **Docs:** [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md), [RAILWAY_CHECKLIST.md](RAILWAY_CHECKLIST.md)

---

## Key Statistics

| Metric | Value |
|--------|-------|
| **Lines of Code (Core)** | ~5,000 (tender system) |
| **Database Tables** | 42+ tables |
| **Bid Sections** | 16 templates |
| **Tender Sources** | 7 (live + fallback) |
| **Dashboard Tabs** | 8 main views |
| **Email Frequency** | 1 daily digest (07:30 UK) |
| **Discovery Frequency** | Daily sweep (07:00 UK) + on-demand search |
| **Scoring Lanes** | 6 lanes (0–100 points) |
| **Gate Threshold** | 30 points (configurable) |
| **Delivery Platforms** | Railway, Render, Replit |

---

## Common Tasks

### ✅ Check Tender Scoring
1. Look at bid: Dashboard → Finder tab
2. Click tender card → "Deep Dive" modal
3. See `match_score` (0–100), `match_tier` (EXCELLENT/GOOD/POSSIBLE)
4. See `lane_scores` breakdown (6 lanes, color-coded)

### ✅ Generate Bid Section
1. Dashboard → Bid Writer tab
2. Select tender
3. Click "Generate All 16" or pick specific section
4. Wait for Claude (30–60 sec depending on section size)
5. Review generated content
6. Edit/improve
7. Submit for approval (all sections must be approved before bid submit)

### ✅ Send Digest Manually
1. API: POST `/api/saas-tender/run-deadline-mailer`
2. Or wait for 07:30 UK (automatic)

### ✅ Add New Tender Source
1. Implement fetch function in [tender-sources-v2.ts](artifacts/api-server/src/tender-sources-v2.ts)
2. Return array of NormalisedTender objects
3. Add to `searchTenders()` orchestrator
4. Test via Dashboard → Finder search

### ✅ Override AI Model for Bid Section
- Auto-selects: Haiku (quick), Sonnet (standard), Opus (complex)
- To override: Edit model selection in [saas-tender-routes.ts](artifacts/api-server/src/saas-tender-routes.ts) bid generation endpoint

### ✅ Check Org AI Spending
1. Query: `SELECT * FROM ai_cost_telemetry WHERE org_id = ? ORDER BY timestamp DESC`
2. Sum monthly: `SUM(cost_usd) WHERE timestamp >= start_of_month`
3. Compare to: `saas_organizations.ai_monthly_ceiling_usd` (e.g. $500)

---

## Troubleshooting

### ❌ Digest Email Not Sending
1. Check: Is DIGEST_RECIPIENT set? (default: `adminuk@eventperfekt.com`)
2. Check: LYNDA_EMAIL / LYNDA_EMAIL_PASSWORD set?
3. Check: Gmail fallback credentials set?
4. View logs: Check API server console for SMTP errors
5. Manual trigger: POST `/api/saas-tender/run-deadline-mailer`

### ❌ Bid Generation Fails
1. Check: OPENROUTER_API_KEY set?
2. Check: OpenRouter account has credits?
3. Check: Tender has sufficient details (title, description)?
4. Check: Org hasn't hit monthly AI ceiling?
5. View logs: Check "Improving section" or "Generate error" messages

### ❌ Tender Not Appearing in Finder
1. Check: Score >= 30? (see match_score in DB)
2. Check: Passes strategic anchor gate? (buyer or theme)
3. Check: Not marked "not relevant"? (see saas_tender_not_relevant table)
4. Check: Deadline in future?
5. Check: Source returned the tender? (trace through tender-sweeper logs)

### ❌ Cross-Org Data Leak Suspected
1. Audit: Check all queries for `org_id` filter
2. Check bridge routes: [bridge-routes.ts](artifacts/api-server/src/bridge-routes.ts#L361)
3. Verify: JWT_SECRET hasn't been exposed
4. Review: Recent auth changes, new endpoints

---

## Testing Checklist

- [ ] Bid generation: Create tender, generate 1 section, verify output
- [ ] Scoring: Add low-score tender, verify not in qualified list
- [ ] Deadline alert: Set tender deadline to tomorrow, check digest
- [ ] Org isolation: Log in as User A, verify User B's tenders not visible
- [ ] Email failover: Disable LYNDA_EMAIL, verify Gmail fallback works
- [ ] Learning vault: Submit tender outcome, verify lesson appears in next bid

---

**Last Updated:** 2026-07-10  
**Full Audit:** [TENDER_SYSTEM_CODEBASE_AUDIT.md](TENDER_SYSTEM_CODEBASE_AUDIT.md)
