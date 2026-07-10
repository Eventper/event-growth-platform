/**
 * Intelligence Recommendation Engine
 * Analyzes guest data and provides strategic recommendations
 */

export interface GuestAnalytics {
  total: number;
  byType: Record<string, number>;
  bySector: Record<string, number>;
  byRegion: Record<string, number>;
  topInfluencers: Array<{
    name: string;
    company: string;
    sector: string;
    score: number;
  }>;
}

export interface Recommendation {
  category: "Gap" | "Opportunity" | "Imbalance" | "Action";
  severity: "Critical" | "High" | "Medium" | "Low";
  title: string;
  description: string;
  recommendation: string;
  targetCount?: number;
  currentCount?: number;
}

export function generateRecommendations(guests: any[]): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Analyze by type
  const byType: Record<string, number> = {};
  const typeNames = ["Founder", "CEO", "Executive", "NED", "Investor", "Civic"];
  for (const type of typeNames) {
    byType[type] = guests.filter(g => g.type === type).length;
  }

  // Analyze by sector
  const bySector: Record<string, number> = {};
  for (const guest of guests) {
    bySector[guest.sector] = (bySector[guest.sector] || 0) + 1;
  }

  // Analyze by region
  const byRegion: Record<string, number> = {};
  for (const guest of guests) {
    byRegion[guest.region] = (byRegion[guest.region] || 0) + 1;
  }

  const total = guests.length;

  // ===== GAP ANALYSIS =====

  // Investors - critical for sponsorship
  if (byType["Investor"] < 3) {
    recommendations.push({
      category: "Gap",
      severity: "Critical",
      title: "Investor representation critically low",
      description: `Only ${byType["Investor"]} investors identified. Investors bring networks and funding opportunities.`,
      recommendation: `Target 5-8 investors. Sources: BVCA members, angel networks, VC founders.`,
      currentCount: byType["Investor"],
      targetCount: 8,
    });
  }

  // CEOs - key speakers and influencers
  if (byType["CEO"] < 8) {
    recommendations.push({
      category: "Gap",
      severity: "High",
      title: "CEO representation below ideal",
      description: `Only ${byType["CEO"]} CEOs identified. CEOs are natural speakers and sponsors.`,
      recommendation: `Target 10-12 CEOs across sectors. Focus on FTSE, scale-ups, and founded companies.`,
      currentCount: byType["CEO"],
      targetCount: 12,
    });
  }

  // Founders
  if (byType["Founder"] < 10) {
    recommendations.push({
      category: "Gap",
      severity: "High",
      title: "Founder representation below target",
      description: `Only ${byType["Founder"]} founders identified. Founders bring authentic leadership stories.`,
      recommendation: `Target 15-20 founders. Source: Scale-ups, fast-growth companies, sector leaders.`,
      currentCount: byType["Founder"],
      targetCount: 20,
    });
  }

  // ===== SECTOR ANALYSIS =====

  // Over-representation (>20%)
  const overRepresented = Object.entries(bySector)
    .filter(([_, count]) => (count / total) * 100 > 20)
    .map(([sector, count]) => ({
      sector,
      count,
      percentage: Math.round((count / total) * 100),
    }));

  for (const { sector, count, percentage } of overRepresented) {
    recommendations.push({
      category: "Imbalance",
      severity: "Medium",
      title: `${sector} is overrepresented (${percentage}%)`,
      description: `${count} women in ${sector} — consider pausing sourcing to balance room diversity.`,
      recommendation: `Pause new sourcing in ${sector}. Focus on underrepresented sectors.`,
      currentCount: count,
    });
  }

  // Under-representation (<5%)
  const underRepresented = Object.entries(bySector)
    .filter(([_, count]) => (count / total) * 100 < 5)
    .map(([sector, count]) => ({
      sector,
      count,
      percentage: Math.round((count / total) * 100),
    }));

  for (const { sector, count, percentage } of underRepresented) {
    recommendations.push({
      category: "Gap",
      severity: "High",
      title: `${sector} severely underrepresented (${percentage}%)`,
      description: `Only ${count} women in ${sector}. Room lacks diverse sector representation.`,
      recommendation: `Source 3-5 leaders in ${sector}. Essential for room balance.`,
      currentCount: count,
      targetCount: 5,
    });
  }

  // ===== REGIONAL ANALYSIS =====

  // London over-representation
  const londonCount = byRegion["London"] || 0;
  const londonPct = Math.round((londonCount / total) * 100);
  if (londonPct > 60) {
    recommendations.push({
      category: "Imbalance",
      severity: "Medium",
      title: `London dominates guest list (${londonPct}%)`,
      description: `${londonCount} of ${total} guests are London-based. Event feels London-centric.`,
      recommendation: `Increase regional representation. Target Scotland, North, Midlands, Wales to reach 20-25% each.`,
      currentCount: londonCount,
    });
  }

  // Regional gaps
  const scottishCount = byRegion["Scotland"] || 0;
  const welsCount = byRegion["Wales"] || 0;
  const niCount = byRegion["Northern Ireland"] || 0;

  if (scottishCount < 2) {
    recommendations.push({
      category: "Gap",
      severity: "High",
      title: "Scotland severely underrepresented",
      description: `Only ${scottishCount} Scottish leader identified. Missing major market.`,
      recommendation: `Add 2-3 Scottish leaders. Source: LECs, female founder networks.`,
      currentCount: scottishCount,
      targetCount: 3,
    });
  }

  if (welsCount < 1) {
    recommendations.push({
      category: "Gap",
      severity: "Medium",
      title: "Wales unrepresented",
      description: `No Welsh leaders identified yet.`,
      recommendation: `Add 1-2 Welsh leaders to ensure UK representation.`,
      currentCount: welsCount,
      targetCount: 2,
    });
  }

  if (niCount < 1) {
    recommendations.push({
      category: "Gap",
      severity: "Low",
      title: "Northern Ireland unrepresented",
      description: `No Northern Irish leaders identified.`,
      recommendation: `Optional: Add 1 Northern Irish leader if possible.`,
      currentCount: niCount,
      targetCount: 1,
    });
  }

  // ===== OPPORTUNITIES =====

  // High influence guests
  const highInfluencers = guests
    .filter(g => g.influenceScore >= 8)
    .sort((a, b) => b.influenceScore - a.influenceScore)
    .slice(0, 5);

  if (highInfluencers.length > 0) {
    recommendations.push({
      category: "Opportunity",
      severity: "High",
      title: "Leverage high-influence women as ambassadors",
      description: `${highInfluencers.length} women score 8+/10 influence. They should be first to invite and sponsor.`,
      recommendation: `Prioritize inviting: ${highInfluencers.map(g => g.name).join(", ")}. They bring prestige and networks.`,
    });
  }

  // Speaker potential
  const speakers = guests.filter(g => g.speakerPotential).length;
  if (speakers >= 20) {
    recommendations.push({
      category: "Opportunity",
      severity: "Medium",
      title: `${speakers} women have strong speaker potential`,
      description: `${speakers} guests could deliver talks, panels, or mentoring sessions.`,
      recommendation: `Build speaker program. Rotate 3-4 speakers through different topics.`,
    });
  }

  // Sponsor intro potential
  const sponsorIntros = guests.filter(g => g.sponsorIntroductionPotential).length;
  if (sponsorIntros >= 15) {
    recommendations.push({
      category: "Opportunity",
      severity: "Medium",
      title: `${sponsorIntros} women can introduce sponsors`,
      description: `${sponsorIntros} have strong sponsor intro potential due to networks.`,
      recommendation: `Ask top 10 to introduce 1-2 sponsors each. Personal intro >>> cold outreach.`,
    });
  }

  // Sort by severity
  const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return recommendations;
}

