import { useEffect, useState } from "react";

const BURGUNDY = "#330311";

type Loaded = {
  loading: boolean;
  ready: boolean;
  firstName: string | null;
  question: string | null;
  alreadyAnswered: boolean;
  previousResponse: string | null;
  error: string | null;
};

export default function ApplicationRespond() {
  const [info, setInfo] = useState<Loaded>({ loading: true, ready: false, firstName: null, question: null, alreadyAnswered: false, previousResponse: null, error: null });
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Reply to your application — The Woman Who Leads The Room | Event Perfekt";
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setInfo({ loading: false, ready: false, firstName: null, question: null, alreadyAnswered: false, previousResponse: null, error: "Missing link token." });
      return;
    }
    fetch(`/api/event-applications/respond?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          setInfo({ loading: false, ready: false, firstName: null, question: null, alreadyAnswered: false, previousResponse: null, error: d.message || "This link is invalid or has expired." });
        } else {
          setInfo({ loading: false, ready: true, firstName: d.firstName, question: d.question, alreadyAnswered: !!d.alreadyAnswered, previousResponse: d.previousResponse, error: null });
          if (d.previousResponse) setResponse(d.previousResponse);
        }
      })
      .catch((e) => setInfo({ loading: false, ready: false, firstName: null, question: null, alreadyAnswered: false, previousResponse: null, error: e.message || "Network error." }));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!response.trim() || response.trim().length < 5) {
      setSubmitError("Please give us a little more detail (at least 5 characters).");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token") || "";
      const r = await fetch("/api/event-applications/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, response }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.message || "Failed to submit reply.");
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", padding: "24px 16px", fontFamily: "'Poppins', sans-serif" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ background: BURGUNDY, color: "#fff", padding: "20px 16px", textAlign: "center", marginBottom: 32 }}>
          <p style={{ margin: 0, fontFamily: "Poppins, sans-serif", letterSpacing: "0.15em", fontSize: 11, opacity: 0.8 }}>CURATED BY EVENT PERFEKT</p>
          <h1 style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 400 }}>The Woman Who Leads The Room</h1>
        </div>

        {info.loading && <p style={{ textAlign: "center", color: "#666" }}>Loading…</p>}

        {!info.loading && info.error && (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: BURGUNDY }}>We couldn't open this link</h2>
            <p style={{ color: "#1a1a1a", lineHeight: 1.7 }}>{info.error}</p>
            <p style={{ color: "#999", fontSize: 13, marginTop: 24 }}>
              Please write to <a href="mailto:adminuk@eventperfekt.com" style={{ color: BURGUNDY }}>adminuk@eventperfekt.com</a> and we'll sort it out.
            </p>
          </div>
        )}

        {!info.loading && info.ready && submitted && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, color: BURGUNDY, marginBottom: 16 }}>✓</div>
            <h2 style={{ color: BURGUNDY, fontSize: 24 }}>Thank you{info.firstName ? `, ${info.firstName}` : ""}</h2>
            <p style={{ color: "#1a1a1a", lineHeight: 1.7, fontSize: 16 }}>
              Your reply has been received and your application is back with our review team.
            </p>
            <p style={{ color: "#666", fontSize: 14, marginTop: 24 }}>You'll hear from us within 7 days.</p>
          </div>
        )}

        {!info.loading && info.ready && !submitted && (
          <form onSubmit={submit}>
            <p style={{ color: "#1a1a1a", lineHeight: 1.7, fontSize: 16 }}>
              Dear {info.firstName || "there"},
            </p>
            <p style={{ color: "#1a1a1a", lineHeight: 1.7 }}>
              Before we complete our review, our team would appreciate a little more context:
            </p>
            <blockquote style={{ background: "#f7f3f0", borderLeft: `3px solid ${BURGUNDY}`, padding: "16px 20px", margin: "16px 0", fontStyle: "italic", color: "#330311" }}>
              {info.question}
            </blockquote>
            {info.alreadyAnswered && (
              <p style={{ background: "#fff3cd", color: "#7c5e0c", padding: 12, borderRadius: 4, fontSize: 14, fontFamily: "Poppins, sans-serif" }}>
                You already replied to this question. Submitting again will replace your previous answer.
              </p>
            )}
            <label style={{ display: "block", marginTop: 16, fontFamily: "Poppins, sans-serif", fontSize: 14, color: "#1a1a1a", marginBottom: 8 }}>
              Your reply <span style={{ color: "#7c1d1d" }}>*</span>
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              required
              rows={6}
              placeholder="Type your reply here…"
              style={{ width: "100%", padding: 12, border: `1px solid #ccc`, borderRadius: 4, fontFamily: "Poppins, sans-serif", fontSize: 15, resize: "vertical", boxSizing: "border-box" }}
              data-testid="textarea-applicant-response"
            />
            {submitError && <p style={{ color: "#7c1d1d", fontSize: 13, marginTop: 8, fontFamily: "Poppins, sans-serif" }}>{submitError}</p>}
            <button
              type="submit"
              disabled={submitting}
              style={{ background: BURGUNDY, color: "#fff", border: "none", padding: "14px 32px", marginTop: 16, fontFamily: "Poppins, sans-serif", fontWeight: "bold", fontSize: 14, letterSpacing: "0.05em", cursor: "pointer", width: "100%" }}
              data-testid="button-submit-response"
            >
              {submitting ? "SENDING…" : "SEND REPLY"}
            </button>
            <p style={{ color: "#999", fontSize: 12, marginTop: 16, fontFamily: "Poppins, sans-serif", textAlign: "center" }}>
              Your application returns to the review queue immediately on submit.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
