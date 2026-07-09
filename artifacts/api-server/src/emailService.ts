import nodemailer from "nodemailer";

// ─── Entity config ────────────────────────────────────────────────────────────
//   GB  → Event Perfekt Global Ltd      → lyndajohnson@eventperfekt.com
//   NG  → Event Perfekt Management Svcs → admin@eventperfekt.com
//   info@eventperfekt.com is ALWAYS CC'd on every outgoing email

const ENTITY = {
  GB: {
    name: "Event Perfekt Global Ltd",
    email: "lyndajohnson@eventperfekt.com",
    address: "20 Wenlock Road, London, N1 7PG",
  },
  NG: {
    name: "Event Perfekt Management Services Limited",
    email: "admin@eventperfekt.com",
    address: "25 Kusenla Street, Lagos, Nigeria",
  },
} as const;

const INFO_EMAIL = "info@eventperfekt.com";    // always CC'd
type Entity = "GB" | "NG";

// ─── Transporter factory ──────────────────────────────────────────────────────
// Priority: Namecheap Private Email → Gmail → fallback (log only)
// The transporter returns the raw SMTP connection; "from" is set per-entity below.
let _transporterCache: { transporter: nodemailer.Transporter; smtpUser: string } | null | undefined = undefined;

export async function getTransporter(): Promise<{ transporter: nodemailer.Transporter; smtpUser: string } | null> {
  if (_transporterCache !== undefined) return _transporterCache;

  // 0. Lynda Johnson — Namecheap Private Email (preferred for I Am Her outreach)
  if (process.env.LYNDA_EMAIL && process.env.LYNDA_EMAIL_PASSWORD) {
    try {
      const t = nodemailer.createTransport({
        host: "mail.privateemail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.LYNDA_EMAIL,
          pass: process.env.LYNDA_EMAIL_PASSWORD,
        },
      });
      await t.verify();
      console.log(`✅ Namecheap SMTP connected as ${process.env.LYNDA_EMAIL}`);
      _transporterCache = { transporter: t, smtpUser: process.env.LYNDA_EMAIL };
      return _transporterCache;
    } catch (err: any) {
      console.warn("⚠️  Lynda Johnson SMTP failed, trying fallback providers:", err.message);
    }
  }

  // 1. Namecheap Private Email (fallback)
  if (process.env.NAMECHEAP_EMAIL && process.env.NAMECHEAP_PASSWORD) {
    try {
      const t = nodemailer.createTransport({
        host: "mail.privateemail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.NAMECHEAP_EMAIL,
          pass: process.env.NAMECHEAP_PASSWORD,
        },
      });
      await t.verify();
      console.log(`✅ Namecheap SMTP connected as ${process.env.NAMECHEAP_EMAIL}`);
      _transporterCache = { transporter: t, smtpUser: process.env.NAMECHEAP_EMAIL };
      return _transporterCache;
    } catch (err: any) {
      console.warn("⚠️  Namecheap SMTP failed, trying Gmail:", err.message);
    }
  }

  // 2. Gmail (App Password)
  const gmailAddress = process.env.GMAIL_ADDRESS || "admin@eventperfekt.com";
  const gmailPassword = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD;
  if (gmailPassword) {
    try {
      const t = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailAddress,
          pass: gmailPassword,
        },
      });
      await t.verify();
      console.log(`✅ Gmail SMTP connected as ${gmailAddress}`);
      _transporterCache = { transporter: t, smtpUser: gmailAddress };
      return _transporterCache;
    } catch (err: any) {
      console.warn("⚠️  Gmail SMTP failed:", err.message);
    }
  }

  console.warn("⚠️  No email provider configured (set LYNDA_EMAIL/LYNDA_EMAIL_PASSWORD, NAMECHEAP_EMAIL/NAMECHEAP_PASSWORD, or GMAIL_APP_PASSWORD)");
  _transporterCache = null;
  return null;
}

export async function checkEmailConfig() {
  const result = await getTransporter();
  if (result) {
    return { configured: true, smtpUser: result.smtpUser };
  }
  return {
    configured: false,
    reason: "No email provider configured. Set LYNDA_EMAIL + LYNDA_EMAIL_PASSWORD, NAMECHEAP_EMAIL + NAMECHEAP_PASSWORD, or GMAIL_APP_PASSWORD.",
  };
}

