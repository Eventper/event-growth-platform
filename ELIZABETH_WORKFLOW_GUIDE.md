
# Elizabeth AI Workflow: Apollo Import → Enrich → Approve → Send

## Overview

Elizabeth is the autonomous Growth Operator AI agent that handles the complete end-to-end workflow for contact management, outreach, and analytics. This guide shows how to use her for importing Apollo contacts, enriching them, getting approval, and tracking performance.

---

## Workflow Phases

### Phase 1: Import & Enrich Contacts from Apollo

**Endpoint:** `POST /api/growth/elizabeth/workflow`

Elizabeth automatically:
1. Imports contacts from Apollo API or CSV
2. Validates & creates prospects (status: "new")
3. Enriches with Apollo data (if desired)
4. Scores for fit to your event audience
5. Stages outreach drafts for human approval

**Request:**
```bash
curl -X POST http://localhost:5010/api/growth/elizabeth/workflow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "eventId": "event-123",
    "apolloProspects": [
      {
        "name": "Jane Smith",
        "email": "jane@company.com",
        "title": "CEO",
        "company": "TechCorp",
        "phone": "+44 20 1234 5678",
        "location": "London, UK",
        "industry": "Technology"
      }
    ],
    "autoApproveThreshold": 75,
    "sendAfterApproval": false
  }'
```

**Response:**
```json
{
  "ok": true,
  "workflow": {
    "workflowId": "wf-1719234567890",
    "eventId": "event-123",
    "ownerId": "user-xyz",
    "startedAt": "2026-07-09T10:30:00Z",
    "completedAt": "2026-07-09T10:35:00Z",
    "steps": [
      {
        "step": "import",
        "status": "completed",
        "detail": "Imported 15 contacts from Apollo",
        "count": 15
      },
      {
        "step": "enrich",
        "status": "completed",
        "detail": "Enriched 14/15 contacts",
        "count": 14,
        "errors": ["jane@invalid.com: Email validation failed"]
      },
      {
        "step": "score",
        "status": "completed",
        "detail": "Scored 15/15 contacts",
        "count": 15
      },
      {
        "step": "auto_approve",
        "status": "completed",
        "detail": "Auto-approved 12/15 high-fit prospects",
        "count": 12
      },
      {
        "step": "draft_outreach",
        "status": "completed",
        "detail": "Generated 12 outreach drafts (pending approval)",
        "count": 12
      }
    ],
    "summary": {
      "imported": 15,
      "enriched": 14,
      "scored": 15,
      "drafted": 12,
      "errors": []
    }
  },
  "nextAction": "12 email drafts ready for review. Go to Outreach > Approval Queue to review and send.",
  "approvalQueueUrl": "/growth-platform/outreach/approval-queue?eventId=event-123"
}
```

---

### Phase 2: Review & Approve Outreach Drafts

**Get Approval Queue:**
```bash
curl http://localhost:5010/api/growth/elizabeth/approval-queue?eventId=event-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "ok": true,
  "count": 12,
  "queue": [
    {
      "draft": {
        "id": "draft-1",
        "prospectId": "prospect-123",
        "eventId": "event-123",
        "status": "pending",
        "subject": "Jane, let's talk about TechCorp's growth",
        "body": "Hi Jane,\n\nI'm reaching out because TechCorp is doing interesting work in the London tech space...",
        "createdAt": "2026-07-09T10:34:00Z"
      },
      "prospect": {
        "id": "prospect-123",
        "name": "Jane Smith",
        "email": "jane@company.com",
        "title": "CEO",
        "company": "TechCorp"
      },
      "score": {
        "prospectId": "prospect-123",
        "score": 82,
        "compositeScore": 82,
        "reasons": ["Senior tech executive", "London-based", "High-growth company"]
      }
    }
    // ... more drafts
  ]
}
```

