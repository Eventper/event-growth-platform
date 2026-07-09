import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

export function registerChatRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(String(req.params.id));
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      return res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(String(req.params.id));
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming)
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(String(req.params.id));
      const { content, pageContext } = req.body;
      const openai = getOpenAIClient();

      if (!openai) {
        return res.status(503).json({
          error: "AI chat is unavailable because OPENAI_API_KEY is not configured.",
        });
      }

      // Save user message
      await chatStorage.createMessage(conversationId, "user", content);

      // Get conversation history for context
      const messages = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const pageContextMap: Record<string, string> = {
        "/planner-dashboard": "The user is on the main Planner Dashboard. Help them understand their overview stats, upcoming events, and pending tasks. Remind them to check overdue tasks, unsigned contracts, and unpaid invoices.",
        "/create-event": "The user is creating a new event. Guide them through event details (name, type, date, venue, budget). Remind them to complete all required fields and consider guest count for budget estimation.",
        "/budget-management": "The user is managing budgets. Help with cost estimation, category allocation, and tracking. Remind them about unallocated budget items and vendor payment schedules.",
        "/vendor-management": "The user is managing vendors. Help with vendor selection, comparison, and contract management. Remind them about vendors without contracts or pending payments.",
        "/contract-management": "The user is managing contracts. Help with contract terms, templates, and signing workflows. Remind them about unsigned contracts and approaching expiry dates.",
        "/invoicing": "The user is working with invoices. Help with invoice creation, payment tracking, and follow-ups. Remind them about overdue invoices and pending payments.",
        "/guest-hub": "The user is managing guests. Help with guest list management, RSVP tracking, seating arrangements, and dietary requirements.",
        "/decor-inventory": "The user is managing decor inventory. Help with inventory tracking, checkout/return workflows, and condition assessments. Remind them about overdue returns and low stock items.",
        "/calendar": "The user is viewing the calendar. Help with scheduling, date conflicts, and timeline planning.",
        "/financial-dashboard": "The user is reviewing financials. Help with P&L analysis, revenue tracking, and financial reporting.",
        "/lead-pipeline": "The user is managing leads. Help with lead qualification, follow-up strategies, and conversion tactics.",
        "/employee-management": "The user is managing employees. Help with team organization, roles, and HR tasks.",
        "/onboarding": "The user is on the onboarding portal. Help with training modules, orientation tasks, and getting started.",
        "/event-checklist": "The user is working with checklists. Help prioritize tasks and ensure nothing is missed before the event.",
        "/proposals": "The user is building proposals. Help craft compelling event proposals with proper pricing and scope.",
        "/email-campaigns": "The user is managing email campaigns. Help with campaign strategy, audience segmentation, and content.",
        "/automation": "The user is setting up automation rules. Help define triggers and actions for streamlined workflows.",
        "/souvenirs-gifts": "The user is managing souvenirs and gifts. Help with product selection, quantities, and budgeting.",
        "/documents": "The user is in document storage. Help organize files and remind about pending document requests.",
        "/prospect-finder": "The user is finding new business prospects. Help with prospect research, outreach strategies, and qualification.",
        "/tender-dashboard": "The user is in the Tender Manager. Help with bid writing, tender tracking, and submission deadlines.",
        "/expense-tracker": "The user is tracking expenses. Help with expense categorization, receipt management, and reporting.",
        "/photo-gallery": "The user is managing photos/videos. Help with gallery organization and event documentation.",
        "/survey-builder": "The user is building surveys. Help design effective post-event surveys and feedback forms.",
        "/print-materials": "The user is creating print materials. Help with place cards, badges, table numbers, and signage.",
        "/run-sheet": "The user is managing the day-of run sheet. Help with timing, transitions, and contingency planning.",
      };

      let contextualInstruction = "";
      if (pageContext) {
        const pageHelp = pageContextMap[pageContext] || `The user is currently on the ${pageContext} page.`;
        contextualInstruction = `\n\nCURRENT PAGE CONTEXT: ${pageHelp}\nAdapt your responses to be relevant to what they're currently working on. If they ask a general question, still consider the page context for more targeted advice. Proactively suggest tips and remind them about common tasks they might forget on this page.`;
      }

      const systemMessage = {
        role: "system" as const,
        content: `You are the Event Perfekt Agent Research — an expert in event planning, management, and coordination. You help professional event planners with:

- Venue research and recommendations
- Vendor sourcing and comparison
- Budget planning and cost estimation
- Event design trends and inspiration
- Cultural traditions and customs for different event types
- Timeline and logistics planning
- Guest management best practices
- Catering and menu planning
- Entertainment and programme ideas
- Corporate event strategy
- Wedding planning traditions (Nigerian, UK, international)
- Decor themes, colour palettes, and styling
- Marketing and branding for events
- Risk management and contingency planning

Always provide detailed, actionable advice. When discussing costs, consider both Nigerian Naira (NGN) and British Pounds (GBP) markets. Be professional yet warm in tone. Reference industry best practices and current trends.${contextualInstruction}`
      };

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [systemMessage, ...chatMessages],
        stream: true,
        max_completion_tokens: 4096,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save assistant message
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      // Check if headers already sent (SSE streaming started)
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}

