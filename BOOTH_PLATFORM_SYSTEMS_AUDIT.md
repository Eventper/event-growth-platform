# Booth & Platform Inquiry Systems - Complete Audit

**Date:** 2026-07-10  
**Scope:** Event Perfekt codebase - Booth bookings, photo booth inquiries, and "Woman Who Leads The Room" (I AM HER) registrations

---

## EXECUTIVE SUMMARY

The codebase contains **three distinct but interconnected systems**:

1. **360 Booth Hire Booking System** - A complete transactional booking/quote system for photo booth rentals
2. **I AM HER (Woman Who Leads The Room) Event System** - Event management platform with guest applications, profiles, stories, and nominations
3. **Platform/Contact Form System** - Analytics and inquiry tracking through contact form submissions

---

## 1. BOOTH HIRE BOOKING SYSTEM

### 1.1 Core Database Tables

#### Table: `booth_bookings`
**Location:** `lib/db/src/schema/schema.ts` (lines 1250-1303)

**Purpose:** Complete booking/quote lifecycle management for 360 photo booth rentals

**Key Fields:**
```
- id: UUID (primary key)
- token: Unique public share token
- clientName: Text
- clientEmail: Text
- clientPhone: Text
- clientAddress: Text
- eventDate: Text (date of booth hire)
- venue: Text (location of event)
- eventType: Text (e.g., "wedding", "corporate", "birthday")
- eventStartTime / eventEndTime: Text
- guestCount: Integer
- service: Text (e.g., "360 Booth Hire")
- packageName: Text (e.g., "Quick Spin", "Signature Experience", "Luxe Event")
- hireFee: Text (numeric, currency)
- vat: Text (numeric)
- securityDeposit: Text (default £150.00)
- totalDue / depositDue / balanceDue: Text (numeric)
- status: VARCHAR (pending → quote_sent → awaiting_deposit → deposit_paid → confirmed → completed/cancelled)
- paymentStatus: Text (unpaid, deposit_paid, fully_paid)
- agreementAccepted: Boolean
- paymentMethod: Text (card, bank_transfer, cash)
- paymentTxRef: Text (payment transaction reference)
- invoiceNumber: Text
- adminReviewStatus: VARCHAR (pending, draft, sent, approved, hold, deleted)
- country: Text (GB or NG)
- currency: Text (GBP or NGN)
- createdAt / updatedAt: Timestamp
```

**Status Values:**
- `new_enquiry` → `quote_sent` → `awaiting_deposit` → `deposit_paid` → `confirmed` → `completed` / `cancelled`

**Payment Status Values:**
- `unpaid` → `deposit_paid` → `fully_paid`

#### Table: `booth_booking_audit_log`
**Location:** `lib/db/src/schema/schema.ts` (lines 1305-1315)

**Purpose:** Complete audit trail of all actions on booth bookings

**Fields:**
```
- id: UUID (primary key)
- bookingId: VARCHAR (foreign key to booth_bookings)
- action: Text (generate_quote_draft, approve_send_quote, edit_draft, hold_draft, delete_draft, mark_deposit_paid, mark_balance_paid, mark_complete, create_booking, update_booking)
- performedBy: Text (admin name/email)
- performedById: Text (admin user ID)
- details: Text (human-readable description)
- oldValue: Text (previous value)
- newValue: Text (new value)
- createdAt: Timestamp
```

---

### 1.2 API Routes

**Location:** `artifacts/api-server/src/routes/routes.ts` (lines 9483-9979)

#### POST `/api/booth-bookings`
**Purpose:** Create new booth booking inquiry  
**Auth:** Optional  
**Input:** InsertBoothBooking schema  
**Response:** Booking object with token

#### GET `/api/booth-bookings`
**Purpose:** Fetch all booth bookings  
**Auth:** None  
**Response:** Array of BoothBooking objects

#### GET `/api/booth-bookings/:token`
**Purpose:** Fetch specific booking by token  
**Auth:** None  
**Response:** Single BoothBooking object

