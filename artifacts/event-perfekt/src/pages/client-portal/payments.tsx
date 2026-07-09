import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout from "./layout";
import { getPortalToken, clearPortalSession, portalFetch } from "@/lib/client-portal-auth";

const G = {
  card:   "#ffffff0d",
  border: "rgba(255,255,255,0.12)",
  gold:   "#C9A84C",
  green:  "#22c55e",
  amber:  "#f59e0b",
  red:    "#ef4444",
  blue:   "#3b82f6",
  grey:   "#9ca3af",
  text:   "#fff",
  muted:  "rgba(255,255,255,0.55)",
};

const STATUS_MAP: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  pending:   { color: G.amber, bg: `${G.amber}20`, label: "Pending",   dot: G.amber },
  sent:      { color: G.blue,  bg: `${G.blue}20`,  label: "Sent",      dot: G.blue  },
  paid:      { color: G.green, bg: `${G.green}20`, label: "Paid ✓",    dot: G.green },
  overdue:   { color: G.red,   bg: `${G.red}20`,   label: "Overdue",   dot: G.red   },
  cancelled: { color: G.grey,  bg: `${G.grey}20`,  label: "Cancelled", dot: G.grey  },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 800, border: `1px solid ${s.color}40`, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  return <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />;
}

function fmt(amount: any, currency = "GBP") {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(amount));
}

export default function ClientPortalPayments() {
  const [, setLocation] = useLocation();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getPortalToken();
    if (!token) { setLocation("/client-portal/login"); return; }
    (async () => {
      try {
        const data = await portalFetch("GET", "/api/client-portal/invoices");
        setInvoices(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (e.message?.includes("401") || e.message?.includes("Unauthorised")) { clearPortalSession(); setLocation("/client-portal/login"); return; }
      }
      setLoading(false);
    })();
  }, []);

  const totalOwed = invoices.filter(i => ["pending","overdue","sent"].includes(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0);
  const overdue   = invoices.filter(i => i.status === "overdue");

  return (
    <PortalLayout>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: G.text, margin: 0, marginBottom: 4 }}>Payments & Invoices</h1>
        <p style={{ color: G.muted, fontSize: 13, margin: 0 }}>All invoices issued by Event Perfekt Global Ltd for your engagement.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: G.muted }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${G.gold}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
          Loading invoices…
        </div>
      ) : invoices.length === 0 ? (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>📄</div>
          <h3 style={{ color: G.text, marginBottom: 8, fontSize: 18 }}>No invoices yet</h3>
          <p style={{ color: G.muted, fontSize: 13 }}>Invoices from Event Perfekt will appear here when issued. You'll receive an email notification for each new invoice.</p>
        </div>
      ) : (
        <div>
          {/* Summary KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderTop: `3px solid ${G.red}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Outstanding</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: totalOwed > 0 ? G.red : G.green }}>{fmt(totalOwed)}</div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>{invoices.filter(i => ["pending","overdue","sent"].includes(i.status)).length} invoice(s)</div>
            </div>
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderTop: `3px solid ${G.green}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Total Paid</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: G.green }}>{fmt(totalPaid)}</div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>{invoices.filter(i => i.status === "paid").length} invoice(s)</div>
            </div>
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderTop: `3px solid ${overdue.length > 0 ? G.red : G.grey}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Overdue</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: overdue.length > 0 ? G.red : G.muted }}>{overdue.length}</div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>{overdue.length > 0 ? "Action needed" : "None outstanding"}</div>
            </div>
          </div>

          {/* Overdue alert */}
          {overdue.length > 0 && (
            <div style={{ background: `${G.red}12`, border: `1px solid ${G.red}40`, borderLeft: `4px solid ${G.red}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>🔴</span>
              <div>
                <div style={{ fontWeight: 800, color: G.red, fontSize: 14 }}>{overdue.length} overdue invoice{overdue.length > 1 ? "s" : ""}</div>
                <div style={{ color: G.muted, fontSize: 12, marginTop: 2 }}>Please contact <a href="mailto:info@eventperfekt.com" style={{ color: G.gold }}>info@eventperfekt.com</a> to arrange payment</div>
              </div>
            </div>
          )}

          {/* Invoice cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {invoices.map((inv) => {
              const s = STATUS_MAP[inv.status] || STATUS_MAP.pending;
              const isOverdue = inv.status === "overdue";
              const isPaid = inv.status === "paid";

              return (
                <div key={inv.id} style={{ background: G.card, border: `1px solid ${G.border}`, borderLeft: `4px solid ${s.color}`, borderRadius: 10, padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <StatusDot status={inv.status} />
                        <span style={{ fontWeight: 800, color: G.text, fontSize: 15 }}>{inv.reference || inv.invoice_ref || inv.invoice_number || "Invoice"}</span>
                        {(inv.pdf_url || inv.document_url) && (
                          <a href={inv.pdf_url || inv.document_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: G.gold, textDecoration: "none", fontWeight: 600, marginLeft: 4 }}>
                            ↓ PDF
                          </a>
                        )}
                      </div>
                      {(inv.description || inv.notes) && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>{inv.description || inv.notes}</div>}
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: G.muted }}>
                        {(inv.issued_date || inv.issue_date || inv.date_issued) && (
                          <span>📅 Issued: {new Date(inv.issued_date || inv.issue_date || inv.date_issued).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        )}
                        {inv.due_date && (
                          <span style={{ color: isOverdue ? G.red : G.muted }}>
                            {isOverdue ? "⚠️" : "🗓️"} Due: {new Date(inv.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: isPaid ? G.green : isOverdue ? G.red : G.text }}>
                        {fmt(inv.amount, inv.currency || "GBP")}
                      </div>
                      <StatusBadge status={inv.status} />
                      {inv.paid_at && <div style={{ fontSize: 10, color: G.green }}>Paid {new Date(inv.paid_at).toLocaleDateString("en-GB")}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 18, fontSize: 12, color: G.muted }}>
            For payment queries, contact <a href="mailto:info@eventperfekt.com" style={{ color: G.gold, fontWeight: 600 }}>info@eventperfekt.com</a>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
