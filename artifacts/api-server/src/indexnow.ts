/**
 * IndexNow integration — pings Bing, Yandex, Seznam and other IndexNow-supporting
 * search engines whenever pages are added or updated.
 *
 * Bing's IndexNow submissions also feed Microsoft Copilot, ChatGPT search,
 * DuckDuckGo and Yahoo, so a single ping reaches a large slice of the AI/answer
 * engine landscape with no dashboards or verification UI required.
 *
 * Setup:
 *   - Key: 64ff8464c5028eccb3dc5eb97fd6e985
 *   - Key location: https://eventperfekt.net/64ff8464c5028eccb3dc5eb97fd6e985.txt
 *
 * Public docs: https://www.indexnow.org/documentation
 */

const INDEXNOW_KEY = "64ff8464c5028eccb3dc5eb97fd6e985";
const PROD_HOST = "eventperfekt.net";
const KEY_LOCATION = `https://${PROD_HOST}/${INDEXNOW_KEY}.txt`;

// Canonical URL list — kept in sync with server/routes.ts sitemap route
export const INDEXNOW_DEFAULT_URLS = [
  "https://www.eventperfekt.net/",
  "https://www.eventperfekt.net/about",
  "https://www.eventperfekt.net/booking-enquiry",
  "https://www.eventperfekt.net/360-booth-hire-milton-keynes",
  "https://www.eventperfekt.net/privacy-policy",
  "https://www.eventperfekt.net/terms-of-service",
  "https://www.eventperfekt.net/iamher",
  "https://www.eventperfekt.net/meet-the-room",
  "https://www.eventperfekt.net/access",
  "https://www.eventperfekt.net/iamher/stories",
  "https://www.eventperfekt.net/iamher/submit-story",
];

export interface IndexNowResult {
  ok: boolean;
  status: number;
  urlCount: number;
  message?: string;
}

/**
 * Submit one or more URLs to IndexNow. Bing/Yandex pick them up immediately
 * (typically indexed within hours). Safe to call repeatedly — IndexNow
 * deduplicates and rate-limits on its end.
 */
export async function pingIndexNow(urls: string[] = INDEXNOW_DEFAULT_URLS): Promise<IndexNowResult> {
  // Filter to URLs on our verified host only — IndexNow rejects mixed-host batches.
  const cleanUrls = urls
    .map(u => u.trim())
    .filter(u => {
      try {
        const parsed = new URL(u);
        return parsed.host === PROD_HOST;
      } catch {
        return false;
      }
    });

  if (cleanUrls.length === 0) {
    return { ok: false, status: 0, urlCount: 0, message: "No valid URLs for host " + PROD_HOST };
  }

  const body = {
    host: PROD_HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: cleanUrls,
  };

  try {
    const resp = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });

    // IndexNow returns:
    //   200 — accepted
    //   202 — accepted, key validation pending (still success)
    //   400 — malformed
    //   403 — key file missing / mismatch
    //   422 — invalid URL or host mismatch
    //   429 — too many requests
    const text = await resp.text().catch(() => "");
    return {
      ok: resp.status === 200 || resp.status === 202,
      status: resp.status,
      urlCount: cleanUrls.length,
      message: text || resp.statusText,
    };
  } catch (err: any) {
    return { ok: false, status: 0, urlCount: cleanUrls.length, message: err?.message || "fetch failed" };
  }
}

/**
 * Fire-and-forget startup ping. Only runs in production, only once per boot,
 * and only if the FORCE_INDEXNOW_PING env or the standard production env are set.
 * Failures are logged but never crash the server.
 */
export function startupIndexNowPing(): void {
  const isProd = process.env.NODE_ENV === "production";
  const force = process.env.FORCE_INDEXNOW_PING === "true";
  if (!isProd && !force) {
    console.log("[IndexNow] Skipped startup ping — non-production environment");
    return;
  }

  // Slight delay so the server is fully listening and the static key file is reachable.
  setTimeout(async () => {
    try {
      const result = await pingIndexNow();
      if (result.ok) {
        console.log(`[IndexNow] Startup ping OK — ${result.urlCount} URLs submitted to Bing/Yandex (HTTP ${result.status})`);
      } else {
        console.warn(`[IndexNow] Startup ping failed — HTTP ${result.status}: ${result.message}`);
      }
    } catch (err: any) {
      console.warn("[IndexNow] Startup ping error:", err?.message || err);
    }
  }, 12_000);
}