#### POST `/api/booth-bookings/:token/accept`
**Purpose:** Client accepts quote and initiates payment  
**Auth:** Optional  
**Response:** Updated booking

#### POST `/api/booth-bookings/:token/pay`
**Purpose:** Process payment for deposit or balance  
**Auth:** Optional  
**Response:** Updated booking with payment status

#### PATCH `/api/booth-bookings/:id/status`
**Purpose:** Admin updates booking status  
**Auth:** Optional  
**Response:** Updated booking

#### POST `/api/booth-bookings/:token/send-quote`
**Purpose:** Admin sends quote email to client  
**Auth:** Optional  
**Response:** Success message

#### POST `/api/booth-bookings/:token/send-invoice`
**Purpose:** Admin sends invoice email to client  
**Auth:** Optional  
**Response:** Success message

#### POST `/api/booth-bookings/:token/approve-send`
**Purpose:** Admin approves and sends quote/invoice  
**Auth:** Optional  
**Response:** Updated booking

#### POST `/api/booth-bookings/:token/edit-draft`
**Purpose:** Admin edits draft booking  
**Auth:** Optional  
**Response:** Updated booking

#### POST `/api/booth-bookings/:token/hold-draft`
**Purpose:** Admin puts booking on hold  
**Auth:** Optional  
**Response:** Updated booking

#### POST `/api/booth-bookings/:token/delete-draft`
**Purpose:** Admin deletes draft booking  
**Auth:** Optional  
**Response:** Success message

#### GET `/api/booth-bookings/:token/audit-log`
**Purpose:** Fetch audit history for booking  
**Auth:** None  
**Response:** Array of audit log entries

---

### 1.3 Frontend Pages

**Location:** `artifacts/event-perfekt/src/pages/`

#### [360-booth.tsx](artifacts/event-perfekt/src/pages/360-booth.tsx)
- **Route:** `/360-booth-hire-milton-keynes`
- **Purpose:** Main landing page for UK booth hire service
- **Features:**
  - Hero section with booking CTA
  - Package showcase (Quick Spin £395, Signature £495, Luxe £695)
  - FAQ accordion
  - Booking form (client name, email, event date, guest count, etc.)
  - Tracks CTA clicks, form starts, form completions, submissions
  - Visitor tracking via `/360-booth-hire-milton-keynes` page
  - Schema.org structured data (LocalBusiness, Service, Offer)

#### [admin-booth-bookings.tsx](artifacts/event-perfekt/src/pages/admin-booth-bookings.tsx)
- **Route:** `/admin/booth-bookings`
- **Purpose:** Admin dashboard for managing all booth bookings
- **Features:**
  - Fetch bookings from `/api/booth-bookings`
  - Table view with status, client, date, amount, payment status
  - Send quote: `/api/booth-bookings/:token/send-quote`
  - Send invoice: `/api/booth-bookings/:token/send-invoice`
  - Approve send: `/api/booth-bookings/:token/approve-send`
  - Edit draft: `/api/booth-bookings/:token/edit-draft`
  - Hold draft: `/api/booth-bookings/:token/hold-draft`
  - Delete draft: `/api/booth-bookings/:token/delete-draft`
  - Status updates: PATCH `/api/booth-bookings/:id/status`
  - Audit log viewer

#### [admin-booth-calendar.tsx](artifacts/event-perfekt/src/pages/admin-booth-calendar.tsx)
- **Route:** `/admin/booth-bookings/calendar`
- **Purpose:** Visual calendar view of confirmed booth bookings
- **Features:**
  - Calendar display of events
  - Filter by status, date range
  - Navigate back to bookings list

#### [admin-booth-invoice.tsx](artifacts/event-perfekt/src/pages/admin-booth-invoice.tsx)
- **Route:** `/admin/booth-bookings/invoice/:token`
- **Purpose:** Generate and preview invoice for booth booking

