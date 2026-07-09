#!/usr/bin/env tsx
/**
 * Apollo Prospect Builder for "The Woman Who Leads The Room"
 *
 * Builds a high-quality, women-first prospect list directly via Apollo API
 * with gender inference, exclusion filtering, fit scoring, and DB storage.
 *
 * Run: pnpm --filter @workspace/scripts run build-prospects
 */

import { pool, db } from "@workspace/db";
import { growthProspects } from "@workspace/db/schema";

// ─── Configuration ─────────────────────────────────────────────────────────
const EVENT_ID = "2b22c5fd-2a08-474e-974c-8c05102aad93"; // The Woman Who Leads The Room
const OWNER_ID = "system"; // or set to a real owner
const APOLLO_KEY = process.env.APOLLO_AI || process.env.APOLLO_API_KEY || "";
const APOLLO_BASE = "https://api.apollo.io/v1";
const APOLLO_TIMEOUT = 10000;
const APOLLO_MIN_GAP_MS = 500;

if (!APOLLO_KEY || APOLLO_KEY.startsWith("sk-")) {
  console.error("APOLLO_AI must be set to a valid Apollo API key (not an OpenRouter key).");
  process.exit(1);
}

// ─── Target Criteria ─────────────────────────────────────────────────────────
const TARGET_LOCATIONS = [
  "London, UK",
  "Milton Keynes, UK",
  "Birmingham, UK",
  "Oxford, UK",
  "Cambridge, UK",
  "Northampton, UK",
  "Bedford, UK",
  "Luton, UK",
  "Hertfordshire, UK",
  "Buckinghamshire, UK",
  "Warwickshire, UK",
  "Midlands, UK",
];

const FOUNDER_TITLES = ["Founder", "Co-Founder", "Owner", "Managing Director", "CEO"];
const DIRECTOR_TITLES = [
  "Director", "Company Director", "Finance Director", "Operations Director",
  "HR Director", "People Director", "Clinic Director",
];
const PARTNER_TITLES = [
  "Partner", "Principal", "Managing Partner", "Senior Partner",
];
const INVESTOR_TITLES = ["Property Investor", "Investor", "Developer"];
const HEALTHCARE_TITLES = ["Practice Owner", "Clinic Director", "Medical Director"];

const EXCLUDED_KEYWORDS = [
  "coach", "life coach", "business coach", "mindset coach", "trainer",
  "sales trainer", "personal trainer", "sales", "business development",
  "sdr", "bdr", "account executive", "lead generation", "funnel",
  "social media manager", "va", "virtual assistant", "recruiter",
  "mlm", "network marketing", "course creator", "influencer", "student",
];

const EXCLUDED_TITLE_FRAGMENTS = [
  "coach", "trainer", "sales", "recruiter", "influencer", "student",
  "virtual assistant", "social media",
];

// ─── Gender Inference (inlined from gender-inference.ts) ───────────────────
const strip = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z'\- ]/g, "").trim();

