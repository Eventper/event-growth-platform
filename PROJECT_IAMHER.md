# I Am Her — Complete Project Documentation

> Generated: 2026-07-03 | 31 frontend pages | 2 API route files | Dedicated DB tables

---

## What Is I Am Her

**I Am Her** is a luxury leadership wellbeing experience and women's community platform built as a subdomain/module within Event Perfekt. It operates at `eventperfekt.net/iamher` and is designed as an invitation-led, curated room of 100 accomplished women across the UK — founders, executives, business owners, directors, and senior decision-makers.

### Core Concept
- **The Woman Who Leads the Room** — a private leadership dinner
- **Curated, not crowded** — 100 invited women, not open tickets
- **Editorial, not corporate** — photography, stories, media coverage
- **Community, not conference** — ongoing relationships beyond the event

### Event Details
- **Date**: Friday 28 August 2026
- **Location**: Milton Keynes, UK
- **Capacity**: 100 invited women
- **Positioning**: Premium, invitation-only, editorial-style experience

---

## Architecture

### Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion + shadcn/ui
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL
- **Auth**: JWT (shared with Event Perfekt main app)
- **Email**: Namecheap SMTP / Gmail fallback
- **Payments**: Flutterwave (NG partnerships) / Stripe (planned)
- **File Uploads**: Multer (local disk, `uploads/stories/`)

### Route Structure
```
/iamher                    → Main hub / dashboard
/iamher/stories            → Community stories feed
/iamher/community          → Community hub
/iamher/stay              → Milton Keynes stay guide
/iamher/partnership        → Partnership programme
/iamher/feature           → Feature your business
/iamher/feature-business  → Business feature detail
/iamher/business/:id      → Business profile
/iamher/card              → Digital membership card
/iamher/analytics         → Analytics dashboard
/iamher/nominate          → Nominate a guest
/iamher/invite            → Invite guest
/iamher/submit-story      → Submit your story
/iamher/media             → Media gallery
/iamher/brochure          → Partnership brochure
/iamher/product-brands    → Product brands showcase
/iamher/partnership-payment → Partnership payment
/iamher/founding-assessment → Founding member assessment
/iamher/table-nominations → Table nominations
/iamher/signature         → Signature collection
/iamher/stories-admin     → Story admin queue
/meet-the-room            → The 100 women profiles
/access                   → Request access form
/event-august             → The August event
/event-august/confirm     → Confirmation page
/event-august/admin       → Admin panel
```

---

## Frontend Pages (31 files)

### Core Experience
| File | Route | Purpose | Lines |
|------|-------|---------|-------|
| `iam-her.tsx` | `/iamher` | Main hub — countdown, tasks, corporate partners, audience points, navigation to all sub-pages | ~233 |
| `meet-the-room.tsx` | `/meet-the-room` | The 100 women — profile cards with hover glow, entrance animations, filterable grid | ~429 |
| `access.tsx` | `/access` | Invitation request form — name, email, company, role, why invited, media consent | ~484 |

### Stories & Community
| File | Route | Purpose |
|------|-------|---------|
| `event-august.tsx` | `/event-august` | The August 16th event page with RSVP |
| `event-august-confirm.tsx` | `/event-august/confirm` | RSVP confirmation |
| `event-august-admin.tsx` | `/event-august/admin` | Admin panel for event management |
| `iamher-stories.tsx` | `/iamher/stories` | Community stories feed — editorial-style blog |
| `iamher-story-page.tsx` | `/iamher/stories/:slug` | Individual story page |
| `iamher-stories-admin.tsx` | `/iamher/stories-admin` | Admin queue for story approvals |
| `iamher-submit.tsx` | `/iamher/submit-story` | Story submission form with file upload |
| `iamher-community.tsx` | `/iamher/community` | Community hub — members, discussions |

### Partnership & Business
| File | Route | Purpose |
|------|-------|---------|
| `iamher-feature.tsx` | `/iamher/feature` | Feature your business landing |
| `iamher-feature-business.tsx` | `/iamher/feature-business` | Business feature detail |
| `iamher-business-profile.tsx` | `/iamher/business/:id` | Individual business profile |
| `iamher-product-brands.tsx` | `/iamher/partnership/product-brands` | Product brands showcase |
| `iamher-brochure.tsx` | `/iamher/brochure` | Partnership brochure download |
| `iamher-partnership-payment.tsx` | `/iamher/partnership/payment` | Partnership payment processing |
| `iamher-founding-assessment.tsx` | `/iamher/founding-assessment` | Founding member assessment |
| `admin-iamher-businesses.tsx` | `/admin/iamher/businesses` | Business admin panel |