**Approve & Schedule a Draft:**
```bash
curl -X POST http://localhost:5010/api/growth/elizabeth/approval-queue/draft-1/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sendImmediately": false,
    "scheduledFor": "2026-07-10T09:00:00Z"
  }'
```

**Response:**
```json
{
  "ok": true,
  "message": "Email scheduled for 2026-07-10T09:00:00Z",
  "status": "scheduled_pending_approval"
}
```

**Reject a Draft (Optional):**
```bash
curl -X POST http://localhost:5010/api/growth/elizabeth/approval-queue/draft-1/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reason": "Need to adjust messaging for senior executive"
  }'
```

---

### Phase 3: Track Campaign Performance with Analytics

#### Overview Dashboard
```bash
curl http://localhost:5010/api/growth/outreach/analytics-dashboard?eventId=event-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Returns:**
- **Pipeline Overview**: Total imported, approved for outreach, emails sent
- **Response Metrics**: Total replies, interested, declined, needs follow-up
- **Critical Insights**: Warnings and successes based on performance
- **Category Performance**: Metrics by prospect category (guest, sponsor, media, etc.)
- **System Health**: Pipeline flow, email delivery, data quality checks

#### Funnel Analytics
```bash
curl http://localhost:5010/api/growth/outreach/funnel-analytics?eventId=event-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Returns:**
```json
{
  "ok": true,
  "funnelMetrics": {
    "imported": 100,
    "enriched": 94,
    "scored": 100,
    "approvedForOutreach": 75,
    "inSequence": 60,
    "replied": 12,
    "interested": 8,
    "declined": 3,
    "doNotContact": 1
  },
  "conversionRates": {
    "importToEnriched": 94,
    "importToApproved": 75,
    "importToReplied": 12,
    "importToInterested": 8,
    "sentToReplyRate": 20,
    "replyToInterestRate": 67
  },
  "emailPerformance": {
    "sent": 60,
    "bounced": 2,
    "delivered": 58,
    "unopened": 35,
    "opens": 23,
    "clicks": 5
  },
  "replyClassifications": {
    "interested": 8,
    "declined": 3,
    "needsCall": 1,
    "sendInfo": 0,
    "autoReply": 0,
    "other": 0
  },
  "perCategory": [
    {
      "category": "guest",
      "total": 50,
      "approved": 40,
      "enriched": 48,
      "interested": 5
    },
    {
      "category": "sponsor",
      "total": 30,
      "approved": 20,
      "enriched": 25,
      "interested": 2
    }
    // ...
  ],
  "topSegments": [
    {
      "segment": "Technology",
      "total": 35,
      "interested": 6,
      "approved": 28,
      "conversionRate": 17
    }
    // ...
  ]
}
```

---

## Key Features

### ✅ Approval Gating (Human-in-the-Loop)

Elizabeth stops at the email approval gate. Nothing sends automatically:

1. **Drafts Generated** → Status: `pending`
2. **Human Reviews** → Approves or rejects
3. **Approved Drafts** → Status: `approved` or `scheduled_pending_approval`
4. **Scheduled or Sent** → Only after human confirms

### ✅ Auto-Approve High-Fit Prospects

Set `autoApproveThreshold` to automatically approve prospects scoring above that score:
- Score 75+ → Auto-approved
- Score 50-74 → Manual review needed
- Score <50 → Likely not right fit

### ✅ Rich Analytics Like I Am Her

Track the complete funnel:
- **Imported**: Initial contacts uploaded
- **Enriched**: Apollo data added
- **Scored**: AI fit scoring complete
- **Approved**: Human approved for outreach
- **Sent**: Email went out
- **Replied**: Got a response
- **Interested**: Positive response

### ✅ Reply Classification

Automatic AI classification of replies:
- `interested` → Flag for conversion
- `declined` → Add to suppression list
- `needs_call` → Flag for manual follow-up
- `send_information` → Auto-respond with details
- `auto_reply` → Out of office, etc.

### ✅ Per-Category Performance