const FEMALE = new Set([
  "abigail","ada","adele","agnes","aileen","alexandra","alexia","alice","alicia","alison","amanda","amber","amelia","amy","ana","anastasia","andrea","angela","angelica","anita","ann","anna","anne","annette","annie","antonia","april","ashley","aurora","ava","barbara","beatrice","becky","bella","beth","bethany","betty","beverley","bianca","bonnie","brenda","bridget","brittany","brooke","camilla","candice","caroline","carly","carmen","carol","carolyn","catherine","cecilia","charlotte","chelsea","cheryl","chloe","christina","christine","cindy","claire","clara","claudia","colleen","connie","constance","cora","courtney","crystal","daisy","dana","daniela","danielle","daphne","dawn","debbie","deborah","debra","delia","denise","diana","diane","dolores","donna","dora","doreen","doris","dorothy","ebony","edith","eileen","elaine","eleanor","elena","eliza","elizabeth","ella","ellen","ellie","eloise","elsie","emily","emma","erica","erin","esther","eva","eve","evelyn","faith","fay","felicity","fiona","flora","florence","frances","francesca","freya","gabriella","gail","gemma","genevieve","georgia","georgina","geraldine","gillian","gina","gloria","grace","gwendolyn","hannah","harriet","hayley","hazel","heather","heidi","helen","helena","henrietta","hilary","holly","hope","imogen","ingrid","irene","iris","isabel","isabella","isabelle","isla","ivy","jacqueline","jade","jane","janet","janice","jasmine","jean","jeanette","jemima","jenna","jennifer","jenny","jessica","jill","joan","joanna","joanne","jocelyn","jodie","josephine","joy","joyce","judith","judy","julia","juliana","julie","juliet","june","kara","karen","kate","katherine","kathleen","kathryn","katie","katy","kayla","keira","kelly","kendra","kerry","kim","kimberly","kirsten","kirsty","kristen","lacey","lara","laura","lauren","laurie","leah","leanne","leila","lena","leona","lesley","lilian","lillian","lily","linda","lindsay","lisa","liz","lizzie","lois","lola","loretta","lorraine","louise","lucia","lucinda","lucy","luna","lydia",
  "adaeze","adaobi","adanna","aisha","akosua","amara","amaka","amina","anuoluwapo","aminata","ayesha","ayo","ayoola","ayodele","bola","bolanle","bukola","chiamaka","chidinma","chinwe","chioma","chiamanda","damilola","ebele","efe","eniola","fatima","fatoumata","folake","folasade","funke","funmilayo","grace","halima","ifeoma","ijeoma","kemi","khadija","ladi","lola","mariam","mawunyo","nana","ngozi","nkechi","nneka","ofelia","olabisi","oluwaseun","oluwatobi","omolara","onyeka","oyinkansola","precious","rabi","sade","shade","simisola","temitope","titi","titilayo","tolu","tolulope","uche","uchechi","wuraola","yaa","yetunde","zainab","zara",
  "ines","belen","marta","pilar","birgit","petra","anneke","saskia","sieglinde","ute","heike","sabine","martina","franziska","annika","greta","margarethe","liesl","elke","gudrun","helga","monika","renate","ursel","wibke","carla","chiara","francesca","giulia","federica","valentina","alessandra","alessia","ilaria","aurelia","beatrice","bianca","cosima","emanuela","giovanna","ludovica","manuela","ornella","paola","raffaella","rossana","stefania","ana","catalina","dolores","esperanza","inmaculada","lucia","mercedes","montserrat","nuria","rocio","soledad","agnieszka","anita","ewa","grazyna","halina","jadwiga","katarzyna","magdalena","malgorzata","wanda","wioletta","zofia","anastasia","ekaterina","irina","ludmila","nadezhda","natalia","oksana","olga","svetlana","tatiana","yulia",
]);

