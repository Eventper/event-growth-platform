# Growth Hub Campaign Engine Extension

**Objective:** Extend existing prospect campaign system to generate personalized guest invitations and partner outreach emails for The Growth Hub.

**Timeline:** Build campaign types today → Generate 30 guest + 30 partner emails tomorrow morning → Ready for approval by 9am

---

## Core Principle

**Do NOT build a new email system.**

Use the existing campaign engine (`ep_prospect_campaigns` table, `campaign-routes.ts`, `campaign-scheduler.ts`) and extend it.

**Reuse:**
- ✅ Approval queue system (existing)
- ✅ Email drafting logic (existing)
- ✅ Suppression rules (existing)
- ✅ Manual approval workflow (existing)
- ✅ Scheduler architecture (existing)

**Extend with:**
- New campaign types: `Guest Invitation` and `Partner Outreach`
- Personalization rules tied to Growth Hub databases
- Pre-built draft templates for each campaign type
- Campaign dashboard for tracking invitations and partnerships

---

## Part 1: Guest Invitation Campaigns

### Campaign Type: **Guest Invitation**

**What it does:**
- For each guest in the Growth Hub Guest Intelligence database (130 women), auto-generate a personalized invitation email
- Pull data from guest record: first name, company, role, sector, why selected, priority, warm intro (if available)
- Draft the email using template
- Send to approval queue
- Wait for human approval before sending

**Database Connection:**
- Source: `growth_guests` table (or API endpoint `/api/growth/guests`)
- Pull fields:
  - `name` (first name)
  - `company`
  - `role`
  - `sector`
  - `influenceScore` (justifies why selected)
  - `invitePriority` (A/B/C)
  - `speakerPotential`, `sponsorIntroductionPotential` (personalization angles)
  - `notes` (warm intro source, if available)

**Email Template Rules (MANDATORY)**

Every generated invitation email **must**:

1. **Introduce Kynda Johnson**
   ```
   "Hi [FirstName], I'm reaching out from Kynda Johnson's office..."
   OR
   "Hi [FirstName], Kynda Johnson asked me to invite you..."
   ```

2. **Explain The Woman Who Leads The Room** (in one sentence)
   ```
   "The Woman Who Leads The Room is an invitation-only event bringing 
   together 100 of the UK's most influential women in business to explore 
   bold ideas, build strategic partnerships, and shape the future."
   ```

3. **Explain why SHE was specifically selected** (personalised, not generic)
   ```
   ❌ "You're an accomplished leader"
   ✅ "Your work at [Company] in [Sector] directly connects to our themes 
      this year, and your track record in [specific achievement] makes you 
      essential for this conversation."
   ```

4. **Include warm introduction if available**
   ```
   "I see [Name] knows you well and suggested you'd bring valuable perspective..."
   OR
   "[Name] mentioned you'd be a perfect fit..."
   ```

5. **One clear CTA**
   ```
   "Are you available Thursday, August 28? 
   Reply to confirm, or let me know if another date works better."
   ```

6. **Tone:** Professional, warm, personal. Never sound like a mass campaign.

7. **Length:** Maximum 220 words

8. **Never use:**
   - Generic phrases ("Join us for an exclusive event")
   - Marketing language ("Don't miss out")
   - Mass-email formatting
   - Multiple CTAs
   - Complicated sentences

**Personalization Parameters:**

| Field | Example | Used In |
|-------|---------|---------|
| FirstName | Anne | "Hi Anne, ..." |
| Company | Starling | "Your work at Starling..." |
| Role | CEO & Founder | "As a founder and CEO, ..." |
| Sector | Fintech | "...in fintech, ..." |
| InfluenceScore | 9/10 | Why she matters (internal logic, not in email) |
| InvitePriority | A | Priority A gets sent first, more personal |
| WarmIntro | "Debbie Wosskow mentioned..." | Include if available |

**Example Generated Email:**

```
Subject: The Woman Who Leads The Room — August 28

Hi Anne,

I'm reaching out from Kynda Johnson's office because we're creating 
something special this August, and you're exactly the kind of person 
who should be part of it.

The Woman Who Leads The Room is an invitation-only event bringing together 
100 of the UK's most influential women in business to explore bold ideas, 
build strategic partnerships, and shape the future.

You're at the top of our list because Starling is redefining financial 
infrastructure, and your leadership in scaling fintech from founders to 
mainstream has been remarkable. That perspective is essential for this 
conversation.

Debbie Wosskow mentioned you'd bring an important voice here, and we agree.

Are you available Thursday, August 28? Just reply to confirm, or let me 
know if another date works better.

Looking forward to it.

Best regards,
[Sender Name]
[Title]
```

