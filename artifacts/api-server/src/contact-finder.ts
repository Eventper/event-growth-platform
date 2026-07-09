// Contact Finding Engine — findDecisionMaker()
// Waterfall: RocketReach → Hunter.io → Companies House → Website Scraping → AI fallback

const TITLE_SCORES: Array<{ keywords: string[]; score: number }> = [
  { keywords: ["events director", "director of events", "event director"], score: 120 },
  { keywords: ["marketing director", "director of marketing"], score: 110 },
  { keywords: ["head of events", "head of event"], score: 100 },
  { keywords: ["head of marketing"], score: 90 },
  { keywords: ["events manager", "event manager"], score: 80 },
  { keywords: ["marketing manager"], score: 70 },
  { keywords: ["brand director", "head of brand", "director of brand"], score: 60 },
  { keywords: ["sales director", "head of sales", "commercial director"], score: 50 },
  { keywords: ["chief marketing officer", "cmo"], score: 45 },
  { keywords: ["managing director", " md", "md "], score: 30 },
  { keywords: ["chief executive", "ceo"], score: 25 },
  { keywords: ["founder", "co-founder", "owner"], score: 20 },
];

function scoreTitle(title: string): number {
  const t = title.toLowerCase();
  for (const { keywords, score } of TITLE_SCORES) {
    if (keywords.some(k => t.includes(k))) return score;
  }
  return 0;
}

export interface DecisionMaker {
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string | null;
  emailPattern: string | null;
  emailGrade: string | null;
  linkedIn: string | null;
  linkedInSearch: string;
  confidence: "High" | "Medium" | "Low";
  source: string;
  sourceNote: string;
  alternativeContacts: Array<{ name: string; title: string; email: string | null; linkedin?: string | null; source: string }>;
}

function parseName(full: string): { firstName: string; lastName: string } {
  const parts = (full || "").trim().split(/\s+/);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" };
}

function buildLinkedInSearch(name: string, company: string): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name + " " + company)}`;
}

function domainFromWebsite(website: string | null): string | null {
  if (!website) return null;
  return website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0].split("?")[0].toLowerCase();
}

// ──────────────────────────────────────────
// Source 1: RocketReach
// ──────────────────────────────────────────
async function tryRocketReach(companyName: string, domain: string | null): Promise<DecisionMaker | null> {
  const key = process.env.ROCKETREACH_API_KEY;
  if (!key) return null;
  try {
    const headers: Record<string, string> = { "Api-Key": key, "Content-Type": "application/json" };
    const res = await fetch("https://api.rocketreach.co/v2/api/search", {
      method: "POST",
      headers,
      body: JSON.stringify({ query: { current_employer: [companyName] }, page_size: 10 }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const profiles: any[] = data.profiles || [];
    if (profiles.length === 0) return null;

    const scored = profiles
      .map(p => ({ ...p, _score: scoreTitle(p.current_title || "") }))
      .filter(p => p._score > 0 || profiles.length <= 3)
      .sort((a, b) => b._score - a._score);

    const primary = scored[0];
    if (!primary) return null;

    // Fetch verified email
    let email: string | null = null;
    let emailGrade: string | null = null;
    if (primary.id) {
      try {
        const lr = await fetch(`https://api.rocketreach.co/v2/api/person/lookup?id=${primary.id}`, {
          headers, signal: AbortSignal.timeout(8000),
        });
        if (lr.ok) {
          const ld: any = await lr.json();
          const profEmails = (ld.emails || [])
            .filter((e: any) => e.type === "professional" && e.smtp_valid === "valid")
            .sort((a: any, b: any) => (a.grade || "Z").localeCompare(b.grade || "Z"));
          if (profEmails.length > 0) { email = profEmails[0].email; emailGrade = profEmails[0].grade; }
          else if ((ld.emails || []).length > 0) { email = ld.emails[0].email; emailGrade = ld.emails[0].grade || null; }
        }
      } catch {}
    }

    const { firstName, lastName } = parseName(primary.name || "");
    const empDomain = primary.current_employer_domain || domain;
    const emailPattern = empDomain ? `firstname.lastname@${empDomain}` : null;
    const linkedInSearch = buildLinkedInSearch(primary.name, companyName);

    return {
      name: primary.name || `${firstName} ${lastName}`.trim(),
      firstName, lastName,
      title: primary.current_title || "Director",
      email,
      emailPattern,
      emailGrade,
      linkedIn: primary.linkedin_url || null,
      linkedInSearch,
      confidence: "High",
      source: "RocketReach",
      sourceNote: email
        ? `SMTP-verified via RocketReach (Grade ${emailGrade || "?"})${primary.current_title ? ` — ${primary.current_title}` : ""}`
        : `Real person found via RocketReach — email not yet retrieved`,
      alternativeContacts: scored.slice(1, 4).map(p => ({
        name: p.name || "",
        title: p.current_title || "",
        email: null,
        linkedin: p.linkedin_url || null,
        source: "RocketReach",
      })),
    };
  } catch { return null; }
}

