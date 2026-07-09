# Event Growth Intelligence Platform — Phase 6 End-to-End Guide

## What It Is

A complete SaaS platform that helps event organisers grow, commercialise, and scale their events. From a plain-language goal to a full commercial strategy, targeted discovery, outreach, and conversion pipeline — all with human-in-the-loop controls at every step.

**The platform has 16 components (15 pages + 1 chatbot):**
1. Insights — Market Intelligence
2. Dashboard — Overview & next steps
3. Events — Create and manage events
4. Wizard — AI strategy generation
5. Personas — Audience/sponsor/media personas
6. Discovery — Find prospects via Apollo.io
7. Screen — Review, score, and classify
8. Outreach — Generate and queue messages
9. Messaging Studio — 9 template types
10. AI Workspace — Interactive message refinement
11. Pipeline — Track prospects through stages
12. Intelligence — Analytics, spend, targets
13. Presentation Studio — Generate decks/brochures
14. Learning Engine — Auto-learn from campaigns
15. Site Builder — Generate static HTML site
16. Elizabeth — AI growth coach

---

## The Full Pipeline (15 Steps)

```
Insights → Dashboard → Events → Wizard → Personas → Discovery → Screen →
Messaging → Presentations → AI Workspace → Outreach → Pipeline →
Intelligence → Learning → Site Builder
```

---

## Phase 6: What Was Built (7 Epics)

### Epic 1: Market Intelligence (Insights)
**What it does:** Before you build a strategy, research the market. The AI analyses competitor events, pricing benchmarks, sponsor activity, audience trends, and demand scores.

**Example:**
- User says: "I want to run a women’s leadership event in Milton Keynes"
- AI returns: 3 competitor events, their ticket prices, estimated attendance, sponsor logos, and a demand score (1-10)
- User decides pricing tier based on market gap

**Files:** `insights.tsx`, `growth_market_insights` table

---

### Epic 2: Personas & Discovery
**What it does:** After the strategy wizard, the platform generates audience personas, sponsor personas, and media personas. Each persona has exclusion rules (e.g., "exclude junior developers"). The Discovery page then uses these personas to search Apollo.io for real prospects.

**Example workflow:**
1. Wizard generates audience persona: "Women Leaders, CEO/Founder, UK, Tech/Finance"
2. Personas page shows the persona with exclusion rules
3. Discovery page uses persona to build Apollo search:
   - `person_titles: ["CEO", "Founder", "Director"]`
   - `person_locations: ["Milton Keynes", "London", "Birmingham"]`
4. Apollo returns 25 real prospects
5. Stored in `growth_prospects` with source `apollo`

**Files:** `personas.tsx`, `discovery.tsx`, `apollo-source.ts`

---

### Epic 3: Messaging Studio
**What it does:** Generate 9 different message types for outreach, each with a specific tone and purpose.

**Message types:**
1. LinkedIn Connection
2. LinkedIn First Message
3. LinkedIn Follow-up
4. Email Intro
5. Email Follow-up
6. Sponsor Outreach
7. VIP Invitation
8. Speaker Invitation
9. Media/Press Outreach

**Example:**
- User selects "Sponsor Outreach"
- AI generates: "Hi [Name], I’m organising I Am Her — a women’s leadership event in Milton Keynes. Your brand’s focus on [Industry] aligns perfectly with our audience of 200+ senior leaders. We have a sponsorship tier at £5,000 that includes a keynote slot, branding, and 10 complimentary tickets. Would you be open to a 15-minute call?"

**Files:** `messaging-studio.tsx`

---

### Epic 4: Presentation Studio
**What it does:** Generate 5 presentation types for sponsors, speakers, and partners.

**Presentation types:**
1. Sponsor Deck — ROI, audience stats, tier benefits
2. Event Brochure — Overview, agenda, testimonials
3. Speaker Pack — Topic ideas, audience profile, logistics
4. Partnership Proposal — Mutual benefits, co-marketing
5. VIP Invitation — Exclusive access, networking, premium perks

**Example:**
- User selects "Sponsor Deck"
- AI generates: 5 slides with key statistics, audience demographics, sponsor tier table, contact CTA
- User can copy text or download HTML

**Files:** `presentation-studio.tsx`, `growth_presentations` table

---

### Epic 5: Relationship Intelligence (Screen)
**What it does:** Enhanced prospect review with AI-generated fit scores, engagement signals, and recommended approach.

**Example:**
- User clicks "Intel" on a prospect card
- AI returns:
  - Fit Score: 87/100
  - Signals: "Recently hired as VP of Marketing at a scaling fintech"
  - Engagement: "Active on LinkedIn (3 posts/week), speaks at conferences"
  - Approach: "Lead with sponsorship opportunity, mention speaking slot"
  - Priority: HIGH

**Files:** `screen.tsx` (enhanced)

---

