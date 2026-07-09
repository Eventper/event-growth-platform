import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

const COLLAB_TOKEN_KEY = "collab_token";
const COLLAB_USER_KEY = "collab_user";

export default function CollaboratorPortal() {
  const [, setLocation] = useLocation();
  const [accepting] = useRoute<{ token: string }>("/collaborator/accept/:token");
  const [viewing] = useRoute<{ token: string }>("/collaborator/:token");
  const token = (accepting as any)?.token || (viewing as any)?.token;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!token) { setLoading(false); setError("No invitation token provided"); return; }
    (async () => {
      try {
        // Accept step
        const acceptRes = await fetch(`/api/ep-collaborator/accept/${token}`);
        if (!acceptRes.ok) throw new Error((await acceptRes.json()).message || "Invalid or expired invitation");
        // Exchange for session
        const loginRes = await fetch("/api/ep-collaborator/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: token }),
        });
        if (!loginRes.ok) throw new Error((await loginRes.json()).message || "Login failed");
        const loginData = await loginRes.json();
        localStorage.setItem(COLLAB_TOKEN_KEY, loginData.token);
        localStorage.setItem(COLLAB_USER_KEY, JSON.stringify(loginData.collaborator));
        // Portal view
        const portalRes = await fetch("/api/ep-collaborator/portal", { headers: { Authorization: `Bearer ${loginData.token}` } });
        if (!portalRes.ok) throw new Error((await portalRes.json()).message || "Portal fetch failed");
        setData(await portalRes.json());
      } catch (e: any) {
        setError(e.message || "Something went wrong");
      }
      setLoading(false);
    })();
  }, [token]);

  function signOut() {
    localStorage.removeItem(COLLAB_TOKEN_KEY);
    localStorage.removeItem(COLLAB_USER_KEY);
    setLocation("/");
  }

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f6f1" }}>
    <div style={{ color: "#888" }}>Loading invitation…</div>
  </div>;

  if (error) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f6f1", padding: 20 }}>
    <div style={{ maxWidth: 400, background: "#fff", border: "1px solid #fecaca", borderRadius: 10, padding: 28, textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠</div>
      <h2 style={{ color: "#dc2626", fontSize: 18, margin: "0 0 8px" }}>Invitation Problem</h2>
      <p style={{ color: "#666", fontSize: 13 }}>{error}</p>
    </div>
  </div>;

  const c = data?.collaborator;
  const client = data?.client;
  const access: string[] = c?.document_access || [];
  const showAll = access.length === 0;
  const show = (key: string) => showAll || access.includes(key);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f6f1" }}>
      <header style={{ background: "#3D0B0B", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logoPath} alt="Event Perfekt" style={{ height: 36, objectFit: "contain" }} />
          <div>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{client?.organisation_name || "Project Portal"}</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>Via Event Perfekt Global Ltd</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{c?.full_name}</div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 10 }}>{c?.organisation || c?.role}</div>
          </div>
          <button onClick={signOut} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, padding: "6px 14px", fontSize: 11, cursor: "pointer" }}>Sign Out</button>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a0a0e", margin: "0 0 6px" }}>Welcome, {c?.full_name}</h1>
          <p style={{ color: "#666", fontSize: 13, margin: 0 }}>You have been invited as <strong>{c?.role || "a collaborator"}</strong> to view the {client?.organisation_name} project.</p>
        </div>

        {show("Project overview and timeline") && data?.deliverables?.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#3D0B0B", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>Project Deliverables</h2>
            <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 16 }}>
              {[1, 2, 3].map(ph => {
                const phDelivs = (data.deliverables as any[]).filter(d => d.phase_number === ph);
                if ((c?.document_access || []).length && !showAll && !access.includes(`Phase ${ph} deliverables`)) return null;
                if (phDelivs.length === 0) return null;
                return (
                  <div key={ph} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1a0a0e", marginBottom: 6 }}>Phase {ph} — {phDelivs[0]?.phase || "—"}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {phDelivs.map(d => (
                        <div key={d.id} style={{ fontSize: 12, color: "#555", paddingLeft: 12 }}>
                          · {d.deliverable_name || "—"} <span style={{ color: "#888", fontSize: 11 }}>— {d.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {data?.events?.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#3D0B0B", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>Upcoming Events</h2>
            <div style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 10, padding: 16 }}>
              {data.events.slice(0, 6).map((e: any) => {
                const d = new Date(e.start_date);
                return (
                  <div key={e.id} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f0ebe6" }}>
                    <div style={{ minWidth: 48, textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#888", fontWeight: 700, textTransform: "uppercase" }}>{d.toLocaleDateString("en-GB", { month: "short" })}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#1a0a0e" }}>{d.getDate()}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a0a0e" }}>{e.title}</div>
                      {e.description && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{e.description}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {show("Legal documents") && data?.documents?.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#3D0B0B", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>Documents</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.documents.map((d: any) => (
                <div key={d.id} style={{ background: "#fff", border: "1px solid #e8e0d8", borderRadius: 8, padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 22 }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a0a0e" }}>{d.document_name}</div>
                    <div style={{ fontSize: 10, color: "#888" }}>{d.document_category}</div>
                  </div>
                  {d.current_file && <a href={d.current_file.file_url} download style={{ padding: "6px 12px", background: "#3D0B0B", color: "#fff", borderRadius: 5, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>Download</a>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer style={{ textAlign: "center", padding: 20, fontSize: 11, color: "#999" }}>
        {client?.organisation_name} portal hosted by Event Perfekt Global Ltd · Company No. 15875326
      </footer>
    </div>
  );
}