---

## Part 2: Partner Outreach Campaigns

### Campaign Types (5 variants)

Each partner record in the Growth Hub Partnership database generates a proposal draft.

**Partner Types & Campaign Names:**

| Partner Type | Campaign Name | Email Focus |
|--------------|---------------|------------|
| Sponsor | **Strategic Sponsor Proposal** | Sponsorship value, brand alignment, guest access |
| Brand Partner | **Brand Partnership Proposal** | Co-marketing, brand credibility, partner ecosystem |
| Media Partner | **Media Partnership Proposal** | Coverage, editorial access, audience reach |
| Employer Partner | **Employer Partnership Proposal** | Talent recruitment, employer brand, employee experience |
| Civic Partner | **Civic Partnership Proposal** | Community impact, institutional credibility, CSR alignment |

**Database Connection:**
- Source: `growth_organisations` table (or API endpoint `/api/growth/organisations`)
- Pull fields:
  - `name` (organisation name)
  - `sector`
  - `partnerType` (one of 5 above)
  - `contactName`
  - `contactRole`
  - `email`
  - `whatTheyBring` (partner perspective: "Financial credibility", "Media reach", etc.)
  - `whatWeWant` (from their perspective: "Sponsorship investment", "Media coverage", etc.)
  - `whatTheyGet` (benefits: "Brand exposure", "Talent access", etc.)
  - `strategicValueScore` (1-10)

**Partner Email Template Rules (MANDATORY)**

Every partner proposal email **must**:

1. **Introduce Kynda Johnson & the event**
   ```
   "Hi [ContactName], I'm reaching out from Kynda Johnson's office about 
   a strategic opportunity..."
   ```

2. **Explain The Woman Who Leads The Room**
   ```
   "The Woman Who Leads The Room is an invitation-only event, Thursday 
   August 28, bringing together 100 of the UK's most influential women 
   in business to explore bold ideas and build strategic partnerships."
   ```

3. **Explain why THEY were specifically selected** (not generic)
   ```
   ❌ "Your company is in finance and we need sponsors"
   ✅ "[Organisation]'s commitment to financial inclusion directly aligns 
      with our audience. 80% of our attendees hold decision-making power 
      in financial services."
   ```

4. **Explain what the partnership means** (customized by type)
   ```
   SPONSOR: "As Strategic Sponsor, you'd have access to [specific value]"
   BRAND: "As Brand Partner, you'd reach [specific audience]"
   MEDIA: "As Media Partner, you'd cover [specific angle]"
   EMPLOYER: "As Employer Partner, you'd meet [specific talent]"
   CIVIC: "As Civic Partner, you'd support [specific impact]"
   ```

5. **One clear CTA**
   ```
   "Are you interested in exploring this as a Strategic Sponsor? 
   Let's schedule a call next week."
   ```

6. **Tone:** Professional, business-focused, consultative. Not "pitch-y"

7. **Length:** Maximum 220 words

8. **Never use:**
   - "Exclusive opportunity" (overused)
   - "Limited slots" (pressure tactic)
   - Multiple CTAs
   - Vague benefits
   - Generic sponsor tiers

**Personalization by Partner Type:**

### Type 1: Strategic Sponsor
- Focus: "Investment + Access"
- Key Message: ROI, guest caliber, brand lift
- CTA: "Schedule sponsorship conversation"

### Type 2: Brand Partner
- Focus: "Co-marketing + Credibility"
- Key Message: Audience alignment, brand association, content
- CTA: "Explore brand partnership"

### Type 3: Media Partner
- Focus: "Coverage + Editorial Access"
- Key Message: Story angle, audience reach, editorial placement
- CTA: "Discuss media partnership"

### Type 4: Employer Partner
- Focus: "Talent Access + Employer Brand"
- Key Message: Senior talent pipeline, employer credibility, hiring
- CTA: "Discuss employer partnership"

### Type 5: Civic Partner
- Focus: "Impact + Institutional Credibility"
- Key Message: CSR alignment, community reach, institutional voice
- CTA: "Explore civic partnership"

**Example Generated Partner Email (Strategic Sponsor):**