### Epic 6: Elizabeth Growth Coach
**What it does:** Floating AI chatbot that knows all event data, pipeline status, and proactively alerts the user to issues.

**Alerts:**
- Low ticket sales (below 50% target)
- No outreach sent in 7 days
- No replies received in 14 days
- Pipeline stalled (no movement in 30 days)

**Recommendations:**
- HIGH: "Run Discovery for 50 more prospects — your pipeline is thin"
- MEDIUM: "Send follow-up to 12 prospects who opened but didn’t reply"
- LOW: "Update your strategy pack with pricing feedback"

**Files:** `Elizabeth.tsx`, `/elizabeth-coach` API

---

### Epic 7: Learning Engine
**What it does:** Analyses every campaign (outreach, replies, pipeline movement, scores) to generate 3-5 actionable insights.

**Example insights:**
- "LinkedIn messages to Tech sector have 3.2x higher reply rate than Email"
- "Sponsor personas with £5,000+ budget convert 40% faster"
- "Follow-up sent within 48 hours gets 60% more replies"
- "Events with ‘Meet the Room’ feature have 25% higher attendance"

**Files:** `learning-engine.tsx`, `growth_learning_insights` table

---

## Bonus: AI Outreach Workspace
**What it does:** Interactive message refinement with 10 message types, AI rewrites, 7-dimension quality scoring, and version history.

**Features:**
- **Quick Instructions:** "Make it shorter", "More formal", "Add urgency", "Mention discount"
- **AI Rewrite:** Sends the message + instruction to GPT-4o, returns improved version
- **Quality Scoring:** Personalisation (85), Clarity (90), Tone (78), Length (92), Relevance (88), CTA (82), Overall (86)
- **Improvement Tips:** "Add a specific reference to their recent LinkedIn post for higher personalisation"
- **Version History:** Last 5 rewrites stored; undo button restores previous version
- **Attachment Recommendations:** "Attach sponsor deck PDF for this sponsor prospect"

**Files:** `outreach-workspace.tsx`, `/outreach/refine`, `/outreach/score`, `/outreach/recommend-attachments` APIs

---

## Architecture

### Stack
- **Monorepo:** pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui + TanStack Query + Wouter
- **Backend:** Express 5 + Drizzle ORM
- **Database:** PostgreSQL (14 tables)
- **AI Engine:** OpenRouter (Claude 3.5 Sonnet / GPT-4o)
- **Data Source:** Apollo.io API (prospect discovery)
- **Validation:** Zod v4 + drizzle-zod
- **API Codegen:** Orval from OpenAPI spec → React Query hooks + Zod schemas

### Database Schema (14 tables)
- `growth_events` — events, strategy packs, pricing
- `growth_prospects` — Apollo-discovered prospects
- `growth_campaigns` — outreach campaigns
- `growth_spend_logs` — every AI call and API cost tracked
- `growth_prospect_scores` — AI fit scores
- `growth_outreach` — generated messages
- `growth_suppressions` — opt-outs and bounced emails
- `growth_replies` — classified replies
- `growth_pipeline_entries` — pipeline stages
- `growth_inbound_leads` — external lead submissions
- `growth_event_targets` — event KPIs
- `growth_market_insights` — Phase 6: market research
- `growth_presentations` — Phase 6: generated presentations
- `growth_learning_insights` — Phase 6: campaign insights