### Guest Experience
| File | Route | Purpose |
|------|-------|---------|
| `iamher-card.tsx` | `/iamher/card` | Digital membership card |
| `iamher-stay.tsx` | `/iamher/stay` | Milton Keynes stay guide (hotels, restaurants) |
| `iamher-media.tsx` | `/iamher/media` | Media gallery — photos, videos |
| `iamher-analytics.tsx` | `/iamher/analytics` | Event analytics dashboard |
| `iamher-nominate.tsx` | `/iamher/nominate` | Nominate someone for the room |
| `iamher-invite.tsx` | `/iamher/invite` | Invite a guest |
| `iamher-table-nominations.tsx` | `/iamher/table-nominations` | Table seating nominations |
| `iamher-signature.tsx` | `/iamher/signature` | Signature collection for commitments |
| `iam-her-esther.tsx` | `/iamher/esther` | Esther's personal portal |

### Admin & Tools
| File | Route | Purpose |
|------|-------|---------|
| `quick-access.tsx` | `/quick-access` | Quick access portal |
| `access-control-demo.tsx` | `/access-control-demo` | Access control demo |
| `about-the-movement.tsx` | `/about-the-movement` | About the movement page |

### Components Used
- `ElizabethChat` — AI chatbot (context-aware, knows event data)
- `IamherMobileNav` — Mobile navigation
- `EmailCapturePopup` — Email capture modal
- `useVisitorTracking` — Analytics tracking hook
- `usePageSEO` / `usePageMeta` — SEO injection

### Design Tokens
```
INK    = "#330311"  // Burgundy — primary brand
GOLD   = "#C9A961"  // Gold — accents, borders, CTAs
IVORY  = "#F4ECD8"  // Ivory — text on dark backgrounds
```

---

## API Routes

### Event August Routes (`event-august-routes.ts` — 2,472 lines)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/event-august/stories` | GET | List all approved stories |
| `/api/event-august/stories` | POST | Submit a new story (with image upload) |
| `/api/event-august/stories/:id` | GET | Get single story |
| `/api/event-august/stories/admin-queue` | GET | Admin queue (pending stories) |
| `/api/event-august/stories/:id/approve` | POST | Approve a story |
| `/api/event-august/stories/:id/reject` | POST | Reject a story |
| `/api/event-august/stories/count` | GET | Story count |
| `/api/event-august/apply` | POST | Submit application |
| `/api/event-august/confirm` | POST | Confirm RSVP |
| `/api/event-august/applications` | GET | List applications |
| `/api/event-august/applications/:id` | GET | Single application |
| `/api/event-august/confirmations` | GET | List confirmations |
| `/api/event-august/nominations` | POST | Submit nomination |
| `/api/event-august/invite` | POST | Send invite |
| `/api/event-august/analytics` | GET | Event analytics |
| `/api/event-august/attendees` | GET | Attendee list |
| `/api/event-august/photos` | GET | Photo gallery |
| `/api/event-august/videos` | GET | Video gallery |
| `/api/iam-her/summary` | GET | Dashboard summary data |

### I Am Her Business Routes (`iamher-business-routes.ts` — 293 lines)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/iamher/businesses` | GET | List all approved businesses |
| `/api/iamher/businesses` | POST | Submit business for directory |
| `/api/iamher/businesses/:id` | GET | Single business profile |
| `/api/iamher/businesses/:id/approve` | POST | Approve business |
| `/api/iamher/businesses/:id/reject` | POST | Reject business |
| `/api/iamher/businesses/admin` | GET | Admin queue |

### Rate Limiting
- Story submissions: 3 per minute per IP
- Business submissions: 3 per minute per IP
- Disposable email blocklist enforced

---

## Database Schema

