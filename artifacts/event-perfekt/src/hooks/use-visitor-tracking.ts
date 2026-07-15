import { useEffect, useRef } from "react";

const SID_KEY = "ep_visitor_sid";
const UTM_KEY = "ep_utm";

function getOrCreateSessionId(): string {
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = `vs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}

function readUtmFromUrl() {
  const p = new URLSearchParams(window.location.search);
  return {
    utmSource:   p.get("utm_source")   || undefined,
    utmMedium:   p.get("utm_medium")   || undefined,
    utmCampaign: p.get("utm_campaign") || undefined,
    utmContent:  p.get("utm_content")  || undefined,
  };
}

/** Persist UTM from URL into localStorage so it survives SPA navigation */
function persistUtm() {
  const fromUrl = readUtmFromUrl();
  if (fromUrl.utmSource) {
    localStorage.setItem(UTM_KEY, JSON.stringify(fromUrl));
  }
}

/** Get the stored UTM (from URL on first landing, then from localStorage) */
export function getStoredUtm(): { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string } {
  const fromUrl = readUtmFromUrl();
  if (fromUrl.utmSource) return fromUrl;
  try {
    const stored = localStorage.getItem(UTM_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {};
}

/** Returns true if this browser should be excluded from tracking */
function isInternalDevice(): boolean {
  // Manually opted out via the analytics page toggle
  if (localStorage.getItem("ep_internal")) return true;
  // Auto-opt-out via URL parameter ?internal=1 — sets persistent flag
  const params = new URLSearchParams(window.location.search);
  if (params.get("internal") === "1") {
    localStorage.setItem("ep_internal", "true");
    return true;
  }
  return false;
}

export function useVisitorTracking(page: string, title?: string) {
  const fired = useRef(false);
  const pageRef = useRef(page);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    persistUtm();

    // Do not track EP staff or opted-out internal devices
    if (isInternalDevice()) return;

    if (fired.current) return;
    fired.current = true;
    startTime.current = Date.now();
    pageRef.current = page;

    const sessionId = getOrCreateSessionId();
    const utm = getStoredUtm();

    // Normalize page path to always begin with '/'
    const normPage = page && page.startsWith("/") ? page : `/${page}`;

    // Mark this pageview in localStorage so analytics lazy-init doesn't double-post
    try {
      localStorage.setItem('ep_last_pv', JSON.stringify({ path: normPage, ts: Date.now() }));
    } catch {}

    fetch("/api/track/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        page: normPage,
        title: title || document.title,
        referrer: document.referrer || undefined,
        ...utm,
      }),
    }).catch(() => {});

    // Also track I Am Her funnel page_visit
    if (normPage === "/iamher" || normPage === "/access" || normPage === "/access/payment" || normPage === "/meet-the-room" || normPage.startsWith("/iamher/") || normPage === "/360-booth-hire-milton-keynes" || normPage === "/photobooth" || normPage === "/photo-booth-nigeria") {
      fetch("/api/track/funnel-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, eventType: "page_visit", page: normPage, metadata: { title } }),
      }).catch(() => {});
    }

    // ── Time-on-page: fire on page unload via sendBeacon ───────────────────
    const sendTimeOnPage = () => {
      const seconds = Math.round((Date.now() - startTime.current) / 1000);
      const payload = JSON.stringify({ sessionId, page: pageRef.current, seconds });
      // sendBeacon is fire-and-forget — safe on page close/navigation
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track/time-on-page", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/track/time-on-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", sendTimeOnPage, { once: true });
    // Also send on SPA navigation (visibilitychange to hidden)
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") sendTimeOnPage();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", sendTimeOnPage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [page, title]);
}

export async function captureEmail(email: string, name?: string, page?: string, referral_source?: string): Promise<void> {
  const sessionId = getOrCreateSessionId();
  // Previously this swallowed every error and always resolved, so the UI showed
  // "success" even when the email was never saved. Now it throws on failure so
  // callers' catch blocks can surface a real error to the visitor.
  const res = await fetch("/api/track/email-capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, email, name, page, referral_source }),
  });
  if (!res.ok) {
    throw new Error(`Email capture failed (${res.status})`);
  }
  // Fire a funnel event so captures are visible in the conversion funnel (was untracked).
  // NOTE: must be "interest_capture" — that's the event_type the analytics dashboard
  // counts (/api/admin/iamher-funnel). "email_captured" was silently dropped.
  try {
    trackFunnelEvent("interest_capture", page || "unknown", { referral_source, email_domain: email.split("@")[1] || "" });
  } catch { /* tracking is best-effort */ }
}

export function getSessionId(): string {
  return getOrCreateSessionId();
}

/** Track a funnel event (e.g. cta_click, form_start, form_complete, submit_success) */
export function trackFunnelEvent(eventType: string, page: string, metadata?: Record<string, any>): void {
  if (isInternalDevice()) return;
  const sessionId = getOrCreateSessionId();
  const utm = getStoredUtm();
  const merged = { ...metadata, ...utm };
  fetch("/api/track/funnel-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, eventType, page, metadata: merged }),
  }).catch(() => {});
}
