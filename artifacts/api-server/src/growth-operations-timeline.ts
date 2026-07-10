/**
 * Activity Timeline & Relationships
 * Unified operations view for growth platform
 */

export interface ActivityEntry {
  id: string;
  timestamp: string;
  type: "guest_added" | "guest_invited" | "guest_confirmed" | "guest_paid" | "org_contacted" | "org_committed" | "partner_proposal" | "partner_committed" | "note_added" | "meeting_scheduled";
  title: string;
  description: string;
  relatedTo: {
    type: "guest" | "organisation" | "partner";
    id: string;
    name: string;
  };
  priority: "high" | "medium" | "low";
}

export interface TodayAction {
  id: string;
  action: string;
  priority: "urgent" | "high" | "medium";
  relatedTo: {
    type: "guest" | "organisation" | "partner";
    id: string;
    name: string;
  };
  dueDate: string;
  reason: string;
}

export interface Relationship {
  type: "works_at" | "introduced_by" | "can_introduce" | "potential_sponsor" | "potential_partner" | "investor" | "speaker" | "employer";
  relatedEntity: {
    type: "guest" | "organisation" | "partner";
    id: string;
    name: string;
    sector?: string;
  };
  strength: number; // 1-10
  notes?: string;
}

// In-memory activity log (in production, would be database)
const activityLog: ActivityEntry[] = [
  {
    id: "act1",
    timestamp: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    type: "guest_added",
    title: "Anne Boden added",
    description: "Starling CEO added to guest database",
    relatedTo: { type: "guest", id: "1", name: "Anne Boden" },
    priority: "high",
  },
  {
    id: "act2",
    timestamp: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    type: "guest_invited",
    title: "Debbie Wosskow invited",
    description: "Founders Factory CEO invited to event",
    relatedTo: { type: "guest", id: "2", name: "Debbie Wosskow" },
    priority: "high",
  },
  {
    id: "act3",
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    type: "org_contacted",
    title: "Barclays meeting request sent",
    description: "Initial partnership proposal sent to Barclays sponsorship team",
    relatedTo: { type: "organisation", id: "org1", name: "Barclays" },
    priority: "high",
  },
];

export function getTodayActions(guests: any[], organisations: any[], partners: any[]): TodayAction[] {
  const actions: TodayAction[] = [];
  const today = new Date().toDateString();

  // High-priority guests not yet invited
  const topWomen = guests
    .filter(g => g.status === "Identified" && g.invitePriority === "A")
    .sort((a, b) => b.influenceScore - a.influenceScore)
    .slice(0, 3);

  for (const woman of topWomen) {
    actions.push({
      id: `action-invite-${woman.id}`,
      action: `Invite ${woman.name}`,
      priority: "urgent",
      relatedTo: { type: "guest", id: woman.id, name: woman.name },
      dueDate: new Date().toISOString(),
      reason: `${woman.type} at ${woman.company}, influence score ${woman.influenceScore}/10`,
    });
  }

  // Overdue follow-ups
  const today_date = new Date();
  const overdueFolowUps = organisations.filter(o => {
    if (!o.nextAction || !o.followUpDate) return false;
    return new Date(o.followUpDate) <= today_date && o.status !== "Committed" && o.status !== "Declined";
  });

  for (const org of overdueFolowUps.slice(0, 2)) {
    actions.push({
      id: `action-followup-${org.id}`,
      action: `Follow up: ${org.name}`,
      priority: "high",
      relatedTo: { type: "organisation", id: org.id, name: org.name },
      dueDate: org.followUpDate,
      reason: `Status: ${org.status}. Next action: ${org.nextAction}`,
    });
  }

  // Critical gaps to source
  const hasLowInvestors = guests.filter(g => g.type === "Investor").length < 3;
  if (hasLowInvestors) {
    actions.push({
      id: "action-source-investors",
      action: "Source 2-3 investors",
      priority: "urgent",
      relatedTo: { type: "partner", id: "gap-investors", name: "Investor sourcing" },
      dueDate: new Date().toISOString(),
      reason: "Only 2 investors identified. Critical for room credibility.",
    });
  }

  // Partner proposals pending
  const pendingProposals = partners.filter(p => p.status === "In Discussion" && !p.proposalSent);
  for (const partner of pendingProposals.slice(0, 1)) {
    actions.push({
      id: `action-proposal-${partner.id}`,
      action: `Send proposal: ${partner.name}`,
      priority: "high",
      relatedTo: { type: "partner", id: partner.id, name: partner.name },
      dueDate: new Date().toISOString(),
      reason: `${partner.whatTheyBring} - estimated value ${partner.estimatedValue}`,
    });
  }

  return actions.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2 };
    return priorityOrder[a.priority as keyof typeof priorityOrder] - 
           priorityOrder[b.priority as keyof typeof priorityOrder];
  });
}

