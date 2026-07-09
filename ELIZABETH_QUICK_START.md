# ⚡ Elizabeth AI Outreach Engine — Quick Start

## What You Just Got

Elizabeth is now ready to **automatically upload Apollo contacts → enrich them → get human approval → send personalized outreach**, with **comprehensive analytics like I Am Her**.

---

## 🚀 Quick Start in 5 Minutes

### Step 1: Start a Workflow (Import & Score)
```bash
curl -X POST http://localhost:5010/api/growth/elizabeth/workflow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "eventId": "event-id-here",
    "apolloProspects": [
      {
        "name": "Sarah Johnson",
        "email": "sarah@techcorp.com",
        "title": "VP Product",
        "company": "TechCorp Ltd",
        "location": "London",
        "industry": "Technology"
      }
    ],
    "autoApproveThreshold": 75
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "workflow": {
    "workflowId": "wf-xyz",
    "steps": [
      {"step": "import", "status": "completed", "count": 1},
      {"step": "enrich", "status": "completed", "count": 1},
      {"step": "score", "status": "completed", "count": 1},
      {"step": "auto_approve", "status": "completed", "count": 1},
      {"step": "draft_outreach", "status": "completed", "count": 1}
    ],
    "summary": {"imported": 1, "enriched": 1, "scored": 1, "drafted": 1}
  },
  "nextAction": "1 email draft ready for review. Go to Approval Queue..."
}
```

### Step 2: Review & Approve Drafts
```bash
# Get approval queue
curl http://localhost:5010/api/growth/elizabeth/approval-queue?eventId=event-id-here \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response shows pending drafts:
{
  "ok": true,
  "count": 1,
  "queue": [
    {
      "draft": {
        "id": "draft-1",
        "subject": "Sarah, let's talk about TechCorp's growth",
        "body": "Hi Sarah,\n\nI'm reaching out..."
      },
      "prospect": {
        "name": "Sarah Johnson",
        "email": "sarah@techcorp.com",
        "score": 82
      }
    }
  ]
}
```

### Step 3: Approve & Send
```bash
# Approve a draft
curl -X POST http://localhost:5010/api/growth/elizabeth/approval-queue/draft-1/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "sendImmediately": true
  }'
```

### Step 4: Track Performance
```bash
# Get analytics dashboard
curl http://localhost:5010/api/growth/outreach/analytics-dashboard?eventId=event-id-here \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response includes:
{
  "dashboard": {
    "pipelineCard": {...},
    "responseCard": {...},
    "insights": [
      {"type": "success", "message": "1 email approved and sent"},
      {"type": "info", "message": "Monitor for replies..."}
    ],
    "categoryCard": {...},
    "healthCheck": {...}
  }
}
```

### Step 5: View Frontend Dashboard
Navigate to:
```
http://localhost:5010/growth-platform/outreach-analytics?eventId=event-id-here
```

---

## 📊 What Elizabeth Does

| Step | What Happens | Time | Status |
|------|------------|------|--------|
| **1. Import** | Uploads contacts from Apollo/CSV | 10s | ✅ Automatic |
| **2. Enrich** | Adds company data, LinkedIn, etc. | 20s | ✅ Automatic (capped at 15) |
| **3. Score** | AI rates fit to your audience | 30s | ✅ Automatic |
| **4. Auto-Approve** | Auto-approves if score ≥ threshold | 5s | ✅ Automatic (configurable) |
| **5. Draft** | Generates personalized emails | 40s | ✅ Automatic |
| **6. Queue** | Stages for human review | 1s | ✅ Automatic |
| **7. Human Review** | YOU approve or reject | Variable | ⭐ **HUMAN GATE** |
| **8. Send** | Email goes out after approval | 2s | ✅ After approval |
| **9. Track** | Monitor replies & performance | Daily | ✅ Automatic |

---

## 🎯 Key Features

### ✅ Human-in-the-Loop
Nothing sends without your approval. Elizabeth only drafts & stages.

### ✅ Auto-Approve for High-Fit Prospects
Set `autoApproveThreshold: 75` to auto-approve prospects scoring 75+. Score <75 requires manual review.

### ✅ Smart Reply Classification
Automatically detects:
- `interested` → Hot lead
- `declined` → Suppression list
- `needs_call` → Sales team
- `auto_reply` → Out of office

### ✅ Analytics Like I Am Her
Track the complete funnel:
```
Imported 100 → Enriched 94 → Approved 75 → Sent 60 → Replied 12 → Interested 8
```

Get conversion rates at each stage:
- Import → Enriched: 94%
- Import → Approved: 75%
- Import → Interested: 8%

### ✅ Per-Category Performance
```
Guest:   50 prospects, 40 approved, 35 sent, 70% conversion ✓
Sponsor: 30 prospects, 20 approved, 15 sent, 50% conversion ✓
Media:   15 prospects, 10 approved, 8 sent, 53% conversion ✓
```

### ✅ Rate Limits & Safety
- Daily caps per category (20/day for guests)
- Apollo enrichment capped (15 max per run)
- Bounces & unsubscribes respected
- Full audit trail

---

## 🔗 API Endpoints

