import { emailService } from './emailService';
import { storage } from './storage';

export interface Notification {
  id: string;
  userId: string;
  eventId?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  type: 'milestone' | 'vendor_update' | 'file_upload' | 'budget_change' | 'timeline_update' | 'change_request' | 'event_created';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export class NotificationService {
  private notifications = new Map<string, Notification[]>();

  // Send real-time notification to user
  async sendNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) {
    const newNotification: Notification = {
      id: Math.random().toString(36),
      ...notification,
      read: false,
      createdAt: new Date()
    };

    // Store notification
    if (!this.notifications.has(notification.userId)) {
      this.notifications.set(notification.userId, []);
    }
    this.notifications.get(notification.userId)!.push(newNotification);

    // Send email notification as well
    const user = await storage.getUser(notification.userId);
    if (user && user.email) {
      await this.sendEmailNotification(user.email, newNotification);
    }

    return newNotification;
  }

  // Get notifications for user
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notifications.get(userId) || [];
  }

  // Mark notification as read
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return false;

    const notification = userNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }

  // Send email notification
  private async sendEmailNotification(email: string, notification: Notification) {
    const subject = `Event Perfekt: ${notification.title}`;
    const BASE_URL = 'https://eventperfekt.net';
    const absoluteActionUrl = notification.actionUrl
      ? (notification.actionUrl.startsWith('http') ? notification.actionUrl : `${BASE_URL}${notification.actionUrl}`)
      : null;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: #8B1538; color: white; padding: 20px; text-align: center;">
          <h1>Event Perfekt</h1>
          <h2>${notification.title}</h2>
        </div>
        
        <div style="padding: 20px;">
          <p>${notification.message}</p>
          
          ${absoluteActionUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${absoluteActionUrl}" style="background: #8B1538; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Details
              </a>
            </div>
          ` : ''}
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            You received this notification from Event Perfekt. 
            Log in to your dashboard to manage your preferences.
          </p>
        </div>
      </div>
    `;

    await emailService.sendEmail(email, subject, html);
  }

  // Send milestone update notification
  async notifyMilestoneUpdate(eventId: string, milestone: string, details: string) {
    const event = await storage.getEvent(eventId);
    if (!event) return;

    // Notify client
    if (event.clientId) {
      const client = await storage.getClient(event.clientId);
      if (client) {
        await this.sendNotification({
          userId: event.clientId,
          eventId,
          type: 'milestone',
          title: 'Milestone Updated',
          message: `${milestone} has been updated for ${event.name}. ${details}`,
          actionUrl: `/event-timeline?eventId=${eventId}`
        });
      }
    }

    // Notify planner
    if (event.plannerId) {
      await this.sendNotification({
        userId: event.plannerId,
        eventId,
        type: 'milestone',
        title: 'Milestone Updated',
        message: `Milestone "${milestone}" updated for ${event.name}`,
        actionUrl: `/events/${eventId}`
      });
    }
  }

  // Send vendor confirmation notification
  async notifyVendorConfirmation(eventId: string, vendorName: string, status: string) {
    const event = await storage.getEvent(eventId);
    if (!event) return;

    const message = `Vendor ${vendorName} has been ${status} for ${event.name}`;

    // Notify client
    if (event.clientId) {
      await this.sendNotification({
        userId: event.clientId,
        eventId,
        type: 'vendor_update',
        title: 'Vendor Update',
        message,
        actionUrl: `/event-timeline?eventId=${eventId}`
      });
    }

    // Notify planner
    if (event.plannerId) {
      await this.sendNotification({
        userId: event.plannerId,
        eventId,
        type: 'vendor_update',
        title: 'Vendor Update',
        message,
        actionUrl: `/events/${eventId}`
      });
    }
  }

  // Send file upload notification
  async notifyFileUpload(eventId: string, fileName: string, uploadedBy: string) {
    const event = await storage.getEvent(eventId);
    if (!event) return;

    const uploader = await storage.getUser(uploadedBy);
    const uploaderName = uploader?.name || 'Someone';

    // Notify relevant parties (but not the uploader themselves)
    const recipients = [event.clientId, event.plannerId].filter(id => id && id !== uploadedBy);

    for (const userId of recipients) {
      if (userId) {
        await this.sendNotification({
          userId,
          eventId,
          type: 'file_upload',
          title: 'New File Uploaded',
          message: `${uploaderName} uploaded "${fileName}" for ${event.name}`,
          actionUrl: `/events/${eventId}/files`
        });
      }
    }
  }

  // Send budget change notification
  async notifyBudgetChange(eventId: string, changeDetails: string, newTotal: string) {
    const event = await storage.getEvent(eventId);
    if (!event) return;

    // Notify client about budget changes
    if (event.clientId) {
      await this.sendNotification({
        userId: event.clientId,
        eventId,
        type: 'budget_change',
        title: 'Budget Updated',
        message: `Budget for ${event.name} has been updated. ${changeDetails}. New total: ${newTotal}`,
        actionUrl: `/event-timeline?eventId=${eventId}`
      });
    }
  }

  // Send welcome email with portal details
  async sendWelcomeEmail(clientEmail: string, clientName: string, plannerDetails: any, loginUrl: string) {
    const subject = "Welcome to Event Perfekt - Your Event Planning Portal";
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: #8B1538; color: white; padding: 20px; text-align: center;">
          <h1>Welcome to Event Perfekt</h1>
          <h2>Your Event Planning Journey Begins</h2>
        </div>
        
        <div style="padding: 20px;">
          <p>Dear ${clientName},</p>
          
          <p>Welcome to Event Perfekt! Your event submission has been received and we're excited to help create your perfect event.</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #8B1538; margin-top: 0;">Your Assigned Planner</h3>
            <p><strong>Name:</strong> ${plannerDetails.name}</p>
            <p><strong>Email:</strong> ${plannerDetails.email}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background: #8B1538; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Access Your Event Portal
            </a>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #856404; margin-top: 0;">What's Next?</h4>
            <ul style="color: #856404;">
              <li>Your planner will contact you within 24 hours</li>
              <li>Initial consultation call will be scheduled</li>
              <li>Custom proposal and timeline will be created</li>
              <li>Real-time progress tracking in your portal</li>
            </ul>
          </div>
          
          <p>Your portal includes:</p>
          <ul>
            <li>Real-time event timeline and progress tracking</li>
            <li>Live budget tracker with vendor approvals</li>
            <li>Secure file sharing and document management</li>
            <li>Direct communication with your planning team</li>
            <li>Mobile-friendly access on any device</li>
          </ul>
          
          <p>If you have any immediate questions, please contact your planner or reach out to us at admin@eventperfekt.com</p>
          
          <p>Best regards,<br/>
          The Event Perfekt Team</p>
        </div>
        
        <div style="background: #8B1538; color: white; padding: 10px; text-align: center; font-size: 12px;">
          Event Perfekt - Creating Perfect Moments
        </div>
      </div>
    `;

    await emailService.sendEmail(clientEmail, subject, html);
  }
}

export const notificationService = new NotificationService();