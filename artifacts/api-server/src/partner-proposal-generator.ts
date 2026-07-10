/**
 * Partner Proposal Draft Generator
 * Generates personalized proposal emails for 5 partner types
 * Strategic Sponsor, Brand Partner, Media Partner, Employer Partner, Civic Partner
 */

export interface PartnerProposalDraft {
  toEmail: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  campaignType: string;
  partnerType: string;
  organizationName: string;
  contactName: string;
  wordCount: number;
  status: 'pending';
}

type PartnerType = 'strategic_sponsor' | 'brand_partner' | 'media_partner' | 'employer_partner' | 'civic_partner';

/**
 * Generate personalized proposal draft based on partner type
 * @param org - Organization record from Growth Hub database
 * @returns EmailDraft ready for approval queue
 */
export async function generatePartnerProposalDraft(org: any): Promise<PartnerProposalDraft> {
  try {
    const {
      name,
      sector,
      partnerType,
      contactName,
      contactRole,
      email,
      whatTheyBring,
      whatWeWant,
      whatTheyGet,
      strategicValueScore,
    } = org;

    if (!email) {
      throw new Error(`Organization ${name} has no contact email`);
    }

    if (!partnerType) {
      throw new Error(`Organization ${name} has no partner type`);
    }

    const contactFirstName = contactName ? contactName.split(' ')[0] : 'there';

    let subject = '';
    let body = '';

    // Generate email based on partner type
    switch (partnerType) {
      case 'strategic_sponsor':
        subject = `Strategic Sponsor Opportunity — The Woman Who Leads The Room`;
        body = `Hi ${contactFirstName},

I'm reaching out from Lynda Johnson's office about a strategic opportunity that aligns perfectly with ${name}'s leadership in ${sector}.

The Woman Who Leads The Room is an invitation-only event on Thursday, August 28, bringing together 100 of the UK's most influential women in business — founders, CEOs, investors, institutional leaders, and decision-makers across sectors.

We're looking for Strategic Sponsors who understand that this audience doesn't need promotional marketing. They need trusted peer conversations and genuine partnerships.

As Strategic Sponsor, you'd be positioned as the backbone of this event with meaningful access to our attendees. This isn't a standard sponsorship package — it's a partnership where your brand becomes synonymous with female leadership in business.

${name}'s track record in ${sector} makes you a natural fit. Your audience would directly benefit from the connections and conversations happening here.

Are you interested in exploring what this could look like? Let's schedule a call early next week to discuss.

Best regards,
Kynda Johnson's Team`;
        break;

      case 'brand_partner':
        subject = `Brand Partnership — The Woman Who Leads The Room`;
        body = `Hi ${contactFirstName},

${name} should be part of this conversation.

The Woman Who Leads The Room is an invitation-only event on Thursday, August 28, bringing together 100 of the UK's most influential women in business — the people shaping sectors, launching companies, and making strategic decisions.

As Brand Partner, you'd have meaningful visibility with this audience. This isn't a sponsorship package. It's a co-creation where your brand becomes synonymous with female leadership in business.

Your ${sector} positioning aligns perfectly with the caliber of women attending. We're looking for partners who want authentic alignment, not logo placement.

This is the kind of audience and story your brand needs to be connected to.

Let's explore what partnership could look like. Are you interested?

Best regards,
Kynda Johnson's Team`;
        break;

      case 'media_partner':
        subject = `Media Partnership — Exclusive Editorial Access`;
        body = `Hi ${contactFirstName},

The Woman Who Leads The Room is happening Thursday, August 28. This is the story your audience needs to hear.

Bringing together 100 of the UK's most influential women in business — founders, CEOs, investors, institutional leaders — for a conversation about bold ideas, strategic partnerships, and shaping the future.

As Media Partner, you'd have exclusive editorial access to this caliber of audience. This is real leadership, real conversations, real change — exactly the kind of authentic story that connects with your readers.

The angle is strong: What does female leadership look like at the highest level? What partnerships are being forged? What's the agenda?

Your editorial could be part of bringing this to life.

Interested in discussing the partnership?

Best regards,
Kynda Johnson's Team`;
        break;

      case 'employer_partner':
        subject = `Employer Partnership — Access to Senior Female Talent`;
        body = `Hi ${contactFirstName},

The Woman Who Leads The Room is bringing together 100 of the UK's most senior women in business — Thursday, August 28.

Founders. CEOs. Investors. Institutional leaders. Decision-makers across sectors.

If you're building teams at senior level, if you're looking for that caliber of talent, this is the network to access.

As Employer Partner, you'd connect directly with this audience through the event — not as a vendor, but as a partner in building the future.

${name}'s commitment to talent development makes you exactly the kind of partner we want involved.

This is talent sourcing redefined.

Are you interested in exploring this partnership?

Best regards,
Kynda Johnson's Team`;
        break;

      case 'civic_partner':
        subject = `Civic Partnership — The Woman Who Leads The Room`;
        body = `Hi ${contactFirstName},

${name} should champion this.

The Woman Who Leads The Room is an invitation-only event bringing together 100 of the UK's most influential women in business — Thursday, August 28.

As Civic Partner, you'd align your institution with female leadership at the highest level. This isn't just an event. It's a statement about what leadership looks like, who shapes the future, and who builds community.

Your organization's values around equity, leadership development, and institutional impact make this partnership natural.

We're looking for civic partners who understand that this kind of visibility — and this kind of network — creates real opportunity for women in business.

This is bigger than sponsorship. It's about institutional voice.

Let's discuss what partnership means. Interested?

Best regards,
Kynda Johnson's Team`;
        break;

      default:
        throw new Error(`Unknown partner type: ${partnerType}`);
    }

    // Count words
    const wordCount = body.split(/\s+/).length;

    // Validate length (max 220 words)
    if (wordCount > 220) {
      console.warn(`Partner proposal for ${name} exceeds 220 words (${wordCount}). Trimming...`);
      // If too long, create minimal version
      const trimmedBody = `Hi ${contactFirstName},

${name} should be part of this.

The Woman Who Leads The Room brings together 100 of the UK's most influential women in business — Thursday, August 28.

As ${partnerType === 'strategic_sponsor' ? 'Strategic Sponsor' : partnerType === 'brand_partner' ? 'Brand Partner' : partnerType === 'media_partner' ? 'Media Partner' : partnerType === 'employer_partner' ? 'Employer Partner' : 'Civic Partner'}, you'd have meaningful partnership with this caliber of audience.

Are you interested in exploring this further?

Best regards,
Kynda Johnson's Team`;

      return {
        toEmail: email,
        fromEmail: 'lyndajohnson@eventperfekt.com',
        fromName: 'Kynda Johnson',
        subject,
        body: trimmedBody,
        campaignType: partnerType,
        partnerType,
        organizationName: name,
        contactName,
        wordCount: trimmedBody.split(/\s+/).length,
        status: 'pending',
      };
    }

    return {
      toEmail: email,
      fromEmail: 'lyndajohnson@eventperfekt.com',
      fromName: 'Kynda Johnson',
      subject,
      body,
      campaignType: partnerType,
      partnerType,
      organizationName: name,
      contactName,
      wordCount,
      status: 'pending',
    };
  } catch (err: any) {
    throw new Error(`Failed to generate partner proposal: ${err.message}`);
  }
}

/**
 * Generate multiple partner proposal drafts in bulk
 * @param orgs - Array of organization records
 * @param partnerTypes - Filter to specific partner types (optional)
 * @param limit - Max number to generate
 * @returns Array of email drafts
 */
export async function generatePartnerProposalDrafts(
  orgs: any[],
  partnerTypes?: PartnerType[],
  limit: number = 30,
): Promise<PartnerProposalDraft[]> {
  try {
    // Filter by partner type if specified
    let filtered = orgs;
    if (partnerTypes && partnerTypes.length > 0) {
      filtered = orgs.filter(org => partnerTypes.includes(org.partnerType));
    }

    // Apply limit
    const toProcess = filtered.slice(0, limit);

    // Generate drafts for each org
    const drafts: PartnerProposalDraft[] = [];
    for (const org of toProcess) {
      try {
        const draft = await generatePartnerProposalDraft(org);
        drafts.push(draft);
      } catch (err: any) {
        console.error(`Skipping org ${org.name}:`, err.message);
        // Continue with next org
      }
    }

    console.log(`Generated ${drafts.length} partner proposal drafts`);
    return drafts;
  } catch (err: any) {
    throw new Error(`Failed to generate partner proposals: ${err.message}`);
  }
}
