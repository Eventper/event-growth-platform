import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout from "./layout";
import { getPortalToken, clearPortalSession, portalFetch } from "@/lib/client-portal-auth";

const BURGUNDY = "#3D0B0B";
const GOLD = "#C9A84C";
const CARD_BG = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT = "#1f2937";
const MUTED = "#6b7280";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const BANK_HOLIDAYS_2026 = new Set([
  "2026-01-01",
  "2026-04-03",
  "2026-04-06",
  "2026-05-04",
  "2026-05-25",
  "2026-08-31",
  "2026-12-25",
  "2026-12-28",
]);

type Event = {
  id: number;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  location: string | null;
  video_link: string | null;
  ep_attendees: string[];
  client_attendees: string[];
  client_response: string;
  phase_number: number | null;
  is_gateway: boolean;
  gateway_type: string | null;
  colour: string;
};

export default function ClientPortalCalendar() {
  const [, setLocation] = useLocation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week" | "kanban">("month");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Event | null>(null);
  const [responding, setResponding] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(""), 3000); }

  async function load() {
    if (!getPortalToken()) { setLocation("/client-portal/login"); return; }
    try {
      const d = await portalFetch("GET", "/api/ep-client-portal/calendar");
      setEvents(Array.isArray(d) ? d : []);
    } catch (e: any) {
      if (e.message?.includes("401")) { clearPortalSession(); setLocation("/client-portal/login"); }
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function respond(eventId: number, response: "accepted" | "declined") {
    setResponding(eventId);
    try {
      await portalFetch("POST", `/api/ep-client-portal/calendar/${eventId}/respond`, { response });
      showToast(response === "accepted" ? "Accepted ✓" : "Declined");
      load();
      setSelected(null);
    } catch (e: any) { showToast(e.message || "Failed"); }
    setResponding(null);
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number; date: Date } | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) });

  function eventsOn(date: Date) {
    const key = date.toDateString();
    return events.filter(e => new Date(e.start_date).toDateString() === key);
  }

  const upcoming = events.filter(e => new Date(e.start_date) >= new Date()).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const past = events.filter(e => new Date(e.start_date) < new Date()).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  const byStatus = (status: "red" | "amber" | "green") => events.filter((e: any) => {
    const s = (e.colour || "").toLowerCase();
    return status === "red" ? s.includes("red") || s.includes("decline") : status === "amber" ? s.includes("amber") || s.includes("pending") || s.includes("hold") : s.includes("green") || s.includes("accepted") || s.includes("done");
  });
  const dateKey = (d: Date) => d.toISOString().slice(0, 10);
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
  const isBankHoliday = (d: Date) => BANK_HOLIDAYS_2026.has(dateKey(d));

  if (loading) return <PortalLayout><div style={{ textAlign: "center", padding: 60, color: TEXT }}>Loading calendar…</div></PortalLayout>;

  return (
    <PortalLayout>
      {toast && <div style={{ position: "fixed", top: 20, right: 20, background: "#1a0015", color: "#fff", border: `1px solid ${GOLD}40`, padding: "12px 20px", borderRadius: 10, zIndex: 9999, fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", fontWeight: 500 }}>{toast}</div>}

      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0, marginBottom: 4 }}>Project Calendar</h2>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: 0 }}>Meetings, gateways, deliverables and payments</p>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button onClick={() => setView("month")} style={{ padding: "8px 16px", background: view === "month" ? GOLD : "rgba(255,255,255,0.15)", color: view === "month" ? "#1a0015" : "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Month</button>
          <button onClick={() => setView("week")} style={{ padding: "8px 16px", background: view === "week" ? GOLD : "rgba(255,255,255,0.15)", color: view === "week" ? "#1a0015" : "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Week</button>
          <button onClick={() => setView("kanban")} style={{ padding: "8px 16px", background: view === "kanban" ? GOLD : "rgba(255,255,255,0.15)", color: view === "kanban" ? "#1a0015" : "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Kanban</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={{ background: "#f1f5f9", border: `1px solid ${BORDER}`, color: TEXT, padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>‹ Prev</button>
        <button onClick={() => setCursor(new Date())} style={{ background: "#f1f5f9", border: `1px solid ${BORDER}`, color: TEXT, padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Today</button>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={{ background: "#f1f5f9", border: `1px solid ${BORDER}`, color: TEXT, padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Next ›</button>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, color: "#fff", fontSize: 12 }}>
        <span>Weekend</span>
        <span>Bank holiday</span>
        <span>Weekend + bank holiday</span>
      </div>

      {view === "month" ? (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any, borderRadius: 12, border: `1px solid ${BORDER}` }}>
          <div style={{ background: CARD_BG, minWidth: 490, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottom: `1px solid ${BORDER}` }}>
            <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={{ background: "#f1f5f9", border: `1px solid ${BORDER}`, color: TEXT, padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>‹ Prev</button>
            <div style={{ fontWeight: 800, color: TEXT }}>{MONTH_NAMES[month]} {year}</div>
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={{ background: "#f1f5f9", border: `1px solid ${BORDER}`, color: TEXT, padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Next ›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${BORDER}` }}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} style={{ padding: 8, textAlign: "center", fontSize: 11, fontWeight: 700, color: MUTED, borderRight: `1px solid ${BORDER}` }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {(Array.isArray(cells) ? cells : []).map((c, i) => {
              if (!c) return <div key={i} style={{ minHeight: 90, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: "rgba(0,0,0,0.15)" }} />;
              const dayEvents = eventsOn(c.date);
              const isToday = c.date.toDateString() === today.toDateString();
              const weekend = isWeekend(c.date);
              const holiday = isBankHoliday(c.date);
              return (
                <div key={i} style={{ minHeight: 90, padding: 4, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: isToday ? "rgba(201,168,76,0.1)" : holiday ? "rgba(220,38,38,0.08)" : weekend ? "rgba(17,24,39,0.04)" : "transparent" }}>
                  <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, color: isToday ? GOLD : TEXT, marginBottom: 2 }}>{c.day}</div>
                  {holiday && <div style={{ fontSize: 9, fontWeight: 800, color: "#dc2626", marginBottom: 3 }}>BANK HOLIDAY</div>}
                  {dayEvents.slice(0, 3).map(e => {
                    const chip = e.colour?.toLowerCase().includes("red") ? "#dc2626" : e.colour?.toLowerCase().includes("amber") ? "#d97706" : "#16a34a";
                    return (
                    <div key={e.id} onClick={() => setSelected(e)} style={{ background: chip, color: "#fff", padding: "2px 5px", borderRadius: 3, fontSize: 10, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, cursor: "pointer", border: "none" }}>
                      {e.title}
                    </div>
                  );})}
                  {dayEvents.length > 3 && <div style={{ fontSize: 10, color: MUTED }}>+{dayEvents.length - 3} more</div>}
                </div>
              );
            })}
          </div>
        </div>
        </div>
      ) : view === "week" ? (
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: TEXT, margin: "0 0 12px" }}>This Week</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {events.slice(0, 7).map(e => {
              const chip = e.colour?.toLowerCase().includes("red") ? "#dc2626" : e.colour?.toLowerCase().includes("amber") ? "#d97706" : "#16a34a";
              return <EventRow key={e.id} ev={e} onClick={() => setSelected(e)} chipColor={chip} />;
            })}
          </div>
        </div>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 14, minWidth: 480 }}>
            <KanbanColumn title="Red" accent="#dc2626" items={byStatus("red")} onPick={setSelected} />
            <KanbanColumn title="Amber" accent="#d97706" items={byStatus("amber")} onPick={setSelected} />
            <KanbanColumn title="Green" accent="#16a34a" items={byStatus("green")} onPick={setSelected} />
          </div>
        </div>
      )}

      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: "#1a0a12", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 28, maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ display: "inline-block", background: BURGUNDY, color: "#fff", padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, marginBottom: 6, border: `1px solid ${GOLD}40` }}>
                  {selected.event_type.replace(/_/g, " ")}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>{selected.title}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 22, color: MUTED, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 10 }}>
              📅 {new Date(selected.start_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {!selected.all_day && <span> · {new Date(selected.start_date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
            {selected.location && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 6 }}>📍 {selected.location}</div>}
            {selected.video_link && <div style={{ fontSize: 13, marginBottom: 10 }}>🔗 <a href={selected.video_link} target="_blank" rel="noopener noreferrer" style={{ color: GOLD, fontWeight: 600 }}>Join meeting</a></div>}
            {selected.description && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, marginBottom: 12 }}>{selected.description}</p>}
            {selected.ep_attendees?.length > 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 4 }}>EP attending: {selected.ep_attendees.join(", ")}</div>}
            {selected.is_gateway && (
              <div style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: "#f59e0b", marginTop: 10 }}>
                ⚑ Gateway — {selected.gateway_type?.replace(/_/g, " ")}
              </div>
            )}
            {selected.event_type === "meeting" && (
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                {selected.client_response === "accepted" ? (
                  <span style={{ color: "#10b981", fontSize: 13, fontWeight: 700 }}>✓ You accepted</span>
                ) : selected.client_response === "declined" ? (
                  <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 700 }}>✗ You declined</span>
                ) : (
                  <>
                    <button disabled={responding === selected.id} onClick={() => respond(selected.id, "accepted")} style={{ padding: "8px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✓ Accept</button>
                    <button disabled={responding === selected.id} onClick={() => respond(selected.id, "declined")} style={{ padding: "8px 20px", background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✗ Decline</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

function EventRow({ ev, onClick, chipColor }: { ev: Event; onClick: () => void; chipColor?: string }) {
  const GOLD = "#C9A84C";
  const CARD_BG = "#ffffff";
  const BORDER = "#e5e7eb";
  const TEXT = "#1f2937";
  const MUTED = "#6b7280";
  const date = new Date(ev.start_date);
  const now = new Date();
  const overdue = ev.event_type === "deliverable_due" && date < now;
  return (
    <div onClick={onClick} style={{ background: CARD_BG, border: `1px solid ${overdue ? "rgba(239,68,68,0.4)" : BORDER}`, borderLeft: `4px solid ${chipColor || (overdue ? "#ef4444" : GOLD)}`, borderRadius: 8, padding: 14, display: "flex", gap: 14, cursor: "pointer", alignItems: "center" }}>
      <div style={{ minWidth: 58, textAlign: "center" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase" as const }}>{MONTH_NAMES[date.getMonth()].slice(0, 3)}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>{date.getDate()}</div>
        {!ev.all_day && <div style={{ fontSize: 10, color: MUTED }}>{date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 2 }}>{ev.title}</div>
        <div style={{ fontSize: 11, color: MUTED, textTransform: "capitalize" as const }}>{ev.event_type.replace(/_/g, " ")}{overdue && <span style={{ color: "#ef4444", fontWeight: 700, marginLeft: 6 }}>· OVERDUE</span>}</div>
      </div>
      {ev.client_response === "accepted" && <span style={{ color: "#10b981", fontSize: 11, fontWeight: 700 }}>✓ Accepted</span>}
      {ev.client_response === "declined" && <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>✗ Declined</span>}
    </div>
  );
}

function KanbanColumn({ title, accent, items, onPick }: { title: string; accent: string; items: Event[]; onPick: (e: Event) => void }) {
  return (
    <div style={{ background: "#fff", border: `1px solid #e5e7eb`, borderRadius: 12, padding: 14, minHeight: 240 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1f2937" }}>{title}</h3>
        <span style={{ background: `${accent}22`, color: accent, borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{items.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.slice(0, 8).map(e => <EventRow key={e.id} ev={e} onClick={() => onPick(e)} chipColor={accent} />)}
      </div>
    </div>
  );
}