### Tables (defined in `lib/db/src/schema/growth.ts` and EP schema)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `event_august_stories` | id, title, content, author_name, author_email, image_url, status, created_at | Community stories with approval workflow |
| `event_applications` | id, event_key, name, email, company, role, status, notes, created_at | Guest applications with RSVP tracking |
| `alli_partnerships` | id, business_name, founder_name, category, city, status, image_url | Business directory (Stay/Eat/Enjoy/Invest) |
| `event_august_confirmations` | id, application_id, confirmed, dietary_requirements | RSVP confirmations |
| `event_august_nominations` | id, nominator_name, nominee_name, nominee_email, reason | Guest nominations |
| `event_august_invites` | id, sender_name, recipient_email, sent_at, opened | Invite tracking |
| `visitor_tracking` | id, page, session_id, utm_source, created_at | Page view analytics |
| `email_campaigns` | id, subject, body, sent_at, open_count, click_count | Email campaign tracking |

### Business Categories
```
"stay"          → Hotels, accommodation
"eat_drink"     → Restaurants, cafes, bars
"enjoy"         → Entertainment, wellness
"invest_relocate" → Real estate, financial services
```

### Cities Supported
```
milton-keynes, manchester, birmingham, leeds, liverpool, london
```

---

## Assets

### Images (`artifacts/event-perfekt/public/assets/`)
| File | Purpose |
|------|---------|
| `iamher-hero-home.png/webp` | Homepage hero image |
| `iamher-hero-invitation.png` | Invitation hero |
| `iamher-hero-women.png` | Women-led hero |
| `iamher-portrait-1.png` | Profile portrait 1 |
| `iamher-portrait-2.png` | Profile portrait 2 |
| `iamher-portrait-3.png` | Profile portrait 3 |

### Videos
| File | Purpose |
|------|---------|
| `iamher-concierge.mp4` | Concierge welcome video |

---

## Email System

### Automated Emails
| Trigger | Recipient | Content |
|---------|-----------|---------|
| Story submitted | Admin | Notification with story details |
| Story approved | Author | "Your story is live" |
| Application submitted | Admin | New application alert |
| RSVP confirmed | Guest | Confirmation + event details |
| Business submitted | Admin | New business directory entry |
| Partnership enquiry | Admin | New partnership lead |

### Email Templates
- Located in `artifacts/api-server/src/emailService.ts`
- Uses HTML email design system with burgundy/gold/ivory palette
- Admin notifications go to: info@eventperfekt.com, lyndajohnson@eventperfekt.com

---

## SEO Configuration

### Meta Tags (in `seo-meta-injector.ts`)
| Route | Title | Description |
|-------|-------|-------------|
| `/iamher` | "I Am Her \| Leadership Wellbeing Experience" | Luxury leadership wellbeing for founders, executives |
| `/meet-the-room` | "Meet the Room \| I Am Her" | The 100 women who lead |
| `/access` | "Request Access \| I Am Her" | Invitation request form |
| `/iamher/stories` | "Stories \| I Am Her" | Community stories |
| `/iamher/community` | "Community \| I Am Her" | Member community |
| `/iamher/stay` | "Stay \| I Am Her" | Milton Keynes accommodation |

### Geo Tags (I Am Her only)
```
geo.region: GB-BKM, GB-LND, GB-BDF, GB-NTH
geo.placename: Milton Keynes, London, Bedford, Northampton, Luton
geo.position: 52.0406, -0.7594
```

---

## Analytics & Tracking

### Visitor Tracking
- Page views tracked via `visitor_tracking` table
- UTM parameters captured: source, medium, campaign
- Funnel events: `page_view`, `form_start`, `form_submit`, `conversion`

### Key Metrics Tracked
- Unique visitors per page
- Form completion rates
- Story submission rates
- Application conversion
- Partnership enquiries
- Email open/click rates

---

## File Manifest

