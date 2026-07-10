import { Router, Request, Response } from "express";
import { classifyRole, classifySector, calculateScores } from "./growth-intelligence-scoring";
import { GUEST_LONGLIST } from "./growth-guest-longlist";
import { generateRecommendations, generateExecutiveSummary } from "./growth-intelligence-recommendations";
import { generateActionReport, reportToMarkdown, reportToCSV } from "./growth-action-report-generator";
import { getTodayActions, getActivityTimeline, buildRelationships } from "./growth-operations-timeline";

// Types
export interface GuestIntelligence {
  id: string;
  name: string;
  company: string;
  role: string;
  sector: string;
  region: string;
  type: "Founder" | "Executive" | "NED" | "Investor" | "Civic" | "Other";
  reach: "Local" | "Regional" | "National" | "International";
  companySize: string;
  influenceScore: number; // 1-10
  sponsorIntroductionPotential: boolean;
  employerInfluence: string;
  speakerPotential: boolean;
  mediaProfile: string;
  warmIntroductionRoute?: string;
  invitePriority: "A" | "B" | "C";
  status: "Identified" | "Invited" | "Interested" | "Applied" | "Approved" | "Confirmed" | "Paid" | "I Am Her Complete";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organisation {
  id: string;
  name: string;
  sector: string;
  location: string;
  partnerType: "Sponsor" | "Employer" | "Civic" | "Media" | "Gifting" | "Guest Nominator";
  whyMatters: string;
  contactName?: string;
  contactRole?: string;
  email?: string;
  linkedin?: string;
  sponsorshipPotential: string;
  guestNominationPotential: string;
  strategicValueScore: number; // 1-10
  status: "Prospect" | "Contacted" | "In Discussion" | "Committed" | "Declined";
  nextAction?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Partner {
  id: string;
  name: string;
  category: string;
  whatTheyBring: string;
  whatWeWant: string;
  whatTheyGet: string;
  estimatedValue: string;
  contactPerson?: string;
  email?: string;
  status: "Prospect" | "Contacted" | "In Discussion" | "Committed" | "Declined";
  proposalSent: boolean;
  followUpDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory storage (will be replaced with DB in production)
let guests: GuestIntelligence[] = [];
let organisations: Organisation[] = [];
let partners: Partner[] = [];

export const router = Router();

// ==================== GUESTS ====================

router.get("/api/growth/guests", (req: Request, res: Response) => {
  res.json({ ok: true, guests, total: guests.length });
});

router.post("/api/growth/guests", (req: Request, res: Response) => {
  const guest: GuestIntelligence = {
    ...req.body,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  guests.push(guest);
  res.json({ ok: true, guest });
});

router.patch("/api/growth/guests/:id", (req: Request, res: Response) => {
  const guest = guests.find(g => g.id === req.params.id);
  if (!guest) return res.status(404).json({ ok: false, error: "Guest not found" });
  
  const updated = {
    ...guest,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  const idx = guests.indexOf(guest);
  guests[idx] = updated;
  res.json({ ok: true, guest: updated });
});

router.delete("/api/growth/guests/:id", (req: Request, res: Response) => {
  guests = guests.filter(g => g.id !== req.params.id);
  res.json({ ok: true });
});

router.get("/api/growth/guests/stats", (req: Request, res: Response) => {
  const stats = {
    total: guests.length,
    byPriority: {
      A: guests.filter(g => g.invitePriority === "A").length,
      B: guests.filter(g => g.invitePriority === "B").length,
      C: guests.filter(g => g.invitePriority === "C").length,
    },
    bySector: Object.fromEntries(
      [...new Set(guests.map(g => g.sector))].map(s => [s, guests.filter(g => g.sector === s).length])
    ),
    byRegion: Object.fromEntries(
      [...new Set(guests.map(g => g.region))].map(r => [r, guests.filter(g => g.region === r).length])
    ),
    byStatus: Object.fromEntries(
      [...new Set(guests.map(g => g.status))].map(s => [s, guests.filter(g => g.status === s).length])
    ),
  };
  res.json({ ok: true, stats });
});

// ==================== ORGANISATIONS ====================

router.get("/api/growth/organisations", (req: Request, res: Response) => {
  res.json({ ok: true, organisations, total: organisations.length });
});

router.post("/api/growth/organisations", (req: Request, res: Response) => {
  const org: Organisation = {
    ...req.body,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  organisations.push(org);
  res.json({ ok: true, organisation: org });
});

router.patch("/api/growth/organisations/:id", (req: Request, res: Response) => {
  const org = organisations.find(o => o.id === req.params.id);
  if (!org) return res.status(404).json({ ok: false, error: "Organisation not found" });
  
  const updated = {
    ...org,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  const idx = organisations.indexOf(org);
  organisations[idx] = updated;
  res.json({ ok: true, organisation: updated });
});

router.delete("/api/growth/organisations/:id", (req: Request, res: Response) => {
  organisations = organisations.filter(o => o.id !== req.params.id);
  res.json({ ok: true });
});

router.get("/api/growth/organisations/stats", (req: Request, res: Response) => {
  const stats = {
    total: organisations.length,
    byType: Object.fromEntries(
      [...new Set(organisations.map(o => o.partnerType))].map(t => [t, organisations.filter(o => o.partnerType === t).length])
    ),
    byStatus: Object.fromEntries(
      [...new Set(organisations.map(o => o.status))].map(s => [s, organisations.filter(o => o.status === s).length])
    ),
  };
  res.json({ ok: true, stats });
});

// ==================== PARTNERS ====================

router.get("/api/growth/partners", (req: Request, res: Response) => {
  res.json({ ok: true, partners, total: partners.length });
});

router.post("/api/growth/partners", (req: Request, res: Response) => {
  const partner: Partner = {
    ...req.body,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  partners.push(partner);
  res.json({ ok: true, partner });
});

router.patch("/api/growth/partners/:id", (req: Request, res: Response) => {
  const partner = partners.find(p => p.id === req.params.id);
  if (!partner) return res.status(404).json({ ok: false, error: "Partner not found" });
  
  const updated = {
    ...partner,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  const idx = partners.indexOf(partner);
  partners[idx] = updated;
  res.json({ ok: true, partner: updated });
});

router.delete("/api/growth/partners/:id", (req: Request, res: Response) => {
  partners = partners.filter(p => p.id !== req.params.id);
  res.json({ ok: true });
});

router.get("/api/growth/partners/stats", (req: Request, res: Response) => {
  const stats = {
    total: partners.length,
    byStatus: Object.fromEntries(
      [...new Set(partners.map(p => p.status))].map(s => [s, partners.filter(p => p.status === s).length])
    ),
    proposalsSent: partners.filter(p => p.proposalSent).length,
    followUpsDue: partners.filter(p => p.followUpDate && new Date(p.followUpDate) <= new Date()).length,
  };
  res.json({ ok: true, stats });
});

// ==================== DASHBOARD ====================

router.get("/api/growth/intelligence-dashboard", (req: Request, res: Response) => {
  const guestStats = {
    total: guests.length,
    byPriority: {
      A: guests.filter(g => g.invitePriority === "A").length,
      B: guests.filter(g => g.invitePriority === "B").length,
      C: guests.filter(g => g.invitePriority === "C").length,
    },
    bySector: Object.fromEntries(
      [...new Set(guests.map(g => g.sector))].map(s => [s, guests.filter(g => g.sector === s).length])
    ),
    byRegion: Object.fromEntries(
      [...new Set(guests.map(g => g.region))].map(r => [r, guests.filter(g => g.region === r).length])
    ),
  };

  const orgStats = {
    total: organisations.length,
    byType: Object.fromEntries(
      [...new Set(organisations.map(o => o.partnerType))].map(t => [t, organisations.filter(o => o.partnerType === t).length])
    ),
  };

  const partnerStats = {
    total: partners.length,
    followUpsDue: partners.filter(p => p.followUpDate && new Date(p.followUpDate) <= new Date()).length,
    totalEstimatedValue: partners
      .filter(p => !isNaN(parseInt(p.estimatedValue.replace(/[^\d]/g, ""))))
      .reduce((sum, p) => sum + parseInt(p.estimatedValue.replace(/[^\d]/g, "")), 0),
  };

  res.json({ ok: true, guests: guestStats, organisations: orgStats, partners: partnerStats });
});

// ==================== IMPORT ====================

router.post("/api/growth/guests/import-longlist", (req: Request, res: Response) => {
  try {
    const imported: GuestIntelligence[] = [];
    let skipped = 0;

    for (const item of GUEST_LONGLIST) {
      // Check if already exists
      if (guests.find(g => g.name === item.name && g.company === item.company)) {
        skipped++;
        continue;
      }

      // Classify
      const roleClassification = classifyRole(item.role, item.company);
      const sectorClassification = classifySector(item.role, item.company);

      // Calculate scores
      const scores = calculateScores(
        item.role,
        item.company,
        item.sector,
        roleClassification.type,
        "Regional", // Default to regional
        ""
      );

      const guest: GuestIntelligence = {
        id: Date.now().toString() + Math.random(),
        name: item.name,
        company: item.company,
        role: item.role,
        sector: item.sector,
        region: item.region,
        type: roleClassification.type,
        reach: "Regional",
        companySize: "Unknown",
        influenceScore: scores.influenceScore,
        sponsorIntroductionPotential: scores.sponsorIntroductionPotential >= 6,
        employerInfluence: item.company,
        speakerPotential: scores.speakerPotential >= 6,
        mediaProfile: "",
        invitePriority: "B",
        status: "Identified",
        notes: item.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      guests.push(guest);
      imported.push(guest);
    }

    res.json({
      ok: true,
      imported: imported.length,
      skipped,
      total: guests.length,
      message: `Imported ${imported.length} guests${skipped > 0 ? `, skipped ${skipped} duplicates` : ""}`,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Import failed" });
  }
});

// ==================== RECOMMENDATIONS ====================

router.get("/api/growth/intelligence-recommendations", (req: Request, res: Response) => {
  const recommendations = generateRecommendations(guests);
  const summary = generateExecutiveSummary(guests);

  res.json({
    ok: true,
    summary,
    recommendations: recommendations.slice(0, 10), // Top 10 recs
    total: recommendations.length,
  });
});

// ==================== ACTION REPORT ====================

router.get("/api/growth/room-build-action-report", (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || "json"; // json, markdown, csv

    const report = generateActionReport(guests);

    if (format === "markdown") {
      const markdown = reportToMarkdown(report);
      res.setHeader("Content-Type", "text/markdown");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="room-build-action-report.md"'
      );
      res.send(markdown);
    } else if (format === "csv") {
      const csv = reportToCSV(report);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="room-build-action-report.csv"'
      );
      res.send(csv);
    } else {
      res.json({
        ok: true,
        report,
      });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: "Report generation failed" });
  }
});

// Download specific formats
router.get("/api/growth/room-build-action-report/download/:format", (req: Request, res: Response) => {
  try {
    const format = req.params.format; // markdown or csv

    if (!["markdown", "csv"].includes(format)) {
      return res.status(400).json({ ok: false, error: "Format must be markdown or csv" });
    }

    const report = generateActionReport(guests);

    if (format === "markdown") {
      const markdown = reportToMarkdown(report);
      res.setHeader("Content-Type", "text/markdown");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="room-build-action-report.md"'
      );
      res.send(markdown);
    } else if (format === "csv") {
      const csv = reportToCSV(report);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="room-build-action-report.csv"'
      );
      res.send(csv);
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: "Download failed" });
  }
});

// ==================== OPERATIONS & TIMELINE ====================

router.get("/api/growth/today-actions", (req: Request, res: Response) => {
  try {
    const actions = getTodayActions(guests, organisations, partners);
    res.json({
      ok: true,
      actions,
      count: actions.length,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch today's actions" });
  }
});

router.get("/api/growth/activity-timeline", (req: Request, res: Response) => {
  try {
    const timeline = getActivityTimeline(guests, organisations, partners);
    res.json({
      ok: true,
      timeline,
      count: timeline.length,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch activity timeline" });
  }
});

router.get("/api/growth/guests/:id/relationships", (req: Request, res: Response) => {
  try {
    const guest = guests.find(g => g.id === req.params.id);
    if (!guest) {
      return res.status(404).json({ ok: false, error: "Guest not found" });
    }

    const relationships = buildRelationships(guest, guests, organisations, partners);
    res.json({
      ok: true,
      guest: { name: guest.name, company: guest.company, sector: guest.sector },
      relationships,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch relationships" });
  }
});

export default router;