#### [platform.tsx](artifacts/event-perfekt/src/pages/platform.tsx)
- **Route:** `/platform` (but also `/iamher/platform`)
- **Purpose:** Corporate/platform event page that promotes booth entertainment
- **Features:**
  - Booth entertainment for corporate events section
  - CTAs link to `/photo-booth-nigeria`
  - Tracks booth inquiry CTAs: `booth_inquiry`, `booth_corporate`, `booth_final_cta`
  - "Book Your Booth Now" button

---

### 1.4 Booth Inquiry Analytics

**Location:** `artifacts/api-server/src/analytics-routes.ts`

#### GET `/api/admin/booth-funnel`
**Purpose:** Analytics funnel for booth inquiry conversion  
**Metrics:**
- Booth CTA clicks (from `/360-booth-hire-milton-keynes` and `/photo-booth-nigeria`)
- Booth inquiries (contact_form_submit with inquiryType='booth-inquiry')
- Conversion rates: platform→booth, contact→booth, overall

#### GET `/api/admin/booth-funnel/live`
**Purpose:** Real-time booth funnel analytics (today only)

---

### 1.5 Visitor Tracking

**Location:** `artifacts/api-server/src/visitor-tracking-routes.ts`

#### GET `/api/admin/booth-funnel` & `/api/admin/booth-funnel/live`
**Tracked Pages:**
- `/360-booth-hire-milton-keynes` (UK primary)
- `/photo-booth-nigeria` (Nigeria regional)
- `/photobooth` (generic)

**Metrics Tracked:**
- Page views
- CTA clicks
- Form submissions (bot_submissions)

---

### 1.6 Page Variations

**Related Pages:**
- `/photo-booth-nigeria` - Nigeria-specific booth hire landing (referenced in code)
- `/photobooth` - Generic booth page

---

## 2. I AM HER (WOMAN WHO LEADS THE ROOM) SYSTEM

### 2.1 Core Database Tables

**Location:** `artifacts/api-server/src/event-august-routes.ts`

#### Table: `iamher_profiles`
**Purpose:** Registered I AM HER guest profiles / "Woman Who Leads The Room" profiles

**Fields:**
```
- id: Integer (primary key)
- name: Text
- title: Text (job title)
- company: Text
- approved: Boolean
- photo_url: Text
- photo_position: Text (CSS background position, e.g., "center 20%")
- created_at: Timestamp
```

**Seed Data:** 6 seeded profiles

#### Table: `iamher_stories`
**Purpose:** Stories submitted by guests and featured women

**Fields:**
```
- id: Integer (primary key)
- name: Text
- anonymous: Boolean
- job_title: Text
- company: Text
- email: Text
- category: Text
- title: Text
- story: Text (narrative content)
- photo_url: Text
- photo_consent: Boolean
- consent: Boolean (general terms)
- status: VARCHAR (approved, pending, rejected)
- featured: Boolean
- slug: Text (URL slug)
- published_at: Timestamp
- created_at: Timestamp
- wellbeing_issues: TEXT[] (PostgreSQL array)
- sought_support: Text
- support_providers: TEXT[] (array)
- support_testimonial: Text
- may_contact: Boolean
- generalized_title: Text
- rejection_note: Text
- website: Text
- linkedin: Text
- instagram: Text
- what_you_do: Text
- wish_you_knew: Text
```

**Seed Data:** 3 seeded stories

#### Table: `iamher_nominations`
**Purpose:** Nominations for women to be featured

**Fields:**
```
- id: Integer (primary key)
- nominator_name: Text
- nominator_email: Text
- nominee_name: Text
- nominee_email: Text
- message: Text
- created_at: Timestamp
```

#### Table: `iamher_waiting_list`
**Purpose:** Email list for updates and partnership inquiries

**Fields:**
```
- id: Integer (primary key)
- name: Text
- email: Text
- organisation: Text
- country: Text
- region: Text
- interest_type: Text (partnership, attendance, sponsorship)
- reason: Text
- consent_marketing: Boolean
- ip_address: Text
- created_at: Timestamp
```

