import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useVisitorTracking } from "@/hooks/use-visitor-tracking";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

const INK = "#330311";
const GOLD = "#C9A961";
const IVORY = "#F4ECD8";

const STATUS_COLORS: Record<string, string> = {
  pending: "#C9A961",
  approved: "#4CAF50",
  rejected: "#F44336",
};

type Submission = {
  id: number;
  businessName: string;
  founderName: string | null;
  category: string;
  cityDisplay: string | null;
  website: string | null;
  instagram: string | null;
  email: string | null;
  phone: string | null;
  aboutBusiness: string | null;
  whatMakesWorthDiscovering: string | null;
  offerDiscount: string | null;
  interestedPartnership: boolean;
  partnershipValue: string | null;
  imageUrl: string | null;
  status: string;
  createdAt: string | null;
  ipAddress: string | null;
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

export default function AdminIamherBusinesses() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<number | null>(null);

  useVisitorTracking("/admin/iamher/businesses", "Admin: Business Submissions");

  const fetchAll = () => {
    setLoading(true);
    fetch("/api/iamher/admin/business-submissions", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(r => {
        if (r.status === 401) throw new Error("Please sign in as staff to review submissions.");
        if (r.status === 403) throw new Error("Staff access required.");
        if (!r.ok) throw new Error("Failed to load.");
        return r.json();
      })
      .then(data => {
        setSubmissions(data.businesses || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    try {
      const r = await fetch(`/api/iamher/business-submissions/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("Update failed");
      fetchAll();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter === "all"
    ? submissions
    : submissions.filter(s => s.status === filter);

  const counts: Record<string, number> = {
    all: submissions.length,
    pending: submissions.filter(s => s.status === "pending").length,
    approved: submissions.filter(s => s.status === "approved").length,
    rejected: submissions.filter(s => s.status === "rejected").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: INK, color: IVORY, fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
      `}</style>

      <header style={{ padding: "16px 24px", borderBottom: "1px solid rgba(201,169,97,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <img src={eventPerfektLogo} alt="Event Perfekt" style={{ height: 36, width: "auto", borderRadius: 6 }} />
            <span style={{ fontSize: 12, color: "rgba(244,236,216,0.55)", letterSpacing: "0.08em" }}>Admin: Business Submissions</span>
          </Link>
          <Link href="/iamher/stay" style={{ fontSize: 11, color: "rgba(244,236,216,0.65)", textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            ← Back to Stay & Enjoy
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px 80px" }}>
        <motion.div {...fadeUp}>
          <h1 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 300, fontSize: 28, color: IVORY, margin: "0 0 24px", letterSpacing: "-0.01em" }}>
            Business Submissions
          </h1>

          {error && (
            <div style={{ padding: 16, border: "1px solid rgba(244,76,54,0.4)", background: "rgba(244,76,54,0.08)", marginBottom: 24, fontSize: 13, color: "rgba(244,236,216,0.75)" }}>
              {error}
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
            {(["all", "pending", "approved", "rejected"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "10px 20px",
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'Poppins', sans-serif",
                  background: filter === f ? GOLD : "transparent",
                  color: filter === f ? INK : "rgba(244,236,216,0.75)",
                  border: `1px solid ${filter === f ? GOLD : "rgba(201,169,97,0.3)"}`,
                  transition: "all 0.2s",
                }}
              >
                {f} ({counts[f]})
              </button>
            ))}
          </div>
        </motion.div>

        {loading ? (
          <p style={{ fontSize: 14, color: "rgba(244,236,216,0.45)" }}>Loading submissions...</p>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 14, color: "rgba(244,236,216,0.55)" }}>No submissions in this category.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 20 }}>
            {filtered.map((s, i) => (
              <motion.div key={s.id} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}>
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(201,169,97,0.1)",
                  padding: "24px 28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "'Poppins', sans-serif" }}>
                        {s.category} · {s.cityDisplay || "Milton Keynes"}
                      </p>
                      <p style={{ fontSize: 16, color: IVORY, margin: 0, fontWeight: 500, fontFamily: "'Poppins', sans-serif" }}>{s.businessName}</p>
                      {s.founderName && (
                        <p style={{ fontSize: 13, color: "rgba(244,236,216,0.65)", margin: "4px 0 0", fontWeight: 300, fontStyle: "italic" }}>
                          {s.founderName}
                        </p>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: STATUS_COLORS[s.status] || "rgba(244,236,216,0.55)",
                      border: `1px solid ${STATUS_COLORS[s.status] || "rgba(244,236,216,0.2)"}`,
                      padding: "4px 10px",
                      fontFamily: "'Poppins', sans-serif",
                    }}>
                      {s.status}
                    </span>
                  </div>

                  {s.imageUrl && (
                    <div style={{ width: "100%", height: 160, overflow: "hidden" }}>
                      <img src={s.imageUrl} alt={s.businessName} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                  )}

                  {s.aboutBusiness && (
                    <p style={{ fontSize: 13, color: "rgba(244,236,216,0.75)", lineHeight: 1.75, margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 300 }}>
                      {s.aboutBusiness}
                    </p>
                  )}

                  {s.whatMakesWorthDiscovering && (
                    <p style={{ fontSize: 13, color: "rgba(244,236,216,0.65)", lineHeight: 1.75, margin: 0, fontFamily: "'Poppins', sans-serif", fontWeight: 300, fontStyle: "italic" }}>
                      <strong style={{ color: GOLD, fontWeight: 500, fontStyle: "normal" }}>Worth discovering:</strong> {s.whatMakesWorthDiscovering}
                    </p>
                  )}

                  {s.offerDiscount && (
                    <p style={{ fontSize: 12, color: "rgba(201,169,97,0.85)", fontStyle: "italic", margin: 0, fontFamily: "'Poppins', sans-serif" }}>
                      <strong style={{ color: GOLD, fontWeight: 500, fontStyle: "normal" }}>Offer:</strong> {s.offerDiscount}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                    {s.website && (
                      <a href={s.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "rgba(201,169,97,0.85)", letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none", fontFamily: "'Poppins', sans-serif", borderBottom: "1px solid rgba(201,169,97,0.40)", paddingBottom: 1 }}>
                        Website
                      </a>
                    )}
                    {s.instagram && (
                      <a href={s.instagram.startsWith("http") ? s.instagram : `https://instagram.com/${s.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "rgba(201,169,97,0.85)", letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none", fontFamily: "'Poppins', sans-serif", borderBottom: "1px solid rgba(201,169,97,0.40)", paddingBottom: 1 }}>
                        Instagram
                      </a>
                    )}
                    {s.email && (
                      <a href={`mailto:${s.email}`} style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none", fontFamily: "'Poppins', sans-serif", borderBottom: "1px solid rgba(244,236,216,0.25)", paddingBottom: 1 }}>
                        Email
                      </a>
                    )}
                    {s.phone && (
                      <a href={`tel:${s.phone}`} style={{ fontSize: 10, color: "rgba(244,236,216,0.55)", letterSpacing: "0.15em", textTransform: "uppercase", textDecoration: "none", fontFamily: "'Poppins', sans-serif", borderBottom: "1px solid rgba(244,236,216,0.25)", paddingBottom: 1 }}>
                        Phone
                      </a>
                    )}
                  </div>

                  {s.interestedPartnership && (
                    <div style={{ margin: "8px 0" }}>
                      <p style={{ fontSize: 11, color: "rgba(201,169,97,0.85)", margin: "0 0 4px", fontFamily: "'Poppins', sans-serif" }}>
                        🙌 Interested in partnership
                      </p>
                      {s.partnershipValue && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(() => {
                            try {
                              const values = JSON.parse(s.partnershipValue) as string[];
                              const labels: Record<string, string> = {
                                value_awareness: "Brand awareness",
                                value_reward: "Reward structure",
                                value_exclusive: "Exclusive access",
                                value_content: "Content creation",
                                value_network: "Network access",
                                value_other: "Other",
                              };
                              return values.map(v => (
                                <span key={v} style={{ fontSize: 10, color: "rgba(244,236,216,0.70)", background: "rgba(201,169,97,0.10)", padding: "3px 10px", borderRadius: 4, fontFamily: "'Poppins', sans-serif" }}>
                                  {labels[v] || v}
                                </span>
                              ));
                            } catch {
                              return <span style={{ fontSize: 10, color: "rgba(244,236,216,0.50)" }}>{s.partnershipValue}</span>;
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  <p style={{ fontSize: 10, color: "rgba(244,236,216,0.35)", margin: 0, fontFamily: "'Poppins', sans-serif" }}>
                    Submitted: {s.createdAt ? new Date(s.createdAt).toLocaleString() : "N/A"}
                    {s.ipAddress && ` · IP: ${s.ipAddress}`}
                  </p>

                  {/* Actions */}
                  {s.status === "pending" && (
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      <button
                        disabled={updating === s.id}
                        onClick={() => updateStatus(s.id, "approved")}
                        style={{
                          flex: 1,
                          padding: "10px 16px",
                          background: "#4CAF50",
                          color: "#fff",
                          fontSize: 10,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                          fontFamily: "'Poppins', sans-serif",
                          border: "none",
                          opacity: updating === s.id ? 0.5 : 1,
                        }}
                      >
                        {updating === s.id ? "Updating..." : "Approve"}
                      </button>
                      <button
                        disabled={updating === s.id}
                        onClick={() => updateStatus(s.id, "rejected")}
                        style={{
                          flex: 1,
                          padding: "10px 16px",
                          background: "#F44336",
                          color: "#fff",
                          fontSize: 10,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                          fontFamily: "'Poppins', sans-serif",
                          border: "none",
                          opacity: updating === s.id ? 0.5 : 1,
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {s.status === "approved" && (
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      <Link href={`/iamher/business/${s.id}`} style={{ flex: 1, textAlign: "center", padding: "10px 16px", background: "transparent", border: `1px solid ${GOLD}`, color: GOLD, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none", fontFamily: "'Poppins', sans-serif" }}>
                        View Public Page
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
