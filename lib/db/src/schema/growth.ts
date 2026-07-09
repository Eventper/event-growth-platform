import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, decimal, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const growthEvents = pgTable("growth_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
  type: text("type").notNull().default("general"),
  status: text("status").notNull().default("draft"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  strategyPack: json("strategy_pack"),
  // Project-level outreach config for the reusable Outreach Intelligence Module:
  // positioning, audience, approved/banned language, proof points, default CTA,
  // soft opt-out, sender profile, signature, follow-up cadence. Lets the module
  // work for any project without code changes — a new project just fills this in.
  outreachConfig: json("outreach_config"),
  ownerId: text("owner_id"), // for multi-tenancy foundation
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const growthProspects = pgTable("growth_prospects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => growthEvents.id, { onDelete: "cascade" }),
  ownerId: text("owner_id"), // for multi-tenancy
  prospectType: text("prospect_type").notNull().default("audience"), // 'audience' | 'sponsor'
  name: text("name").notNull(),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  companySize: text("company_size"),
  industry: text("industry"),
  location: text("location"),
  profileUrl: text("profile_url"),
  source: text("source").notNull().default("apollo"),
  sourceReference: text("source_reference"), // Apollo ID, Companies House number, URL
  confidenceLevel: text("confidence_level").default("medium"), // 'high' | 'medium' | 'low' | 'unverified'
  verified: boolean("verified").default(false),
  enriched: boolean("enriched").default(false),
  enrichmentCost: decimal("enrichment_cost", { precision: 12, scale: 6 }).default("0"),
  individualOrCorporate: text("individual_or_corporate"), // 'individual' | 'corporate'
  // Inferred from the contact's first name — Apollo has no gender filter, but
  // "I Am Her" targets women, so audience discovery is women-first. Heuristic:
  // 'female' | 'male' | 'unknown' (ambiguous/unisex names → unknown, human review).
  likelyGender: text("likely_gender").default("unknown"),
  genderConfidence: decimal("gender_confidence", { precision: 3, scale: 2 }).default("0"),
  // Outreach-module status (12-value state machine). Free text; values enforced
  // in app: new | research_needed | verified | approved_for_outreach |
  // in_sequence | replied | interested | declined | follow_up_needed |
  // send_information | needs_call | do_not_contact
  status: text("status").notNull().default("new"),
  // ── Email outreach module (controlled, invitation-led) ──────────────────
  // 7-way category: guest | sponsor | media | hotel | civic | introducer | do_not_contact
  category: text("category"),
  website: text("website"),
  linkedinUrl: text("linkedin_url"),
  sector: text("sector"),
  fitScore: integer("fit_score"), // 0-100
  whyThem: text("why_them"), // "Why Her / Why Them"
  roomContribution: text("room_contribution"),
  attendanceLikelihood: text("attendance_likelihood"),
  partnershipType: text("partnership_type"),
  specificAsk: text("specific_ask"),
  whatTheyReceive: text("what_they_receive"),
  redFlags: text("red_flags"),
  // Verification gate — no email may send unless emailVerified AND approvedBy is set.
  emailVerified: boolean("email_verified").default(false),
  contactRouteVerified: boolean("contact_route_verified").default(false),
  contactSource: text("contact_source"),
  verificationNotes: text("verification_notes"),
  approvedBy: text("approved_by"), // e.g. "Lynda" — the human sign-off
  // ── Guest Intelligence (locked, human-approved) ──────────────────────────
  // Populated by Guest Research AI, then reviewed, approved and LOCKED by Lynda
  // before any guest email may be generated or sent. The Guest Email AI must
  // assemble strictly from these fields — it must not browse or invent. The
  // guest send gate (growth-send-gate) blocks any send when these are missing.
  guestReason: text("guest_reason"),                          // why her — full sentences
  companyContext: text("company_context"),                    // what the company is / does
  roleContext: text("role_context"),                          // her role / leadership seat
  whyThisRoomMattersToHer: text("why_this_room_matters_to_her"),
  approvedProofPoints: text("approved_proof_points"),         // who else is in the room
  contactRoute: text("contact_route"),                        // verified route to reach her
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const growthCampaigns = pgTable("growth_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => growthEvents.id, { onDelete: "cascade" }),
  ownerId: text("owner_id"), // for multi-tenancy
  name: text("name").notNull(),
  type: text("type").notNull().default("outreach"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const growthProspectScores = pgTable("growth_prospect_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prospectId: varchar("prospect_id").references(() => growthProspects.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // 0-100
  scoreType: text("score_type").notNull(), // 'audience' | 'sponsor'
  reasons: json("reasons"), // array of reason strings
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const growthOutreach = pgTable("growth_outreach", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prospectId: varchar("prospect_id").references(() => growthProspects.id, { onDelete: "cascade" }),
  eventId: varchar("event_id").references(() => growthEvents.id, { onDelete: "cascade" }),
  sequencePosition: integer("sequence_position").notNull(), // 1-4
  channel: text("channel").notNull(), // 'email' | 'linkedin'
  subject: text("subject"),
  body: text("body").notNull(),
  // 'pending' | 'approved' | 'rejected' | 'scheduled' | 'scheduled_pending_approval'
  // | 'sent' | 'paused' | 'cancelled' | 'failed' | 'replied' | 'bounced' | 'positive' | 'not_now'
  status: text("status").notNull().default("pending"),
  // ── Ported from the EP engine: scheduled follow-up + sender ──────────────
  scheduledFor: timestamp("scheduled_for"), // when this touch is due to send (null = immediate/manual)
  senderEmail: text("sender_email"), // which sender profile sent this (Lynda | Admin)
  bounced: boolean("bounced").default(false),
  // ── Scheduler (Cancel Scheduled Send / Reschedule / Stop Sequence) ───────
  campaignId: varchar("campaign_id").references(() => growthCampaigns.id, { onDelete: "set null" }),
  // Anti-duplicate: one send per prospect+campaign+step. Unique so a double
  // scheduler pass can only ever insert/claim one send for the same key.
  idempotencyKey: text("idempotency_key").unique(),
  scheduledBy: text("scheduled_by"), // user/email that scheduled this send
  scheduleApproved: boolean("schedule_approved").default(false), // Lynda confirmed the preview
  staggerGroup: text("stagger_group"), // batch id when scheduled as a staggered batch
  canceledAt: timestamp("canceled_at"),
  cancelReason: text("cancel_reason"),
  failedReason: text("failed_reason"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
  sentAt: timestamp("sent_at"),
  metadata: json("metadata"),
  generatedBy: text("generated_by"), // model name that generated this message
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Append-only audit trail for every schedule/send action. The scheduler, the
// manual send path and Elizabeth all write here so there is one record of who
// did what, when, and why — including old/new scheduled times and the
// idempotency key used for the send.
export const growthOutreachAudit = pgTable("growth_outreach_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  outreachId: varchar("outreach_id").references(() => growthOutreach.id, { onDelete: "set null" }),
  prospectId: varchar("prospect_id").references(() => growthProspects.id, { onDelete: "set null" }),
  campaignId: varchar("campaign_id"),
  // 'scheduled' | 'rescheduled' | 'cancelled' | 'sent' | 'blocked' | 'failed'
  // | 'stop_sequence' | 'cancel_followups' | 'schedule_pending_approval'
  action: text("action").notNull(),
  actor: text("actor"), // user email / 'system' / 'elizabeth'
  sequenceStep: integer("sequence_step"),
  oldScheduledFor: timestamp("old_scheduled_for"),
  newScheduledFor: timestamp("new_scheduled_for"),
  reason: text("reason"),
  idempotencyKey: text("idempotency_key"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Manual Task Area — the human steps that are NOT automated emails: web-form
// submissions, phone calls, contact verification, follow-up reminders. Each task
// can optionally belong to a project and/or a prospect. Purely additive; nothing
// else depends on it.
export const growthTasks = pgTable("growth_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => growthEvents.id, { onDelete: "cascade" }),
  prospectId: varchar("prospect_id").references(() => growthProspects.id, { onDelete: "set null" }),
  ownerId: text("owner_id"),
  // 'web_form' | 'phone_call' | 'verify_contact' | 'follow_up' | 'other'
  type: text("type").notNull().default("other"),
  title: text("title").notNull(),
  details: text("details"),
  // 'open' | 'done' | 'skipped'
  status: text("status").notNull().default("open"),
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  createdBy: text("created_by"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const growthSuppressions = pgTable("growth_suppressions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email"),
  phone: text("phone"),
  reason: text("reason").notNull(), // 'unsubscribe' | 'bounced' | 'human'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const growthReplies = pgTable("growth_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  outreachId: varchar("outreach_id").references(() => growthOutreach.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  classification: text("classification").notNull(), // 'positive' | 'not_now' | 'unsubscribe' | 'out_of_office' | 'auto_reply'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const growthSpendLogs = pgTable("growth_spend_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id"), // for multi-tenancy
  operation: text("operation").notNull(),
  vendor: text("vendor").notNull(),
  cost: decimal("cost", { precision: 12, scale: 6 }).notNull().default("0"),
  model: text("model"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const growthPipelineEntries = pgTable("growth_pipeline_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => growthEvents.id, { onDelete: "cascade" }),
  prospectId: varchar("prospect_id").references(() => growthProspects.id, { onDelete: "cascade" }),
  pipelineType: text("pipeline_type").notNull(), // 'audience' | 'sponsor'
  stage: text("stage").notNull(), // audience: identified, contacted, interested, applied, paid, attending
  movedBy: text("moved_by").notNull().default("system"), // 'system' | 'human'
  notes: text("notes"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const growthInboundLeads = pgTable("growth_inbound_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => growthEvents.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("website"), // 'website' | 'form' | 'api'
  leadType: text("lead_type").notNull(), // 'registration' | 'application' | 'story' | 'sponsor_enquiry' | 'partner_enquiry' | 'payment'
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  message: text("message"),
  payload: json("payload"), // raw form data
  pipelineEntryId: varchar("pipeline_entry_id").references(() => growthPipelineEntries.id, { onDelete: "set null" }),
  isBot: boolean("is_bot").notNull().default(false),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"), // hashed for privacy
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const growthEventTargets = pgTable("growth_event_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => growthEvents.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull().default("paid_guests"), // e.g. 'paid_guests' | 'sponsors'
  targetValue: integer("target_value").notNull().default(0),
  breakEven: integer("break_even").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const growthMarketInsights = pgTable("growth_market_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id"), // who generated it — used to scope reads (nullable for legacy rows)
  eventId: varchar("event_id").references(() => growthEvents.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  reportType: text("report_type").notNull().default("market_opportunity"), // market_opportunity | competitor_analysis | pricing_benchmark
  competitorEvents: json("competitor_events"),
  pricingBenchmarks: json("pricing_benchmarks"),
  sponsorActivity: json("sponsor_activity"),
  audienceTrends: json("audience_trends"),
  marketOpportunity: json("market_opportunity"),
  sources: json("sources"), // web citations [{ title, url }] backing the report, when web grounding is used
  demandScore: integer("demand_score").default(0),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const growthPresentations = pgTable("growth_presentations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => growthEvents.id, { onDelete: "cascade" }),
  presentationType: text("presentation_type").notNull(), // 'sponsor_deck' | 'event_brochure' | 'speaker_pack' | 'partnership_proposal' | 'vip_invitation'
  title: text("title").notNull(),
  content: json("content").notNull(), // structured sections
  slides: json("slides"), // array of slide objects
  html: text("html"), // rendered HTML
  status: text("status").notNull().default("draft"), // 'draft' | 'approved' | 'published'
  cost: decimal("cost", { precision: 12, scale: 6 }).default("0"),
  generatedBy: text("generated_by"), // model name that generated this presentation
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const growthLearningInsights = pgTable("growth_learning_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => growthEvents.id, { onDelete: "cascade" }),
  insightType: text("insight_type").notNull(), // 'message_pattern' | 'channel_performance' | 'persona_fit' | 'timing' | 'sector' | 'overall'
  insight: text("insight").notNull(),
  evidence: json("evidence"), // supporting data points
  confidence: integer("confidence").default(50), // 0-100
  applied: boolean("applied").default(false), // whether applied to future events
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const growthUserPreferences = pgTable("growth_user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull().unique(),
  tier: text("tier").default("mid-market"), // 'mass-market' | 'mid-market' | 'premium'
  houseStyle: text("house_style"), // stored as JSON string
  preferredModel: text("preferred_model").default("anthropic/claude-sonnet-4"),
  excludedIndustries: text("excluded_industries"),
  customRules: json("custom_rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Resume state — where a user left off on each event
export const growthResumeState = pgTable("growth_resume_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull(),
  eventId: varchar("event_id").references(() => growthEvents.id, { onDelete: "cascade" }).notNull(),
  page: text("page").notNull(), // e.g. 'wizard', 'screen', 'outreach'
  step: text("step"), // e.g. 'interview', 'queue'
  action: text("action").notNull(), // human-readable next action
  lastAt: timestamp("last_at").defaultNow().notNull(),
});

// ── Sponsor Pipeline ──────────────────────────────────────────────────────
export const growthSponsors = pgTable("growth_sponsors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => growthEvents.id, { onDelete: "cascade" }),
  ownerId: text("owner_id"),
  organisationName: text("organisation_name").notNull(),
  sector: text("sector"),
  website: text("website"),
  contactName: text("contact_name"),
  contactTitle: text("contact_title"),
  email: text("email"),
  linkedIn: text("linkedin"),
  fitScore: integer("fit_score").default(0),
  deiAlignment: text("dei_alignment"),
  womenLeadershipRelevance: text("women_leadership_relevance"),
  brandPrestigeLevel: text("brand_prestige_level"),
  estimatedPotential: text("estimated_potential"),
  notes: text("notes"),
  stage: text("stage").notNull().default("discovered"), // discovered | qualified | decision_maker_found | outreach_drafted | approved_to_contact | contacted | meeting_booked | proposal_sent | negotiation | confirmed | declined
  source: text("source").default("manual"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Sponsor Scores ─────────────────────────────────────────────────────────
export const growthSponsorScores = pgTable("growth_sponsor_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sponsorId: varchar("sponsor_id").references(() => growthSponsors.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  womenFocus: integer("women_focus").default(0),
  csrDeiWellbeing: integer("csr_dei_wellbeing").default(0),
  luxuryFit: integer("luxury_fit").default(0),
  localRelevance: integer("local_relevance").default(0),
  previousSponsorship: integer("previous_sponsorship").default(0),
  brandPrestige: integer("brand_prestige").default(0),
  likelihood: integer("likelihood").default(0),
  reasons: json("reasons"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

// ── PR Opportunities ────────────────────────────────────────────────────
export const growthPrOpportunities = pgTable("growth_pr_opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => growthEvents.id, { onDelete: "cascade" }),
  ownerId: text("owner_id"),
  outletName: text("outlet_name").notNull(),
  journalistName: text("journalist_name"),
  email: text("email"),
  deadline: timestamp("deadline"),
  topic: text("topic"),
  angle: text("angle"),
  fitScore: integer("fit_score").default(0),
  draftPitch: text("draft_pitch"),
  stage: text("stage").notNull().default("opportunity_found"), // opportunity_found | angle_identified | pitch_drafted | approved_to_send | sent | journalist_responded | interview_requested | coverage_secured | declined
  notes: text("notes"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── PR Scores ───────────────────────────────────────────────────────────────
export const growthPrScores = pgTable("growth_pr_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prOpportunityId: varchar("pr_opportunity_id").references(() => growthPrOpportunities.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  outletRelevance: integer("outlet_relevance").default(0),
  journalistFit: integer("journalist_fit").default(0),
  humanInterest: integer("human_interest").default(0),
  womenLeadership: integer("women_leadership").default(0),
  localFit: integer("local_fit").default(0),
  likelihood: integer("likelihood").default(0),
  reasons: json("reasons"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

// ── Referrals ───────────────────────────────────────────────────────────────
export const growthReferrals = pgTable("growth_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => growthEvents.id, { onDelete: "cascade" }),
  ownerId: text("owner_id"),
  referrerName: text("referrer_name").notNull(),
  referrerEmail: text("referrer_email"),
  referralType: text("referral_type").notNull(), // 'nominate_guest' | 'recommend_sponsor' | 'submit_story' | 'share_event' | 'request_corporate_pack'
  referralStatus: text("referral_status").notNull().default("pending"), // pending | converted | declined | contacted
  source: text("source"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Corporate Targets ───────────────────────────────────────────────────────
export const growthCorporateTargets = pgTable("growth_corporate_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => growthEvents.id, { onDelete: "cascade" }),
  ownerId: text("owner_id"),
  organisationName: text("organisation_name").notNull(),
  website: text("website"),
  sector: text("sector"),
  location: text("location"),
  womenLeadershipProgramme: boolean("women_leadership_programme").default(false),
  deiInitiative: boolean("dei_initiative").default(false),
  wellbeingPolicy: boolean("wellbeing_policy").default(false),
  menopausePolicy: boolean("menopause_policy").default(false),
  financialServices: boolean("financial_services").default(false),
  beautyWellness: boolean("beauty_wellness").default(false),
  luxuryHospitality: boolean("luxury_hospitality").default(false),
  automotive: boolean("automotive").default(false),
  localRegional: boolean("local_regional").default(false),
  fitScore: integer("fit_score").default(0),
  notes: text("notes"),
  status: text("status").default("target"), // target | contacted | engaged | declined
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Unified Lead Scores ──────────────────────────────────────────────────
export const growthLeadScores = pgTable("growth_lead_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: varchar("entity_id").notNull(), // prospect_id, sponsor_id, or pr_opportunity_id
  entityType: text("entity_type").notNull(), // 'guest' | 'sponsor' | 'pr'
  eventId: varchar("event_id").references(() => growthEvents.id, { onDelete: "cascade" }),
  ownerId: text("owner_id"),
  score: integer("score").notNull(),
  dimensionScores: json("dimension_scores"), // e.g. { seniority: 85, location: 70, ... }
  reasons: json("reasons"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const insertGrowthEventSchema = createInsertSchema(growthEvents).omit({ id: true, createdAt: true, updatedAt: true });
export const updateGrowthEventSchema = createInsertSchema(growthEvents).omit({ id: true, createdAt: true, updatedAt: true }).partial();
export type InsertGrowthEvent = z.infer<typeof insertGrowthEventSchema>;
export type GrowthEvent = typeof growthEvents.$inferSelect;
export type UpdateGrowthEvent = z.infer<typeof updateGrowthEventSchema>;

export const insertGrowthSponsorSchema = createInsertSchema(growthSponsors).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowthSponsor = z.infer<typeof insertGrowthSponsorSchema>;
export type GrowthSponsor = typeof growthSponsors.$inferSelect;

export const insertGrowthPrOpportunitySchema = createInsertSchema(growthPrOpportunities).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowthPrOpportunity = z.infer<typeof insertGrowthPrOpportunitySchema>;
export type GrowthPrOpportunity = typeof growthPrOpportunities.$inferSelect;

export const insertGrowthReferralSchema = createInsertSchema(growthReferrals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowthReferral = z.infer<typeof insertGrowthReferralSchema>;
export type GrowthReferral = typeof growthReferrals.$inferSelect;

export const insertGrowthCorporateTargetSchema = createInsertSchema(growthCorporateTargets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowthCorporateTarget = z.infer<typeof insertGrowthCorporateTargetSchema>;
export type GrowthCorporateTarget = typeof growthCorporateTargets.$inferSelect;

// ── SaaS Clients ────────────────────────────────────────────────────────
// ── Workspaces ──────────────────────────────────────────────────────────────
// The tier between the account (Platform/owner) and a Brand. One owner can run
// several workspaces (e.g. an agency with separate client teams); each Brand
// belongs to a workspace. Formalizes the Platform→Workspace→Brand→Campaign→
// Communication hierarchy. A "Default Workspace" is auto-provisioned per owner.
export const growthWorkspaces = pgTable("growth_workspaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGrowthWorkspaceSchema = createInsertSchema(growthWorkspaces).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowthWorkspace = z.infer<typeof insertGrowthWorkspaceSchema>;
export type GrowthWorkspace = typeof growthWorkspaces.$inferSelect;

export const growthClients = pgTable("growth_clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id"), // SaaS account admin
  workspaceId: varchar("workspace_id"), // → growthWorkspaces.id (the brand's workspace)
  name: text("name").notNull(),
  brandVoice: text("brand_voice").default("professional"), // professional | warm | luxury | corporate | minimal | technical
  approvedPhrases: json("approved_phrases"), // ["innovation-led", "future-focused"]
  bannedPhrases: json("banned_phrases"), // ["We are hosting", "Don't miss out"]
  preferredTone: text("preferred_tone").default("senior"), // senior | conversational | editorial | direct
  audienceSegments: json("audience_segments"), // [{ name, description, painPoints }]
  commercialRules: json("commercial_rules"), // { pricingVisible: false, defaultCta: "learn_more" }
  sector: text("sector"), // fintech | fashion | healthcare | tech | non-profit
  keyOffers: json("key_offers"), // [{ name, description, price, cta }]
  brandPositioning: text("brand_positioning"), // "Premium enterprise SaaS"
  complianceRestrictions: json("compliance_restrictions"), // ["no_medical_claims", "gdpr_compliant"]
  pastSuccessCommunications: json("past_success_communications"), // [{ messageType, messageId, result }]
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  primaryContactName: text("primary_contact_name"),
  primaryContactEmail: text("primary_contact_email"),
  defaultThemeId: varchar("default_theme_id"), // → growthBrandThemes.id; campaigns inherit this unless overridden
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGrowthClientSchema = createInsertSchema(growthClients).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowthClient = z.infer<typeof insertGrowthClientSchema>;
export type GrowthClient = typeof growthClients.$inferSelect;

// ── Brand Themes (reusable design system) ───────────────────────────────────
// A SaaS client can save multiple themes; campaigns inherit a theme automatically.
// The three built-in presets (Luxury / Corporate / Creative) live in code
// (email-design-system.ts) and can be saved into this table per client.
export const growthBrandThemes = pgTable("growth_brand_themes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id"),
  clientId: varchar("client_id").references(() => growthClients.id, { onDelete: "cascade" }), // null = owner-level theme/preset
  name: text("name").notNull(), // "Luxury", "Corporate", "I Am Her — Editorial"
  isPreset: boolean("is_preset").default(false),
  // Colour roles
  primaryColor: text("primary_color").notNull().default("#330311"),
  secondaryColor: text("secondary_color").notNull().default("#5B1A2A"),
  accentColor: text("accent_color").notNull().default("#C9A961"),
  backgroundColor: text("background_color").notNull().default("#F4ECD8"),
  surfaceColor: text("surface_color").notNull().default("#FFFFFF"),
  textColor: text("text_color").notNull().default("#2A0A15"),
  mutedTextColor: text("muted_text_color").notNull().default("#6B5B50"),
  // Typography
  fontHeading: text("font_heading").notNull().default("Georgia, 'Times New Roman', serif"),
  fontBody: text("font_body").notNull().default("'Helvetica Neue', Arial, sans-serif"),
  // Structure
  borderRadius: integer("border_radius").notNull().default(8), // px
  logoUrl: text("logo_url"),
  logoPlacement: text("logo_placement").notNull().default("center"), // left | center | right | none
  buttonStyle: text("button_style").notNull().default("solid"), // solid | outline | pill | minimal
  emailWidth: integer("email_width").notNull().default(600), // px
  headerStyle: text("header_style").notNull().default("minimal"), // minimal | banner | logo_only | hero
  footerStyle: text("footer_style").notNull().default("standard"), // minimal | standard | branded
  heroImageUrl: text("hero_image_url"),
  photographyStyle: text("photography_style"), // "editorial", "bold", "clean"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGrowthBrandThemeSchema = createInsertSchema(growthBrandThemes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowthBrandTheme = z.infer<typeof insertGrowthBrandThemeSchema>;
export type GrowthBrandTheme = typeof growthBrandThemes.$inferSelect;

// ── SaaS Campaigns ────────────────────────────────────────────────────
export const growthCommsCampaigns = pgTable("growth_comms_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => growthClients.id, { onDelete: "cascade" }).notNull(),
  ownerId: text("owner_id"),
  name: text("name").notNull(),
  objective: text("objective").notNull(), // "event_bookings" | "sponsor_acquisition" | "pr_coverage" | "sales_leads"
  targetAudience: json("target_audience"), // [{ segment, description, priority }]
  keyMessages: json("key_messages"), // ["innovation", "community", "growth"]
  storyAngles: json("story_angles"), // [{ angle, description, priority }]
  offers: json("offers"), // [{ name, description, cta }]
  eventDetails: json("event_details"), // { name, date, venue, description }
  approvedSpokespersons: json("approved_spokespersons"), // [{ name, title, bio }]
  approvedLinks: json("approved_links"), // [{ label, url, type }]
  visualAssets: json("visual_assets"), // [{ name, url, type }]
  dates: json("dates"), // { startDate, endDate, keyDates: [{ label, date }] }
  locations: json("locations"), // [{ name, address, city, country }]
  cta: text("cta").default("learn_more"), // learn_more | request_access | request_pack | book_call | register_interest | view_details
  exclusions: json("exclusions"), // ["no_pricing", "no_dates", "no_speaker_names"]
  commercialSensitivity: json("commercial_sensitivity"), // { pricingVisible: false, sponsorshipRatesVisible: false, ticketPricesVisible: false }
  pricingVisibility: json("pricing_visibility"), // { messageTypes: [], default: false }
  tone: text("tone").default("senior"), // senior | warm | corporate | luxury | minimal
  brandThemeId: varchar("brand_theme_id"), // → growthBrandThemes.id; campaign branding (overrides client default)
  status: text("status").default("draft"), // draft | active | paused | completed
  isDemo: boolean("is_demo").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGrowthCommsCampaignSchema = createInsertSchema(growthCommsCampaigns).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowthCommsCampaign = z.infer<typeof insertGrowthCommsCampaignSchema>;
export type GrowthCommsCampaign = typeof growthCommsCampaigns.$inferSelect;

// ── SaaS Personas ────────────────────────────────────────────────────
export const growthPersonas = pgTable("growth_personas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id"),
  name: text("name").notNull(), // "PR Consultant", "Luxury Brand Copywriter"
  description: text("description").notNull(),
  promptPrefix: text("prompt_prefix").notNull(), // System prompt for the AI
  role: text("role").notNull(), // "pr" | "sponsor" | "sales" | "community" | "executive" | "creative" | "corporate"
  tone: text("tone").notNull(), // "senior" | "warm" | "corporate" | "luxury" | "direct" | "editorial"
  expertise: json("expertise"), // ["media_relations", "sponsorship", "copywriting"]
  sector: json("sector"), // ["fintech", "fashion", "healthcare"]
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGrowthPersonaSchema = createInsertSchema(growthPersonas).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowthPersona = z.infer<typeof insertGrowthPersonaSchema>;
export type GrowthPersona = typeof growthPersonas.$inferSelect;

// ── Communications ───────────────────────────────────────────────────
export const growthCommunications = pgTable("growth_communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => growthClients.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").references(() => growthCommsCampaigns.id, { onDelete: "cascade" }),
  ownerId: text("owner_id"),
  messageType: text("message_type").notNull(), // pr_pitch | sponsor_pitch | guest_invitation | corporate_partnership | sales_outreach | linkedin_dm | follow_up | thank_you | speaker_invitation | press_response | proposal_cover | investor_update | community_announcement
  recipientId: varchar("recipient_id"),
  recipientType: text("recipient_type").notNull(), // prospect | sponsor | pr | referral | corporate | guest
  recipientName: text("recipient_name").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  recipientTitle: text("recipient_title"),
  recipientCompany: text("recipient_company"),
  recipientContext: json("recipient_context"), // { industry, location, recentNews, mutualConnection }
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  html: text("html"),
  status: text("status").notNull().default("draft"), // draft | approved | sent | rejected | archived
  qualityScore: integer("quality_score").default(0),
  reasoningSummary: text("reasoning_summary"), // "Angle: human-interest hook. CTA: learn_more. Excluded: pricing."
  personaUsed: text("persona_used"),
  ctaUsed: text("cta_used"),
  approvedLinksUsed: json("approved_links_used"),
  userEdits: text("user_edits"), // Track what the user changed
  preWritingIntelligence: json("pre_writing_intelligence"), // { angle, whyCare, whatFeel, persona, cta, exclusions }
  qualityGateResult: json("quality_gate_result"), // { passed: true, generic: false, hook: 90, brand: 95, cta: 85, human: 92, total: 88 }
  sentAt: timestamp("sent_at"),
  deliveryStatus: text("delivery_status").default("draft"), // draft | approved | queued | sent | failed | suppressed | bounced
  provider: text("provider"), // namecheap | gmail | test
  providerMessageId: text("provider_message_id"),
  errorMessage: text("error_message"),
  lastStatusCheckedAt: timestamp("last_status_checked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGrowthCommunicationSchema = createInsertSchema(growthCommunications).omit({ id: true, createdAt: true, updatedAt: true, sentAt: true, lastStatusCheckedAt: true });
export type InsertGrowthCommunication = z.infer<typeof insertGrowthCommunicationSchema>;
export type GrowthCommunication = typeof growthCommunications.$inferSelect;

// ── Communication Analytics ────────────────────────────────────────────
export const growthCommunicationAnalytics = pgTable("growth_communication_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communicationId: varchar("communication_id").references(() => growthCommunications.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => growthClients.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").references(() => growthCommsCampaigns.id, { onDelete: "cascade" }),
  ownerId: text("owner_id"),
  messageType: text("message_type").notNull(),
  personaUsed: text("persona_used"),
  openRate: integer("open_rate").default(0), // 0-100
  replyRate: integer("reply_rate").default(0),
  clickRate: integer("click_rate").default(0),
  conversion: boolean("conversion").default(false),
  meetingBooked: boolean("meeting_booked").default(false),
  coverage: boolean("coverage").default(false),
  sponsorInterest: boolean("sponsor_interest").default(false),
  ticketEnquiry: boolean("ticket_enquiry").default(false),
  unsubscribeRate: integer("unsubscribe_rate").default(0),
  userEdits: integer("user_edits").default(0), // number of manual edits
  sentiment: text("sentiment"), // positive | neutral | negative
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGrowthCommunicationAnalyticsSchema = createInsertSchema(growthCommunicationAnalytics).omit({ id: true, createdAt: true });
export type InsertGrowthCommunicationAnalytics = z.infer<typeof insertGrowthCommunicationAnalyticsSchema>;
export type GrowthCommunicationAnalytics = typeof growthCommunicationAnalytics.$inferSelect;

// ── Elizabeth Orchestrator Runs ─────────────────────────────────────────
// Persistent memory for the autonomous agent. Each run holds the full
// conversation transcript + the step timeline so Elizabeth can recall where
// she left off across sessions and remind the user on return. The compact
// "next action" lives in growthResumeState (per-event); this holds the detail.
export const growthOrchestratorRuns = pgTable("growth_orchestrator_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull(),
  agentId: text("agent_id").notNull().default("elizabeth"), // which agent ran this
  eventId: varchar("event_id"), // optional — the event this run is operating on
  title: text("title"), // short human label, e.g. "Fill the room for TechVenture Summit"
  status: text("status").notNull().default("running"), // running | awaiting_input | done | error
  messages: json("messages").notNull().default(sql`'[]'::json`), // full agent conversation transcript
  steps: json("steps").notNull().default(sql`'[]'::json`), // [{ tool, label, status, detail, at }]
  pendingQuestion: text("pending_question"), // set when status = awaiting_input
  creditsUsed: integer("credits_used").notNull().default(0), // Apollo enrichment credits this run
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGrowthOrchestratorRunSchema = createInsertSchema(growthOrchestratorRuns).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowthOrchestratorRun = z.infer<typeof insertGrowthOrchestratorRunSchema>;
export type GrowthOrchestratorRun = typeof growthOrchestratorRuns.$inferSelect;

// ── Hierarchical Memory ──────────────────────────────────────────────────────
// One row per remembered fact, scoped to a level of the hierarchy:
//   global (the SaaS account) → brand/workspace (a client) → campaign/event →
//   conversation (an orchestrator run).
// recallMemory() merges the cascade broad→narrow (most-specific wins). This is
// the shared memory both Elizabeth and the comms-core read for context, and it
// is how enterprise AI systems layer institutional → contextual knowledge.
export const growthMemory = pgTable("growth_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull(),
  scope: text("scope").notNull(), // 'global' | 'brand' | 'campaign' | 'event' | 'conversation'
  scopeId: text("scope_id").notNull(), // id of the scope entity (ownerId for global)
  kind: text("kind").notNull().default("fact"), // 'fact' | 'preference' | 'learning' | 'style'
  key: text("key"), // optional dedupe key, e.g. 'preferred_tone'
  content: text("content").notNull(), // the remembered statement
  weight: integer("weight").notNull().default(1), // importance / recall priority
  source: text("source").default("system"), // 'elizabeth' | 'user' | 'system'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGrowthMemorySchema = createInsertSchema(growthMemory).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowthMemory = z.infer<typeof insertGrowthMemorySchema>;
export type GrowthMemory = typeof growthMemory.$inferSelect;

// ── Background Jobs ─────────────────────────────────────────────────────────
// Queue for AI generation and email sending. States: queued → processing → completed | failed | retrying
export const growthJobs = pgTable("growth_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id").notNull(),
  jobType: text("job_type").notNull(), // ai_generate | email_send
  entityId: varchar("entity_id"), // communication_id, campaign_id, etc.
  payload: json("payload").notNull(), // full request params
  status: text("status").notNull().default("queued"), // queued | processing | completed | failed | retrying
  priority: integer("priority").default(5), // 1-10 (lower = higher priority)
  attemptCount: integer("attempt_count").default(0),
  maxAttempts: integer("max_attempts").default(3),
  result: json("result"), // { success, data, error } on completion
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGrowthJobSchema = createInsertSchema(growthJobs).omit({ id: true, createdAt: true, updatedAt: true, startedAt: true, completedAt: true });
export type InsertGrowthJob = z.infer<typeof insertGrowthJobSchema>;
export type GrowthJob = typeof growthJobs.$inferSelect;

// ── System Health Status ────────────────────────────────────────────────────
// Last known status of each external provider. Updated by health checks.
export const growthHealthStatus = pgTable("growth_health_status", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // openrouter | namecheap_smtp | gmail_smtp | apollo | database
  status: text("status").notNull().default("unknown"), // connected | failed | disabled
  lastCheckAt: timestamp("last_check_at").defaultNow().notNull(),
  lastSuccessAt: timestamp("last_success_at"),
  lastErrorAt: timestamp("last_error_at"),
  lastErrorMessage: text("last_error_message"),
  metadata: json("metadata"), // { responseTime, creditsRemaining, etc. }
});

export const insertGrowthHealthStatusSchema = createInsertSchema(growthHealthStatus).omit({ id: true, lastCheckAt: true, lastSuccessAt: true, lastErrorAt: true });
export type InsertGrowthHealthStatus = z.infer<typeof insertGrowthHealthStatusSchema>;
export type GrowthHealthStatus = typeof growthHealthStatus.$inferSelect;

// ── I AM HER — Business Submissions ─────────────────────────────────────────
// Local businesses submit to be featured on the Stay & Enjoy page
// Status: pending → approved → rejected
export const iamherBusinessSubmissions = pgTable("iamher_business_submissions", {
  id: serial("id").primaryKey(),
  citySlug: text("city_slug").notNull().default("milton-keynes"), // "milton-keynes" | "manchester" | "birmingham" | "leeds" | "liverpool" | "london"
  cityDisplay: text("city_display").notNull().default("Milton Keynes"),
  businessName: text("business_name").notNull(),
  founderName: text("founder_name"),
  category: text("category").notNull(), // stay | eat_drink | enjoy | invest_relocate
  website: text("website"),
  instagram: text("instagram"),
  email: text("email"),
  phone: text("phone"),
  aboutBusiness: text("about_business"),
  whatMakesWorthDiscovering: text("what_makes_worth_discovering"),
  offerDiscount: text("offer_discount"),
  interestedPartnership: boolean("interested_partnership").default(false),
  partnershipValue: text("partnership_value"),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIamherBusinessSubmissionSchema = createInsertSchema(iamherBusinessSubmissions).omit({ id: true, createdAt: true, reviewedAt: true, reviewedBy: true, reviewNotes: true });
export type InsertIamherBusinessSubmission = z.infer<typeof insertIamherBusinessSubmissionSchema>;
export type IamherBusinessSubmission = typeof iamherBusinessSubmissions.$inferSelect;

// ── Outreach email templates (Phase 2 — merge-field template builder) ───────
export const growthEmailTemplates = pgTable("growth_email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: text("owner_id"),
  name: text("name").notNull(),
  category: text("category").notNull().default("guest_invite"), // guest_invite | guest_followup | sponsor_pitch | partner_followup | media_pitch | media_followup | hotel_pitch | civic | admin_confirmation
  subject: text("subject"),
  body: text("body").notNull().default(""),
  includePhone: boolean("include_phone").default(false),
  senderId: text("sender_id").default("lynda"), // 'lynda' | 'admin'
  sequenceStep: integer("sequence_step").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGrowthEmailTemplateSchema = createInsertSchema(growthEmailTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrowthEmailTemplate = z.infer<typeof insertGrowthEmailTemplateSchema>;
export type GrowthEmailTemplate = typeof growthEmailTemplates.$inferSelect;
