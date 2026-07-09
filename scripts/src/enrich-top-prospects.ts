/**
 * Enrich top prospects via Apollo.io
 * Returns LinkedIn URLs, real emails, phones, company revenue, employee count.
 * Also estimates spending power for a £300 ticket.
 *
 * Run: pnpm --filter @workspace/scripts run enrich-prospects
 */

import { pool } from "@workspace/db";

const APOLLO_BASE = "https://api.apollo.io/v1";
const EVENT_ID = "2b22c5fd-2a08-474e-974c-8c05102aad93";

function getApolloKey(): string {
  const key = process.env.APOLLO_AI || process.env.APOLLO_API_KEY || "";
  if (!key || key.startsWith("sk-")) throw new Error("No valid Apollo API key");
  return key;
}

let lastCall = 0;
const MIN_GAP = 600;

async function apolloFetch(url: string, body: any): Promise<Response> {
  const now = Date.now();
  if (now - lastCall < MIN_GAP) await new Promise(r => setTimeout(r, MIN_GAP - (now - lastCall)));
  lastCall = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": getApolloKey() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Apollo ${res.status}: ${text.substring(0, 100)}`);
  }
  return res;
}

async function apolloEnrich(apolloId: string): Promise<any> {
  const res = await apolloFetch(`${APOLLO_BASE}/people/enrich`, { id: apolloId });
  const data = await res.json() as any;
  return data.person || null;
}

