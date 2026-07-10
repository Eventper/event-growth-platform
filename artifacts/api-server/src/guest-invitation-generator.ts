/**
 * Guest Invitation Draft Generator
 * Generates personalized invitation emails for Growth Hub guests
 * Uses guest intelligence data to create custom drafts
 */

export interface GuestInvitationDraft {
  toEmail: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  campaignType: string;
  guestName: string;
  companyName: string;
  wordCount: number;
  status: 'pending';
}

/**
 * Generate a personalized guest invitation draft
 * @param guest - Guest record from Growth Hub database
 * @returns EmailDraft ready for approval queue
 */
export async function generateGuestInvitationDraft(guest: any): Promise<GuestInvitationDraft> {
  try {
    // Extract guest data
    const {
      name,
      company,
      role,
      sector,
      influenceScore,
      invitePriority,
      speakerPotential,
      sponsorIntroductionPotential,
      notes,
      email,
    } = guest;

    if (!email) {
      throw new Error(`Guest ${name} has no email address`);
    }

    // Extract first name for personalization
    const firstName = name.split(' ')[0];

    // Generate subject line
    const subject = `The Woman Who Leads The Room — ${firstName}, you should be here`;

    // Build email body with mandatory sections
    let body = `Hi ${firstName},\n\n`;

    // Section 1: Introduce Lynda Johnson
    body += `I'm reaching out from Lynda Johnson's office because we're creating something special this August, and you're exactly the kind of person who should be part of it.\n\n`;

    // Section 2: Explain what The Woman Who Leads The Room is
    body += `The Woman Who Leads The Room is an invitation-only event bringing together 100 of the UK's most influential women in business to explore bold ideas, build strategic partnerships, and shape the future.\n\n`;

    // Section 3: Personalize why she was selected (NOT generic)
    let whySelected = `Your work at ${company}`;
    if (sector) {
      whySelected += ` in ${sector}`;
    }
    whySelected += ` directly connects to our themes this year.`;

    if (influenceScore >= 8) {
      whySelected += ` Your track record and influence make you essential for this conversation.`;
    } else if (influenceScore >= 6) {
      whySelected += ` Your perspective and experience bring valuable insight.`;
    } else {
      whySelected += ` Your unique perspective strengthens our collective thinking.`;
    }

    body += `You're at the top of our list because ${whySelected}\n\n`;

    // Section 4: Include warm introduction if available
    if (notes && notes.toLowerCase().includes('introduced') || notes.toLowerCase().includes('recommend')) {
      body += `${notes}\n\n`;
    }

    // Section 5: Add contextual detail based on role
    if (speakerPotential) {
      body += `We'd love to have you share some of your thinking with this group — your perspective on ${sector || 'business'} is exactly what we need to hear.\n\n`;
    }

    if (sponsorIntroductionPotential) {
      body += `Beyond the event itself, your network and relationships will be invaluable as we build this community.\n\n`;
    }

    // Section 6: One clear CTA
    body += `Are you available Thursday, August 28? Just reply to confirm, or let me know if another date works better.\n\n`;
    body += `Looking forward to it.\n\n`;
    body += `Best regards,\nKynda Johnson's Team`;

    // Count words
    const wordCount = body.split(/\s+/).length;

    // Validate length (max 220 words)
    if (wordCount > 220) {
      console.warn(`Guest invitation for ${name} exceeds 220 words (${wordCount}). Trimming...`);
      // Keep only essential sections if too long
      const trimmedBody = `Hi ${firstName},

I'm reaching out from Lynda Johnson's office because we're creating something special this August, and you're exactly who should be part of it.

The Woman Who Leads The Room is an invitation-only event bringing together 100 of the UK's most influential women in business to explore bold ideas, build strategic partnerships, and shape the future.

You're at the top of our list because ${whySelected}

Are you available Thursday, August 28? Just reply to confirm.

Best regards,
Lynda Johnson's Team`;

      return {
        toEmail: email,
        fromEmail: 'lyndajohnson@eventperfekt.com',
        fromName: 'Kynda Johnson',
        subject,
        body: trimmedBody,
        campaignType: 'guest_invitation',
        guestName: name,
        companyName: company,
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
      campaignType: 'guest_invitation',
      guestName: name,
      companyName: company,
      wordCount,
      status: 'pending',
    };
  } catch (err: any) {
    throw new Error(`Failed to generate invitation for guest: ${err.message}`);
  }
}

/**
 * Generate multiple guest invitation drafts in bulk
 * @param guests - Array of guest records
 * @param limit - Max number to generate (default: all)
 * @returns Array of email drafts
 */
export async function generateGuestInvitationDrafts(guests: any[], limit?: number): Promise<GuestInvitationDraft[]> {
  try {
    // Sort by priority (A > B > C)
    const priorityOrder = { A: 0, B: 1, C: 2 };
    const sorted = guests.sort((a, b) => {
      const aPriority = priorityOrder[a.invitePriority] ?? 999;
      const bPriority = priorityOrder[b.invitePriority] ?? 999;
      return aPriority - bPriority;
    });

    // Apply limit
    const toProcess = limit ? sorted.slice(0, limit) : sorted;

    // Generate drafts for each guest
    const drafts: GuestInvitationDraft[] = [];
    for (const guest of toProcess) {
      try {
        const draft = await generateGuestInvitationDraft(guest);
        drafts.push(draft);
      } catch (err: any) {
        console.error(`Skipping guest ${guest.name}:`, err.message);
        // Continue with next guest
      }
    }

    console.log(`Generated ${drafts.length} guest invitation drafts`);
    return drafts;
  } catch (err: any) {
    throw new Error(`Failed to generate guest invitations: ${err.message}`);
  }
}
