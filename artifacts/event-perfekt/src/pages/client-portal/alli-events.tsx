import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import PortalLayout from "./layout";
import { portalFetch, getPortalToken } from "@/lib/client-portal-auth";

const GOLD = "#C9A84C";
const STATUS_COLORS: Record<string, string> = { planned: "#6b7280", confirmed: "#3b82f6", completed: "#22c55e", cancelled: "#ef4444" };

export default function AlliEventsPortal() {
  const [, setLocation] = useLocation();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => {
    const token = getPortalToken();
    if (!token) { setLocation("/client-portal/login"); return; }
    portalFetch("GET", "/api/client-portal/alli/events").then(d => {
      setEvents(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => { setEvents([]); setLoading(false); });
  }, []);

  const filtered = events.filter(e => filterStatus === "all" || String(e.status || "").toLowerCase() === filterStatus);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number; date: Date } | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) });
  const parseEventDate = (value: any) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const eventsOn = (date: Date) => filtered.filter(e => {
    const d = parseEventDate(e.event_date);
    return d && d.toDateString() === date.toDateString();
  });
  const monthEvents = useMemo(() => filtered.filter(e => {
    const d = parseEventDate(e.event_date);
    return d && d.getMonth() === month && d.getFullYear() === year;
  }), [filtered, month, year]);

  const EventCard = ({ ev }: { ev: any }) => {
    const c = STATUS_COLORS[ev.status?.toLowerCase()] || "#6b7280";
    const isSelected = selected?.id === ev.id;
    return (
      <div onClick={() => setSelected(isSelected ? null : ev)} style={{ background: isSelected ? "#fef9ee" : "#fff", border: `1px solid ${isSelected ? GOLD : "#e5e7eb"}`, borderRadius: 12, padding: 16, marginBottom: 10, cursor: "pointer" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ minWidth: 56, textAlign: "center", background: "#fef9ee", borderRadius: 8, padding: "8px 4px" }}>
            {ev.event_date ? <>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#000", textTransform: "uppercase" }}>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][new Date(ev.event_date).getMonth()]}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#000" }}>{new Date(ev.event_date).getDate()}</div>
              <div style={{ fontSize: 10, color: "#555" }}>{new Date(ev.event_date).getFullYear()}</div>
            </> : <div style={{ fontSize: 11, color: "#888" }}>TBC</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#000", fontSize: 15, marginBottom: 3 }}>{ev.event_name}</div>
            <div style={{ fontSize: 12, color: "#000", marginBottom: 6 }}>{ev.event_type} · Lead: {ev.lead_person}</div>
            {ev.location_name && <div style={{ fontSize: 12, color: "#000" }}>📍 {ev.location_name}</div>}
            {ev.target_audience && <div style={{ fontSize: 12, color: "#000" }}>👥 {ev.target_audience}{ev.expected_attendance ? ` (est. ${ev.expected_attendance})` : ""}</div>}
          </div>
          <span style={{ background: c + "22", color: c, border: `1px solid ${c}44`, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{ev.status?.toUpperCase()}</span>
        </div>
        {isSelected && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0e8d0" }}>
            {ev.description && <div style={{ fontSize: 14, color: "#000", lineHeight: 1.6, marginBottom: 10, whiteSpace: "pre-wrap" }}>{ev.description}</div>}
            {ev.location_address && <div style={{ fontSize: 13, color: "#000", marginBottom: 6 }}>📍 {ev.location_address}</div>}
            {ev.outcome_notes && (
              <div style={{ background: "#f0fdf4", borderRadius: 8, padding: 12, marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", marginBottom: 4 }}>Outcome</div>
                <div style={{ fontSize: 14, color: "#333", lineHeight: 1.6 }}>{ev.outcome_notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <PortalLayout>
      <div style={{ marginBottom: 18, borderRadius: 12, background: "#fff", padding: "14px 16px", border: "1px solid #e5e7eb" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#000", marginBottom: 4 }}>Programme Events</h1>
        <p style={{ color: "#000", fontSize: 14, margin: 0 }}>ALLI Foundation events and activities — read-only view for trustees</p>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, color: "#000" }}>
        {["all", "planned", "confirmed", "completed", "cancelled"].map(s => {
          const cnt = s === "all" ? events.length : events.filter(e => e.status === s).length;
          const c = STATUS_COLORS[s] || "#6b7280";
          return (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ background: "#fff", color: "#000", border: "1px solid #d1d5db", borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {s.charAt(0).toUpperCase() + s.slice(1)} ({cnt})
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={{ background: "#f1f5f9", border: "1px solid #e5e7eb", color: "#1f2937", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>‹ Prev</button>
        <button onClick={() => setCursor(new Date())} style={{ background: "#f1f5f9", border: "1px solid #e5e7eb", color: "#1f2937", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Today</button>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={{ background: "#f1f5f9", border: "1px solid #e5e7eb", color: "#1f2937", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Next ›</button>
      </div>

      {loading ? <p style={{ color: "#666" }}>Loading events…</p> : (
        <>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any, borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <div style={{ background: "#fff", minWidth: 490, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottom: "1px solid #e5e7eb" }}>
              <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={{ background: "#f1f5f9", border: "1px solid #e5e7eb", color: "#1f2937", padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>‹ Prev</button>
              <div style={{ fontWeight: 800, color: "#000" }}>{["January","February","March","April","May","June","July","August","September","October","November","December"][month]} {year}</div>
              <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={{ background: "#f1f5f9", border: "1px solid #e5e7eb", color: "#1f2937", padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Next ›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #e5e7eb" }}>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <div key={d} style={{ padding: 8, textAlign: "center", fontSize: 11, fontWeight: 700, color: "#6b7280", borderRight: "1px solid #e5e7eb" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
              {cells.map((c, i) => {
                if (!c) return <div key={i} style={{ minHeight: 110, borderRight: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", background: "rgba(0,0,0,0.03)" }} />;
                const dayEvents = eventsOn(c.date);
                const isToday = c.date.toDateString() === new Date().toDateString();
                return (
                  <div key={i} style={{ minHeight: 110, padding: 6, borderRight: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", background: isToday ? "rgba(201,168,76,0.08)" : "#fff" }}>
                    <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, color: isToday ? GOLD : "#1f2937", marginBottom: 4 }}>{c.day}</div>
                    {dayEvents.slice(0, 4).map(ev => (
                      <div key={ev.id} onClick={() => setSelected(ev)} style={{ background: ev.status === "completed" ? "#2563eb" : ev.status === "confirmed" ? "#7c3aed" : ev.status === "planned" ? "#f59e0b" : "#6b7280", color: "#fff", padding: "4px 6px", borderRadius: 6, fontSize: 10, marginBottom: 4, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {ev.event_name}
                      </div>
                    ))}
                    {dayEvents.length > 4 && <div style={{ fontSize: 10, color: "#6b7280" }}>+{dayEvents.length - 4} more</div>}
                  </div>
                );
              })}
            </div>
          </div>
          </div>

          <div style={{ marginTop: 20, fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Deliverables this month ({monthEvents.length})</div>
          {monthEvents.length > 0 ? monthEvents.map(ev => <EventCard key={ev.id} ev={ev} />) : <p style={{ color: "#666", textAlign: "center", padding: 40 }}>No events found.</p>}
        </>
      )}
    </PortalLayout>
  );
}
