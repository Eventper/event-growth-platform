/**
 * Event Cascade Service
 * Handles universal post-submission automation for ALL event enquiry forms.
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import { emailService } from "./emailService";

// ─── Reference Generator ──────────────────────────────────────────────────────
export function generateRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "";
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return `EP-${ref}`;
}

// ─── Budget Priority ──────────────────────────────────────────────────────────
function derivePriority(budget: string, currency: string): "high" | "medium" | "standard" {
  const raw = budget || "";
  const nums = raw.match(/[\d,]+/g)?.map((n: string) => parseInt(n.replace(/,/g, ""))) || [];
  const amount = nums.length > 0 ? Math.max(...nums) : 0;
  const inGBP =
    currency === "NGN" ? amount / 1800 :
    currency === "USD" ? amount * 0.79 :
    currency === "EUR" ? amount * 0.86 :
    amount;
  if (inGBP >= 50000) return "high";
  if (inGBP >= 10000) return "medium";
  return "standard";
}

// ─── Urgency from date ────────────────────────────────────────────────────────
function deriveUrgency(preferredDate?: string | null): "urgent" | "normal" | "relaxed" {
  if (!preferredDate) return "normal";
  const daysUntil = Math.floor((new Date(preferredDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 56) return "urgent";    // < 8 weeks
  if (daysUntil <= 120) return "normal";   // < 4 months
  return "relaxed";
}

// ─── Normalise Raw Form Data ──────────────────────────────────────────────────
export function normaliseEnquiryData(raw: any, source: string): Record<string, any> {
  let clientFirstName = "";
  let clientLastName = "";
  let clientEmail = raw.email || raw.contactEmail || raw.clientEmail || "";
  let clientPhone = raw.phone || raw.contactPhone || raw.clientPhone || "";
  let clientCompany = raw.companyName || raw.clientCompany || raw.company || "";
  let guestCount = 0;
  let eventType = "";
  let vision = "";

  // --- Corporate form field mapping ---
  if (source === "corporate-form") {
    const name = raw.contactPerson || raw.name || "";
    const parts = name.split(" ");
    clientFirstName = parts[0] || "";
    clientLastName = parts.slice(1).join(" ") || "";
    guestCount = parseInt(raw.attendeeCount || raw.guestCount || "0") || 0;
    eventType = raw.eventType || "Corporate Event";
    vision = raw.eventDescription || raw.objectives || "";
  }

  // --- Private form field mapping ---
  if (source === "private-form") {
    const name = raw.fullName || raw.name || "";
    const parts = name.split(" ");
    clientFirstName = parts[0] || "";
    clientLastName = parts.slice(1).join(" ") || "";
    guestCount = parseInt(raw.guestCount || raw.guests || "0") || 0;
    eventType = raw.eventType || "Private Event";
    vision = raw.eventDescription || raw.inspiration || "";
  }

  // --- Simple form field mapping ---
  if (source === "simple-form") {
    const name = raw.name || raw.fullName || raw.contactPerson || "";
    const parts = name.split(" ");
    clientFirstName = parts[0] || "";
    clientLastName = parts.slice(1).join(" ") || "";
    guestCount = parseInt(raw.guestCount || raw.guests || raw.attendeeCount || "0") || 0;
    eventType = raw.eventType || "Event";
    vision = raw.description || raw.message || raw.eventDescription || "";
  }

  // --- Full wizard field mapping ---
  if (source === "full-wizard" || source === "internal") {
    const name = raw.name || raw.contactPerson || raw.fullName || "";
    const parts = name.split(" ");
    clientFirstName = parts[0] || "";
    clientLastName = parts.slice(1).join(" ") || "";
    guestCount = parseInt(raw.guestCount || "0") || 0;
    eventType = raw.eventCategory || raw.eventType || raw.type || "Event";
    vision = raw.description || raw.moodDescription || "";
  }

  // --- Booking enquiry / other ---
  if (source === "booking-form") {
    const name = raw.name || "";
    const parts = name.split(" ");
    clientFirstName = parts[0] || "";
    clientLastName = parts.slice(1).join(" ") || "";
    guestCount = parseInt(raw.guestCount || raw.guest_count || "0") || 0;
    eventType = raw.eventType || raw.event_type || "Event";
    vision = raw.message || raw.description || "";
  }

  // --- Services array ---
  const services: string[] = [];
  const serviceKeys = [
    "fullEventPlanning", "dayCoordination", "venueSourcing", "venueStylist",
    "needsCatering", "needsDecor", "needsPhotography", "needsEntertainment",
    "needsTransportation", "needsFlowers", "cakeDesign", "customBackdrops",
    "lightingProduction", "guestManagement", "eventStaffing", "proposalPlanning",
    "luxuryGifting", "securityServices", "religiousCoordination", "photoboothService",
    "needsBranding", "avEquipment", "needsAVEquipment", "needsVendorCoordination",
    "needsEndToEndPlanning", "needsDayCoordination", "needsVenueDecoration",
    "needsVenueSearch", "needsBrandedStyling",
  ];
  const labelMap: Record<string, string> = {
    fullEventPlanning: "Full Event Planning",
    dayCoordination: "Day Coordination",
    venueSourcing: "Venue Sourcing",
    venueStylist: "Venue Stylist",
    needsCatering: "Catering & Food Service",
    needsDecor: "Decor & Styling",
    needsPhotography: "Photography/Videography",
    needsEntertainment: "Entertainment & Music",
    needsTransportation: "Transportation",
    needsFlowers: "Flowers & Arrangements",
    cakeDesign: "Cake & Dessert Styling",
    customBackdrops: "Custom Backdrops",
    lightingProduction: "Lighting & Technical Production",
    guestManagement: "Guest List Management",
    eventStaffing: "Event Staffing",
    proposalPlanning: "Proposal Planning / Surprise Events",
    luxuryGifting: "Luxury Gifting",
    securityServices: "Security & Protocol Services",
    religiousCoordination: "Religious/Traditional Coordination",
    photoboothService: "Photobooth Service",
    needsBranding: "Branding",
    avEquipment: "Audio/Visual Equipment",
    needsAVEquipment: "Audio/Visual Equipment",
    needsVendorCoordination: "Vendor Coordination",
    needsEndToEndPlanning: "Full Event Planning",
    needsDayCoordination: "Day Coordination",
    needsVenueDecoration: "Venue Decoration",
    needsVenueSearch: "Venue Search",
    needsBrandedStyling: "Branded Styling",
  };
  for (const key of serviceKeys) {
    if (raw[key] === true || raw[key] === "true") {
      const label = labelMap[key];
      if (label && !services.includes(label)) services.push(label);
    }
  }

  const currency = raw.currency || "GBP";
  const budget = raw.budget || raw.budgetRange || raw.budget_range || "";
  const priority = derivePriority(budget, currency);
  const preferredDate = raw.eventDate || raw.preferredDate || raw.preferred_date || raw.startDate || null;
  const urgency = deriveUrgency(preferredDate);

  return {
    clientFirstName,
    clientLastName,
    name: `${clientFirstName} ${clientLastName}`.trim() || raw.name || clientEmail,
    clientEmail,
    clientPhone,
    clientCompany,
    clientCountry: raw.country || raw.clientCountry || "UK",
    eventType,
    eventSubtype: raw.eventSubtype || raw.eventCategory || null,
    preferredDate: preferredDate ? new Date(preferredDate) : null,
    guestCount,
    budget,
    currency,
    eventLocation: raw.city || raw.eventLocation || null,
    country: raw.country || "UK",
    hasVenue: raw.hasVenue === true || raw.hasVenue === "true",
    venueName: raw.venueName || raw.ceremonyVenue || null,
    venueCity: raw.city || null,
    servicesRequired: services,
    vision,
    specialRequirements: raw.specialRequests || raw.specialRequirements || null,
    urgency,
    preferredContact: raw.preferredContact || null,
    bestTimeToContact: raw.bestTimeToCall || raw.bestTimeToContact || null,
    source,
    priority,
    gdprConsent: raw.gdprConsent === true || raw.gdprConsent === "true",
    marketingConsent: raw.marketingConsent === true || raw.marketingConsent === "true",
  };
}

// ─── Step 2: Save Enquiry ─────────────────────────────────────────────────────
async function saveEnquiry(data: Record<string, any>, reference: string): Promise<any> {
  const result = await db.execute(sql`
    INSERT INTO enquiries (
      reference, source, name, client_first_name, client_last_name,
      email, phone, client_company, client_country,
      event_type, event_subtype, preferred_date, guest_count,
      budget_range, budget, currency, event_location, country,
      has_venue, venue_name, venue_city, services_required,
      vision, special_requirements, urgency, preferred_contact,
      best_time_to_contact, priority, gdpr_consent, marketing_consent,
      status, created_at
    ) VALUES (
      ${reference}, ${data.source}, ${data.name}, ${data.clientFirstName}, ${data.clientLastName},
      ${data.clientEmail}, ${data.clientPhone || null}, ${data.clientCompany || null}, ${data.clientCountry || null},
      ${data.eventType}, ${data.eventSubtype || null}, ${data.preferredDate || null}, ${data.guestCount || 0},
      ${data.budget || null}, ${data.budget || null}, ${data.currency || "GBP"}, ${data.eventLocation || null}, ${data.country || null},
      ${data.hasVenue || false}, ${data.venueName || null}, ${data.venueCity || null}, ${JSON.stringify(data.servicesRequired || [])},
      ${data.vision || null}, ${data.specialRequirements || null}, ${data.urgency || "normal"}, ${data.preferredContact || null},
      ${data.bestTimeToContact || null}, ${data.priority || "medium"}, ${data.gdprConsent || false}, ${data.marketingConsent || false},
      'new', NOW()
    )
    RETURNING *
  `);
  return result.rows[0];
}

// ─── Step 3: Create Lead Pipeline Entry ──────────────────────────────────────
async function createLeadPipelineEntry(enquiry: any, data: Record<string, any>): Promise<void> {
  try {
    // Check if crm_leads table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'crm_leads'
      ) as exists
    `);
    const hasCrmLeads = (tableCheck.rows[0] as any)?.exists;

    if (hasCrmLeads) {
      await db.execute(sql`
        INSERT INTO crm_leads (
          name, email, phone, company, event_type, budget, currency,
          source, stage, priority, notes, enquiry_id, created_at
        ) VALUES (
          ${data.name}, ${data.clientEmail}, ${data.clientPhone || null},
          ${data.clientCompany || null}, ${data.eventType}, ${data.budget || null}, ${data.currency || "GBP"},
          ${data.source}, 'New Enquiry', ${data.priority}, 
          ${`Enquiry ref: ${enquiry.reference}. Services: ${(data.servicesRequired || []).join(", ")}`},
          ${enquiry.id}, NOW()
        )
      `);
    }
  } catch (e) {
    // Non-fatal: log but continue
    console.log("Lead pipeline entry skipped (table may not exist):", (e as Error).message);
  }
}

// ─── Step 4: Flag Intake Queue ────────────────────────────────────────────────
async function flagIntakeQueue(enquiry: any, data: Record<string, any>): Promise<void> {
  try {
    // Update the enquiry status to new so it shows in the intake queue
    await db.execute(sql`
      UPDATE enquiries SET status = 'new' WHERE id = ${enquiry.id}
    `);
  } catch (e) {
    console.log("Intake queue flag skipped:", (e as Error).message);
  }
}

// ─── Step 5: Send Client Acknowledgement Email ────────────────────────────────
async function sendClientAcknowledgement(data: Record<string, any>, reference: string): Promise<void> {
  if (data.source === "internal") return;
  if (!data.clientEmail) return;

  const country = (data.country || "UK").toLowerCase();
  const isNigeria = country.includes("nigeria") || country.includes("ng");
  const entity = isNigeria
    ? "Event Perfekt Management Services Limited"
    : "Event Perfekt Global Ltd";
  const address = isNigeria
    ? "25 Kusenla Street, Lagos, Nigeria"
    : "20 Wenlock Road, London, N1 7PG";
  const phone = isNigeria ? "+234 XXX XXX XXXX" : "+44 XXX XXX XXXX";

  const formattedDate = data.preferredDate
    ? new Date(data.preferredDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "To be confirmed";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Georgia,serif;background:#f9f6f2;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6f2;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#8B1538;padding:40px;text-align:center;">
            <p style="color:#ffffff;font-size:28px;font-weight:bold;margin:0;letter-spacing:2px;">EVENT PERFEKT</p>
            <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:8px 0 0;letter-spacing:1px;font-style:italic;">...making yours perfekt</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="color:#8B1538;font-size:22px;margin:0 0 20px;">Dear ${data.clientFirstName || data.name},</p>
            <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px;">
              Thank you for reaching out to Event Perfekt. We have received your enquiry and are delighted 
              by the opportunity to bring your <strong>${data.eventType}</strong> to life.
            </p>
            <div style="background:#f8f2f4;border-left:4px solid #8B1538;padding:20px 24px;margin:24px 0;border-radius:0 8px 8px 0;">
              <p style="margin:0 0 8px;color:#8B1538;font-weight:bold;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Your Enquiry Details</p>
              <p style="margin:4px 0;color:#555;font-size:14px;"><strong>Reference:</strong> <span style="color:#8B1538;font-weight:bold;font-size:16px;">${reference}</span></p>
              <p style="margin:4px 0;color:#555;font-size:14px;"><strong>Event:</strong> ${data.eventType}</p>
              <p style="margin:4px 0;color:#555;font-size:14px;"><strong>Date:</strong> ${formattedDate}</p>
              ${data.guestCount ? `<p style="margin:4px 0;color:#555;font-size:14px;"><strong>Guests:</strong> ${data.guestCount}</p>` : ""}
              ${data.servicesRequired?.length ? `<p style="margin:4px 0;color:#555;font-size:14px;"><strong>Services:</strong> ${data.servicesRequired.join(", ")}</p>` : ""}
            </div>
            <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px;">
              Our planning team will review your enquiry and reach out to you within <strong>24 hours</strong> 
              with a personalised proposal.
            </p>
            <p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 24px;">
              In the meantime, please don't hesitate to contact us if you have any questions.
            </p>
            <p style="color:#8B1538;font-size:15px;font-style:italic;">
              We look forward to making your event perfekt.
            </p>
            <p style="color:#333;font-size:15px;margin:24px 0 4px;">Warm regards,</p>
            <p style="color:#8B1538;font-size:16px;font-weight:bold;margin:0;">The Event Perfekt Team</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#330311;padding:24px;text-align:center;">
            <p style="color:rgba(255,255,255,0.9);font-size:13px;margin:0 0 4px;font-weight:bold;">${entity}</p>
            <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;">${address}</p>
            <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">info@eventperfekt.com | ${phone}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await emailService.sendEmail(
      data.clientEmail,
      `Your Event Perfekt enquiry is confirmed — ref ${reference}`,
      html
    );
  } catch (e) {
    console.error("Client acknowledgement email failed:", (e as Error).message);
  }
}

// ─── Step 6: Send Internal Manager Notification ───────────────────────────────
async function sendManagerNotification(data: Record<string, any>, reference: string, enquiryId: number): Promise<void> {
  try {
    const formattedDate = data.preferredDate
      ? new Date(data.preferredDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "TBC";

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="background:#8B1538;padding:24px;">
      <p style="color:#fff;font-size:18px;font-weight:bold;margin:0;">New Enquiry Received — ${reference}</p>
      <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:8px 0 0;">${new Date().toLocaleString("en-GB")}</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#999;font-size:13px;width:140px;">Client</td><td style="padding:8px 0;font-size:14px;font-weight:bold;">${data.name}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#999;font-size:13px;">Email</td><td style="padding:8px 0;font-size:14px;">${data.clientEmail}</td></tr>
        ${data.clientPhone ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#999;font-size:13px;">Phone</td><td style="padding:8px 0;font-size:14px;">${data.clientPhone}</td></tr>` : ""}
        ${data.clientCompany ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#999;font-size:13px;">Company</td><td style="padding:8px 0;font-size:14px;">${data.clientCompany}</td></tr>` : ""}
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#999;font-size:13px;">Event Type</td><td style="padding:8px 0;font-size:14px;">${data.eventType}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#999;font-size:13px;">Date</td><td style="padding:8px 0;font-size:14px;">${formattedDate}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#999;font-size:13px;">Guests</td><td style="padding:8px 0;font-size:14px;">${data.guestCount || "TBC"}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#999;font-size:13px;">Budget</td><td style="padding:8px 0;font-size:14px;">${data.budget || "TBC"} ${data.currency || ""}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#999;font-size:13px;">Country</td><td style="padding:8px 0;font-size:14px;">${data.country || "TBC"}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#999;font-size:13px;">Priority</td><td style="padding:8px 0;font-size:14px;text-transform:capitalize;color:${data.priority === "high" ? "#dc2626" : data.priority === "medium" ? "#d97706" : "#555"};">${data.priority || "standard"}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#999;font-size:13px;">Source</td><td style="padding:8px 0;font-size:14px;">${data.source}</td></tr>
        ${data.servicesRequired?.length ? `<tr><td style="padding:8px 0;color:#999;font-size:13px;">Services</td><td style="padding:8px 0;font-size:14px;">${data.servicesRequired.join(", ")}</td></tr>` : ""}
      </table>
      ${data.vision ? `<div style="background:#f8f2f4;padding:16px;border-radius:6px;margin-top:16px;"><p style="color:#8B1538;font-size:12px;font-weight:bold;margin:0 0 8px;text-transform:uppercase;">Vision</p><p style="color:#333;font-size:14px;margin:0;">${data.vision}</p></div>` : ""}
      <a href="https://event-horizon-sales558.replit.app/manager-intake" style="display:inline-block;margin-top:20px;background:#8B1538;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">View in Intake Queue →</a>
    </div>
  </div>
</body>
</html>`;

    await emailService.sendEmail(
      "info@eventperfekt.com",
      `[NEW ENQUIRY] ${reference} — ${data.name} (${data.eventType}) [${(data.priority || "standard").toUpperCase()}]`,
      html
    );

    // Also create in-app notification for all planners/admins
    try {
      const planners = await db.execute(sql`
        SELECT id FROM users WHERE role IN ('admin', 'planner', 'manager') LIMIT 20
      `);
      for (const planner of planners.rows) {
        await db.execute(sql`
          INSERT INTO user_notifications (user_id, type, title, content, action_url, is_read, created_at)
          VALUES (
            ${(planner as any).id}, 'new_enquiry',
            ${`New enquiry: ${data.name} — ${data.eventType}`},
            ${`Ref: ${reference} | Budget: ${data.budget || "TBC"} | Priority: ${data.priority}`},
            '/manager-intake', false, NOW()
          )
        `);
      }
    } catch (notifErr) {
      console.log("In-app notification skipped:", (notifErr as Error).message);
    }
  } catch (e) {
    console.error("Manager notification failed:", (e as Error).message);
  }
}

// ─── Step 7: Log Audit Trail ──────────────────────────────────────────────────
async function logAuditEntry(data: Record<string, any>, reference: string, enquiryId: string): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO event_planning_log (
        action, entity_type, entity_id, entity_name, description,
        changed_by_name, priority, tags, category, timestamp
      ) VALUES (
        'enquiry_received', 'enquiry', ${String(enquiryId)}, ${data.name},
        ${`New enquiry ${reference} received from ${data.source}. Event: ${data.eventType}, Date: ${data.preferredDate ? new Date(data.preferredDate).toLocaleDateString("en-GB") : "TBC"}, Budget: ${data.budget || "TBC"}`},
        'System (Form Submission)', 'medium',
        ${JSON.stringify(["enquiry", "submission", data.source])},
        'intake', NOW()
      )
    `);
  } catch (e) {
    console.log("Audit log entry skipped:", (e as Error).message);
  }
}

// ─── MAIN: triggerEventCascade ────────────────────────────────────────────────
export async function triggerEventCascade(rawData: any, source: string): Promise<{
  success: boolean;
  reference: string;
  enquiryId: number;
  message: string;
}> {
  const reference = generateRef();
  const data = normaliseEnquiryData(rawData, source);
  data.source = source;

  // Step 1: Save enquiry
  const enquiry = await saveEnquiry(data, reference);
  const enquiryId = enquiry.id;

  // Steps 3-7 run in parallel (non-blocking, non-fatal)
  Promise.allSettled([
    createLeadPipelineEntry(enquiry, data),
    flagIntakeQueue(enquiry, data),
    sendClientAcknowledgement(data, reference),
    sendManagerNotification(data, reference, enquiryId),
    logAuditEntry(data, reference, enquiryId),
  ]).then(results => {
    const failed = results.filter(r => r.status === "rejected");
    if (failed.length > 0) {
      console.log(`Cascade completed for ${reference} with ${failed.length} non-fatal warnings`);
    } else {
      console.log(`Cascade fully completed for ${reference}`);
    }
  });

  return { success: true, reference, enquiryId, message: "Enquiry received successfully" };
}

// ─── APPROVAL CASCADE ─────────────────────────────────────────────────────────

function parseBudgetToNumber(budget: string, currency: string): number {
  const nums = (budget || "").match(/[\d,]+/g)?.map((n: string) => parseInt(n.replace(/,/g, ""))) || [];
  return nums.length > 0 ? Math.max(...nums) : 0;
}

function getWeeksUntilEvent(eventDate: Date): number {
  return Math.floor((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7));
}

function getMilestones(eventDate: Date, weeks: number): Array<{ title: string; daysBeforeEvent: number }> {
  if (weeks > 12) {
    return [
      { title: "Venue confirmed", daysBeforeEvent: 84 },
      { title: "Guest list sent to venue", daysBeforeEvent: 70 },
      { title: "Catering brief submitted", daysBeforeEvent: 60 },
      { title: "Vendor quotes reviewed", daysBeforeEvent: 49 },
      { title: "Contracts signed (all vendors)", daysBeforeEvent: 42 },
      { title: "Event app created", daysBeforeEvent: 35 },
      { title: "Run sheet drafted", daysBeforeEvent: 21 },
      { title: "Final guest numbers confirmed", daysBeforeEvent: 14 },
      { title: "Team briefing", daysBeforeEvent: 7 },
      { title: "Day-of coordination", daysBeforeEvent: 0 },
    ];
  } else if (weeks >= 4) {
    return [
      { title: "Venue & vendors confirmed", daysBeforeEvent: 28 },
      { title: "Guest list finalised", daysBeforeEvent: 21 },
      { title: "Run sheet drafted", daysBeforeEvent: 14 },
      { title: "Final numbers to venue", daysBeforeEvent: 7 },
      { title: "Team briefing", daysBeforeEvent: 3 },
      { title: "Day-of coordination", daysBeforeEvent: 0 },
    ];
  } else {
    return [
      { title: "URGENT: Confirm all vendors", daysBeforeEvent: 14 },
      { title: "URGENT: Final guest list", daysBeforeEvent: 7 },
      { title: "Run sheet finalised", daysBeforeEvent: 3 },
      { title: "Team briefing", daysBeforeEvent: 1 },
      { title: "Day-of coordination", daysBeforeEvent: 0 },
    ];
  }
}

function getBudgetAllocations(eventCategory: string, services: string[]): Array<{ category: string; percent: number }> {
  const hasDayCoord = services.includes("Day Coordination");
  const isDecorOnly = services.includes("Venue Decoration") && services.length <= 3;

  if (isDecorOnly) {
    return [
      { category: "Decor & Styling", percent: 55 },
      { category: "Florals", percent: 25 },
      { category: "Lighting", percent: 20 },
    ];
  }
  if (hasDayCoord && !services.includes("Full Event Planning")) {
    return [
      { category: "Day Coordination", percent: 60 },
      { category: "Miscellaneous", percent: 40 },
    ];
  }

  const cat = (eventCategory || "").toLowerCase();
  if (cat.includes("wedding")) {
    return [
      { category: "Venue", percent: 35 },
      { category: "Catering & Bar", percent: 25 },
      { category: "Decor & Styling", percent: 20 },
      { category: "Photography & Video", percent: 10 },
      { category: "Staffing", percent: 5 },
      { category: "Miscellaneous", percent: 5 },
    ];
  }
  if (cat.includes("birthday") || cat.includes("anniversary")) {
    return [
      { category: "Venue", percent: 30 },
      { category: "Catering & Bar", percent: 30 },
      { category: "Decor & Styling", percent: 25 },
      { category: "Entertainment", percent: 15 },
    ];
  }
  if (cat === "corporate" || cat.includes("gala") || cat.includes("conference") || cat.includes("corporate")) {
    return [
      { category: "Venue", percent: 40 },
      { category: "Catering & Bar", percent: 30 },
      { category: "Decor & Branding", percent: 15 },
      { category: "Staffing", percent: 10 },
      { category: "Miscellaneous", percent: 5 },
    ];
  }
  // Default
  return [
    { category: "Venue", percent: 35 },
    { category: "Catering & Bar", percent: 30 },
    { category: "Decor & Styling", percent: 20 },
    { category: "Staffing", percent: 10 },
    { category: "Miscellaneous", percent: 5 },
  ];
}

function getAutoTasks(eventCategory: string, services: string[], weeks: number): Array<{ title: string; priority: "low" | "medium" | "high" | "critical"; dueDaysBeforeEvent: number; assignedRole: string }> {
  const hasDayCoord = services.includes("Day Coordination");
  const cat = (eventCategory || "").toLowerCase();
  const baseTasks: Array<{ title: string; priority: "low" | "medium" | "high" | "critical"; dueDaysBeforeEvent: number; assignedRole: string }> = [
    { title: "Send NDA to client", priority: "high", dueDaysBeforeEvent: weeks * 7 - 1, assignedRole: "Event Manager" },
    { title: "Collect deposit invoice payment", priority: "critical", dueDaysBeforeEvent: weeks * 7 - 3, assignedRole: "Finance" },
    { title: "Schedule kickoff call with client", priority: "high", dueDaysBeforeEvent: weeks * 7 - 5, assignedRole: "Event Manager" },
    { title: "Confirm venue booking", priority: "critical", dueDaysBeforeEvent: 42, assignedRole: "Event Manager" },
    { title: "Obtain vendor quotes", priority: "high", dueDaysBeforeEvent: 35, assignedRole: "Planner" },
    { title: "Send run sheet draft to client", priority: "medium", dueDaysBeforeEvent: 21, assignedRole: "Planner" },
    { title: "Confirm final guest numbers", priority: "high", dueDaysBeforeEvent: 14, assignedRole: "Planner" },
    { title: "Finalise run sheet", priority: "critical", dueDaysBeforeEvent: 7, assignedRole: "Event Manager" },
    { title: "Team briefing session", priority: "high", dueDaysBeforeEvent: 3, assignedRole: "Event Manager" },
    { title: "Post-event report", priority: "medium", dueDaysBeforeEvent: -7, assignedRole: "Planner" },
  ];

  if (cat.includes("wedding")) {
    baseTasks.push(
      { title: "Confirm ceremony venue separate to reception", priority: "high", dueDaysBeforeEvent: 60, assignedRole: "Planner" },
      { title: "Arrange bridal suite access", priority: "medium", dueDaysBeforeEvent: 14, assignedRole: "Coordinator" },
      { title: "Confirm order of service with officiant", priority: "high", dueDaysBeforeEvent: 14, assignedRole: "Coordinator" }
    );
  }
  if (cat.includes("corporate") || cat.includes("conference")) {
    baseTasks.push(
      { title: "Confirm AV setup with venue", priority: "high", dueDaysBeforeEvent: 21, assignedRole: "Technical Lead" },
      { title: "Send delegate joining instructions", priority: "medium", dueDaysBeforeEvent: 14, assignedRole: "Planner" }
    );
  }
  return baseTasks;
}

function getGuestGroups(eventCategory: string): string[] {
  const cat = (eventCategory || "").toLowerCase();
  if (cat.includes("wedding")) return ["Bride's Side", "Groom's Side", "Family", "Friends", "VIP", "Colleagues"];
  if (cat.includes("birthday")) return ["Family", "Friends", "VIP", "Colleagues"];
  if (cat.includes("anniversary")) return ["Family", "Close Friends", "VIP"];
  if (cat.includes("corporate") || cat.includes("conference")) return ["VIP", "Delegates", "Staff", "Press", "Sponsors"];
  if (cat.includes("gala")) return ["VIP", "Guests", "Sponsors", "Media", "Staff"];
  return ["VIP", "General Guests", "Staff"];
}

export async function triggerApprovalCascade(
  enquiryId: string,
  managerId: string,
  assignedPlannerId: string
): Promise<{ success: boolean; eventId?: string; message: string }> {

  // Load the enquiry
  const enquiryResult = await db.execute(sql`SELECT * FROM enquiries WHERE id = ${enquiryId}`);
  if (enquiryResult.rows.length === 0) {
    return { success: false, message: "Enquiry not found" };
  }
  const enquiry = enquiryResult.rows[0] as any;

  // ── Step 1: Create Event record ───────────────────────────────────────────
  const services: string[] = (() => {
    const raw = enquiry.services_required;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return []; } }
    return [];
  })();
  const eventCategory = enquiry.event_type || "Event";
  const eventName = enquiry.client_company
    ? `${enquiry.client_company} ${eventCategory}`
    : `${enquiry.client_last_name || enquiry.name} ${eventCategory}`;

  const eventDate = enquiry.preferred_date ? new Date(enquiry.preferred_date) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const weeks = getWeeksUntilEvent(eventDate);
  const totalBudget = parseBudgetToNumber(enquiry.budget || enquiry.budget_range || "0", enquiry.currency || "GBP");
  const currency = enquiry.currency || "GBP";
  const isPrivate = !["corporate", "conference", "gala", "seminar", "product launch", "award ceremony"].some(t => eventCategory.toLowerCase().includes(t));

  // Upsert client
  let clientId: string | null = null;
  try {
    const existingClient = await db.execute(sql`SELECT id FROM clients WHERE email = ${enquiry.email} LIMIT 1`);
    if (existingClient.rows.length > 0) {
      clientId = (existingClient.rows[0] as any).id;
    } else {
      const newClient = await db.execute(sql`
        INSERT INTO clients (full_name, email, phone, company_name)
        VALUES (${enquiry.name}, ${enquiry.email}, ${enquiry.phone || null}, ${enquiry.client_company || null})
        RETURNING id
      `);
      clientId = (newClient.rows[0] as any).id;
    }
  } catch (e) {
    console.error("Client upsert error:", e);
  }

  // Create the event
  const newEventResult = await db.execute(sql`
    INSERT INTO events (
      name, type, event_category, start_date, end_date, guest_count, budget, currency,
      city, country, client_id, status, description, has_venue, ceremony_venue,
      needs_catering, needs_decor, needs_vendor_coordination, needs_branding,
      workflow_status, created_at
    ) VALUES (
      ${eventName}, ${isPrivate ? "private" : "corporate"}, ${eventCategory},
      ${eventDate}, ${eventDate},
      ${enquiry.guest_count || 0}, ${String(totalBudget)}, ${currency},
      ${enquiry.event_location || enquiry.venue_city || "TBC"}, ${enquiry.country || "UK"},
      ${clientId}, 'planning',
      ${enquiry.vision || enquiry.special_requirements || `Event created from enquiry ${enquiry.reference}`},
      ${enquiry.has_venue || false}, ${enquiry.venue_name || null},
      ${services.includes("Catering & Food Service")},
      ${services.includes("Decor & Styling")},
      ${services.includes("Vendor Coordination")},
      ${services.includes("Branding")},
      'assigned', NOW()
    )
    RETURNING id
  `);
  const eventId = (newEventResult.rows[0] as any).id;

  // Mark enquiry converted
  await db.execute(sql`
    UPDATE enquiries SET status = 'converted', converted_event_id = ${eventId}, assigned_planner_id = ${assignedPlannerId} WHERE id = ${enquiryId}
  `);

  // ── Step 2a: Budget auto-allocation ──────────────────────────────────────
  if (totalBudget > 0) {
    const allocations = getBudgetAllocations(eventCategory, services);
    for (const alloc of allocations) {
      const amount = Math.round((totalBudget * alloc.percent) / 100);
      try {
        await db.execute(sql`
          INSERT INTO budget_items (event_id, category, item, estimated_cost, actual_cost, currency, status, notes, created_at)
          VALUES (${eventId}, ${alloc.category}, ${alloc.category}, ${String(amount)}, '0', ${currency}, 'pending',
            ${`Auto-allocated: ${alloc.percent}% of ${currency} ${totalBudget.toLocaleString()}`}, NOW())
        `);
      } catch (e) {
        console.log("Budget item skipped:", (e as Error).message);
      }
    }
  }

  // ── Step 2b: Timeline milestones ─────────────────────────────────────────
  const milestones = getMilestones(eventDate, weeks);
  for (const m of milestones) {
    const dueDate = new Date(eventDate.getTime() - m.daysBeforeEvent * 24 * 60 * 60 * 1000);
    try {
      await db.execute(sql`
        INSERT INTO tasks (event_id, title, status, due_date, created_at)
        VALUES (${eventId}, ${m.title}, 'todo', ${dueDate}, NOW())
      `);
    } catch (e) {
      console.log("Milestone task skipped:", (e as Error).message);
    }
  }

  // ── Step 2c: Auto task checklist ─────────────────────────────────────────
  const autoTasks = getAutoTasks(eventCategory, services, weeks);
  for (const t of autoTasks) {
    const daysAdjusted = Math.max(t.dueDaysBeforeEvent, 1);
    const dueDate = new Date(eventDate.getTime() - daysAdjusted * 24 * 60 * 60 * 1000);
    try {
      await db.execute(sql`
        INSERT INTO tasks (event_id, title, status, due_date, description, created_at)
        VALUES (${eventId}, ${t.title}, 'todo', ${dueDate}, ${`Assigned role: ${t.assignedRole} | Priority: ${t.priority}`}, NOW())
      `);
    } catch (e) {
      console.log("Auto task skipped:", (e as Error).message);
    }
  }

  // ── Step 2d: Vendor category slots ───────────────────────────────────────
  const vendorCategories = services.includes("Full Event Planning")
    ? ["Venue", "Catering", "Decor", "Photography", "Entertainment", "Transport", "Staffing"]
    : services.includes("Day Coordination")
    ? ["Venue", "Staffing", "Transport"]
    : services.filter(s => ["Catering & Food Service", "Decor & Styling", "Photography/Videography", "Entertainment & Music", "Transportation"].includes(s));

  for (const cat of vendorCategories) {
    try {
      await db.execute(sql`
        INSERT INTO vendors (event_id, name, service, category, service_type, email, phone, status, notes, created_at)
        VALUES (${eventId}, ${`[TBC] ${cat} Vendor`}, ${cat}, ${cat}, ${cat.toLowerCase().replace(/ /g, "_")},
          'tbc@eventperfekt.com', 'TBC', 'pending', 'Auto-created slot — add vendor details', NOW())
      `);
    } catch (e) {
      console.log("Vendor slot skipped:", (e as Error).message);
    }
  }

  // ── Step 2e: Guest groups ────────────────────────────────────────────────
  const guestGroups = getGuestGroups(eventCategory);
  for (const group of guestGroups) {
    try {
      await db.execute(sql`
        INSERT INTO guest_groups (event_id, name, created_at)
        VALUES (${eventId}, ${group}, NOW())
      `);
    } catch (e) {
      // guest_groups table may not exist, skip
    }
  }

  // ── Step 3: Assign planner & notify ──────────────────────────────────────
  try {
    await db.execute(sql`
      UPDATE events SET planner_id = ${assignedPlannerId} WHERE id = ${eventId}
    `);

    // Notify planner
    await db.execute(sql`
      INSERT INTO user_notifications (user_id, type, title, content, action_url, is_read, created_at)
      VALUES (
        ${assignedPlannerId}, 'event_assigned',
        ${`New assignment: ${eventName}`},
        ${`You have been assigned to ${eventName}. Event date: ${eventDate.toLocaleDateString("en-GB")}. Budget: ${currency} ${totalBudget.toLocaleString()}`},
        ${`/event-dashboard/${eventId}`}, false, NOW()
      )
    `);
  } catch (e) {
    console.log("Planner assignment notification skipped:", (e as Error).message);
  }

  // ── Step 5: Log audit ────────────────────────────────────────────────────
  try {
    await db.execute(sql`
      INSERT INTO event_planning_log (
        action, entity_type, entity_id, entity_name, description,
        changed_by, changed_by_name, priority, tags, event_id, category, timestamp
      ) VALUES (
        'enquiry_approved', 'event', ${eventId}, ${eventName},
        ${`Enquiry ${enquiry.reference} approved and converted to event "${eventName}". Budget auto-allocated, timeline generated, tasks created.`},
        ${managerId}, 'Manager (Approval)', 'high',
        ${JSON.stringify(["approval", "event_created", "cascade"])},
        ${eventId}, 'approval', NOW()
      )
    `);
  } catch (e) {
    console.log("Audit log skipped:", (e as Error).message);
  }

  // ── Step 6: Notify planner via email ────────────────────────────────────
  try {
    const plannerResult = await db.execute(sql`SELECT email, username FROM users WHERE id = ${assignedPlannerId}`);
    if (plannerResult.rows.length > 0) {
      const planner = plannerResult.rows[0] as any;
      const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#8B1538;padding:20px;text-align:center;">
    <h2 style="color:#fff;margin:0;">New Event Assignment</h2>
  </div>
  <div style="padding:24px;background:#fff;">
    <p>Hi ${planner.username || "Planner"},</p>
    <p>You have been assigned to a new event:</p>
    <div style="background:#f8f2f4;padding:16px;border-radius:6px;margin:16px 0;border-left:4px solid #8B1538;">
      <p style="margin:4px 0;"><strong>Event:</strong> ${eventName}</p>
      <p style="margin:4px 0;"><strong>Date:</strong> ${eventDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
      <p style="margin:4px 0;"><strong>Guests:</strong> ${enquiry.guest_count || "TBC"}</p>
      <p style="margin:4px 0;"><strong>Budget:</strong> ${currency} ${totalBudget > 0 ? totalBudget.toLocaleString() : "TBC"}</p>
      <p style="margin:4px 0;"><strong>Client:</strong> ${enquiry.name} (${enquiry.email})</p>
    </div>
    <p>The Event Dashboard has been pre-populated with budget allocations, a planning timeline, and task checklists.</p>
    <a href="https://eventperfekt.net/event-dashboard/${eventId}" style="display:inline-block;background:#8B1538;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Open Event Dashboard →</a>
  </div>
</div>`;
      await emailService.sendEmail(
        planner.email,
        `New assignment: ${eventName} — Event Perfekt`,
        emailHtml
      );
    }
  } catch (e) {
    console.log("Planner email notification skipped:", (e as Error).message);
  }

  return { success: true, eventId, message: `Event "${eventName}" created and fully initialised` };
}
