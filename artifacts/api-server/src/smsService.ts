export interface SMSMessage {
  to: string;
  message: string;
  type?: string;
}

export async function sendSMS(sms: SMSMessage): Promise<{ success: boolean; message: string }> {
  console.log(`[SMS Service] Sending to ${sms.to}: ${sms.message.substring(0, 50)}...`);

  return {
    success: true,
    message: `SMS queued for delivery to ${sms.to}`
  };
}

export async function sendBulkSMS(messages: SMSMessage[]): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const msg of messages) {
    try {
      await sendSMS(msg);
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}