// 12 Email Templates: UK + Nigeria × 6 trigger types
// Trigger types: anniversary | end_of_year | product_launch | award_ceremony | office_opening | ipo_funding

export type TriggerType = "anniversary" | "end_of_year" | "product_launch" | "award_ceremony" | "office_opening" | "ipo_funding" | "celebration" | "general";
export type CountryRegion = "UK" | "Nigeria";

interface EmailTemplate {
  subject: string;
  body: string;
}

export interface SenderProfile {
  region: string;
  from_email: string;
  sender_name: string;
  sender_title: string;
  company_name: string;
  website: string;
  signature_block: string;
}

// Map milestone_type → trigger category
export function mapMilestoneToTrigger(milestoneType: string): TriggerType {
  const m = milestoneType?.toLowerCase() || "";
  if (m.includes("anniversary")) return "anniversary";
  if (m.includes("end_of_year") || m.includes("christmas") || m.includes("year")) return "end_of_year";
  if (m.includes("product") || m.includes("launch") || m.includes("opening")) return "product_launch";
  if (m.includes("award") || m.includes("celebration") || m.includes("ceremony")) return "award_ceremony";
  if (m.includes("office")) return "office_opening";
  if (m.includes("ipo") || m.includes("funding") || m.includes("invest")) return "ipo_funding";
  return "general";
}

// Determine country region from country string
export function getCountryRegion(country: string | null): CountryRegion {
  const c = (country || "").toLowerCase().trim();
  if (["nigeria", "ng", "ngr", "lagos", "abuja"].includes(c)) return "Nigeria";
  return "UK"; // Default to UK
}

