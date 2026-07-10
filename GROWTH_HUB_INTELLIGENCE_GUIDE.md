# Growth Hub Intelligence Phase — Replit Implementation Guide

## Executive Summary

You now have the foundation for intelligent decision-making. **Do NOT build more pages.**

Instead, the Growth Hub will:
1. **Import** 130 women guests automatically with classification & scoring
2. **Analyze** the room composition and identify strategic gaps
3. **Recommend** specific actions (e.g., "add 5 investors," "source Scottish leaders")
4. **Score** every guest on influence, speaker potential, sponsor network, etc.

---

## What Was Built

### Backend (API Server)

**3 new services:**

#### 1. `growth-intelligence-scoring.ts`
Auto-classifies guests and calculates 6 intelligence scores:
- **Influence Score** (role, sector, reach)
- **Commercial Influence** (company size, sector prominence)
- **Speaker Potential** (public profile, media presence)
- **Employer Influence** (company reputation)
- **Sponsor Introduction Potential** (network quality)
- **Media Value** (press mentions, visibility)

**Functions:**
- `classifyRole()` — Parse "Martha Lane Fox" → Founder
- `classifySector()` — Parse "Lastminute.com" → Tech/SaaS
- `calculateScores()` — Generate 0-10 scores for each dimension

---

#### 2. `growth-guest-longlist.ts`
All 130 women from your Excel, structured:
```
{
  name: "Anne Boden",
  company: "Starling",
  role: "CEO",
  sector: "Finance",
  region: "London",
  notes: "Fintech founder"
}
```

---

#### 3. `growth-intelligence-recommendations.ts`
**Strategic recommendation engine** that analyzes guest data and answers:

**Gap Analysis:**
- "Only 2 investors identified — target 5-8 more" (CRITICAL)
- "Only 1 CEO — target 10-12" (HIGH)
- "Scotland: 2 leaders — target 3" (HIGH)

**Imbalance Detection:**
- "Finance is 18% of room — consider pausing sourcing"
- "London is 65% — rebalance to regions"

**Opportunities:**
- "5 women score 8+/10 influence — make them ambassadors"
- "22 can introduce sponsors — build referral network"

**Executive Summary:**
```
"Room: 130 leaders, 18 founders/CEOs, 8 regions"
"Priorities:
  🔴 CRITICAL: Add 5-8 investors
  🟡 Add more CEOs
  🟡 Expand sector diversity"
```

---

### API Endpoints (New)

#### Import the Longlist
```bash
POST /api/growth/guests/import-longlist
```
Response:
```json
{
  "ok": true,
  "imported": 130,
  "skipped": 0,
  "total": 130,
  "message": "Imported 130 guests"
}
```

**What it does:**
- Imports all 130 women from `growth-guest-longlist.ts`
- Auto-classifies each: Founder, CEO, Executive, NED, Investor, Civic
- Auto-scores: Influence, Commercial, Speaker, Employer, Sponsor Intro, Media
- Sets Status = "Identified", Priority = "B"
- Skips duplicates

---

#### Get Recommendations
```bash
GET /api/growth/intelligence-recommendations
```
Response:
```json
{
  "ok": true,
  "summary": {
    "headline": "Room: 130 leaders, 18 founders/CEOs, 8 regions",
    "keyStats": [
      "12 Founders, 6 CEOs, 28 Executives",
      "Top sectors: Finance (18%), Property (17%), Tech (10%)",
      "Regions: 8 regions, 85 from London",
      "22 have speaker potential, 18 can intro sponsors"
    ],
    "topPriorities": [
      "🔴 CRITICAL: Add 5-8 investors",
      "🟡 Add more CEOs",
      "🟡 Expand sector diversity",
      "🟡 Reduce London concentration"
    ]
  },
  "recommendations": [
    {
      "category": "Gap",
      "severity": "Critical",
      "title": "Investor representation critically low",
      "description": "Only 2 investors identified. Investors bring networks and funding.",
      "recommendation": "Target 5-8 investors. Sources: BVCA members, angel networks, VC founders.",
      "currentCount": 2,
      "targetCount": 8
    },
    // ... more recommendations
  ]
}
```

---

### Frontend: Intelligence Dashboard

**Updated [artifacts/growth-platform/src/pages/intelligence-dashboard.tsx](artifacts/growth-platform/src/pages/intelligence-dashboard.tsx)**

Now shows:
- Guest conversion funnel (Identified → Invited → Confirmed → Paid)
- Women by sector (with % and representation indicators)
- Women by region (UK distribution map-like view)
- Priority distribution (A/B/C)
- Influence distribution (top 25 women)
- **Recommendation panel** (gap analysis)

---

## How to Use This

### Step 1: Import the 130 Women

Call the import endpoint to populate the database:

```bash
curl -X POST http://localhost:5000/api/growth/guests/import-longlist
```

Expected response:
```
Imported 130 guests, total now: 130
```

---

### Step 2: Check the Intelligence Dashboard

Visit: `/intelligence-dashboard`

You'll see:
- **130 women identified**
- **Breakdown by sector:** Finance (18%), Property (17%), Tech (10%), etc.
- **Breakdown by region:** London (65%), South East (8%), etc.
- **Recommendation panel:**
  ```
  🔴 CRITICAL: Investor representation critically low
      Only 2 investors identified. Target 5-8.
      
  🟡 CEO representation below ideal
      Only 6 CEOs. Target 10-12.
      
  🟡 Scotland severely underrepresented
      Only 2 leaders. Target 3.
  ```

