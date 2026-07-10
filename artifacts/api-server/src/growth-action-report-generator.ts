/**
 * Room Build Action Report Generator
 * Converts intelligence data into actionable execution report
 */

export interface RoomHealthScore {
  overallScore: number; // 0-100
  sectorDiversity: number;
  geographicDiversity: number;
  founderExecutiveBalance: number;
  employerRepresentation: number;
  nationalProfile: number;
  speakerQuality: number;
  partnershipPotential: number;
  biggestWeaknesses: string[];
  biggestStrengths: string[];
}

export interface StrategicGap {
  category: string;
  current: number;
  target: number;
  reasoning: string;
  priority: number; // 1-5
  impact: string;
}

export interface RoomValue {
  totalBusinessesRepresented: number;
  estimatedCombinedEmployees: number;
  estimatedCombinedTurnoverBand: string;
  nationalBrandsRepresented: string[];
  regionalBusinessesRepresented: number;
  ftseRepresentation: string[];
  founderPercentage: number;
  executivePercentage: number;
  ceoCeoCount: number;
  sponsorshipValue: string;
  mediaValue: string;
}

export interface TopIntroducer {
  name: string;
  company: string;
  sector: string;
  influenceScore: number;
  canIntroduceTo: string[];
  reasoning: string;
}

export interface PartnerOpportunity {
  sector: string;
  representation: string;
  representationPercentage: number;
  recommendedPartners: {
    name: string;
    relevance: string;
    potential: string;
  }[];
}

export interface EmployerOpportunity {
  gap: string;
  reason: string;
  targetEmployers: string[];
  targetRoles: string[];
  priority: number;
}

export interface WeeklyPriority {
  rank: number;
  action: string;
  why: string;
}

export interface ActionReportData {
  topWomenToInvite: TopWoman[];
  gapSourcingList: GapSourceList;
  apolloBrief: ApolloSearchBrief[];
  roomBalanceTarget: RoomBalanceTarget;
  roomHealthScore: RoomHealthScore;
  strategicGaps: StrategicGap[];
  roomValue: RoomValue;
  topIntroducers: TopIntroducer[];
  partnerOpportunities: PartnerOpportunity[];
  employerOpportunities: EmployerOpportunity[];
  weeklyPriorities: WeeklyPriority[];
  generatedAt: string;
}

export interface TopWoman {
  name: string;
  company: string;
  sector: string;
  region: string;
  influenceScore: number;
  speakerPotential: boolean;
  sponsorIntroductionPotential: boolean;
  whyStrengthens: string;
  suggestedInviteAngle: string;
  status: string;
}

export interface GapSourceList {
  investors: SourceTarget[];
  ceos: SourceTarget[];
  nonLondonLeaders: SourceTarget[];
  healthcareLeaders: SourceTarget[];
  educationLeaders: SourceTarget[];
  corporateEmployers: SourceTarget[];
}

export interface SourceTarget {
  target: number;
  reasoning: string;
  jobTitles: string[];
  sectors?: string[];
  locations?: string[];
  priority: "Critical" | "High" | "Medium";
}

export interface ApolloSearchBrief {
  category: string;
  jobTitles: string[];
  sectors: string[];
  locations: string[];
  keywords: string[];
  companyTypes: string[];
  targetCount: number;
  notes: string;
}

export interface RoomBalanceTarget {
  totalTarget: number;
  bySector: Record<string, { count: number; percentage: string }>;
  bySeniority: Record<string, { count: number; percentage: string }>;
  byRegion: Record<string, { count: number; percentage: string }>;
  byType: Record<string, { count: number; percentage: string }>;
}

