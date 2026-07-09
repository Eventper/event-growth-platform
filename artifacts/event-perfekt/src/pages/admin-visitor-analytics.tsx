import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import PlannerSidebar from "@/components/PlannerSidebar";
import { useAuth } from "@/lib/auth";
import {
  Eye, Users, Mail, Globe, TrendingUp, MapPin, ExternalLink, ChevronDown, RefreshCw, Download, Bell, BellRing,
  Filter, Link, X, Bot, User, Send, Loader2, MessageSquare, Wand2
} from "lucide-react";

const BRAND = "#330311";
const GOLD = "#C9A961";

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "24px 20px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", borderTop: `3px solid ${BRAND}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ background: BRAND, borderRadius: 8, padding: 8 }}>
          <Icon style={{ color: "#fff", width: 16, height: 16 }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color: BRAND, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Pill({ text, color = "#f3f4f6" }: { text: string; color?: string }) {
  return (
    <span style={{ background: color, color: "#333", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>{text}</span>
  );
}

// Safe display helper — never show NaN
function safeDisplay(value: any, fallback = "Not enough data yet"): string {
  if (value === null || value === undefined || value === "" || Number.isNaN(value) || value === Infinity || value === -Infinity) return fallback;
  if (typeof value === "number") return String(value);
  return String(value);
}

// Priority label mapping
function priorityLabel(priority: number): { label: string; color: string; bg: string } {
  if (priority >= 90) return { label: "Critical", color: "#991b1b", bg: "#fee2e2" };
  if (priority >= 70) return { label: "High", color: "#166534", bg: "#dcfce7" };
  if (priority >= 50) return { label: "Medium", color: "#1e40af", bg: "#dbeafe" };
  return { label: "Opportunity", color: "#6b7280", bg: "#f3f4f6" };
}

// Confidence mapping
function confidenceFromPriority(priority: number): string {
  if (priority >= 70) return "High";
  if (priority >= 50) return "Medium";
  return "Low";
}

// ── Executive Overview ───────────────────────────────
function ExecutiveOverview({
  funnel, sources, captures, views, iamherViews, topSource,
  selloutRate, effectiveRate, momentum, daysToEvent,
  dailyVisitors, projectedVisitors, projectedSales, revenueGap,
  capacity, stageLosses, bestSource, worstSource,
  instagramSessions, directSessions, totalSourceSessions,
  captureRate, accessViews, ctaToFormDrop, accessDropOff,
}: any) {
  const f = funnel || {};
  const visitors = f.visitors || 0;
  const ctaClicks = f.cta_clicks || 0;
  const submitSuccess = f.submit_success || 0;
  const effectiveConversions = submitSuccess + (f.interest_captures || 0);
  const hasVenue = f.venue !== "TBC" && f.venue !== "";

  // Campaign Status
  let campaignStatus = "Building awareness";
  if (visitors === 0 && views === 0) campaignStatus = "No visitors yet — campaign not launched";
  else if (visitors > 0 && effectiveConversions === 0) campaignStatus = "Interest is building, but conversion is weak";
  else if (selloutRate >= 70) campaignStatus = "Strong trajectory — on track to sell out";
  else if (selloutRate >= 30) campaignStatus = "Momentum building — push to reach capacity";
  else if (Number(momentum) < -20) campaignStatus = "Traffic dropping — action needed urgently";

  // What This Means
  let whatThisMeans = "People are visiting the I Am Her pages, but they are not yet giving contact details or taking action. The issue is not awareness. The issue is conversion.";
  if (visitors === 0 && views === 0) whatThisMeans = "No traffic has been recorded. The campaign needs to be launched with shared links and social posts to begin collecting data.";
  else if (selloutRate >= 70) whatThisMeans = `You are on track to sell ${projectedSales} tickets. The funnel is working. Focus on capturing overflow demand and nurturing the waitlist.`;
  else if (effectiveConversions === 0 && visitors > 0) whatThisMeans = `People are visiting (${visitors} visitors) but no one is converting. The CTA may be too weak, the form too long, or the offer not compelling enough.`;
  else if (Number(momentum) < -20) whatThisMeans = `Traffic has dropped ${momentum}% week-over-week. Without intervention, you will miss sellout by ${Math.ceil((capacity - Math.round((dailyVisitors || 0) * daysToEvent * (Number(effectiveRate) / 100))))} tickets.`;

  // Main Risk
  let mainRisk = "If we continue to attract visitors without capturing emails, we will lose warm interest and have no way to follow up.";
  if (selloutRate >= 70) mainRisk = "If overflow demand is not captured, you lose revenue and future event interest.";
  else if (visitors === 0) mainRisk = "No data means no ability to optimise. Every day without traffic is a day closer to the event with no bookings.";
  else if (effectiveConversions === 0) mainRisk = "Every visitor who leaves without converting is a lost sale. At £75 per ticket, this is measurable revenue walking away.";
  else if (Number(momentum) < -20) mainRisk = "Declining traffic means declining interest. Without a campaign push, the event will not reach capacity.";

  // Main Opportunity
  let mainOpportunity = "Direct traffic is high, which means people are already hearing about the brand. We should now focus on converting existing awareness into access requests, story submissions and partner enquiries.";
  if (instagramSessions / (totalSourceSessions || 1) > 0.3) mainOpportunity = "Instagram is your highest-performing channel. Double down on Stories, Reels, and link stickers while the algorithm is warm.";
  else if (directSessions / (totalSourceSessions || 1) > 0.3) mainOpportunity = "Word-of-mouth is spreading. Add a referral incentive to turn organic sharing into measurable bookings.";
  else if (bestSource && worstSource && bestSource.convRate > (worstSource.convRate || 0) * 2) mainOpportunity = `${bestSource.source} converts ${(bestSource.convRate / (worstSource.convRate || 1)).toFixed(1)}x better than ${worstSource.source}. Reallocate budget to the winning channel immediately.`;
  else if (effectiveConversions === 0 && visitors > 0) mainOpportunity = "Even small conversion improvements yield big returns. A 3% conversion rate would generate revenue from existing traffic without spending more on ads.";

  // Top 3 Actions
  const top3Actions = [];
  if (effectiveConversions === 0 && visitors > 10) {
    top3Actions.push("Add a stronger lead capture offer on /iamher");
  }
  if (ctaToFormDrop > 30) {
    top3Actions.push("Fix the form drop-off — reduce fields and add a progress bar");
  }
  if (accessDropOff > 50) {
    top3Actions.push("Improve the CTA on /access — make it sticky and urgent");
  }
  if (instagramSessions === 0 && totalSourceSessions > 10) {
    top3Actions.push("Launch Instagram content with UTM links on every post");
  }
  if (directSessions / (totalSourceSessions || 1) > 0.5) {
    top3Actions.push("Add a ‘How did you hear about us?’ dropdown to capture attribution");
  }
  if (Number(captureRate) < 0.5 && views > 50) {
    top3Actions.push("Trigger a popup after 15s with a compelling welcome offer");
  }
  if (stageLosses && stageLosses.length > 0 && Number(stageLosses[0].rate) > 50) {
    top3Actions.push(`Fix the ${stageLosses[0].stage} stage — ${stageLosses[0].rate}% of visitors are dropping off here`);
  }
  if (top3Actions.length === 0) {
    top3Actions.push("Share /iamher on Instagram with a UTM-tagged link");
    top3Actions.push("Email your list with a countdown to the event");
    top3Actions.push("Test the booking form on mobile to check for friction");
  }

  const finalActions = top3Actions.slice(0, 3);

  // Today's Priority
  let todayPriority = "Fix email capture immediately. This is the fastest way to stop losing warm visitors.";
  if (visitors === 0 && views === 0) todayPriority = "Share the /iamher page on your social channels with a UTM link. Start generating traffic.";
  else if (selloutRate >= 70) todayPriority = "Set up a waitlist page for overflow demand. Capture emails from people who cannot buy a ticket.";
  else if (effectiveConversions === 0 && visitors > 0) todayPriority = "Test the booking form yourself. Check how many clicks it takes to convert.";
  else if (Number(momentum) < -20) todayPriority = "Launch a flash campaign: 48-hour early-bird price. Email your list and post 2x on Instagram Stories.";
  else if (ctaToFormDrop > 30) todayPriority = "Reduce the form to 3 fields (Name, Email, Phone) and add a progress bar.";

  // This Week's Priority
  let weekPriority = "Run founder-led content and partnership outreach while tracking every link.";
  if (visitors === 0 && views === 0) weekPriority = "Post 3x per week on Instagram with UTM links. Run a £20 test ad to a lookalike audience.";
  else if (instagramSessions / (totalSourceSessions || 1) > 0.3) weekPriority = "Double Instagram content: daily Stories, 2 Reels, 1 feed post. Add link stickers to every Story.";
  else if (directSessions / (totalSourceSessions || 1) > 0.3) weekPriority = "Launch a referral programme: Bring a friend, both get a welcome gift. Create referral tracking links.";
  else if (bestSource && worstSource) weekPriority = `Reallocate budget: increase spend on ${bestSource.source} (${bestSource.convRate}% conversion), pause or fix ${worstSource.source} (${worstSource.convRate}% conversion).`;
  else if (effectiveConversions === 0) weekPriority = "A/B test the CTA text and colour. Add social proof and a countdown timer to the page.";

  // Expected Impact
  let expectedImpact = "Better capture and tracking should increase measurable enquiries and show which channels are worth investing in.";
  if (effectiveConversions === 0 && visitors > 0) expectedImpact = `Even a 3% conversion rate would generate ${Math.round(visitors * 0.03)} sales from existing traffic = £${Math.round(visitors * 0.03 * 75)} without extra ad spend.`;
  else if (selloutRate >= 70) expectedImpact = "Capturing waitlist demand will build a warm audience for the next event and future revenue.";
  else if (revenueGap > 0) expectedImpact = `Closing the conversion gap could recover £${revenueGap.toLocaleString()} in potential revenue from the same traffic.`;

  // Confidence Level
  const hasEnoughData = visitors > 0 || views > 0;
  let confidenceLevel = "High";
  if (visitors === 0 && views === 0) confidenceLevel = "Low — no data available";
  else if (visitors < 20) confidenceLevel = "Medium — limited data, recommendations based on early signals";

  const confidenceColor = confidenceLevel.startsWith("High") ? "#16a34a" : confidenceLevel.startsWith("Medium") ? "#C9A961" : "#dc2626";

  return (
    <div style={{ background: "linear-gradient(135deg, #330311 0%, #1a0510 100%)", color: "#fff", borderRadius: 14, padding: "28px 32px", marginBottom: 28, boxShadow: "0 16px 50px rgba(51,3,17,0.3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ background: GOLD, borderRadius: 10, padding: 8 }}>
          <TrendingUp style={{ width: 20, height: 20, color: BRAND }} />
        </div>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: GOLD, fontWeight: 800, marginBottom: 4 }}>Growth Council / Executive Overview</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>I Am Her Campaign — Strategic Assessment</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {/* Campaign Status */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Campaign Status</div>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>{campaignStatus}</div>
        </div>

        {/* What This Means */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>What This Means</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>{whatThisMeans}</div>
        </div>

        {/* Main Risk */}
        <div style={{ background: "rgba(220,38,38,0.12)", borderRadius: 12, padding: "18px 20px", border: "1px solid rgba(220,38,38,0.2)" }}>
          <div style={{ fontSize: 10, color: "#fca5a5", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Main Risk</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>{mainRisk}</div>
        </div>

        {/* Main Opportunity */}
        <div style={{ background: "rgba(22,163,74,0.12)", borderRadius: 12, padding: "18px 20px", border: "1px solid rgba(22,163,74,0.2)" }}>
          <div style={{ fontSize: 10, color: "#86efac", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Main Opportunity</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>{mainOpportunity}</div>
        </div>

        {/* Top 3 Actions */}
        <div style={{ gridColumn: "1 / -1", background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Top 3 Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {finalActions.map((action, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ background: GOLD, color: BRAND, borderRadius: 999, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>{action}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Priorities row */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Today’s Priority</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>{todayPriority}</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>This Week’s Priority</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>{weekPriority}</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Expected Impact</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>{expectedImpact}</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Confidence Level</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: confidenceColor }}>{confidenceLevel}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
            {hasEnoughData ? `Based on ${views} views and ${visitors} sessions` : "Not enough data yet"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── What-If Scenario Tool ─────────────────────────────────────────────
function WhatIfScenario({ currentVisitors, currentCtaRate, currentSubmitRate, currentCaptures, currentViews }: any) {
  const [scenario, setScenario] = useState<"traffic" | "cta" | "conversion" | "spend">("traffic");
  const [boost, setBoost] = useState(50);

  const boostedVisitors = Math.round(currentVisitors * (1 + boost / 100));
  const boostedCtaClicks = Math.round(boostedVisitors * (currentCtaRate / 100));
  const boostedSubmissions = Math.round(boostedVisitors * (currentSubmitRate / 100));
  const boostedCaptures = Math.round(currentCaptures * (1 + boost / 100));

  const deltaVisitors = boostedVisitors - currentVisitors;
  const deltaSubmissions = boostedSubmissions - Math.round(currentVisitors * (currentSubmitRate / 100));

  const scenarios = {
    traffic: {
      label: "Boost traffic by",
      icon: "🚀",
      what: "What if you double your Instagram posts and run a £50 Facebook ad?",
      result: `${boostedVisitors} visitors (+${deltaVisitors}) → ${boostedSubmissions} submissions (+${deltaSubmissions})`,
      action: "Post 2x daily on Instagram Stories with UTM tags. Target: 18-45 women in UK.",
      cost: "£50",
    },
    cta: {
      label: "Improve CTA by",
      icon: "💡",
      what: "What if you change your CTA to \u201cOnly 12 Platinum tickets left — secure yours now\u201d?",
      result: `CTA rate: ${currentCtaRate}% → ${currentCtaRate + boost / 10}% → ${Math.round(boostedVisitors * ((currentCtaRate + boost / 10) / 100))} clicks`,
      action: "Update the CTA button on /iamher and /access pages. Use urgency + scarcity.",
      cost: "Free",
    },
    conversion: {
      label: "Improve conversion by",
      icon: "🔄",
      what: "What if you add a welcome gift incentive to the form?",
      result: `Submit rate: ${currentSubmitRate}% → ${currentSubmitRate + boost / 20}% → ${Math.round(boostedVisitors * ((currentSubmitRate + boost / 20) / 100))} submissions`,
      action: "Add \u201cGet a free welcome pack at check-in\u201d to the form. A/B test vs current version.",
      cost: "£3-5 per attendee",
    },
    spend: {
      label: "Increase ad spend by",
      icon: "💰",
      what: "What if you increase Facebook/Instagram ad spend?",
      result: `£${boost} extra spend → ~${Math.round(boost / 2)} extra visitors → ~${Math.round((boost / 2) * (currentSubmitRate / 100))} extra submissions`,
      action: "Run a lookalike audience campaign based on your email list. Target: UK women 25-45.",
      cost: `£${boost}`,
    },
  };

  const s = scenarios[scenario];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {Object.entries(scenarios).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setScenario(key as any)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid",
              borderColor: scenario === key ? BRAND : "#e5e7eb",
              background: scenario === key ? BRAND : "#fff",
              color: scenario === key ? "#fff" : "#374151",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {val.icon} {val.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
          <strong style={{ color: BRAND }}>{s.icon} {s.what}</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{s.label}:</span>
          <input
            type="range"
            min={10}
            max={200}
            value={boost}
            onChange={e => setBoost(Number(e.target.value))}
            style={{ flex: 1, accentColor: BRAND }}
          />
          <span style={{ fontSize: 14, fontWeight: 800, color: BRAND, minWidth: 50 }}>{boost}%</span>
        </div>
      </div>

      <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "16px 18px", border: "1px solid #bbf7d0", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>📊 Projected Result</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#166534" }}>{s.result}</div>
      </div>

      <div style={{ background: "#eff6ff", borderRadius: 10, padding: "14px 18px", border: "1px solid #bfdbfe", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>🚀 Recommended Action</div>
        <div style={{ fontSize: 12, color: "#1e40af", lineHeight: 1.5 }}>{s.action}</div>
      </div>

      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#6b7280" }}>
        <span>Estimated cost: <strong style={{ color: BRAND }}>{s.cost}</strong></span>
        <span>ROI: <strong style={{ color: "#16a34a" }}>
          {scenario === "cta" || scenario === "conversion" ? "High (free or low cost)" : scenario === "spend" ? `~${Math.round((deltaSubmissions * 50) / (boost || 1))}x` : "Medium"}
        </strong></span>
      </div>
    </div>
  );
}

// ── Next Action Engine ───────────────────────────────────────────────
function NextActionEngine({ funnel, sources, captures, views, iamherViews, topSource }: any) {
  const f = funnel || {};
  const visitors = f.visitors || 0;
  const ctaClicks = f.cta_clicks || 0;
  const submitSuccess = f.submit_success || 0;
  const interestCaptures = f.interest_captures || 0;
  const effectiveConversions = submitSuccess + interestCaptures;
  const ctaRate = Number(f.cta_rate || 0);
  const submitRate = Number(f.submit_rate || 0);
  const effectiveRate = f.visitors ? ((effectiveConversions / f.visitors) * 100).toFixed(1) : "0";

  const instagramSessions = (sources || []).filter((s: any) => {
    const src = (s.source || "").toLowerCase();
    return src.includes("instagram") || src === "ig" || src === "insta";
  }).reduce((sum: number, s: any) => sum + (s.sessions || 0), 0);
  const directSessions = (sources || []).filter((s: any) => (s.source || "").toLowerCase() === "direct").reduce((sum: number, s: any) => sum + (s.sessions || 0), 0);
  const totalSessions = (sources || []).reduce((sum: number, s: any) => sum + (s.sessions || 0), 0);

  // Priority scoring
  const priorities: Array<{ score: number; icon: string; title: string; text: string; action: string; link: string; urgency: string }> = [];

  if (visitors < 20) {
    priorities.push({
      score: 80,
      icon: "🚀",
      title: "Traffic is low",
      text: `${visitors} visitors in ${views} page views. Trackable traffic is still building.`,
      action: "Share the /iamher page on Instagram, LinkedIn, and email with UTM tags so you can see which channel brings the most visitors.",
      link: "https://instagram.com",
      urgency: "Today",
    });
  }

  if (ctaRate < 3 && visitors > 10) {
    priorities.push({
      score: 80,
      icon: "💡",
      title: "CTA engagement is low",
      text: `${ctaRate}% of visitors click the CTA. ${visitors - ctaClicks} visitors leave without clicking.`,
      action: "Change the CTA on /iamher to: \u201cSecure your spot — limited to 100 women. 30 October.\u201d Make it a burgundy button above the fold.",
      link: "/iamher",
      urgency: "Today",
    });
  }

  if (Number(effectiveRate) < 2 && ctaClicks > 0) {
    priorities.push({
      score: 75,
      icon: "🔄",
      title: "Form drop-off detected",
      text: `${ctaClicks} clicked the CTA but only ${effectiveConversions} converted (${effectiveRate}%). ${Math.round(((ctaClicks - effectiveConversions) / ctaClicks) * 100)}% are dropping off at the form.`,
      action: "Add \u201cGet a free welcome pack + early access to networking\u201d as a form incentive. Reduce fields to 3: Name, Email, Phone.",
      link: "/access",
      urgency: "This week",
    });
  }

  if (instagramSessions === 0 && totalSessions > 5) {
    priorities.push({
      score: 70,
      icon: "📸",
      title: "Instagram is missing",
      text: "Zero tracked Instagram sessions. Either you're not posting links, or you're not using UTM tags.",
      action: "Add UTM tags to every link you share. Use the Source Analytics page for ready-to-copy tagged links.",
      link: "/admin/iamher",
      urgency: "This week",
    });
  }

  if (directSessions / totalSessions > 0.5 && totalSessions > 10) {
    priorities.push({
      score: 60,
      icon: "❤️",
      title: "Capitalise on direct traffic",
      text: `${directSessions} of ${totalSessions} sessions are direct — people know your brand. But you can't track where they heard about you.`,
      action: "Add a \u201cHow did you hear about us?\u201d dropdown to the form. Options: Instagram, LinkedIn, Friend, Email, Other. This unlocks attribution.",
      link: "/access",
      urgency: "This week",
    });
  }

  if (iamherViews > 0 && iamherViews / views < 0.3) {
    priorities.push({
      score: 65,
      icon: "📈",
      title: "Push more traffic to I Am Her",
      text: `I Am Her pages get ${iamherViews} of ${views} total views (${Math.round((iamherViews / views) * 100)}%). Most traffic is going elsewhere.`,
      action: "Update your Instagram bio, email signature, and LinkedIn posts to point to /iamher instead of the homepage. The homepage is a distraction.",
      link: "/iamher",
      urgency: "This week",
    });
  }

  // If no issues, push a growth action
  if (priorities.length === 0) {
    priorities.push({
      score: 50,
      icon: "🚀",
      title: "Scale what's working",
      text: "Your funnel is healthy. Now it's time to pour fuel on the fire.",
      action: "Run a £100 Facebook lookalike audience campaign targeting women 25-45 in London, Birmingham, and Birmingham. Use the email list as a custom audience seed.",
      link: "https://business.facebook.com",
      urgency: "This week",
    });
  }

  // Sort by score descending
  const sorted = priorities.sort((a, b) => b.score - a.score);
  const top = sorted[0];

  return (
    <div>
      {/* Top Priority — Big Card */}
      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 22px", border: "1px solid rgba(255,255,255,0.12)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 28 }}>{top.icon}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{top.title}</div>
            <div style={{ fontSize: 11, color: GOLD, fontWeight: 600 }}>⚡ {priorityLabel(top.score).label} · Do this {top.urgency.toLowerCase()}</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, marginBottom: 14 }}>{top.text}</div>
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>💠 Top insight</div>
          <div style={{ fontSize: 13, color: "#fff", lineHeight: 1.5, fontWeight: 500 }}>{top.action}</div>
        </div>
        <button
          onClick={() => window.open(top.link, "_blank")}
          style={{ background: GOLD, color: "#1A0A0E", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          Go to page →
        </button>
      </div>

      {/* Other priorities — Collapsible list */}
      {sorted.length > 1 && (
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10 }}>Also tracked</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.slice(1, 4).map((p, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 18 }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{p.text.substring(0, 80)}...</div>
                </div>
                <span style={{ fontSize: 10, color: GOLD, fontWeight: 600, whiteSpace: "nowrap" }}>{p.urgency}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminVisitorAnalytics() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<"overview" | "sessions" | "captures" | "funnel" | "insights" | "brand-visitors">("overview");
  const [excludeMyTraffic, setExcludeMyTraffic] = useState(() => localStorage.getItem("ep_analytics_hide_my_traffic") === "true");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterPage, setFilterPage] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [showBots, setShowBots] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const adminFetch = (url: string, init: RequestInit = {}) => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, { ...init, headers, credentials: "include" });
  };

  const sendChatMessage = async (text?: string) => {
    const msg = (text || chatInput).trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/marketing-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({
          message: msg,
          history: chatMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          days,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't connect. Please try again." }]);
    }
    setChatLoading(false);
  };

  const { data, isLoading, isError, error, refetch } = useQuery<any>({
    queryKey: ["/api/admin/visitor-analytics", days, excludeMyTraffic, showBots],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/visitor-analytics?days=${days}&exclude_my_traffic=${excludeMyTraffic}&show_bots=${showBots}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: funnelData, isLoading: funnelLoading, isError: funnelIsError, error: funnelError } = useQuery<any>({
    queryKey: ["/api/admin/iamher-funnel", days, excludeMyTraffic],
    queryFn: async () => {
      const res = await adminFetch(`/api/admin/iamher-funnel?days=${days}&exclude_my_traffic=${excludeMyTraffic}`);
      if (!res.ok) throw new Error("Failed to fetch funnel data");
      return res.json();
    },
    refetchInterval: 60000,
    // The Marketing Insights snapshot ("insights" tab) also reads funnelData; without
    // this it stayed undefined there, rendering 0 Funnel Visitors / NaN% sellout.
    enabled: tab === "funnel" || tab === "insights",
  });

  // Real-time conversion alerts
  const [seenAlerts, setSeenAlerts] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("ep_seen_alerts") || "[]"); } catch { return []; }
  });
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);

  const { data: conversions } = useQuery<any>({
    queryKey: ["/api/admin/conversions/recent"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/conversions/recent?minutes=30");
      if (!res.ok) throw new Error("Failed to fetch conversions");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const allConversions = [
    ...(conversions?.emailCaptures || []).map((c: any) => ({ type: "email" as const, id: c.id, text: c.captured_email, detail: c.capture_page, time: c.captured_at, country: c.country })),
    ...(conversions?.storySubmissions || []).map((c: any) => ({ type: "story" as const, id: c.id, text: c.email || "Story submission", detail: c.category || "Story", time: c.created_at, country: c.country || null })),
  ].sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const unseenAlerts = allConversions.filter((c: any) => !seenAlerts.includes(c.id + c.type));
  const alertCount = unseenAlerts.length;

  const summary = data?.summary || {};
  const byPage: any[] = data?.byPage || [];
  const byCountry: any[] = data?.byCountry || [];
  const byDay: any[] = data?.byDay || [];
  const byCity: any[] = data?.byCity || [];
  const emailCaptures: any[] = data?.emailCaptures || [];
  const recentSessions: any[] = data?.recentSessions || [];
  const trafficSources: any[] = data?.trafficSources || [];

  // Frontend filtering
  const fc = filterCountry.toLowerCase();
  const fp = filterPage.toLowerCase();
  const fs = filterSource.toLowerCase();
  const filteredSessions = recentSessions.filter((s: any) => {
    if (!showBots && s?.is_bot) return false;
    if (fc && !((s.country || "").toLowerCase().includes(fc) || (s.city || "").toLowerCase().includes(fc))) return false;
    if (fp && !((s.journey || "").toLowerCase().includes(fp))) return false;
    if (fs && !((s.utm_source || "").toLowerCase().includes(fs) || (s.referrer || "").toLowerCase().includes(fs))) return false;
    return true;
  });
  const filteredCaptures = emailCaptures.filter((c: any) => {
    if (!showBots && c?.is_bot) return false;
    if (fc && !((c.country || "").toLowerCase().includes(fc))) return false;
    if (fp && !((c.capture_page || "").toLowerCase().includes(fp))) return false;
    if (fs && !((c.utm_source || "").toLowerCase().includes(fs))) return false;
    return true;
  });
  const filteredSources = trafficSources.filter((s: any) => {
    if (fs && !((s.source || "").toLowerCase().includes(fs) || (s.display_source || "").toLowerCase().includes(fs))) return false;
    return true;
  });

  const maxViews = Math.max(...byDay.map((d: any) => d.views), 1);
  const trafficReport = {
    views: summary.total_views || 0,
    sessions: summary.total_sessions || 0,
    captures: summary.email_captures || 0,
    countries: summary.countries || 0,
    topPage: byPage[0]?.page || "No data yet",
    topCountry: byCountry[0]?.country || "No data yet",
    recentVisitor: recentSessions[0]?.country || "No recent sessions",
  };

  function exportCsv() {
    if (!emailCaptures.length) return;
    const rows = [["Email", "Name", "Page", "Captured At", "Country", "City", "UTM Source", "UTM Campaign"]];
    emailCaptures.forEach((c: any) => rows.push([c.captured_email, c.captured_name || "", c.capture_page || "", c.captured_at ? new Date(c.captured_at).toLocaleString("en-GB") : "", c.country || "", c.city || "", c.utm_source || "", c.utm_campaign || ""]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ep-email-captures-${days}d.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PlannerSidebar />
      <main className="lg:ml-60" style={{ padding: "32px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: BRAND, margin: 0 }}>Visitor Analytics</h1>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Anonymous tracking · /iamher &amp; /projects-and-programmes</p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", position: "relative" }}>
              {/* Conversion Alert Bell */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setShowAlertDropdown(!showAlertDropdown);
                    if (alertCount > 0) {
                      const newSeen = [...seenAlerts, ...unseenAlerts.map((a: any) => a.id + a.type)];
                      setSeenAlerts(newSeen);
                      localStorage.setItem("ep_seen_alerts", JSON.stringify(newSeen));
                    }
                  }}
                  style={{ background: alertCount > 0 ? "#fef2f2" : "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, position: "relative" }}
                >
                  {alertCount > 0 ? <BellRing size={16} style={{ color: "#dc2626" }} /> : <Bell size={16} style={{ color: BRAND }} />}
                  {alertCount > 0 && (
                    <span style={{ position: "absolute", top: -6, right: -6, background: "#dc2626", color: "#fff", borderRadius: "50%", fontSize: 10, fontWeight: 800, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {alertCount}
                    </span>
                  )}
                </button>
                {showAlertDropdown && (
                  <div style={{ position: "absolute", right: 0, top: 44, background: "#fff", borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", border: "1px solid #e5e7eb", width: 340, zIndex: 100, maxHeight: 400, overflow: "auto" }}>
                    <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", fontWeight: 700, fontSize: 13, color: BRAND, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>🔔 Conversion Alerts (last 30 min)</span>
                      <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>{allConversions.length} total</span>
                    </div>
                    {allConversions.length === 0 ? (
                      <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No conversions in the last 30 minutes.</div>
                    ) : (
                      <div style={{ padding: "8px 0" }}>
                        {allConversions.slice(0, 10).map((c: any, i: number) => (
                          <div key={i} style={{ padding: "10px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", gap: 12, alignItems: "flex-start" }}>
                            <div style={{ fontSize: 18, flexShrink: 0 }}>
                              {c.type === "email" ? "📧" : c.type === "story" ? "📝" : "🖼️"}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: BRAND }}>{c.text}</div>
                              <div style={{ fontSize: 11, color: "#6b7280" }}>{c.detail} · {[c.country].filter(Boolean).join(", ")}</div>
                              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{new Date(c.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                            {!seenAlerts.includes(c.id + c.type) && (
                              <span style={{ width: 8, height: 8, background: "#dc2626", borderRadius: "50%", flexShrink: 0, marginTop: 4 }} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: BRAND, fontWeight: 600, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={excludeMyTraffic}
                  onChange={e => {
                    setExcludeMyTraffic(e.target.checked);
                    localStorage.setItem("ep_analytics_hide_my_traffic", e.target.checked ? "true" : "false");
                  }}
                  style={{ width: 16, height: 16, accentColor: BRAND, cursor: "pointer" }}
                />
                Hide my traffic
              </label>
              <select
                value={days}
                onChange={e => setDays(Number(e.target.value))}
                style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: BRAND, fontWeight: 600, background: "#fff", cursor: "pointer" }}
              >
                <option value={1}>Today</option>
                <option value={5}>Last 5 days</option>
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last 365 days</option>
              </select>
              <button
                onClick={() => refetch()}
                style={{ background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
              >
                <RefreshCw size={14} style={{ color: BRAND }} /> Refresh
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm("Exclude your current internet connection (IP) from all visitor analytics? Your own visits will stop being counted as real visitors.")) return;
                  try {
                    const res = await adminFetch("/api/admin/analytics/exclude-ip", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({}),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.error || "Failed");
                    window.alert(`Done — your IP (${data.ip}) is now excluded. ${data.sessionsFlagged ?? 0} existing session(s) reclassified as yours.`);
                    refetch();
                  } catch (e: any) {
                    window.alert("Could not exclude your IP: " + (e?.message || e));
                  }
                }}
                style={{ background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
                title="Stop counting your own visits by excluding your current IP address"
              >
                🚫 Exclude my IP
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 20, padding: "12px 16px", background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <Filter size={14} style={{ color: "#9ca3af" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Filter</span>

            <input
              placeholder="Country..."
              value={filterCountry}
              onChange={e => setFilterCountry(e.target.value)}
              style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 12, width: 130, outline: "none" }}
            />
            <input
              placeholder="Page..."
              value={filterPage}
              onChange={e => setFilterPage(e.target.value)}
              style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 12, width: 160, outline: "none" }}
            />
            <input
              placeholder="UTM Source..."
              value={filterSource}
              onChange={e => setFilterSource(e.target.value)}
              style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 12, width: 130, outline: "none" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" }}>
              <input type="checkbox" checked={showBots} onChange={e => setShowBots(e.target.checked)} style={{ accentColor: BRAND }} />
              Show bots
            </label>
            <button
              onClick={() => { setFilterCountry(""); setFilterPage(""); setFilterSource(""); setShowBots(false); }}
              style={{ border: "none", background: "none", cursor: "pointer", fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}
            >
              <X size={12} /> Reset
            </button>
          </div>

          {(isError || funnelIsError) && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 14px", marginBottom: 20, color: "#991b1b", fontSize: 12 }}>
              Could not load one or more analytics datasets. {apiError || "Please refresh and try again."}
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#9ca3af" }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${BRAND}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
              Loading analytics…
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
                <StatCard icon={Eye} label="Page Views" value={summary.total_views?.toLocaleString() || "0"} sub={`last ${days} days`} />
                <StatCard icon={Users} label="Sessions" value={summary.total_sessions?.toLocaleString() || "0"} sub="unique visitors" />
                <StatCard icon={Mail} label="Emails Captured" value={summary.email_captures?.toLocaleString() || "0"} sub="via popup" />
                <StatCard icon={Globe} label="Countries" value={summary.countries || "0"} sub="worldwide reach" />
              </div>
              <div style={{ background: BRAND, color: "#fff", borderRadius: 14, padding: "18px 20px", marginBottom: 28, boxShadow: "0 12px 30px rgba(51,3,17,0.18)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: GOLD, fontWeight: 800, marginBottom: 6 }}>Foot Traffic Report</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>Traffic is coming from {trafficReport.topCountry}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>Top page: {trafficReport.topPage}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, minWidth: 280 }}>
                    {[
                      ["Views", trafficReport.views],
                      ["Sessions", trafficReport.sessions],
                      ["Captures", trafficReport.captures],
                      ["Countries", trafficReport.countries],
                    ].map(([label, value]) => (
                      <div key={String(label)} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 900 }}>{String(value)}</div>
                        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)" }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                  Latest visitor location: {trafficReport.recentVisitor}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e5e7eb" }}>
                {(["overview", "sessions", "captures", "funnel", "insights", "brand-visitors"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 22px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: tab === t ? BRAND : "#6b7280", borderBottom: tab === t ? `2px solid ${BRAND}` : "2px solid transparent", marginBottom: -2, textTransform: "capitalize" }}>
                    {t === "captures" ? `Email Captures (${summary.email_captures ?? 0})` : t === "sessions" ? `Sessions (${summary.total_sessions ?? 0})` : t === "funnel" ? "I Am Her Funnel" : t === "insights" ? "Live Insights" : t === "brand-visitors" ? "Brand Visitors" : "Overview"}
                  </button>
                ))}
              </div>

              {/* Overview tab */}
              {tab === "overview" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {/* Daily chart */}
                  <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", gridColumn: "1 / -1" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 20px" }}>Daily Traffic</h3>
                    {byDay.length === 0 ? (
                      <p style={{ color: "#9ca3af", fontSize: 13 }}>No data yet.</p>
                    ) : (
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, overflowX: "auto" }}>
                        {byDay.map((d: any, i: number) => (
                          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "0 0 auto", minWidth: 32 }} title={`${d.day}: ${d.views} views, ${d.sessions} sessions`}>
                            <div style={{ width: 20, background: BRAND, borderRadius: "3px 3px 0 0", height: `${Math.round((d.views / maxViews) * 100)}%`, minHeight: 4, opacity: 0.85 }} />
                            <span style={{ fontSize: 9, color: "#9ca3af", transform: "rotate(-45deg)", whiteSpace: "nowrap", display: "block" }}>
                              {new Date(d.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top pages */}
                  <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 16px" }}>Top Pages</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {byPage.length === 0 ? <p style={{ color: "#9ca3af", fontSize: 13 }}>No data yet.</p> : byPage.slice(0, 8).map((p: any, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", height: 8 }}>
                            <div style={{ width: `${Math.round((p.views / (byPage[0]?.views || 1)) * 100)}%`, background: BRAND, height: "100%", opacity: 0.75 }} />
                          </div>
                          <span style={{ fontSize: 11, color: "#374151", fontWeight: 500, minWidth: 80, textAlign: "right" }}>{p.views} views</span>
                          <span style={{ fontSize: 11, color: "#6b7280", minWidth: 100, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={p.page}>{p.page}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top countries */}
                  <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 16px" }}>Top Countries</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {byCountry.length === 0 ? <p style={{ color: "#9ca3af", fontSize: 13 }}>No data yet.</p> : byCountry.map((c: any, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <MapPin size={12} style={{ color: BRAND, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>{c.country || "Unknown"}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: BRAND }}>{c.sessions}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* UK Cities */}
                  <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 16px" }}>UK Cities</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {byCity.length === 0 ? <p style={{ color: "#9ca3af", fontSize: 13 }}>No UK city data yet.</p> : byCity.map((c: any, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <MapPin size={12} style={{ color: GOLD, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>{c.city}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: BRAND }}>{c.sessions}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* Sessions tab */}
              {tab === "sessions" && (
                <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        {["First Seen", "Pages", "Country / City", "Referrer", "Journey", "Email"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSessions.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>{recentSessions.length === 0 ? "No sessions recorded yet." : "No sessions match your filters."}</td></tr>
                      ) : filteredSessions.map((s: any, i: number) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "10px 12px", color: "#374151", whiteSpace: "nowrap" }}>{new Date(s.first_seen).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: BRAND }}>{s.page_count}</td>
                          <td style={{ padding: "10px 12px", color: "#4b5563" }}>{[s.country, s.city].filter(Boolean).join(", ") || "—"}</td>
                          <td style={{ padding: "10px 12px", color: "#6b7280", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.referrer}>{s.referrer ? s.referrer.replace(/^https?:\/\//, "") : "Direct"}</td>
                          <td style={{ padding: "10px 12px", color: "#6b7280", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.journey}>{s.journey || "—"}</td>
                          <td style={{ padding: "10px 12px" }}>{s.captured_email ? <Pill text={s.captured_email} color="#d1fae5" /> : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Email captures tab */}
              {tab === "captures" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                    <button onClick={exportCsv} style={{ display: "flex", alignItems: "center", gap: 6, background: BRAND, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      <Download size={13} /> Export CSV
                    </button>
                  </div>
                  <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                          {["Email", "Name", "Page", "Captured", "Location", "UTM Source"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCaptures.length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>{emailCaptures.length === 0 ? "No email captures yet. The popup will start capturing once visitors arrive." : "No captures match your filters."}</td></tr>
                        ) : filteredCaptures.map((c: any, i: number) => (
                          <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                            <td style={{ padding: "10px 12px", fontWeight: 600, color: BRAND }}>{c.captured_email}</td>
                            <td style={{ padding: "10px 12px", color: "#374151" }}>{c.captured_name || "—"}</td>
                            <td style={{ padding: "10px 12px", color: "#6b7280" }}>{c.capture_page || "—"}</td>
                            <td style={{ padding: "10px 12px", color: "#4b5563", whiteSpace: "nowrap" }}>{c.captured_at ? new Date(c.captured_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                            <td style={{ padding: "10px 12px", color: "#4b5563" }}>{[c.country, c.city].filter(Boolean).join(", ") || "—"}</td>
                            <td style={{ padding: "10px 12px" }}>{c.utm_source ? <Pill text={c.utm_source} color="#dbeafe" /> : <span style={{ color: "#d1d5db" }}>Direct</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* I Am Her Funnel tab */}
              {tab === "funnel" && (
                <div>
                  {funnelLoading ? (
                    <div style={{ textAlign: "center", padding: "80px 0", color: "#9ca3af" }}>
                      <div style={{ width: 36, height: 36, border: `3px solid ${BRAND}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
                      Loading funnel data…
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                  ) : (
                    <>
                      {/* Funnel summary cards */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
                        {(() => {
                          const f = funnelData?.funnel || {};
                          return [
                            { label: "Visitors", value: f.visitors || 0, sub: "to /iamher", color: "#330311" },
                            { label: "Email Captures", value: f.interest_captures || 0, sub: `${f.interest_capture_rate || 0}% of visitors`, color: "#7c3aed" },
                            { label: "CTA Clicks", value: f.cta_clicks || 0, sub: `${f.cta_rate || 0}% of visitors`, color: "#C9A961" },
                            { label: "Form Starts", value: f.form_starts || 0, sub: `${f.form_start_rate || 0}% of visitors`, color: "#6b7280" },
                            { label: "Form Completes", value: f.form_completes || 0, sub: `${f.form_complete_rate || 0}% of starts`, color: "#374151" },
                            { label: "Submit Errors", value: f.submit_errors || 0, sub: `${f.submit_error_rate || 0}% of starts`, color: "#dc2626" },
                            { label: "Submissions", value: f.submit_success || 0, sub: `${f.submit_rate || 0}% of visitors`, color: "#16a34a" },
                          ].map((s, i) => (
                            <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "20px 16px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", borderTop: `3px solid ${s.color}` }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{s.label}</div>
                              <div style={{ fontSize: 32, fontWeight: 800, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
                              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{s.sub}</div>
                            </div>
                          ));
                        })()}
                      </div>

                      {/* Funnel bar chart */}
                      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 28 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 24px" }}>Conversion Funnel</h3>
                        {(() => {
                          const f = funnelData?.funnel || {};
                          const steps = [
                            { label: "Visitors on /iamher", value: f.visitors || 0, color: "#330311", rate: "100%" },
                            { label: "CTA Clicked", value: f.cta_clicks || 0, color: "#C9A961", rate: f.cta_rate ? `${f.cta_rate}%` : "0%", drop: f.drop_cta_to_start ? `${f.drop_cta_to_start}% drop` : null },
                            { label: "Form Started", value: f.form_starts || 0, color: "#6b7280", rate: f.form_start_rate ? `${f.form_start_rate}%` : "0%", drop: f.drop_start_to_complete ? `${f.drop_start_to_complete}% drop` : null },
                            { label: "Form Completed", value: f.form_completes || 0, color: "#374151", rate: f.form_complete_rate ? `${f.form_complete_rate}%` : "0%", drop: f.drop_complete_to_submit ? `${f.drop_complete_to_submit}% drop` : null },
                            { label: "Successfully Submitted", value: f.submit_success || 0, color: "#16a34a", rate: f.submit_rate ? `${f.submit_rate}%` : "0%", drop: null },
                          ];
                          const max = Math.max(...steps.map(s => s.value), 1);
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                              {steps.map((s, i) => (
                                <div key={i}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", minWidth: 160 }}>{s.label}</span>
                                    <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</span>
                                    <span style={{ fontSize: 11, color: "#6b7280" }}>({s.rate})</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 6, height: 28, overflow: "hidden" }}>
                                      <div style={{ width: `${Math.round((s.value / max) * 100)}%`, background: s.color, height: "100%", borderRadius: 6, opacity: 0.85, transition: "width 0.5s ease" }} />
                                    </div>
                                    {s.drop && <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap" }}>↓ {s.drop}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Daily funnel chart */}
                      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 28 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 20px" }}>Daily Funnel</h3>
                        {(() => {
                          const days = funnelData?.byDay || [];
                          if (days.length === 0) return <p style={{ color: "#9ca3af", fontSize: 13 }}>No funnel data yet. Events will appear as visitors interact with the I Am Her pages.</p>;
                          const maxVal = Math.max(...days.map((d: any) => Math.max(d.visitors || 0, d.cta_clicks || 0, d.form_starts || 0, d.submit_success || 0)), 1);
                          return (
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, overflowX: "auto" }}>
                              {days.map((d: any, i: number) => (
                                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: "0 0 auto", minWidth: 48 }} title={`${d.day}: ${d.visitors} visitors, ${d.cta_clicks} clicks, ${d.form_starts} starts, ${d.submit_success} submits`}>
                                  <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 100 }}>
                                    <div style={{ width: 8, background: "#330311", borderRadius: "2px 2px 0 0", height: `${Math.round(((d.visitors || 0) / maxVal) * 100)}%`, minHeight: 2 }} />
                                    <div style={{ width: 8, background: "#C9A961", borderRadius: "2px 2px 0 0", height: `${Math.round(((d.cta_clicks || 0) / maxVal) * 100)}%`, minHeight: 2 }} />
                                    <div style={{ width: 8, background: "#16a34a", borderRadius: "2px 2px 0 0", height: `${Math.round(((d.submit_success || 0) / maxVal) * 100)}%`, minHeight: 2 }} />
                                  </div>
                                  <span style={{ fontSize: 9, color: "#9ca3af", transform: "rotate(-45deg)", whiteSpace: "nowrap", display: "block", marginTop: 8 }}>
                                    {new Date(d.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: "#6b7280" }}>
                          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#330311", borderRadius: 2, marginRight: 4 }} /> Visitors</span>
                          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#C9A961", borderRadius: 2, marginRight: 4 }} /> CTA Clicks</span>
                          <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#16a34a", borderRadius: 2, marginRight: 4 }} /> Submissions</span>
                        </div>
                      </div>

                      {/* By source */}
                      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 28 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 16px" }}>Funnel by Traffic Source</h3>
                        {(() => {
                          const sources = funnelData?.bySource || [];
                          if (sources.length === 0) return <p style={{ color: "#9ca3af", fontSize: 13 }}>No source data yet.</p>;
                          return (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                                  {["Source", "Visitors", "Emails Captured", "CTA Clicks", "Form Starts", "Submissions", "Conv. Rate"].map(h => (
                                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sources.map((s: any, i: number) => (
                                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                    <td style={{ padding: "10px 12px", fontWeight: 600, color: BRAND }}>{s.source || "Direct"}</td>
                                    <td style={{ padding: "10px 12px", color: "#374151" }}>{s.visitors || 0}</td>
                                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#7c3aed" }}>{s.email_captures || 0}</td>
                                    <td style={{ padding: "10px 12px", color: "#374151" }}>{s.cta_clicks || 0}</td>
                                    <td style={{ padding: "10px 12px", color: "#374151" }}>{s.form_starts || 0}</td>
                                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#16a34a" }}>{s.submit_success || 0}</td>
                                    <td style={{ padding: "10px 12px", fontWeight: 700, color: BRAND }}>{s.visitors ? ((s.submit_success / s.visitors) * 100).toFixed(1) : "0"}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>

                      {/* Referral source breakdown (self-reported) */}
                      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 16px" }}>Referral Source (Self-Reported)</h3>
                        {(() => {
                          const refs = funnelData?.referralBreakdown || [];
                          if (refs.length === 0) return <p style={{ color: "#9ca3af", fontSize: 13 }}>No referral data yet. Visitors will see an optional "How did you hear about us?" question on the hero and access forms.</p>;
                          const totalCaptures = refs.reduce((s: number, r: any) => s + (parseInt(r.email_captures) || 0), 0);
                          return (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                                  {["Referral Source", "Email Captures", "Registrations", "Share"].map(h => (
                                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {refs.map((r: any, i: number) => {
                                  const captures = parseInt(r.email_captures) || 0;
                                  const registrations = parseInt(r.registrations) || 0;
                                  const pct = totalCaptures > 0 ? ((captures / totalCaptures) * 100).toFixed(0) : "0";
                                  const label = r.source === "not_specified" ? "Not specified" : r.source.charAt(0).toUpperCase() + r.source.slice(1).replace(/_/g, " ");
                                  return (
                                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                      <td style={{ padding: "10px 12px", fontWeight: 600, color: BRAND }}>{label}</td>
                                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#7c3aed" }}>{captures}</td>
                                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#16a34a" }}>{registrations}</td>
                                      <td style={{ padding: "10px 12px" }}>
                                        <div style={{ height: 4, background: "#f3f4f6", borderRadius: 2, width: "100%", minWidth: 80 }}>
                                          <div style={{ height: "100%", background: "#C9A961", borderRadius: 2, width: `${pct}%`, opacity: 0.7 }} />
                                        </div>
                                        <span style={{ fontSize: 10, color: "#6b7280" }}>{pct}%</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* I Am Her Marketing Insights tab */}
              {tab === "insights" && (
                <div>
                  {(() => {
                    const f = funnelData?.funnel || {};
                    const sources = (data?.trafficSources || []).slice(0, 10);
                    const views = Number(summary.total_views || 0);
                    const sessions = Number(summary.total_sessions || 0);
                    const captures = Number(summary.email_captures || 0);
                    const visitors = Number(f.visitors || 0);
                    const cta = Number(f.cta_clicks || 0);
                    const starts = Number(f.form_starts || 0);
                    const submitErrors = Number(f.submit_errors || 0);
                    const submits = Number(f.submit_success || 0);

                    const ctaRate = visitors > 0 ? ((cta / visitors) * 100).toFixed(1) : "0";
                    const startRate = cta > 0 ? ((starts / cta) * 100).toFixed(1) : "0";
                    const submitRate = visitors > 0 ? ((submits / visitors) * 100).toFixed(1) : "0";
                    const submitErrorRate = starts > 0 ? ((submitErrors / starts) * 100).toFixed(1) : "0";
                    const captureRate = sessions > 0 ? ((captures / sessions) * 100).toFixed(1) : "0";

                    const liveInsights: Array<{ level: string; title: string; evidence: string; action: string }> = [];
                    if (visitors < 30) {
                      liveInsights.push({
                        level: "High",
                        title: "Traffic baseline is low",
                        evidence: `${visitors} funnel visitors in ${days} days.`,
                        action: "Increase tracked traffic volume first with UTM-tagged channel pushes.",
                      });
                    }
                    if (visitors >= 20 && Number(ctaRate) < 20) {
                      liveInsights.push({
                        level: "High",
                        title: "CTA underperforming",
                        evidence: `${cta} CTA clicks from ${visitors} visitors (${ctaRate}%).`,
                        action: "Improve CTA prominence and wording on top pages.",
                      });
                    }
                    if (cta >= 10 && Number(startRate) < 60) {
                      liveInsights.push({
                        level: "Critical",
                        title: "Drop-off between CTA and form start",
                        evidence: `${starts} form starts from ${cta} clicks (${startRate}%).`,
                        action: "Reduce form friction and validate mobile transition speed.",
                      });
                    }
                    if (visitors >= 20 && Number(submitRate) < 5) {
                      liveInsights.push({
                        level: "Critical",
                        title: "End-to-end conversion below target",
                        evidence: `${submits} submissions from ${visitors} visitors (${submitRate}%).`,
                        action: "Prioritize conversion-stage fixes before adding ad spend.",
                      });
                    }
                    if (starts >= 10 && Number(submitErrorRate) >= 10) {
                      liveInsights.push({
                        level: "Critical",
                        title: "Submission errors are hurting conversion",
                        evidence: `${submitErrors} submit errors from ${starts} form starts (${submitErrorRate}%).`,
                        action: "Review submit errors and fix form/API reliability before increasing campaign spend.",
                      });
                    }
                    if (sessions >= 30 && Number(captureRate) < 1) {
                      liveInsights.push({
                        level: "Medium",
                        title: "Email capture low",
                        evidence: `${captures} email captures from ${sessions} sessions (${captureRate}%).`,
                        action: "Strengthen lead capture offer and placement.",
                      });
                    }
                    if (liveInsights.length === 0) {
                      liveInsights.push({
                        level: "Info",
                        title: "Core metrics currently stable",
                        evidence: "No major threshold breach in current period.",
                        action: "Keep monitoring and run controlled A/B tests.",
                      });
                    }

                    return (
                      <>
                        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 16px" }}>Live Funnel Metrics (Real Data)</h3>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                            {[
                              ["Views", views],
                              ["Sessions", sessions],
                              ["Visitors", visitors],
                              ["CTA Clicks", cta],
                              ["Form Starts", starts],
                              ["Submit Errors", submitErrors],
                              ["Submissions", submits],
                              ["CTA Rate", `${ctaRate}%`],
                              ["Submit Error Rate", `${submitErrorRate}%`],
                              ["Submit Rate", `${submitRate}%`],
                              ["Capture Rate", `${captureRate}%`],
                            ].map(([label, value]) => (
                              <div key={String(label)} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, textAlign: "center" }}>
                                <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                                <div style={{ fontSize: 22, color: BRAND, fontWeight: 800 }}>{String(value)}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 16px" }}>Live Insights (Evidence-Based)</h3>
                          <div style={{ display: "grid", gap: 10 }}>
                            {liveInsights.map((ins, i) => (
                              <div key={i} style={{ borderRadius: 8, border: "1px solid #e5e7eb", background: "#fafafa", padding: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: BRAND }}>{ins.title}</div>
                                  <span style={{ fontSize: 10, color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 999, padding: "2px 8px" }}>{ins.level}</span>
                                </div>
                                <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}><strong>Evidence:</strong> {ins.evidence}</div>
                                <div style={{ fontSize: 12, color: "#374151" }}><strong>Action:</strong> {ins.action}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 16 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 16px" }}>Top Traffic Sources (Live)</h3>
                          {sources.length === 0 ? (
                            <p style={{ color: "#9ca3af", fontSize: 13 }}>No source data yet.</p>
                          ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                                  <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 700 }}>Source</th>
                                  <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 700 }}>Medium</th>
                                  <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 700 }}>Campaign</th>
                                  <th style={{ textAlign: "right", padding: "8px 10px", color: "#6b7280", fontWeight: 700 }}>Sessions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sources.map((s: any, i: number) => (
                                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                    <td style={{ padding: "8px 10px", color: "#374151" }}>{s.source || "direct"}</td>
                                    <td style={{ padding: "8px 10px", color: "#6b7280" }}>{s.medium || ""}</td>
                                    <td style={{ padding: "8px 10px", color: "#6b7280" }}>{s.campaign || ""}</td>
                                    <td style={{ padding: "8px 10px", color: BRAND, textAlign: "right", fontWeight: 700 }}>{s.sessions || 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Brand Visitors tab */}
              {tab === "brand-visitors" && (
                <div>
                  <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: BRAND, margin: "0 0 16px" }}>
                      🏢 Brand Visitors — Corporate Network Detection
                    </h3>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px", lineHeight: 1.6 }}>
                      Visitors from corporate networks (not home broadband providers) are flagged. ISP data reveals the organisation's internet provider — e.g., "Amazon Technologies", "Microsoft Corporation", "Google LLC".
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Pill text="Corporate ISP" color="#C9A961" />
                      <Pill text="Home ISP" color="#f3f4f6" />
                      <Pill text="Unknown" color="#f3f4f6" />
                    </div>
                  </div>
                  <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                          {["ISP / Organisation", "Type", "Country", "City", "First Seen", "Pages", "Email"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentSessions.length === 0 ? (
                          <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>No sessions recorded yet.</td></tr>
                        ) : recentSessions.filter((s: any) => s.isp && s.isp !== "Unknown").length === 0 ? (
                          <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>No ISP data available yet. ISP detection requires geolocation to succeed.</td></tr>
                        ) : recentSessions.filter((s: any) => s.isp && s.isp !== "Unknown").map((s: any, i: number) => {
                          const rawName = (s.org && s.org !== "Unknown" && s.org.trim()) ? s.org : (s.isp || "Unknown");
                          const isUnknown = !rawName || rawName === "Unknown";
                          const hasOrgName = !!(s.org && s.org !== "Unknown" && s.org.trim());
                          const namedEntity = rawName.toLowerCase();
                          const isNamedCorp = hasOrgName && /inc\.?|ltd\.?|llc|plc\.?|corp\.?|gmbh|s\.?a\.?|s\.?l\.?|b\.?v\.?|nv\.?|ab\.?|ag\.?|k\.?k\.?|pty\.?|ltda|s\.?r\.?l|s\.?p\.?a|holding|group|technologies|systems|solutions|software|networks|services|consulting|partner|bank|insurance|hospital|clinic|university|college|school|government|ministry|agency|police|nhs/i.test(namedEntity);
                          const isResidential = !isUnknown && /bt|virgin|sky|talktalk|vodafone|orange|ee limited|three|o2|giffgaff|plusnet|zen internet|hyperoptic|kcom|isp|broadband|internet|telecom|fibre|fiber|dsl|cable|wireless|mobile|4g|5g|3g|2g|cellular|net|online|t-online|home|connect|residential|consumer|telstra|verizon|comcast|spectrum|cox|att|at&t|sprint|tmobile|t-mobile|bell|rogers|shaw|telus|vodafone|ee|o2|three|lloyds|barclays|hsbc|natwest|santander|halifax|nationwide|monzo|starling|revolut|tsb|metro|co-operative|bank|building society|credit union|first direct|danske|handelsbanken|alliance|yorkshire|saga|post office|cashplus|ing/i.test(namedEntity);
                          const isProxy = !isUnknown && /cloudflare|fastly|incapsula|akamai|cdn|cloudfront|maxcdn|keycdn|stackpath|sucuri|bunny|bunnycdn|quic|cdn77|cdnetworks|chinacache|level3|centurylink|limelight|edgecast|verizon digital|highwinds|onapp|cachefly|fly|silk|alicdn|alibaba|baidu|tencent|aws amazon|amazon web|google cloud|microsoft azure|azure|gcp|google platform|digitalocean|linode|vultr|hetzner|ovh|contabo|scaleway|packet|equinix|server|hosting|datacenter|data centre|data center|colo|colocation|host|webhost|web host|hostgator|bluehost|godaddy|namecheap|dreamhost|siteground|inmotion|a2hosting|hostinger|ionos|1&1|oneandone|network solutions|register|registrar|domain|dns|vpn|proxy|tor|anonym|hide|exit node|private internet|nordvpn|expressvpn|cyberghost|surfshark|protonvpn|ipvanish|tunnelbear|hotspot shield|windscribe|vypr|purevpn/i.test(namedEntity);
                          const isCorp = !isUnknown && !isResidential && !isProxy && isNamedCorp;
                          return (
                            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                              <td style={{ padding: "10px 12px", fontWeight: 600, color: BRAND }}>
                                {rawName}
                                {isCorp && <span style={{ marginLeft: 6, fontSize: 10, background: "#C9A961", color: "#1A0A0E", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>BRAND</span>}
                                {isUnknown && <span style={{ marginLeft: 6, fontSize: 10, background: "#e5e7eb", color: "#4b5563", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>UNIDENTIFIED</span>}
                                {isProxy && <span style={{ marginLeft: 6, fontSize: 10, background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>PROXY</span>}
                              </td>
                              <td style={{ padding: "10px 12px", color: "#6b7280" }}>
                                {isCorp ? "🏢 Corporate" : isProxy ? "🔗 Proxy/VPN" : isResidential ? "🏠 Home ISP" : "❓ Unidentified"}
                              </td>
                              <td style={{ padding: "10px 12px", color: "#4b5563" }}>{s.country || "—"}</td>
                              <td style={{ padding: "10px 12px", color: "#4b5563" }}>{s.city || "—"}</td>
                              <td style={{ padding: "10px 12px", color: "#4b5563", whiteSpace: "nowrap" }}>{s.first_seen ? new Date(s.first_seen).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                              <td style={{ padding: "10px 12px", fontWeight: 700, color: BRAND }}>{s.page_count}</td>
                              <td style={{ padding: "10px 12px" }}>{s.captured_email ? <Pill text={s.captured_email} color="#d1fae5" /> : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
