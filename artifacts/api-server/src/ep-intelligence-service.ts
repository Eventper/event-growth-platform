// EP Intelligence Service — fetches UK knife crime / youth violence news for ALLI Foundation
// and other clients. Filters through Claude relevance check, tags by category, and stores in
// ep_intelligence_articles.

import { db } from "./db";
import { sql } from "drizzle-orm";

const SOURCES: Array<{ name: string; url: string; type: "rss" | "atom"; category?: string }> = [
  { name: "GOV.UK — Home Office", url: "https://www.gov.uk/search/news-and-communications.atom?organisations%5B%5D=home-office&keywords=knife+crime", type: "atom", category: "Policy" },
  { name: "GOV.UK — Ministry of Justice", url: "https://www.gov.uk/search/news-and-communications.atom?organisations%5B%5D=ministry-of-justice&keywords=knife+crime", type: "atom", category: "Policy" },
  { name: "Catch22", url: "https://www.catch-22.org.uk/feed/", type: "rss", category: "Organisations" },
  { name: "Nacro", url: "https://www.nacro.org.uk/feed/", type: "rss", category: "Organisations" },
  { name: "Youth Endowment Fund", url: "https://youthendowmentfund.org.uk/feed/", type: "rss", category: "Research" },
  { name: "The Guardian — Knife crime", url: "https://www.theguardian.com/uk/knife-crime/rss", type: "rss", category: "News" },
  { name: "BBC — England", url: "https://feeds.bbci.co.uk/news/england/rss.xml", type: "rss", category: "News" },
];

const RELEVANCE_PROMPT = `You are filtering news articles for ALLI Foundation — a UK youth violence prevention charity.
Mark as RELEVANT if the article covers: knife crime UK, gang violence, youth violence prevention, early intervention, Violence Reduction Units, Young Futures Hubs, safeguarding young people, county lines, knife crime policy, Home Office knife crime plan, youth justice, community safety, gang exit programmes, mentoring at-risk youth, knife crime statistics UK.
Mark as NOT RELEVANT if it covers unrelated crime, international news, or general politics.
Return RELEVANT or NOT RELEVANT only.`;

const CATEGORY_PROMPT = `Categorise this article into ONE of: Policy, Research, Statistics, Case Study, Funding, Organisations, Legislation, News. Return the single category only.`;

async function claudeCheck(systemPrompt: string, userPrompt: string, maxTokens = 20): Promise<string> {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return "";
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: maxTokens,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: userPrompt },
        ],
      }),
    });
    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || "";
  } catch {
    return "";
  }
}

function parseFeedItems(xml: string): Array<{ title: string; link: string; summary: string; author?: string; published?: string }> {
  const items: Array<{ title: string; link: string; summary: string; author?: string; published?: string }> = [];
  // crude XML extraction — handles RSS <item> and Atom <entry>
  const itemBlocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) || [];
  for (const block of itemBlocks) {
    const grab = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
      if (!m) return "";
      return m[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
    };
    const linkTag = block.match(/<link[^>]*href="([^"]+)"/i) || block.match(/<link[^>]*>([^<]+)<\/link>/i);
    const link = linkTag ? linkTag[1] : "";
    const title = grab("title");
    const summary = grab("description") || grab("summary") || grab("content");
    const author = grab("author") || grab("dc:creator");
    const published = grab("pubDate") || grab("published") || grab("updated");
    if (title && link) items.push({ title, link, summary: summary.slice(0, 1500), author, published });
  }
  return items;
}

export async function runIntelligenceFetch(): Promise<{ ok: boolean; inserted: number; checked: number; error?: string }> {
  try {
    // ALLI Foundation client id lookup
    const cli = await db.execute(sql`SELECT id FROM ep_clients WHERE organisation_name = 'ALLI Foundation' LIMIT 1`);
    const alliId = (cli.rows[0] as any)?.id;
    if (!alliId) return { ok: false, inserted: 0, checked: 0, error: "ALLI not found" };

    let inserted = 0;
    let checked = 0;
    for (const src of SOURCES) {
      try {
        const resp = await fetch(src.url, { headers: { "User-Agent": "EP-Intel-Bot/1.0" } });
        if (!resp.ok) continue;
        const body = await resp.text();
        const items = parseFeedItems(body).slice(0, 8);
        for (const it of items) {
          checked++;
          // Skip if already stored
          const dup = await db.execute(sql`SELECT 1 FROM ep_intelligence_articles WHERE client_id = ${alliId} AND source_url = ${it.link} LIMIT 1`);
          if (dup.rows.length > 0) continue;
          // Relevance check
          const relevance = await claudeCheck(RELEVANCE_PROMPT, `Title: ${it.title}\n\nSummary: ${it.summary}`, 10);
          if (!relevance.toUpperCase().includes("RELEVANT") || relevance.toUpperCase().includes("NOT RELEVANT")) continue;
          // Category
          const cat = (await claudeCheck(CATEGORY_PROMPT, `${it.title}\n${it.summary}`, 10)).trim().replace(/[^a-zA-Z]/g, "") || src.category || "News";
          const pub = it.published ? new Date(it.published) : new Date();
          await db.execute(sql`
            INSERT INTO ep_intelligence_articles
              (client_id, title, summary, source_name, source_url, author, published_at, category, tags, relevance_score)
            VALUES (
              ${alliId}, ${it.title}, ${it.summary}, ${src.name}, ${it.link}, ${it.author || null},
              ${pub as any}, ${cat}, '[]'::jsonb, 80
            )
          `);
          inserted++;
        }
      } catch (srcErr: any) {
        console.error(`[EP-Intel] source ${src.name} failed:`, srcErr.message);
      }
    }
    console.log(`[EP-Intel] Fetch complete — ${inserted} new articles (${checked} checked)`);
    return { ok: true, inserted, checked };
  } catch (e: any) {
    return { ok: false, inserted: 0, checked: 0, error: e.message };
  }
}

let schedulerStarted = false;
export function startIntelligenceScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  // Every 6 hours
  setInterval(() => {
    runIntelligenceFetch().catch(e => console.error("[EP-Intel] scheduled fetch error:", e.message));
  }, 6 * 60 * 60 * 1000);

  // Daily health score recalc at 9am
  const scheduleHealth = () => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(9, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    setTimeout(async () => {
      try {
        const clients = await db.execute(sql`SELECT id FROM ep_clients WHERE status = 'active'`);
        for (const c of clients.rows as any[]) {
          await fetch(`http://localhost:${process.env.PORT || 5000}/api/ep-clients/${c.id}/health-score/calculate`, {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.EP_AGENT_INTERNAL_TOKEN || ""}` },
          }).catch(() => {});
        }
      } catch {}
      scheduleHealth();
    }, target.getTime() - now.getTime());
  };
  scheduleHealth();

  console.log("[EP-Intel] Scheduler started (fetch every 6h, health daily 9am)");
}