// ──────────────────────────────────────────
// Source 2: Hunter.io
// ──────────────────────────────────────────
async function tryHunterIo(domain: string): Promise<DecisionMaker | null> {
  const key = process.env.HUNTER_API_KEY;
  if (!key || !domain) return null;
  try {
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=20&api_key=${key}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const emails: any[] = data.data?.emails || [];
    if (emails.length === 0) return null;

    const scored = emails
      .map(e => ({ ...e, _score: scoreTitle(e.position || "") }))
      .sort((a, b) => b._score - a._score);

    const best = scored[0];
    if (!best || best._score === 0) {
      // No matching title — use highest confidence email
      const fallback = emails.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
      if (!fallback) return null;
      const fullName = [fallback.first_name, fallback.last_name].filter(Boolean).join(" ") || "Contact";
      const { firstName, lastName } = parseName(fullName);
      return {
        name: fullName, firstName, lastName,
        title: fallback.position || "Director",
        email: fallback.value,
        emailPattern: `firstname.lastname@${domain}`,
        emailGrade: fallback.confidence >= 90 ? "A" : fallback.confidence >= 70 ? "B" : "C",
        linkedIn: null,
        linkedInSearch: buildLinkedInSearch(fullName, domain),
        confidence: fallback.confidence >= 80 ? "Medium" : "Low",
        source: "Hunter.io",
        sourceNote: `Found via Hunter.io domain search — ${fallback.confidence || "?"}% confidence`,
        alternativeContacts: emails.slice(1, 4).map(e => ({
          name: [e.first_name, e.last_name].filter(Boolean).join(" ") || "Contact",
          title: e.position || "",
          email: e.value,
          source: "Hunter.io",
        })),
      };
    }

    const fullName = [best.first_name, best.last_name].filter(Boolean).join(" ") || "Contact";
    const { firstName, lastName } = parseName(fullName);
    return {
      name: fullName, firstName, lastName,
      title: best.position || "Director",
      email: best.value,
      emailPattern: `firstname.lastname@${domain}`,
      emailGrade: best.confidence >= 90 ? "A" : best.confidence >= 70 ? "B" : "C",
      linkedIn: null,
      linkedInSearch: buildLinkedInSearch(fullName, domain),
      confidence: best.confidence >= 80 ? "Medium" : "Low",
      source: "Hunter.io",
      sourceNote: `Found via Hunter.io — ${best.confidence || "?"}% confidence score`,
      alternativeContacts: scored.slice(1, 4).map(e => ({
        name: [e.first_name, e.last_name].filter(Boolean).join(" ") || "Contact",
        title: e.position || "",
        email: e.value,
        source: "Hunter.io",
      })),
    };
  } catch { return null; }
}