const MALE = new Set([
  "aaron","abdul","abel","abraham","adam","adebayo","adrian","ahmed","aiden","ajayi","alan","albert","alex","alexander","alfred","ali","allan","alvin","amos","andre","andrew","angus","anthony","antonio","archie","arnold","arthur","ashton","austin","barry","basil","ben","benedict","benjamin","bernard","bill","billy","blake","bob","boris","brad","bradley","brandon","brendan","brett","brian","bruce","bryan","caleb","calvin","cameron","carl","carlos","cedric","chad","charles","charlie","chibuike","chidi","chris","christian","christopher","chukwuemeka","clarence","claude","clifford","clinton","clive","cody","cole","colin","connor","conrad","cornelius","craig","curtis","cyril","dale","damian","damon","dan","daniel","danny","darius","darren","darryl","dave","david","dean","dennis","derek","desmond","dexter","dominic","don","donald","douglas","duncan","dustin","dwight","dylan","earl","ed","eddie","edgar","edmund","edward","edwin","elijah","elliot","elliott","emeka","emmanuel","eric","ernest","ethan","eugene","evan","ezra","felix","ferdinand","fernando","finley","floyd","francis","frank","franklin","fred","frederick","gabriel","gareth","garrett","gary","gavin","gene","geoffrey","george","gerald","gilbert","glen","glenn","godwin","gordon","graham","grant","greg","gregory","gus","guy","harold","harrison","harry","harvey","hassan","hector","henry","herbert","howard","hugh","hugo","ian","ibrahim","ifeanyi","igor","isaac","ivan","jack","jackson","jacob","jake","james","jamie","jared","jason","jasper","javier","jay","jed","jeff","jeffrey","jeremy","jerome","jerry","jesse","jim","jimmy","joe","joel","john","johnny","jon","jonathan","jordan","jose","joseph","josh","joshua","julian","justin","kanye","karl","keith","kelvin","ken","kenneth","kevin","kingsley","kirk","kunle","kyle","lance","larry","laurence","lawrence","lee","leo","leon","leonard","leroy","leslie","lewis","liam","lionel","lloyd","logan","louis","luca","lucas","luke","luther","mahmoud","malcolm","marc","marcus","mario","mats","nils","ola","stefan","stephan","thorsten","torsten","uwe","wolfgang","helmut","horst","manfred","reinhard","rolf","detlef","gunther","gunter","heinz","kurt","matthias","sebastiano","laszlo","zoltan","attila","csaba","gabor","istvan","tibor","marcel","marcelo","matteo","pietro","paolo","giuseppe","giovanni","lorenzo","alessandro","stefano","riccardo","fabio","federico","emanuele","gianluca","massimo","pablo","jorge","diego","alvaro","ignacio","joaquin","rafael","ramon","santiago","joao","tiago","thiago","rui","pedro","sergey","sergei","dmitry","dmitri","vladimir","pavel","andrei","aleksei","alexei","mikhail","nikolai","yuri","viktor","alexandros","dimitris","kostas","nikos","yannis","giorgos",
  "raj","rajesh","kishan","anil","sanjay","rahul","vikram","arjun","amit","deepak","sandeep","vijay","ramesh","suresh","ravi","manish","ashok","gaurav","nikhil","pranav","aditya","rohan","karan","varun","tarek","khaled","walid","sami","fadi","nabil","ziad","hiroshi","kenji","takeshi","yuki","haruto","ren","wei","jin","jun","ming","hao","chen","feng","liang","kwame","kofi","kojo","yaw","tendai","thabo","sipho","oluwafemi","babatunde","chukwu","ikenna","obinna",
]);

const UNISEX = new Set([
  "alex","ariel","ashley","bailey","blair","brook","brooke","cameron","carmen","casey","charlie","chris","dana","drew","frances","francis","gabriel","jamie","jay","jesse","jo","jordan","jules","kelly","kim","lee","leslie","logan","lou","mackenzie","morgan","nicky","pat","quinn","reese","riley","robin","rory","sam","sandy","sasha","sidney","sydney","taylor","terry","toby","val","whitney",
]);

function inferGender(firstName: string): { gender: "female" | "male" | "unknown"; confidence: number; method: string } {
  const n = strip(firstName).split(" ")[0];
  if (!n || n.length < 2) return { gender: "unknown", confidence: 0, method: "empty" };
  if (UNISEX.has(n)) return { gender: "unknown", confidence: 0.2, method: "unisex" };
  const f = FEMALE.has(n);
  const m = MALE.has(n);
  if (f && !m) return { gender: "female", confidence: 0.9, method: "namelist" };
  if (m && !f) return { gender: "male", confidence: 0.9, method: "namelist" };
  if (f && m) return { gender: "unknown", confidence: 0.2, method: "ambiguous" };
  if (/(?:a|ia|ina|elle|ette|een|lyn|wen)$/.test(n)) return { gender: "female", confidence: 0.45, method: "suffix" };
  return { gender: "unknown", confidence: 0, method: "unlisted" };
}