### Source Files
```
artifacts/event-perfekt/src/pages/
  iam-her.tsx                   # Main hub
  meet-the-room.tsx             # Profile grid
  access.tsx                    # Access form
  event-august.tsx              # Event page
  event-august-confirm.tsx      # Confirmation
  event-august-admin.tsx        # Admin panel
  iamher-stories.tsx            # Stories feed
  iamher-story-page.tsx         # Story detail
  iamher-stories-admin.tsx      # Story admin
  iamher-submit.tsx             # Submit story
  iamher-community.tsx          # Community
  iamher-card.tsx               # Membership card
  iamher-stay.tsx               # Stay guide
  iamher-feature.tsx            # Feature business
  iamher-feature-business.tsx   # Business detail
  iamher-business-profile.tsx   # Business profile
  iamher-product-brands.tsx     # Product brands
  iamher-brochure.tsx           # Brochure
  iamher-partnership-payment.tsx # Payment
  iamher-founding-assessment.tsx # Assessment
  iamher-table-nominations.tsx  # Table nominations
  iamher-signature.tsx          # Signatures
  iam-her-esther.tsx           # Esther portal
  admin-iamher-businesses.tsx   # Business admin
  quick-access.tsx              # Quick access
  access-control-demo.tsx       # Access demo
  about-the-movement.tsx        # About

artifacts/api-server/src/
  event-august-routes.ts        # API (2,472 lines)
  iamher-business-routes.ts     # API (293 lines)
  seo-meta-injector.ts          # SEO (relevant sections)
  emailService.ts               # Email templates

lib/db/src/schema/
  growth.ts                     # DB schema (includes event tables)
  ep.ts                         # Event Perfekt schema

artifacts/event-perfekt/public/assets/
  iamher-hero-home.png/webp
  iamher-hero-invitation.png
  iamher-hero-women.png
  iamher-portrait-1.png
  iamher-portrait-2.png
  iamher-portrait-3.png

artifacts/event-perfekt/public/videos/
  iamher-concierge.mp4
```

---

## Environment Variables Required

```
DATABASE_URL          → PostgreSQL connection
PORT                  → Service port
NAMECHEAP_EMAIL       → SMTP username
NAMECHEAP_PASSWORD    → SMTP password
GMAIL_APP_PASSWORD    → Gmail fallback
FLW_PUBLIC_KEY        → Flutterwave public
FLW_SECRET_KEY        → Flutterwave secret
```

---

## How to Rebuild

### 1. Database Setup
```bash
# Push schema to PostgreSQL
pnpm --filter @workspace/db run push

# Verify tables exist
psql $DATABASE_URL -c "\dt" | grep event_august
```

### 2. API Server
```bash
# Build API server
pnpm --filter @workspace/api-server run build

# Start (development)
pnpm --filter @workspace/api-server run dev

# The API serves at localhost:8080
# Routes: /api/event-august/*, /api/iamher/*
```

### 3. Frontend
```bash
# Build frontend
pnpm --filter @workspace/event-perfekt run build

# Start (development)
pnpm --filter @workspace/event-perfekt run dev

# Serves at localhost:20125
```

### 4. Deploy
```bash
# Both must be deployed together
# API: artifacts/api-server/dist/index.mjs
# Frontend: artifacts/event-perfekt/dist/public/
```

---

## Maintenance Notes

### Adding a New I Am Her Page
1. Create page in `artifacts/event-perfekt/src/pages/iamher-*.tsx`
2. Add route in `artifacts/event-perfekt/src/App.tsx`
3. Add SEO in `artifacts/api-server/src/seo-meta-injector.ts`
4. Add link in `iam-her.tsx` dashboard
5. Update `useVisitorTracking` if funnel tracking needed

### Adding a New API Endpoint
1. Add route in `event-august-routes.ts` or `iamher-business-routes.ts`
2. Add DB query with Drizzle
3. Add rate limiting if public endpoint
4. Add email notification if admin-facing

### Story Submission Flow
```
User submits story → Multer saves image → DB inserts (status=pending)
  → Admin email notification
  → Admin reviews at /iamher/stories-admin
  → Admin approves → Status=approved → Author email
  → Story appears at /iamher/stories
```

### Business Directory Flow
```
Business submits → DB inserts (status=pending) → Rate limit checked
  → Admin notification
  → Admin reviews at /admin/iamher/businesses
  → Admin approves → Status=approved
  → Business appears at /iamher/stay, /iamher/feature, etc.
```

---

## Contact

- **Project**: Event Perfekt Global Ltd
- **Website**: eventperfekt.net/iamher
- **Email**: info@eventperfekt.com, lyndajohnson@eventperfekt.com
- **Event Date**: 28 August 2026, Milton Keynes
- **License**: Proprietary