// ──────────────────────────────────────────
// Source 3: Companies House (UK only)
// ──────────────────────────────────────────
async function tryCompaniesHouse(companyName: string, companyNumber: string | null, domain: string | null): Promise<DecisionMaker | null> {
  const chKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!chKey) return null;
  try {
    let number = companyNumber;
    if (!number) {
      const searchRes = await fetch(
        `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(companyName)}&items_per_page=5`,
        { headers: { Authorization: "Basic " + Buffer.from(chKey + ":").toString("base64") }, signal: AbortSignal.timeout(8000) }
      );
      if (searchRes.ok) {
        const sd: any = await searchRes.json();
        number = sd.items?.[0]?.company_number || null;
      }
    }
    if (!number) return null;

    const officersRes = await fetch(
      `https://api.company-information.service.gov.uk/company/${number}/officers?items_per_page=20`,
      { headers: { Authorization: "Basic " + Buffer.from(chKey + ":").toString("base64") }, signal: AbortSignal.timeout(8000) }
    );
    if (!officersRes.ok) return null;
    const officers: any = await officersRes.json();
    const active = (officers.items || []).filter((o: any) => !o.resigned_on);
    if (active.length === 0) return null;

    const scored = active
      .map((o: any) => ({ ...o, _score: scoreTitle(o.officer_role || "") + (o.officer_role?.toLowerCase().includes("director") ? 15 : 0) }))
      .sort((a: any, b: any) => b._score - a._score);

    const best = scored[0];
    const nameParts = (best.name || "").split(",").reverse().join(" ").trim();
    const { firstName, lastName } = parseName(nameParts);

    // Try Hunter.io for email
    let email: string | null = null;
    let emailGrade: string | null = null;
    if (domain && process.env.HUNTER_API_KEY) {
      try {
        const hRes = await fetch(
          `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${process.env.HUNTER_API_KEY}`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (hRes.ok) {
          const hd: any = await hRes.json();
          email = hd.data?.email || null;
          emailGrade = hd.data?.score >= 90 ? "A" : hd.data?.score >= 70 ? "B" : "C";
        }
      } catch {}
    }

    return {
      name: nameParts,
      firstName, lastName,
      title: (best.officer_role || "Director").replace(/\b\w/g, (l: string) => l.toUpperCase()),
      email,
      emailPattern: domain ? `firstname.lastname@${domain}` : null,
      emailGrade,
      linkedIn: null,
      linkedInSearch: buildLinkedInSearch(nameParts, companyName),
      confidence: "High",
      source: "Companies House",
      sourceNote: `UK Companies House registered director — government public record. Name is verified.`,
      alternativeContacts: scored.slice(1, 4).map((o: any) => {
        const n = (o.name || "").split(",").reverse().join(" ").trim();
        return { name: n, title: o.officer_role || "", email: null, source: "Companies House" };
      }),
    };
  } catch { return null; }
}

// ──────────────────────────────────────────
// Source 4: Website Scraping
// ──────────────────────────────────────────
async function tryWebsiteScraping(companyName: string, website: string, domain: string | null): Promise<DecisionMaker | null> {
  const pagesToTry = ["/team", "/about", "/about-us", "/people", "/leadership", "/our-team", "/staff", "/who-we-are", "/management"];
  const base = website.startsWith("http") ? website.replace(/\/+$/, "") : `https://${website}`;
  const cleanBase = base.replace(/\/$/, "");

  for (const page of pagesToTry) {
    try {
      const res = await fetch(`${cleanBase}${page}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ContactBot/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ");

      const namePattern = /([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g;
      const names = [...text.matchAll(namePattern)].map(m => m[1]).filter(n => n.length < 50);

      for (const name of names.slice(0, 30)) {
        const idx = text.indexOf(name);
        const surrounding = text.slice(Math.max(0, idx - 100), idx + 200).toLowerCase();
        const titleScore = TITLE_SCORES.reduce((best, { keywords, score }) => {
          return keywords.some(k => surrounding.includes(k)) ? Math.max(best, score) : best;
        }, 0);
        if (titleScore > 0) {
          const { firstName, lastName } = parseName(name);
          const extractedTitle = TITLE_SCORES
            .flatMap(t => t.keywords)
            .find(k => surrounding.includes(k)) || "Director";

          let email: string | null = null;
          if (domain && process.env.HUNTER_API_KEY) {
            try {
              const hRes = await fetch(
                `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${process.env.HUNTER_API_KEY}`,
                { signal: AbortSignal.timeout(5000) }
              );
              if (hRes.ok) { const hd: any = await hRes.json(); email = hd.data?.email || null; }
            } catch {}
          }

          return {
            name, firstName, lastName,
            title: extractedTitle.replace(/\b\w/g, l => l.toUpperCase()),
            email,
            emailPattern: domain ? `firstname.lastname@${domain}` : null,
            emailGrade: null,
            linkedIn: null,
            linkedInSearch: buildLinkedInSearch(name, companyName),
            confidence: "Medium",
            source: "Website",
            sourceNote: `Found on ${cleanBase}${page} — name and title from company's own website. Email is pattern-constructed.`,
            alternativeContacts: [],
          };
        }
      }
    } catch {}
  }
  return null;
}