// ─── Apollo API ──────────────────────────────────────────────────────────────
let _lastApolloCall = 0;

async function apolloFetch(url: string, body: any): Promise<Response> {
  const now = Date.now();
  const elapsed = now - _lastApolloCall;
  if (elapsed < APOLLO_MIN_GAP_MS) {
    await new Promise((r) => setTimeout(r, APOLLO_MIN_GAP_MS - elapsed));
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": APOLLO_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(APOLLO_TIMEOUT),
  });
  _lastApolloCall = Date.now();
  if (!res.ok) {
    const status = res.status;
    const text = await res.text().catch(() => "");
    throw new Error(`Apollo ${status}: ${text || res.statusText}`);
  }
  return res;
}

async function apolloSearch(params: {
  personTitles?: string[];
  personLocations?: string[];
  organizationLocations?: string[];
  qKeywords?: string[];
  page?: number;
  perPage?: number;
}): Promise<{ people: any[]; pagination: any }> {
  const body: any = { page: params.page || 1, per_page: params.perPage || 25 };
  if (params.personTitles?.length) body.person_titles = params.personTitles;
  if (params.personLocations?.length) body.person_locations = params.personLocations;
  if (params.organizationLocations?.length) body.q_organization_locations = params.organizationLocations;
  if (params.qKeywords?.length) body.q_keywords = params.qKeywords.join(" ");
  const res = await apolloFetch(`${APOLLO_BASE}/mixed_people/api_search`, body);
  const data = await res.json() as any;
  return {
    people: data.people || [],
    pagination: data.pagination || { page: 1, per_page: 25, total_entries: 0, total_pages: 0 },
  };
}

// ─── Exclusion & Scoring ───────────────────────────────────────────────────
function isExcluded(person: any): { excluded: boolean; reason: string } {
  const title = (person.title || "").toLowerCase();
  const headline = (person.headline || "").toLowerCase();
  const orgName = (person.organization?.name || "").toLowerCase();

  for (const frag of EXCLUDED_TITLE_FRAGMENTS) {
    if (title.includes(frag)) return { excluded: true, reason: `Excluded title: ${frag}` };
  }
  for (const kw of EXCLUDED_KEYWORDS) {
    if (title.includes(kw) || headline.includes(kw)) return { excluded: true, reason: `Excluded keyword: ${kw}` };
  }

  // Also exclude by company name (coaching firms, recruitment agencies, etc.)
  const excludedCompanyPatterns = [
    "coaching", "coaching impact", "life coach", "executive coach", "career coach",
    "recruitment", "recruiting", "talent acquisition", "headhunter", "staffing",
    "mlm", "network marketing", "direct sales", "independent distributor",
    "salesforce", "sales training", "sales coach", "business coach"
  ];
  for (const p of excludedCompanyPatterns) {
    if (orgName.includes(p)) return { excluded: true, reason: `Excluded company type: ${p}` };
  }

  return { excluded: false, reason: "" };
}