```
Subject: Strategic Sponsor Opportunity — The Woman Who Leads The Room

Hi Sarah,

I'm reaching out from Kynda Johnson's office about a strategic opportunity 
that might align well with Barclays' commitment to empowering women in finance.

The Woman Who Leads The Room is an invitation-only event on Thursday, August 28, 
bringing together 100 of the UK's most influential women in business — founders, 
CEOs, investors, institutional leaders, and decision-makers across sectors.

We're looking for 4-5 strategic sponsors who understand that this audience 
doesn't need promotional marketing; they need trusted peer conversations and 
genuine partnerships. As Strategic Sponsor, you'd be positioned as the backbone 
of the event, with meaningful access to our attendees.

Barclays' leadership in inclusive finance makes you a natural fit, and your 
team would connect directly with this caliber of audience.

Are you interested in exploring this? Let's schedule a call early next week 
to discuss what this could look like.

Best regards,
[Sender Name]
[Title]
```

---

## Part 3: Campaign Workflow

### Step 1: Campaign Creation (Backend)

**Endpoint (existing, use this):**
```
POST /api/prospect-campaigns
Body: {
  name: "Guest Invitations - Priority A",
  campaign_type: "guest_invitation",  ← NEW FIELD
  approval_rule: "manual",             ← MUST BE MANUAL FOR GROWTH HUB
  target_audience: "Growth Hub guests",
  target_source_database: "growth_guests",  ← NEW FIELD
  target_source_filter: { priority: "A" },  ← NEW FIELD
  email_tone: "warm_professional"
}
```

**Endpoint (new):**
```
POST /api/growth-campaigns
Body: {
  campaign_type: "guest_invitation" | "partner_outreach",
  partner_type?: "strategic_sponsor" | "brand_partner" | ... ← only for partner_outreach
  source_filter: { priority: "A" | "B" | "C" } or { partnerType: "..." }
  approval_rule: "manual"
}
```

### Step 2: Draft Generation (Scheduler)

**Timing:** 07:00 UK time (existing scheduler)

**Process:**
1. Query Growth Hub database (guests or organisations)
2. For each record, generate personalized email draft
3. Insert into `ep_approval_queue` (existing table)
4. Tag with campaign, recipient name, campaign type
5. Log to activity timeline

**Expected Output (for 130 guests):**
- 130 personalized invitation drafts
- All in approval queue
- Waiting for human review

**Expected Output (for ~30 organisations):**
- 30 personalized partner proposals
- Split by partner type (Sponsor, Brand, Media, Employer, Civic)
- All in approval queue
- Waiting for human review

### Step 3: Approval Queue (Existing)

**Use existing workflow:**
- Dashboard shows all drafted emails
- Human reads, edits if needed
- Human approves or rejects
- No auto-send for Growth Hub campaigns (approval_rule stays "manual")

### Step 4: Send (Existing)

**Use existing scheduler:**
- Approved emails send at business hours
- Track open rates, reply rates, clicks
- Log to activity timeline

---

## Part 4: Campaign Dashboard

### New Page: Growth Hub Campaigns (`/growth-campaigns`)

**Sections:**

### Section 1: Campaign Overview Cards

```
┌─────────────────────────────────────────────────────────────┐
│ 📧 GUEST INVITATIONS                                        │
│                                                              │
│ Total Drafted: 130      Approved: 45     Sent: 45           │
│ Awaiting Approval: 85   Opened: 12      Replied: 3          │
│ Invitation Accepted: 2  Meeting Booked: 1                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🤝 PARTNER OUTREACH                                          │
│                                                              │
│ Total Drafted: 30       Approved: 12     Sent: 12           │
│ Awaiting Approval: 18   Opened: 4       Replied: 1          │
│ Partnership Agreed: 0   Meeting Booked: 0                   │
└─────────────────────────────────────────────────────────────┘
```

### Section 2: Guest Invitations Detailed View

**Table with columns:**
| Guest Name | Company | Priority | Status | Sent | Opened | Replied | Action |
|-----------|---------|----------|--------|------|--------|---------|--------|
| Anne Boden | Starling | A | Approved | ✓ | ✓ | → | View Email |
| Debbie Wosskow | Founders Factory | A | Awaiting Approval | — | — | — | Review Draft |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Filters:**
- Priority (A, B, C)
- Status (Drafted, Awaiting Approval, Approved, Sent)
- Engagement (Opened, Replied)
- Stage (Invitation Accepted, Meeting Booked)

