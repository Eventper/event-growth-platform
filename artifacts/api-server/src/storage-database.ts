import {
  users,
  clients,
  events,
  decorVendors,
  tasks,
  budgetItems,
  contracts,
  documents,
  privateEventSubmissions,
  corporateEventSubmissions,
  floorPlans,
  decorPlans,
  enhancedVenueImages,
  vendorUsers,
  gatewayMeetings,
  gatewayMeetingResponses,
  aiSessionSummaries,
  activities,
  activityTemplates,
  phaseSignoffs,
  activityAuditLog,
  savedActivityViews,
  contractChangeLog,
  artifacts,
  eventCollaborators,
  eventPlanningLog,
  eventNotes,
  vendors,
  guests,
  invitations,
  meetings,
  plannerNotes,
  plannerActivityLog,
  venueDesigns,
  vendorDocuments,
  vendorCompliance,
  vendorAgreements,
  vendorNotifications,
  boothBookings,
  boothBookingAuditLog,
  type User,
  type Client,
  type Event,
  type Vendor,
  type DecorVendor,
  type Task,
  type BudgetItem,
  type Contract,
  type Document,
  type InsertUser,
  type InsertClient,
  type InsertEvent,
  type InsertVendor,
  type InsertDecorVendor,
  type InsertTask,
  type InsertBudgetItem,
  type InsertContract,
  type InsertDocument,
  type InsertPrivateEventSubmission,
  type InsertCorporateEventSubmission,
  type Guest,
  type InsertGuest,
  type EventNote,
  type InsertEventNote,
  type Meeting,
  type InsertMeeting,
  type GatewayMeeting,
  type InsertGatewayMeeting,
  type GatewayMeetingResponse,
  type InsertGatewayMeetingResponse,
  type AISessionSummary,
  type InsertAISessionSummary,
  type Activity,
  type InsertActivity,
  type ActivityTemplate,
  type InsertActivityTemplate,
  type PhaseSignoff,
  type InsertPhaseSignoff,
  type ActivityAuditLog,
  type InsertActivityAuditLog,
  type SavedActivityView,
  type InsertSavedActivityView,
  type Artifact,
  type InsertArtifact,
  type EventCollaborator,
  type InsertEventCollaborator,
  type EventPlanningLog,
  type InsertEventPlanningLog,
  type BoothBooking,
  type InsertBoothBooking,
  type PlannerNote,
  type InsertPlannerNote,
  type PlannerActivity,
  type InsertPlannerActivity
} from "@workspace/db";
import { db } from "./db";
import { eq } from "drizzle-orm";

// `vendorUsers` has no exported select/insert types in the schema package,
// so derive them from the table's inferred types here.
type VendorUser = typeof vendorUsers.$inferSelect;
type InsertVendorUser = typeof vendorUsers.$inferInsert;

