import { 
  type User, 
  type Client,
  type Event, 
  type Vendor, 
  type DecorVendor,
  type Task, 
  type BudgetItem, 
  type Contract,
  type Document,
  type EventNote,
  type Meeting,
  type InsertUser, 
  type InsertClient,
  type InsertEvent, 
  type InsertVendor,
  type InsertDecorVendor,
  type InsertTask, 
  type InsertBudgetItem, 
  type InsertContract,
  type InsertDocument,
  type InsertEventNote,
  type InsertMeeting,
  type DecorItem,
  type InsertDecorItem,
  type PlannerNote,
  type InsertPlannerNote,
  type PlannerActivity,
  type InsertPlannerActivity,
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
  type IamHerTask,
  type InsertIamHerTask,
  type IamHerDocument,
  type InsertIamHerDocument,
  type IamHerMessage,
  type InsertIamHerMessage,
  type IamHerSummaryCache,
  type InsertIamHerSummaryCache,
  type VenueDesign,
  type InsertVenueDesign,
  invoices,
  proposals,
  decorPlans,
  floorPlans,
  enhancedVenueImages,
} from "@workspace/db";
import { randomUUID } from "crypto";

// Local type aliases derived from the real Drizzle tables. The schema does not
// export hand-written select/insert types for these tables, so infer them here
// to stay aligned with the actual column types.
type Invoice = typeof invoices.$inferSelect;
type InsertInvoice = typeof invoices.$inferInsert;
type Proposal = typeof proposals.$inferSelect;
type InsertProposal = typeof proposals.$inferInsert;
type DecorPlan = typeof decorPlans.$inferSelect;
type InsertDecorPlan = typeof decorPlans.$inferInsert;
type FloorPlan = typeof floorPlans.$inferSelect;
type InsertFloorPlan = typeof floorPlans.$inferInsert;
type VenueImage = typeof enhancedVenueImages.$inferSelect;
type InsertVenueImage = typeof enhancedVenueImages.$inferInsert;