// ─── Core email sender ────────────────────────────────────────────────────────
// entity = "GB" (default) or "NG"
// Every email:
//   FROM    → entity from address (adminuk@ for GB, admin@ for NG)
//   REPLY-TO → same entity address
//   CC      → info@eventperfekt.com (always)
export async function sendMail(
  to: string,
  subject: string,
  html: string,
  extraCc?: string | string[],
  entity: Entity = "GB",
  attachments?: nodemailer.SendMailOptions["attachments"],
  headers?: Record<string, string>,
  fromOverride?: { name: string; email: string }
) {
  const ent = ENTITY[entity];
  const fromName = fromOverride?.name ?? ent.name;
  const fromEmail = fromOverride?.email ?? ent.email;
  const from = `"${fromName}" <${fromEmail}>`;

  const provider = await getTransporter();
  if (!provider) {
    // LOUD on purpose: with no provider, mail silently never sends — which makes
    // signups look like "zero conversions" even though the lead IS saved in the DB.
    // Set GMAIL_ADDRESS + GMAIL_APP_PASSWORD (or NAMECHEAP_EMAIL + NAMECHEAP_PASSWORD).
    console.error(`📧 [EMAIL NOT SENT — NO PROVIDER CONFIGURED] "${subject}" → ${to}. Set GMAIL_ADDRESS + GMAIL_APP_PASSWORD to enable delivery.`);
    console.error(`📧 [PREVIEW FROM] ${from}`);
    console.error(`📧 [PREVIEW] ${html.replace(/<[^>]*>/g, "").substring(0, 300)}`);
    return;
  }

  // Build CC list — always include info@eventperfekt.com plus any extra CCs
  const ccSet = new Set<string>([INFO_EMAIL]);
  if (to.toLowerCase().includes(INFO_EMAIL)) ccSet.delete(INFO_EMAIL);
  if (extraCc) {
    const extras = Array.isArray(extraCc) ? extraCc : [extraCc];
    for (const e of extras) {
      if (e && e !== to) ccSet.add(e);
    }
  }
  const cc = [...ccSet];

  const msg: nodemailer.SendMailOptions = {
    from,
    to,
    cc,
    replyTo: fromEmail,
    subject,
    html,
    text: html.replace(/<[^>]*>/g, ""),
    ...(attachments && attachments.length ? { attachments } : {}),
    ...(headers ? { headers } : {}),
  };

  try {
    const info = await provider.transporter.sendMail(msg);
    console.log(`✅ Email sent — "${subject}" → ${to} (CC: ${cc.join(", ")}) [ID: ${info.messageId}]`);
  } catch (error: any) {
    console.error(`❌ Email failed — "${subject}" → ${to}:`, error.message);
    throw error;
  }
}

// Convenience: Nigeria entity
export async function sendMailNG(to: string, subject: string, html: string, extraCc?: string | string[]) {
  return sendMail(to, subject, html, extraCc, "NG");
}

// ─── EmailNotificationService class ──────────────────────────────────────────
export class EmailNotificationService {
  private entity: Entity;

  constructor(entity: Entity = "GB") {
    this.entity = entity;
  }