function scoreFit(person: any, gender: { gender: string; confidence: number }): { score: number; reason: string; redFlags: string[]; outreachAngle: string } {
  let score = 0;
  const reasons: string[] = [];
  const redFlags: string[] = [];

  const title = (person.title || "").toLowerCase();
  const orgName = (person.organization?.name || "").toLowerCase();
  const orgSize = person.organization?.employee_count || "";
  const industry = (person.organization?.industry || "").toLowerCase();
  // Apollo search tier returns has_email boolean flag, not actual email value
  const hasEmail = person.has_email === true || !!person.email;

  // Gender (important for women-first audience)
  if (gender.gender === "female" && gender.confidence >= 0.6) {
    score += 1; reasons.push("Likely female (high confidence)");
  } else if (gender.gender === "female") {
    score += 0.5; reasons.push("Likely female (lower confidence)");
  } else if (gender.gender === "unknown") {
    score += 0.3; reasons.push("Gender unknown — needs review");
  } else {
    redFlags.push("Likely male — consider if still valuable");
  }

  // Seniority / ownership (expanded for investors, c-suite, chairs)
  const seniorWords = [
    "founder", "co-founder", "owner", "managing director", "ceo", "director",
    "partner", "principal", "managing partner", "investor", "cfo", "coo", "cmo",
    "cto", "chair", "chairman", "chairwoman", "board member", "executive"
  ];
  if (seniorWords.some(w => title.includes(w))) { score += 1.5; reasons.push("Senior/ownership/C-suite role"); }
  else if (title.includes("manager") || title.includes("head of") || title.includes("lead")) {
    score += 0.5; reasons.push("Mid-level leadership");
  }

  // Company size (Apollo search tier returns has_employee_count flag)
  const hasEmployeeCount = person.organization?.has_employee_count === true;
  const sizeNum = parseInt(orgSize?.toString().replace(/\D/g, ""), 10);
  if (sizeNum > 10) { score += 1; reasons.push(`Company size ${orgSize}`); }
  else if (sizeNum > 0) { score += 0.5; reasons.push("Small but real business"); }
  else if (hasEmployeeCount) { score += 0.7; reasons.push("Company size data available"); }
  else { score += 0.3; reasons.push("Company size unknown"); }

  // Industry quality (Apollo search tier: use has_industry flag if value absent)
  const hasIndustry = person.organization?.has_industry === true;
  const premiumIndustries = ["healthcare", "medical", "aesthetics", "beauty", "finance", "financial services", "wealth", "accounting", "legal", "law", "real estate", "property", "construction", "architecture", "interior design", "hospitality", "retail", "luxury", "professional services", "manufacturing"];
  if (premiumIndustries.some(i => industry.includes(i))) {
    score += 1; reasons.push("Premium industry match");
  } else if (hasIndustry) {
    score += 0.5; reasons.push("Industry data available");
  } else {
    score += 0.3; reasons.push("Industry unknown (no penalty)");
  }

  // Email available (Apollo search tier returns has_email flag; give modest credit)
  if (hasEmail) { score += 0.5; reasons.push("Email data available (enrichment needed)"); }

  // Extra for female + senior combo (strongest signal)
  if (gender.gender === "female" && seniorWords.some(w => title.includes(w))) {
    score += 0.5; reasons.push("Female senior leader bonus");
  }

  // Normalize to 1-5 scale
  const finalScore = Math.min(5, Math.max(1, Math.round(score)));

  // Outreach angle
  let outreachAngle = "";
  if (title.includes("founder") || title.includes("owner")) {
    outreachAngle = "Recognise your leadership journey — a curated evening for founders who've built real businesses";
  } else if (title.includes("director") || title.includes("partner")) {
    outreachAngle = "An invitation-only leadership wellbeing evening for senior decision-makers";
  } else if (industry.includes("health") || industry.includes("medical") || industry.includes("aesthetic")) {
    outreachAngle = "A private evening for leaders in health, aesthetics and wellbeing — peer connection beyond the clinic";
  } else if (industry.includes("finance") || industry.includes("legal") || industry.includes("property")) {
    outreachAngle = "A curated room of senior professionals — connection, not networking";
  } else {
    outreachAngle = "An invitation-only leadership dinner for accomplished women across the UK";
  }

  return { score: finalScore, reason: reasons.join("; "), redFlags, outreachAngle };
}