// ──────────────────────────────────────────
// Source 5: AI Research fallback
// ──────────────────────────────────────────
async function tryAIFallback(companyName: string, country: string | null, domain: string | null): Promise<DecisionMaker | null> {
  try {
    const prompt = `Find the most senior person responsible for events, marketing, or brand at "${companyName}"${country ? ` in ${country}` : ""}. Search their website, LinkedIn, and public sources. Return a JSON object ONLY:
{
  "name": "Full Name",
  "firstName": "First",
  "lastName": "Last",
  "title": "Job Title",
  "email": null,
  "emailPattern": "firstname.lastname@${domain || 'company.com'}",
  "linkedIn": null,
  "confidence": "Low",
  "note": "Brief note on how this was determined"
}
Only return real people with verifiable roles. If unknown, make your best estimate and set confidence to Low.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || ""}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 400,
        messages: [
          { role: "system", content: "You are a contact intelligence assistant. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const data = await response.json() as any;
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    if (!parsed.name) return null;
    const { firstName, lastName } = parseName(parsed.name);
    return {
      name: parsed.name,
      firstName: parsed.firstName || firstName,
      lastName: parsed.lastName || lastName,
      title: parsed.title || "Director",
      email: parsed.email || null,
      emailPattern: parsed.emailPattern || (domain ? `firstname.lastname@${domain}` : null),
      emailGrade: null,
      linkedIn: parsed.linkedIn || null,
      linkedInSearch: buildLinkedInSearch(parsed.name, companyName),
      confidence: "Low",
      source: "Agent Research",
      sourceNote: parsed.note || "AI-estimated contact — not verified. Use with caution.",
      alternativeContacts: [],
    };
  } catch { return null; }
}

// ──────────────────────────────────────────
// MAIN FUNCTION
// ──────────────────────────────────────────
export async function findDecisionMaker(
  companyName: string,
  website: string | null,
  country: string | null,
  companyNumber: string | null = null
): Promise<DecisionMaker> {
  const domain = domainFromWebsite(website);
  const isUK = !country || ["uk", "gb", "united kingdom", "england", "scotland", "wales", "northern ireland"].includes((country || "").toLowerCase());

  // 1. RocketReach
  const rr = await tryRocketReach(companyName, domain);
  if (rr) return rr;

  // 2. Hunter.io (if domain known)
  if (domain) {
    const hunter = await tryHunterIo(domain);
    if (hunter) return hunter;
  }

  // 3. Companies House (UK only)
  if (isUK) {
    const ch = await tryCompaniesHouse(companyName, companyNumber, domain);
    if (ch) return ch;
  }

  // 4. Website scraping
  if (website) {
    const scraped = await tryWebsiteScraping(companyName, website, domain);
    if (scraped) return scraped;
  }

  // 5. AI fallback
  const ai = await tryAIFallback(companyName, country, domain);
  if (ai) return ai;

  // Ultimate fallback — honest estimate
  return {
    name: "Decision Maker",
    firstName: "Decision",
    lastName: "Maker",
    title: "Events / Marketing Director",
    email: null,
    emailPattern: domain ? `firstname.lastname@${domain}` : null,
    emailGrade: null,
    linkedIn: null,
    linkedInSearch: buildLinkedInSearch("Events Director", companyName),
    confidence: "Low",
    source: "Not Found",
    sourceNote: "No contact data found across all sources. Try LinkedIn or the company website directly.",
    alternativeContacts: [],
  };
}