### Section 3: Partner Outreach Detailed View

**Table with columns:**
| Organisation | Partner Type | Contact | Status | Sent | Opened | Replied | Stage | Action |
|--------------|-------------|---------|--------|------|--------|---------|-------|--------|
| Barclays | Strategic Sponsor | Sarah | Approved | ✓ | ✓ | ✓ | Meeting Booked | View Email |
| Visa | Brand Partner | James | Awaiting Approval | — | — | — | — | Review Draft |

**Filters:**
- Partner Type (Sponsor, Brand, Media, Employer, Civic)
- Status (Drafted, Awaiting Approval, Approved, Sent)
- Engagement (Opened, Replied)
- Stage (Partnership Agreed, Meeting Booked)

### Section 4: Campaign Performance Metrics

```
Guest Invitations Performance:
  Sent: 45
  Opened: 12 (26.7%)
  Replied: 3 (6.7%)
  Acceptance Rate: 2 (4.4%)
  Meeting Rate: 1 (2.2%)

Partner Outreach Performance:
  Sent: 12
  Opened: 4 (33.3%)
  Replied: 1 (8.3%)
  Agreement Rate: 0 (0%)
  Meeting Rate: 0 (0%)
```

### Section 5: Quick Actions

```
[Generate Guest Invitations] [Generate Partner Proposals]
[View Approval Queue] [Download Campaign Report]
```

---

## Part 5: Implementation Tasks

### Task 1: Extend Campaign Schema
- Add `campaign_type` field to `ep_prospect_campaigns` table
- Add `partner_type` field (for partner outreach)
- Add `source_database` field (growth_guests or growth_organisations)
- Add `source_filter` field (JSON for filtering by priority, partner type, etc.)
- Add `generated_emails_count` field
- Migration: `ALTER TABLE ep_prospect_campaigns ADD COLUMN campaign_type VARCHAR(50);`

### Task 2: Create Guest Invitation Draft Generator
- File: `artifacts/api-server/src/guest-invitation-generator.ts`
- Function: `generateGuestInvitationDraft(guest: GuestIntelligence): EmailDraft`
- Logic:
  - Pull guest data (name, company, role, sector, influence score, priority, notes)
  - Check if warm intro available
  - Generate subject line
  - Generate body using template rules
  - Personalize with all required elements
  - Return draft object ready for approval queue

### Task 3: Create Partner Proposal Draft Generator
- File: `artifacts/api-server/src/partner-proposal-generator.ts`
- Function: `generatePartnerProposalDraft(organisation: Organisation): EmailDraft`
- Logic:
  - Pull org data (name, sector, partner type, contact, what they bring/want/get)
  - Select template based on partner type (Sponsor/Brand/Media/Employer/Civic)
  - Generate subject line
  - Generate body using template rules
  - Personalize with all required elements
  - Return draft object ready for approval queue

### Task 4: Create Campaign Generation Endpoint
- File: `artifacts/api-server/src/growth-campaign-routes.ts` (new)
- Endpoint: `POST /api/growth-campaigns/generate`
- Body: `{ campaign_type: "guest_invitation" | "partner_outreach", partner_type?: "..." }`
- Logic:
  - Query Growth Hub database (guests or organisations)
  - For each record, call generator function
  - Insert all drafts into `ep_approval_queue`
  - Return summary: { drafted: 130, awaitingApproval: 130, campaignId: "..." }

### Task 5: Create Campaign Dashboard Page
- File: `artifacts/growth-platform/src/pages/growth-campaigns.tsx`
- Display:
  - Overview cards (guest vs partner)
  - Detailed tables with filtering
  - Performance metrics
  - Quick action buttons
- Fetch from:
  - `GET /api/growth-campaigns` (summary)
  - `GET /api/growth-campaigns/invitations` (guest invitations with status)
  - `GET /api/growth-campaigns/partners` (partner proposals with status)

### Task 6: Update Campaign Scheduler
- File: `artifacts/api-server/src/campaign-scheduler.ts`
- Add step: After normal campaign discovery, also run Growth Hub campaign generation
- Logic:
  - 07:00 UK: Generate guest invitation drafts if campaign is active
  - 07:05 UK: Generate partner proposal drafts if campaign is active
  - Insert all into approval queue
  - Log to activity timeline