function categorizeList(person: any, score: number, gender: { gender: string }): string {
  const title = (person.title || "").toLowerCase();
  const industry = (person.organization?.industry || "").toLowerCase();

  // Hot Fit (score 5) and Good Fit (score 4) are the highest priority
  if (score >= 4) return "Hot Fit — Contact First";

  // Corporate Senior Women
  if (title.includes("hr director") || title.includes("people director") || title.includes("finance director") || title.includes("operations director") || title.includes("cfo") || title.includes("coo") || title.includes("cmo") || title.includes("finance & operations")) {
    return "Corporate Senior Women";
  }

  // Clinics, Aesthetics & Private Healthcare
  if (industry.includes("health") || industry.includes("medical") || industry.includes("aesthetic") || industry.includes("beauty") || title.includes("clinic") || title.includes("practice") || title.includes("medical director") || title.includes("aesthetic")) {
    return "Clinics, Aesthetics & Private Healthcare";
  }

  // Legal, Finance & Property
  if (industry.includes("legal") || industry.includes("law") || industry.includes("finance") || industry.includes("accounting") || industry.includes("wealth") || industry.includes("real estate") || industry.includes("property") || title.includes("partner") || title.includes("investor") || title.includes("developer")) {
    return "Legal, Finance & Property";
  }

  // Founders & Business Owners
  if (title.includes("founder") || title.includes("owner") || title.includes("managing director") || title.includes("ceo") || title.includes("company director")) {
    return "Founders & Business Owners";
  }

  return "Good Fit — Research More";
}

// ─── Search Rounds ─────────────────────────────────────────────────────────
interface SearchRound {
  name: string;
  titles: string[];
  locations: string[];
  keywords?: string[];
  pages: number;
}