// Interface for storage operations
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Clients
  getClient(id: string): Promise<Client | undefined>;
  getClientById(id: string): Promise<Client | undefined>;
  getClientByEmail(email: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  getAllClients(): Promise<Client[]>;
  
  // Event submissions
  createPrivateEventSubmission(submission: InsertPrivateEventSubmission): Promise<any>;
  createCorporateEventSubmission(submission: InsertCorporateEventSubmission): Promise<any>;

  // Events
  getEvent(id: string): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;

  // General Event Vendors
  getAllVendors(): Promise<Vendor[]>;
  getVendorsByEventId(eventId: string): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<boolean>;

  // Decor Vendors
  getAllDecorVendors(): Promise<DecorVendor[]>;
  createDecorVendor(vendor: InsertDecorVendor): Promise<DecorVendor>;
  updateDecorVendor(id: string, vendor: Partial<InsertDecorVendor>): Promise<DecorVendor | undefined>;
  deleteDecorVendor(id: string): Promise<boolean>;

  // Tasks
  getTasksByEventId(eventId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Budget
  getBudgetItemsByEventId(eventId: string): Promise<BudgetItem[]>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(id: string, item: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined>;
  deleteBudgetItem(id: string): Promise<boolean>;

  // Contracts
  getContractsByEventId(eventId: string): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: string): Promise<boolean>;

  // Documents
  getDocumentsByEventId(eventId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<boolean>;

  // Event Notes
  getEventNotesByEventId(eventId: string): Promise<EventNote[]>;
  createEventNote(note: InsertEventNote): Promise<EventNote>;
  updateEventNote(id: string, note: Partial<InsertEventNote>): Promise<EventNote | undefined>;
  deleteEventNote(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        role: userData.role || "client"
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Clients
  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientById(id: string): Promise<Client | undefined> {
    return this.getClient(id);
  }

  async getClientByEmail(email: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.email, email));
    return client;
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values(clientData)
      .returning();
    return client;
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }
  
  // Event submissions
  async createPrivateEventSubmission(submission: InsertPrivateEventSubmission): Promise<any> {
    const [result] = await db
      .insert(privateEventSubmissions)
      .values(submission)
      .returning();
    return result;
  }

  async createCorporateEventSubmission(submission: InsertCorporateEventSubmission): Promise<any> {
    const [result] = await db
      .insert(corporateEventSubmissions)
      .values(submission)
      .returning();
    return result;
  }

  // Events
  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(eventData as any)
      .returning();
    return event;
  }

  async updateEvent(id: string, eventData: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set(eventData)
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Vendors
  async getAllVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }

  async getVendorsByEventId(eventId: string): Promise<Vendor[]> {
    return await db.select().from(vendors).where(eq(vendors.eventId, eventId));
  }

  async createVendor(vendorData: InsertVendor): Promise<Vendor> {
    const [vendor] = await db
      .insert(vendors)
      .values(vendorData)
      .returning();
    return vendor;
  }

  async updateVendor(id: string, vendorData: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [vendor] = await db
      .update(vendors)
      .set(vendorData)
      .where(eq(vendors.id, id))
      .returning();
    return vendor;
  }

  async deleteVendor(id: string): Promise<boolean> {
    const result = await db.delete(vendors).where(eq(vendors.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Decor Vendors
  async getAllDecorVendors(): Promise<DecorVendor[]> {
    return await db.select().from(decorVendors);
  }

  async createDecorVendor(vendorData: InsertDecorVendor): Promise<DecorVendor> {
    const [vendor] = await db
      .insert(decorVendors)
      .values(vendorData)
      .returning();
    return vendor;
  }

  async updateDecorVendor(id: string, vendorData: Partial<InsertDecorVendor>): Promise<DecorVendor | undefined> {
    const [vendor] = await db
      .update(decorVendors)
      .set(vendorData)
      .where(eq(decorVendors.id, id as any))
      .returning();
    return vendor;
  }

  async deleteDecorVendor(id: string): Promise<boolean> {
    const result = await db.delete(decorVendors).where(eq(decorVendors.id, id as any));
    return (result.rowCount ?? 0) > 0;
  }

  // Additional methods needed by advanced services
  async getAllPlannerIds(): Promise<string[]> {
    const planners = await db.select({ id: users.id }).from(users).where(eq(users.role, 'planner'));
    return planners.map(p => p.id);
  }

  // Tasks
  async getTasksByEvent(eventId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.eventId, eventId));
  }

  async getTasksByEventId(eventId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.eventId, eventId));
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(taskData)
      .returning();
    return task;
  }

  async updateTask(id: string, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set(taskData)
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Budget Items
  async getBudgetItemsByEvent(eventId: string): Promise<BudgetItem[]> {
    return await db.select().from(budgetItems).where(eq(budgetItems.eventId, eventId));
  }

  async getBudgetItemsByEventId(eventId: string): Promise<BudgetItem[]> {
    return await db.select().from(budgetItems).where(eq(budgetItems.eventId, eventId));
  }

  async createBudgetItem(itemData: InsertBudgetItem): Promise<BudgetItem> {
    const [item] = await db
      .insert(budgetItems)
      .values(itemData)
      .returning();
    return item;
  }

  async updateBudgetItem(id: string, itemData: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined> {
    const [item] = await db
      .update(budgetItems)
      .set(itemData)
      .where(eq(budgetItems.id, id))
      .returning();
    return item;
  }

  async deleteBudgetItem(id: string): Promise<boolean> {
    const result = await db.delete(budgetItems).where(eq(budgetItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Contracts
  async getContractsByEvent(eventId: string): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.eventId, eventId));
  }

  async getContractsByEventId(eventId: string): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.eventId, eventId));
  }

  async getContractById(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async getAllContracts(): Promise<Contract[]> {
    return await db.select().from(contracts);
  }

  async createContract(contractData: InsertContract): Promise<Contract> {
    const [contract] = await db
      .insert(contracts)
      .values(contractData)
      .returning();
    return contract;
  }

  async updateContract(id: string, contractData: Partial<InsertContract>): Promise<Contract | undefined> {
    const [contract] = await db
      .update(contracts)
      .set(contractData)
      .where(eq(contracts.id, id))
      .returning();
    return contract;
  }

  async deleteContract(id: string): Promise<boolean> {
    const result = await db.delete(contracts).where(eq(contracts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Documents
  async getDocumentsByEventId(eventId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.eventId, eventId));
  }

  async createDocument(documentData: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(documentData)
      .returning();
    return document;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id as any));
    return (result.rowCount ?? 0) > 0;
  }

  // ============================================================================
  // VENDOR PORTAL METHODS
  // ============================================================================

  async getFloorPlansByEvent(eventId: string): Promise<any[]> {
    return db.select().from(floorPlans).where(eq(floorPlans.eventId, eventId));
  }

  async createFloorPlan(data: any): Promise<any> {
    const [plan] = await db.insert(floorPlans).values(data).returning();
    return plan;
  }

  async createVendorUser(data: any): Promise<VendorUser> {
    const [vendorUser] = await db.insert(vendorUsers).values(data).returning();
    return vendorUser;
  }

  async getVendorUserByEmail(email: string): Promise<VendorUser | undefined> {
    const [vendorUser] = await db.select().from(vendorUsers).where(eq(vendorUsers.email, email));
    return vendorUser;
  }

  async updateVendorUser(id: string, data: any): Promise<VendorUser> {
    const [updated] = await db.update(vendorUsers).set({ ...data, updatedAt: new Date() }).where(eq(vendorUsers.id, id)).returning();
    return updated;
  }

  async createVendorDocument(data: any): Promise<any> {
    const [doc] = await db.insert(vendorDocuments).values(data).returning();
    return doc;
  }

  async getVendorDocuments(vendorUserId: string): Promise<any[]> {
    return db.select().from(vendorDocuments).where(eq(vendorDocuments.vendorUserId, vendorUserId));
  }

  async getVendorCompliance(vendorUserId: string): Promise<any[]> {
    return db.select().from(vendorCompliance).where(eq(vendorCompliance.vendorUserId, vendorUserId));
  }

  async getVendorAgreements(vendorUserId: string): Promise<any[]> {
    return db.select().from(vendorAgreements).where(eq(vendorAgreements.vendorUserId, vendorUserId));
  }

  async getVendorNotifications(vendorUserId: string): Promise<any[]> {
    return db.select().from(vendorNotifications).where(eq(vendorNotifications.vendorUserId, vendorUserId));
  }

  async createVendorNotification(data: any): Promise<any> {
    const [notif] = await db.insert(vendorNotifications).values(data).returning();
    return notif;
  }

  async getVenueDesignsByEvent(eventId: string): Promise<any[]> {
    return db.select().from(venueDesigns).where(eq(venueDesigns.eventId, eventId));
  }

  async createVenueDesign(data: any): Promise<any> {
    const [design] = await db.insert(venueDesigns).values(data).returning();
    return design;
  }

  async getDecorCatalog(): Promise<any[]> {
    const allVendors = await db.select().from(decorVendors);
    const catalogItems: any[] = [];
    for (const vendor of allVendors) {
      if ((vendor as any).itemImages && Array.isArray((vendor as any).itemImages)) {
        for (const item of (vendor as any).itemImages) {
          catalogItems.push({ ...item, vendorId: vendor.id, vendorName: vendor.name });
        }
      }
    }
    return catalogItems;
  }

  async createDecorItem(data: any): Promise<any> {
    return data;
  }

  async getDecorPlansByEvent(eventId: string): Promise<any[]> {
    return db.select().from(decorPlans).where(eq(decorPlans.eventId, eventId));
  }

  async generateDecorPlan(params: { eventId?: string; eventDetails?: any; preferences?: any; catalogItems?: any[] }): Promise<any> {
    const style = params.preferences?.style || params.eventDetails?.style || 'Elegant';
    const budget = params.eventDetails?.budget || 50000;
    const eventType = params.eventDetails?.eventType || 'Corporate Event';
    const colors = params.preferences?.colorScheme || ['#330311', '#FFFFFF', '#D4AF37'];

    const categories = [
      {
        category: 'Centerpieces & Table Decor',
        items: [
          { name: 'Premium Floral Centerpiece', quantity: 20, unitCost: 150, total: 3000, description: 'Elegant mixed floral arrangement with seasonal blooms' },
          { name: 'Table Runner (Velvet)', quantity: 20, unitCost: 45, total: 900, description: 'Luxury velvet table runners in accent color' },
          { name: 'Candle Holders (Set of 3)', quantity: 20, unitCost: 35, total: 700, description: 'Crystal candle holders with LED candles' },
          { name: 'Place Card Holders', quantity: 300, unitCost: 3, total: 900, description: 'Branded metallic place card holders' },
        ],
        subtotal: 5500
      },
      {
        category: 'Lighting',
        items: [
          { name: 'Uplighting Package', quantity: 24, unitCost: 75, total: 1800, description: 'LED uplighting in brand colors around perimeter' },
          { name: 'Fairy Light Canopy', quantity: 4, unitCost: 350, total: 1400, description: 'Overhead warm white fairy light canopy sections' },
          { name: 'Pin Spot Lighting', quantity: 20, unitCost: 25, total: 500, description: 'Pin spots for each centerpiece' },
          { name: 'Gobo Projection', quantity: 2, unitCost: 200, total: 400, description: 'Custom gobo projections with event branding' },
        ],
        subtotal: 4100
      },
      {
        category: 'Draping & Fabric',
        items: [
          { name: 'Ceiling Draping', quantity: 6, unitCost: 400, total: 2400, description: 'Flowing sheer fabric ceiling drapes' },
          { name: 'Backdrop Panel', quantity: 1, unitCost: 1500, total: 1500, description: 'Custom branded backdrop for stage/photo area' },
          { name: 'Chair Covers & Sashes', quantity: 300, unitCost: 8, total: 2400, description: 'Premium chair covers with colored sashes' },
        ],
        subtotal: 6300
      },
      {
        category: 'Entrance & Signage',
        items: [
          { name: 'Welcome Arch', quantity: 1, unitCost: 800, total: 800, description: 'Floral and greenery welcome arch at entrance' },
          { name: 'Directional Signage', quantity: 6, unitCost: 75, total: 450, description: 'Elegant event directional signs' },
          { name: 'Event Banner', quantity: 2, unitCost: 250, total: 500, description: 'Large format branded banners' },
        ],
        subtotal: 1750
      },
      {
        category: 'Lounge & Accent Pieces',
        items: [
          { name: 'Cocktail Table Setup', quantity: 8, unitCost: 120, total: 960, description: 'High cocktail tables with linen covers' },
          { name: 'Lounge Furniture Set', quantity: 2, unitCost: 650, total: 1300, description: 'Sofa, 2 armchairs, coffee table set' },
          { name: 'Accent Greenery', quantity: 12, unitCost: 85, total: 1020, description: 'Potted plants and greenery arrangements' },
        ],
        subtotal: 3280
      },
    ];

    const totalBudget = categories.reduce((sum, c) => sum + c.subtotal, 0);

    const plan = {
      theme: `${style} ${eventType} Design`,
      style,
      eventType,
      colorPalette: colors,
      categories,
      totalBudget,
      budgetUtilization: Math.round((totalBudget / budget) * 100),
      recommendations: [
        'Consider seasonal flowers to reduce centerpiece costs',
        'LED candles are safer and more cost-effective than real candles',
        'Reuse entrance arch flowers for after-party table arrangements',
        `Color scheme ${colors.join(', ')} creates a cohesive ${style.toLowerCase()} atmosphere`,
      ],
    };

    if (params.eventId) {
      const [saved] = await db.insert(decorPlans).values({
        eventId: params.eventId,
        theme: plan.theme,
        style: plan.style,
        colorPalette: plan.colorPalette,
        totalBudget: String(plan.totalBudget),
        items: plan.categories,
        preferences: params.preferences || null,
        status: 'draft',
      } as any).returning();
      return { ...plan, id: saved.id };
    }

    return plan;
  }

  async updateDecorPlan(planId: string, data: any): Promise<any> {
    const [updated] = await db.update(decorPlans).set({ ...data, updatedAt: new Date() }).where(eq(decorPlans.id, planId as any)).returning();
    return updated;
  }

  async getVenueImagesByEvent(eventId: string): Promise<any[]> {
    return db.select().from(enhancedVenueImages).where(eq(enhancedVenueImages.eventId, eventId));
  }

  async createVenueImage(data: any): Promise<any> {
    const [image] = await db.insert(enhancedVenueImages).values(data).returning();
    return image;
  }

  async getGuestsByEvent(eventId: string): Promise<Guest[]> {
    return db.select().from(guests).where(eq(guests.eventId, eventId));
  }

  async getGuest(guestId: string): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.id, guestId));
    return guest;
  }

  async getGuestByToken(token: string): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.rsvpToken, token));
    return guest;
  }

  async getGuestByEmailAndEvent(email: string, eventId: string): Promise<Guest | undefined> {
    const allGuests = await db.select().from(guests).where(eq(guests.eventId, eventId));
    return allGuests.find(g => g.email?.toLowerCase() === email.toLowerCase());
  }

  async createGuest(data: InsertGuest): Promise<Guest> {
    const token = `rsvp_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
    const [guest] = await db.insert(guests).values({ ...data, rsvpToken: token }).returning();
    return guest;
  }

  async createGuestsBulk(guestList: InsertGuest[]): Promise<Guest[]> {
    const withTokens = guestList.map(g => ({
      ...g,
      rsvpToken: `rsvp_${Date.now()}_${Math.random().toString(36).substr(2, 12)}_${Math.random().toString(36).substr(2, 4)}`
    }));
    return db.insert(guests).values(withTokens).returning();
  }

  async updateGuest(guestId: string, data: Partial<Guest>): Promise<Guest> {
    const [updated] = await db.update(guests).set({ ...data, updatedAt: new Date() } as any).where(eq(guests.id, guestId)).returning();
    return updated;
  }

  async deleteGuest(guestId: string): Promise<void> {
    await db.delete(guests).where(eq(guests.id, guestId));
  }

  async getInvitationsByEvent(eventId: string): Promise<any[]> {
    return db.select().from(invitations).where(eq(invitations.eventId, eventId));
  }

  async getInvitation(id: string): Promise<any | undefined> {
    const [inv] = await db.select().from(invitations).where(eq(invitations.id, id));
    return inv;
  }

  async createInvitation(data: any): Promise<any> {
    const [inv] = await db.insert(invitations).values(data).returning();
    return inv;
  }

  async updateInvitation(id: string, data: any): Promise<any> {
    const [inv] = await db.update(invitations).set({ ...data, updatedAt: new Date() }).where(eq(invitations.id, id)).returning();
    return inv;
  }

  async deleteInvitation(id: string): Promise<void> {
    await db.delete(invitations).where(eq(invitations.id, id));
  }

  async getEventNotesByEventId(eventId: string): Promise<EventNote[]> {
    return db.select().from(eventNotes).where(eq(eventNotes.eventId, eventId));
  }

  async createEventNote(note: InsertEventNote): Promise<EventNote> {
    const [created] = await db.insert(eventNotes).values(note).returning();
    return created;
  }

  async updateEventNote(id: string, note: Partial<InsertEventNote>): Promise<EventNote | undefined> {
    const [updated] = await db.update(eventNotes).set({ ...note, updatedAt: new Date() }).where(eq(eventNotes.id, id as any)).returning();
    return updated;
  }

  async deleteEventNote(id: string): Promise<boolean> {
    const result = await db.delete(eventNotes).where(eq(eventNotes.id, id as any));
    return true;
  }

  async getArtifacts(eventId: string, category?: string): Promise<Artifact[]> {
    if (category) {
      const { and } = await import("drizzle-orm");
      return db.select().from(artifacts).where(and(eq(artifacts.eventId, eventId), eq(artifacts.category, category)));
    }
    return db.select().from(artifacts).where(eq(artifacts.eventId, eventId));
  }

  async getAllArtifacts(): Promise<Artifact[]> {
    return db.select().from(artifacts);
  }

  async getArtifact(id: string): Promise<Artifact | undefined> {
    const [artifact] = await db.select().from(artifacts).where(eq(artifacts.id, id as any));
    return artifact;
  }

  async createArtifact(artifact: InsertArtifact): Promise<Artifact> {
    const [created] = await db.insert(artifacts).values(artifact).returning();
    return created;
  }

  async deleteArtifact(id: string): Promise<boolean> {
    await db.delete(artifacts).where(eq(artifacts.id, id as any));
    return true;
  }

  async getEventCollaborators(eventId: string): Promise<EventCollaborator[]> {
    return db.select().from(eventCollaborators).where(eq(eventCollaborators.eventId, eventId));
  }

  async getCollaboratorById(id: string): Promise<EventCollaborator | undefined> {
    const [collab] = await db.select().from(eventCollaborators).where(eq(eventCollaborators.id, id as any));
    return collab;
  }

  async getCollaboratorByToken(token: string): Promise<EventCollaborator | undefined> {
    const [collab] = await db.select().from(eventCollaborators).where(eq((eventCollaborators as any).inviteToken, token));
    return collab;
  }

  async getCollaborationsByEmail(email: string): Promise<EventCollaborator[]> {
    return db.select().from(eventCollaborators).where(eq((eventCollaborators as any).email, email));
  }

  async createEventCollaborator(collaborator: InsertEventCollaborator): Promise<EventCollaborator> {
    const [created] = await db.insert(eventCollaborators).values(collaborator).returning();
    return created;
  }

  async updateEventCollaborator(id: string, data: Partial<EventCollaborator>): Promise<EventCollaborator | undefined> {
    const [updated] = await db.update(eventCollaborators).set(data).where(eq(eventCollaborators.id, id as any)).returning();
    return updated;
  }

  async deleteEventCollaborator(id: string): Promise<boolean> {
    await db.delete(eventCollaborators).where(eq(eventCollaborators.id, id as any));
    return true;
  }

  async createPlanningLogEntry(entry: any): Promise<any> {
    try {
      const [created] = await db.insert(eventPlanningLog).values({
        eventId: entry.eventId,
        category: entry.category || 'general',
        action: entry.action || 'update',
        description: entry.description || '',
        entityType: entry.entityType,
        entityId: entry.entityId,
        entityName: entry.entityName,
        changedBy: entry.changedBy,
        changedByName: entry.changedByName,
        fieldsChanged: entry.fieldsChanged,
        decisionType: entry.decisionType,
        decisionRationale: entry.decisionRationale,
        impact: entry.impact,
        priority: entry.priority || 'normal',
        tags: entry.tags || [],
        metadata: entry.metadata,
      }).returning();
      return created;
    } catch (error) {
      console.error('Planning log entry error:', error);
      return { id: 'error', ...entry };
    }
  }

  async getEventPlanningLog(eventId: string, filters?: any): Promise<any[]> {
    let logs = await db.select().from(eventPlanningLog).where(eq(eventPlanningLog.eventId, eventId));
    if (filters?.category) {
      logs = logs.filter(log => log.category === filters.category);
    }
    if (filters?.entityType) {
      logs = logs.filter(log => log.entityType === filters.entityType);
    }
    return logs.sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());
  }

  async getDecisionLog(eventId: string): Promise<any[]> {
    const logs = await db.select().from(eventPlanningLog).where(eq(eventPlanningLog.eventId, eventId));
    return logs
      .filter(log => log.decisionType)
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());
  }

  // Meetings
  async getMeetingsByEventId(eventId: string): Promise<Meeting[]> {
    return db.select().from(meetings).where(eq(meetings.eventId, eventId));
  }
  async createMeeting(data: InsertMeeting): Promise<Meeting> {
    const [meeting] = await db.insert(meetings).values(data).returning();
    return meeting;
  }
  async getMeetingById(id: string): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting;
  }
  async updateMeeting(id: string, data: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const [meeting] = await db.update(meetings).set(data).where(eq(meetings.id, id)).returning();
    return meeting;
  }
  async deleteMeeting(id: string): Promise<boolean> {
    const result = await db.delete(meetings).where(eq(meetings.id, id)).returning();
    return result.length > 0;
  }

  // Planner Notes
  async getPlannerNotes(plannerId: string, section?: string, eventId?: string): Promise<PlannerNote[]> {
    const notes = await db.select().from(plannerNotes).where(eq(plannerNotes.plannerId, plannerId));
    return notes.filter(n => {
      if (section && n.section !== section) return false;
      if (eventId && n.eventId !== eventId) return false;
      return true;
    });
  }
  async createPlannerNote(data: InsertPlannerNote): Promise<PlannerNote> {
    const [note] = await db.insert(plannerNotes).values(data).returning();
    return note;
  }
  async updatePlannerNote(id: string, data: Partial<InsertPlannerNote>): Promise<PlannerNote | undefined> {
    const [note] = await db.update(plannerNotes).set(data).where(eq(plannerNotes.id, id)).returning();
    return note;
  }
  async deletePlannerNote(id: string): Promise<boolean> {
    const result = await db.delete(plannerNotes).where(eq(plannerNotes.id, id)).returning();
    return result.length > 0;
  }

  // Planner Activity
  async createPlannerActivity(data: InsertPlannerActivity): Promise<PlannerActivity> {
    const [entry] = await db.insert(plannerActivityLog).values(data).returning();
    return entry;
  }
  async getPlannerActivities(plannerId: string, sessionId?: string): Promise<PlannerActivity[]> {
    const entries = await db.select().from(plannerActivityLog).where(eq(plannerActivityLog.plannerId, plannerId));
    return sessionId ? entries.filter(e => e.sessionId === sessionId) : entries;
  }

  // AI Session Summary
  async getAISessionSummary(plannerId: string, sessionId: string): Promise<AISessionSummary | undefined> {
    const [summary] = await db.select().from(aiSessionSummaries)
      .where(eq(aiSessionSummaries.plannerId, plannerId));
    return (summary as any)?.sessionId === sessionId ? summary : undefined;
  }
  async createAISessionSummary(data: InsertAISessionSummary): Promise<AISessionSummary> {
    const [summary] = await db.insert(aiSessionSummaries).values(data).returning();
    return summary;
  }
  async updateAISessionSummary(id: string, data: Partial<InsertAISessionSummary>): Promise<AISessionSummary | undefined> {
    const [summary] = await db.update(aiSessionSummaries).set(data).where(eq(aiSessionSummaries.id, id as any)).returning();
    return summary;
  }

  // Activities
  async getActivitiesByEventId(eventId: string): Promise<Activity[]> {
    return db.select().from(activities).where(eq(activities.eventId, eventId));
  }
  async createActivity(data: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(data).returning();
    return activity;
  }
  async updateActivity(id: string, data: Partial<InsertActivity>): Promise<Activity | undefined> {
    const [activity] = await db.update(activities).set(data).where(eq(activities.id, id as any)).returning();
    return activity;
  }
  async deleteActivity(id: string): Promise<boolean> {
    const result = await db.delete(activities).where(eq(activities.id, id as any)).returning();
    return result.length > 0;
  }

  // Activity Templates
  async getActivityTemplates(phase?: string, eventType?: string): Promise<ActivityTemplate[]> {
    const templates = await db.select().from(activityTemplates);
    return templates.filter((t: any) => {
      if (phase && t.phase !== phase) return false;
      if (eventType && t.eventTypes && !t.eventTypes.includes(eventType)) return false;
      return true;
    });
  }
  async createActivityTemplate(data: InsertActivityTemplate): Promise<ActivityTemplate> {
    const [template] = await db.insert(activityTemplates).values(data).returning();
    return template;
  }
  async seedActivityTemplates(): Promise<void> {
    // No-op if already seeded
  }
  async instantiateActivitiesFromTemplates(eventId: string, eventType: string): Promise<Activity[]> {
    const templates = await this.getActivityTemplates(undefined, eventType);
    const created: Activity[] = [];
    for (const t of templates as any[]) {
      const activity = await this.createActivity({
        eventId,
        taskName: t.taskName,
        phase: t.phase,
        description: t.description,
        defaultOwner: t.defaultOwner,
        priority: t.defaultPriority,
      } as any as InsertActivity);
      created.push(activity);
    }
    return created;
  }

  // Phase Sign-offs
  async getPhaseSignoffs(eventId: string): Promise<PhaseSignoff[]> {
    return db.select().from(phaseSignoffs).where(eq(phaseSignoffs.eventId, eventId));
  }
  async createPhaseSignoff(data: InsertPhaseSignoff): Promise<PhaseSignoff> {
    const [signoff] = await db.insert(phaseSignoffs).values(data).returning();
    return signoff;
  }
  async getPhaseProgress(eventId: string, phase: string): Promise<{ completed: number; total: number; percentage: number }> {
    const phaseActivities = await db.select().from(activities)
      .where(eq(activities.eventId, eventId));
    const filtered = phaseActivities.filter((a: any) => a.phase === phase);
    const total = filtered.length;
    const completed = filtered.filter(a => a.status === 'completed' || a.status === 'done').length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }

  // Activity Audit Log
  async createActivityAuditLog(data: InsertActivityAuditLog): Promise<ActivityAuditLog> {
    const [entry] = await db.insert(activityAuditLog).values(data).returning();
    return entry;
  }
  async getActivityAuditLog(activityId: string): Promise<ActivityAuditLog[]> {
    return db.select().from(activityAuditLog).where(eq(activityAuditLog.activityId, activityId as any));
  }

  // Saved Activity Views
  async getSavedActivityViews(userId: string): Promise<SavedActivityView[]> {
    return db.select().from(savedActivityViews).where(eq(savedActivityViews.userId, userId));
  }
  async createSavedActivityView(data: InsertSavedActivityView): Promise<SavedActivityView> {
    const [view] = await db.insert(savedActivityViews).values(data).returning();
    return view;
  }
  async updateSavedActivityView(id: string, data: Partial<InsertSavedActivityView>): Promise<SavedActivityView | undefined> {
    const [view] = await db.update(savedActivityViews).set(data).where(eq(savedActivityViews.id, id as any)).returning();
    return view;
  }
  async deleteSavedActivityView(id: string): Promise<boolean> {
    const result = await db.delete(savedActivityViews).where(eq(savedActivityViews.id, id as any)).returning();
    return result.length > 0;
  }

  // Contract Change Log
  async getContractChangeLog(contractId: string): Promise<any[]> {
    return db.select().from(contractChangeLog).where(eq(contractChangeLog.contractId, contractId));
  }
  async createContractChangeLogEntry(data: any): Promise<any> {
    const [entry] = await db.insert(contractChangeLog).values(data).returning();
    return entry;
  }
  async approveContractChange(changeId: string, approvedBy: string, approvedByName: string, notes?: string): Promise<any> {
    const [entry] = await db.update(contractChangeLog)
      .set({ approvalStatus: 'approved', approvedBy, approvedByName, approvalNotes: notes, approvalDate: new Date() })
      .where(eq(contractChangeLog.id, changeId as any))
      .returning();
    return entry;
  }
  async rejectContractChange(changeId: string, rejectedBy: string, rejectedByName: string, notes?: string): Promise<any> {
    const [entry] = await db.update(contractChangeLog)
      .set({ approvalStatus: 'rejected', approvedBy: rejectedBy, approvedByName: rejectedByName, approvalNotes: notes, approvalDate: new Date() })
      .where(eq(contractChangeLog.id, changeId as any))
      .returning();
    return entry;
  }

  // Booth Bookings
  async getBoothBooking(token: string): Promise<any | undefined> {
    const [booking] = await db.select().from(boothBookings).where(eq(boothBookings.token, token));
    return booking;
  }
  async getBoothBookings(): Promise<any[]> {
    return db.select().from(boothBookings).orderBy(boothBookings.createdAt);
  }
  async createBoothBooking(data: InsertBoothBooking): Promise<any> {
    const [booking] = await db.insert(boothBookings).values(data as any).returning();
    return booking;
  }
  async updateBoothBooking(id: string, data: any): Promise<any | undefined> {
    const [booking] = await db.update(boothBookings).set(data).where(eq(boothBookings.id, id)).returning();
    return booking;
  }

  // Booth Booking Audit Log
  async createBoothBookingAuditLog(entry: any): Promise<any> {
    const [record] = await db.insert(boothBookingAuditLog).values(entry).returning();
    return record;
  }
  async getBoothBookingAuditLog(bookingId: string): Promise<any[]> {
    return db.select().from(boothBookingAuditLog)
      .where(eq(boothBookingAuditLog.bookingId, bookingId))
      .orderBy(boothBookingAuditLog.createdAt);
  }
}

export const storage = new DatabaseStorage();