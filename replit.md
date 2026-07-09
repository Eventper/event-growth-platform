# Event Growth Intelligence Platform

An end-to-end SaaS platform that helps event organisers grow, commercialise, and scale their events. From a plain-language goal to a full commercial strategy, targeted discovery, outreach, and conversion pipeline — all with human-in-the-loop controls at every step.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/growth-platform run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `OPENROUTER_API_KEY` (or `Open_router_AI`), `APOLLO_API_KEY` (optional, for discovery)

## Stack

- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + TanStack Query (React Query) + Wouter (routing)
- **Backend**: Express 5 + Drizzle ORM
- **Database**: PostgreSQL (11 tables for growth platform)
- **Validation**: Zod v4 + drizzle-zod
- **AI Engine**: OpenRouter (Claude 3.5 Sonnet / GPT-4o) — strategy, outreach, replies
- **Data Source**: Apollo.io API — prospect discovery and enrichment
- **API Codegen**: Orval from OpenAPI spec → React Query hooks + Zod schemas
- **Build**: esbuild (CJS bundle for API)

## Where things live

### Source of truth
- **DB Schema**: `lib/db/src/schema/growth.ts` — all 11 tables (events, prospects, campaigns, scores, outreach, suppressions, replies, spend logs, pipeline entries, inbound leads, event targets)
- **API Routes**: `artifacts/api-server/src/growth-platform-routes.ts` — all growth endpoints
- **Frontend Pages**: `artifacts/growth-platform/src/pages/` — one page per major feature
- **Theme/Design**: `artifacts/growth-platform/src/index.css` — burgundy/gold/ivory palette

### Key files
- `artifacts/growth-platform/src/App.tsx` — routes (15 pages + Elizabeth)
- `artifacts/growth-platform/src/components/Layout.tsx` — sidebar + phase navigation
- `artifacts/growth-platform/src/components/Elizabeth.tsx` — floating AI chatbot
- `artifacts/growth-platform/src/components/PipelineStep.tsx` — 15-step connected pipeline
- `artifacts/api-server/src/growth-platform-routes.ts` — 2,881 lines of Express routes

## Architecture decisions

1. **Human-in-the-loop at every gate** — No outreach sends without human approval. The AI generates strategy, messages, and classifications, but a human clicks every "Send" button.
2. **Positioning Tier System** — Strategy is anchored to a tier (Mass-market, Mid-market, Premium) which drives everything: ticket pricing, tone of voice, channel choice, and outreach style.
3. **Spend Transparency** — Every AI call and every data enrichment is logged to `growth_spend_logs` with vendor, model, token count, and cost. The platform is built to be commercially viable.
4. **OpenAPI-first contracts** — The API contract is defined in OpenAPI spec first. `api-spec` generates React Query hooks and Zod schemas automatically. Both frontend and backend use the same Zod validators.
5. **Multi-tenancy foundation** — `ownerId` field on every event table. No auth enforcement yet, but the schema supports it when ready.
6. **Client-side routing** — Wouter (not React Router) for lightweight path-based routing with Replit's base path handling.
7. **Pnpm workspace libs** — `db` for schema, `api-spec` for OpenAPI, `api-zod` for validators, `api-client-react` for generated hooks. No cross-artifact imports.

## What was built (Phase 0 → Phase 5)

### Phase 0: Foundation
- PostgreSQL schema with 11 tables for the full growth workflow
- Express CRUD for events, prospects, campaigns
- OpenRouter integration (Claude 3.5 Sonnet via proxy)
- Apollo.io integration for prospect search
- Basic frontend pages (React + Vite)
- Spend logging system

### Phase 1: Strategy Wizard
- **4-step interview**: Enter Goal → AI Interview → Market Scan → Generate Strategy
- The AI asks contextual questions about the event, audience, and goals
- Generates a **Strategy Pack** (JSON): personas, taglines, messaging, channels, target audience, sponsorship, tier
- Human approves the pack before it goes to the pipeline

### Phase 2: Discovery & Scoring
- **Apollo.io integration**: Search for prospects by role, company, industry, location
- **AI Scoring**: Each prospect gets a 0-100 fit score with reasoning
- **Screen tab**: Human reviews prospects, approves or rejects them
- Enrichment cost tracking (Apollo credits are logged)

### Phase 3: Outreach
- **4-touch sequence**: Auto-generates 4 messages (email + LinkedIn) per prospect
- **Hard Gate**: Nothing sends without human approval
- **Queue system**: Pending → Approved → Sent → Replied
- **Reply tracking**: AI classifies replies (positive, not_now, unsubscribe, out_of_office, auto_reply)

