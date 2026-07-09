import { 
  type User, 
  type Client,
  type Event, 
  type Vendor, 
  type DecorVendor,
  type Task, 
  type BudgetItem, 
  type Contract,
  type InsertUser, 
  type InsertClient,
  type InsertEvent, 
  type InsertVendor,
  type InsertDecorVendor,
  type InsertTask, 
  type InsertBudgetItem, 
  type InsertContract
} from "@workspace/db";
import { randomUUID } from "crypto";

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
  createPrivateEventSubmission(submission: any): Promise<any>;
  createCorporateEventSubmission(submission: any): Promise<any>;

  // Events
  getEvent(id: string): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;

  // Vendors
  getAllVendors(): Promise<Vendor[]>;
  getVendorsByEventId(eventId: string): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<boolean>;

  // Tasks
  getTasksByEventId(eventId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Budget
  getBudgetItemsByEventId(eventId: string): Promise<BudgetItem[]>;
  createBudgetItem(budgetItem: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(id: string, budgetItem: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined>;
  deleteBudgetItem(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private clients: Map<string, Client>;
  private events: Map<string, Event>;
  private vendors: Map<string, Vendor>;
  private tasks: Map<string, Task>;
  private budgetItems: Map<string, BudgetItem>;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.events = new Map();
    this.vendors = new Map();
    this.tasks = new Map();
    this.budgetItems = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = randomUUID();
    const user = {
      id,
      username: userData.username || null,
      password: userData.password,
      name: userData.name,
      role: userData.role || "client",
      email: userData.email,
      country: userData.country || null,
      phone: null,
      department: null,
      jobTitle: null,
    } as User;
    this.users.set(id, user);
    return user;
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
    for (const client of this.clients.values()) {
      if (client.email === email) {
        return client;
      }
    }
    return undefined;
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = {
      id,
      fullName: clientData.fullName || null,
      companyName: clientData.companyName || null,
      email: clientData.email,
      contactPerson: clientData.contactPerson || null,
      createdAt: new Date(),
    };
    this.clients.set(id, client);
    return client;
  }

  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  // Event submissions
  async createPrivateEventSubmission(submission: any): Promise<any> {
    return { id: randomUUID(), ...submission, createdAt: new Date() };
  }

  async createCorporateEventSubmission(submission: any): Promise<any> {
    return { id: randomUUID(), ...submission, createdAt: new Date() };
  }

  // Events
  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const ed = eventData as any;
    const event = {
      id,
      ...ed,
      createdAt: new Date(),
    } as any as Event;
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: string, eventData: Partial<InsertEvent>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...eventData };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<boolean> {
    return this.events.delete(id);
  }

  // Vendors
  async getAllVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values());
  }

  async getVendorsByEventId(eventId: string): Promise<Vendor[]> {
    return Array.from(this.vendors.values()).filter(vendor => vendor.eventId === eventId);
  }

  async createVendor(vendorData: InsertVendor): Promise<Vendor> {
    const id = randomUUID();
    const vd = vendorData as any;
    const vendor = {
      id,
      ...vd,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any as Vendor;
    this.vendors.set(id, vendor);
    return vendor;
  }

  async updateVendor(id: string, vendorData: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const vendor = this.vendors.get(id);
    if (!vendor) return undefined;
    
    const updatedVendor = { ...vendor, ...vendorData, updatedAt: new Date() };
    this.vendors.set(id, updatedVendor);
    return updatedVendor;
  }

  async deleteVendor(id: string): Promise<boolean> {
    return this.vendors.delete(id);
  }

  // Tasks
  async getTasksByEventId(eventId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.eventId === eventId);
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      id,
      status: taskData.status || "todo",
      priority: taskData.priority || "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
      description: taskData.description || null,
      eventId: taskData.eventId ?? null,
      title: taskData.title,
      dueDate: taskData.dueDate || null,
      assignedTo: taskData.assignedTo || null,
      assignedToVendor: taskData.assignedToVendor || null,
      eventType: taskData.eventType || null,
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...taskData };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Budget
  async getBudgetItemsByEventId(eventId: string): Promise<BudgetItem[]> {
    return Array.from(this.budgetItems.values()).filter(item => item.eventId === eventId);
  }

  async createBudgetItem(budgetData: InsertBudgetItem): Promise<BudgetItem> {
    const id = randomUUID();
    const budgetItem = {
      id,
      currency: budgetData.currency || "USD",
      eventId: budgetData.eventId,
      category: budgetData.category,
      dueDate: budgetData.dueDate || null,
      item: budgetData.item,
      estimatedCost: budgetData.estimatedCost,
      actualCost: budgetData.actualCost || null,
      paidAmount: budgetData.paidAmount || null,
      paid: budgetData.paid || false,
    } as BudgetItem;
    this.budgetItems.set(id, budgetItem);
    return budgetItem;
  }

  async updateBudgetItem(id: string, budgetData: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined> {
    const budgetItem = this.budgetItems.get(id);
    if (!budgetItem) return undefined;
    
    const updatedBudgetItem = { ...budgetItem, ...budgetData };
    this.budgetItems.set(id, updatedBudgetItem);
    return updatedBudgetItem;
  }

  async deleteBudgetItem(id: string): Promise<boolean> {
    return this.budgetItems.delete(id);
  }

  // Stub methods for missing functionality
  async getContractsByEventId(eventId: string): Promise<any[]> {
    return [];
  }

  async getAllDecorVendors(): Promise<any[]> {
    return [];
  }

  async createDecorVendor(vendor: any): Promise<any> {
    return { id: randomUUID(), ...vendor };
  }

  async updateDecorVendor(id: string, vendor: any): Promise<any> {
    return { id, ...vendor };
  }

  async deleteDecorVendor(id: string): Promise<boolean> {
    return true;
  }

  async createContract(contract: any): Promise<any> {
    return { id: randomUUID(), ...contract };
  }

  async getContractById(id: string): Promise<any> {
    return null;
  }

  async updateContract(id: string, contract: any): Promise<any> {
    return { id, ...contract };
  }

  async getAllContracts(): Promise<any[]> {
    return [];
  }

  async deleteContract(id: string): Promise<boolean> {
    return true;
  }

  async getFloorPlansByEvent(eventId: string): Promise<any[]> {
    return [];
  }

  async getVenueDesignsByEvent(eventId: string): Promise<any[]> {
    return [];
  }

  async getDecorCatalog(): Promise<any[]> {
    return [];
  }

  async createDecorItem(item: any): Promise<any> {
    return { id: randomUUID(), ...item };
  }

  async getDecorPlansByEvent(eventId: string): Promise<any[]> {
    return [];
  }

  async generateDecorPlan(params: any): Promise<any> {
    return { id: randomUUID(), ...params };
  }

  async updateDecorPlan(id: string, plan: any): Promise<any> {
    return { id, ...plan };
  }

  async getVenueImagesByEvent(eventId: string): Promise<any[]> {
    return [];
  }

  async createVenueImage(image: any): Promise<any> {
    return { id: randomUUID(), ...image };
  }

  async createFloorPlan(plan: any): Promise<any> {
    return { id: randomUUID(), ...plan };
  }

  async createVenueDesign(design: any): Promise<any> {
    return { id: randomUUID(), ...design };
  }

  async getEventNotesByEventId(eventId: string): Promise<any[]> {
    return [];
  }

  async createEventNote(note: any): Promise<any> {
    return { id: randomUUID(), ...note };
  }

  async updateEventNote(id: string, note: any): Promise<any> {
    return { id, ...note };
  }

  async deleteEventNote(id: string): Promise<boolean> {
    return true;
  }

  async getMeetingsByEventId(eventId: string): Promise<any[]> {
    return [];
  }

  async createMeeting(meeting: any): Promise<any> {
    return { id: randomUUID(), ...meeting };
  }

  async getMeetingById(id: string): Promise<any> {
    return null;
  }

  async updateMeeting(id: string, meeting: any): Promise<any> {
    return { id, ...meeting };
  }

  async deleteMeeting(id: string): Promise<boolean> {
    return true;
  }
}

export const storage = new MemStorage();