export function generateExecutiveSummary(guests: any[]): {
  headline: string;
  keyStats: string[];
  topPriorities: string[];
} {
  const total = guests.length;

  // Role breakdown
  const byType: Record<string, number> = {};
  const typeNames = ["Founder", "CEO", "Executive", "NED", "Investor", "Civic"];
  for (const type of typeNames) {
    byType[type] = guests.filter(g => g.type === type).length;
  }

  // Sector breakdown
  const bySector: Record<string, number> = {};
  for (const guest of guests) {
    bySector[guest.sector] = (bySector[guest.sector] || 0) + 1;
  }

  const topSectors = Object.entries(bySector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s, c]) => `${s} (${c})`);

  // Region breakdown
  const byRegion: Record<string, number> = {};
  for (const guest of guests) {
    byRegion[guest.region] = (byRegion[guest.region] || 0) + 1;
  }

  const regionDiversity = Object.keys(byRegion).length;

  return {
    headline: `Room composition: ${total} leaders identified, ${byType["Founder"] + byType["CEO"]} founders/CEOs, ${regionDiversity} regions represented`,
    keyStats: [
      `${byType["Founder"]} Founders, ${byType["CEO"]} CEOs, ${byType["Executive"]} Executives`,
      `Top sectors: ${topSectors.join(", ")}`,
      `Regions: ${regionDiversity} regions, ${byRegion["London"] || 0} from London`,
      `${guests.filter(g => g.speakerPotential).length} have speaker potential, ${guests.filter(g => g.sponsorIntroductionPotential).length} can intro sponsors`,
    ],
    topPriorities: [
      byType["Investor"] < 3 ? "🔴 CRITICAL: Add 5-8 investors" : "Investors: OK",
      byType["CEO"] < 8 ? "🟡 Add more CEOs" : "CEO representation: OK",
      Object.keys(bySector).length < 8 ? "🟡 Expand sector diversity" : "Sectors: Good diversity",
      byRegion["London"] / total > 0.6 ? "🟡 Reduce London concentration" : "Regional balance: OK",
    ],
  };
}
