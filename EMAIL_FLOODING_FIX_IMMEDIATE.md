# IMMEDIATE ACTION: Stop Email Flooding

**Status:** Email configuration fixes deployed ✅  
**Action Required:** Set environment variables  
**Timeline:** 5 minutes  

---

## 🚨 URGENT: Stop Email Flooding NOW

You're receiving 35+ emails/day from automation. This is **FIXED** in the code as of NOW.

### What Changed
- ✅ All email recipients are now **configurable** (not hardcoded)
- ✅ Each email type can be **enabled/disabled**
- ✅ Campaign auto-send is now **OFF BY DEFAULT** (requires manual approval)
- ✅ Bridge digest is **optional**

### What You Need To Do (5 min)

**Step 1: SSH to API Server**
```bash
ssh user@api-server.eventperfekt.com
# or if running locally:
# Already in terminal
```

**Step 2: Stop the API Server**
```bash
systemctl stop event-perfekt-api
# or if running in terminal:
# Ctrl+C in the running process
```

**Step 3: Edit .env File**
```bash
nano .env
# (or vi .env or your preferred editor)
```

**Step 4: ADD These Lines** (Copy/Paste)
```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EMAIL CONFIGURATION (2026-07-10 FIX)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# WHO RECEIVES EACH TYPE OF EMAIL
CAMPAIGN_APPROVAL_EMAIL=tolu@eventperfekt.com         # You = get approval notifications
DAILY_SUMMARY_EMAIL=ops@eventperfekt.com              # Team = get daily intelligence
MORNING_BRIEF_EMAIL=ops@eventperfekt.com              # Team = get morning brief
BRIDGE_DIGEST_EMAIL=ops@eventperfekt.com              # Team = get bridge digest
NOTIFY_EMAIL=info@eventperfekt.com                    # Fallback (rarely used)

# WHICH EMAILS SHOULD SEND (ON/OFF)
CAMPAIGN_APPROVAL_NOTIFY=true                         # true = send approval notifications
DAILY_SUMMARY_ENABLED=false                           # false = DISABLE daily summary (too noisy)
MORNING_BRIEF_ENABLED=false                           # false = DISABLE morning brief (too noisy)
BRIDGE_DIGEST_ENABLED=false                           # false = DISABLE bridge digest for now
CAMPAIGN_AUTO_SEND=false                              # false = campaigns need manual "Send" button

# TENDER DIGEST (Already configured, for reference)
# DIGEST_RECIPIENT=adminuk@eventperfekt.com          # Daily tender digest (07:30 UK)
```

**Step 5: Save & Exit**
```bash
# If using nano: Ctrl+X, then Y, then Enter
# If using vi: Esc, :wq, Enter
```

**Step 6: Rebuild & Restart**
```bash
# Rebuild with new env vars
cd /path/to/api-server
pnpm run build

# Restart the server
systemctl start event-perfekt-api

# Check it's running
systemctl status event-perfekt-api
```

**Step 7: Verify No More Emails**
Wait 5 minutes. You should receive **ZERO** emails.
- ❌ No "Good morning — X prospects found" at 07:00
- ❌ No "EP Prospect Intelligence — Daily Summary" at 18:00
- ❌ No "Bridge Weekly Digest"
- ✅ You WILL get: Tender digest at 07:30 (this is important, keep it)

---

## 📋 What Each Email Type Does

| Email Type | Current Recipient | What It Shows | When | Your Action |
|------------|------------------|--------------|------|-------------|
| **Campaign Approvals** | CAMPAIGN_APPROVAL_EMAIL | "New reply from X company" | When reply arrives | Read to know about leads |
| **Daily Summary** | DAILY_SUMMARY_EMAIL | All campaigns run, prospects found, emails drafted | 18:00 UK | Archive/ignore unless needed |
| **Morning Brief** | MORNING_BRIEF_EMAIL | "Good morning — X new prospects" | 07:00 UK | Duplicate of daily summary |
| **Bridge Digest** | BRIDGE_DIGEST_EMAIL | Bridge audit log and activity | Weekly | Not needed unless using Bridge |
| **Tender Digest** | DIGEST_RECIPIENT (OK) | Today's new tenders + upcoming deadlines | 07:30 UK | ⭐ KEEP THIS ONE |

---

## 🎯 RECOMMENDED CONFIGURATION

