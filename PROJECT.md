# Event Growth Intelligence Platform — Project Documentation

> Generated: 2026-07-03 | Source lines: ~277,000 | Artifacts: 4 | Lib packages: 4

---

## Executive Summary

This is a full-stack SaaS platform built in a pnpm monorepo. It serves two primary products:

1. **Event Perfekt** (`eventperfekt.net`) — A UK-Nigeria event management company website with 200+ pages including I Am Her (women's leadership), 360 photo booth hire, client portal, tender dashboard, and marketing automation.
2. **Growth Platform** (`eventperfekt.net/growth-platform`) — An AI-powered CRM, outreach, pipeline, and intelligence system for event organisers to grow their events through discovery, scoring, outreach, and conversion tracking.

---

## Architecture

### Monorepo Structure

```
/
├── artifacts/
│   ├── api-server/          # Express 5 API backend (8080)
│   ├── event-perfekt/       # React + Vite frontend (20125)
│   ├── growth-platform/       # React + Vite frontend (25495)
│   └── mockup-sandbox/      # Component preview server (8081)
├── lib/
│   ├── db/                  # Drizzle ORM schema + migrations
│   ├── api-spec/            # OpenAPI spec + Orval codegen
│   ├── api-zod/             # Shared Zod validators
│   └── api-client-react/    # Generated React Query hooks
├── scripts/                 # Utility scripts
├── pnpm-workspace.yaml      # Workspace config
└── package.json             # Root orchestration
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces, TypeScript 5.9, Node.js 24 |
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Express 5, Drizzle ORM, PostgreSQL |
| Auth | JWT (bcrypt), role-based (admin/planner/client/staff) |
| AI | OpenRouter proxy (Claude 3.5 Sonnet / GPT-4o) |
| Data | Apollo.io API (prospect discovery) |
| Validation | Zod v4, drizzle-zod |
| API Contracts | OpenAPI-first, Orval codegen |
| Payments | Flutterwave (NG), Stripe (planned) |
| Email | Namecheap SMTP, Gmail fallback |
| Deployment | Replit-managed (eventperfekt.net) |

### Proxy Routing

```
/                    → Event Perfekt frontend (static)
/api/*               → API Server (Express, port 8080)
/growth-platform/*   → Growth Platform frontend
/__mockup/*          → Mockup sandbox (component previews)
```

---

## Database Schema

### Growth Platform Tables (11 tables)

| Table | Purpose |
|-------|---------|
| `growth_events` | Events with strategy pack, outreach config, ownerId |
| `growth_prospects` | Discovered prospects with AI fit scores, verification gates |
| `growth_campaigns` | Campaign definitions with audience/sponsor/media targeting |
| `growth_scores` | AI-generated prospect scores with reasoning |
| `growth_outreach` | 4-touch email/LinkedIn sequences (pending→approved→sent→replied) |
| `growth_replies` | Reply classifications (positive/not_now/unsubscribe/ooo/auto) |
| `growth_suppressions` | Do Not Contact list (global + per-event) |
| `growth_spend_logs` | Every AI call: vendor, model, tokens, cost |
| `growth_pipeline` | Kanban stages: identified→contacted→interested→applied→paid→attending |
| `growth_inbound_leads` | Webhook submissions with bot detection |
| `growth_personas` | AI-generated audience/sponsor/media personas with exclusion rules |

### Event Perfekt Tables (50+ tables)

| Table | Purpose |
|-------|---------|
| `users` | Authentication (19 users, bcrypt hashed) |
| `events` | Event records with config |
| `clients` | Client portal users |
| `guests` | Guest lists with RSVP tracking |
| `vendors` | Vendor directory with ratings |
| `bookings` | 360 photo booth bookings |
| `invoices` | Invoice records with payment tracking |
| `tenders` | UK government tender monitoring |
| `event_august_stories` | I Am Her community stories |
| `alli_partnerships` | I Am Her partnership records |
| `visitor_tracking` | Page view analytics |
| `email_campaigns` | Marketing email campaigns |
| `enquiries` | Contact form submissions |
| Plus: decor, venues, floor plans, timelines, checklists, polls, etc. |

### Multi-tenancy

Every growth table has `ownerId` (foreign key to `users.id`). Auth middleware extracts ownerId from JWT. No auth enforcement on Event Perfekt public pages.

---

## API Server (artifacts/api-server)

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/index.ts` | Express app setup, middleware, route registration | 427 |
| `src/growth-platform-routes.ts` | All growth endpoints (CRUD + AI) | 2,881 |
| `src/db.ts` | PostgreSQL connection (DATABASE_URL → neon) | 32 |
| `src/auth.ts` | JWT generation/verification, bcrypt | 107 |
| `src/seo-meta-injector.ts` | Server-side SEO injection for prerender | 1,430 |
| `src/engines.ts` | OpenRouter AI wrapper with retry/cost tracking | ~200 |
| `src/growth-send-gate.ts` | Hard gate: no outreach sends without human approval | 152 |
| `src/growth-outreach-config.ts` | Outreach module configuration | ~100 |
| `src/campaign-scheduler.ts` | Cron: discovery 7am, send 9am, summary 6pm | ~150 |

### Route Groups

```
POST /api/growth/auth/login          → JWT auth for growth platform
GET  /api/growth/events              → List events (auth required)
POST /api/growth/events/:id/strategy → Generate strategy pack (AI)
POST /api/growth/prospects/discover  → Apollo.io search + AI scoring
POST /api/growth/outreach/generate → Generate 4-touch sequences (AI)
POST /api/growth/outreach/approve  → Human approval gate
POST /api/growth/outreach/send     → Execute send (gate-checked)
GET  /api/growth/pipeline            → Kanban pipeline data
GET  /api/growth/intelligence        → Real-time analytics
POST /api/growth/inbound             → Webhook for external lead capture

POST /api/auth/login                 → Event Perfekt auth
GET  /api/events                     → Event management CRUD
POST /api/bookings                   → 360 booth bookings
GET  /api/tenders                    → UK tender search
POST /api/email/send                 → Email campaigns
GET  /api/iamher/stories             → I Am Her community
POST /api/client/portal              → Client portal
GET  /api/healthz                    → Health check
```

### AI Integration

| Endpoint | AI Model | Purpose |
|----------|----------|---------|
| Strategy generation | Claude 3.5 Sonnet | Interview → market scan → strategy pack |
| Prospect scoring | GPT-4o | 0-100 fit score with reasoning |
| Message generation | Claude 3.5 Sonnet | 9 message types, 4-touch sequences |
| Reply classification | GPT-4o | Classify replies (positive/not_now/etc) |
| Persona generation | Claude 3.5 Sonnet | Audience/sponsor/media personas |
| Presentation generation | Claude 3.5 Sonnet | Sponsor decks, brochures, speaker packs |
| Learning engine | Claude 3.5 Sonnet | Campaign insight extraction |
| Elizabeth chat | Claude 3.5 Sonnet | Context-aware AI assistant |

All AI calls are logged to `growth_spend_logs` with vendor, model, tokens, and cost.

---

## Frontend: Event Perfekt (artifacts/event-perfekt)

### Pages (200+ pages)

#### Public Marketing
| Page | Route | Purpose |
|------|-------|---------|
| Home | `/` | Main landing with hero, services, credentials |
| Projects & Programmes | `/projects-and-programmes` | Portfolio showcase |
| UK Government Agency | `/projects/public-sector` | Government programme case |
| Case Study | `/case-studies/public-sector` | Detailed case study |
| About | `/about` | Company story |
| Contact | `/contact` | Contact form |
| Booking Enquiry | `/booking-enquiry` | Event booking form |
| Consultation Request | `/consultation-request` | Free consultation |
| Grant Application | `/grant-application` | Grant application form |

#### I Am Her (Women's Leadership)
| Page | Route |
|------|-------|
| I Am Her Home | `/iamher` |
| Meet the Room | `/meet-the-room` |
| Stories | `/iamher/stories` |
| Community | `/iamher/community` |
| Partnership | `/iamher/partnership` |
| Stay | `/iamher/stay` |
| Feature Your Business | `/iamher/feature` |
| Card | `/iamher/card` |
| Analytics | `/iamher/analytics` |
| Nominate | `/iamher/nominate` |
| Submit Story | `/iamher/submit-story` |
| Media | `/iamher/media` |
| Business Profile | `/iamher/business/:id` |

#### 360 Photo Booth
| Page | Route |
|------|-------|
| Booth Home | `/booth` |
| 360 Booth Milton Keynes | `/360-booth-hire-milton-keynes` |
| Photo Booth Nigeria | `/photo-booth-nigeria` |
| Admin Bookings | `/admin-booth-bookings` |
| Admin Calendar | `/admin-booth-calendar` |

#### Client Portal
| Page | Route |
|------|-------|
| Client Login | `/client-login` |
| Client Dashboard | `/client-dashboard` |
| Client Onboarding | `/client-onboarding` |
| Contract Signing | `/client-contract-signing` |

#### Event Planning Tools
| Page | Route | Purpose |
|------|-------|---------|
| Event Dashboard | `/event-dashboard` | Main event management |
| Venue Designer | `/venue-designer` | Floor plan builder |
| Decor Studio | `/decor-studio` | AI decor generation |
| Guest Management | `/guest-management` | RSVP + seating |
| Budget Management | `/budget-management` | Budget tracking |
| Timeline | `/event-timeline` | Event timeline |
| Checklist | `/event-checklist` | Task checklist |
| Vendor Management | `/vendor-management` | Vendor directory |
| Live Polling | `/live-polling` | Real-time polls |
| Floor Plan | `/floor-plan-builder` | 3D floor plans |
| Graphics | `/graphics-branding` | Event branding |
| Print Materials | `/print-materials` | Printable assets |

#### Tender Dashboard (Internal)
| Page | Route |
|------|-------|
| SaaS Tender Dashboard | `/tender-saas` |
| Tender Dashboard | `/tender-dashboard` |

#### Admin
| Page | Route |
|------|-------|
| Admin Panel | `/admin-panel` |
| Visitor Analytics | `/admin-visitor-analytics` |
| Marketing Agent | `/admin-marketing-agent` |
| I Am Her Businesses | `/admin-iamher-businesses` |

---

## Frontend: Growth Platform (artifacts/growth-platform)

### Pages (25 pages)

| Page | Route | Purpose |
|------|-------|---------|
| Insights | `/insights` | Market intelligence: competitors, pricing, trends |
| Dashboard | `/dashboard` | Overview: events, stats, activity, next steps |
| Events | `/events` | Create, edit, manage events |
| Wizard | `/wizard` | 4-step AI strategy generation |
| Personas | `/personas` | AI-generated audience/sponsor/media personas |
| Discovery | `/discovery` | Apollo.io prospect search |
| Screen | `/screen` | Human review, scoring, relationship intelligence |
| Outreach | `/outreach` | Generate, approve, send outreach messages |
| Messaging Studio | `/messaging-studio` | Generate 9 message types |
| AI Workspace | `/outreach-workspace` | Interactive message refinement |
| Pipeline | `/pipeline` | Kanban conversion tracking |
| Intelligence | `/intelligence` | Real-time analytics, spend tracking |
| Presentation Studio | `/presentation-studio` | Generate sponsor decks |
| Learning Engine | `/learning-engine` | Auto-learn from campaigns |
| Site Builder | `/site-builder` | Generate static HTML from strategy |
| Commercial | `/commercial` | Commercial partner pipeline |
| Sponsors | `/sponsors` | Sponsor management |
| PR Pipeline | `/pr-pipeline` | Media/PR outreach |
| Referrals | `/referrals` | Referral tracking |
| Corporate Targets | `/corporate-targets` | Corporate prospect targeting |
| AI Communications | `/ai-communications` | AI communications hub |
| Campaign Workspace | `/campaign-workspace` | Campaign management |
| Outreach Control | `/outreach-control` | Outreach approval control |
| Outreach Dashboard | `/outreach-dashboard` | Outreach analytics |
| Scheduler | `/scheduler` | Campaign scheduling |
| Settings | `/settings` | User settings |

### Components

| Component | Purpose |
|-----------|---------|
| `Layout.tsx` | Sidebar + phase navigation |
| `Elizabeth.tsx` | Floating AI chatbot (context-aware) |
| `PipelineStep.tsx` | 15-step connected pipeline visual |
| `EventSelector.tsx` | Event context selector |
| `SpendChart.tsx` | Real-time spend visualization |

---

## Key Integrations

### Replit Integrations
| Integration | Status | Purpose |
|-------------|--------|---------|
| `javascript_database` | Connected | PostgreSQL (Helium workspace, Neon production) |
| `javascript_openai` | Connected | OpenRouter AI proxy |
| `javascript_stripe` | Needs setup | Payment processing |
| `javascript_object_storage` | Needs setup | File uploads |
| `javascript_log_in_with_replit` | Needs setup | Auth option |
| `javascript_websocket` | Needs setup | Real-time features |

### External APIs
| Service | Key | Purpose |
|---------|-----|---------|
| OpenRouter | `OPENROUTER_API_KEY` | AI engine (Claude/GPT) |
| Apollo.io | `APOLLO_API_KEY` | Prospect discovery |
| Flutterwave | `FLW_PUBLIC_KEY` / `FLW_SECRET_KEY` | NG payments |
| Namecheap SMTP | `NAMECHEAP_EMAIL` / `NAMECHEAP_PASSWORD` | Email sending |
| Gmail SMTP | `GMAIL_APP_PASSWORD` | Email fallback |

---

## Environment Variables

### Required
```
DATABASE_URL          → PostgreSQL connection string
PORT                  → Service port (8080 for API, 20125 for event-perfekt, etc.)
BASE_PATH             → / for event-perfekt, /growth-platform for growth
OPENROUTER_API_KEY    → AI engine access
```

### Optional
```
APOLLO_API_KEY        → Prospect discovery
FLW_PUBLIC_KEY        → Flutterwave payments
FLW_SECRET_KEY        → Flutterwave secret
NAMECHEAP_EMAIL       → SMTP auth
NAMECHEAP_PASSWORD    → SMTP password
GMAIL_APP_PASSWORD    → Gmail SMTP fallback
JWT_SECRET            → Token signing (production fallback exists)
```

---

## Build & Deploy

### Development
```bash
pnpm --filter @workspace/api-server run dev      # API server
pnpm --filter @workspace/event-perfekt run dev    # Event Perfekt
pnpm --filter @workspace/growth-platform run dev  # Growth Platform
pnpm --filter @workspace/mockup-sandbox run dev   # Mockup sandbox
```

### Production Build
```bash
pnpm --filter @workspace/api-server run build       # Express → dist/index.mjs
pnpm --filter @workspace/event-perfekt run build    # Vite → dist/public/
pnpm --filter @workspace/growth-platform run build # Vite → dist/public/
```

### Typecheck
```bash
pnpm run typecheck      # Full monorepo typecheck
pnpm run typecheck:libs # Lib packages only (composite build)
```

### API Codegen
```bash
pnpm --filter @workspace/api-spec run codegen     # Orval → hooks + Zod
```

### Database
```bash
pnpm --filter @workspace/db run push               # Push schema (dev only)
```

---

## Design System

### Event Perfekt Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Burgundy | `#330311` | Primary brand, headers, loading screen |
| Gold | `#C9A961` | Accents, CTAs, highlights |
| Ivory | `#F4ECD8` | Text on dark backgrounds |
| Black | `#000000` | Body text |
| White | `#FFFFFF` | Backgrounds |

### Growth Platform Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Burgundy | `#330311` | Primary |
| Gold | `#C9A961` | Accent |
| Ivory | `#F4ECD8` | Background |

### Typography
- Primary: `Poppins` (Google Fonts)
- Body: `font-light` weight with generous leading
- Hero: `text-5xl font-light`

---

## Business Rules

### Growth Platform
1. **Human-in-the-loop**: No outreach sends without human approval (Send Gate)
2. **Spend transparency**: Every AI call logged with cost
3. **Verification gate**: `emailVerified` AND `approvedBy` required before send
4. **Tier system**: Mass-market / Mid-market / Premium drives pricing, tone, channels
5. **Exclusion rules**: Personas define who NOT to target
6. **Soft opt-out**: Every message includes easy unsubscribe

### Event Perfekt
1. **Client portal**: Separate auth from main site
2. **I Am Her**: Invitation-only, curated community
3. **360 Booth**: Milton Keynes + Nigeria locations
4. **Tender monitoring**: Automated UK government tender discovery

---

## File Manifest

### Artifacts
| Artifact | Source Files | Key Entry Points |
|----------|-------------|------------------|
| api-server | ~150 TS files | `src/index.ts` → `dist/index.mjs` |
| event-perfekt | ~250 TSX/TS files | `src/main.tsx` → `dist/public/` |
| growth-platform | ~80 TSX/TS files | `src/main.tsx` → `dist/public/` |
| mockup-sandbox | ~20 TSX files | `src/main.tsx` → preview server |

### Libraries
| Lib | Purpose | Key Files |
|-----|---------|-----------|
| db | Schema + migrations | `src/schema/growth.ts`, `src/schema/ep.ts` |
| api-spec | OpenAPI spec | `openapi.yaml` |
| api-zod | Shared validators | `src/index.ts` |
| api-client-react | Generated hooks | `src/` (auto-generated) |

---

## Maintenance Notes

### Common Issues
1. **Typecheck first**: Always run `pnpm run typecheck` before committing
2. **Restart workflows**: API server must be restarted after backend changes
3. **Base path**: All routes use `import.meta.env.BASE_URL` for images
4. **DB connection**: Uses `DATABASE_URL` env var (falls back to PGHOST/PORT)
5. **AI costs**: Monitor `growth_spend_logs` for budget tracking

### Adding New Features
1. Update DB schema in `lib/db/src/schema/growth.ts`
2. Add API routes in `artifacts/api-server/src/growth-platform-routes.ts`
3. Update OpenAPI spec in `lib/api-spec/openapi.yaml`
4. Run `pnpm --filter @workspace/api-spec run codegen`
5. Add frontend page in `artifacts/growth-platform/src/pages/`
6. Add route in `artifacts/growth-platform/src/App.tsx`
7. Typecheck and build

---

## Contact

- **Project**: Event Perfekt Global Ltd
- **Website**: eventperfekt.net
- **Email**: info@eventperfekt.com
- **Stack**: React + Express + PostgreSQL + OpenRouter AI
- **License**: Proprietary