export function getActivityTimeline(guests: any[], organisations: any[], partners: any[]): ActivityEntry[] {
  // Combine all activities from all entities
  const activities: ActivityEntry[] = [...activityLog];

  // Add recent guest activities
  const recentGuests = guests
    .filter(g => g.status !== "Identified" && g.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  for (const guest of recentGuests) {
    activities.push({
      id: `timeline-guest-${guest.id}`,
      timestamp: guest.updatedAt || guest.createdAt,
      type: guest.status === "Invited" ? "guest_invited" : guest.status === "Confirmed" ? "guest_confirmed" : "guest_added",
      title: `${guest.name} - ${guest.status}`,
      description: `${guest.name} (${guest.company}) status updated to ${guest.status}`,
      relatedTo: { type: "guest", id: guest.id, name: guest.name },
      priority: guest.invitePriority === "A" ? "high" : "medium",
    });
  }

  // Add recent org activities
  const recentOrgs = organisations
    .filter(o => o.status !== "Prospect")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  for (const org of recentOrgs) {
    activities.push({
      id: `timeline-org-${org.id}`,
      timestamp: org.updatedAt,
      type: org.status === "Committed" ? "org_committed" : "org_contacted",
      title: `${org.name} - ${org.status}`,
      description: `Partnership with ${org.name} (${org.partnerType}) - ${org.status}`,
      relatedTo: { type: "organisation", id: org.id, name: org.name },
      priority: org.status === "Committed" ? "high" : "medium",
    });
  }

  // Sort by timestamp descending
  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function buildRelationships(guest: any, guests: any[], organisations: any[], partners: any[]): Relationship[] {
  const relationships: Relationship[] = [];

  // Works at (organisation)
  if (guest.company) {
    relationships.push({
      type: "works_at",
      relatedEntity: {
        type: "organisation",
        name: guest.company,
        sector: guest.sector,
      },
      strength: 10,
      notes: `${guest.type} at ${guest.company}`,
    } as any);
  }

  // Can introduce to
  if (guest.speakerPotential) {
    relationships.push({
      type: "can_introduce",
      relatedEntity: {
        type: "partner",
        name: "Speaker opportunities",
      },
      strength: 8,
      notes: `Strong speaker potential (${guest.influenceScore}/10)`,
    } as any);
  }

  if (guest.sponsorIntroductionPotential) {
    relationships.push({
      type: "can_introduce",
      relatedEntity: {
        type: "partner",
        name: "Sponsor introductions",
      },
      strength: 8,
      notes: `Can introduce sponsors in ${guest.sector}`,
    } as any);
  }

  // Potential sponsor (if investor)
  if (guest.type === "Investor") {
    relationships.push({
      type: "potential_sponsor",
      relatedEntity: {
        type: "partner",
        name: `Investor networks in ${guest.sector}`,
      },
      strength: 9,
      notes: "Brings investor credibility and funding networks",
    } as any);
  }

  // Similar sector connections
  const sameSectorGuests = guests.filter(
    g => g.sector === guest.sector && g.id !== guest.id && g.type !== guest.type
  );

  if (sameSectorGuests.length > 0) {
    relationships.push({
      type: "works_at",
      relatedEntity: {
        type: "guest",
        name: `${sameSectorGuests.length} other ${guest.sector} leaders`,
      },
      strength: 6,
      notes: `Potential collaborators in ${guest.sector}`,
    } as any);
  }

  return relationships;
}