#### Table: `iamher_business_submissions`
**Purpose:** Business partnership/sponsorship inquiries

**Location:** `artifacts/api-server/src/iamher-business-routes.ts`

**Fields:**
```
- id: Integer (primary key)
- interest_id: Text
- full_name: Text
- job_title: Text
- business: Text
- website: Text
- iamher_statement: Text
- short_bio: Text
- consent_featured: Boolean
- consent_photo_rights: Boolean
- status: VARCHAR (pending, approved, rejected)
- created_at: Timestamp
- category: Text (from cascade service)
- city_slug: Text
- indexes: status, city_slug, category
```

#### Table: `iamher_erasure_log`
**Purpose:** GDPR data erasure/anonymisation tracking

**Fields:**
```
- id: Integer (primary key)
- email: Text
- erasure_token: Text
- reason: Text
- ip_address: Text
- anonymised_count: Integer
- created_at: Timestamp
```

#### Table: `event_applications`
**Purpose:** Guest applications for I AM HER event (2026-08-28)

**Key Fields:** (inferred from code)
```
- id: Integer
- event_key: VARCHAR (e.g., 'iamher-2026-08-28')
- event_id: Integer
- final_status: VARCHAR (accepted, pending, rejected)
- email: Text
- created_at: Timestamp
```

---

### 2.2 API Routes

**Location:** `artifacts/api-server/src/event-august-routes.ts`

#### POST `/api/iamher/submit-story`
**Purpose:** Submit a story for I AM HER platform  
**Input:** Story data with fields matching iamher_stories schema

#### GET `/api/iamher/stories`
**Purpose:** Fetch published stories  
**Filters:** Status = 'approved'

#### GET `/api/iamher/stories/:slug`
**Purpose:** Get single published story

#### GET `/api/iamher/stories/featured`
**Purpose:** Get featured stories only

#### POST `/api/iamher/partnership-enquiry`
**Purpose:** Business partnership inquiry  
**Route:** From `/iamher/partnership/product-brands` page

#### POST `/api/iamher/wait-list`
**Purpose:** Join waiting list for I AM HER updates

#### POST `/api/iamher/nominations`
**Purpose:** Nominate a woman for I AM HER

#### Admin Routes (Protected by `IAMHER_ADMIN_SECRET = "ep-iamher-2026"`):
- GET `/api/admin/iamher/stories` - List all stories (admin view)
- PATCH `/api/admin/iamher/stories/:id` - Approve/reject/feature stories
- GET `/api/admin/iamher/profiles` - View all profiles
- DELETE `/api/admin/iamher/profiles/:id` - Remove profile
- GET `/api/admin/iamher/nominations` - List nominations
- GET `/api/admin/iamher/waiting-list` - View waiting list
- POST `/api/admin/iamher/send-updates` - Mass email
- GET `/api/admin/iamher/csv-export` - Export data

---

### 2.3 Frontend Pages

**Location:** `artifacts/event-perfekt/src/pages/`

#### Key I AM HER Pages:
- `/iamher` - Main event landing page
- `/iamher/platform` - Platform page (see platform.tsx above)
- `/iamher/stories` - Gallery of published stories
- `/iamher/stories/:slug` - Individual story page
- `/iamher/submit-story` - Story submission form
- `/iamher/partnership` - Partnership information
- `/iamher/partnership/product-brands` - Brand partnership inquiry
- `/iamher/stay` - Accommodation/local information
- `/iamher/community` - Community page
- `/iamher/feature` - Application to be featured
- `/iamher/nominate` - Nomination form
- `/iamher/card` - I AM HER event card/badge
- `/admin/iamher` - Admin dashboard for I AM HER

---

### 2.4 Cascade Service

**Location:** `artifacts/api-server/src/cascadeService.ts` (lines 117, 142)

**Purpose:** Defines I AM HER business category options

**Category:** `"photoboothService"` with label `"Photobooth Service"`

---

### 2.5 Key Event Details

