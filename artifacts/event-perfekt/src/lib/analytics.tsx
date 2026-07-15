// Minimal analytics integration (GA4-friendly) — measurement ID set via VITE_GA_MEASUREMENT_ID
import { getSessionId, getStoredUtm } from "../hooks/use-visitor-tracking";

export function initAnalytics() {
  try {
    const id = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID || (window as any).__VITE_GA_MEASUREMENT_ID__;
    if (!id) return;

    // Inject gtag script if not present
    if (!(window as any).gtag) {
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      document.head.appendChild(s);

      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(){(window as any).dataLayer.push(arguments);} // eslint-disable-line
      (window as any).gtag = gtag;
      (window as any).gtag('js', new Date());
      (window as any).gtag('config', id, { send_page_view: false });
    }
  } catch (e) {
    // fail silently
    console.warn('initAnalytics failed', e);
  }
}

export function sendPageView(path: string, title?: string) {
  try {
    // Normalize path to always start with '/'
    const normPath = path && path.startsWith("/") ? path : `/${path}`;
    if ((window as any).gtag) {
      (window as any).gtag('event', 'page_view', { page_path: normPath, page_title: title });
    }
    // Avoid double-posts: if a recent pageview was already recorded by the SPA useVisitorTracking hook,
    // skip the server POST. useVisitorTracking sets localStorage.ep_last_pv on its post.
    try {
      const raw = localStorage.getItem('ep_last_pv');
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && obj.path === normPath && Date.now() - (obj.ts || 0) < 2000) {
          return;
        }
      }
    } catch {}

    // Post to server fallback
    try {
      const sessionId = getSessionId();
      const utm = getStoredUtm();
      fetch('/api/track/pageview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, page: normPath, title: title || document.title, referrer: document.referrer || undefined, ...utm }) }).catch(() => {});
    } catch (_) {}
  } catch (e) {}
}

export function sendEvent(name: string, params: Record<string, any> = {}) {
  try {
    if ((window as any).gtag) {
      (window as any).gtag('event', name, params);
    }
    // Also POST to local tracking API for server-side aggregation if available
    try {
      // Map known event types to server endpoints
      if (name === 'page_view') {
        const sessionId = getSessionId();
        const utm = getStoredUtm();
        fetch('/api/track/pageview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, page: params.page || window.location.pathname, title: params.title || document.title, referrer: document.referrer || undefined, ...utm }) }).catch(() => {});
        return;
      }
      if (name === 'funnel_event' || params.eventType) {
        const sessionId = getSessionId();
        fetch('/api/track/funnel-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, eventType: params.eventType || name, page: params.page || window.location.pathname, metadata: params.metadata || params || {} }) }).catch(() => {});
        return;
      }
      if (name === 'email_capture' || params.email) {
        const sessionId = getSessionId();
        fetch('/api/track/email-capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, email: params.email, name: params.name, page: params.page || window.location.pathname, referral_source: params.referral_source }) }).catch(() => {});
        return;
      }
      // Fallback: send to funnel-event endpoint
      const sessionId = getSessionId();
      fetch('/api/track/funnel-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, eventType: name, page: params.page || window.location.pathname, metadata: params || {} }) }).catch(() => {});
    } catch (_) {}
  } catch (e) {}
}

export default { initAnalytics, sendPageView, sendEvent };
