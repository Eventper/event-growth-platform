const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";

interface WhatsAppApiResponse {
  messages?: Array<{ id?: string }>;
  error?: { message?: string };
}

function getConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
  };
}

export function isWhatsAppConfigured(): boolean {
  const config = getConfig();
  return !!(config.accessToken && config.phoneNumberId);
}

export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getConfig();

  if (!config.accessToken || !config.phoneNumberId) {
    console.log(`[WhatsApp] Not configured — logging message to ${to}: ${message}`);
    return { success: true, messageId: `local-${Date.now()}` };
  }

  const phone = to.replace(/[^0-9+]/g, "").replace(/^\+/, "");

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone,
          type: "text",
          text: { preview_url: false, body: message },
        }),
      }
    );

    const data = (await response.json()) as WhatsAppApiResponse;

    if (!response.ok) {
      console.error("[WhatsApp] API error:", data);
      return {
        success: false,
        error: data?.error?.message || `HTTP ${response.status}`,
      };
    }

    const messageId = data?.messages?.[0]?.id || `wa-${Date.now()}`;
    console.log(`[WhatsApp] Sent to ${phone}, message ID: ${messageId}`);
    return { success: true, messageId };
  } catch (error: any) {
    console.error("[WhatsApp] Network error:", error);
    return { success: false, error: error.message || "Network error" };
  }
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = "en",
  parameters: string[] = []
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getConfig();

  if (!config.accessToken || !config.phoneNumberId) {
    console.log(`[WhatsApp] Not configured — logging template "${templateName}" to ${to}`);
    return { success: true, messageId: `local-${Date.now()}` };
  }

  const phone = to.replace(/[^0-9+]/g, "").replace(/^\+/, "");

  const components: any[] = [];
  if (parameters.length > 0) {
    components.push({
      type: "body",
      parameters: parameters.map((p) => ({ type: "text", text: p })),
    });
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            ...(components.length > 0 ? { components } : {}),
          },
        }),
      }
    );

    const data = (await response.json()) as WhatsAppApiResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data?.error?.message || `HTTP ${response.status}`,
      };
    }

    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