- **Event Name:** I Am Her (An Evening for Her)
- **Event Date:** 2026-08-28 (August 28, 2026)
- **Event Location:** Milton Keynes, UK
- **Event Key:** `iamher-2026-08-28`
- **Admin Secret:** `ep-iamher-2026`
- **Purpose:** "Woman Who Leads The Room" empowerment event with stories, profiles, leadership opportunities

---

## 3. PLATFORM INQUIRY & ANALYTICS SYSTEM

### 3.1 Contact Form Submissions

**Source Table:** Generic event tracking system (not booth-specific)

**Event Type:** `contact_form_submit`

**Booth-Related Events:**
- `inquiryType = 'booth-inquiry'` - Explicit booth inquiry
- `event_data LIKE '%booth%'` - Any booth-related event

**Tracked via:**
- `analytics-routes.ts` - Booth funnel analytics
- `visitor-tracking-routes.ts` - Page and CTA tracking

---

### 3.2 Platform Page Tracking

**Location:** `artifacts/event-perfekt/src/pages/platform.tsx` (lines 122-277)

**Page Route:** `/iamher/platform` or `/platform`

**CTAs Tracked:**
- `cta: 'booth_corporate'` - Corporate booth entertainment
- `cta: 'booth_inquiry'` / `cta: 'booth_inquiry_info'` - Booth inquiry
- `cta: 'booth_final_cta'` - Final booth call-to-action

**Implementation:**
```typescript
trackFunnelEvent('cta_click', '/iamher/platform', { cta: 'booth_corporate' });
trackFunnelEvent('cta_click', '/iamher/platform', { cta: 'booth_inquiry', audience: 'corporate_event' });
```

---

## 4. NAMING CONVENTIONS & SEARCH PATTERNS

### 4.1 Booth-Related Table Names
- `booth_bookings` - Primary transactional table
- `booth_booking_audit_log` - Audit trail

### 4.2 Booth-Related URLs/Routes
- `/api/booth-bookings` - Booking CRUD
- `/api/admin/booth-funnel` - Analytics
- `/360-booth-hire-milton-keynes` - UK landing page
- `/photo-booth-nigeria` - Nigeria landing page
- `/photobooth` - Generic page
- `/admin/booth-bookings` - Admin dashboard
- `/admin/booth-bookings/calendar` - Calendar view
- `/admin/booth-bookings/invoice/:token` - Invoice

### 4.3 I AM HER Table Names
- `iamher_profiles` - Registered women
- `iamher_stories` - Story submissions
- `iamher_nominations` - Nominations
- `iamher_waiting_list` - Email list
- `iamher_business_submissions` - Partnership inquiries
- `iamher_erasure_log` - GDPR erasure tracking
- `event_applications` - Guest applications

### 4.4 I AM HER Related URLs/Routes
- `/api/iamher/*` - I AM HER endpoints
- `/api/admin/iamher/*` - Admin endpoints
- `/iamher/*` - Frontend pages
- `/admin/iamher` - Admin dashboard

### 4.5 Search Patterns NOT Found
- `platform_inquiry*` - NOT USED (platform inquiries are tracked via contact_form_submit)
- `woman_who_leads*` - NOT USED (I AM HER uses `iamher_*` prefix instead)
- `360_booth*` - NOT USED (uses `booth_bookings` table, pages use `/360-booth-*` routes)

---

## 5. DATA FLOW & RELATIONSHIPS

### 5.1 Booth Booking Lifecycle

```
Client submits inquiry
    ↓
POST /api/booth-bookings (create booth_bookings record)
    ↓
Admin reviews booking
    ↓
POST /api/booth-bookings/:token/send-quote (quoteSent = true)
    ↓
Client accepts quote & pays deposit
    ↓
POST /api/booth-bookings/:token/accept (status = awaiting_deposit)
POST /api/booth-bookings/:token/pay (paymentStatus = deposit_paid)
    ↓
Admin sends invoice for balance
    ↓
Client pays balance
    ↓
Booking confirmed (status = confirmed, bookingConfirmed = true)
    ↓
Event occurs
    ↓
Marked complete (status = completed)
```