**Workflow:**
- `POST /api/growth/elizabeth/workflow` — Run full pipeline
- `GET /api/growth/elizabeth/approval-queue` — List pending drafts
- `POST /api/growth/elizabeth/approval-queue/:draftId/approve` — Approve & send
- `POST /api/growth/elizabeth/approval-queue/:draftId/reject` — Reject

**Analytics:**
- `GET /api/growth/outreach/analytics-dashboard` — Dashboard with insights
- `GET /api/growth/outreach/funnel-analytics` — Detailed funnel metrics

**Frontend:**
- Navigate to: `/growth-platform/outreach-analytics?eventId=xxx`

---

## 💡 Example Workflow

**You:** "Elizabeth, import top 50 tech CEOs and prepare to send"

**Elizabeth:**
1. Imports 50 contacts → 48 valid
2. Enriches 15 with Apollo data
3. Scores all 50 (0-100)
4. Auto-approves 35 scoring ≥75
5. Generates 35 personalized emails
6. Puts them in approval queue

**You:** Review approval queue
- See 35 pending emails
- Approve 33 (schedule over 2 days)
- Reject 2 (wrong fit)

**System:** Over next 2 days
- Sends 33 emails at rate-limited pace (20/day max for guests)
- Tracks opens, clicks, replies
- Auto-classifies responses

**You:** Check dashboard
- 33 sent ✓
- 8 replied (24% reply rate)
- 6 interested (75% of replies)
- 2 declined

**Elizabeth:** "Your reply rate is excellent. 6 hot leads ready for follow-up."

---

## 📋 Approval Queue Walkthrough

### See Pending Drafts
```bash
GET /api/growth/elizabeth/approval-queue?eventId=event-123
```

Shows:
- Draft subject & body
- Prospect name, email, company
- AI score & why they're recommended
- Created date

### Approve a Draft
```bash
POST /api/growth/elizabeth/approval-queue/draft-1/approve
{
  "sendImmediately": true  # or false + "scheduledFor": "2026-07-10T09:00Z"
}
```

✅ Approved drafts are sent or scheduled

### Reject a Draft
```bash
POST /api/growth/elizabeth/approval-queue/draft-1/reject
{
  "reason": "Need to adjust tone for this company"
}
```

❌ Rejected drafts are removed from outreach

---

## 📈 Analytics Dashboard Tabs

### Overview
- Pipeline size (imported, approved, sent)
- Response metrics (replied, interested, declined)
- Quick insights

### Funnel
- Waterfall chart (imported → interested)
- Conversion rates at each stage
- Which stage has highest drop-off

### Responses
- Pie chart of reply classifications
- Interested, declined, needs-call, etc.
- Action counts

### Category
- Performance by prospect type (guest, sponsor, media, etc.)
- Approval rate & send rate per category

### Insights
- Auto-generated alerts (warnings, successes)
- Actionable recommendations
- Next steps

### Health
- Pipeline flow status
- Email delivery status
- Data quality checks

---

## 🛡️ Safety Features

✅ **No Auto-Send** — All emails require human approval  
✅ **Suppression Honored** — Bounces & opt-outs respected  
✅ **Rate Limiting** — Max 20 emails/day per category  
✅ **Cost Controls** — Apollo enrichment capped at 15/run  
✅ **Email Verification** — Only verified addresses sent to  
✅ **Duplicate Prevention** — Same contact never sent twice  
✅ **Audit Trail** — Every action logged  
✅ **Auto-Reply Detection** — Out-of-office flagged  

---

## ❓ FAQ

**Q: Can I edit an email before approving it?**
A: Currently approves as-is. Future version will allow edit-before-send.

**Q: What if I want to approve all at once?**
A: Send a batch approve request (feature coming soon).

**Q: Can I reschedule a draft?**
A: Yes, after approval use the scheduler endpoints to change the send time.

**Q: What if my reply rate is low?**
A: Analytics dashboard will show which templates perform best. A/B test subject lines.

**Q: How much does Apollo enrichment cost?**
A: 15 per run (capped). Each contact = 1 enrichment credit (~$0.10 USD).

**Q: Can I integrate with my CRM?**
A: Yes, replies are stored in growthReplies table. Can be synced to any CRM via webhook.

---

## 📚 Full Documentation

- **Complete Workflow Guide:** `ELIZABETH_WORKFLOW_GUIDE.md`
- **Implementation Details:** `ELIZABETH_IMPLEMENTATION_SUMMARY.md`
- **API Reference:** `growth-elizabeth-workflow.ts` source code
- **Analytics Reference:** `growth-outreach-analytics.ts` source code

---

## 🎉 You're Ready!

**Now you have:**

✅ Apollo contact import  
✅ AI enrichment & scoring  
✅ Human approval gating  
✅ Funnel analytics (like I Am Her)  
✅ Real-time dashboard  
✅ Reply classification  
✅ Safety guards  

**Start with:**
```bash
POST /api/growth/elizabeth/workflow
```

**Then monitor:**
```
/growth-platform/outreach-analytics
```

**Questions? Check the workflow guide or dive into the API implementation files.**

---

**Built for you by Elizabeth. Let's fill your event! 🚀**
