/**
 * Guest Intelligence Scoring & Classification Engine
 * Automatically scores and classifies guests based on available data
 */

export interface ScoringResult {
  influenceScore: number;
  commercialInfluence: number;
  speakerPotential: number;
  employerInfluence: number;
  sponsorIntroductionPotential: number;
  mediaValue: number;
  overallScore: number;
}

export interface ClassificationResult {
  type: "Founder" | "CEO" | "Executive" | "NED" | "Investor" | "Civic" | "Other";
  sector: string;
  confidence: number; // 0-1
}

// Keywords for role classification
const ROLE_PATTERNS = {
  Founder: [/founder|co-founder|co founder|built|established|launched/i],
  CEO: [/^ceo|chief executive|chief exec|ceo[^o]|president/i],
  Executive: [/executive|director|managing director|md\b|head of|chief/i],
  Chair: [/chair|chairman|chairwoman/i],
  NED: [/non-executive director|ned\b|independent director/i],
  Investor: [/investor|venture|vc\b|capital|partner.*capital|fund manager|pe\b|private equity|angel/i],
  Civic: [/council|mayor|mp\b|mep\b|lord|civil service|government|public sector/i],
};

// Sector keywords
const SECTOR_KEYWORDS: Record<string, string[]> = {
  "Property/Interiors": ["property", "interiors", "real estate", "construction", "design", "architecture", "residential", "commercial building"],
  "Finance": ["bank", "banking", "finance", "financial", "fintech", "investment", "venture", "capital", "wealth", "insurance", "aviva", "admiral"],
  "Tech/SaaS": ["tech", "software", "saas", "digital", "platform", "app", "ai", "data", "cloud", "cybersecurity", "startups"],
  "Professional Services": ["law", "legal", "accountant", "accounting", "consulting", "advisory", "services"],
  "Fashion/Retail": ["fashion", "retail", "clothing", "luxury", "brand", "e-commerce", "ecommerce"],
  "Food/Hospitality": ["food", "restaurant", "hospitality", "hotel", "drink", "wine", "cafe", "dining"],
  "Creative/Media": ["creative", "media", "marketing", "pr", "communications", "tv", "film", "production"],
  "Manufacturing": ["manufacture", "manufacturing", "industrial", "product", "trade"],
  "Energy/Sustainability": ["energy", "renewable", "sustainability", "clean", "green", "solar", "wind", "utilities"],
  "Recruitment": ["recruitment", "recruitment", "hr", "human resources", "talent", "staffing"],
  "Healthcare": ["nhs", "health", "medical", "doctor", "hospital", "pharma", "pharmaceutical"],
};

export function classifyRole(roleName: string, companyName: string): ClassificationResult {
  const roleUpper = roleName.toUpperCase();
  const combined = `${roleName} ${companyName}`.toLowerCase();

  for (const [roleType, patterns] of Object.entries(ROLE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(roleUpper)) {
        return {
          type: roleType as any,
          sector: classifySector(roleName, companyName).sector,
          confidence: 0.9,
        };
      }
    }
  }

  // Fallback
  return {
    type: "Executive",
    sector: classifySector(roleName, companyName).sector,
    confidence: 0.5,
  };
}

export function classifySector(roleName: string, companyName: string): ClassificationResult {
  const combined = `${roleName} ${companyName}`.toLowerCase();

  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    for (const keyword of keywords) {
      if (combined.includes(keyword.toLowerCase())) {
        return {
          type: "Executive",
          sector,
          confidence: 0.8,
        };
      }
    }
  }

  // Fallback to generic
  return {
    type: "Executive",
    sector: "Other",
    confidence: 0.3,
  };
}

export function calculateScores(
  role: string,
  company: string,
  sector: string,
  type: string,
  reach: string,
  mediaProfile: string
): ScoringResult {
  // Base scores by type
  const typeScores: Record<string, number> = {
    Founder: 9,
    CEO: 8,
    Executive: 6,
    NED: 7,
    Investor: 8,
    Civic: 7,
    Chair: 9,
    Other: 4,
  };

  // Base score from role type
  let influenceScore = typeScores[type] || 5;

  // Boost for national/international reach
  if (reach === "National") influenceScore += 1;
  if (reach === "International") influenceScore += 2;

  // Commercial influence based on company size and sector prominence
  let commercialInfluence = influenceScore - 1;
  if (["Finance", "Tech/SaaS", "Property/Interiors"].includes(sector)) {
    commercialInfluence += 1;
  }

  // Speaker potential (CEOs, Founders, thought leaders)
  let speakerPotential = 0;
  if (["Founder", "CEO", "Chair"].includes(type)) {
    speakerPotential = 8;
  } else if (["Executive", "NED"].includes(type)) {
    speakerPotential = 6;
  } else {
    speakerPotential = 4;
  }
  if (mediaProfile.toLowerCase().includes("linkedin") || mediaProfile.toLowerCase().includes("press")) {
    speakerPotential += 1;
  }

  // Employer influence (affects sponsorship)
  let employerInfluence = influenceScore;
  if (["Finance", "Tech/SaaS", "Fashion/Retail"].includes(sector)) {
    employerInfluence += 1;
  }

  // Sponsor introduction potential (network quality)
  let sponsorIntroductionPotential = 0;
  if (["Investor", "CEO", "Founder"].includes(type)) {
    sponsorIntroductionPotential = 8;
  } else if (["Executive", "NED"].includes(type)) {
    sponsorIntroductionPotential = 6;
  } else {
    sponsorIntroductionPotential = 3;
  }

  // Media value
  let mediaValue = 0;
  if (mediaProfile.toLowerCase().includes("press") || mediaProfile.toLowerCase().includes("media")) {
    mediaValue = 7;
  } else if (type === "Founder" || type === "CEO") {
    mediaValue = 5;
  } else {
    mediaValue = 2;
  }

  // Cap all at 10
  const scores = {
    influenceScore: Math.min(10, influenceScore),
    commercialInfluence: Math.min(10, commercialInfluence),
    speakerPotential: Math.min(10, speakerPotential),
    employerInfluence: Math.min(10, employerInfluence),
    sponsorIntroductionPotential: Math.min(10, sponsorIntroductionPotential),
    mediaValue: Math.min(10, mediaValue),
  };

  const overallScore =
    (scores.influenceScore * 0.3 +
      scores.commercialInfluence * 0.2 +
      scores.speakerPotential * 0.15 +
      scores.employerInfluence * 0.15 +
      scores.sponsorIntroductionPotential * 0.15 +
      scores.mediaValue * 0.05) /
    10;

  return {
    ...scores,
    overallScore: Math.round(overallScore * 10) / 10,
  };
}
