import { Router } from "express";
import { searchContractsFinder } from "./contractsfinder";
import { searchFindATender } from "./findatender";

const router = Router();

const PRESET_CATEGORIES = [
  { id: "fcdo", label: "FCDO & Foreign Office", keywords: ["FCDO", "Foreign Commonwealth Development", "overseas development", "international aid"] },
  { id: "africa", label: "Africa Programmes", keywords: ["Africa", "Sub-Saharan", "Nigeria", "East Africa", "West Africa", "African Development"] },
  { id: "events", label: "Events & Conferencing", keywords: ["event management", "conference", "ceremony", "hospitality", "venue management"] },
  { id: "logistics", label: "Logistics & Travel", keywords: ["travel management", "logistics", "delegate travel", "accommodation"] },
  { id: "diaspora", label: "Diaspora & Remittance", keywords: ["remittance", "diaspora", "cross-border payment", "money transfer", "financial inclusion"] },
  { id: "training", label: "Training & Capacity Building", keywords: ["training", "capacity building", "skills development", "workshop delivery"] },
  { id: "government", label: "UK Government Departments", keywords: ["Cabinet Office", "HMRC", "British Council", "Home Office", "UKRI"] },
];

function similarityScore(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 80;
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const common = words1.filter(w => words2.includes(w)).length;
  return (common / Math.max(words1.length, words2.length)) * 100;
}

function deduplicateTenders(tenders: any[]): any[] {
  const seen = new Map<string, any>();
  for (const tender of tenders) {
    let isDuplicate = false;
    for (const [key, existing] of seen) {
      const score = similarityScore(tender.title, existing.title);
      if (score > 75 && tender.buyer === existing.buyer) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      seen.set(tender.id, tender);
    }
  }
  return [...seen.values()];
}

// GET /api/uk-tenders?q=FCDO&status=open
router.get("/uk-tenders", async (req, res) => {
  try {
    const query = (req.query.q as string) || "event management";
    const status = (req.query.status as string) || "open";

    const [cfResults, fatResults] = await Promise.allSettled([
      searchContractsFinder(query, 1, 100, status),
      searchFindATender(query, status),
    ]);

    const contractsFinderData = cfResults.status === "fulfilled" ? cfResults.value : [];
    const findATenderData = fatResults.status === "fulfilled" ? fatResults.value : [];
    const errors = [];

    if (cfResults.status === "rejected") {
      errors.push({ source: "Contracts Finder", error: (cfResults.reason as any).message });
    }
    if (fatResults.status === "rejected") {
      errors.push({ source: "Find a Tender", error: (fatResults.reason as any).message });
    }

    // Merge and deduplicate
    const allResults = [...contractsFinderData, ...findATenderData];
    const deduplicated = deduplicateTenders(allResults);

    // Sort: open first, then soonest deadline
    deduplicated.sort((a, b) => {
      if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
      if (a.daysLeft !== null && b.daysLeft !== null) {
        return a.daysLeft - b.daysLeft;
      }
      return 0;
    });

    res.json({
      query,
      total: deduplicated.length,
      sources: {
        contractsFinder: contractsFinderData.length,
        findATender: findATenderData.length,
        errors,
      },
      results: deduplicated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/uk-tenders/categories
router.get("/uk-tenders/categories", async (req, res) => {
  try {
    const categoryResults = await Promise.allSettled(
      PRESET_CATEGORIES.map(async (cat) => {
        const allResults: any[] = [];
        const errors = [];

        for (const keyword of cat.keywords) {
          const [cfResults, fatResults] = await Promise.allSettled([
            searchContractsFinder(keyword, 1, 50),
            searchFindATender(keyword),
          ]);

          if (cfResults.status === "fulfilled") {
            allResults.push(...cfResults.value);
          } else {
            errors.push({ keyword, source: "Contracts Finder", error: (cfResults.reason as any).message });
          }

          if (fatResults.status === "fulfilled") {
            allResults.push(...fatResults.value);
          } else {
            errors.push({ keyword, source: "Find a Tender", error: (fatResults.reason as any).message });
          }
        }

        // Deduplicate
        const deduplicated = deduplicateTenders(allResults);

        // Sort by relevance (daysLeft ascending = urgent first)
        deduplicated.sort((a, b) => {
          if (a.daysLeft !== null && b.daysLeft !== null) {
            return a.daysLeft - b.daysLeft;
          }
          return 0;
        });

        return {
          id: cat.id,
          label: cat.label,
          count: deduplicated.length,
          results: deduplicated.slice(0, 10),
          errors: errors.length > 0 ? errors : undefined,
        };
      })
    );

    const categories = categoryResults
      .filter(r => r.status === "fulfilled")
      .map(r => (r as PromiseFulfilledResult<any>).value);

    res.json({ categories });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