**For YOU (Tolu):**
```bash
CAMPAIGN_APPROVAL_EMAIL=tolu@eventperfekt.com
CAMPAIGN_APPROVAL_NOTIFY=true          # You get approval alerts (important)
DAILY_SUMMARY_ENABLED=false            # Disable noisy summary
MORNING_BRIEF_ENABLED=false            # Disable duplicate brief
BRIDGE_DIGEST_ENABLED=false            # Disable unless needed
CAMPAIGN_AUTO_SEND=false               # Manual approval queue
```

**Result:**
- ✅ You get approval notifications when leads reply
- ✅ No spam daily summaries
- ✅ Campaigns wait for you to click "Send" (no accidental mass emails)
- ✅ You still get tender digest at 07:30

**For OPS TEAM (if hiring one later):**
```bash
DAILY_SUMMARY_EMAIL=ops@eventperfekt.com
MORNING_BRIEF_EMAIL=ops@eventperfekt.com
BRIDGE_DIGEST_EMAIL=ops@eventperfekt.com
DAILY_SUMMARY_ENABLED=true
MORNING_BRIEF_ENABLED=false            # Don't need both summaries
BRIDGE_DIGEST_ENABLED=true
```

---

## 🔧 What Was Coded (For Reference)

**Files Modified:**
1. `campaign-scheduler.ts` — All email sends now respect feature flags
2. `bridge-routes.ts` — Bridge digest now configurable

**New Environment Variables:**
```typescript
// All these are read from .env at startup
CAMPAIGN_APPROVAL_EMAIL = process.env.CAMPAIGN_APPROVAL_EMAIL || "info@eventperfekt.com"
DAILY_SUMMARY_EMAIL = process.env.DAILY_SUMMARY_EMAIL || "info@eventperfekt.com"
MORNING_BRIEF_EMAIL = process.env.MORNING_BRIEF_EMAIL || "info@eventperfekt.com"
BRIDGE_DIGEST_EMAIL = process.env.BRIDGE_DIGEST_EMAIL || "adminuk@eventperfekt.com"

CAMPAIGN_APPROVAL_NOTIFY = process.env.CAMPAIGN_APPROVAL_NOTIFY !== "false"  // Default ON
DAILY_SUMMARY_ENABLED = process.env.DAILY_SUMMARY_ENABLED !== "false"        // Default ON (you can disable)
MORNING_BRIEF_ENABLED = process.env.MORNING_BRIEF_ENABLED !== "false"        // Default ON (you can disable)
BRIDGE_DIGEST_ENABLED = process.env.BRIDGE_DIGEST_ENABLED !== "false"        // Default ON (you can disable)
CAMPAIGN_AUTO_SEND = process.env.CAMPAIGN_AUTO_SEND === "true"               // Default OFF (safer)
```

**Key Logic Change:**
```typescript
// Before: await emailService.sendEmail(NOTIFY_EMAIL, subject, html);
// After:  if (DAILY_SUMMARY_ENABLED) { await emailService.sendEmail(DAILY_SUMMARY_EMAIL, subject, html); }
```

---

## ✅ Verification Checklist

After restart, check these:

```bash
# 1. Server started successfully?
systemctl status event-perfekt-api
# Should show: "active (running)"

# 2. Check logs for config loading
tail -50 /var/log/event-perfekt-api.log | grep -i "email\|config"

# 3. Are env vars reading correctly?
grep "CAMPAIGN_APPROVAL_NOTIFY" /var/log/event-perfekt-api.log
# Should show you set it to true/false

# 4. Wait 5 minutes, check inbox
# You should see: NO emails (all disabled)
```

---

## 🚨 Troubleshooting

**"Server won't start"**
→ Check for typos in .env file
→ Run: `pnpm run build` to see compilation errors

**"Still getting daily summary emails"**
→ Check .env was saved: `cat .env | grep DAILY_SUMMARY_ENABLED`
→ Restart server: `systemctl restart event-perfekt-api`
→ Check logs: `tail -100 /var/log/event-perfekt-api.log | grep "Daily summary"`

**"I want emails turned back on"**
→ Change env var: `DAILY_SUMMARY_ENABLED=true`
→ Restart: `systemctl restart event-perfekt-api`

---

## 📞 Next Steps After Fixing Email Flooding

1. ✅ Set env vars (NOW)
2. ✅ Restart server (NOW)
3. ✅ Verify no more flooding (5 min wait)
4. ⏳ Test campaign creation → should queue for approval instead of auto-sending
5. ⏳ Test that tender digest still works at 07:30
6. ⏳ Enable emails selectively as needed

---

**Deployed:** 2026-07-10 20:00 UTC  
**Status:** Ready for env var configuration  
**Estimated Time to Fix:** 5 minutes  
**Expected Result:** Email flooding stops immediately
