import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import PortalLayout from "./layout";
import { clearPortalSession, getPortalToken, portalFetch } from "@/lib/client-portal-auth";

const BURGUNDY = "#3D0B0B";
const BORDER = "#e5e7eb";
const GOLD = "#C9A84C";

type Slot = {
  id: number;
  slot_label: string;
  slot_date: string;
  is_selected: boolean;
};

type Meeting = {
  id: number;
  title: string;
  phase_number: number;
  gateway_type: string;
  meeting_date: string | null;
  location: string | null;
  meeting_link: string | null;
  description: string | null;
  slots: Slot[];
};

export default function GatewayMeetingPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ slug: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const slug = params.slug || "";

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    async function load() {
      if (!getPortalToken()) { setLocation("/client-portal/login"); return; }
      try {
        const data = await portalFetch("GET", `/api/client-portal/gateway/${slug}`);
        setMeeting(data || null);
      } catch (e: any) {
        if (e.message?.includes("401")) { clearPortalSession(); setLocation("/client-portal/login"); }
        else showToast(e.message || "Unable to load meeting");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const selected = useMemo(() => meeting?.slots?.find(s => s.id === selectedSlot) || null, [meeting, selectedSlot]);

  const submit = async () => {
    if (!meeting || !name.trim() || !email.trim()) return;
    setSaving(true);
    try {
      await portalFetch("POST", `/api/client-portal/gateway/${meeting.id}/respond`, {
        responder_name: name.trim(),
        responder_email: email.trim(),
        response_status: selectedSlot ? "selected" : "cannot_attend",
        selected_slot_id: selectedSlot || null,
        note: note.trim() || null,
      });
      showToast("Response sent");
      setNote("");
    } catch (e: any) {
      showToast(e.message || "Failed to send response");
    }
    setSaving(false);
  };

  if (loading) return <PortalLayout><div style={{ color: "#fff", textAlign: "center", padding: 60 }}>Loading gateway meeting…</div></PortalLayout>;
  if (!meeting) return <PortalLayout><div style={{ color: "#fff", textAlign: "center", padding: 60 }}>Meeting not found.</div></PortalLayout>;

  return (
    <PortalLayout>
      {toast && <div style={{ position: "fixed", top: 20, right: 20, background: "#fff", color: "#000", border: `1px solid ${BORDER}`, padding: "12px 18px", borderRadius: 8, zIndex: 9999 }}>{toast}</div>}
      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
        <div style={{ display: "inline-block", background: GOLD, color: "#000", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 800, marginBottom: 12 }}>Gateway Meeting</div>
        <h1 style={{ margin: 0, color: "#000", fontSize: 28, fontWeight: 800 }}>{meeting.title}</h1>
        <p style={{ color: "#000", marginTop: 8, lineHeight: 1.6 }}>Phase {meeting.phase_number} · {meeting.gateway_type.replace(/_/g, " ")}</p>
        {meeting.description && <p style={{ color: "#000", lineHeight: 1.7 }}>{meeting.description}</p>}

        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          {meeting.slots.map(slot => (
            <button key={slot.id} onClick={() => setSelectedSlot(slot.id)} style={{ textAlign: "left", background: selectedSlot === slot.id ? "#fdf6e3" : "#fff", border: `1px solid ${selectedSlot === slot.id ? GOLD : BORDER}`, borderRadius: 10, padding: 14, cursor: "pointer" }}>
              <div style={{ fontWeight: 700, color: "#000" }}>{slot.slot_label}</div>
              <div style={{ fontSize: 13, color: "#000", marginTop: 4 }}>{new Date(slot.slot_date).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ padding: "12px 14px", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#000" }} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" style={{ padding: "12px 14px", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#000" }} />
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note for EP team (optional)" rows={4} style={{ padding: "12px 14px", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#000", resize: "vertical" }} />
          <button onClick={submit} disabled={saving || !name.trim() || !email.trim()} style={{ background: BURGUNDY, color: "#fff", border: "none", borderRadius: 8, padding: "12px 16px", fontWeight: 800, cursor: "pointer" }}>
            {selected ? "Submit chosen slot" : "Respond unavailable"}
          </button>
        </div>
      </div>
    </PortalLayout>
  );
}