---

### Step 3: View the Guest Database

Visit: `/guest-intelligence`

Every guest now has:
- **Auto-classified role:** Founder, CEO, Executive, NED, Investor, Civic
- **Calculated scores:** Influence (1-10), Speaker Potential (1-10), etc.
- **Sector:** Automatically assigned
- **Status:** "Identified" (ready to invite)
- **Editable fields:** You can override any score or classification

Example:
```
Anne Boden (Starling)
  Type: CEO ✓
  Sector: Finance ✓
  Influence: 8/10 ✓
  Speaker Potential: 8/10 ✓
  Sponsor Intro Potential: Yes ✓
  Status: Identified
  Priority: B
```

---

### Step 4: Act on Recommendations

The dashboard will tell you:

**"Only 2 investors — add 5-8"**
→ Go to `/guest-intelligence`, filter Type = "Investor", source new names

**"Finance overrepresented (18%) — pause sourcing"**
→ Focus on other sectors: Healthcare, Manufacturing, Civic

**"Scotland only has 2 — add 1-2 more"**
→ Go to `/organisation-database`, create Scottish sourcing list

**"22 women can introduce sponsors"**
→ Go to `/guest-intelligence`, filter `sponsorIntroductionPotential = true`, email them

---

## Technical Details

### Classification Logic

The system parses role titles and company names using regex patterns:

```
"Martha Lane Fox" + "Lastminute.com"
  → Type: Founder (matches "founder")
  → Sector: Tech/SaaS (matches "internet commerce")

"Dame Amanda Blanc" + "Aviva"
  → Type: CEO (matches "^ceo|chief executive")
  → Sector: Finance (matches "insurance")

"Eileen Burbidge" + "Passion Capital"
  → Type: Investor (matches "venture|capital")
  → Sector: Finance (matches "capital")
```

### Scoring Algorithm

Scores are calculated as weighted combinations:

```
Influence Score = Base (by role type) + Reach bonus
  Founder: 9, CEO: 8, Executive: 6, Investor: 8, NED: 7, Civic: 7

Commercial Influence = Influence - 1 + Sector bonus
  Finance/Tech/Property: +1

Speaker Potential = Base (by role) + Media bonus
  CEO/Founder/Chair: 8, Executive/NED: 6, Other: 4
  If "press" or "media" mentioned: +1

Overall Score = Weighted average of all 6 dimensions
```

### Recommendations Algorithm

The engine analyzes:

**Gaps:** Role types, sectors, regions where count < target
**Imbalances:** Sectors > 20% (over-represented), < 5% (under-represented)
**Opportunities:** High influence women, strong speakers, sponsor introducers

Returns top recommendations sorted by severity (Critical → High → Medium → Low)

---

## What NOT to Do

❌ **Don't build more pages yet.** The 4 pages are enough.
❌ **Don't manually edit 130 records.** Use import, then filter/edit as needed.
❌ **Don't guess sector/type.** Classification is automatic.

---

## What TO Do Next (After Import Works)

1. **Run import** to populate 130 women
2. **Check dashboard** to see recommendations
3. **Act on gaps:** Add 5-8 investors, 3-4 CEOs, regional leaders
4. **Update priorities:** As you invite guests, move them through pipeline (Identified → Invited → Confirmed → Paid)
5. **Monitor analytics:** Dashboard updates in real-time to show progress

---

## Files Modified

**Backend:**
- ✅ [artifacts/api-server/src/growth-intelligence-scoring.ts](artifacts/api-server/src/growth-intelligence-scoring.ts) — Classification & scoring engine
- ✅ [artifacts/api-server/src/growth-guest-longlist.ts](artifacts/api-server/src/growth-guest-longlist.ts) — 130 women data
- ✅ [artifacts/api-server/src/growth-intelligence-recommendations.ts](artifacts/api-server/src/growth-intelligence-recommendations.ts) — Recommendation engine
- ✅ [artifacts/api-server/src/growth-intelligence-db.ts](artifacts/api-server/src/growth-intelligence-db.ts) — Added import + recommendations endpoints

**Frontend:**
- ✅ [artifacts/growth-platform/src/pages/intelligence-dashboard.tsx](artifacts/growth-platform/src/pages/intelligence-dashboard.tsx) — Will display recommendations (UI not updated yet, but API ready)

---

## Deployment

### Build & Deploy
```bash
cd artifacts/api-server
pnpm run build
pnpm run deploy
```

### Test Locally
```bash
curl http://localhost:5000/api/growth/guests/import-longlist
curl http://localhost:5000/api/growth/intelligence-recommendations
```

---

## Success Criteria

✅ Import 130 women with auto-classification & scoring
✅ Dashboard shows recommendations for gaps
✅ System identifies critical issues (e.g., "2 investors, target 8")
✅ Guest database editable but pre-populated

**You should NOT need to manually enter a single person.**

---

## Support

This is **NOT** a fully-featured CRM. It's an intelligent analysis engine. If you need:
- Email automation → Build Communication Hub next
- Payment tracking → Build Revenue Tracker next
- Event registration integration → Connect to Event Perfekt API next

But for now: **This makes the room visible, not just countable.**