// ─── Spending Power Assessment ──────────────────────────────────────────────
function estimateSpendingPower(person: any, enrichedOrg: any): { tier: string; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const title = (person.title || "").toLowerCase();
  const orgName = (enrichedOrg?.name || person.organization?.name || "").toLowerCase();
  const revenueRaw = enrichedOrg?.annual_revenue || person.organization?.annual_revenue || "";
  const revenueNum = parseInt(String(revenueRaw).replace(/[^\d]/g, ""), 10);
  const employeeCount = enrichedOrg?.estimated_num_employees || person.organization?.employee_count || "";
  const empNum = parseInt(String(employeeCount).replace(/[^\d]/g, ""), 10);
  const city = (enrichedOrg?.city || person.city || "").toLowerCase();
  const state = (enrichedOrg?.state || person.state || "").toLowerCase();
  const country = (enrichedOrg?.country || person.country || "").toLowerCase();

  // Job seniority = strongest signal
  const topTierTitles = ["ceo", "cfo", "coo", "founder", "owner", "chair", "chairman", "chairwoman", "managing director", "partner", "investor", "managing partner", "principal"];
  const midTierTitles = ["director", "head of", "vp", "vice president", "senior"];
  if (topTierTitles.some(t => title.includes(t))) { score += 3; reasons.push("C-suite / Founder / Partner level"); }
  else if (midTierTitles.some(t => title.includes(t))) { score += 1.5; reasons.push("Director / VP / Senior level"); }

  // Company size
  if (empNum >= 500) { score += 2; reasons.push(`Large company (${empNum}+ employees)`); }
  else if (empNum >= 50) { score += 1.5; reasons.push(`Mid-size company (${empNum} employees)`); }
  else if (empNum > 0) { score += 0.5; reasons.push(`Small business (${empNum} employees)`); }

  // Revenue
  if (revenueNum >= 50_000_000) { score += 2; reasons.push("Revenue £50M+"); }
  else if (revenueNum >= 5_000_000) { score += 1.5; reasons.push("Revenue £5M+"); }
  else if (revenueNum > 0) { score += 0.5; reasons.push("Revenue data available"); }

  // Geography premium
  const londonArea = ["london", "greater london", "westminster", "kensington", "chelsea"];
  const midlands = ["birmingham", "milton keynes", "warwickshire", "oxford", "cambridge", "buckinghamshire", "hertfordshire"];
  if (londonArea.some(a => city.includes(a) || state.includes(a))) { score += 1.5; reasons.push("London-based (premium market)"); }
  else if (midlands.some(a => city.includes(a) || state.includes(a))) { score += 0.5; reasons.push("Midlands / Home Counties (strong market)"); }
  if (country.includes("united kingdom") || country.includes("uk") || country.includes("gb")) { score += 0.5; reasons.push("UK-based"); }

  // Industry premium
  const premiumIndustries = ["finance", "investment", "private equity", "venture capital", "wealth", "asset management", "legal", "law", "real estate", "property", "luxury", "aesthetics", "healthcare", "pharmaceutical", "biotech"];
  const orgIndustry = (enrichedOrg?.industry || person.organization?.industry || "").toLowerCase();
  if (premiumIndustries.some(i => orgIndustry.includes(i))) { score += 1; reasons.push("Premium industry (finance / legal / property / health)"); }

  let tier: string;
  if (score >= 7) tier = "High — Likely £300+ ticket";
  else if (score >= 4.5) tier = "Medium-High — Good £300 prospect";
  else if (score >= 2.5) tier = "Medium — May need persuasion";
  else tier = "Low — Price-sensitive, consider lower tier";

  return { tier, score, reasons };
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Enriching Top 50 Prospects for The Woman Who Leads The Room ===\n");

  const rows = await pool.query(
    `SELECT id, name, title, company, metadata->>'fitScore' as score, metadata->'apolloRaw'->>'id' as apollo_id, metadata
     FROM growth_prospects
     WHERE event_id = $1 AND metadata->>'fitScore' = '5' AND likely_gender = 'female' AND gender_confidence::numeric >= 0.6
     ORDER BY gender_confidence::numeric DESC, name
     LIMIT 50`,
    [EVENT_ID]
  );

  console.log(`Found ${rows.rows.length} Hot Fit female prospects to enrich\n`);

  let enriched = 0;
  let failed = 0;
  const results: any[] = [];
  const errors: string[] = [];

  for (const row of rows.rows) {
    const apolloId = row.apollo_id;
    if (!apolloId) {
      errors.push(`${row.name}: No Apollo ID`);
      continue;
    }

    try {
      const person = await apolloEnrich(apolloId);
      if (!person) {
        errors.push(`${row.name}: No data returned`);
        failed++;
        continue;
      }

      const org = person.organization || {};
      const sp = estimateSpendingPower(person, org);

      // Update DB via raw SQL (avoid drizzle-orm eq() type conflict)
      const meta = row.metadata || {};
      const newMeta = {
        ...meta,
        enriched: true,
        enrichedAt: new Date().toISOString(),
        linkedinUrl: person.linkedin_url,
        email: person.email,
        phone: person.phone,
        companyRevenue: org.annual_revenue,
        companyEmployees: org.estimated_num_employees,
        companyCity: org.city,
        companyState: org.state,
        companyCountry: org.country,
        spendingPowerTier: sp.tier,
        spendingPowerScore: sp.score,
        spendingPowerReasons: sp.reasons,
      };
      await pool.query(
        `UPDATE growth_prospects SET
          email = $1, phone = $2, profile_url = $3, enriched = true, verified = $4,
          confidence_level = $5, industry = $6, company_size = $7, location = $8, metadata = $9
        WHERE id = $10`,
        [
          person.email || null,
          person.phone || null,
          person.linkedin_url || null,
          !!person.email,
          person.email ? "high" : "medium",
          org.industry || "",
          org.estimated_num_employees || org.employee_count || "",
          [org.city, org.state, org.country].filter(Boolean).join(", ") || "",
          JSON.stringify(newMeta),
          row.id,
        ]
      );

      results.push({
        name: row.name,
        title: row.title,
        company: org.name || row.company,
        linkedin: person.linkedin_url,
        email: person.email,
        phone: person.phone,
        revenue: org.annual_revenue,
        employees: org.estimated_num_employees,
        city: org.city,
        state: org.state,
        country: org.country,
        spendingPower: sp,
      });

      enriched++;
      process.stdout.write(`✓ ${row.name} (${row.company}) — ${sp.tier}\n`);
    } catch (err: any) {
      failed++;
      errors.push(`${row.name}: ${err.message}`);
      process.stdout.write(`✗ ${row.name} — ${err.message}\n`);
    }
  }

  console.log(`\n=== ENRICHMENT COMPLETE ===`);
  console.log(`Enriched: ${enriched} / ${rows.rows.length}`);
  console.log(`Failed: ${failed}`);

  if (results.length > 0) {
    const high = results.filter((r: any) => r.spendingPower.score >= 7);
    const medHigh = results.filter((r: any) => r.spendingPower.score >= 4.5 && r.spendingPower.score < 7);
    const med = results.filter((r: any) => r.spendingPower.score >= 2.5 && r.spendingPower.score < 4.5);
    const low = results.filter((r: any) => r.spendingPower.score < 2.5);

    console.log(`\n--- Spending Power Breakdown ---`);
    console.log(`High (£300+ likely): ${high.length}`);
    console.log(`Medium-High (good £300 prospect): ${medHigh.length}`);
    console.log(`Medium (may need persuasion): ${med.length}`);
    console.log(`Low (price-sensitive): ${low.length}`);

    console.log(`\n--- TOP 20 WITH LINKEDIN & SPENDING POWER ---`);
    for (const r of results.slice(0, 20)) {
      console.log(`\n${r.name}`);
      console.log(`  Title: ${r.title}`);
      console.log(`  Company: ${r.company}`);
      console.log(`  Location: ${r.city || ""}${r.city && r.state ? ", " : ""}${r.state || ""}`);
      console.log(`  LinkedIn: ${r.linkedin || "N/A"}`);
      console.log(`  Email: ${r.email ? (r.email.substring(0, 20) + "...") : "N/A"}`);
      console.log(`  Revenue: ${r.revenue || "N/A"} | Employees: ${r.employees || "N/A"}`);
      console.log(`  Spending Power: ${r.spendingPower.tier} (${r.spendingPower.score.toFixed(1)})`);
      console.log(`  Why: ${r.spendingPower.reasons.join("; ")}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n--- ERRORS (${errors.length}) ---`);
    errors.slice(0, 10).forEach(e => console.log(`  ${e}`));
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