// The in-memory mock stores objects richer than the minimal Drizzle tables
// (these extra fields are produced by seed/instantiate helpers at runtime).
type RichActivity = Activity & { phase?: string | null };
type RichActivityTemplate = ActivityTemplate & {
  phase?: string | null;
  eventTypes?: string[] | null;
  sortOrder?: number | null;
};

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getAllPlannerIds(): Promise<string[]>;

  // Clients
  getClient(id: string): Promise<Client | undefined>;
  getClientById(id: string): Promise<Client | undefined>;
  getClientByEmail(email: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  getAllClients(): Promise<Client[]>;
  
  // Event submissions
  createPrivateEventSubmission(submission: any): Promise<any>;
  createCorporateEventSubmission(submission: any): Promise<any>;

  // I Am Her
  getIamHerTasks(eventKey: string): Promise<IamHerTask[]>;
  createIamHerTask(task: InsertIamHerTask): Promise<IamHerTask>;
  updateIamHerTask(id: string, task: Partial<InsertIamHerTask>): Promise<IamHerTask | undefined>;
  getIamHerDocuments(eventKey: string): Promise<IamHerDocument[]>;
  createIamHerDocument(document: InsertIamHerDocument): Promise<IamHerDocument>;
  getIamHerMessages(eventKey: string): Promise<IamHerMessage[]>;
  createIamHerMessage(message: InsertIamHerMessage): Promise<IamHerMessage>;
  getIamHerSummaryCache(key: string): Promise<IamHerSummaryCache | undefined>;
  setIamHerSummaryCache(entry: InsertIamHerSummaryCache): Promise<IamHerSummaryCache>;

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

  // Decor Vendors (separate system)
  getAllDecorVendors(): Promise<DecorVendor[]>;
  createDecorVendor(vendor: InsertDecorVendor): Promise<DecorVendor>;
  updateDecorVendor(id: string, vendor: Partial<InsertDecorVendor>): Promise<DecorVendor | undefined>;
  deleteDecorVendor(id: string): Promise<boolean>;

  // Tasks
  getTasksByEvent(eventId: string): Promise<Task[]>;
  getTasksByEventId(eventId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Budget Items
  getBudgetItemsByEvent(eventId: string): Promise<BudgetItem[]>;
  getBudgetItemsByEventId(eventId: string): Promise<BudgetItem[]>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(id: string, item: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined>;
  deleteBudgetItem(id: string): Promise<boolean>;

  // Contracts
  getContractsByEvent(eventId: string): Promise<Contract[]>;
  getContractsByEventId(eventId: string): Promise<Contract[]>;
  getContractById(id: string): Promise<Contract | undefined>;
  getAllContracts(): Promise<Contract[]>;
  createContract(contract: any): Promise<Contract>;
  updateContract(id: string, contract: any): Promise<Contract | undefined>;
  deleteContract(id: string): Promise<boolean>;

  // Contract Change Log
  getContractChangeLog(contractId: string): Promise<any[]>;
  createContractChangeLogEntry(entry: any): Promise<any>;
  approveContractChange(changeId: string, approvedBy: string, approvedByName: string, notes?: string): Promise<any>;
  rejectContractChange(changeId: string, rejectedBy: string, rejectedByName: string, notes?: string): Promise<any>;

  // Event Planning Log
  getEventPlanningLog(eventId: string, filters?: { category?: string; entityType?: string }): Promise<any[]>;
  createPlanningLogEntry(entry: any): Promise<any>;
  getDecisionLog(eventId: string): Promise<any[]>;

  // Documents
  getDocumentsByEventId(eventId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<boolean>;

  // Clients
  getClientById(id: string): Promise<Client | undefined>;

  // Booth Bookings
  getBoothBooking(token: string): Promise<any | undefined>;
  getBoothBookings(): Promise<any[]>;
  createBoothBooking(booking: any): Promise<any>;
  updateBoothBooking(id: string, data: any): Promise<any | undefined>;
  // Booth Booking Audit Log
  createBoothBookingAuditLog(entry: any): Promise<any>;
  getBoothBookingAuditLog(bookingId: string): Promise<any[]>;

  // Invoices
  getInvoicesByEventId(eventId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;

  // Proposals
  getProposalsByEventId(eventId: string): Promise<Proposal[]>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: string, proposal: Partial<InsertProposal>): Promise<Proposal | undefined>;

  // Decor Items and Catalog
  getDecorCatalog(): Promise<DecorItem[]>;
  createDecorItem(item: InsertDecorItem): Promise<DecorItem>;
  getDecorItemsByVendor(vendorId: string): Promise<DecorItem[]>;
  updateDecorItem(id: string, item: Partial<InsertDecorItem>): Promise<DecorItem | undefined>;
  deleteDecorItem(id: string): Promise<boolean>;

  // Decor Plans
  getDecorPlansByEvent(eventId: string): Promise<DecorPlan[]>;
  getDecorPlan(id: string): Promise<DecorPlan | undefined>;
  generateDecorPlan(params: {
    eventId: string;
    eventDetails: any;
    preferences: any;
    catalogItems: DecorItem[];
  }): Promise<DecorPlan>;
  updateDecorPlan(id: string, plan: Partial<InsertDecorPlan>): Promise<DecorPlan | undefined>;
  deleteDecorPlan(id: string): Promise<boolean>;

  // Visual Design Operations - simplified for now
  getVenueImagesByEvent(eventId: string): Promise<any[]>;
  createVenueImage(imageData: any): Promise<any>;
  getFloorPlansByEvent(eventId: string): Promise<any[]>;
  createFloorPlan(planData: any): Promise<any>;
  getVenueDesignsByEvent(eventId: string): Promise<any[]>;
  createVenueDesign(designData: any): Promise<any>;

  // Event Notes and Meeting Management
  getEventNotesByEventId(eventId: string): Promise<EventNote[]>;
  createEventNote(note: InsertEventNote): Promise<EventNote>;
  updateEventNote(id: string, note: Partial<InsertEventNote>): Promise<EventNote | undefined>;
  deleteEventNote(id: string): Promise<boolean>;
  
  getMeetingsByEventId(eventId: string): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: string): Promise<boolean>;
  getMeetingById(id: string): Promise<Meeting | undefined>;

  // Planner Notes
  getPlannerNotes(plannerId: string, section?: string, eventId?: string): Promise<PlannerNote[]>;
  createPlannerNote(note: InsertPlannerNote): Promise<PlannerNote>;
  updatePlannerNote(id: string, note: Partial<InsertPlannerNote>): Promise<PlannerNote | undefined>;
  deletePlannerNote(id: string): Promise<boolean>;

  // Planner Activity
  createPlannerActivity(activity: InsertPlannerActivity): Promise<PlannerActivity>;
  getPlannerActivities(plannerId: string, sessionId?: string): Promise<PlannerActivity[]>;

  // AI Session Summary
  getAISessionSummary(plannerId: string, sessionId: string): Promise<AISessionSummary | undefined>;
  createAISessionSummary(summary: InsertAISessionSummary): Promise<AISessionSummary>;
  updateAISessionSummary(id: string, summary: Partial<InsertAISessionSummary>): Promise<AISessionSummary | undefined>;

  // Activity Planning System
  getActivitiesByEventId(eventId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: string, activity: Partial<InsertActivity>): Promise<Activity | undefined>;
  deleteActivity(id: string): Promise<boolean>;
  
  // Activity Templates
  getActivityTemplates(phase?: string, eventType?: string): Promise<ActivityTemplate[]>;
  createActivityTemplate(template: InsertActivityTemplate): Promise<ActivityTemplate>;
  seedActivityTemplates(): Promise<void>;
  instantiateActivitiesFromTemplates(eventId: string, eventType: string): Promise<Activity[]>;
  
  // Phase Sign-offs
  getPhaseSignoffs(eventId: string): Promise<PhaseSignoff[]>;
  createPhaseSignoff(signoff: InsertPhaseSignoff): Promise<PhaseSignoff>;
  getPhaseProgress(eventId: string, phase: string): Promise<{ completed: number; total: number; percentage: number }>;
  
  // Activity Audit Log
  createActivityAuditLog(auditLog: InsertActivityAuditLog): Promise<ActivityAuditLog>;
  getActivityAuditLog(activityId: string): Promise<ActivityAuditLog[]>;
  
  // Saved Activity Views
  getSavedActivityViews(userId: string): Promise<SavedActivityView[]>;
  createSavedActivityView(view: InsertSavedActivityView): Promise<SavedActivityView>;
  updateSavedActivityView(id: string, view: Partial<InsertSavedActivityView>): Promise<SavedActivityView | undefined>;
  deleteSavedActivityView(id: string): Promise<boolean>;

  // Artifacts / Project Filing
  getArtifacts(eventId: string, category?: string): Promise<Artifact[]>;
  getAllArtifacts(): Promise<Artifact[]>;
  getArtifact(id: string): Promise<Artifact | undefined>;
  createArtifact(artifact: InsertArtifact): Promise<Artifact>;
  deleteArtifact(id: string): Promise<boolean>;

  // Event Collaborators (Co-Planning)
  getEventCollaborators(eventId: string): Promise<EventCollaborator[]>;
  getCollaboratorById(id: string): Promise<EventCollaborator | undefined>;
  getCollaboratorByToken(token: string): Promise<EventCollaborator | undefined>;
  getCollaborationsByEmail(email: string): Promise<EventCollaborator[]>;
  createEventCollaborator(collaborator: InsertEventCollaborator): Promise<EventCollaborator>;
  updateEventCollaborator(id: string, data: Partial<EventCollaborator>): Promise<EventCollaborator | undefined>;
  deleteEventCollaborator(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private clients: Map<string, Client>;
  private events: Map<string, Event>;
  private vendors: Map<string, Vendor>;
  private decorVendors: Map<string, DecorVendor>;
  private tasks: Map<string, Task>;
  private budgetItems: Map<string, BudgetItem>;
  private contracts: Map<string, Contract>;
  private documents: Map<string, Document>;
  private invoices: Map<string, Invoice>;
  private proposals: Map<string, Proposal>;
  private decorItems: Map<string, DecorItem>;
  private decorPlans: Map<string, DecorPlan>;
  private venueImages: Map<string, any>;
  private floorPlans: Map<string, any>;
  private venueDesigns: Map<string, any>;
  private eventNotes: Map<string, EventNote>;
  private meetings: Map<string, Meeting>;
  private plannerNotes: Map<string, PlannerNote>;
  private plannerActivities: Map<string, PlannerActivity>;
  private aiSessionSummaries: Map<string, AISessionSummary>;
  
  // Activity Planning System
  private activities: Map<string, RichActivity>;
  private activityTemplates: Map<string, RichActivityTemplate>;
  private phaseSignoffs: Map<string, PhaseSignoff>;
  private activityAuditLog: Map<string, ActivityAuditLog>;
  private savedActivityViews: Map<string, SavedActivityView>;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.events = new Map();
    this.vendors = new Map();
    this.decorVendors = new Map();
    this.tasks = new Map();
    this.budgetItems = new Map();
    this.contracts = new Map();
    this.documents = new Map();
    this.invoices = new Map();
    this.proposals = new Map();
    this.decorItems = new Map();
    this.decorPlans = new Map();
    this.venueImages = new Map();
    this.floorPlans = new Map();
    this.eventNotes = new Map();
    this.meetings = new Map();
    this.venueDesigns = new Map();
    this.plannerNotes = new Map();
    this.plannerActivities = new Map();
    this.aiSessionSummaries = new Map();
    
    // Activity Planning System
    this.activities = new Map();
    this.activityTemplates = new Map();
    this.phaseSignoffs = new Map();
    this.activityAuditLog = new Map();
    this.savedActivityViews = new Map();

    this.initializeData();
    this.seedActivityTemplates();
  }

  private async initializeData() {
    // Create sample planners
    const planner1 = await this.createUser({
      username: "anna.martinez",
      password: "password123",
      name: "Anna Martinez",
      role: "planner",
      email: "anna@eventperfekt.com",
    });

    const planner2 = await this.createUser({
      username: "john.davis",
      password: "password123",
      name: "John Davis",
      role: "planner",
      email: "john@eventperfekt.com",
    });

    // Create sample clients
    const client1 = await this.createClient({
      fullName: "Michael & Sarah Thompson",
      email: "sarah.thompson@email.com",
    });

    const client2 = await this.createClient({
      companyName: "TechCorp Industries",
      contactPerson: "David Wilson",
      email: "david.wilson@techcorp.com",
    });

    void planner1;
    void planner2;
    void client1;
    void client2;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser = { id: randomUUID(), ...user } as User;
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Clients
  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientById(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientByEmail(email: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(c => c.email === email);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const newClient = { id: randomUUID(), createdAt: new Date(), ...client } as Client;
    this.clients.set(newClient.id, newClient);
    return newClient;
  }

  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  // I Am Her
  private iamHerTasks: Map<string, IamHerTask> = new Map();
  private iamHerDocuments: Map<string, IamHerDocument> = new Map();
  private iamHerMessages: Map<string, IamHerMessage> = new Map();
  private iamHerSummaryCaches: Map<string, IamHerSummaryCache> = new Map();

  async getIamHerTasks(eventKey: string): Promise<IamHerTask[]> {
    return Array.from(this.iamHerTasks.values()).filter(t => t.eventKey === eventKey);
  }
  async createIamHerTask(task: InsertIamHerTask): Promise<IamHerTask> {
    const row = { id: randomUUID(), createdAt: new Date(), completed: false, ...task } as IamHerTask;
    this.iamHerTasks.set(row.id, row);
    return row;
  }
  async updateIamHerTask(id: string, task: Partial<InsertIamHerTask>): Promise<IamHerTask | undefined> {
    const existing = this.iamHerTasks.get(id); if (!existing) return undefined;
    const updated = { ...existing, ...task };
    this.iamHerTasks.set(id, updated);
    return updated;
  }
  async getIamHerDocuments(eventKey: string): Promise<IamHerDocument[]> {
    return Array.from(this.iamHerDocuments.values()).filter(d => d.eventKey === eventKey);
  }
  async createIamHerDocument(document: InsertIamHerDocument): Promise<IamHerDocument> {
    const row = { id: randomUUID(), createdAt: new Date(), ...document } as IamHerDocument;
    this.iamHerDocuments.set(row.id, row);
    return row;
  }
  async getIamHerMessages(eventKey: string): Promise<IamHerMessage[]> {
    return Array.from(this.iamHerMessages.values()).filter(m => m.eventKey === eventKey);
  }
  async createIamHerMessage(message: InsertIamHerMessage): Promise<IamHerMessage> {
    const row = { id: randomUUID(), createdAt: new Date(), ...message } as IamHerMessage;
    this.iamHerMessages.set(row.id, row);
    return row;
  }
  async getIamHerSummaryCache(key: string): Promise<IamHerSummaryCache | undefined> {
    return this.iamHerSummaryCaches.get(key);
  }
  async setIamHerSummaryCache(entry: InsertIamHerSummaryCache): Promise<IamHerSummaryCache> {
    const row = { createdAt: new Date(), ...entry } as IamHerSummaryCache;
    this.iamHerSummaryCaches.set(row.key, row);
    return row;
  }

  // Event submissions
  async createPrivateEventSubmission(submission: any): Promise<any> {
    const newSubmission = {
      id: randomUUID(),
      createdAt: new Date(),
      ...submission,
      type: 'private'
    };
    // Store in a submissions map or convert to event
    return newSubmission;
  }

  async createCorporateEventSubmission(submission: any): Promise<any> {
    const newSubmission = {
      id: randomUUID(),
      createdAt: new Date(),
      ...submission,
      type: 'corporate'
    };
    // Store in a submissions map or convert to event
    return newSubmission;
  }

  // Events
  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const newEvent = { id: randomUUID(), createdAt: new Date(), ...event } as Event;
    this.events.set(newEvent.id, newEvent);
    return newEvent;
  }

  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const existing = this.events.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...event };
    this.events.set(id, updated);
    return updated;
  }

  async deleteEvent(id: string): Promise<boolean> {
    return this.events.delete(id);
  }

  // Vendors
  async getAllVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values());
  }

  async getVendorsByEventId(eventId: string): Promise<Vendor[]> {
    return Array.from(this.vendors.values()).filter(v => v.eventId === eventId);
  }

  // Decor Vendors (separate system)
  async getAllDecorVendors(): Promise<DecorVendor[]> {
    return Array.from(this.decorVendors.values());
  }

  async createDecorVendor(vendor: InsertDecorVendor): Promise<DecorVendor> {
    const id = randomUUID();
    const newVendor = { id, createdAt: new Date(), ...vendor } as unknown as DecorVendor;
    this.decorVendors.set(id, newVendor);
    return newVendor;
  }

  async updateDecorVendor(id: string, vendor: Partial<InsertDecorVendor>): Promise<DecorVendor | undefined> {
    const existing = this.decorVendors.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...vendor };
    this.decorVendors.set(id, updated);
    return updated;
  }

  async deleteDecorVendor(id: string): Promise<boolean> {
    return this.decorVendors.delete(id);
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const newVendor = { id: randomUUID(), createdAt: new Date(), ...vendor } as Vendor;
    this.vendors.set(newVendor.id, newVendor);
    return newVendor;
  }

  async updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const existing = this.vendors.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...vendor };
    this.vendors.set(id, updated);
    return updated;
  }

  async deleteVendor(id: string): Promise<boolean> {
    return this.vendors.delete(id);
  }

  async getAllPlannerIds(): Promise<string[]> {
    return Array.from(this.users.values()).filter(u => u.role === 'planner').map(u => u.id);
  }

  // Tasks
  async getTasksByEvent(eventId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(t => t.eventId === eventId);
  }
  async getTasksByEventId(eventId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(t => t.eventId === eventId);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const newTask = { id: randomUUID(), createdAt: new Date(), ...task } as Task;
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined> {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...task };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Budget Items
  async getBudgetItemsByEvent(eventId: string): Promise<BudgetItem[]> {
    return Array.from(this.budgetItems.values()).filter(b => b.eventId === eventId);
  }
  async getBudgetItemsByEventId(eventId: string): Promise<BudgetItem[]> {
    return Array.from(this.budgetItems.values()).filter(b => b.eventId === eventId);
  }

  async createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem> {
    const newItem = { id: randomUUID(), ...item } as BudgetItem;
    this.budgetItems.set(newItem.id, newItem);
    return newItem;
  }

  async updateBudgetItem(id: string, item: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined> {
    const existing = this.budgetItems.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...item };
    this.budgetItems.set(id, updated);
    return updated;
  }

  async deleteBudgetItem(id: string): Promise<boolean> {
    return this.budgetItems.delete(id);
  }

  // Contracts
  async getContractsByEvent(eventId: string): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(c => c.eventId === eventId);
  }
  async getContractsByEventId(eventId: string): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(c => c.eventId === eventId);
  }

  async getContractById(id: string): Promise<Contract | undefined> {
    return this.contracts.get(id);
  }

  async getAllContracts(): Promise<Contract[]> {
    return Array.from(this.contracts.values());
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const newContract = {
      id: randomUUID(),
      createdAt: new Date(),
      status: 'draft',
      version: 1,
      sentDate: null,
      signedDate: null,
      clientSignature: null,
      plannerSignature: null,
      previousVersionId: null,
      revisionNotes: null,
      ...contract,
    } as Contract;
    this.contracts.set(newContract.id, newContract);
    return newContract;
  }

  async updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const existing = this.contracts.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...contract };
    this.contracts.set(id, updated);
    return updated;
  }

  async deleteContract(id: string): Promise<boolean> {
    return this.contracts.delete(id);
  }

  private contractChangeLogs: Map<string, any> = new Map();
  private planningLogs: Map<string, any> = new Map();

  async getContractChangeLog(contractId: string): Promise<any[]> {
    return Array.from(this.contractChangeLogs.values())
      .filter(log => log.contractId === contractId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createContractChangeLogEntry(entry: any): Promise<any> {
    const newEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      approvalStatus: 'pending',
      ...entry,
    };
    this.contractChangeLogs.set(newEntry.id, newEntry);
    return newEntry;
  }

  async approveContractChange(changeId: string, approvedBy: string, approvedByName: string, notes?: string): Promise<any> {
    const entry = this.contractChangeLogs.get(changeId);
    if (!entry) return undefined;
    const updated = { ...entry, approvalStatus: 'approved', approvedBy, approvedByName, approvalDate: new Date(), approvalNotes: notes };
    this.contractChangeLogs.set(changeId, updated);
    return updated;
  }

  async rejectContractChange(changeId: string, rejectedBy: string, rejectedByName: string, notes?: string): Promise<any> {
    const entry = this.contractChangeLogs.get(rejectedBy);
    if (!entry) return undefined;
    const updated = { ...entry, approvalStatus: 'rejected', approvedBy: rejectedBy, approvedByName: rejectedByName, approvalDate: new Date(), approvalNotes: notes };
    this.contractChangeLogs.set(changeId, updated);
    return updated;
  }

  // Event Planning Log
  async getEventPlanningLog(eventId: string, filters?: { category?: string; entityType?: string }): Promise<any[]> {
    let logs = Array.from(this.planningLogs.values())
      .filter(log => log.eventId === eventId);
    if (filters?.category) {
      logs = logs.filter(log => log.category === filters.category);
    }
    if (filters?.entityType) {
      logs = logs.filter(log => log.entityType === filters.entityType);
    }
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createPlanningLogEntry(entry: any): Promise<any> {
    const newEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      priority: 'normal',
      tags: [],
      ...entry,
    };
    this.planningLogs.set(newEntry.id, newEntry);
    return newEntry;
  }

  async getDecisionLog(eventId: string): Promise<any[]> {
    return Array.from(this.planningLogs.values())
      .filter(log => log.eventId === eventId && log.decisionType)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Documents
  async getDocumentsByEventId(eventId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(d => d.eventId === eventId);
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const newDocument = { id, uploadedAt: new Date(), ...document } as unknown as Document;
    this.documents.set(id, newDocument);
    return newDocument;
  }

  async deleteDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Invoices
  async getInvoicesByEventId(eventId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(i => i.eventId === eventId);
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const newInvoice = { id: randomUUID(), createdAt: new Date(), ...invoice } as Invoice;
    this.invoices.set(newInvoice.id, newInvoice);
    return newInvoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const existing = this.invoices.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...invoice };
    this.invoices.set(id, updated);
    return updated;
  }

  // Proposals
  async getProposalsByEventId(eventId: string): Promise<Proposal[]> {
    return Array.from(this.proposals.values()).filter(p => p.eventId === eventId);
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    const newProposal = { id: randomUUID(), createdAt: new Date(), ...proposal } as Proposal;
    this.proposals.set(newProposal.id, newProposal);
    return newProposal;
  }

  async updateProposal(id: string, proposal: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const existing = this.proposals.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...proposal };
    this.proposals.set(id, updated);
    return updated;
  }

  // Decor Items and Catalog Implementation
  async getDecorCatalog(): Promise<DecorItem[]> {
    // Create sample decor catalog if empty
    if (this.decorItems.size === 0) {
      await this.initializeDecorCatalog();
    }
    return Array.from(this.decorItems.values());
  }

  async createDecorItem(item: InsertDecorItem): Promise<DecorItem> {
    const id = randomUUID();
    const newItem = { id, ...item, createdAt: new Date() } as DecorItem;
    this.decorItems.set(id, newItem);
    return newItem;
  }

  async getDecorItemsByVendor(vendorId: string): Promise<DecorItem[]> {
    return Array.from(this.decorItems.values()).filter(item => item.vendorId === vendorId);
  }

  async updateDecorItem(id: string, item: Partial<InsertDecorItem>): Promise<DecorItem | undefined> {
    const existing = this.decorItems.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...item };
    this.decorItems.set(id, updated);
    return updated;
  }

  async deleteDecorItem(id: string): Promise<boolean> {
    return this.decorItems.delete(id);
  }

  // Decor Plans Implementation
  async getDecorPlansByEvent(eventId: string): Promise<DecorPlan[]> {
    return Array.from(this.decorPlans.values()).filter(plan => plan.eventId === eventId);
  }

  async getDecorPlan(id: string): Promise<DecorPlan | undefined> {
    return this.decorPlans.get(id);
  }

  async generateDecorPlan(params: {
    eventId: string;
    eventDetails: any;
    preferences: any;
    catalogItems: DecorItem[];
  }): Promise<DecorPlan> {
    const { eventId, eventDetails, preferences } = params;
    const id = randomUUID();
    
    // Get relevant catalog items
    const catalog = await this.getDecorCatalog();
    
    // Generate decor plan with real vendor items
    const selectedItems = this.selectDecorItems(catalog, preferences, eventDetails);
    const categories = this.categorizeItems(selectedItems);
    const vendors = this.summarizeVendors(selectedItems);
    const colorPalette = this.generateColorPalette(preferences.style);
    
    const decorPlan = {
      id,
      eventId,
      theme: `${preferences.style} ${eventDetails.type} Theme`,
      style: preferences.style,
      colorPalette,
      totalBudget: this.calculateTotalBudget(selectedItems).toString(),
      items: categories,
      vendors,
      preferences,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as DecorPlan;

    this.decorPlans.set(id, decorPlan);
    return decorPlan;
  }

  async updateDecorPlan(id: string, plan: Partial<InsertDecorPlan>): Promise<DecorPlan | undefined> {
    const existing = this.decorPlans.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...plan, updatedAt: new Date() };
    this.decorPlans.set(id, updated);
    return updated;
  }

  async deleteDecorPlan(id: string): Promise<boolean> {
    return this.decorPlans.delete(id);
  }

  // Helper methods for decor planning
  private async initializeDecorCatalog() {
    // Create sample decor and venue vendors
    const floristVendor = await this.createVendor({ name: "Bloom & Blossom Florals", service: "florals", category: "florals", cost: "0", status: "confirmed", rating: "4.9", location: "Los Angeles, CA", isDecorVendor: true, specialties: "Wedding flowers, centerpieces, ceremony arches, floral installations" } as any);
    const furnitureVendor = await this.createVendor({ name: "Elite Chair & Table Rentals", service: "furniture_rentals", category: "furniture", cost: "0", status: "confirmed", rating: "4.8", location: "Beverly Hills, CA", isDecorVendor: true, specialties: "Chiavari chairs, farm tables, lounge furniture, bars" } as any);
    const drapingVendor = await this.createVendor({ name: "Luxe Drapes & Linens", service: "draping_linens", category: "draping", cost: "0", status: "confirmed", rating: "4.7", location: "West Hollywood, CA", isDecorVendor: true, specialties: "Ceiling draping, backdrop curtains, luxury linens, table runners" } as any);
    const lightingVendor = await this.createVendor({ name: "Illuminate Events", service: "lighting", category: "lighting", cost: "0", status: "confirmed", rating: "4.6", location: "Santa Monica, CA", isDecorVendor: true, specialties: "Uplighting, chandeliers, string lights, pin spotting" } as any);
    const marqueeVendor = await this.createVendor({ name: "Grand Marquee Co", service: "marquees_tents", category: "marquees", cost: "0", status: "confirmed", rating: "4.8", location: "Malibu, CA", isDecorVendor: true, specialties: "Luxury marquees, clear span tents, garden pavilions" } as any);
    const decorVendor = await this.createVendor({ name: "Signature Decor Elements", service: "decor_props", category: "decor", cost: "0", status: "confirmed", rating: "4.7", location: "Beverly Hills, CA", isDecorVendor: true, specialties: "Centerpieces, candles, vases, decorative props, signage" } as any);

    // Create comprehensive decor and venue rental items
    const decorItems = [
      // Florals
      {
        vendorId: floristVendor.id,
        name: "Burgundy Rose Centerpieces",
        category: "Florals",
        description: "Elegant burgundy and ivory rose arrangements with eucalyptus",
        price: "85.00",
        currency: "USD",
        priceType: "per_item",
        images: ["/florals/burgundy-rose-centerpiece.jpg"],
        specifications: {
          dimensions: "12\" height x 8\" width",
          material: "Fresh roses, eucalyptus, gold accents",
          color: "Burgundy, ivory, gold",
          style: "Romantic elegant"
        },
        availability: true,
        minQuantity: 1,
        maxQuantity: 30
      },
      {
        vendorId: floristVendor.id,
        name: "Ceremony Arch Florals",
        category: "Florals", 
        description: "Grand floral arch for ceremony backdrop",
        price: "450.00",
        currency: "USD",
        priceType: "per_item",
        images: ["/florals/ceremony-arch.jpg"],
        specifications: {
          dimensions: "8' width x 7' height",
          material: "Mixed seasonal flowers, greenery",
          style: "Garden romantic"
        },
        availability: true,
        minQuantity: 1,
        maxQuantity: 2
      },
      // Furniture
      {
        vendorId: furnitureVendor.id,
        name: "Gold Chiavari Chairs",
        category: "Furniture",
        description: "Premium gold chiavari chairs with ivory cushions",
        price: "8.50",
        currency: "USD",
        priceType: "per_item",
        images: ["/furniture/gold-chiavari-chairs.jpg"],
        specifications: {
          dimensions: "Standard dining height",
          material: "Resin with metallic finish",
          color: "Gold",
          style: "Classic elegant"
        },
        availability: true,
        minQuantity: 10,
        maxQuantity: 200
      },
      {
        vendorId: furnitureVendor.id,
        name: "Round Farm Tables",
        category: "Furniture",
        description: "Rustic farm tables for 8 guests",
        price: "65.00",
        currency: "USD",
        priceType: "per_item",
        images: ["/furniture/round-farm-tables.jpg"],
        specifications: {
          dimensions: "60\" diameter",
          material: "Reclaimed wood",
          style: "Rustic elegant",
          setupTime: "30 minutes"
        },
        availability: true,
        minQuantity: 1,
        maxQuantity: 25
      },
      // Draping & Linens
      {
        vendorId: drapingVendor.id,
        name: "Burgundy Satin Table Linens",
        category: "Linens",
        description: "Premium burgundy satin tablecloths for round tables",
        price: "35.00",
        currency: "USD",
        priceType: "per_item",
        images: ["/linens/burgundy-satin-linens.jpg"],
        specifications: {
          dimensions: "132\" round",
          material: "Satin polyester",
          color: "Burgundy wine",
          style: "Elegant luxury"
        },
        availability: true,
        minQuantity: 1,
        maxQuantity: 50
      },
      {
        vendorId: drapingVendor.id,
        name: "Ceiling Draping",
        category: "Draping",
        description: "Ivory ceiling draping with twinkling lights",
        price: "12.00",
        currency: "USD",
        priceType: "per_foot",
        images: ["/draping/ceiling-draping.jpg"],
        specifications: {
          material: "Chiffon fabric",
          color: "Ivory, white",
          style: "Romantic flowing"
        },
        availability: true,
        minQuantity: 50,
        maxQuantity: 500
      },
      // Lighting
      {
        vendorId: lightingVendor.id,
        name: "Uplighting Package",
        category: "Lighting",
        description: "LED uplighting in customizable colors",
        price: "25.00",
        currency: "USD",
        priceType: "per_item",
        images: ["/lighting/uplighting.jpg"],
        specifications: {
          color: "Customizable RGB",
          style: "Modern ambient"
        },
        availability: true,
        minQuantity: 8,
        maxQuantity: 50
      },
      {
        vendorId: lightingVendor.id,
        name: "Crystal Chandeliers",
        category: "Lighting",
        description: "Hanging crystal chandeliers for elegant ambiance",
        price: "175.00",
        currency: "USD",
        priceType: "per_item",
        images: ["/lighting/crystal-chandeliers.jpg"],
        specifications: {
          dimensions: "24\" diameter",
          material: "Crystal and brass",
          style: "Classic elegant"
        },
        availability: true,
        minQuantity: 1,
        maxQuantity: 12
      },
      // Marquees & Tents
      {
        vendorId: marqueeVendor.id,
        name: "Clear Span Marquee",
        category: "Marquees",
        description: "Luxury clear span marquee for outdoor events",
        price: "1200.00",
        currency: "USD",
        priceType: "per_day",
        images: ["/marquees/clear-span-tent.jpg"],
        specifications: {
          dimensions: "40' x 60'",
          material: "White vinyl top, clear walls",
          style: "Modern luxury"
        },
        availability: true,
        minQuantity: 1,
        maxQuantity: 3
      },
      // Decor Props
      {
        vendorId: decorVendor.id,
        name: "Gold Mercury Glass Vases",
        category: "Decor",
        description: "Assorted gold mercury glass vases for floral arrangements",
        price: "18.00",
        currency: "USD",
        priceType: "per_item",
        images: ["/decor/gold-mercury-vases.jpg"],
        specifications: {
          material: "Mercury glass",
          color: "Gold",
          style: "Vintage elegant"
        },
        availability: true,
        minQuantity: 1,
        maxQuantity: 40
      },
      {
        vendorId: decorVendor.id,
        name: "Welcome Signage",
        category: "Decor",
        description: "Custom acrylic welcome signs with gold lettering",
        price: "125.00",
        currency: "USD",
        priceType: "per_item",
        images: ["/decor/welcome-signage.jpg"],
        specifications: {
          dimensions: "24\" x 18\"",
          material: "Clear acrylic with gold vinyl",
          style: "Modern elegant"
        },
        availability: true,
        minQuantity: 1,
        maxQuantity: 5
      }
    ];

    for (const item of decorItems) {
      await this.createDecorItem(item);
    }
  }

  private selectDecorItems(catalog: DecorItem[], preferences: any, eventDetails: any): any[] {
    const selectedItems = [];
    const focusCategories = preferences.categories.length > 0 ? preferences.categories : 
      ["Florals", "Furniture", "Linens", "Lighting", "Draping", "Decor"];
    
    for (const category of focusCategories) {
      const categoryItems = catalog.filter(item => item.category === category && item.availability);
      
      if (categoryItems.length > 0) {
        const selectedItem = categoryItems[0];
        const quantity = this.calculateQuantity(selectedItem, eventDetails.guestCount, category);
        
        selectedItems.push({
          ...selectedItem,
          quantity,
          totalPrice: parseFloat(selectedItem.price) * quantity
        });
      }
    }
    
    return selectedItems;
  }

  private calculateQuantity(item: any, guestCount: number, category: string): number {
    switch (category) {
      case "Linens": return Math.ceil(guestCount / 8); // One per table
      case "Florals": return Math.ceil(guestCount / 8); // Centerpieces per table
      case "Furniture": return guestCount; // One chair per guest
      case "Lighting": return Math.ceil(guestCount / 25); // Uplighting coverage
      case "Draping": return Math.ceil(guestCount / 50); // Per venue section
      case "Decor": return Math.ceil(guestCount / 10); // Decorative items
      case "Marquees": return 1; // Typically one main tent
      default: return Math.ceil(guestCount / 10);
    }
  }

  private categorizeItems(items: any[]): any[] {
    const categories: { [key: string]: any[] } = {};
    
    for (const item of items) {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    }
    
    return Object.entries(categories).map(([category, items]) => ({
      category,
      items,
      subtotal: items.reduce((sum, item) => sum + item.totalPrice, 0)
    }));
  }

  private summarizeVendors(items: any[]): any[] {
    const vendors: { [key: string]: any } = {};
    
    for (const item of items) {
      const vendor = this.vendors.get(item.vendorId);
      if (vendor) {
        if (!vendors[vendor.id]) {
          vendors[vendor.id] = {
            id: vendor.id,
            name: vendor.name,
            items: [],
            total: 0
          };
        }
        vendors[vendor.id].items.push(item.name);
        vendors[vendor.id].total += item.totalPrice;
      }
    }
    
    return Object.values(vendors);
  }

  private generateColorPalette(style: string): string[] {
    const palettes = {
      elegant: ["#800020", "#FFD700", "#F5F5DC", "#8B4513"],
      modern: ["#2C3E50", "#E74C3C", "#ECF0F1", "#F39C12"],
      rustic: ["#8B4513", "#F5DEB3", "#228B22", "#CD853F"],
      glamorous: ["#FFD700", "#C0C0C0", "#000000", "#FF69B4"],
      bohemian: ["#8B008B", "#FF8C00", "#32CD32", "#DC143C"],
      vintage: ["#800000", "#F5F5DC", "#DDA0DD", "#708090"]
    };
    
    return palettes[style as keyof typeof palettes] || palettes.elegant;
  }

  private calculateTotalBudget(items: any[]): number {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  // Venue Images Implementation
  async getVenueImagesByEvent(eventId: string): Promise<VenueImage[]> {
    return Array.from(this.venueImages.values()).filter(image => image.eventId === eventId);
  }

  async createVenueImage(imageData: InsertVenueImage): Promise<VenueImage> {
    const id = randomUUID();
    const newImage = { id, ...imageData, uploadedAt: new Date() } as unknown as VenueImage;
    this.venueImages.set(id, newImage);
    return newImage;
  }

  // Floor Plans Implementation
  async getFloorPlansByEvent(eventId: string): Promise<FloorPlan[]> {
    return Array.from(this.floorPlans.values()).filter(plan => plan.eventId === eventId);
  }

  async createFloorPlan(planData: InsertFloorPlan): Promise<FloorPlan> {
    const id = randomUUID();
    const newPlan = { id, ...planData, createdAt: new Date() } as unknown as FloorPlan;
    this.floorPlans.set(id, newPlan);
    return newPlan;
  }

  // Venue Designs Implementation
  async getVenueDesignsByEvent(eventId: string): Promise<VenueDesign[]> {
    return Array.from(this.venueDesigns.values()).filter(design => design.eventId === eventId);
  }

  async createVenueDesign(designData: InsertVenueDesign): Promise<VenueDesign> {
    const id = randomUUID();
    const newDesign = { id, ...designData, createdAt: new Date() } as VenueDesign;
    this.venueDesigns.set(id, newDesign);
    return newDesign;
  }

  // Event Notes Implementation
  async getEventNotesByEventId(eventId: string): Promise<EventNote[]> {
    return Array.from(this.eventNotes.values()).filter(note => note.eventId === eventId);
  }

  async createEventNote(note: InsertEventNote): Promise<EventNote> {
    const id = randomUUID();
    const newNote = { id, ...note, createdAt: new Date(), updatedAt: new Date() } as unknown as EventNote;
    this.eventNotes.set(id, newNote);
    return newNote;
  }

  async updateEventNote(id: string, note: Partial<InsertEventNote>): Promise<EventNote | undefined> {
    const existingNote = this.eventNotes.get(id);
    if (!existingNote) return undefined;

    const updatedNote: EventNote = {
      ...existingNote,
      ...note,
      updatedAt: new Date(),
    };
    this.eventNotes.set(id, updatedNote);
    return updatedNote;
  }

  async deleteEventNote(id: string): Promise<boolean> {
    return this.eventNotes.delete(id);
  }

  // Meetings Implementation
  async getMeetingsByEventId(eventId: string): Promise<Meeting[]> {
    return Array.from(this.meetings.values()).filter(meeting => meeting.eventId === eventId);
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const id = randomUUID();
    const newMeeting = { id, ...meeting, createdAt: new Date(), updatedAt: new Date() } as Meeting;
    this.meetings.set(id, newMeeting);
    return newMeeting;
  }

  async updateMeeting(id: string, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const existingMeeting = this.meetings.get(id);
    if (!existingMeeting) return undefined;

    const updatedMeeting: Meeting = {
      ...existingMeeting,
      ...meeting,
      updatedAt: new Date(),
    };
    this.meetings.set(id, updatedMeeting);
    return updatedMeeting;
  }

  async deleteMeeting(id: string): Promise<boolean> {
    return this.meetings.delete(id);
  }

  async getMeetingById(id: string): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  // Planner Notes Implementation
  async getPlannerNotes(plannerId: string, section?: string, eventId?: string): Promise<PlannerNote[]> {
    const allNotes = Array.from(this.plannerNotes.values());
    return allNotes.filter(note => {
      if (note.plannerId !== plannerId) return false;
      if (section && note.section !== section) return false;
      if (eventId && note.eventId !== eventId) return false;
      return true;
    });
  }

  async createPlannerNote(note: InsertPlannerNote): Promise<PlannerNote> {
    const id = randomUUID();
    const newNote = { id, ...note, createdAt: new Date(), updatedAt: new Date() } as PlannerNote;
    this.plannerNotes.set(id, newNote);
    return newNote;
  }

  async updatePlannerNote(id: string, note: Partial<InsertPlannerNote>): Promise<PlannerNote | undefined> {
    const existingNote = this.plannerNotes.get(id);
    if (!existingNote) return undefined;

    const updatedNote: PlannerNote = {
      ...existingNote,
      ...note,
      updatedAt: new Date(),
    };
    this.plannerNotes.set(id, updatedNote);
    return updatedNote;
  }

  async deletePlannerNote(id: string): Promise<boolean> {
    return this.plannerNotes.delete(id);
  }

  // Planner Activity Implementation
  async createPlannerActivity(activity: InsertPlannerActivity): Promise<PlannerActivity> {
    const id = randomUUID();
    const newActivity = {
      id,
      ...activity,
      timestamp: (activity as any).timestamp || new Date(),
    } as PlannerActivity;
    this.plannerActivities.set(id, newActivity);
    return newActivity;
  }

  async getPlannerActivities(plannerId: string, sessionId?: string): Promise<PlannerActivity[]> {
    const allActivities = Array.from(this.plannerActivities.values());
    return allActivities.filter(activity => {
      if (activity.plannerId !== plannerId) return false;
      if (sessionId && activity.sessionId !== sessionId) return false;
      return true;
    });
  }

  // AI Session Summary Implementation
  async getAISessionSummary(plannerId: string, sessionId: string): Promise<AISessionSummary | undefined> {
    const allSummaries = Array.from(this.aiSessionSummaries.values());
    return allSummaries.find(summary => 
      summary.plannerId === plannerId && (summary as any).sessionId === sessionId
    );
  }

  async createAISessionSummary(summary: InsertAISessionSummary): Promise<AISessionSummary> {
    const id = randomUUID();
    const newSummary = { id, ...summary, createdAt: new Date(), updatedAt: new Date() } as unknown as AISessionSummary;
    this.aiSessionSummaries.set(id, newSummary);
    return newSummary;
  }

  async updateAISessionSummary(id: string, summary: Partial<InsertAISessionSummary>): Promise<AISessionSummary | undefined> {
    const existingSummary = this.aiSessionSummaries.get(id);
    if (!existingSummary) return undefined;

    const updatedSummary: AISessionSummary = {
      ...existingSummary,
      ...summary,
      updatedAt: new Date(),
    };
    this.aiSessionSummaries.set(id, updatedSummary);
    return updatedSummary;
  }

  // Activity Planning System Implementation

  async getActivitiesByEventId(eventId: string): Promise<RichActivity[]> {
    const allActivities = Array.from(this.activities.values());
    return allActivities.filter(activity => activity.eventId === eventId);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const newActivity = { id, ...activity, createdAt: new Date(), updatedAt: new Date() } as unknown as Activity;
    this.activities.set(id, newActivity);
    return newActivity;
  }

  async updateActivity(id: string, activity: Partial<InsertActivity>): Promise<Activity | undefined> {
    const existingActivity = this.activities.get(id);
    if (!existingActivity) return undefined;

    const updatedActivity: Activity = {
      ...existingActivity,
      ...activity,
      updatedAt: new Date(),
    };
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }

  async deleteActivity(id: string): Promise<boolean> {
    return this.activities.delete(id);
  }

  // Activity Templates Implementation

  async getActivityTemplates(phase?: string, eventType?: string): Promise<RichActivityTemplate[]> {
    const allTemplates = Array.from(this.activityTemplates.values());
    let filteredTemplates = allTemplates;

    if (phase) {
      filteredTemplates = filteredTemplates.filter(template => template.phase === phase);
    }

    if (eventType) {
      filteredTemplates = filteredTemplates.filter(template => 
        !template.eventTypes || template.eventTypes.includes(eventType)
      );
    }

    return filteredTemplates.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async createActivityTemplate(template: InsertActivityTemplate): Promise<ActivityTemplate> {
    const id = randomUUID();
    const newTemplate = { id, ...template, createdAt: new Date() } as unknown as ActivityTemplate;
    this.activityTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async seedActivityTemplates(): Promise<void> {
    const templates = [
      // ========== PLANNING PHASE (8-12 weeks before) ==========
      {
        name: "Initial Client Consultation & Requirements Gathering",
        phase: "planning",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 1,
        estimatedDuration: "2-3 hours",
        description: "Comprehensive client meeting to understand vision, expectations, budget parameters, guest demographics, and special requirements. Document all preferences and create project foundation.",
        isRequired: true,
      },
      {
        name: "Develop Event Vision & Theme Strategy",
        phase: "planning",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 2,
        estimatedDuration: "4 hours",
        description: "Create detailed concept presentation including mood boards, style direction, color palettes, and overall aesthetic vision aligned with client preferences.",
        isRequired: true,
      },
      {
        name: "Comprehensive Budget Planning & Allocation",
        phase: "planning",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 3,
        estimatedDuration: "3 hours",
        description: "Develop detailed budget breakdown across all categories: venue, catering, decor, entertainment, photography, transportation, staff, contingency. Set spending priorities and approval thresholds.",
        isRequired: true,
      },
      {
        name: "Guest List Strategy & RSVP Management Setup",
        phase: "planning",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 4,
        estimatedDuration: "2 hours",
        description: "Establish guest categories, finalize invitation lists, set up RSVP tracking system, and plan for dietary restrictions and special accommodations.",
        isRequired: true,
      },
      {
        name: "Master Project Timeline & Milestone Planning",
        phase: "planning",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 5,
        estimatedDuration: "2 hours",
        description: "Create comprehensive project schedule with critical milestones, vendor deadlines, client decision points, and contingency buffers.",
        isRequired: true,
      },

      // ========== DESIGN PHASE (6-8 weeks before) ==========
      {
        name: "Venue Research, Evaluation & Booking",
        phase: "design",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 6,
        estimatedDuration: "6 hours",
        description: "Research venues matching requirements, conduct site visits, evaluate logistics, negotiate terms, and secure primary venue with backup options.",
        isRequired: true,
      },
      {
        name: "Detailed Floor Planning & Layout Design",
        phase: "design",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 7,
        estimatedDuration: "4 hours",
        description: "Create precise floor plans including seating arrangements, vendor stations, guest flow patterns, accessibility considerations, and emergency exits.",
        isRequired: true,
      },
      {
        name: "Comprehensive Decor & Styling Blueprint",
        phase: "design",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 8,
        estimatedDuration: "6 hours",
        description: "Design complete decor scheme: centerpieces, florals, lighting design, linens, furniture selections, signage, and ambient elements. Create material specifications and vendor requirements.",
        isRequired: true,
      },
      {
        name: "Client Design Presentation & Approval",
        phase: "design",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 9,
        estimatedDuration: "3 hours",
        description: "Present comprehensive design package with 3D renderings, material samples, cost breakdowns, and timeline. Secure client approval and document any modifications.",
        isRequired: true,
      },

      // ========== VENDOR COORDINATION PHASE (4-6 weeks before) ==========
      {
        name: "Catering Partner Selection & Menu Development",
        phase: "vendor_coordination",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 10,
        estimatedDuration: "8 hours",
        description: "Research caterers, conduct tastings, develop custom menus accommodating dietary restrictions, negotiate service terms, and establish delivery logistics.",
        isRequired: true,
      },
      {
        name: "Photography & Videography Services Procurement",
        phase: "vendor_coordination",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 11,
        estimatedDuration: "5 hours",
        description: "Evaluate portfolios, interview photographers/videographers, negotiate packages, create shot lists, and establish timeline coordination requirements.",
        isRequired: true,
      },
      {
        name: "Entertainment & Audio/Visual Coordination",
        phase: "vendor_coordination",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 12,
        estimatedDuration: "5 hours",
        description: "Book entertainment acts, coordinate sound systems, lighting equipment, microphones, and AV requirements. Develop performance schedules and technical specifications.",
        isRequired: true,
      },
      {
        name: "Decor Vendor Sourcing & Contracting",
        phase: "vendor_coordination",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 13,
        estimatedDuration: "6 hours",
        description: "Contract florists, rental companies, and specialty decor vendors. Coordinate delivery schedules, setup requirements, and breakdown procedures.",
        isRequired: true,
      },
      {
        name: "Transportation & Logistics Arrangements",
        phase: "vendor_coordination",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 14,
        estimatedDuration: "3 hours",
        description: "Arrange guest transportation, parking coordination, valet services, vendor delivery schedules, and VIP arrival/departure logistics.",
        isRequired: false,
      },

      // ========== CONTRACT & BUDGET MANAGEMENT (3-4 weeks before) ==========
      {
        name: "Vendor Contract Finalization & Risk Management",
        phase: "vendor_coordination",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 15,
        estimatedDuration: "4 hours",
        description: "Review, negotiate, and execute all vendor contracts. Ensure proper insurance coverage, liability protection, and payment terms. Document all agreements and maintain contract repository.",
        isRequired: true,
      },
      {
        name: "Client Service Agreement & Payment Structure",
        phase: "vendor_coordination",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 16,
        estimatedDuration: "2 hours",
        description: "Present comprehensive service proposal, secure client contract signature, establish payment milestone schedule, and set up billing/invoicing procedures.",
        isRequired: true,
      },
      {
        name: "Budget Reconciliation & Cost Control Review",
        phase: "vendor_coordination",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 17,
        estimatedDuration: "2 hours",
        description: "Analyze actual costs versus budget projections, identify potential overages, implement cost control measures, and communicate any budget adjustments to client.",
        isRequired: true,
      },

      // ========== PRE-EVENT PHASE (1-2 weeks before) ==========
      {
        name: "Final Guest Count & Seating Optimization",
        phase: "pre_event",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 18,
        estimatedDuration: "3 hours",
        description: "Lock in final attendance numbers, create optimized seating charts considering relationships and preferences, prepare place cards and escort arrangements.",
        isRequired: true,
      },
      {
        name: "Vendor Timeline Coordination & Run-of-Show",
        phase: "pre_event",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 19,
        estimatedDuration: "4 hours",
        description: "Create detailed day-of timeline for all vendors including setup, service, breakdown schedules. Coordinate key moments, transitions, and contingency plans.",
        isRequired: true,
      },
      {
        name: "Final Vendor Confirmations & Communication Brief",
        phase: "pre_event",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 20,
        estimatedDuration: "3 hours",
        description: "Confirm all vendor details, delivery times, contact information, special requirements, and emergency procedures. Distribute comprehensive event brief to all parties.",
        isRequired: true,
      },
      {
        name: "Emergency Preparedness & Day-Of Kit Assembly",
        phase: "pre_event",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 21,
        estimatedDuration: "2 hours",
        description: "Prepare comprehensive emergency kit with tools, touch-up supplies, first aid materials, backup equipment, and vendor contact lists.",
        isRequired: true,
      },
      {
        name: "Client Final Walkthrough & Sign-Off",
        phase: "pre_event",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 22,
        estimatedDuration: "2 hours",
        description: "Present final event arrangements, review all details with client, obtain approval on arrangements, and address any last-minute concerns or changes.",
        isRequired: true,
      },

      // ========== EXECUTION PHASE (Event Day) ==========
      {
        name: "Early Setup Supervision & Venue Preparation",
        phase: "execution",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 23,
        estimatedDuration: "4 hours",
        description: "Oversee initial vendor arrivals, coordinate setup activities, ensure venue preparation meets specifications, and address any setup challenges immediately.",
        isRequired: true,
      },
      {
        name: "Vendor Management & Timeline Execution",
        phase: "execution",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 24,
        estimatedDuration: "8 hours",
        description: "Manage all vendor activities throughout the event, ensure adherence to timeline, coordinate transitions between event phases, and resolve issues proactively.",
        isRequired: true,
      },
      {
        name: "Guest Experience Management & Problem Resolution",
        phase: "execution",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 25,
        estimatedDuration: "6 hours",
        description: "Welcome and assist guests, manage special requests, coordinate VIP needs, handle accessibility requirements, and resolve any guest service issues immediately.",
        isRequired: true,
      },
      {
        name: "Event Breakdown Coordination & Vendor Departure",
        phase: "execution",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 26,
        estimatedDuration: "3 hours",
        description: "Supervise breakdown procedures, ensure proper equipment return, coordinate vendor departures, and oversee venue restoration to original condition.",
        isRequired: true,
      },

      // ========== POST-EVENT PHASE (1-2 weeks after) ==========
      {
        name: "Client Debrief & Experience Review",
        phase: "post_event",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 27,
        estimatedDuration: "1 hour",
        description: "Conduct comprehensive post-event meeting with client to review successes, gather feedback, discuss any concerns, and explore future event opportunities.",
        isRequired: true,
      },
      {
        name: "Vendor Performance Evaluation & Payment Processing",
        phase: "post_event",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 28,
        estimatedDuration: "2 hours",
        description: "Evaluate all vendor performance, process final payments, document performance ratings, and update vendor database with detailed service records.",
        isRequired: true,
      },
      {
        name: "Financial Reconciliation & Final Invoicing",
        phase: "post_event",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 29,
        estimatedDuration: "2 hours",
        description: "Complete final expense reconciliation, prepare comprehensive client invoice, process all vendor payments, and finalize all financial documentation.",
        isRequired: true,
      },
      {
        name: "Media Delivery & Portfolio Development",
        phase: "post_event",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 30,
        estimatedDuration: "2 hours",
        description: "Collect and deliver final photos/videos to client, update company portfolio with successful event imagery, and create case studies for marketing purposes.",
        isRequired: false,
      },
      {
        name: "Project Documentation & Process Improvement",
        phase: "post_event",
        eventTypes: ["wedding", "corporate", "birthday", "anniversary"],
        order: 31,
        estimatedDuration: "1 hour",
        description: "Document complete project details, record successful strategies and challenges, identify process improvements, and update standard operating procedures for future events.",
        isRequired: false,
      },
    ];

    for (const template of templates) {
      await this.createActivityTemplate(template as any);
    }
  }

  async instantiateActivitiesFromTemplates(eventId: string, eventType: string): Promise<Activity[]> {
    const templates = await this.getActivityTemplates(undefined, eventType);
    const activities: Activity[] = [];

    for (const template of templates) {
      const activity = await this.createActivity({
        eventId,
        phase: template.phase,
        status: "pending",
        description: template.description,
      } as any);
      activities.push(activity);
    }

    return activities;
  }

  // Phase Sign-offs Implementation

  async getPhaseSignoffs(eventId: string): Promise<PhaseSignoff[]> {
    const allSignoffs = Array.from(this.phaseSignoffs.values());
    return allSignoffs.filter(signoff => signoff.eventId === eventId);
  }

  async createPhaseSignoff(signoff: InsertPhaseSignoff): Promise<PhaseSignoff> {
    const id = randomUUID();
    const newSignoff = { id, ...signoff, signedOffAt: new Date() } as unknown as PhaseSignoff;
    this.phaseSignoffs.set(id, newSignoff);
    return newSignoff;
  }

  async getPhaseProgress(eventId: string, phase: string): Promise<{ completed: number; total: number; percentage: number }> {
    const activities = await this.getActivitiesByEventId(eventId);
    const phaseActivities = activities.filter(activity => activity.phase === phase);
    const completed = phaseActivities.filter(activity => activity.status === "completed").length;
    const total = phaseActivities.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }

  // Activity Audit Log Implementation

  async createActivityAuditLog(auditLog: InsertActivityAuditLog): Promise<ActivityAuditLog> {
    const id = randomUUID();
    const newAuditLog = { id, ...auditLog, timestamp: new Date() } as unknown as ActivityAuditLog;
    this.activityAuditLog.set(id, newAuditLog);
    return newAuditLog;
  }

  async getActivityAuditLog(activityId: string): Promise<ActivityAuditLog[]> {
    const allLogs = Array.from(this.activityAuditLog.values());
    return allLogs
      .filter(log => (log.activityId as any) === activityId)
      .sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
  }

  // Saved Activity Views Implementation

  async getSavedActivityViews(userId: string): Promise<SavedActivityView[]> {
    const allViews = Array.from(this.savedActivityViews.values());
    return allViews.filter(view => view.userId === userId);
  }

  async createSavedActivityView(view: InsertSavedActivityView): Promise<SavedActivityView> {
    const id = randomUUID();
    const newView = { id, ...view, createdAt: new Date() } as unknown as SavedActivityView;
    this.savedActivityViews.set(id, newView);
    return newView;
  }

  async updateSavedActivityView(id: string, view: Partial<InsertSavedActivityView>): Promise<SavedActivityView | undefined> {
    const existingView = this.savedActivityViews.get(id);
    if (!existingView) return undefined;

    const updatedView: SavedActivityView = {
      ...existingView,
      ...view,
    };
    this.savedActivityViews.set(id, updatedView);
    return updatedView;
  }

  async deleteSavedActivityView(id: string): Promise<boolean> {
    return this.savedActivityViews.delete(id);
  }

  async getArtifacts(eventId: string, category?: string): Promise<Artifact[]> {
    return [];
  }

  async getAllArtifacts(): Promise<Artifact[]> {
    return [];
  }

  async getArtifact(id: string): Promise<Artifact | undefined> {
    return undefined;
  }

  async createArtifact(artifact: InsertArtifact): Promise<Artifact> {
    const id = randomUUID();
    return { ...artifact, id, createdAt: new Date() } as unknown as Artifact;
  }

  async deleteArtifact(id: string): Promise<boolean> {
    return true;
  }

  private eventCollaborators: Map<string, EventCollaborator> = new Map();

  async getEventCollaborators(eventId: string): Promise<EventCollaborator[]> {
    return Array.from(this.eventCollaborators.values()).filter(c => c.eventId === eventId);
  }

  async getCollaboratorById(id: string): Promise<EventCollaborator | undefined> {
    return this.eventCollaborators.get(id);
  }

  async getCollaboratorByToken(token: string): Promise<EventCollaborator | undefined> {
    return Array.from(this.eventCollaborators.values()).find(c => (c as any).inviteToken === token);
  }

  async getCollaborationsByEmail(email: string): Promise<EventCollaborator[]> {
    return Array.from(this.eventCollaborators.values()).filter(c => (c as any).email.toLowerCase() === email.toLowerCase());
  }

  async createEventCollaborator(collaborator: InsertEventCollaborator): Promise<EventCollaborator> {
    const id = randomUUID();
    const inviteToken = randomUUID();
    const newCollaborator = {
      ...collaborator,
      id,
      inviteToken,
      status: (collaborator as any).status || 'pending',
      role: collaborator.role || 'editor',
      acceptedAt: null,
      createdAt: new Date(),
    } as unknown as EventCollaborator;
    this.eventCollaborators.set(id, newCollaborator);
    return newCollaborator;
  }

  async updateEventCollaborator(id: string, data: Partial<EventCollaborator>): Promise<EventCollaborator | undefined> {
    const existing = this.eventCollaborators.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.eventCollaborators.set(id, updated);
    return updated;
  }

  async deleteEventCollaborator(id: string): Promise<boolean> {
    return this.eventCollaborators.delete(id);
  }

  // Booth Bookings (in-memory mock; production uses DatabaseStorage)
  private boothBookings: Map<string, any> = new Map();

  async getBoothBooking(token: string): Promise<any | undefined> {
    return Array.from(this.boothBookings.values()).find(b => b.token === token);
  }

  async getBoothBookings(): Promise<any[]> {
    return Array.from(this.boothBookings.values());
  }

  async createBoothBooking(booking: any): Promise<any> {
    const id = randomUUID();
    const newBooking = { id, ...booking, createdAt: new Date() };
    this.boothBookings.set(id, newBooking);
    return newBooking;
  }

  async updateBoothBooking(id: string, data: any): Promise<any | undefined> {
    const existing = this.boothBookings.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.boothBookings.set(id, updated);
    return updated;
  }

  async createBoothBookingAuditLog(entry: any): Promise<any> {
    return { id: randomUUID(), ...entry, timestamp: new Date() };
  }

  async getBoothBookingAuditLog(bookingId: string): Promise<any[]> {
    return [];
  }
}

// Use DatabaseStorage for production
import { storage as dbStorage } from "./storage-database";
export const storage = dbStorage;