### Design
- **Palette:** Burgundy (#330311), Gold (#C9A961), Ivory (#F4ECD8)
- **No "AI" labels** — use "Compute" or "Intelligence"
- **Hero images:** 8 unique abstract illustrations per page
- **Empty states:** Custom illustrations for "no data" screens
- **Pipeline:** 15-step connected progress bar with contextual CTAs

---

## Real-World Example: I Am Her August 2025

**Event:** Women’s leadership event, Milton Keynes

**Step 1 — Dashboard:**
User sees "I Am Her August 2025" with status "Draft" and CTA "Run Strategy Wizard"

**Step 2 — Wizard:**
- AI asks: "What’s your main goal?", "Who’s your ideal attendee?", "What’s your budget?"
- Market Scan: AI finds 3 competitor events in Milton Keynes
- Strategy Pack generated: personas, pricing (£100), tagline ("Empowering Women, Leading Change"), content themes

**Step 3 — Personas:**
- Audience: "Women Leaders and Entrepreneurs" (CEO, Founder, Director, UK)
- Sponsor: HR Consultancy, SaaS Vendor, Local Banks
- Media: "Women’s Business Press" (Forbes Women, The Everywoman)

**Step 4 — Discovery:**
- User clicks "Find Audience Prospects"
- Apollo searches: `person_titles: ["CEO", "Founder", "Director"]` + `person_locations: ["Milton Keynes", "London", "Birmingham"]`
- Returns: 25 prospects, 3 stored (22 duplicates skipped)
- User clicks "Find Sponsor Prospects"
- Returns: 25 prospects, 2 stored

**Step 5 — Screen:**
- User reviews each prospect card
- AI-generated Intel: "Fit Score 87, active LinkedIn, recommend sponsorship approach"
- User approves 5 prospects for outreach

**Step 6 — Messaging Studio:**
- User selects "Sponsor Outreach"
- AI generates 3 message variants
- User selects variant B, copies to clipboard

**Step 7 — AI Workspace:**
- User pastes the message into the workspace
- Clicks "Score": Overall 86, tips: "Add specific company reference"
- User types instruction: "Mention their recent partnership with [Company]"
- AI rewrites, score jumps to 92
- User clicks "Send" → message approved and queued

**Step 8 — Pipeline:**
- Prospects move through stages: Identified → Contacted → Interested → Applied → Paid → Attending
- User drags cards between columns
- AI auto-classifies replies and moves prospects

**Step 9 — Intelligence:**
- Real-time dashboard: 50 targets, 12 pipeline, 3 inbound, £15.20 spend
- Spend breakdown: Apollo £0, OpenRouter £15.20, Apollo Enrichment £0

**Step 10 — Learning:**
- AI insight: "LinkedIn outreach to Tech sector has 3.2x higher reply rate"
- User applies insight: increases Tech prospect allocation in next Discovery

**Step 11 — Site Builder:**
- User clicks "Generate Site"
- AI creates HTML: hero, about, speakers, agenda, sponsors, tickets, contact
- User downloads ZIP, uploads to hosting

---

## Key Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| **OpenRouter** | AI strategy, messages, scoring, insights | Active (GPT-4o/Claude) |
| **Apollo.io** | Prospect discovery and enrichment | Active (API key valid) |
| **PostgreSQL** | All data storage | Active (14 tables) |
| **Email (SMTP)** | Outreach delivery | Active (Namecheap) |
| **Flutterwave** | Payment processing | Configured |

---

## Human-in-the-Loop Gates

The platform never sends outreach without human approval:

1. **Strategy** — AI generates, human approves
2. **Prospects** — AI discovers, human screens
3. **Messages** — AI drafts, human edits/approves
4. **Sends** — AI queues, human clicks "Send"
5. **Pipeline** — AI classifies, human moves cards
6. **Insights** — AI suggests, human decides

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/growth/market-research` | POST | Market intelligence |
| `/growth/events/:id/prospects/search` | POST | Apollo discovery |
| `/growth/events/:id/prospects` | GET | List prospects |
| `/growth/outreach/generate` | POST | Generate message |
| `/growth/outreach/templates` | POST | Individual templates |
| `/growth/outreach/refine` | POST | AI message rewrite |
| `/growth/outreach/score` | POST | Quality scoring |
| `/growth/outreach/recommend-attachments` | POST | Attachment suggestions |
| `/growth/presentations` | POST/GET | Generate presentations |
| `/growth/learning/:eventId` | POST/GET | Campaign insights |
| `/growth/prospects/:id/relationship-intelligence` | POST | Intel per prospect |
| `/elizabeth-coach` | GET | Proactive alerts |

---

## Next Steps (What You Can Do Now)

1. **Go to the Dashboard** → select your event
2. **Run the Wizard** → generate a strategy pack
3. **Go to Discovery** → click "Find Prospects" → watch Apollo return real people
4. **Go to Screen** → review prospects, click "Intel" for AI insights
5. **Go to Messaging Studio** → generate a sponsor message
6. **Go to AI Workspace** → refine the message, score it, send it
7. **Go to Pipeline** → track prospects as they move through stages
8. **Go to Intelligence** → see real-time analytics and spend

---

## Files Changed in Phase 6

### New Files
- `insights.tsx` — Market Intelligence (Epic 1)
- `personas.tsx` — Personas & Discovery (Epic 2)
- `messaging-studio.tsx` — 9 message templates (Epic 3)
- `presentation-studio.tsx` — 5 presentation types (Epic 4)
- `learning-engine.tsx` — Campaign insights (Epic 7)
- `outreach-workspace.tsx` — Interactive message refinement (Bonus)
- `apollo-source.ts` — Apollo API client
- `growth_market_insights` — DB table
- `growth_presentations` — DB table
- `growth_learning_insights` — DB table

### Modified Files
- `growth-platform-routes.ts` — 2,881 lines, all new endpoints
- `App.tsx` — 15 routes + Elizabeth
- `Layout.tsx` — Sidebar navigation
- `PipelineStep.tsx` — 15-step pipeline
- `screen.tsx` — Intel button, fit scores
- `Elizabeth.tsx` — Growth Coach tab
- `discovery.tsx` — Connected to Apollo
- `outreach.tsx` — "Refine" button links to AI Workspace
- `growth.ts` — DB schema with 14 tables

---

**Built:** June 2026  
**Version:** Phase 6 (7 Epics + AI Workspace)  
**Status:** All 16 components functional, typecheck clean, workflows running
