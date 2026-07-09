# Intelligent Tender Discovery Engine — Technical Review & Plan

Date: 2026-06-28. Reviewer: automated codebase analysis.
Verdict: **Feasible as an additive extension. ~80% already exists.** The only
genuinely new capability is **open-internet AI search + a verification pass** —
a first version of which is now implemented (off by default).

---

## Answers to the 10 review questions

**1. Can the existing architecture support this?**
Yes — it already runs most of it. There is a daily **tender sweeper**
(`tender-sweeper.ts`, 07:00 UK) and a 6-hourly **scheduled discovery**
(`saas-tender-routes.ts`) pulling 8+ structured sources, scoring them, deduping,
and seeding `saas_tenders`, which then flows into Bid/No-Bid → full bid draft →
Integrity Checker → human review. The new engine slots in as another *source*
feeding the same chokepoint. No redesign needed.

**2. Separate microservice or module?**
**In-process module.** Everything shares one Express server, one Postgres, and
one AI client (OpenRouter). A microservice would add deployment, auth and DB-access
overhead for zero benefit at this scale. The new file `tender-web-discovery.ts` is
a self-contained module, not a service.

**3. Can AI internet search run alongside the structured feeds?**
Yes. The structured sources and the web source both return the same `SweepResult`
shape and run concurrently inside the sweep (`Promise.all` with per-source isolation
+ retry). A failing web search cannot break the structured sweep.

**4. Can scheduled daily searches be implemented?**
Already are — the sweeper schedules itself daily and has **boot catch-up** if a run
was missed. The web source is wired into that same schedule (opt-in). *Caveat:*
scheduling is hand-rolled `setTimeout`, not a cron library — fine, but a missed-run
catch-up for the **digest** (not just the sweep) is still recommended.

**5. What APIs are available; where is web search / scraping needed?**
- **AI:** OpenRouter (`OPENROUTER_API_KEY`) is the primary client and **already
  supports live web search** via its web plugin (`callOpenRouter(..., {webSearch:true})`
  returns answer text **plus citation URLs**). **No new key or scraper is required**
  for v1.
- **Structured:** Contracts Finder, Find a Tender, TED (EU), UNGM, UNDP, World Bank,
  Nigeria are integrated; SAM.gov exists but is wired to manual routes only.
- **Scraping:** none today (no Cheerio/Playwright). Not needed for v1 — OpenRouter's
  web plugin does the searching. Per-site scrapers can be added later for sources the
  LLM can't read well.

**6. How should duplicate detection work?**
Reuse what exists: dedup by **OCID** when present, else **lowercased title**, plus a
unique `(org_id, ocid)` index and an upsert that preserves Won/Lost/Submitted status.
Web results have no OCID, so they dedup by title/URL — already handled. *Recommended
upgrade:* add fuzzy title matching + host normalisation to catch the same notice
mirrored across portals (Phase 2).

**7. How do verified tenders enter the existing workflow?**
They are written to `saas_tenders` with status `Auto-Discovered` by the existing
`seedToAllOrgs`, exactly like every structured tender — so they appear in the
dashboard and can be taken through Bid/No-Bid → draft → Integrity → human review.
**Nothing auto-submits.** Open-web results pass the verification pass first and never
go straight to bid-writing.

**8. Does the database need new tables?**
For v1, **no.** `saas_tenders` already has the needed columns (source, source_url,
ocid, lane_scores, bid_decision, integrity_status, …), `saas_automation_log` records
runs, `saas_health_status` tracks health, and `saas_learning_vault` stores win/loss
lessons. *Phase 2 additions worth considering:* a `saas_tender_verification` table
(per-check audit: link/deadline/buyer/insurance/accreditation/financial/locality) and
automatic outcome tracking to close the learning loop.

**9. Is caching / a search index needed?**
Not for v1 — daily volumes are small (tens–hundreds). The dedup index on
`saas_tenders` is sufficient. A search index (e.g. Postgres full-text or pgvector for
semantic matching) only becomes worthwhile if you later store thousands of historical
notices for similarity search.

**10. Architectural changes needed before implementation?**
None blocking. The structured discovery, scoring, dedup, pipeline, dashboard and
learning vault are all in place. The clean extension point is "add a source that
returns `SweepResult[]`," which is exactly how v1 was added.

---

## What EXISTS vs what is NEW

| Capability | Status |
|---|---|
| Structured sources (Contracts Finder, Find a Tender, TED, UNGM, UNDP, World Bank, Nigeria) | ✅ exists |
| Daily schedule + boot catch-up | ✅ exists |
| Relevance scoring (6 lanes) + **strategic-anchor gate** | ✅ exists (gate added 2026-06-28) |
| Dedup (OCID/title) + unique index | ✅ exists |
| Bid/No-Bid, full draft, Integrity Checker, human review | ✅ exists |
| Learning vault (win/loss lessons) | ✅ exists (manual entry) |
| Tender dashboard (React) | ✅ exists (`event-perfekt/.../saas-tender-dashboard.tsx`) |
| **Open-internet AI search** | 🆕 **added v1** (`tender-web-discovery.ts`, opt-in) |
| **Verification pass** (genuine link, open, future deadline) | 🆕 **added v1** |
| Quantified win-probability % | ⏳ Phase 2 (today: BID/NO_BID + band label) |
| Automated outcome feedback loop | ⏳ Phase 2 (today: manual) |
| Cross-portal fuzzy dedup; full 12-point verification (insurance/accreditation/financial/locality) | ⏳ Phase 2 |

---

## What was built now (Phase 1)

`artifacts/api-server/src/tender-web-discovery.ts`:
- `sweepWebSearch()` — searches the open web via OpenRouter's web plugin with
  EP-service-area prompts + synonym expansion, parses structured candidates **and**
  citation URLs.
- **Verification pass** (`verify`): requires a real `http(s)` link, a title, a valid
  **future** deadline, and that the link **resolves** (404/410 → discarded; bot-blocked
  401/403 kept for human review; network failure → discarded).
- Returns plain `SweepResult[]` → flows through the sweeper's existing
  `scoreAndFilter` (relevance + strategic anchor + exclude + live-only) and dedup →
  `seedToAllOrgs`. So web finds get the **same** verification/scoring as everything else
  and **never** bypass the gate into bid-writing.
- **Off by default.** Set `TENDER_WEB_SEARCH_ENABLED=true` (and ensure
  `OPENROUTER_API_KEY` is set) to activate; it then runs inside the daily 07:00 sweep
  as an extra "WebSearch" source.

### To turn it on
1. Set env `TENDER_WEB_SEARCH_ENABLED=true`.
2. Confirm `OPENROUTER_API_KEY` is set (already used elsewhere).
3. Redeploy/restart the API server. Web-discovered, verified tenders appear in the
   dashboard as `Auto-Discovered` for human review.

## Recommended Phase 2 (not built — needs your steer)
- Quantified win-probability % (extend Bid/No-Bid to emit a number + factors).
- Automatic outcome tracking (bid → submitted → won/lost) feeding the learning vault.
- A dedicated `saas_tender_verification` audit table for the full 12-point checklist
  (insurance, accreditation, financial standing, locality, mandatory requirements).
- Cross-portal fuzzy dedup (same notice mirrored across sites).
- A "Discovery" tab on the dashboard with the funnel counts (found / expired / poor-fit /
  needs-review / qualified / top-3).
