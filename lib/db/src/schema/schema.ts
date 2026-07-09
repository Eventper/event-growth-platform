import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, decimal, boolean, timestamp, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// User Roles enum for type safety
export const UserRoles = ['client', 'planner', 'admin', 'collaborator', 'staff', 'manager'] as const;
export type UserRole = typeof UserRoles[number];

// Workflow status flow for events
export const EventWorkflowStatus = ['new_intake', 'assigned', 'in_planning', 'event_day', 'post_event', 'closed'] as const;
export type EventWorkflowStatusType = typeof EventWorkflowStatus[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("client"),
  email: text("email").notNull().unique(),
  country: text("country"),
  phone: text("phone"),
  department: text("department"),
  jobTitle: text("job_title"),
});

// Client authentication sessions
export const clientSessions = pgTable("client_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clients table for people booking events
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name"),
  companyName: text("company_name"),
  email: text("email").notNull(),
  contactPerson: text("contact_person"), // for corporate events
  createdAt: timestamp("created_at").defaultNow(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // private, corporate
  eventCategory: text("event_category"), // wedding, birthday, conference, etc.
  
  // Client information
  clientId: varchar("client_id").references(() => clients.id),
  plannerId: varchar("planner_id").references(() => users.id),
  
  // Wedding scope linking
  parentEventId: varchar("parent_event_id"),
  weddingScope: text("wedding_scope"),
  
  // Event details
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  eventDays: integer("event_days").notNull().default(1),
  
  // Location
  country: text("country").notNull(),
  city: text("city").notNull(),
  currency: text("currency").notNull().default("USD"),
  
  // Venues
  ceremonyVenue: text("ceremony_venue"),
  ceremonyAddress: text("ceremony_address"),
  ceremonyDate: timestamp("ceremony_date"),
  receptionVenue: text("reception_venue"),
  receptionAddress: text("reception_address"),
  receptionDate: timestamp("reception_date"),
  afterPartyVenue: text("after_party_venue"),
  afterPartyAddress: text("after_party_address"),
  afterPartyDate: timestamp("after_party_date"),
  
  // Other details
  guestCount: integer("guest_count").notNull().default(0),
  budget: decimal("budget", { precision: 12, scale: 2 }).notNull().default("0"),
  budgetRange: text("budget_range"), // storing budget ranges like "10k-25k"
  
  // Enhanced Event Details
  customEventType: text("custom_event_type"),
  celebrantAge: text("celebrant_age"),
  remembranceDetails: text("remembrance_details"),
  
  // Guest Categories
  hasAdults: boolean("has_adults").default(false),
  hasTeenagers: boolean("has_teenagers").default(false), 
  hasPreteens: boolean("has_preteens").default(false),
  hasChildren: boolean("has_children").default(false),
  
  // Enhanced Services
  needsEndToEndPlanning: boolean("needs_end_to_end_planning").default(false),
  needsDayCoordination: boolean("needs_day_coordination").default(false),
  needsVenueDecoration: boolean("needs_venue_decoration").default(false),
  needsVenueSearch: boolean("needs_venue_search").default(false),
  needsBrandedStyling: boolean("needs_branded_styling").default(false),
  needsHumanResources: boolean("needs_human_resources").default(false),
  needsPartyPacks: boolean("needs_party_packs").default(false),
  needsCorporateGifting: boolean("needs_corporate_gifting").default(false),
  needsConceptDelivery: boolean("needs_concept_delivery").default(false),
  needsAllAbove: boolean("needs_all_above").default(false),
  needsOtherServices: boolean("needs_other_services").default(false),
  otherServicesDetails: text("other_services_details"),
  
  // Requirements
  hasVenue: boolean("has_venue").default(false),
  needsDecor: boolean("needs_decor").default(false),
  needsVendorSupport: boolean("needs_vendor_support").default(false),
  needsPlanningServices: boolean("needs_planning_services").default(false),
  needsBranding: boolean("needs_branding").default(false),
  needsCatering: boolean("needs_catering").default(false),
  needsVendorCoordination: boolean("needs_vendor_coordination").default(false),
  
  // Cultural/traditional needs
  culturalNeeds: text("cultural_needs"),

  // Decor Preferences
  preferredColors: json("preferred_colors").$type<string[]>(),
  colorTheme: text("color_theme"),
  decorStyle: text("decor_style"),
  decorTheme: text("decor_theme"),
  moodDescription: text("mood_description"),
  inspirationSources: text("inspiration_sources"),
  brandColors: json("brand_colors").$type<string[]>(),
  brandingRequirements: text("branding_requirements"),
  avoidColors: json("avoid_colors").$type<string[]>(),
  decorPriorities: json("decor_priorities").$type<string[]>(),
  specialDecorRequests: text("special_decor_requests"),
  
  // Event Website Settings
  rsvpEnabled: boolean("rsvp_enabled").default(true),
  showGuestCount: boolean("show_guest_count").default(true),
  eventWebsiteEnabled: boolean("event_website_enabled").default(true),
  
  // Planning mode
  planningMode: text("planning_mode").default("full_planning"),
  
  // Event type-specific fields
  publicSectorBody: text("public_sector_body"),
  charityRegistration: text("charity_registration"),
  schoolOrInstitution: text("school_or_institution"),
  privateOccasionType: text("private_occasion_type"),
  crossBorderCountries: text("cross_border_countries"),
  twinPaayEnabled: boolean("twin_paay_enabled").default(false),
  internationalTravelRequired: boolean("international_travel_required").default(false),
  internationalVisaSupport: boolean("international_visa_support").default(false),

  // Day Coordination specific fields
  clientOwnPlanner: text("client_own_planner"),
  existingVendors: text("existing_vendors"),
  existingTimeline: text("existing_timeline"),
  coordinationScope: text("coordination_scope"),
  setupTime: text("setup_time"),
  clientContactOnDay: text("client_contact_on_day"),
  emergencyContact: text("emergency_contact"),
  
  // Status and metadata
  status: text("status").notNull().default("planning"),
  heroImage: text("hero_image"),
  companyLogo: text("company_logo"),
  createdAt: timestamp("created_at").defaultNow(),
  
  // Timeline tracking
  currentPhase: text("current_phase").default("initial"),
  timelineProgress: integer("timeline_progress").default(0),
  
  // Contract and invoice tracking
  contractGenerated: boolean("contract_generated").default(false),
  contractSigned: boolean("contract_signed").default(false),
  invoiceGenerated: boolean("invoice_generated").default(false),
  depositPaid: boolean("deposit_paid").default(false),
  
  // === WORKFLOW ROUTING ===
  workflowStatus: text("workflow_status").notNull().default("new_intake"),
  assignedManagerId: varchar("assigned_manager_id").references(() => users.id),
  intakeNotes: text("intake_notes"),
  assignedAt: timestamp("assigned_at"),
  acceptedAt: timestamp("accepted_at"),
});