**All actions logged in:** `booth_booking_audit_log`

### 5.2 I AM HER Event Lifecycle

```
Guest submits I AM HER application
    ↓
Application created in event_applications (event_key = 'iamher-2026-08-28')
    ↓
Admin reviews application (final_status = pending → accepted/rejected)
    ↓
Accepted guests may submit stories
    ↓
Story submission to iamher_stories
    ↓
Admin approves/features/publishes
    ↓
Story appears in /iamher/stories gallery
```

### 5.3 Analytics Flow

```
User visits /360-booth-hire-milton-keynes
    ↓
Page tracked via useVisitorTracking()
    ↓
User clicks CTA "Book Your Booth"
    ↓
trackFunnelEvent('cta_click', '/360-booth-hire-milton-keynes', {...})
    ↓
User submits booking form
    ↓
POST /api/booth-bookings
    ↓
Analytics calculated in /api/admin/booth-funnel
(platform→booth rate, contact→booth rate, overall conversion)
```

---

## 6. PAYMENT & FINANCIAL TRACKING

### 6.1 Booth Booking Payments

**Table:** `booth_bookings`

**Fields:**
- `hireFee` - Service fee for booth hire
- `vat` - Tax amount
- `securityDeposit` - Damage deposit (default £150.00 for UK, likely ₦ for Nigeria)
- `totalDue` - Full amount
- `depositDue` - Deposit amount (calculated from depositPercentage, default 80%)
- `balanceDue` - Remaining amount after deposit
- `balanceDueDate` - When balance is due
- `paymentMethod` - card, bank_transfer, or cash
- `paymentTxRef` - Transaction reference from payment gateway
- `paymentStatus` - unpaid → deposit_paid → fully_paid
- `cashBalanceFlag` - Special handling for cash balance payments

**Currencies Supported:**
- GBP (UK - booth_bookings.country = 'GB')
- NGN (Nigeria - booth_bookings.country = 'NG')

---

## 7. ADMIN CAPABILITIES

### 7.1 Booth Bookings Admin

**File:** `artifacts/event-perfekt/src/pages/admin-booth-bookings.tsx`

**Actions:**
1. **Send Quote** - Generate and email quote to client
2. **Send Invoice** - Generate and email invoice for balance
3. **Approve Send** - Review and approve quote/invoice before sending
4. **Edit Draft** - Modify booking details before sending
5. **Hold Draft** - Put booking on hold (pause processing)
6. **Delete Draft** - Cancel booking entirely
7. **Update Status** - Change booking status manually
8. **View Audit Log** - See all actions on booking

**Admin View Columns:**
- Client name & contact
- Event date
- Venue
- Guest count
- Package selected
- Quote/Invoice/Total amounts
- Status
- Payment status
- Actions dropdown

### 7.2 I AM HER Admin

**Route:** `/admin/iamher` (protected by `IAMHER_ADMIN_SECRET`)

**Actions:**
- Approve/reject/feature stories
- Manage profiles
- Review nominations
- Monitor waiting list
- Export data as CSV
- Send mass updates

---

## 8. EXTERNAL INTEGRATIONS

### 8.1 Payment Processing
- Stripe integration (referenced in booth bookings payment routes)
- Support for card, bank transfer, cash methods

### 8.2 Email Services
- Quote emails
- Invoice emails
- Confirmation emails
- Admin notifications

### 8.3 SEO/Indexing
- Google Indexing (IndexNow) - /booth and /iamher URLs indexed
- XML Sitemap includes booth and I AM HER pages

---

## 9. SECURITY & COMPLIANCE

### 9.1 Booth Bookings
- Public share tokens for client access without authentication
- Admin review status workflow prevents accidental sends
- Audit logging for all changes
- Payment transaction reference tracking

