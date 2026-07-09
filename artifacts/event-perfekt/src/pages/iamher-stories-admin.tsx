import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useVisitorTracking, trackFunnelEvent } from "@/hooks/use-visitor-tracking";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useViewport } from "@/hooks/use-viewport";

const GOLD  = "#C9A961";
const IVORY = "#F4ECD8";
const INK = "#330311";

const STATUS_COLOUR: Record<string, string> = {
  pending:  "rgba(201,169,97,0.95)",
  approved: "rgba(80,200,120,0.8)",
  rejected: "rgba(200,80,80,0.7)",
};

type Story = {
  id: number; name: string; anonymous: boolean; job_title: string | null;
  generalized_title: string | null; company: string | null; email: string;
  category: string; story: string; status: string; featured: boolean;
  slug: string; created_at: string; rejection_note: string | null;
  wellbeing_issues: string[] | null;
  sought_support: string | null;
  support_providers: string[] | null;
  support_testimonial: string | null;
  may_contact: boolean;
  website: string | null;
  linkedin: string | null;
  instagram: string | null;
  what_you_do: string | null;
  wish_you_knew: string | null;
  title: string | null;
  country: string | null;
  city: string | null;
};

export default function IAmHerStoriesAdmin() {
  const { isMobile } = useViewport();
  usePageSEO({
    title: "Stories Admin | I Am Her — Event Perfekt",
    description: "Review, approve, and manage stories submitted to the I Am Her Story Wall.",
    url: "https://eventperfekt.net/iamher/stories-admin",
    noIndex: true,
  });
  useVisitorTracking("/iamher/stories-admin", "Stories Admin | I Am Her");
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({});
  const [genTitles, setGenTitles] = useState<Record<number, string>>({});
  const [issueFilter, setIssueFilter] = useState<string>("");
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [showReport, setShowReport] = useState(false);

  const { data, isLoading } = useQuery<{ stories: Story[] }>({
    queryKey: ["/api/event-august/stories/admin-queue"],
    refetchInterval: 30000,
  });

  const moderate = useMutation({
    mutationFn: ({ id, ...body }: { id: number; status?: string; featured?: boolean; generalized_title?: string; rejection_note?: string }) =>
      apiRequest("PATCH", `/api/event-august/stories/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/event-august/stories/admin-queue"] }),
  });

  const allStories = data?.stories || [];
  const stories = allStories.filter(s => {
    if (filter !== "all" && s.status !== filter) return false;
    if (issueFilter && !s.wellbeing_issues?.includes(issueFilter)) return false;
    if (providerFilter && !s.support_providers?.includes(providerFilter)) return false;
    if (categoryFilter && s.category !== categoryFilter) return false;
    return true;
  });

  const counts = {
    pending:  allStories.filter(s => s.status === "pending").length,
    approved: allStories.filter(s => s.status === "approved").length,
    rejected: allStories.filter(s => s.status === "rejected").length,
  };

  // Aggregated stats
  const issueCounts: Record<string, number> = {};
  const providerCounts: Record<string, number> = {};
  const supportBreakdown = { yes: 0, no: 0, preferNot: 0, total: 0 };
  const testimonialCount = allStories.filter(s => s.support_testimonial && s.support_testimonial.trim()).length;
  const contactableCount = allStories.filter(s => s.may_contact).length;
  allStories.forEach(s => {
    s.wellbeing_issues?.forEach(i => { issueCounts[i] = (issueCounts[i] || 0) + 1; });
    s.support_providers?.forEach(p => { providerCounts[p] = (providerCounts[p] || 0) + 1; });
    if (s.sought_support) {
      supportBreakdown.total++;
      if (s.sought_support === "Yes") supportBreakdown.yes++;
      else if (s.sought_support === "No") supportBreakdown.no++;
      else if (s.sought_support === "Prefer not to say") supportBreakdown.preferNot++;
    }
  });

  const btn = (label: string, onClick: () => void, color = GOLD) => (
    <button onClick={onClick} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${color}40`, color, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", fontFamily: "Poppins, sans-serif", transition: "all 0.18s" }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif", padding: "40px 28px 80px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        .story-row { border: 1px solid rgba(244,236,216,0.95); background: #0d0306; margin-bottom: 12px; }
        .story-row:hover { border-color: rgba(201,169,97,0.15); }
        .filter-btn { cursor:pointer; padding:6px 16px; border:1px solid rgba(201,169,97,0.14); font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:rgba(244,236,216,0.60); background:transparent; font-family:inherit; transition:all 0.2s; }
        .filter-btn.active { border-color:rgba(201,169,97,0.95); color:rgba(201,169,97,0.95); background:rgba(201,169,97,0.95); }
        textarea { resize:vertical; }
        input[type=text] { outline:none; }
      `}</style>

      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: 32, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <a href="/admin/iamher" onClick={() => trackFunnelEvent('cta_click', '/admin/iamher/stories', { cta: 'back_to_admin' })} style={{ fontSize: 10, color: "rgba(244,236,216,0.65)", textDecoration: "none", letterSpacing: "0.16em", textTransform: "uppercase" }}>← Admin</a>
            <h1 style={{ fontSize: 22, fontWeight: 300, color: IVORY, margin: "12px 0 4px" }}>Story Moderation Queue</h1>
            <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", margin: 0 }}>
              {counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected
            </p>
          </div>
          <a href="/iamher/stories" target="_blank" onClick={() => trackFunnelEvent('cta_click', '/admin/iamher/stories', { cta: 'view_story_wall' })} style={{ fontSize: 10, color: GOLD, textDecoration: "none", letterSpacing: "0.18em", textTransform: "uppercase" }}>View Story Wall →</a>
        </div>

        {/* Moderator rubric */}
        <div style={{ marginBottom: 32, padding: "18px 22px", border: "1px solid rgba(201,169,97,0.10)", background: "rgba(201,169,97,0.06)" }}>
          <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 10px" }}>Moderation rubric — check before approving</p>
          {[
            "No named or identifiable organisations in toxic/relationship stories — defamation risk. Generalise or reject.",
            "No identifiable third parties presented in a damaging light.",
            "If Anonymous: confirm company is suppressed and job title is generalised (set Generalised Title below).",
            "Safeguarding: if story indicates immediate risk (self-harm, ongoing abuse, child at risk) — hold as Pending, escalate to event lead. Do not reject.",
            "Consent checkbox was ticked at submission — do not publish without it.",
          ].map((r, i) => (
            <p key={i} style={{ fontSize: 11, color: "rgba(244,236,216,0.75)", margin: "0 0 6px", lineHeight: 1.7 }}>
              {i + 1}. {r}
            </p>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {(["pending", "approved", "rejected", "all"] as const).map(f => (
            <button key={f} className={`filter-btn${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f] ?? 0})`}
            </button>
          ))}
          <button className={`filter-btn${showReport ? " active" : ""}`} onClick={() => setShowReport(!showReport)}>
            {showReport ? "Hide Report" : "Show Report"}
          </button>
        </div>

        {/* Wellbeing & support filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(201,169,97,0.10)", color: IVORY, fontSize: 11, fontFamily: "Poppins, sans-serif" }}
          >
            <option value="">All categories</option>
            {["Confidence","Burnout","Identity","Leadership","Reinvention","Pressure","Motherhood & Career","Toxic Organisation","Financial Strain","Spouse / Relationship","Death or Loss","The Woman Behind the Title","Menopause"].map(c => (
              <option key={c} value={c}>{c} ({allStories.filter(s => s.category === c).length})</option>
            ))}
          </select>
          <select
            value={issueFilter}
            onChange={e => setIssueFilter(e.target.value)}
            style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(201,169,97,0.10)", color: IVORY, fontSize: 11, fontFamily: "Poppins, sans-serif" }}
          >
            <option value="">All issues</option>
            {Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <option key={k} value={k}>{k} ({v})</option>
            ))}
          </select>
          <select
            value={providerFilter}
            onChange={e => setProviderFilter(e.target.value)}
            style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(201,169,97,0.10)", color: IVORY, fontSize: 11, fontFamily: "Poppins, sans-serif" }}
          >
            <option value="">All support providers</option>
            {Object.entries(providerCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <option key={k} value={k}>{k} ({v})</option>
            ))}
          </select>
          {(issueFilter || providerFilter || categoryFilter) && (
            <button className="filter-btn" onClick={() => { setIssueFilter(""); setProviderFilter(""); setCategoryFilter(""); }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Aggregated report dashboard */}
        {showReport && (
          <div style={{ marginBottom: 32, padding: "24px 24px", border: "1px solid rgba(201,169,97,0.12)", background: "rgba(201,169,97,0.06)" }}>
            <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 20px" }}>Wellbeing & Support Insights</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div style={{ padding: "14px 16px", border: "1px solid rgba(201,169,97,0.10)", background: "#0d0306" }}>
                <p style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 6px" }}>Stories with wellbeing data</p>
                <p style={{ fontSize: 28, fontWeight: 300, color: GOLD, margin: 0 }}>{supportBreakdown.total}</p>
              </div>
              <div style={{ padding: "14px 16px", border: "1px solid rgba(201,169,97,0.10)", background: "#0d0306" }}>
                <p style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 6px" }}>Sought support</p>
                <p style={{ fontSize: 28, fontWeight: 300, color: GOLD, margin: 0 }}>{supportBreakdown.yes}</p>
              </div>
              <div style={{ padding: "14px 16px", border: "1px solid rgba(201,169,97,0.10)", background: "#0d0306" }}>
                <p style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 6px" }}>Testimonials</p>
                <p style={{ fontSize: 28, fontWeight: 300, color: GOLD, margin: 0 }}>{testimonialCount}</p>
              </div>
              <div style={{ padding: "14px 16px", border: "1px solid rgba(201,169,97,0.10)", background: "#0d0306" }}>
                <p style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 6px" }}>Contactable</p>
                <p style={{ fontSize: 28, fontWeight: 300, color: GOLD, margin: 0 }}>{contactableCount}</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Top issues */}
              <div>
                <p style={{ fontSize: 10, color: "rgba(201,169,97,0.95)", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 12px" }}>Common issues</p>
                {Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(244,236,216,0.08)" }}>
                    <span style={{ fontSize: 11, color: "rgba(244,236,216,0.95)" }}>{k}</span>
                    <span style={{ fontSize: 11, color: GOLD, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
                {Object.keys(issueCounts).length === 0 && <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)" }}>No data yet.</p>}
              </div>
              {/* Top providers */}
              <div>
                <p style={{ fontSize: 10, color: "rgba(201,169,97,0.95)", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 12px" }}>Support pathways</p>
                {Object.entries(providerCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(244,236,216,0.08)" }}>
                    <span style={{ fontSize: 11, color: "rgba(244,236,216,0.95)" }}>{k}</span>
                    <span style={{ fontSize: 11, color: GOLD, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
                {Object.keys(providerCounts).length === 0 && <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)" }}>No data yet.</p>}
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", padding: 40, textAlign: "center" }}>Loading…</p>
        ) : stories.length === 0 ? (
          <p style={{ fontSize: 13, color: "rgba(244,236,216,0.65)", padding: 40, textAlign: "center" }}>No stories in this filter.</p>
        ) : stories.map(s => {
          const isExpanded = expandedId === s.id;
          return (
            <div key={s.id} className="story-row">
              {/* Summary row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                style={{ padding: "16px 20px", cursor: "pointer", display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}
              >
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: IVORY, fontWeight: 500 }}>{s.anonymous ? "Anonymous" : s.name}</span>
                    {s.anonymous && <span style={{ fontSize: 9, color: GOLD, letterSpacing: "0.2em", border: "1px solid rgba(201,169,97,0.10)", padding: "2px 8px" }}>ANON</span>}
                    {s.featured && <span style={{ fontSize: 9, color: "#C9A961", letterSpacing: "0.2em", border: "1px solid rgba(201,169,97,0.10)", padding: "2px 8px" }}>FEATURED</span>}
                    <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: STATUS_COLOUR[s.status] || IVORY }}>{s.status}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", margin: "0 0 4px" }}>
                    {s.category}
                    {s.job_title ? ` · ${s.job_title}` : ""}
                    {s.company && !s.anonymous ? ` · ${s.company}` : ""}
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(244,236,216,0.85)", margin: 0, fontStyle: "italic" }}>
                    "{s.story.slice(0, 180)}{s.story.length > 180 ? "…" : ""}"
                  </p>
                </div>
                <span style={{ fontSize: 11, color: "rgba(244,236,216,0.95)" }}>{isExpanded ? "▲" : "▼"}</span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ padding: "0 20px 24px", borderTop: "1px solid rgba(244,236,216,0.08)" }}>
                  {/* Email */}
                  <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", margin: "16px 0 4px" }}>Contact email (never published):</p>
                  <p style={{ fontSize: 12, color: GOLD, margin: "0 0 16px" }}>{s.email}</p>

                  {/* Social & work links */}
                  {(s.website || s.linkedin || s.instagram || s.what_you_do || s.country || s.city) && (
                    <div style={{ marginBottom: 20, padding: "14px 16px", border: "1px solid rgba(201,169,97,0.10)", background: "rgba(201,169,97,0.06)" }}>
                      <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 10px" }}>About You \u2014 Social & Work</p>
                      {s.website && <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", margin: "0 0 6px" }}><strong style={{ color: "rgba(244,236,216,0.85)" }}>Website:</strong> {s.website}</p>}
                      {s.linkedin && <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", margin: "0 0 6px" }}><strong style={{ color: "rgba(244,236,216,0.85)" }}>LinkedIn:</strong> {s.linkedin}</p>}
                      {s.instagram && <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", margin: "0 0 6px" }}><strong style={{ color: "rgba(244,236,216,0.85)" }}>Instagram:</strong> {s.instagram}</p>}
                      {(s.city || s.country) && <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", margin: "0 0 6px" }}><strong style={{ color: "rgba(244,236,216,0.85)" }}>Location:</strong> {[s.city, s.country].filter(Boolean).join(", ")}</p>}
                      {s.what_you_do && (
                        <div style={{ margin: "8px 0 0" }}>
                          <p style={{ fontSize: 11, color: "rgba(244,236,216,0.85)", margin: "0 0 6px" }}>What you do:</p>
                          <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", lineHeight: 1.75, margin: 0, fontStyle: "italic", whiteSpace: "pre-wrap" }}>{s.what_you_do}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full story */}
                  {s.title && (
                    <p style={{ fontSize: 14, color: GOLD, margin: "0 0 8px", fontStyle: "italic", fontWeight: 500 }}>{s.title}</p>
                  )}
                  <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", margin: "0 0 8px" }}>Full story:</p>
                  <div style={{ padding: "16px 18px", background: "rgba(244,236,216,0.95)", border: "1px solid rgba(244,236,216,0.08)", marginBottom: 20 }}>
                    <p style={{ fontSize: 13, color: "rgba(244,236,216,0.95)", lineHeight: 1.85, margin: 0, fontFamily: "'Poppins', sans-serif", fontStyle: "italic", whiteSpace: "pre-wrap" }}>{s.story}</p>
                  </div>
                  {s.wish_you_knew && (
                    <div style={{ marginBottom: 20, padding: "14px 16px", border: "1px solid rgba(201,169,97,0.10)", background: "rgba(201,169,97,0.06)" }}>
                      <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 10px" }}>What she wishes she knew</p>
                      <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", lineHeight: 1.75, margin: 0, fontStyle: "italic", whiteSpace: "pre-wrap" }}>{s.wish_you_knew}</p>
                    </div>
                  )}

                  {/* Wellbeing & support data */}
                  {(s.wellbeing_issues?.length || s.sought_support || s.support_providers?.length || s.support_testimonial) && (
                    <div style={{ marginBottom: 20, padding: "16px 18px", border: "1px solid rgba(201,169,97,0.10)", background: "rgba(201,169,97,0.06)" }}>
                      <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 12px" }}>Your Journey — Wellbeing & Support</p>
                      {(s.wellbeing_issues?.length ?? 0) > 0 && (
                        <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", margin: "0 0 8px" }}>
                          <strong style={{ color: "rgba(244,236,216,0.85)" }}>Issues:</strong> {(s.wellbeing_issues ?? []).join(", ")}
                        </p>
                      )}
                      {s.sought_support && (
                        <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", margin: "0 0 8px" }}>
                          <strong style={{ color: "rgba(244,236,216,0.85)" }}>Sought support:</strong> {s.sought_support}
                        </p>
                      )}
                      {(s.support_providers?.length ?? 0) > 0 && (
                        <p style={{ fontSize: 11, color: "rgba(244,236,216,0.95)", margin: "0 0 8px" }}>
                          <strong style={{ color: "rgba(244,236,216,0.85)" }}>Providers:</strong> {(s.support_providers ?? []).join(", ")}
                        </p>
                      )}
                      {s.support_testimonial && (
                        <div style={{ margin: "8px 0 0" }}>
                          <p style={{ fontSize: 11, color: "rgba(244,236,216,0.85)", margin: "0 0 6px" }}>Testimonial:</p>
                          <p style={{ fontSize: 12, color: "rgba(244,236,216,0.95)", lineHeight: 1.75, margin: 0, fontStyle: "italic", whiteSpace: "pre-wrap" }}>{s.support_testimonial}</p>
                        </div>
                      )}
                      {s.may_contact && (
                        <p style={{ fontSize: 11, color: GOLD, margin: "8px 0 0" }}>✓ May be contacted
                        </p>
                      )}
                    </div>
                  )}

                  {/* Slug */}
                  <p style={{ fontSize: 10, color: "rgba(244,236,216,0.95)", margin: "0 0 16px", fontFamily: "Poppins, sans-serif" }}>
                    Slug: /stories/{s.slug}
                  </p>

                  {/* Generalised title (for anonymous) */}
                  {s.anonymous && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 10, color: "rgba(201,169,97,0.95)", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 6px" }}>Generalised title (required for anonymous)</p>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input
                          type="text"
                          value={genTitles[s.id] ?? (s.generalized_title || "")}
                          onChange={e => setGenTitles(t => ({ ...t, [s.id]: e.target.value }))}
                          placeholder="e.g. Finance Leader, Senior Executive, Founder…"
                          style={{ flex: 1, padding: "8px 12px", background: "transparent", border: "1px solid rgba(201,169,97,0.10)", color: IVORY, fontSize: 12, fontFamily: "Poppins, sans-serif" }}
                        />
                        {btn("Save", () => moderate.mutate({ id: s.id, generalized_title: genTitles[s.id] || s.generalized_title || "" }))}
                      </div>
                    </div>
                  )}

                  {/* Rejection note */}
                  {(s.status === "pending" || s.status === "approved") && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 10, color: "rgba(244,236,216,0.65)", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 6px" }}>Rejection note (if rejecting)</p>
                      <textarea
                        value={rejectNotes[s.id] ?? (s.rejection_note || "")}
                        onChange={e => setRejectNotes(n => ({ ...n, [s.id]: e.target.value }))}
                        placeholder="Internal note — reason for rejection (not sent to submitter)…"
                        style={{ width: "100%", padding: "10px 12px", background: "transparent", border: "1px solid rgba(244,236,216,0.08)", color: IVORY, fontSize: 12, fontFamily: "Poppins, sans-serif", minHeight: 70, boxSizing: "border-box" }}
                      />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {s.status !== "approved" && btn("Approve", () => moderate.mutate({ id: s.id, status: "approved" }), "rgba(80,200,120,0.8)")}
                    {s.status !== "rejected" && btn("Reject", () => moderate.mutate({ id: s.id, status: "rejected", rejection_note: rejectNotes[s.id] || "" }), "rgba(200,80,80,0.7)")}
                    {s.status === "pending" && btn("Hold (keep pending)", () => {}, "rgba(201,169,97,0.95)")}
                    {s.status === "approved" && btn(s.featured ? "Unfeature" : "Feature", () => moderate.mutate({ id: s.id, featured: !s.featured }))}
                  </div>

                  {moderate.isPending && <p style={{ fontSize: 11, color: "rgba(201,169,97,0.95)", margin: "10px 0 0" }}>Saving…</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