export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }),
  vendorId: varchar("vendor_id"),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  filePath: text("file_path"),
  templateType: text("template_type"),
  status: text("status").notNull().default("pending"),
  signedDate: timestamp("signed_date"),
  sentDate: timestamp("sent_date"),
  contractContent: json("contract_content").$type<any>(),
  clientSignature: json("client_signature").$type<any>(),
  plannerSignature: json("planner_signature").$type<any>(),
  version: integer("version").default(1),
  previousVersionId: varchar("previous_version_id"),
  revisionNotes: text("revision_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  invoiceNumber: text("invoice_number").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  type: text("type").default("standard"),
  status: text("status").notNull().default("draft"),
  dueDate: timestamp("due_date"),
  lineItems: jsonb("line_items").$type<any[]>(),
  taxes: jsonb("taxes").$type<any[]>(),
  paymentLink: text("payment_link"),
  txRef: text("tx_ref"),
  paymentSentAt: timestamp("payment_sent_at"),
  paidDate: timestamp("paid_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("draft"),
  validUntil: timestamp("valid_until"),
  heroImage: text("hero_image"),
  galleryImages: jsonb("gallery_images").$type<string[]>(),
  sections: jsonb("sections").$type<any[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inspirationImages = pgTable("inspiration_images", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }),
  title: text("title"),
  imageUrl: text("image_url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const privateEventSubmissions = pgTable("private_event_submissions", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const corporateEventSubmissions = pgTable("corporate_event_submissions", {
  id: serial("id").primaryKey(),
  companyName: text("company_name"),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const decorVendors = pgTable("decor_vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventTeam = pgTable("event_team", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
  addedBy: varchar("added_by").references(() => users.id),
  briefSent: boolean("brief_sent").default(false),
  notes: text("notes"),
});

export const insertEventTeamSchema = createInsertSchema(eventTeam).omit({ id: true, addedAt: true });
export type InsertEventTeam = z.infer<typeof insertEventTeamSchema>;
export type EventTeam = typeof eventTeam.$inferSelect;

export const gatewayMeetings = pgTable("gateway_meetings", {
  id: serial("id").primaryKey(),
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  phaseNumber: integer("phase_number").notNull(),
  gatewayType: text("gateway_type").notNull(),
  meetingDate: timestamp("meeting_date"),
  location: text("location"),
  meetingLink: text("meeting_link"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGatewayMeetingSchema = createInsertSchema(gatewayMeetings).omit({ id: true, createdAt: true });
export type InsertGatewayMeeting = z.infer<typeof insertGatewayMeetingSchema>;
export type GatewayMeeting = typeof gatewayMeetings.$inferSelect;

export const gatewayMeetingSlots = pgTable("gateway_meeting_slots", {
  id: serial("id").primaryKey(),
  gatewayMeetingId: integer("gateway_meeting_id").notNull().references(() => gatewayMeetings.id, { onDelete: "cascade" }),
  slotLabel: text("slot_label").notNull(),
  slotDate: timestamp("slot_date").notNull(),
  isSelected: boolean("is_selected").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGatewayMeetingSlotSchema = createInsertSchema(gatewayMeetingSlots).omit({ id: true, createdAt: true });
export type InsertGatewayMeetingSlot = z.infer<typeof insertGatewayMeetingSlotSchema>;
export type GatewayMeetingSlot = typeof gatewayMeetingSlots.$inferSelect;

export const gatewayMeetingResponses = pgTable("gateway_meeting_responses", {
  id: serial("id").primaryKey(),
  gatewayMeetingId: integer("gateway_meeting_id").notNull().references(() => gatewayMeetings.id, { onDelete: "cascade" }),
  responderName: text("responder_name").notNull(),
  responderEmail: text("responder_email").notNull(),
  responseStatus: text("response_status").notNull(),
  selectedSlotId: integer("selected_slot_id").references(() => gatewayMeetingSlots.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGatewayMeetingResponseSchema = createInsertSchema(gatewayMeetingResponses).omit({ id: true, createdAt: true });
export type InsertGatewayMeetingResponse = z.infer<typeof insertGatewayMeetingResponseSchema>;
export type GatewayMeetingResponse = typeof gatewayMeetingResponses.$inferSelect;

export const prospectCampaigns = pgTable("ep_prospect_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  targetAudience: text("target_audience"),
  targetJobTitles: text("target_job_titles").array(),
  targetSectors: text("target_sectors").array(),
  targetLocations: jsonb("target_locations").$type<any[]>(),
  excludeLocations: text("exclude_locations").array(),
  searchSources: text("search_sources").array(),
  searchFrequency: text("search_frequency"),
  searchDayOfWeek: integer("search_day_of_week"),
  searchTime: text("search_time"),
  emailTone: text("email_tone"),
  approvalRule: text("approval_rule"),
  status: text("status"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProspectCampaignSchema = createInsertSchema(prospectCampaigns).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProspectCampaign = z.infer<typeof insertProspectCampaignSchema>;
export type ProspectCampaign = typeof prospectCampaigns.$inferSelect;

export const companyProspects = pgTable("company_prospects", {
  id: serial("id").primaryKey(),
  company_name: text("company_name").notNull(),
  industry: text("industry"),
  location: text("location"),
  country: text("country"),
  website: text("website"),
  campaignId: integer("campaign_id").references(() => prospectCampaigns.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompanyProspectSchema = createInsertSchema(companyProspects).omit({ id: true, createdAt: true });
export type InsertCompanyProspect = z.infer<typeof insertCompanyProspectSchema>;
export type CompanyProspect = typeof companyProspects.$inferSelect;

export const pendingOutreachEmails = pgTable("pending_outreach_emails", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id"),
  companyName: text("company_name"),
  contactName: text("contact_name"),
  contactTitle: text("contact_title"),
  toEmail: text("to_email"),
  fromEmail: text("from_email"),
  fromName: text("from_name"),
  subject: text("subject"),
  body: text("body"),
  triggerType: text("trigger_type"),
  countryGroup: text("country_group"),
  campaignId: integer("campaign_id"),
  status: text("status"),
  rejectionReason: text("rejection_reason"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPendingOutreachEmailSchema = createInsertSchema(pendingOutreachEmails).omit({ id: true, createdAt: true });
export type InsertPendingOutreachEmail = z.infer<typeof insertPendingOutreachEmailSchema>;
export type PendingOutreachEmail = typeof pendingOutreachEmails.$inferSelect;

export const clientPortalDocuments = pgTable("client_portal_documents", {
  id: serial("id").primaryKey(),
  projectId: text("project_id").notNull(),
  sourceDocumentId: integer("source_document_id"),
  documentName: text("document_name").notNull(),
  documentCategory: text("document_category"),
  documentSubcategory: text("document_subcategory"),
  documentType: text("document_type"),
  currentVersion: integer("current_version").notNull().default(1),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedByType: text("uploaded_by_type").notNull().default("ep"),
  sharedWithClient: boolean("shared_with_client").notNull().default(true),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  signedBy: text("signed_by"),
  signedAt: timestamp("signed_at"),
  signatureText: text("signature_text"),
  isSigned: boolean("is_signed").notNull().default(false),
  readBy: text("read_by"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientPortalDocumentComments = pgTable("client_portal_document_comments", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  commenterName: text("commenter_name").notNull(),
  commenterType: text("commenter_type").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  fileName: text("file_name"),
  fileUrl: text("file_url"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const enhancedVenueImages = pgTable("enhanced_venue_images", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const floorPlans = pgTable("floor_plans", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fileUrl: text("file_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventCollaborators = pgTable("event_collaborators", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventNotes = pgTable("event_notes", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventPlanningLog = pgTable("event_planning_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  entityType: text("entity_type"),
  entityId: varchar("entity_id"),
  entityName: text("entity_name"),
  changedBy: varchar("changed_by"),
  changedByName: text("changed_by_name"),
  fieldsChanged: json("fields_changed"),
  decisionType: text("decision_type"),
  decisionRationale: text("decision_rationale"),
  impact: text("impact"),
  priority: text("priority").default("normal"),
  tags: json("tags").default([]),
  metadata: json("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  dueDate: timestamp("due_date"),
  assignedTo: varchar("assigned_to"),
  assignedToVendor: varchar("assigned_to_vendor"),
  eventType: text("event_type"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;

export const clientPortalChangeRequests = pgTable("client_portal_change_requests", {
  id: serial("id").primaryKey(),
  projectId: text("project_id").notNull(),
  documentId: integer("document_id").references(() => clientPortalDocuments.id, { onDelete: "cascade" }),
  changeDescription: text("change_description").notNull(),
  purpose: text("purpose").notNull(),
  costImpact: text("cost_impact"),
  owner: text("owner").notNull(),
  requestedDate: timestamp("requested_date").notNull().defaultNow(),
  status: text("status").notNull().default("pending"),
  epNotes: text("ep_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientPortalChangeRequestSchema = createInsertSchema(clientPortalChangeRequests).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  status: z.string().optional(),
  requestedDate: z.coerce.date().optional(),
});

export type InsertClientPortalChangeRequest = z.infer<typeof insertClientPortalChangeRequestSchema>;
export type ClientPortalChangeRequest = typeof clientPortalChangeRequests.$inferSelect;

// ============================================================
// RESTORED MISSING TABLE DEFINITIONS
// ============================================================

export const iamHerTasks = pgTable("iam_her_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventKey: text("event_key").notNull(),
  title: text("title").notNull(),
  completed: boolean("completed").default(false),
  assignedTo: text("assigned_to"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIamHerTaskSchema = createInsertSchema(iamHerTasks).omit({ id: true, createdAt: true });
export type InsertIamHerTask = z.infer<typeof insertIamHerTaskSchema>;
export type IamHerTask = typeof iamHerTasks.$inferSelect;

export const iamHerDocuments = pgTable("iam_her_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventKey: text("event_key").notNull(),
  title: text("title").notNull(),
  fileName: text("file_name"),
  fileUrl: text("file_url"),
  category: text("category"),
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIamHerDocumentSchema = createInsertSchema(iamHerDocuments).omit({ id: true, createdAt: true });
export type InsertIamHerDocument = z.infer<typeof insertIamHerDocumentSchema>;
export type IamHerDocument = typeof iamHerDocuments.$inferSelect;

export const iamHerMessages = pgTable("iam_her_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventKey: text("event_key").notNull(),
  senderName: text("sender_name").notNull(),
  senderRole: text("sender_role").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIamHerMessageSchema = createInsertSchema(iamHerMessages).omit({ id: true, createdAt: true });
export type InsertIamHerMessage = z.infer<typeof insertIamHerMessageSchema>;
export type IamHerMessage = typeof iamHerMessages.$inferSelect;

export const iamHerSummaryCache = pgTable("iam_her_summary_cache", {
  key: text("key").primaryKey(),
  payload: jsonb("payload").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIamHerSummaryCacheSchema = createInsertSchema(iamHerSummaryCache).omit({ createdAt: true });
export type InsertIamHerSummaryCache = z.infer<typeof insertIamHerSummaryCacheSchema>;
export type IamHerSummaryCache = typeof iamHerSummaryCache.$inferSelect;

export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }),
  name: text("name"),
  service: text("service"),
  category: text("category"),
  website: text("website"),
  email: text("email"),
  phone: text("phone"),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  status: text("status"),
  assignedSegment: text("assigned_segment"),
  contractPath: text("contract_path"),
  profileImage: text("profile_image"),
  portfolioImages: json("portfolio_images").$type<string[]>(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  location: text("location"),
  isDecorVendor: boolean("is_decor_vendor").default(false),
  furnitureTypes: json("furniture_types").$type<string[]>(),
  specialties: text("specialties"),
  description: text("description"),
  companyName: text("company_name"),
  serviceType: text("service_type").default("general"),
  serviceDescription: text("service_description"),
  serviceDate: timestamp("service_date"),
  serviceTime: text("service_time"),
  eventSegment: text("event_segment"),
  staffCount: integer("staff_count").default(1),
  equipmentList: json("equipment_list").$type<any[]>(),
  specialRequirements: text("special_requirements"),
  isOnVendorList: boolean("is_on_vendor_list").default(false),
  contractStatus: text("contract_status").default("pending"),
  contractSentDate: timestamp("contract_sent_date"),
  contractSignedDate: timestamp("contract_signed_date"),
  quotedAmount: decimal("quoted_amount", { precision: 12, scale: 2 }),
  finalAmount: decimal("final_amount", { precision: 12, scale: 2 }),
  currency: text("currency").default("USD"),
  paymentStatus: text("payment_status").default("unpaid"),
  depositAmount: decimal("deposit_amount", { precision: 12, scale: 2 }),
  depositPaid: boolean("deposit_paid").default(false),
  priority: text("priority").default("medium"),
  notes: text("notes"),
  contactedDate: timestamp("contacted_date"),
  confirmedDate: timestamp("confirmed_date"),
  additionalDocuments: json("additional_documents").$type<any[]>(),
  budgetTier: text("budget_tier").default("mid_range"),
  qualificationStatus: text("qualification_status").default("unverified"),
  overallRating: decimal("overall_rating", { precision: 3, scale: 2 }).default("0"),
  reliabilityScore: decimal("reliability_score", { precision: 3, scale: 2 }).default("0"),
  qualityScore: decimal("quality_score", { precision: 3, scale: 2 }).default("0"),
  punctualityScore: decimal("punctuality_score", { precision: 3, scale: 2 }).default("0"),
  communicationScore: decimal("communication_score", { precision: 3, scale: 2 }).default("0"),
  valueScore: decimal("value_score", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

export const guests = pgTable("guests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  groupName: text("group_name").default("General"),
  tableAssignment: text("table_assignment"),
  seatNumber: integer("seat_number"),
  rsvpStatus: text("rsvp_status").notNull().default("pending"),
  rsvpDate: timestamp("rsvp_date"),
  rsvpToken: varchar("rsvp_token"),
  plusOnes: integer("plus_ones").default(0),
  plusOneNames: text("plus_one_names"),
  dietaryRequirements: text("dietary_requirements"),
  mealChoice: text("meal_choice"),
  specialNeeds: text("special_needs"),
  notes: text("notes"),
  invitationSent: boolean("invitation_sent").default(false),
  invitationSentAt: timestamp("invitation_sent_at"),
  reminderSent: boolean("reminder_sent").default(false),
  reminderSentAt: timestamp("reminder_sent_at"),
  checkedIn: boolean("checked_in").default(false),
  checkedInAt: timestamp("checked_in_at"),
  // Paperless-Post-grade tracking
  emailDeliveredAt: timestamp("email_delivered_at"),
  emailOpenedAt: timestamp("email_opened_at"),
  invitationViewedAt: timestamp("invitation_viewed_at"),
  reminderCount: integer("reminder_count").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  envelopeColorOverride: text("envelope_color_override"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGuestSchema = createInsertSchema(guests).omit({ id: true, createdAt: true });
export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Guest = typeof guests.$inferSelect;

// Per-guest invitation activity log — full audit trail for live feed + analytics
export const invitationEvents = pgTable("invitation_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guestId: varchar("guest_id").notNull().references(() => guests.id, { onDelete: "cascade" }),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  invitationId: varchar("invitation_id"),
  type: text("type").notNull(), // sent | delivered | opened | viewed | rsvp_accepted | rsvp_declined | reminder_sent | failed
  channel: text("channel"), // email | whatsapp | sms
  occurredAt: timestamp("occurred_at").defaultNow(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  metadata: json("metadata").$type<Record<string, any>>(),
});
export const insertInvitationEventSchema = createInsertSchema(invitationEvents).omit({ id: true, occurredAt: true });
export type InsertInvitationEvent = z.infer<typeof insertInvitationEventSchema>;
export type InvitationEvent = typeof invitationEvents.$inferSelect;

export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  template: text("template").notNull().default("classic"),
  backgroundColor: text("background_color").default("#ffffff"),
  textColor: text("text_color").default("#330311"),
  accentColor: text("accent_color").default("#8B1538"),
  fontFamily: text("font_family").default("Playfair Display"),
  headerText: text("header_text"),
  bodyText: text("body_text"),
  footerText: text("footer_text"),
  hostNames: text("host_names"),
  venueText: text("venue_text"),
  dateText: text("date_text"),
  timeText: text("time_text"),
  dressCode: text("dress_code"),
  rsvpDeadline: text("rsvp_deadline"),
  customImageUrl: text("custom_image_url"),
  canvaDesignUrl: text("canva_design_url"),
  includeQrCode: boolean("include_qr_code").default(true),
  includeMap: boolean("include_map").default(false),
  envelopeColor: text("envelope_color").default("#330311"),
  linerPattern: text("liner_pattern").default("floral"),
  // Premium reveal flourishes (Paperless-Post-grade)
  waxSealEnabled: boolean("wax_seal_enabled").default(true),
  waxSealMonogram: text("wax_seal_monogram").default("EP"),
  foilShimmerEnabled: boolean("foil_shimmer_enabled").default(true),
  confettiOnAccept: boolean("confetti_on_accept").default(true),
  // Auto-reminder rules
  autoReminderEnabled: boolean("auto_reminder_enabled").default(false),
  autoReminderDaysAfterSend: integer("auto_reminder_days_after_send").default(7),
  autoReminderMaxCount: integer("auto_reminder_max_count").default(2),
  isPublished: boolean("is_published").default(false),
  sentCount: integer("sent_count").default(0),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  scheduledBy: varchar("scheduled_by").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  meetingType: text("meeting_type").notNull().default("planning"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration").default(60),
  location: text("location"),
  status: text("status").notNull().default("scheduled"),
  attendees: json("attendees").$type<any[]>(),
  agenda: json("agenda").$type<any[]>(),
  meetingMinutes: text("meeting_minutes"),
  actionItems: json("action_items").$type<any[]>(),
  followUpRequired: boolean("follow_up_required"),
  followUpDate: timestamp("follow_up_date"),
  meetingLink: text("meeting_link"),
  meetingPlatform: text("meeting_platform"),
  endTime: timestamp("end_time"),
  isGlobal: boolean("is_global"),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMeetingTableSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMeeting = z.infer<typeof insertMeetingTableSchema>;
export type Meeting = typeof meetings.$inferSelect;

export const decorItems = pgTable("decor_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id"),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  priceType: text("price_type").notNull().default("per_item"),
  images: json("images").$type<string[]>(),
  specifications: json("specifications").$type<any>(),
  availability: boolean("availability").default(true),
  minQuantity: integer("min_quantity").default(1),
  maxQuantity: integer("max_quantity").default(100),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDecorItemTableSchema = createInsertSchema(decorItems).omit({ id: true, createdAt: true });
export type InsertDecorItem = z.infer<typeof insertDecorItemTableSchema>;
export type DecorItem = typeof decorItems.$inferSelect;

export const plannerNotes = pgTable("planner_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plannerId: varchar("planner_id"),
  section: text("section").notNull(),
  eventId: varchar("event_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: json("tags").$type<string[]>(),
  isPrivate: boolean("is_private"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlannerNoteSchema = createInsertSchema(plannerNotes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlannerNote = z.infer<typeof insertPlannerNoteSchema>;
export type PlannerNote = typeof plannerNotes.$inferSelect;

export const plannerActivityLog = pgTable("planner_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  plannerId: varchar("planner_id"),
  sessionId: text("session_id").notNull(),
  action: text("action").notNull(),
  section: text("section").notNull(),
  details: json("details").$type<any>(),
  timestamp: timestamp("timestamp").defaultNow(),
  durationSeconds: integer("duration_seconds"),
});

export const insertPlannerActivityLogSchema = createInsertSchema(plannerActivityLog).omit({ id: true, timestamp: true });
export type InsertPlannerActivity = z.infer<typeof insertPlannerActivityLogSchema>;
export type PlannerActivity = typeof plannerActivityLog.$inferSelect;

export const venueDesigns = pgTable("venue_designs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }),
  floorPlanId: varchar("floor_plan_id"),
  name: text("name").notNull(),
  style: text("style"),
  colorPalette: json("color_palette").$type<any>(),
  furnitureItems: json("furniture_items").$type<any[]>(),
  decorElements: json("decor_elements").$type<any[]>(),
  lightingPlan: json("lighting_plan").$type<any>(),
  aiRecommendations: json("ai_recommendations").$type<any>(),
  previewImage: text("preview_image"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVenueDesignSchema = createInsertSchema(venueDesigns).omit({ id: true, createdAt: true });
export type InsertVenueDesign = z.infer<typeof insertVenueDesignSchema>;
export type VenueDesign = typeof venueDesigns.$inferSelect;

export const vendorDocuments = pgTable("vendor_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorUserId: varchar("vendor_user_id").notNull(),
  documentType: varchar("document_type").notNull(),
  documentName: varchar("document_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  uploadDate: timestamp("upload_date").defaultNow(),
  verificationStatus: varchar("verification_status"),
  verifiedBy: varchar("verified_by"),
  verificationDate: timestamp("verification_date"),
  verificationNotes: text("verification_notes"),
  expiryDate: timestamp("expiry_date"),
  isRequired: boolean("is_required"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVendorDocumentSchema = createInsertSchema(vendorDocuments).omit({ id: true, createdAt: true, uploadDate: true });
export type InsertVendorDocument = z.infer<typeof insertVendorDocumentSchema>;
export type VendorDocument = typeof vendorDocuments.$inferSelect;

export const vendorCompliance = pgTable("vendor_compliance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorUserId: varchar("vendor_user_id").notNull(),
  questionId: varchar("question_id").notNull(),
  questionText: text("question_text").notNull(),
  questionCategory: varchar("question_category").notNull(),
  answerType: varchar("answer_type").notNull(),
  answer: text("answer"),
  additionalDocuments: text("additional_documents").array(),
  isCompliant: boolean("is_compliant"),
  complianceNotes: text("compliance_notes"),
  reviewedBy: varchar("reviewed_by"),
  reviewDate: timestamp("review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVendorComplianceSchema = createInsertSchema(vendorCompliance).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendorCompliance = z.infer<typeof insertVendorComplianceSchema>;
export type VendorCompliance = typeof vendorCompliance.$inferSelect;

export const vendorAgreements = pgTable("vendor_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorUserId: varchar("vendor_user_id").notNull(),
  agreementType: varchar("agreement_type").notNull(),
  agreementTitle: varchar("agreement_title").notNull(),
  agreementContent: text("agreement_content").notNull(),
  version: varchar("version").notNull(),
  status: varchar("status").notNull(),
  sentDate: timestamp("sent_date"),
  signedDate: timestamp("signed_date"),
  expiryDate: timestamp("expiry_date"),
  digitalSignature: text("digital_signature"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  witnessEmail: varchar("witness_email"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVendorAgreementSchema = createInsertSchema(vendorAgreements).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendorAgreement = z.infer<typeof insertVendorAgreementSchema>;
export type VendorAgreement = typeof vendorAgreements.$inferSelect;

export const vendorNotifications = pgTable("vendor_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorUserId: varchar("vendor_user_id").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(),
  priority: varchar("priority"),
  isRead: boolean("is_read"),
  actionRequired: boolean("action_required"),
  actionUrl: varchar("action_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVendorNotificationSchema = createInsertSchema(vendorNotifications).omit({ id: true, createdAt: true });
export type InsertVendorNotification = z.infer<typeof insertVendorNotificationSchema>;
export type VendorNotification = typeof vendorNotifications.$inferSelect;

// ============================================================
// END RESTORED TABLES
// ============================================================

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertProposalSchema = createInsertSchema(proposals).omit({ id: true, createdAt: true });
export const insertInspirationImageSchema = createInsertSchema(inspirationImages).omit({ id: true, uploadedAt: true });
export const insertEventNoteSchema = createInsertSchema(eventNotes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true, updatedAt: true });

export const insertDecorItemSchema = createInsertSchema(decorItems).omit({ id: true, createdAt: true });
export const decorPlans = pgTable("decor_plans", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  style: text("style"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDecorPlanSchema = createInsertSchema(decorPlans).omit({ id: true, createdAt: true, updatedAt: true });

// Activity Planning System Schemas
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventFeedback = pgTable("event_feedback", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  respondentName: text("respondent_name"),
  respondentEmail: text("respondent_email"),
  respondentType: text("respondent_type").notNull().default("guest"),
  overallRating: integer("overall_rating").notNull().default(0),
  npsScore: integer("nps_score"),
  wouldRecommend: boolean("would_recommend").default(false),
  wouldAttendAgain: boolean("would_attend_again").default(false),
  comments: text("comments"),
  highlights: text("highlights"),
  improvements: text("improvements"),
  categoryRatings: jsonb("category_ratings").default({}),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventFeedbackSchema = createInsertSchema(eventFeedback).omit({
  id: true,
  createdAt: true,
});

export type InsertEventFeedback = z.infer<typeof insertEventFeedbackSchema>;
export type EventFeedback = typeof eventFeedback.$inferSelect;

export const activityTemplates = pgTable("activity_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const phaseSignoffs = pgTable("phase_signoffs", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  phaseNumber: integer("phase_number").notNull(),
  signedOffBy: varchar("signed_off_by").references(() => users.id),
  signedOffAt: timestamp("signed_off_at"),
  notes: text("notes"),
});

export const activityAuditLog = pgTable("activity_audit_log", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const savedActivityViews = pgTable("saved_activity_views", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filters: jsonb("filters"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiSessionSummaries = pgTable("ai_session_summaries", {
  id: serial("id").primaryKey(),
  plannerId: varchar("planner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionTitle: text("session_title").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contractChangeLog = pgTable("contract_change_log", {
  id: serial("id").primaryKey(),
  contractId: varchar("contract_id").notNull(),
  changeSummary: text("change_summary").notNull(),
  approvalStatus: text("approval_status").notNull().default("pending"),
  approvedBy: text("approved_by"),
  approvedByName: text("approved_by_name"),
  approvalNotes: text("approval_notes"),
  approvalDate: timestamp("approval_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const budgetItems = pgTable("budget_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  item: text("item").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }).notNull(),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }).default("0"),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
  currency: text("currency").notNull().default("USD"),
  paid: boolean("paid").notNull().default(false),
  dueDate: timestamp("due_date"),
  subcategory: text("subcategory").default(""),
  description: text("description").default(""),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1"),
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).default("0"),
  unitType: text("unit_type").default("flat_rate"),
  vendor: text("vendor").default(""),
  status: text("status").default("pending"),
  priority: text("priority").default("medium"),
  notes: text("notes").default(""),
  markupPercent: decimal("markup_percent", { precision: 5, scale: 2 }).default("0"),
  isFromStaffBudget: boolean("is_from_staff_budget").default(false),
  staffResourceId: integer("staff_resource_id"),
  clientStatus: varchar("client_status", { length: 50 }).default("pending"),
  clientQuery: text("client_query"),
  clientQueriedAt: timestamp("client_queried_at"),
  clientApprovedAt: timestamp("client_approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const artifacts = pgTable("artifacts", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAiSessionSummarySchema = createInsertSchema(aiSessionSummaries).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({ id: true, createdAt: true });
export const insertArtifactSchema = createInsertSchema(artifacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContractChangeLogSchema = createInsertSchema(contractChangeLog).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAiSessionSummary = z.infer<typeof insertAiSessionSummarySchema>;
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;
export type InsertContractChangeLog = z.infer<typeof insertContractChangeLogSchema>;

export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivityTemplateSchema = createInsertSchema(activityTemplates).omit({ id: true, createdAt: true });
export const insertPhaseSignoffSchema = createInsertSchema(phaseSignoffs).omit({ id: true, signedOffAt: true });
export const insertActivityAuditLogSchema = createInsertSchema(activityAuditLog).omit({ id: true, timestamp: true });
export const insertSavedActivityViewSchema = createInsertSchema(savedActivityViews).omit({ id: true, createdAt: true });

// ============================================================
// EVENT SERVICES (Add-ons per event)
// ============================================================
export const epEventServices = pgTable("ep_event_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  serviceKey: varchar("service_key").notNull(),          // e.g. "guest_management"
  serviceName: varchar("service_name").notNull(),
  status: varchar("status").default("quoted").notNull(), // quoted | confirmed | cancelled
  pricingModel: varchar("pricing_model").notNull(),      // per_head | flat_fee | package | hourly | quote
  unitPrice: decimal("unit_price").default("0"),
  quantity: integer("quantity").default(1),
  totalPrice: decimal("total_price").default("0"),
  currency: varchar("currency").default("GBP"),
  notes: text("notes"),
  assignedTo: varchar("assigned_to"),                    // staff member name
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertEpEventServiceSchema = createInsertSchema(epEventServices).omit({ id: true, createdAt: true, updatedAt: true });
export type EpEventService = typeof epEventServices.$inferSelect;
export type InsertEpEventService = z.infer<typeof insertEpEventServiceSchema>;

// ============================================================
// ALL TYPE EXPORTS
// ============================================================

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<ReturnType<typeof createInsertSchema<typeof users>>>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = { email: string; fullName?: string | null; companyName?: string | null; contactPerson?: string | null };
export type Event = typeof events.$inferSelect;
export type InsertEvent = Partial<typeof events.$inferSelect> & { name: string; type: string; startDate: Date; endDate: Date; country: string; city: string };
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<ReturnType<typeof createInsertSchema<typeof contracts>>>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<ReturnType<typeof createInsertSchema<typeof documents>>>;
export type InsertPrivateEventSubmission = z.infer<typeof insertPrivateEventSubmissionSchema>;
export type InsertCorporateEventSubmission = z.infer<typeof insertCorporateEventSubmissionSchema>;
export type DecorVendor = typeof decorVendors.$inferSelect;
export type InsertDecorVendor = z.infer<ReturnType<typeof createInsertSchema<typeof decorVendors>>>;
export type BudgetItem = typeof budgetItems.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type ContractChangeLog = typeof contractChangeLog.$inferSelect;
export type AiSessionSummary = typeof aiSessionSummaries.$inferSelect;
export type AISessionSummary = AiSessionSummary; // alias for backwards compat
export type InsertAISessionSummary = InsertAiSessionSummary; // alias for backwards compat
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type ActivityTemplate = typeof activityTemplates.$inferSelect;
export type InsertActivityTemplate = z.infer<typeof insertActivityTemplateSchema>;
export type PhaseSignoff = typeof phaseSignoffs.$inferSelect;
export type InsertPhaseSignoff = z.infer<typeof insertPhaseSignoffSchema>;
export type ActivityAuditLog = typeof activityAuditLog.$inferSelect;
export type InsertActivityAuditLog = z.infer<typeof insertActivityAuditLogSchema>;
export type SavedActivityView = typeof savedActivityViews.$inferSelect;
export type InsertSavedActivityView = z.infer<typeof insertSavedActivityViewSchema>;
export type EventNote = typeof eventNotes.$inferSelect;
export type InsertEventNote = z.infer<typeof insertEventNoteSchema>;
export type EventCollaborator = typeof eventCollaborators.$inferSelect;
export type InsertEventCollaborator = z.infer<ReturnType<typeof createInsertSchema<typeof eventCollaborators>>>;
export type EventPlanningLog = typeof eventPlanningLog.$inferSelect;
export type InsertEventPlanningLog = z.infer<ReturnType<typeof createInsertSchema<typeof eventPlanningLog>>>;

export const insertPrivateEventSubmissionSchema = createInsertSchema(privateEventSubmissions).omit({ id: true, createdAt: true });
export const insertCorporateEventSubmissionSchema = createInsertSchema(corporateEventSubmissions).omit({ id: true, createdAt: true });
export const insertDecorVendorSchema = createInsertSchema(decorVendors).omit({ id: true, createdAt: true });

// Vendor Portal Tables
export const vendorUsers = pgTable("vendor_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name").notNull(),
  contactPersonName: varchar("contact_person_name").notNull(),
  email: varchar("email").unique().notNull(),
  phone: varchar("phone").notNull(),
  password: varchar("password").notNull(),
  companyAddress: text("company_address").notNull(),
  businessType: varchar("business_type").notNull(), // catering, decoration, photography, etc.
  yearsInBusiness: integer("years_in_business").notNull(),
  servicesOffered: text("services_offered").array().notNull(),
  serviceAreas: text("service_areas").array().notNull(), // geographical areas
  status: varchar("status").default("pending").notNull(), // pending, approved, rejected, suspended
  registrationDate: timestamp("registration_date").defaultNow(),
  lastLoginDate: timestamp("last_login_date"),
  isEmailVerified: boolean("is_email_verified").default(false),
  profileCompletionStatus: varchar("profile_completion_status").default("incomplete"), // incomplete, documents-pending, compliance-pending, complete
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// 360 BOOTH HIRE BOOKINGS
// ============================================================
export const boothBookings = pgTable("booth_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token").notNull().unique(), // public share token
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone"),
  clientAddress: text("client_address"),
  eventDate: text("event_date").notNull(),
  venue: text("venue").notNull(),
  eventType: text("event_type"),
  eventStartTime: text("event_start_time"),
  eventEndTime: text("event_end_time"),
  duration: text("duration"),
  guestCount: integer("guest_count").default(0),
  service: text("service"), // e.g. "360 Booth Hire"
  packageName: text("package_name").notNull(),
  netAmount: text("net_amount"),
  hireFee: text("hire_fee").notNull(),
  vat: text("vat").notNull(),
  securityDeposit: text("security_deposit").notNull().default("150.00"),
  totalDue: text("total_due").notNull(),
  depositDue: text("deposit_due").notNull(),
  depositPercentage: text("deposit_percentage").default("80"),
  balanceDue: text("balance_due").notNull(),
  balanceDueDate: text("balance_due_date").notNull(),
  cashBalanceFlag: boolean("cash_balance_flag").default(false),
  status: varchar("status").notNull().default("pending"), // new_enquiry, quote_sent, awaiting_deposit, deposit_paid, confirmed, completed, cancelled
  agreementAccepted: boolean("agreement_accepted").default(false),
  agreementAcceptedAt: timestamp("agreement_accepted_at"),
  signedName: text("signed_name"),
  signedIp: text("signed_ip"),
  signedUserAgent: text("signed_user_agent"),
  paymentMethod: text("payment_method"), // card, bank_transfer, cash
  paymentTxRef: text("payment_tx_ref"),
  paymentStatus: text("payment_status").default("unpaid"), // unpaid, deposit_paid, fully_paid
  quoteSent: boolean("quote_sent").default(false),
  depositPaid: boolean("deposit_paid").default(false),
  balancePaid: boolean("balance_paid").default(false),
  bookingConfirmed: boolean("booking_confirmed").default(false),
  invoiceNumber: text("invoice_number"),
  createdBy: text("created_by"), // admin who created the booking
  updatedBy: text("updated_by"), // admin who last updated
  lastActionAt: timestamp("last_action_at"), // when last action was taken
  lastActionBy: text("last_action_by"), // who took last action
  lastActionType: text("last_action_type"), // generate_quote, generate_invoice, approve_send, edit_draft, hold_draft, delete_draft, mark_deposit, mark_balance, mark_complete
  country: text("country").default("GB"), // GB or NG
  currency: text("currency").default("GBP"), // GBP or NGN
  adminReviewStatus: varchar("admin_review_status").default("pending"), // pending, draft, sent, approved, hold, deleted
  reviewEmailHtml: text("review_email_html"), // HTML draft for internal review
  reviewEmailType: text("review_email_type"), // quote, invoice, confirmation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit log for every action on a booth booking
export const boothBookingAuditLog = pgTable("booth_booking_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull(),
  action: text("action").notNull(), // generate_quote_draft, approve_send_quote, edit_draft, hold_draft, delete_draft, mark_deposit_paid, mark_balance_paid, mark_complete, create_booking, update_booking
  performedBy: text("performed_by").notNull(), // admin name or email
  performedById: text("performed_by_id"), // admin user id
  details: text("details"), // human-readable description
  oldValue: text("old_value"), // previous status
  newValue: text("new_value"), // new status
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBoothBookingSchema = createInsertSchema(boothBookings).omit({ id: true, token: true, createdAt: true, updatedAt: true, agreementAcceptedAt: true });
export type InsertBoothBooking = z.infer<typeof insertBoothBookingSchema>;
export type BoothBooking = typeof boothBookings.$inferSelect;