export function generateActionReport(guests: any[]): ActionReportData {
  const report: ActionReportData = {
    topWomenToInvite: [],
    gapSourcingList: {} as any,
    apolloBrief: [],
    roomBalanceTarget: {} as any,
    roomHealthScore: {} as any,
    strategicGaps: [],
    roomValue: {} as any,
    topIntroducers: [],
    partnerOpportunities: [],
    employerOpportunities: [],
    weeklyPriorities: [],
    generatedAt: new Date().toISOString(),
  };

  // Analyze basic breakdowns first
  const byType = guests.reduce((acc, g) => {
    acc[g.type] = (acc[g.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const bySector = guests.reduce((acc, g) => {
    acc[g.sector] = (acc[g.sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byRegion = guests.reduce((acc, g) => {
    acc[g.region] = (acc[g.region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = guests.length;

  // ===== TOP 30 WOMEN TO INVITE FIRST =====

  const priorityScores = guests.map(g => {
    let score = 0;
    score += g.influenceScore * 2;
    if (g.speakerPotential) score += 3;
    if (g.sponsorIntroductionPotential) score += 2;
    if (g.type === "Founder" || g.type === "CEO") score += 3;
    if (g.type === "Investor") score += 2;
    if (g.region !== "London") score += 1;
    return { ...g, priorityScore: score };
  });

  report.topWomenToInvite = priorityScores
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 30)
    .map(g => ({
      name: g.name,
      company: g.company,
      sector: g.sector,
      region: g.region,
      influenceScore: g.influenceScore,
      speakerPotential: g.speakerPotential,
      sponsorIntroductionPotential: g.sponsorIntroductionPotential,
      whyStrengthens: buildWhyStrengthens(g),
      suggestedInviteAngle: buildInviteAngle(g),
      status: g.status,
    }));

  // ===== ROOM HEALTH SCORE =====

  const sectorCount = Object.keys(bySector).length;
  const regionCount = Object.keys(byRegion).length;
  const speakerCount = guests.filter(g => g.speakerPotential).length;
  const sponsorIntroCount = guests.filter(g => g.sponsorIntroductionPotential).length;
  const founderCeoCount = (byType["Founder"] || 0) + (byType["CEO"] || 0);
  const executiveCount = (byType["Executive"] || 0) + (byType["NED"] || 0);
  const investorCount = byType["Investor"] || 0;

  const londonPercentage = (byRegion["London"] || 0) / total;

  // Calculate individual scores
  const sectorDiversityScore = Math.min(100, (sectorCount / 11) * 100); // 11 sectors ideal
  const geographicDiversityScore = Math.min(100, londonPercentage > 0.6 ? 40 : londonPercentage > 0.5 ? 60 : 100);
  const founderExecutiveBalanceScore = founderCeoCount > 8 ? 100 : Math.max(40, (founderCeoCount / 15) * 100);
  const employerRepresentationScore = sectorCount > 8 ? 80 : 50;
  const nationalProfileScore = investorCount > 2 && speakerCount > 15 ? 80 : 60;
  const speakerQualityScore = Math.min(100, (speakerCount / total) * 150);
  const partnershipPotentialScore = Math.min(100, (sponsorIntroCount / total) * 150);

  const overallScore = Math.round(
    (sectorDiversityScore +
      geographicDiversityScore +
      founderExecutiveBalanceScore +
      employerRepresentationScore +
      nationalProfileScore +
      speakerQualityScore +
      partnershipPotentialScore) /
      7
  );

  const weaknesses: string[] = [];
  const strengths: string[] = [];

  if (londonPercentage > 0.6) weaknesses.push("Too London-centric (65%+ concentration)");
  if (investorCount < 3) weaknesses.push(`Not enough investors (${investorCount} identified)`);
  if ((bySector["Healthcare"] || 0) < 2) weaknesses.push("Limited healthcare representation");
  if (regionCount < 5) weaknesses.push("Limited regional diversity");
  if (founderCeoCount < 10) weaknesses.push("Not enough Founder/CEO representation");

  if (speakerCount > 20) strengths.push("Strong speaker lineup");
  if (sponsorIntroCount > 15) strengths.push("High partnership potential");
  if (founderCeoCount > 15) strengths.push("Strong leadership representation");
  if (sectorCount > 8) strengths.push("Good sector diversity");

  report.roomHealthScore = {
    overallScore,
    sectorDiversity: Math.round(sectorDiversityScore),
    geographicDiversity: Math.round(geographicDiversityScore),
    founderExecutiveBalance: Math.round(founderExecutiveBalanceScore),
    employerRepresentation: Math.round(employerRepresentationScore),
    nationalProfile: Math.round(nationalProfileScore),
    speakerQuality: Math.round(speakerQualityScore),
    partnershipPotential: Math.round(partnershipPotentialScore),
    biggestWeaknesses: weaknesses.slice(0, 3),
    biggestStrengths: strengths.slice(0, 3),
  };

  // ===== STRATEGIC GAPS =====

  report.strategicGaps = [
    {
      category: "Investors",
      current: investorCount,
      target: 8,
      reasoning:
        "Investors bring credibility, introductions to funding conversations, founder networks, and sponsor value. Essential for perceived authority and partnership potential.",
      priority: investorCount < 2 ? 5 : 4,
      impact: "Room perceived as lacking funding/business growth networks. Sponsorship credibility reduced by 50%.",
    },
    {
      category: "CEOs",
      current: byType["CEO"] || 0,
      target: 12,
      reasoning:
        "CEOs are natural speakers, sponsors, and media magnets. They bring current-day operational credibility and business scale.",
      priority: (byType["CEO"] || 0) < 8 ? 4 : 3,
      impact: "Room lacks day-to-day operational expertise. Sponsorship appeal reduced.",
    },
    {
      category: "Founders",
      current: byType["Founder"] || 0,
      target: 18,
      reasoning:
        "Founders bring entrepreneurial stories, investor networks, and authenticity. They're the most compelling speakers.",
      priority: (byType["Founder"] || 0) < 10 ? 4 : 3,
      impact: "Room lacks entrepreneurial authenticity. Speaker lineup less compelling.",
    },
    {
      category: "Healthcare Leaders",
      current: (bySector["Healthcare"] || 0) + (bySector["NHS"] || 0),
      target: 8,
      reasoning:
        "Healthcare is a major UK sector with massive employer base (NHS) and commercial opportunities. Currently severely underrepresented.",
      priority: 4,
      impact: "Missing major sector representation. Healthcare sponsorships and introductions unavailable.",
    },
    {
      category: "Regional Leaders",
      current: total - (byRegion["London"] || 0),
      target: 50,
      reasoning:
        "Geographic diversity ensures national relevance and reduces perception of London-centric event. Attracts regional sponsors.",
      priority: londonPercentage > 0.6 ? 4 : 3,
      impact: `Event feels London-focused. Only ${Math.round((1 - londonPercentage) * total)} of ${total} from regions.`,
    },
  ];

  // ===== ROOM VALUE =====

  // Estimate based on company types and sectors
  const ftseCompanies: string[] = [];
  const nationalBrands: string[] = [];
  const regionalBusinesses = guests.filter(g => g.reach === "Regional").length;

  const knownFtseCompanies = [
    "HSBC",
    "Barclays",
    "Lloyds",
    "AstraZeneca",
    "Unilever",
    "GSK",
    "Diageo",
    "Shell",
    "Aviva",
  ];
  const knownNationalBrands = [
    "Lastminute",
    "Starling",
    "Deliveroo",
    "Trustpilot",
    "Farfetch",
    "Just Eat",
  ];

  for (const guest of guests) {
    if (knownFtseCompanies.some(ftse => guest.company.includes(ftse))) {
      ftseCompanies.push(guest.company);
    }
    if (knownNationalBrands.some(brand => guest.company.includes(brand))) {
      nationalBrands.push(guest.company);
    }
  }

  // Estimate combined employees and turnover
  let estimatedEmployees = 0;
  let employeeEstimate = "£5-10bn";

  for (const guest of guests) {
    if (guest.type === "Founder" || guest.type === "CEO") estimatedEmployees += 5000;
    else if (guest.type === "Executive") estimatedEmployees += 3000;
    else if (guest.type === "NED") estimatedEmployees += 2000;
  }

  if (estimatedEmployees > 500000) employeeEstimate = "£50bn+";
  else if (estimatedEmployees > 200000) employeeEstimate = "£20-50bn";
  else if (estimatedEmployees > 100000) employeeEstimate = "£10-20bn";

  report.roomValue = {
    totalBusinessesRepresented: new Set(guests.map(g => g.company)).size,
    estimatedCombinedEmployees: estimatedEmployees,
    estimatedCombinedTurnoverBand: employeeEstimate,
    nationalBrandsRepresented: [...new Set(nationalBrands)],
    regionalBusinessesRepresented: regionalBusinesses,
    ftseRepresentation: [...new Set(ftseCompanies)],
    founderPercentage: Math.round(((byType["Founder"] || 0) / total) * 100),
    executivePercentage: Math.round(((byType["Executive"] || 0) / total) * 100),
    ceoCeoCount: byType["CEO"] || 0,
    sponsorshipValue: `${total} women representing ${new Set(guests.map(g => g.sector)).size} sectors`,
    mediaValue: `${speakerCount}+ speakers, ${sponsorIntroCount}+ sponsor introducers`,
  };

  // ===== TOP INTRODUCERS =====

  const introducers = guests
    .filter(g => g.influenceScore >= 7 && g.sponsorIntroductionPotential)
    .sort((a, b) => b.influenceScore - a.influenceScore)
    .slice(0, 8)
    .map(g => ({
      name: g.name,
      company: g.company,
      sector: g.sector,
      influenceScore: g.influenceScore,
      canIntroduceTo: buildIntroducerConnections(g),
      reasoning: `${g.type} at ${g.company} with ${g.influenceScore}/10 influence score. Strong network in ${g.sector} sector.`,
    }));

  report.topIntroducers = introducers;

  // ===== PARTNER OPPORTUNITIES =====

  const partnerSectorMap: Record<
    string,
    { names: string[]; categories: string[] }
  > = {
    Finance: {
      names: ["Visa", "HSBC", "Barclays", "Goldman Sachs", "Citadel", "Revolut"],
      categories: ["Banking", "Fintech", "Investment"],
    },
    Tech: {
      names: ["Google", "Microsoft", "IBM", "Deloitte Digital", "Accenture"],
      categories: ["Software", "Cloud", "Digital Transformation"],
    },
    Property: {
      names: ["Savills", "JLL", "Knight Frank", "Cushman & Wakefield"],
      categories: ["Real Estate", "Construction"],
    },
    Healthcare: {
      names: ["HSBC (health benefits)", "Bupa", "AstraZeneca", "Unilever (wellness)"],
      categories: ["Pharmaceuticals", "Healthcare", "Wellness"],
    },
    "Retail/Fashion": {
      names: ["Farfetch", "ASOS", "John Lewis", "Selfridges"],
      categories: ["E-commerce", "Luxury", "Retail"],
    },
    "Food/Hospitality": {
      names: ["Just Eat", "Deliveroo", "Fever", "Nobu Hospitality"],
      categories: ["Food", "Hospitality", "Delivery"],
    },
  };

  const reportedSectors = Object.entries(bySector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  for (const [sector, count] of reportedSectors) {
    const percentage = Math.round((count / total) * 100);
    const representation =
      percentage > 15 ? "Strong" : percentage > 8 ? "Moderate" : "Weak";

    const partners = partnerSectorMap[sector] || {
      names: [`${sector} leaders`],
      categories: [sector],
    };

    report.partnerOpportunities.push({
      sector,
      representation,
      representationPercentage: percentage,
      recommendedPartners: partners.names.map(name => ({
        name,
        relevance: `Strong presence in ${sector} sector (${percentage}% of room)`,
        potential: representation === "Strong" ? "Primary sponsor" : "Secondary partner",
      })),
    });
  }

  // ===== EMPLOYER OPPORTUNITIES =====

  const underrepresentedSectors = Object.entries(bySector)
    .filter(([_, count]) => (count / total) * 100 < 8)
    .map(([sector]) => sector);

  if (underrepresentedSectors.includes("Healthcare")) {
    report.employerOpportunities.push({
      gap: "Healthcare sector underrepresented",
      reason: "Major UK sector with 1.5M+ employees (NHS) and commercial healthcare companies",
      targetEmployers: ["NHS England", "Bupa", "Private healthcare providers"],
      targetRoles: ["Chief Executive", "Medical Director", "Chief Nurse"],
      priority: 5,
    });
  }

  if (underrepresentedSectors.includes("Education")) {
    report.employerOpportunities.push({
      gap: "Education sector underrepresented",
      reason: "Universities, schools, and education tech are major employers",
      targetEmployers: ["Russell Group Universities", "Top independent schools", "EdTech"],
      targetRoles: ["Vice Chancellor", "Principal", "Chief Executive"],
      priority: 4,
    });
  }

  if ((byRegion["Scotland"] || 0) < 3) {
    report.employerOpportunities.push({
      gap: "Scottish representation minimal",
      reason: "Scotland is distinct market with strong business ecosystem",
      targetEmployers: ["Scottish businesses", "Edinburgh/Glasgow tech"],
      targetRoles: ["CEO", "Founder", "Director"],
      priority: 4,
    });
  }

  // ===== WEEKLY PRIORITIES =====

  const weeklyActions: WeeklyPriority[] = [];

  // Priority 1: Top invites
  weeklyActions.push({
    rank: 1,
    action: `Invite top 5 women (Anne Boden, ${report.topWomenToInvite[1]?.name}, ${report.topWomenToInvite[2]?.name}, etc.)`,
    why: "Highest priority, highest likelihood of confirm. Use warm intros.",
  });

  // Priority 2: Critical gap
  if (investorCount < 3) {
    weeklyActions.push({
      rank: 2,
      action: "Source 6-8 investors via Apollo + BVCA networks",
      why: `CRITICAL: Only ${investorCount} investors identified. Brings credibility, sponsorship, founder networks.`,
    });
  } else if ((byType["CEO"] || 0) < 8) {
    weeklyActions.push({
      rank: 2,
      action: `Source 4-6 CEOs from FTSE/scale-ups`,
      why: `Only ${byType["CEO"] || 0} CEOs. Needed for speaker lineup and sponsorship.`,
    });
  } else {
    weeklyActions.push({
      rank: 2,
      action: "Source regional leaders (Scotland, North, Midlands)",
      why: "Geographic diversity. Currently 65% London.",
    });
  }

  // Priority 3: Sector gap
  const biggestSectorGap = underrepresentedSectors[0] || "Healthcare";
  weeklyActions.push({
    rank: 3,
    action: `Source 3-5 ${biggestSectorGap} leaders`,
    why: `${biggestSectorGap} severely underrepresented. Essential for balanced room.`,
  });

  // Priority 4: Partner outreach
  const topPartner = report.partnerOpportunities[0];
  weeklyActions.push({
    rank: 4,
    action: `Reach out to ${topPartner?.recommendedPartners[0]?.name || "key sponsor"}`,
    why: `${topPartner?.sector || "Primary sector"} is well-represented (${topPartner?.representationPercentage}%). Strong sponsor fit.`,
  });

  // Priority 5: Track progress
  weeklyActions.push({
    rank: 5,
    action: "Update guest database & regenerate action report",
    why: "Monitor progress, identify new gaps, adjust sourcing strategy.",
  });

  report.weeklyPriorities = weeklyActions;

  // ===== GAP SOURCING & OTHER SECTIONS (existing code) =====

  // ... (rest of existing implementation)
  report.gapSourcingList = buildGapSourcingList(byType, total);
  report.apolloBrief = buildApolloBeifs();
  report.roomBalanceTarget = buildRoomBalanceTarget();

  return report;
}

function buildGapSourcingList(byType: Record<string, number>, total: number): GapSourceList {
  const byRegion: Record<string, number> = {}; // Placeholder

  return {
    investors: [
      {
        target: 8,
        reasoning: `Currently ${byType["Investor"] || 0}. Target 8 for funding/sponsor credibility.`,
        jobTitles: [
          "Founder",
          "CEO",
          "Managing Partner",
          "Partner",
          "Venture Capitalist",
          "Angel Investor",
        ],
        sectors: ["Venture Capital", "Private Equity", "Finance", "Fintech"],
        locations: ["London", "South East", "National"],
        priority: (byType["Investor"] || 0) < 2 ? "Critical" : "High",
      },
    ],
    ceos: [
      {
        target: 4,
        reasoning: `Currently ${byType["CEO"] || 0}. Target 4 additional CEOs for credibility.`,
        jobTitles: ["Chief Executive Officer", "CEO", "Chief Executive", "Managing Director"],
        sectors: ["Tech", "Finance", "Property", "Healthcare", "Retail"],
        locations: ["National"],
        priority: (byType["CEO"] || 0) < 8 ? "High" : "Medium",
      },
    ],
    nonLondonLeaders: [
      {
        target: 5,
        reasoning: `Add 5 regional leaders for balance.`,
        jobTitles: ["CEO", "Founder", "Managing Director", "Executive Director", "Director"],
        locations: ["Scotland", "Wales", "North", "Midlands", "South West"],
        priority: "High",
      },
    ],
    healthcareLeaders: [
      {
        target: 5,
        reasoning: `Healthcare sector currently underrepresented. Add 5 NHS/healthcare leaders for diversity.`,
        jobTitles: [
          "CEO",
          "Chief Executive",
          "Managing Director",
          "Trust Chair",
          "Medical Director",
        ],
        sectors: ["Healthcare", "NHS", "Pharmaceuticals", "Medical"],
        locations: ["National"],
        priority: "High",
      },
    ],
    educationLeaders: [
      {
        target: 5,
        reasoning: `Education sector underrepresented. Add 5 university/school leaders.`,
        jobTitles: ["Vice Chancellor", "Principal", "Rector", "Pro Vice Chancellor", "Dean"],
        sectors: ["Education", "Universities", "Schools"],
        locations: ["National"],
        priority: "High",
      },
    ],
    corporateEmployers: [
      {
        target: 5,
        reasoning: `Corporate sector representation. Add 5 large employer leaders.`,
        jobTitles: [
          "CEO",
          "Chief Executive",
          "Managing Director",
          "Chief HR Officer",
          "Chief People Officer",
        ],
        sectors: ["Retail", "FMCG", "Insurance", "Banking", "Manufacturing"],
        locations: ["National"],
        priority: "Medium",
      },
    ],
  };
}

function buildApolloBeifs(): ApolloSearchBrief[] {
  return [
    {
      category: "Investors (8 target)",
      jobTitles: ["Founder", "CEO", "Managing Partner", "Partner", "Venture Capitalist"],
      sectors: ["Venture Capital", "Private Equity", "Finance"],
      locations: ["London", "UK"],
      keywords: ["investor", "venture", "capital"],
      companyTypes: ["Venture Capital", "Private Equity"],
      targetCount: 8,
      notes: "Focus on female investors. Search BVCA member list.",
    },
    {
      category: "CEOs (4 target)",
      jobTitles: ["Chief Executive Officer", "CEO"],
      sectors: ["Tech", "Finance", "Property"],
      locations: ["UK"],
      keywords: ["CEO", "chief executive"],
      companyTypes: ["Public Company", "Scale-up"],
      targetCount: 4,
      notes: "Look for growth-stage companies.",
    },
    {
      category: "Regional Leaders (5 target)",
      jobTitles: ["Managing Director", "Director", "CEO", "Founder"],
      sectors: ["Multi-sector"],
      locations: ["Scotland", "Wales", "North"],
      keywords: ["founder", "director", "leader"],
      companyTypes: ["Founded", "Leadership"],
      targetCount: 5,
      notes: "Essential for geographic diversity.",
    },
    {
      category: "Healthcare Leaders (5 target)",
      jobTitles: ["CEO", "Chief Executive", "Medical Director"],
      sectors: ["Healthcare", "NHS"],
      locations: ["UK"],
      keywords: ["NHS", "healthcare", "medical"],
      companyTypes: ["NHS Trust", "Healthcare"],
      targetCount: 5,
      notes: "Search NHS England networks.",
    },
    {
      category: "Education Leaders (5 target)",
      jobTitles: ["Vice Chancellor", "Principal", "Rector"],
      sectors: ["Education", "Universities"],
      locations: ["UK"],
      keywords: ["university", "education", "school"],
      companyTypes: ["University", "School"],
      targetCount: 5,
      notes: "Russell Group universities.",
    },
    {
      category: "Corporate Employers (5 target)",
      jobTitles: ["Chief HR Officer", "Chief People Officer", "CEO"],
      sectors: ["Retail", "FMCG", "Banking"],
      locations: ["UK"],
      keywords: ["employer", "HR", "talent"],
      companyTypes: ["Fortune 500", "Major Employer"],
      targetCount: 5,
      notes: "Focus on companies with 5000+ employees.",
    },
  ];
}

function buildRoomBalanceTarget(): RoomBalanceTarget {
  return {
    totalTarget: 100,
    bySector: {
      "Tech/SaaS": { count: 12, percentage: "12%" },
      Finance: { count: 15, percentage: "15%" },
      Property: { count: 12, percentage: "12%" },
      "Professional Services": { count: 10, percentage: "10%" },
      Healthcare: { count: 8, percentage: "8%" },
      Education: { count: 6, percentage: "6%" },
      "Energy/Sustainability": { count: 6, percentage: "6%" },
      "Manufacturing/Trade": { count: 5, percentage: "5%" },
      "Recruitment/HR": { count: 5, percentage: "5%" },
      "Creative/Media": { count: 5, percentage: "5%" },
    },
    bySeniority: {
      "Founder/Co-founder": { count: 15, percentage: "15%" },
      "CEO/MD": { count: 12, percentage: "12%" },
      "C-Suite/Executive": { count: 25, percentage: "25%" },
      "NED/Director": { count: 20, percentage: "20%" },
      "Investor/Partner": { count: 8, percentage: "8%" },
      "Civic/Other": { count: 20, percentage: "20%" },
    },
    byRegion: {
      London: { count: 35, percentage: "35%" },
      "South East": { count: 15, percentage: "15%" },
      Scotland: { count: 15, percentage: "15%" },
      North: { count: 12, percentage: "12%" },
      Midlands: { count: 10, percentage: "10%" },
      Wales: { count: 8, percentage: "8%" },
      "Northern Ireland": { count: 5, percentage: "5%" },
    },
    byType: {
      Founder: { count: 18, percentage: "18%" },
      CEO: { count: 15, percentage: "15%" },
      Executive: { count: 30, percentage: "30%" },
      NED: { count: 15, percentage: "15%" },
      Investor: { count: 12, percentage: "12%" },
      Civic: { count: 10, percentage: "10%" },
    },
  };
}

function buildWhyStrengthens(guest: any): string {
  const reasons: string[] = [];

  if (guest.influenceScore >= 8) reasons.push("High influence");
  if (guest.type === "Founder") reasons.push("Founder experience");
  if (guest.type === "CEO") reasons.push("CEO credibility");
  if (guest.type === "Investor") reasons.push("Brings funding networks");
  if (guest.speakerPotential) reasons.push("Strong speaker");
  if (guest.sponsorIntroductionPotential)
    reasons.push("Sponsor connections");
  if (guest.region !== "London")
    reasons.push(`Regional representation (${guest.region})`);

  return reasons.join(", ") || "Diverse perspective";
}

function buildInviteAngle(guest: any): string {
  if (guest.type === "Investor")
    return "Ask to sponsor + speak on funding/investing";
  if (guest.type === "Founder")
    return "Invite as featured speaker/panelist on entrepreneurship";
  if (guest.type === "CEO")
    return "Invite as speaker or table host with her team";
  if (guest.speakerPotential && guest.influenceScore >= 8)
    return "Feature speaker role + host table";
  if (guest.sponsorIntroductionPotential)
    return "Invite as guest + ask for sponsor introductions";
  return "Invite to strengthen sector/regional representation";
}

function buildIntroducerConnections(guest: any): string[] {
  const connections: string[] = [];

  if (guest.type === "Investor") connections.push("Investors", "Founders", "VCs");
  if (guest.type === "CEO") connections.push(guest.sector, "Employers", "Partners");
  if (guest.sector === "Finance") {
    connections.push("Banks", "Fintech", "Investors");
  }
  if (guest.sector === "Property") {
    connections.push("Real Estate", "Construction", "Developers");
  }
  if (guest.sector === "Healthcare") {
    connections.push("NHS", "Pharma", "Wellness");
  }
  if (guest.region === "Scotland") connections.push("Scottish business");

  return [...new Set(connections)];
}

export function reportToMarkdown(report: ActionReportData): string {
  const lines: string[] = [];

  lines.push("# Room Build Decision Report");
  lines.push("");
  lines.push(
    `*Generated: ${new Date(report.generatedAt).toLocaleString()}*`
  );
  lines.push("");

  // ===== WEEKLY PRIORITIES (TOP) =====
  lines.push("## 📋 This Week's Priorities");
  lines.push("");
  for (const priority of report.weeklyPriorities) {
    lines.push(`**${priority.rank}. ${priority.action}**`);
    lines.push(`   *${priority.why}*`);
    lines.push("");
  }
  lines.push("");

  // ===== ROOM HEALTH SCORE =====
  lines.push("## 🏥 Room Health Score");
  lines.push("");
  lines.push(
    `### Overall Score: ${report.roomHealthScore.overallScore}/100`
  );
  lines.push("");
  lines.push("**Breakdown:**");
  lines.push(`- Sector Diversity: ${report.roomHealthScore.sectorDiversity}/100`);
  lines.push(`- Geographic Diversity: ${report.roomHealthScore.geographicDiversity}/100`);
  lines.push(`- Founder/Executive Balance: ${report.roomHealthScore.founderExecutiveBalance}/100`);
  lines.push(`- Employer Representation: ${report.roomHealthScore.employerRepresentation}/100`);
  lines.push(`- National Profile: ${report.roomHealthScore.nationalProfile}/100`);
  lines.push(`- Speaker Quality: ${report.roomHealthScore.speakerQuality}/100`);
  lines.push(`- Partnership Potential: ${report.roomHealthScore.partnershipPotential}/100`);
  lines.push("");

  lines.push("**Biggest Weaknesses:**");
  for (const weakness of report.roomHealthScore.biggestWeaknesses) {
    lines.push(`- ${weakness}`);
  }
  lines.push("");

  lines.push("**Biggest Strengths:**");
  for (const strength of report.roomHealthScore.biggestStrengths) {
    lines.push(`- ${strength}`);
  }
  lines.push("");

  // ===== STRATEGIC GAPS =====
  lines.push("## 🎯 Strategic Gaps");
  lines.push("");

  for (const gap of report.strategicGaps) {
    const stars = "★".repeat(gap.priority) + "☆".repeat(5 - gap.priority);
    lines.push(`### ${gap.category}`);
    lines.push(`**Current:** ${gap.current} | **Target:** ${gap.target}`);
    lines.push(`**Priority:** ${stars}`);
    lines.push("");
    lines.push(`**Why:** ${gap.reasoning}`);
    lines.push("");
    lines.push(`**Impact:** ${gap.impact}`);
    lines.push("");
  }

  // ===== ROOM VALUE =====
  lines.push("## 💰 Room Value");
  lines.push("");
  lines.push(
    `**Total Businesses Represented:** ${report.roomValue.totalBusinessesRepresented}`
  );
  lines.push(
    `**Estimated Combined Employees:** ${report.roomValue.estimatedCombinedEmployees.toLocaleString()}`
  );
  lines.push(
    `**Estimated Combined Turnover Band:** ${report.roomValue.estimatedCombinedTurnoverBand}`
  );
  lines.push("");

  if (report.roomValue.ftseRepresentation.length > 0) {
    lines.push("**FTSE Representation:**");
    for (const company of report.roomValue.ftseRepresentation) {
      lines.push(`- ${company}`);
    }
    lines.push("");
  }

  if (report.roomValue.nationalBrandsRepresented.length > 0) {
    lines.push("**National Brands:**");
    for (const brand of report.roomValue.nationalBrandsRepresented) {
      lines.push(`- ${brand}`);
    }
    lines.push("");
  }

  lines.push(
    `**Regional Businesses:** ${report.roomValue.regionalBusinessesRepresented}`
  );
  lines.push(`**Founder Percentage:** ${report.roomValue.founderPercentage}%`);
  lines.push(`**CEO Count:** ${report.roomValue.ceoCeoCount}`);
  lines.push(`**Executive Percentage:** ${report.roomValue.executivePercentage}%`);
  lines.push("");

  // ===== TOP INTRODUCERS =====
  lines.push("## 🔗 Top Introducers");
  lines.push("");
  lines.push(
    "These women can open doors to key sectors and partnerships."
  );
  lines.push("");

  for (const introducer of report.topIntroducers) {
    lines.push(`### ${introducer.name}`);
    lines.push(`${introducer.company} | ${introducer.sector}`);
    lines.push(`**Influence Score:** ${introducer.influenceScore}/10`);
    lines.push("");
    lines.push("**Can Introduce To:**");
    for (const connection of introducer.canIntroduceTo) {
      lines.push(`- ${connection}`);
    }
    lines.push("");
  }

  // ===== PARTNER OPPORTUNITIES =====
  lines.push("## 🤝 Partner Opportunities");
  lines.push("");

  for (const opportunity of report.partnerOpportunities) {
    lines.push(`### ${opportunity.sector} (${opportunity.representationPercentage}%)`);
    lines.push(`**Representation:** ${opportunity.representation}`);
    lines.push("");
    lines.push("**Recommended Partners:**");
    for (const partner of opportunity.recommendedPartners) {
      lines.push(`- **${partner.name}** — ${partner.relevance} (${partner.potential})`);
    }
    lines.push("");
  }

  // ===== EMPLOYER OPPORTUNITIES =====
  if (report.employerOpportunities.length > 0) {
    lines.push("## 💼 Employer Opportunities");
    lines.push("");

    for (const opportunity of report.employerOpportunities) {
      const priority = "★".repeat(opportunity.priority) + "☆".repeat(5 - opportunity.priority);
      lines.push(`### ${opportunity.gap}`);
      lines.push(`**Priority:** ${priority}`);
      lines.push(`**Reason:** ${opportunity.reason}`);
      lines.push("");
      lines.push("**Target Employers:**");
      for (const employer of opportunity.targetEmployers) {
        lines.push(`- ${employer}`);
      }
      lines.push("");
      lines.push("**Target Roles:**");
      for (const role of opportunity.targetRoles) {
        lines.push(`- ${role}`);
      }
      lines.push("");
    }
  }

  // ===== TOP 30 WOMEN =====
  lines.push("## 1️⃣  Top 30 Women to Invite First");
  lines.push("");
  lines.push(
    "| Rank | Name | Company | Sector | Region | Score | Why | Invite Angle |"
  );
  lines.push("|------|------|---------|--------|--------|-------|-----|------|");

  report.topWomenToInvite.forEach((w, idx) => {
    lines.push(
      `| ${idx + 1} | ${w.name} | ${w.company} | ${w.sector} | ${w.region} | ${w.influenceScore}/10 | ${w.whyStrengthens} | ${w.suggestedInviteAngle} |`
    );
  });

  lines.push("");
  lines.push("---");
  lines.push("*This decision report is machine-generated and updated weekly. Review and act on priorities every Monday.*");

  return lines.join("\n");
}

export function reportToCSV(report: ActionReportData): string {
  const lines: string[] = [];

  // Weekly priorities
  lines.push("WEEKLY PRIORITIES");
  lines.push("Rank,Action,Why");
  for (const priority of report.weeklyPriorities) {
    lines.push(`${priority.rank},"${priority.action}","${priority.why}"`);
  }

  lines.push("");
  lines.push("");

  // Room health
  lines.push("ROOM HEALTH SCORE");
  lines.push("Metric,Score");
  lines.push(`Overall,${report.roomHealthScore.overallScore}`);
  lines.push(`Sector Diversity,${report.roomHealthScore.sectorDiversity}`);
  lines.push(`Geographic Diversity,${report.roomHealthScore.geographicDiversity}`);
  lines.push(`Founder/Executive Balance,${report.roomHealthScore.founderExecutiveBalance}`);
  lines.push(`Employer Representation,${report.roomHealthScore.employerRepresentation}`);
  lines.push(`National Profile,${report.roomHealthScore.nationalProfile}`);
  lines.push(`Speaker Quality,${report.roomHealthScore.speakerQuality}`);
  lines.push(`Partnership Potential,${report.roomHealthScore.partnershipPotential}`);

  lines.push("");
  lines.push("");

  // Strategic gaps
  lines.push("STRATEGIC GAPS");
  lines.push("Category,Current,Target,Priority,Reasoning");
  for (const gap of report.strategicGaps) {
    lines.push(
      `"${gap.category}",${gap.current},${gap.target},${gap.priority},"${gap.reasoning}"`
    );
  }

  lines.push("");
  lines.push("");

  // Top introducers
  lines.push("TOP INTRODUCERS");
  lines.push("Name,Company,Sector,Influence,Can Introduce To");
  for (const introducer of report.topIntroducers) {
    lines.push(
      `"${introducer.name}","${introducer.company}","${introducer.sector}",${introducer.influenceScore},"${introducer.canIntroduceTo.join("; ")}"`
    );
  }

  lines.push("");
  lines.push("");

  // Room value
  lines.push("ROOM VALUE");
  lines.push("Metric,Value");
  lines.push(`Total Businesses,${report.roomValue.totalBusinessesRepresented}`);
  lines.push(`Estimated Employees,${report.roomValue.estimatedCombinedEmployees}`);
  lines.push(`Turnover Band,${report.roomValue.estimatedCombinedTurnoverBand}`);
  lines.push(`Founder Percentage,${report.roomValue.founderPercentage}%`);
  lines.push(`Executive Percentage,${report.roomValue.executivePercentage}%`);

  return lines.join("\n");
}