### Task 7: Add Route to App
- File: `artifacts/growth-platform/src/App.tsx`
- Add import: `import GrowthCampaigns from "@/pages/growth-campaigns";`
- Add route: `<Route path="/growth-campaigns" component={GrowthCampaigns} />`

### Task 8: Update Menu Navigation
- File: `artifacts/growth-platform/src/components/Layout.tsx`
- Add nav item: "Growth Campaigns" → `/growth-campaigns`
- Position under Growth Hub section

---

## Part 6: Tomorrow's Workflow (Friday, July 10)

### 06:00 — Start scheduler
- All 130 guest invitations draft automatically
- All 30+ partner proposals draft automatically
- Total: ~160 emails in approval queue
- All tagged "Manual Review Required"

### 08:00 — Open dashboard
- Go to `/growth-campaigns`
- See: "130 guest invitations awaiting approval, 30 partner proposals awaiting approval"
- Start reviewing

### 09:00-12:00 — Review & Edit
- Read each email
- Edit if needed (personalization, tone, facts)
- Approve or reject
- No sending yet—everything stays in queue

### 12:00 — Send request
- When ready, batch-send approved emails
- Can stagger by priority (A → B → C)
- Can send by partner type

### Rest of day — Track engagement
- Emails sent
- Open rates live
- Replies coming in
- Meeting bookings tracking

---

## Part 7: Code Locations

**Backend:**
- `artifacts/api-server/src/campaign-routes.ts` — Update schema, add fields
- `artifacts/api-server/src/guest-invitation-generator.ts` — NEW
- `artifacts/api-server/src/partner-proposal-generator.ts` — NEW
- `artifacts/api-server/src/growth-campaign-routes.ts` — NEW
- `artifacts/api-server/src/campaign-scheduler.ts` — Update timing

**Frontend:**
- `artifacts/growth-platform/src/pages/growth-campaigns.tsx` — NEW
- `artifacts/growth-platform/src/App.tsx` — Add route
- `artifacts/growth-platform/src/components/Layout.tsx` — Add nav

---

## Part 8: Approval Queue Integration

**Use existing table structure:**
- `ep_approval_queue` (already exists)
- Insert with:
  ```sql
  INSERT INTO ep_approval_queue (
    campaign_id, campaign_name, recipient_email,
    recipient_name, subject, body, status,
    created_at, updated_at
  ) VALUES (...)
  ```

**Status values:**
- `drafted` → awaiting review
- `approved` → ready to send
- `rejected` → not sending
- `sent` → already sent

---

## Part 9: Success Criteria

✅ **By tomorrow morning (9am):**
- [ ] 130 guest invitation drafts in approval queue
- [ ] 30+ partner proposal drafts in approval queue
- [ ] Dashboard shows all 160+ emails with status
- [ ] Each email is personalized (not templated generic copy)
- [ ] Each email follows all mandatory rules
- [ ] No auto-send enabled (manual approval only)

✅ **After approval:**
- [ ] Can edit each email before approval
- [ ] Can approve/reject individually or in batch
- [ ] Can send when ready
- [ ] Tracking shows opens, replies, meetings booked
- [ ] Activity timeline updates as emails are sent and engaged with

---

## Part 10: Rules (Non-Negotiable)

✅ **DO:**
- Use existing campaign engine
- Reuse approval queue
- Keep `approval_rule = "manual"`
- Personalize every email (not template blast)
- Follow email rules (Kynda intro, event explanation, why selected, CTA, 220 words max)
- Make every email editable before sending
- Track all engagement
- Log to activity timeline

❌ **DON'T:**
- Build a new email system
- Enable auto-send for Growth Hub emails
- Send before human approval
- Use generic mass-email language
- Create generic templated copy
- Skip personalisation
- Change approval workflow

---

## Summary

**What we're building:**
- Extend existing campaign system to handle guest invitations and partner proposals
- Auto-generate personalized emails using Growth Hub databases
- All emails go through manual approval queue
- Dashboard to manage campaigns
- Tomorrow: 160+ personalized emails ready for review

**What we're NOT building:**
- New email system
- Auto-send functionality for Growth Hub campaigns
- Generic mass-email templates
- Separate approval flow

**Timeline:**
- Today: Build generators + dashboard + routes
- Tonight (7am scheduler run): Generate all 160+ emails
- Tomorrow morning: Ready for 9am review
- Tomorrow: Send after approval

**Next: Build it.**