### 9.2 I AM HER
- Admin secret key protection (`IAMHER_ADMIN_SECRET = "ep-iamher-2026"`)
- GDPR erasure log tracking (`iamher_erasure_log`)
- Consent fields for photo rights and featured display
- Data anonymisation capability

---

## 10. MIGRATION & DEPLOYMENT NOTES

### 10.1 No Explicit Migration Files Found
- Schema is defined directly in `lib/db/src/schema/schema.ts`
- Database creation is managed through Drizzle ORM schema definitions
- Tables are created on-demand in application startup code

### 10.2 Seeding Data
- `iamher_profiles`: 6 seed records (see event-august-routes.ts)
- `iamher_stories`: 3 seed records (see event-august-routes.ts)

---

## 11. SUMMARY TABLE: COMPLETE SYSTEMS OVERVIEW

| System | Primary Table | Routes | Frontend | Purpose |
|--------|---------------|--------|----------|---------|
| **Booth Hire** | `booth_bookings` | `/api/booth-bookings/*` | `/admin/booth-bookings`, `/360-booth-hire-milton-keynes`, `/photo-booth-nigeria` | 360° photo booth rental booking & payment |
| **Booth Analytics** | event_tracking | `/api/admin/booth-funnel` | (Analytics only) | Conversion funnel metrics |
| **I AM HER Event** | `iamher_*` tables | `/api/iamher/*`, `/api/admin/iamher/*` | `/iamher/*`, `/admin/iamher` | Women leadership event management |
| **Contact/Platform** | contact_form_submit | `/api/analytics`, `/platform` | `/iamher/platform`, `/platform` | Inquiry tracking & platform promotion |

---

## 12. RECOMMENDATIONS FOR NEW DEVELOPMENT

1. **Booth Inquiries** → Use `booth_bookings` table, not separate platform_inquiry table
2. **Woman Who Leads** → Use `iamher_*` tables, already established pattern
3. **Photo Booth** → Variations: `/360-booth-*` or `/photo-booth-*` URL patterns
4. **Platform Registrations** → Track via iamher_stories or iamher_business_submissions
5. **Analytics** → Extend `/api/admin/booth-funnel` for cross-system metrics
6. **Admin Dashboard** → Follow admin-booth-bookings.tsx pattern for new workflows

---

## FILE REFERENCES

### Schema Definitions
- [lib/db/src/schema/schema.ts](lib/db/src/schema/schema.ts#L1248-L1320)

### API Route Implementations
- [artifacts/api-server/src/routes/routes.ts](artifacts/api-server/src/routes/routes.ts#L9483-L9979) - Booth bookings routes
- [artifacts/api-server/src/event-august-routes.ts](artifacts/api-server/src/event-august-routes.ts) - I AM HER routes
- [artifacts/api-server/src/analytics-routes.ts](artifacts/api-server/src/analytics-routes.ts) - Analytics routes
- [artifacts/api-server/src/visitor-tracking-routes.ts](artifacts/api-server/src/visitor-tracking-routes.ts#L1173-L1400) - Booth funnel tracking

### Frontend Pages
- [artifacts/event-perfekt/src/pages/360-booth.tsx](artifacts/event-perfekt/src/pages/360-booth.tsx) - Booth landing page
- [artifacts/event-perfekt/src/pages/admin-booth-bookings.tsx](artifacts/event-perfekt/src/pages/admin-booth-bookings.tsx) - Admin dashboard
- [artifacts/event-perfekt/src/pages/admin-booth-calendar.tsx](artifacts/event-perfekt/src/pages/admin-booth-calendar.tsx) - Calendar view
- [artifacts/event-perfekt/src/pages/platform.tsx](artifacts/event-perfekt/src/pages/platform.tsx) - Platform page with booth promotion

### Storage/Database
- [artifacts/api-server/src/storage-database.ts](artifacts/api-server/src/storage-database.ts#L1031-L1054) - Database layer
- [artifacts/api-server/src/storage.ts](artifacts/api-server/src/storage.ts#L1925-L1954) - Storage interface

---

**End of Audit Report**  
Generated: 2026-07-10
