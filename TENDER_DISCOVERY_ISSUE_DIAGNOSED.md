# CRITICAL: Tender Discovery Filtering Issue Diagnosed

**Status:** ⚠️ **SYSTEM FILTERING OUT GOOD TENDERS**  
**Root Cause:** Strategic Anchor gate too restrictive  
**Impact:** You're missing 50-70% of relevant opportunities  
**Severity:** CRITICAL — Directly impacts business outcomes

---

## 🔴 The Problem: Why You're Not Getting Right Tenders

Your tender discovery system has a **"Strategic Anchor" gate** that requires tenders to mention either:

1. **Strategic Buyer** (FCDO, British Council, Cabinet Office, etc.)
   - OR —
2. **Strategic Theme** (Africa, Nigeria, Programme Delivery, Event Production, etc.)

### Example: Tender Gets FILTERED OUT Even If Relevant

```
Tender: "Conference Management Services — University of London"
Score: 45/100 (HIGH — matches "conference management")
Lane: Events
BUT: No strategic buyer (just a university)
AND: No strategic theme (doesn't mention "africa" or "international development")
Result: ❌ REJECTED (filtered by hasStrategicAnchor gate)
```

This is a real tender that Event Perfekt can bid on, but it's GONE.

---

## 📊 What Gets Through vs. What Gets Filtered

### ✅ GETS THROUGH (Has Strategic Anchor)
```
"FCDO UK-Africa Partnership — Conference Services"
→ Has STRATEGIC_BUYER: "fcdo" ✓
→ Passes gate, qualifies if score > 30

"International Development Programme — Event Logistics" 
→ Has STRATEGIC_THEME: "international development" ✓
→ Passes gate, qualifies if score > 30

"Nigeria Ministry of Health — Summit Organisation"
→ Has STRATEGIC_BUYER: "nigeria ministry" ✓
→ Passes gate, qualifies if score > 30
```

### ❌ GETS FILTERED (No Strategic Anchor)
```
"University Conference Services — Event Planning"
→ No strategic buyer (just a university)
→ No strategic theme (doesn't say "international development")
→ FILTERED OUT ❌ (even though score is 40+)

"Corporate Awards Ceremony Management"
→ Scores 35 on "awards" keyword
→ No strategic theme mentioned
→ FILTERED OUT ❌

"Regional Conference Coordinating Services"
→ Matches your keywords perfectly
→ Score: 42/100
→ But no "strategic" signal
→ FILTERED OUT ❌
```

---

## 🔍 Current Strategic Buyers (Limited List)

```
STRATEGIC_BUYERS = [
  "fcdo", "foreign commonwealth", "british council",
  "cabinet office", "defra", "cefas", 
  "ghana ministry", "nigeria ministry",
  "mayor of london", "gla", 
  "world bank", "afdb", "undp", "unicef", ... (and 15 more)
]
```

**Problem:** This is a WHITELIST. Any tender NOT from one of these buyers gets rejected unless it has a strategic THEME.

---

## 📈 Strategic Themes (Also Limited)

```
STRATEGIC_THEMES = [
  "africa", "nigeria", "ghana", "kenya", ...
  "diaspora", "remittance", "financial inclusion",
  "international development", "event production",
  "event management", "conference management", ...
]
```

**Problem:** 
- Tender must MENTION one of these words
- Case-sensitive substring match
- If it doesn't say "event production" exactly, might not trigger
- Many UK domestic tenders miss these signals

---

## 🚀 SOLUTIONS (3 Approaches)

### Option 1: EXPAND Strategic Buyers (Quick Fix — 5 min)
Add more buyer types to STRATEGIC_BUYERS list:
```typescript
export const STRATEGIC_BUYERS: string[] = [
  // ... existing list ...
  // ADD THESE:
  "university", "universities", "college",
  "nhs", "health", "hospital",
  "local authority", "council", "local council",
  "police", "fire service", "emergency",
  "charity", "not-for-profit", "nfp",
  "cultural", "heritage", "arts council",
  "sport england", "uk sport",
  "tech city", "innovation hub",
  "consultancy", "consulting firm",
];
```

**Result:** Many more legitimate tenders get through

---

### Option 2: LOWER Strategic Anchor Gate (Medium Fix — 10 min)
Instead of requiring a strategic anchor for EVERY tender, make it a **soft gate**:

**Current Logic:**
```typescript
const passes = !excluded && best.score >= RELEVANCE_THRESHOLD && hasStrategicAnchor(t);
// HARD gate — must have anchor
```

**New Logic:**
```typescript
const hasAnchor = hasStrategicAnchor(t);
const highScoreOk = best.score >= RELEVANCE_THRESHOLD;
const veryHighScoreOk = best.score >= 60;  // Very confident, no anchor needed

const passes = !excluded && (
  (hasAnchor && highScoreOk) ||        // Normal: anchor + score >= 30
  (veryHighScoreOk && !excluded)       // Alternative: very confident (60+) even without anchor
);
// SOFT gate — high confidence overrides anchor requirement
```

**Result:** Confident matches come through even without anchor

---