### Phase 4: Pipeline & Intelligence
- **Pipeline**: Kanban-style columns for Audience & Sponsor tracks
- **Stages**: identified → contacted → interested → applied → paid → attending
- **Intelligence**: Real-time dashboard showing targets, pipeline, inbound, and spend
- **Inbound API**: Webhook for external sites to submit leads directly
- **Bot detection**: Auto-flags bot submissions

### Phase 5: Productisation
- **Design System**: Burgundy (#330311), gold (#C9A961), ivory (#F4ECD8) — luxury editorial aesthetic
- **Hero Banners**: 8 unique abstract illustrations for each page (growth chart, lightbulb, magnifying glass, checklist, envelope, funnel, analytics, network)
- **Empty States**: Custom illustrations for "no events", "no prospects", "no data", "select event" screens
- **Elizabeth**: Floating AI chatbot — knows all event data, gives next-step guidance
- **Site Builder**: Generates a complete HTML static site from the strategy pack
- **Multi-tenancy**: `ownerId` on every event
- **Responsive**: Mobile sidebar with hamburger menu

### Phase 6: Intelligence & Growth
- **Market Insights**: Research competitors, pricing, audience trends, sponsor activity before building strategy
- **Personas**: AI-generated audience/sponsor/media personas with exclusion rules from strategy pack
- **Messaging Studio**: Generate 9 message types (LinkedIn, email, sponsor, VIP, speaker, media, partnership) with templates
- **Relationship Intelligence**: AI-generated fit scores, signals, engagement insights, recommended approach per prospect
- **Presentation Studio**: Generate 5 presentation types (sponsor deck, brochure, speaker pack, partnership proposal, VIP invitation)
- **AI Outreach Workspace**: Interactive message refinement — 10 message types, AI rewrites via instructions, 7-dimension quality scoring, attachment recommendations, version history with undo
- **Learning Engine**: Auto-learns from campaign data (outreach, replies, pipeline) and generates actionable insights
- **Elizabeth Growth Coach**: Proactive alerts, recommendations, and next-step guidance

## Product

**The platform has 15 pages + 1 chatbot:**

1. **Insights** — Market intelligence: competitors, pricing, trends, sponsors
2. **Dashboard** — Overview of events, stats, recent activity, and next steps
3. **Events** — Create, edit, and manage events
4. **Wizard** — AI-driven strategy generation (interview → market scan → strategy pack)
5. **Personas** — Audience/sponsor/media personas with exclusion rules
6. **Discovery** — Search and find target prospects via Apollo.io
7. **Screen** — Human review, scoring, and relationship intelligence
8. **Outreach** — Generate, approve, and send outreach messages
9. **Messaging Studio** — Generate 9 message types with templates
10. **AI Workspace** — Interactive message refinement with AI scoring
11. **Pipeline** — Track prospects through conversion stages
12. **Intelligence** — Real-time analytics, spend tracking, and target progress
13. **Presentation Studio** — Generate sponsor decks, brochures, speaker packs
14. **Learning Engine** — Auto-learn from every campaign and apply to future events
15. **Site Builder** — Generate a static HTML site from the strategy pack
16. **Elizabeth** — AI assistant that knows your events and pipeline

**The full workflow (15 steps):**
```
Insights → Dashboard → Events → Wizard (Strategy) → Personas → Discovery (Prospects)
→ Screen (Review) → Outreach (Queue) → Messaging Studio → AI Workspace (Refine)
→ Pipeline (Track) → Intelligence (Analyse) → Presentations → Learning → Site Builder
```

## User preferences

- Keep the I Am Her brand palette (burgundy/gold/ivory) for the growth platform
- No "AI" labels — use "Compute" or "Intelligence" instead
- Hero images should be abstract/business-neutral, not gender-specific
- Human approval is the hard gate — no outreach sends without a human click

## Gotchas

- **Always typecheck**: `pnpm run typecheck` before committing. The frontend uses `tsc --noEmit`, backend uses `tsc --noEmit`.
- **API server must be restarted**: `restart_workflow artifacts/api-server: API Server` after backend changes.
- **Frontend must be restarted**: `restart_workflow artifacts/growth-platform: web` after adding new assets.
- **Base path**: All routes use `import.meta.env.BASE_URL` for image paths. The app lives at `/growth-platform/`.
- **OpenRouter key**: Set via `OPENROUTER_API_KEY` or `Open_router_AI` env var.
- **Apollo key**: Set via `APOLLO_API_KEY` env var for discovery features.
- **Don't run `pnpm dev` at root**: Each artifact has its own workflow. Use `restart_workflow`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `integrations` skill for setting up OpenRouter / Apollo connections
- See the `deployment` skill for publishing to Replit