function getTemplate(trigger: TriggerType, region: CountryRegion): EmailTemplate {
  const templates: Record<string, EmailTemplate> = {

    // ─── ANNIVERSARY ───
    "anniversary_UK": {
      subject: "[Company]'s [N]th anniversary — marking it properly",
      body: `Dear [FirstName],

[Company] has been building something genuinely significant for [N] years. That kind of milestone tends to arrive quietly — and the organisations that mark it well are the ones that take a moment to reflect on the journey before pressing forward again.

At Event Perfekt we specialise in helping companies at exactly this point. We've spent 15 years delivering milestone events for corporate and public sector clients across London and the UK — from intimate leadership celebrations to large-scale anniversary galas. What we bring isn't just logistics. It's the ability to shape an experience that actually reflects who you are and what you've built.

We work with a small number of clients at any one time so that every event gets the attention it deserves. We'd genuinely love to hear what you're thinking for this year and bring some ideas to the table.

Would you be open to a brief conversation?`,
    },
    "anniversary_Nigeria": {
      subject: "[N] years of [Company] — this deserves to be celebrated properly",
      body: `Dear [FirstName],

[N] years in business in Nigeria is a real achievement. The landscape is tough, the journey is rarely straightforward, and the companies that make it to [N] years have earned the right to celebrate — properly, not just on paper.

At Event Perfekt we've been delivering corporate events across Lagos, Abuja, and the UK for 15 years. We understand the Nigerian business environment, we understand what it means to gather the right people in the right room, and we know how to create an evening that your team, your clients, and your partners will talk about long after the night is over.

We're not a template company. Every event we plan starts with understanding what this milestone means to the people involved — and building something around that. We'd love to hear about [Company] and what you'd want this celebration to feel like.

Can we find a time to speak this week?`,
    },

    // ─── END OF YEAR ───
    "end_of_year_UK": {
      subject: "December — is your celebration in hand?",
      body: `Dear [FirstName],

The best venues in London for end of year events are already taking bookings for Q4. It sounds early but the companies that plan ahead are the ones whose teams leave the December party still talking about it in January — rather than wondering why the room felt like an afterthought.

Event Perfekt has been delivering end of year celebrations for corporate clients across London for 15 years. We've learned that what makes these events land isn't the budget — it's the intention behind them. When a team feels genuinely valued, that carries into the new year in ways that matter to your business.

We handle everything from venue sourcing to the moment the last guest leaves, so you don't carry the weight of it. We'd love to understand what your team deserves this December and bring some ideas to you.

Would a conversation this week work?`,
    },
    "end_of_year_Nigeria": {
      subject: "December in Lagos — let's plan something your team deserves",
      body: `Dear [FirstName],

End of year season in Lagos arrives faster than most companies expect. The venues that create the right atmosphere are already receiving enquiries, and the events that feel special in December are the ones that were thought about in August — not the ones pulled together in November.

At Event Perfekt we've been helping organisations across Lagos and Abuja deliver end of year celebrations that their teams genuinely look forward to. We understand that in Nigeria, how you bring people together says something about how you value them. The room, the food, the atmosphere, the way the evening flows — all of it communicates something to your staff and your clients.

We'd love to hear what you're envisioning for December and help you build something around it. No pressure — just a conversation with people who care about getting these things right.

Can we speak this week?`,
    },

    // ─── PRODUCT LAUNCH ───
    "product_launch_UK": {
      subject: "[Company]'s launch — the event should match the ambition",
      body: `Dear [FirstName],

A product launch is one of the most important moments in a company's calendar. It's the first time the market, the press, and your own team see what you've been building — and the experience of that moment shapes how the story gets told afterwards.

Event Perfekt has spent 15 years delivering launch events for corporate and commercial clients across the UK. We understand that a great launch isn't just a nice evening — it's a strategic moment. The venue, the flow, the atmosphere, the way your product is presented — everything should be working together to reinforce the message you're putting into the world.

We'd love to understand what [Company]'s launch means and what you want people to feel when they leave the room. That's always where we start.

Would you be open to a conversation?`,
    },
    "product_launch_Nigeria": {
      subject: "Your launch deserves an event that the market remembers",
      body: `Dear [FirstName],

Bringing a new product or service to the Nigerian market is a significant moment — and the companies that make an impression at launch tend to do so because the event itself reflected the quality of what they were putting forward.

At Event Perfekt we've delivered product launch events across Lagos, Abuja, and internationally. We understand the importance of getting the right people in the room, creating an atmosphere that generates conversation, and making sure that what's being launched is what everyone remembers when they walk out.

We'd love to hear about what [Company] is bringing to market and how we might help make the launch moment something that sets the right tone from day one.

Can we find time to speak?`,
    },

    // ─── AWARD CEREMONY ───
    "award_ceremony_UK": {
      subject: "Awards season — is [Company] hosting anything this year?",
      body: `Dear [FirstName],

For companies that operate at the level [Company] does, awards season isn't just about being nominated or winning — it's an opportunity to bring the right people together, reinforce your position in the industry, and create an evening that people associate with your name.

Event Perfekt has been delivering award ceremonies, industry receptions, and private dinners for corporate clients across London for 15 years. We know how to create the kind of environment where relationships deepen and reputations are built — not just a room with a trophy at the end.

If you're thinking about hosting a reception, a dinner, or a full ceremony this season we'd love to be part of the conversation early. The events that land well are always the ones that were planned with intention.

Would a brief call make sense?`,
    },
    "award_ceremony_Nigeria": {
      subject: "Awards season in Nigeria — is [Company] marking it?",
      body: `Dear [FirstName],

Award season in Nigeria is one of the strongest moments in the corporate calendar to bring clients, partners, and stakeholders together. The companies that use it well don't just attend other people's events — they host their own, and those evenings become part of how they're known in the market.

At Event Perfekt we've delivered corporate receptions and award ceremonies for clients across Lagos and Abuja. We understand the Nigerian corporate landscape and we know what it takes to create an evening that reflects well on the organisation behind it.

If [Company] is thinking about marking this season with something of your own we'd genuinely love to hear about it and bring some ideas to you.

Can we speak this week?`,
    },

    // ─── OFFICE OPENING ───
    "office_opening_UK": {
      subject: "[Company]'s new [city] office — marking it properly",
      body: `Dear [FirstName],

Opening a new office is one of those milestones that can either pass quietly or become a moment your clients, partners, and team actually remember. The companies that use it well treat it as an opportunity — a reason to bring the right people into the room and let them see where things are going.

Event Perfekt has spent 15 years delivering opening events, client receptions, and corporate celebrations across London and the UK. We know how to create an experience that feels like a genuine occasion rather than an obligation — one that leaves people feeling connected to what you're building.

We'd love to hear about the new space and what you'd want the opening to feel like. That's always where the best events start.

Would you be open to a conversation?`,
    },
    "office_opening_Nigeria": {
      subject: "The new [Company] office — let's open it properly",
      body: `Dear [FirstName],

A new office in Lagos or Abuja is a statement. It tells your clients, your team, and the market that you're growing, you're committed, and you're here for the long term. How you mark that opening moment says something too — and the organisations that do it well use it as a chance to bring the right people together and deepen the relationships that matter.

At Event Perfekt we've delivered opening receptions and corporate celebrations across Lagos, Abuja, and internationally. We understand what it means to create an evening that feels considered, not rushed.

We'd love to hear about [Company]'s new space and help you think through what the opening should feel like.

Can we find a time to speak?`,
    },

    // ─── IPO / FUNDING ───
    "ipo_funding_UK": {
      subject: "Congratulations on the raise — this deserves a proper celebration",
      body: `Dear [FirstName],

Closing a funding round at this level takes everything a team has. The late nights, the conversations that almost didn't happen, the belief required to get to yes — that deserves to be marked in a way that lets everyone involved actually feel it.

Event Perfekt has been delivering milestone celebrations for corporate and commercial clients across London for 15 years. We've helped companies mark funding rounds, IPOs, and major growth moments in ways that bring investors, teams, and stakeholders together in one room and create a memory that lasts longer than the announcement.

We'd love to understand what this moment means to [Company] and help you celebrate it properly. These occasions don't come around often — they're worth getting right.

Would a brief conversation make sense?`,
    },
    "ipo_funding_Nigeria": {
      subject: "[Company]'s funding round — congratulations, and a thought",
      body: `Dear [FirstName],

Securing investment at this level in Nigeria is a genuine achievement. It reflects the confidence your investors have in what you're building — and that kind of confidence deserves to be celebrated in a way that brings the right people together and marks the moment properly.

At Event Perfekt we've delivered celebration events for corporate clients across Lagos, Abuja, and the UK. We understand that in Nigeria, gathering your investors, your team, and your partners in the right environment is also a signal to the market — and we know how to make that gathering feel like the occasion it is.

We'd love to speak with someone at [Company] about marking this milestone. A brief conversation is all it takes to get started.

Can we find a time this week?`,
    },

    // ─── GENERAL (fallback) ───
    "general_UK": {
      subject: "Event Perfekt — making your next event truly perfekt",
      body: `Dear [FirstName],

I came across [Company] recently and wanted to reach out. For [sector] organisations at your stage, having a trusted event partner makes a genuine difference — whether it's a client reception, a team celebration, or a major launch moment.

At Event Perfekt we've been delivering high-quality corporate events across London and the UK for 15 years. We work with a small number of clients at any one time so that every event gets the attention it deserves.

We'd love to hear what you have coming up and see if there's a fit.

Would a brief conversation this week work?`,
    },
    "general_Nigeria": {
      subject: "Event Perfekt — your events partner in Nigeria and the UK",
      body: `Dear [FirstName],

I wanted to reach out to you directly at [Company]. At Event Perfekt we've been delivering corporate events across Lagos, Abuja, and the UK for 15 years — and we're always looking to work with [sector] organisations that care about getting these moments right.

Whether it's a client reception, an end-of-year celebration, or a major launch, we handle everything so you don't have to. We'd love to hear what you have coming up.

Can we find a time to speak this week?`,
    },
  };

  const key = `${trigger}_${region}`;
  return templates[key] || templates[`general_${region}`] || templates["general_UK"];
}

export function personaliseEmail(
  template: EmailTemplate,
  vars: {
    firstName: string;
    company: string;
    years?: number | null;
    sector?: string | null;
    city?: string | null;
    milestoneDetail?: string | null;
  }
): { subject: string; body: string } {
  const replacements: Record<string, string> = {
    "[FirstName]": vars.firstName || "there",
    "[Company]": vars.company,
    "[N]": vars.years ? String(vars.years) : "[N]",
    "[N]th": vars.years ? `${vars.years}th` : "[N]th",
    "[sector]": vars.sector || "your industry",
    "[city]": vars.city || "your city",
  };

  let subject = template.subject;
  let body = template.body;

  for (const [placeholder, value] of Object.entries(replacements)) {
    subject = subject.replaceAll(placeholder, value);
    body = body.replaceAll(placeholder, value);
  }

  return { subject, body };
}

export function buildEmailWithSender(
  subject: string,
  body: string,
  sender: SenderProfile
): { subject: string; fullBody: string } {
  const fullBody = `${body}\n\n${sender.signature_block}`;
  return { subject, fullBody };
}

export { getTemplate };
