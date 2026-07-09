import { sendMail } from "./emailService";
// All emails use GB entity by default (adminuk@eventperfekt.com), CC info@eventperfekt.com

// Legacy EmailService class — wraps the unified sendMail helper.
// All new code should use emailService from emailService.ts directly.
export class EmailService {
  static async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#330311;color:white;padding:20px;text-align:center;">
          <h1>Welcome to Event Perfekt!</h1>
          <p style="opacity:0.8;">...making yours perfekt</p>
        </div>
        <div style="padding:24px;">
          <h2>Hello ${name},</h2>
          <p>Thank you for choosing Event Perfekt. Our team of expert planners is ready to help you create unforgettable moments.</p>
          <ul>
            <li>Submit your event details through our planning forms</li>
            <li>Our planners will review and contact you within 24 hours</li>
            <li>We'll work together to bring your vision to life</li>
          </ul>
          <p>Best regards,<br/>The Event Perfekt Team</p>
        </div>
        <div style="background:#330311;color:white;padding:10px;text-align:center;font-size:12px;">
          Event Perfekt Global Ltd · 20 Wenlock Road, London N1 7PG
        </div>
      </div>`;
    await sendMail(email, "Welcome to Event Perfekt!", html);
  }

  static async sendEventSubmissionConfirmation(email: string, eventType: string): Promise<void> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#330311;color:white;padding:20px;text-align:center;">
          <h1>Event Submission Received</h1>
        </div>
        <div style="padding:24px;">
          <p>Thank you for submitting your ${eventType} event details.</p>
          <p>Our planning team has received your submission and will review it carefully.</p>
          <ul>
            <li>We'll contact you within 24–48 hours</li>
            <li>We'll schedule a consultation to discuss your vision</li>
            <li>You'll receive a detailed proposal within 5–7 business days</li>
          </ul>
          <p>Questions? Email us at adminuk@eventperfekt.com</p>
          <p>Best regards,<br/>The Event Perfekt Team</p>
        </div>
      </div>`;
    await sendMail(email, "Event Submission Received — Event Perfekt", html);
  }

  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL || "https://eventperfekt.net"}/reset-password?token=${resetToken}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#330311;color:white;padding:20px;text-align:center;">
          <h1>Password Reset Request</h1>
        </div>
        <div style="padding:24px;">
          <p>You requested to reset your Event Perfekt password. Click the button below:</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}" style="background:#330311;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">
              Reset Password
            </a>
          </div>
          <p style="background:#fff3cd;padding:12px;border-radius:4px;">If you did not request this, please ignore this email. This link expires in 1 hour.</p>
          <p>Best regards,<br/>The Event Perfekt Team</p>
        </div>
      </div>`;
    await sendMail(email, "Reset Your Password — Event Perfekt", html);
  }
}