const SEARCH_ROUNDS: SearchRound[] = [
  { name: "Founders London + Home Counties", titles: ["Founder", "Co-Founder", "Owner"], locations: ["London, UK", "Buckinghamshire, UK", "Hertfordshire, UK"], pages: 3 },
  { name: "Founders Birmingham + Midlands", titles: ["Founder", "Co-Founder", "Owner"], locations: ["Birmingham, UK", "Warwickshire, UK", "Midlands, UK"], pages: 3 },
  { name: "Managing Directors all regions", titles: ["Managing Director"], locations: ["London, UK", "Birmingham, UK", "Milton Keynes, UK", "Oxford, UK", "Cambridge, UK"], pages: 2 },
  { name: "Directors — Finance & Ops", titles: ["Finance Director", "Operations Director"], locations: ["London, UK", "Birmingham, UK", "Milton Keynes, UK", "Oxford, UK", "Cambridge, UK"], pages: 2 },
  { name: "HR & People Directors", titles: ["HR Director", "People Director"], locations: ["London, UK", "Birmingham, UK", "Milton Keynes, UK", "Northampton, UK"], pages: 2 },
  { name: "Clinic & Practice Owners", titles: ["Practice Owner", "Clinic Director", "Medical Director"], locations: ["London, UK", "Birmingham, UK", "Milton Keynes, UK", "Oxford, UK"], pages: 2 },
  { name: "Partners — Legal & Finance", titles: ["Partner", "Managing Partner", "Senior Partner"], locations: ["London, UK", "Birmingham, UK", "Milton Keynes, UK", "Oxford, UK", "Cambridge, UK"], pages: 3 },
  { name: "Property Investors & Developers", titles: ["Property Investor", "Investor", "Developer"], locations: ["London, UK", "Birmingham, UK", "Milton Keynes, UK", "Bedford, UK"], pages: 2 },
  { name: "CEOs all target regions", titles: ["CEO"], locations: ["London, UK", "Birmingham, UK", "Milton Keynes, UK", "Oxford, UK", "Cambridge, UK", "Northampton, UK", "Luton, UK"], pages: 3 },
  { name: "Directors — Healthcare", titles: ["Director"], locations: ["London, UK", "Birmingham, UK", "Milton Keynes, UK"], keywords: ["healthcare", "medical", "aesthetics", "beauty"], pages: 2 },
  { name: "Directors — Hospitality & Retail", titles: ["Director", "Managing Director"], locations: ["London, UK", "Birmingham, UK", "Milton Keynes, UK", "Oxford, UK"], keywords: ["hospitality", "retail", "luxury"], pages: 2 },
  { name: "Directors — Professional Services", titles: ["Director", "Managing Director"], locations: ["London, UK", "Birmingham, UK", "Milton Keynes, UK"], keywords: ["consulting", "professional services", "business operations"], pages: 2 },
];

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Apollo Prospect Builder for The Woman Who Leads The Room ===\n");

  // Check existing prospects
  const existingRes = await pool.query(
    `SELECT source_reference, name, company FROM growth_prospects WHERE event_id = $1`,
    [EVENT_ID]
  );
  const existingSet = new Set(existingRes.rows.map((r: any) => `${r.name?.toLowerCase()}|${r.company?.toLowerCase()}`));
  console.log(`Existing prospects for this event: ${existingRes.rows.length}`);

  const allResults: any[] = [];
  let apiCalls = 0;
  let totalFound = 0;
  let stored = 0;
  let skipped = 0;
  let excluded = 0;
  let filteredMen = 0;

  for (const round of SEARCH_ROUNDS) {
    console.log(`\n--- Round: ${round.name} ---`);
    for (let page = 1; page <= round.pages; page++) {
      try {
        const result = await apolloSearch({
          personTitles: round.titles,
          personLocations: round.locations,
          qKeywords: round.keywords,
          page,
          perPage: 25,
        });
        apiCalls++;
        totalFound += result.people.length;
        console.log(`  Page ${page}: ${result.people.length} found (total entries: ${result.pagination.total_entries})`);

        for (const p of result.people) {
          const name = p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim();
          const company = p.organization?.name || "";
          if (!name) continue;

          const key = `${name.toLowerCase()}|${company.toLowerCase()}`;
          if (existingSet.has(key)) {
            skipped++;
            continue;
          }
          existingSet.add(key); // dedupe within this run too

          const ex = isExcluded(p);
          if (ex.excluded) {
            excluded++;
            continue;
          }

          const g = inferGender(p.first_name || name);
          if (g.gender === "male" && g.confidence >= 0.6) {
            filteredMen++;
            continue;
          }

          const scoreResult = scoreFit(p, g);
          const category = categorizeList(p, scoreResult.score, g);

          // Store in DB
          const [inserted] = await db
            .insert(growthProspects)
            .values({
              eventId: EVENT_ID,
              ownerId: OWNER_ID,
              prospectType: "audience",
              name,
              title: p.title || "",
              email: p.email || null,
              phone: p.phone || null,
              company,
              companySize: p.organization?.employee_count || "",
              industry: p.organization?.industry || "",
              location: p.location || p.city || "",
              profileUrl: p.linkedin_url || "",
              source: "apollo",
              sourceReference: p.id || "",
              confidenceLevel: (p.has_email === true || p.email) ? "medium" : "low",
              verified: false,
              enriched: false,
              likelyGender: g.gender,
              genderConfidence: g.confidence.toFixed(2),
              status: "new",
              metadata: {
                apolloRaw: p,
                fitScore: scoreResult.score,
                fitReason: scoreResult.reason,
                redFlags: scoreResult.redFlags,
                outreachAngle: scoreResult.outreachAngle,
                apolloList: category,
                searchRound: round.name,
                confidenceScore: (p.has_email === true || p.email) ? 50 : 20,
                genderMethod: g.method,
              },
            })
            .returning();

          allResults.push({
            id: inserted.id,
            name,
            title: p.title,
            company,
            location: p.location || p.city,
            industry: p.organization?.industry,
            score: scoreResult.score,
            category,
            gender: g.gender,
            genderConfidence: g.confidence,
            email: p.email,
            linkedin: p.linkedin_url,
            outreachAngle: scoreResult.outreachAngle,
            reason: scoreResult.reason,
            redFlags: scoreResult.redFlags,
          });
          stored++;
        }

        // Stop if we've collected enough
        if (allResults.length >= 350) {
          console.log(`  Reached target count (${allResults.length}). Stopping.`);
          break;
        }
      } catch (err: any) {
        console.error(`  ERROR page ${page}: ${err.message}`);
      }
    }
    if (allResults.length >= 350) break;
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n\n=== BUILD COMPLETE ===");
  console.log(`API calls made: ${apiCalls}`);
  console.log(`Total found by Apollo: ${totalFound}`);
  console.log(`Stored (new): ${stored}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(`Excluded (bad fit): ${excluded}`);
  console.log(`Filtered men: ${filteredMen}`);
  console.log(`Net new prospects stored: ${allResults.length}`);

  // Category breakdown
  const categories: Record<string, number> = {};
  const scores: Record<number, number> = {};
  const titleCounts: Record<string, number> = {};
  const industryCounts: Record<string, number> = {};

  for (const r of allResults) {
    categories[r.category] = (categories[r.category] || 0) + 1;
    scores[r.score] = (scores[r.score] || 0) + 1;
    const t = (r.title || "").toLowerCase();
    titleCounts[t] = (titleCounts[t] || 0) + 1;
    const ind = (r.industry || "unknown").toLowerCase();
    industryCounts[ind] = (industryCounts[ind] || 0) + 1;
  }

  console.log("\n--- By Category ---");
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log("\n--- By Fit Score ---");
  for (const [s, count] of Object.entries(scores).sort((a, b) => Number(b[0]) - Number(a[0]))) {
    console.log(`  Score ${s}: ${count}`);
  }

  console.log("\n--- Top 10 Job Titles ---");
  for (const [t, count] of Object.entries(titleCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  "${t}": ${count}`);
  }

  console.log("\n--- Top 10 Industries ---");
  for (const [i, count] of Object.entries(industryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  "${i}": ${count}`);
  }

  // Top 50 prospects to contact first
  const top50 = allResults
    .filter(r => r.score >= 4)
    .sort((a, b) => b.score - a.score || b.genderConfidence - a.genderConfidence)
    .slice(0, 50);

  console.log("\n--- TOP 50 PROSPECTS TO CONTACT FIRST ---");
  for (let i = 0; i < top50.length; i++) {
    const p = top50[i];
    console.log(`\n${i + 1}. ${p.name}`);
    console.log(`   Title: ${p.title}`);
    console.log(`   Company: ${p.company}`);
    console.log(`   Location: ${p.location}`);
    console.log(`   Industry: ${p.industry}`);
    console.log(`   Score: ${p.score}/5 | Gender: ${p.gender} (${p.genderConfidence.toFixed(2)})`);
    console.log(`   Category: ${p.category}`);
    console.log(`   LinkedIn: ${p.linkedin || "N/A"}`);
    console.log(`   Email: ${p.email || "N/A"}`);
    console.log(`   Why fit: ${p.reason}`);
    console.log(`   Outreach angle: ${p.outreachAngle}`);
    if (p.redFlags?.length) console.log(`   ⚠ Red flags: ${p.redFlags.join(", ")}`);
  }

  // Recommendations
  console.log("\n\n--- RECOMMENDED NEXT SEARCH REFINEMENTS ---");
  const lowCountCats = Object.entries(categories).filter(([, c]) => c < 10);
  if (lowCountCats.length) {
    console.log(`Under-represented categories needing more search:`);
    for (const [cat, count] of lowCountCats) {
      console.log(`  - ${cat}: only ${count} prospects`);
    }
  }
  if (scores[5] && scores[5] < 20) {
    console.log(`  - Only ${scores[5]} score-5 prospects found. Consider narrower title filters for higher quality.`);
  }
  if (scores[1] && scores[1] > 20) {
    console.log(`  - ${scores[1]} score-1 prospects stored. Review and consider marking as Do Not Contact.`);
  }

  await pool.end();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