See how each prospect category performs:
- Guest
- Sponsor
- Media
- Hotel
- Civic
- Introducer

---

## Frontend Interface

### Outreach Analytics Page
Navigate to: `/growth-platform/outreach-analytics?eventId=event-123`

**Tabs:**
1. **Overview** - Pipeline & response metrics at a glance
2. **Funnel** - Conversion waterfall chart & rates
3. **Responses** - Reply classification pie chart
4. **Category** - Performance by prospect type
5. **Insights** - Critical alerts & opportunities
6. **Health** - System health checks

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/growth/elizabeth/workflow` | Start Apollo import → enrich → approve workflow |
| `GET` | `/api/growth/elizabeth/approval-queue` | Get pending drafts for review |
| `POST` | `/api/growth/elizabeth/approval-queue/:draftId/approve` | Approve & schedule a draft |
| `POST` | `/api/growth/elizabeth/approval-queue/:draftId/reject` | Reject a draft |
| `GET` | `/api/growth/outreach/analytics-dashboard` | Dashboard with critical metrics & insights |
| `GET` | `/api/growth/outreach/funnel-analytics` | Detailed funnel conversion rates |
| `GET` | `/api/growth/outreach/dashboard` | Quick status counts |
| `GET` | `/api/growth/outreach/analytics` | Reply rate by category & subject |

---

## Workflow Example: Complete Journey

1. **User:** "Elizabeth, import the top 100 tech CEOs from Apollo for my event"
   - Elizabeth calls `/api/growth/elizabeth/workflow`
   - Imports 100 contacts → Enriches 98 → Scores all → Generates 75 drafts

2. **User:** Reviews approval queue
   - Sees 75 pending email drafts
   - Approves 70, rejects 5 (wrong fit)

3. **System:** Schedules approved emails
   - 70 emails scheduled to send over 5 business days
   - Rate-limited: 20/day for guest category

4. **User:** Monitors analytics
   - Day 1: 20 emails sent, 3 replies (15% reply rate)
   - Day 3: 40 emails sent, 8 replies (20% reply rate)
   - Day 5: 70 emails sent, 14 replies (20% overall)

5. **Elizabeth:** Suggests next actions
   - "8 positive replies — these are hot leads"
   - "3 declined — added to suppression"
   - "14 active conversations in pipeline"

---

## Best Practices

✅ **Do:**
- Review auto-approved prospects before sending
- Set realistic approval thresholds (60-80)
- Monitor analytics daily
- Respond quickly to positive replies
- Use category-specific messaging

❌ **Don't:**
- Auto-send without human approval
- Import unverified email lists
- Send outside business hours
- Ignore low reply rates (test messaging)
- Approve low-scoring prospects to hit targets

---

## Rate Limiting & Safeguards

- **Daily send caps** per category:
  - Guest: 20/day
  - Sponsor: 5/day
  - Media: 5/day
  - Hotel: 3/day
  - Other: 2/day

- **Apollo enrichment**: Capped at 15 credits per workflow run
- **Email approvals**: All require human confirmation
- **Suppression honored**: Bounces & unsubscribes respected

---

## Troubleshooting

**Q: My drafts aren't generating**
A: Check that prospects are "approved_for_outreach" status and have verified emails

**Q: Reply rate is low (< 5%)**
A: Test different subject lines or messaging. Run /api/growth/outreach/analytics to see which templates perform best

**Q: Some emails auto-approved but I didn't want that**
A: Lower the autoApproveThreshold or set it to a very high score (e.g., 95) to require manual review

**Q: Can I reschedule a draft?**
A: Yes, use the scheduler endpoints in growth-platform-routes.ts to change scheduled_for dates

---

## Next Steps

1. **Upload your first batch** via the workflow endpoint
2. **Review the approval queue** and approve/reject drafts
3. **Monitor the analytics dashboard** for performance
4. **Adjust messaging** based on reply classifications
5. **Iterate & scale** with Elizabeth's recommendations