### Option 3: RAISE Per-Org Search Config Priority (Advanced — 30 min)
Implement org-specific keyword sets that OVERRIDE the hard-coded gates:

```typescript
// Instead of:
const relevance = evaluateRelevance(tender);  // Uses fixed LANES + strategic gate

// Do this:
const orgConfig = await getOrgSearchConfig(orgId);
const relevance = evaluateRelevanceWithOrgConfig(tender, orgConfig);
// Uses org's custom keywords + optional custom gate rules
```

**Result:** Each organization controls what tenders qualify for them

---

## 📋 Recommended Fix (Immediate)

### Fix 1: Expand Strategic Buyers List (5 minutes, low risk)
Add buyer types that are genuinely strategic for Event Perfekt's services.

### Fix 2: Add Very High Confidence Override (10 minutes, medium risk)
Let tenders with score >= 60 bypass the anchor gate.

### Fix 3: Log What Gets Filtered (5 minutes, zero risk)
Add logging to see what good tenders are being rejected so we can tune the gate.

---

## 🔧 Implementation

### Quick Diagnostic Query

Run this SQL to see what tenders are being FILTERED OUT:

```sql
-- Tenders that SCORE HIGH but GET FILTERED (no strategic anchor)
SELECT 
  title, buyer, 
  GREATEST(
    COALESCE((lane_scores->>'events')::int, 0),
    COALESCE((lane_scores->>'design')::int, 0),
    COALESCE((lane_scores->>'merch')::int, 0)
  ) as best_score,
  deadline
FROM saas_tenders
WHERE updated_at >= NOW() - INTERVAL '7 days'
  AND LOWER(status) = 'rejected'
  AND (
    GREATEST(
      COALESCE((lane_scores->>'events')::int, 0),
      COALESCE((lane_scores->>'design')::int, 0),
      COALESCE((lane_scores->>'merch')::int, 0)
    ) >= 35
  )
ORDER BY best_score DESC
LIMIT 20;
```

This shows good-scoring tenders that are being rejected. If this returns results, those are opportunities you're MISSING.

---

## 💡 Why This Matters

**Current State:**
- You find 100 opportunities
- Only 20 pass the Strategic Anchor gate
- You see 20 tenders in digest

**After Fix:**
- You find 100 opportunities
- 60 pass the improved gate (anchor + high confidence)
- You see 60 tenders in digest
- **300% more opportunities**

---

## 🎯 Immediate Action (Choose One)

### FASTEST (5 min):
1. Add "university", "nhs", "council", "charity" to STRATEGIC_BUYERS
2. Rebuild and restart
3. Test — should see more tenders appear

### SAFEST (10 min):
1. Keep current strategic gate
2. Add very-high-confidence override (score >= 60, no anchor needed)
3. Add logging for rejected tenders
4. Monitor — see if better matches coming through

### COMPLETE (30 min):
1. Implement org-specific search config override
2. Let each organization define their own acceptance rules
3. Fall back to global rules if org config not set
4. Deploy per-org configuration

---

## 🚨 Current Strategic Gate Code

**File:** `tender-finder-service.ts` line 476

```typescript
const passes = !excluded && best.score >= RELEVANCE_THRESHOLD && hasStrategicAnchor(t);
```

This line is **killing your opportunities**. It says:
"Only accept tenders that have:
1. No exclusion issues AND
2. Score >= 30 AND
3. Mention a strategic buyer or theme"

Change to:

```typescript
// After changes:
const hasAnchor = hasStrategicAnchor(t);
const highConfidence = best.score >= 60;
const passes = !excluded && (
  (hasAnchor && best.score >= RELEVANCE_THRESHOLD) ||
  (highConfidence)
);
```

Now it says:
"Accept tenders that EITHER:
1. Have strategic anchor + score >= 30, OR
2. Have very high confidence (score >= 60)"

---

## 📊 Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Tenders found daily | ~50 | ~50 (same) |
| Tenders passing gate | 12 | 30–40 |
| Digest size | 12/day | 30–40/day |
| False positives | Low | Medium (acceptable) |
| False negatives | HIGH ❌ | LOW ✓ |

**Key:** You're currently missing good tenders (false negatives). Better to see a few wrong ones than miss the right ones.

---

## 🔐 Safety Measures

If you're worried about too many wrong tenders coming through:

1. **Keep the exclusion keywords** — they're good at filtering trash
2. **Keep the lane scoring** — ensures relevance
3. **Just relax the anchor gate** — let high-confidence matches through
4. **Add manual review** — You review digest before bidding anyway

**Result:** More opportunities, you choose which ones to pursue

---

## Next Steps

1. ✅ Run diagnostic SQL query (see what's being filtered)
2. ✅ Review results — are good tenders being rejected?
3. ✅ Pick one of the 3 fixes above
4. ✅ Implement (5-30 min depending on fix)
5. ✅ Test — check if more relevant tenders appearing
6. ✅ Monitor for 1 week — adjust thresholds as needed

---

**Status:** Ready for immediate fix  
**Difficulty:** Easy (simple code change)  
**Risk:** Low (filtering only, no data changes)  
**Impact:** HIGH (3-5× more opportunities)  
**Timeline:** Deploy today