  async sendEmail(to: string, subject: string, html: string, _text?: string) {
    try {
      await sendMail(to, subject, html, undefined, this.entity);
    } catch (error: any) {
      console.error("❌ Email sending failed:", error.message);
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  // ── Entity-based helpers ──────────────────────────────────────────────────

  private get ent() { return ENTITY[this.entity]; }

  async sendEventSubmissionConfirmation(clientEmail: string, eventDetails: any) {
    const subject = "Event Submission Received — Event Perfekt";
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:#330311;color:white;padding:20px;text-align:center;">
          <h1 style="margin:0;">Event Perfekt</h1>
          <p style="margin:4px 0 0;opacity:0.8;">...making yours perfekt</p>
        </div>
        <div style="padding:24px;background:#f9f9f9;">
          <p>Dear ${eventDetails.clientName || "Valued Client"},</p>
          <p>Thank you for submitting your event details. We have received your request for:</p>
          <div style="background:white;padding:16px;border-left:4px solid #8B1538;margin:16px 0;border-radius:4px;">
            <h3 style="margin:0 0 8px;color:#330311;">${eventDetails.eventName || "Your Event"}</h3>
            <p style="margin:4px 0;"><strong>Date:</strong> ${eventDetails.eventDate}</p>
            <p style="margin:4px 0;"><strong>Location:</strong> ${eventDetails.city}, ${eventDetails.country}</p>
            <p style="margin:4px 0;"><strong>Guests:</strong> ${eventDetails.guestCount}</p>
            <p style="margin:4px 0;"><strong>Budget:</strong> ${eventDetails.currency} ${Number(eventDetails.budget).toLocaleString()}</p>
          </div>
          <p>Our planning team will review your requirements and contact you within 24 hours.</p>
          <p>Best regards,<br/><strong>${this.ent.name}</strong><br/>${this.ent.address}</p>
        </div>
        <div style="background:#330311;color:white;padding:10px;text-align:center;font-size:12px;">
          ${this.ent.name} · ${this.ent.address}
        </div>
      </div>`;
    await this.sendEmail(clientEmail, subject, html);
    await this.sendEventSubmissionToAdmin(eventDetails);
  }

  async sendEventSubmissionToAdmin(eventDetails: any) {
    const subject = `New Event Submission: ${eventDetails.eventName || "Event Request"}`;
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:#330311;color:white;padding:20px;">
          <h1 style="margin:0;">New Event Submission</h1>
        </div>
        <div style="padding:20px;">
          <h2>${eventDetails.eventName || "Event Request"}</h2>
          <p><strong>Type:</strong> ${eventDetails.type === "private" ? "Private" : "Corporate"}</p>
          <p><strong>Category:</strong> ${eventDetails.eventCategory}</p>
          <h3>Client</h3>
          <p><strong>Name:</strong> ${eventDetails.clientName}</p>
          <p><strong>Email:</strong> ${eventDetails.clientEmail}</p>
          <p><strong>Phone:</strong> ${eventDetails.clientPhone || "Not provided"}</p>
          <h3>Event</h3>
          <p><strong>Date:</strong> ${eventDetails.eventDate}</p>
          <p><strong>Location:</strong> ${eventDetails.city}, ${eventDetails.country}</p>
          <p><strong>Guests:</strong> ${eventDetails.guestCount}</p>
          <p><strong>Budget:</strong> ${eventDetails.currency} ${Number(eventDetails.budget).toLocaleString()}</p>
          ${eventDetails.description ? `<p><strong>Notes:</strong> ${eventDetails.description}</p>` : ""}
          <div style="background:#f0f0f0;padding:14px;margin:16px 0;border-radius:4px;">
            <strong>Action:</strong> Assign planner and contact client within 24 hours.
          </div>
        </div>
      </div>`;
    await this.sendEmail(this.ent.email, subject, html);
  }

  async sendContractToClient(clientEmail: string, contractDetails: any, signingLink: string) {
    const subject = "Your Event Contract is Ready for Signing — Event Perfekt";
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:#330311;color:white;padding:20px;text-align:center;">
          <h1 style="margin:0;">Contract Ready for Signing</h1>
        </div>
        <div style="padding:24px;">
          <p>Dear ${contractDetails.clientName},</p>
          <p>Your event contract is ready for review and digital signature:</p>
          <div style="background:#f9f9f9;padding:16px;border-radius:6px;margin:16px 0;">
            <h3 style="margin:0 0 8px;">${contractDetails.eventName}</h3>
            <p style="margin:4px 0;"><strong>Total:</strong> ${contractDetails.currency} ${contractDetails.total?.toLocaleString()}</p>
            <p style="margin:4px 0;"><strong>Deposit:</strong> ${contractDetails.currency} ${contractDetails.deposit?.toLocaleString()}</p>
          </div>
          <div style="text-align:center;margin:28px 0;">
            <a href="${signingLink}" style="background:#8B1538;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">
              Review &amp; Sign Contract
            </a>
          </div>
          <p style="background:#fff3cd;padding:12px;border-radius:4px;">Please review carefully and sign within 7 days to secure your date.</p>
          <p>Questions? Reply to this email or contact us at ${this.ent.email}</p>
          <p>Best regards,<br/><strong>${this.ent.name}</strong></p>
        </div>
      </div>`;
    await this.sendEmail(clientEmail, subject, html);
  }

  async sendContractSignedNotification(plannerEmail: string, contractDetails: any) {
    const subject = `✅ Contract Signed: ${contractDetails.eventName}`;
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:#059669;color:white;padding:20px;">
          <h1 style="margin:0;">Contract Signed Successfully</h1>
        </div>
        <div style="padding:20px;">
          <h2>${contractDetails.eventName}</h2>
          <p>The client has signed the contract. Next steps:</p>
          <ul>
            <li>Process the deposit payment</li>
            <li>Schedule the onboarding call</li>
            <li>Begin detailed event planning</li>
          </ul>
          <p><strong>Total:</strong> ${contractDetails.currency} ${contractDetails.total?.toLocaleString()}</p>
          <p><strong>Deposit:</strong> ${contractDetails.currency} ${contractDetails.deposit?.toLocaleString()}</p>
          <p><strong>Signed:</strong> ${new Date().toLocaleDateString("en-GB")}</p>
        </div>
      </div>`;
    await this.sendEmail(plannerEmail, subject, html);
  }

  async sendDepositConfirmation(clientEmail: string, paymentDetails: any) {
    const subject = "Payment Confirmed — Event Perfekt";
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:#059669;color:white;padding:20px;text-align:center;">
          <h1 style="margin:0;">Payment Confirmed ✓</h1>
        </div>
        <div style="padding:24px;">
          <p>Dear ${paymentDetails.clientName},</p>
          <p>We have received your deposit payment:</p>
          <div style="background:#f9f9f9;padding:16px;border-radius:6px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>Amount:</strong> ${paymentDetails.currency} ${paymentDetails.amount?.toLocaleString()}</p>
            <p style="margin:4px 0;"><strong>Event:</strong> ${paymentDetails.eventName}</p>
            <p style="margin:4px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString("en-GB")}</p>
          </div>
          <p>Your dedicated planner will contact you within 24 hours to schedule your onboarding call.</p>
          <p>Best regards,<br/><strong>${this.ent.name}</strong></p>
        </div>
      </div>`;
    await this.sendEmail(clientEmail, subject, html);
  }

  async sendPaymentReminder(clientEmail: string, paymentDetails: any) {
    const subject = "Payment Reminder — Event Perfekt";
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:#330311;color:white;padding:20px;text-align:center;">
          <h1 style="margin:0;">Payment Reminder</h1>
        </div>
        <div style="padding:24px;">
          <p>Dear ${paymentDetails.clientName},</p>
          <p>This is a friendly reminder about your upcoming payment:</p>
          <div style="background:#f9f9f9;padding:16px;border-radius:6px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>Event:</strong> ${paymentDetails.eventName}</p>
            <p style="margin:4px 0;"><strong>Amount Due:</strong> ${paymentDetails.currency} ${paymentDetails.amount?.toLocaleString()}</p>
            <p style="margin:4px 0;"><strong>Due Date:</strong> ${paymentDetails.dueDate}</p>
          </div>
          ${paymentDetails.paymentLink ? `
          <div style="text-align:center;margin:28px 0;">
            <a href="${paymentDetails.paymentLink}" style="background:#8B1538;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">
              Make Payment Now
            </a>
          </div>` : ""}
          <p>Best regards,<br/><strong>${this.ent.name}</strong></p>
        </div>
      </div>`;
    await this.sendEmail(clientEmail, subject, html);
  }

  async sendCollaboratorInvite(details: {
    toEmail: string;
    invitedByName: string;
    eventName: string;
    role: string;
    inviteLink: string;
    message?: string;
  }) {
    const subject = `You're invited to co-plan "${details.eventName}" — Event Perfekt`;
    const roleLabel =
      details.role === "editor" ? "Editor (can view & edit)" :
      details.role === "viewer" ? "Viewer (view only)" : "Co-Planner (full access)";
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:#330311;padding:20px;text-align:center;">
          <h1 style="color:white;margin:0;">Event Perfekt</h1>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;">Co-Planning Invitation</p>
        </div>
        <div style="padding:28px;background:white;">
          <h2 style="color:#330311;">You've Been Invited to Co-Plan</h2>
          <p><strong>${details.invitedByName}</strong> has invited you to collaborate on <strong>"${details.eventName}"</strong>.</p>
          <div style="background:#f9f9f9;padding:16px;border-radius:6px;margin:16px 0;border-left:4px solid #8B1538;">
            <p style="margin:4px 0;"><strong>Event:</strong> ${details.eventName}</p>
            <p style="margin:4px 0;"><strong>Your Role:</strong> ${roleLabel}</p>
            ${details.message ? `<p style="margin:4px 0;"><strong>Message:</strong> ${details.message}</p>` : ""}
          </div>
          <div style="text-align:center;margin:28px 0;">
            <a href="${details.inviteLink}" style="background:#8B1538;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">
              Accept Invitation
            </a>
          </div>
          <p style="color:#666;font-size:13px;">If you did not expect this invitation, you can safely ignore this email.</p>
          <p>Best regards,<br/><strong>${this.ent.name}</strong></p>
        </div>
      </div>`;
    await this.sendEmail(details.toEmail, subject, html);
  }
}

export const emailService = new EmailNotificationService("GB");
export const emailServiceNG = new EmailNotificationService("NG");
