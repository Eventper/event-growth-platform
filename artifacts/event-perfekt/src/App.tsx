import { Component, ErrorInfo, ReactNode, lazy, Suspense, useEffect, useRef } from "react";
import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth.tsx";
import { getPortalUser, isTrusteePortalUser } from "@/lib/client-portal-auth";
import { StaffGuard } from "@/components/StaffGuard";
import CookieConsent from "@/components/CookieConsent";
import { EPGlobalAuthProvider } from "@/lib/epglobal-auth";

/* ── Lazy page imports ──────────────────────────────────────────────── */
const StaffLogin = lazy(() => import("@/pages/staff-login"));
const StaffPage = lazy(() => import("@/pages/staff"));
const HeroPage = lazy(() => import("@/pages/hero"));
const EventDetails = lazy(() => import("@/pages/event-details"));
const PlannerDashboard = lazy(() => import("@/pages/planner-dashboard"));
const BudgetManagement = lazy(() => import("@/pages/budget-management"));
const BudgetPlanner = lazy(() => import("@/pages/budget-planner"));
const VenueThemeGeneratorPage = lazy(() => import("@/pages/venue-theme-generator"));
const EventChecklist = lazy(() => import("@/pages/event-checklist"));
const VendorManagement = lazy(() => import("@/pages/vendor-management"));
const VendorMeetingManagement = lazy(() => import("@/pages/vendor-meeting-management"));
const AboutPage = lazy(() => import("@/pages/about"));
const PlatformPage = lazy(() => import("@/pages/platform"));
const SubmissionSuccess = lazy(() => import("@/pages/submission-success"));
const ContractManagement = lazy(() => import("@/pages/contract-management"));
const ClientContractSigning = lazy(() => import("@/pages/client-contract-signing"));
const ClientDashboard = lazy(() => import("@/pages/client-dashboard"));
const NotFound = lazy(() => import("@/pages/not-found"));
const ProjectManagementDashboard = lazy(() => import("@/pages/project-management"));
const EventDashboard = lazy(() => import("@/pages/event-dashboard"));
const EventPlanner = lazy(() => import("@/pages/event-planner"));
const ManagementDashboard = lazy(() => import("@/pages/management-dashboard"));
const VendorPortalLogin = lazy(() => import("@/pages/vendor-portal-login"));
const VendorDashboard = lazy(() => import("@/pages/vendor-dashboard"));
const GuestManagement = lazy(() => import("@/pages/guest-management"));
const RSVPPage = lazy(() => import("@/pages/rsvp"));
const InvitationDesigner = lazy(() => import("@/pages/invitation-designer"));
const InvitationView = lazy(() => import("@/pages/invitation-view"));
const InvitationSendCentre = lazy(() => import("@/pages/invitation-send-centre"));
const EventApp = lazy(() => import("@/pages/event-app"));
const EventAppBuilder = lazy(() => import("@/pages/event-app-builder"));
const EventReports = lazy(() => import("@/pages/event-reports"));
const EventClosure = lazy(() => import("@/pages/event-closure"));
const ArtifactsPage = lazy(() => import("@/pages/artifacts"));
const EventResources = lazy(() => import("@/pages/event-resources"));
const EventAnalytics = lazy(() => import("@/pages/event-analytics"));
const InternalTeamBudget = lazy(() => import("@/pages/internal-team-budget"));
const GuestHub = lazy(() => import("@/pages/guest-hub"));
const Invoicing = lazy(() => import("@/pages/invoicing"));
const SouvenirsGifts = lazy(() => import("@/pages/souvenirs-gifts"));
const GraphicsBranding = lazy(() => import("@/pages/graphics-branding"));
const TimelineView = lazy(() => import("@/pages/timeline-view"));
const RemindersPage = lazy(() => import("@/pages/reminders"));
const CalendarView = lazy(() => import("@/pages/calendar-view"));
const FinancialDashboard = lazy(() => import("@/pages/financial-dashboard"));
const DocumentStorage = lazy(() => import("@/pages/document-storage"));
const EventTemplatesPage = lazy(() => import("@/pages/event-templates"));
const ProfitLossPage = lazy(() => import("@/pages/profit-loss"));
const SmsCenterPage = lazy(() => import("@/pages/sms-center"));
const AdminPanel = lazy(() => import("@/pages/admin-panel"));
const TicketsPage = lazy(() => import("@/pages/tickets"));
const ProposalBuilder = lazy(() => import("@/pages/proposal-builder"));
const ProjectPortal = lazy(() => import("@/pages/project-portal"));
const UploadDocs = lazy(() => import("@/pages/upload-docs"));
const InvoicePayment = lazy(() => import("@/pages/invoice-payment"));
const PaymentPlans = lazy(() => import("@/pages/payment-plans"));
const BookingEnquiry = lazy(() => import("@/pages/booking-enquiry"));
const EventTypeSelection = lazy(() => import("@/pages/event-type-selection"));
const LeadPipeline = lazy(() => import("@/pages/lead-pipeline"));
const EventCheckin = lazy(() => import("@/pages/event-checkin"));
const BadgeGenerator = lazy(() => import("@/pages/badge-generator"));
const EventDayCommand = lazy(() => import("@/pages/event-day-command"));
const LivePolling = lazy(() => import("@/pages/live-polling"));
const PollVote = lazy(() => import("@/pages/poll-vote"));
const RunSheet = lazy(() => import("@/pages/run-sheet"));
const SurveyBuilder = lazy(() => import("@/pages/survey-builder"));
const SurveyRespond = lazy(() => import("@/pages/survey-respond"));
const VendorRatings = lazy(() => import("@/pages/vendor-ratings"));
const PhotoGallery = lazy(() => import("@/pages/photo-gallery"));
const GalleryPublic = lazy(() => import("@/pages/gallery-public"));
const VendorDirectory = lazy(() => import("@/pages/vendor-directory"));
const AutomationPage = lazy(() => import("@/pages/automation"));
const EmailCampaigns = lazy(() => import("@/pages/email-campaigns"));
const AuditTrail = lazy(() => import("@/pages/audit-trail"));
const PrintMaterials = lazy(() => import("@/pages/print-materials"));
const ExpenseTracker = lazy(() => import("@/pages/expense-tracker"));
const ManagerIntake = lazy(() => import("@/pages/manager-intake"));
const ExpenseRequests = lazy(() => import("@/pages/expense-requests"));
const FindYourSeat = lazy(() => import("@/pages/find-your-seat"));
const OnboardingPortal = lazy(() => import("@/pages/onboarding-portal"));
const StaffDirectoryPage = lazy(() => import("@/pages/staff-directory"));
const TaskManagementPage = lazy(() => import("@/pages/task-management"));
const EmployeeManagement = lazy(() => import("@/pages/employee-management"));
const StaffTimeMonitoring = lazy(() => import("@/pages/staff-time-monitoring"));
const DecorInventory = lazy(() => import("@/pages/decor-inventory"));
const VenueDesignerUnified = lazy(() => import("@/pages/venue-designer-unified"));
const ProspectFinder = lazy(() => import("@/pages/prospect-finder"));
const YouthOutreach = lazy(() => import("@/pages/youth-outreach"));
const VenueSourcing = lazy(() => import("@/pages/venue-sourcing"));
// Legacy "Tender Manager" pages (tender-dashboard / tender-login) are retired — the
// SaaS tender product below is the single source of truth. Files kept in the repo but
// no longer routed; /tender-manager and /tender-dashboard redirect to /saas-tender.
const SaasTenderLogin = lazy(() => import("@/pages/saas-tender-login"));
const SaasTenderDashboard = lazy(() => import("@/pages/saas-tender-dashboard"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const TermsOfService = lazy(() => import("@/pages/terms-of-service"));
const FloorPlanBuilder = lazy(() => import("@/pages/floor-plan-builder"));
const ClientPortalLogin = lazy(() => import("@/pages/client-portal/login"));
const ClientPortalHome = lazy(() => import("@/pages/client-portal/home"));
const ClientPortalProject = lazy(() => import("@/pages/client-portal/project"));
const AlliStrategicOverviewPage = lazy(() => import("@/pages/client-portal/alli-strategic-overview"));
const ClientPortalDocuments = lazy(() => import("@/pages/client-portal/documents"));
const ClientPortalMessages = lazy(() => import("@/pages/client-portal/messages"));
const ClientPortalCalendar = lazy(() => import("@/pages/client-portal/calendar"));
const GatewayMeetingPage = lazy(() => import("@/pages/client-portal/gateway-meeting"));
const ClientPortalStatus = lazy(() => import("@/pages/client-portal/status"));
const ClientPortalPayments = lazy(() => import("@/pages/client-portal/payments"));
const EPClients = lazy(() => import("@/pages/client-portal/ep-clients"));
const ClientPortalResetPassword = lazy(() => import("@/pages/client-portal/reset-password"));
const CollaboratorPortal = lazy(() => import("@/pages/client-portal/collaborator-portal"));
const PostEventAnalytics = lazy(() => import("@/pages/post-event-analytics"));
const PostEventHub = lazy(() => import("@/pages/post-event-hub"));
const AlliYoungPeoplePortal = lazy(() => import("@/pages/client-portal/alli-young-people"));
const AlliPartnersPortal = lazy(() => import("@/pages/client-portal/alli-partners"));
const AlliEventsPortal = lazy(() => import("@/pages/client-portal/alli-events"));
const AlliFundersPortal = lazy(() => import("@/pages/client-portal/alli-funders"));
const ClientPortalWeeklyReports = lazy(() => import("@/pages/client-portal/weekly-reports"));
const ClientPortalActionItems = lazy(() => import("@/pages/client-portal/action-items"));
const EPClientCRM = lazy(() => import("@/pages/ep-crm/index"));
const EPClientDetail = lazy(() => import("@/pages/ep-crm/client-detail"));
const OnboardingWizard = lazy(() => import("@/pages/onboarding/wizard"));
const EPGlobalLogin = lazy(() => import("@/pages/epglobal/login"));
const EPGlobalDashboard = lazy(() => import("@/pages/epglobal/dashboard"));
const EPGlobalTasks = lazy(() => import("@/pages/epglobal/tasks"));
const EPGlobalCalendar = lazy(() => import("@/pages/epglobal/calendar"));
const EPGlobalInvoices = lazy(() => import("@/pages/epglobal/invoices"));
const EPGlobalPayments = lazy(() => import("@/pages/epglobal/payments"));
const EPGlobalActivities = lazy(() => import("@/pages/epglobal/activities"));
const EPGlobalVendors = lazy(() => import("@/pages/epglobal/vendors"));
const EPGlobalCompliance = lazy(() => import("@/pages/epglobal/compliance"));
const EPGlobalReports = lazy(() => import("@/pages/epglobal/reports"));
const AIResearchAssistant = lazy(() => import("@/pages/ai-research"));
const ProjectsProgrammes = lazy(() => import("@/pages/projects-programmes"));
const ContactPage = lazy(() => import("@/pages/contact"));
const EventAugust = lazy(() => import("@/pages/event-august"));
const AboutTheMovement = lazy(() => import("@/pages/about-the-movement"));
const EventAugustAdmin = lazy(() => import("@/pages/event-august-admin"));
const EventAugustConfirm = lazy(() => import("@/pages/event-august-confirm"));
const IAmHerInvite = lazy(() => import("@/pages/iamher-invite"));
const IAmHerDashboard = lazy(() => import("@/pages/iam-her"));
const IAmHerEstherPortal = lazy(() => import("@/pages/iam-her-esther"));
const HPage = lazy(() => import("@/pages/h"));
const IAmHerCommunity = lazy(() => import("@/pages/iamher-community"));
const AccessPage = lazy(() => import("@/pages/access"));
const PaymentPage = lazy(() => import("@/pages/payment"));
const MeetTheRoom = lazy(() => import("@/pages/meet-the-room"));
const IAmHerCard = lazy(() => import("@/pages/iamher-card"));
const IAmHerStay = lazy(() => import("@/pages/iamher-stay"));
const IAmHerFeature = lazy(() => import("@/pages/iamher-feature"));
const IAmHerFeatureBusiness = lazy(() => import("@/pages/iamher-feature-business"));
const IAmHerBusinessProfile = lazy(() => import("@/pages/iamher-business-profile"));
const IAmHerBrochure = lazy(() => import("@/pages/iamher-brochure"));
const AdminIamherBusinesses = lazy(() => import("@/pages/admin-iamher-businesses"));
const IamHerProductBrands = lazy(() => import("@/pages/iamher-product-brands"));
const IAmHerAnalytics = lazy(() => import("@/pages/iamher-analytics"));
const IAmHerNominate = lazy(() => import("@/pages/iamher-nominate"));
const IAmHerSignature = lazy(() => import("@/pages/iamher-signature"));
const IAmHerSubmit = lazy(() => import("@/pages/iamher-submit"));
const IAmHerStories = lazy(() => import("@/pages/iamher-stories"));
const IAmHerStoryPage = lazy(() => import("@/pages/iamher-story-page"));
const IAmHerStoriesAdmin = lazy(() => import("@/pages/iamher-stories-admin"));
const IAmHerMedia = lazy(() => import("@/pages/iamher-media"));
const PartnershipPayment = lazy(() => import("@/pages/iamher-partnership-payment"));
const FoundingAssessment = lazy(() => import("@/pages/iamher-founding-assessment"));
const TableNominations = lazy(() => import("@/pages/iamher-table-nominations"));
const ApplicationsReview = lazy(() => import("@/pages/applications-review"));
const ApplicationsDirector = lazy(() => import("@/pages/applications-director"));
const ApplicationConfirm = lazy(() => import("@/pages/application-confirm"));
const ApplicationRespond = lazy(() => import("@/pages/application-respond"));
const AdminVisitorAnalytics = lazy(() => import("@/pages/admin-visitor-analytics"));
const AdminMarketingAgent = lazy(() => import("@/pages/admin-marketing-agent"));
const ProjectPublicSector = lazy(() => import("@/pages/project-cefas"));
const ProjectRemittance = lazy(() => import("@/pages/project-remittance"));
const ProjectFunding = lazy(() => import("@/pages/project-funding"));
const ProjectTwinPay = lazy(() => import("@/pages/project-twinpay"));
const ProjectTwinTrade = lazy(() => import("@/pages/project-twintrade"));
const CaseStudyPublicSector = lazy(() => import("@/pages/case-study-cefas"));
const CaseStudyOxford = lazy(() => import("@/pages/case-study-oxford"));
const CaseStudyTwinpaay = lazy(() => import("@/pages/case-study-twinpay"));
const CaseStudyYouth = lazy(() => import("@/pages/case-study-youth"));
const CaseStudyEnergy = lazy(() => import("@/pages/case-study-energy"));
const CaseStudySector = lazy(() => import("@/pages/case-study-sector"));
const ConsultationRequest = lazy(() => import("@/pages/consultation-request"));
const GrantApplication = lazy(() => import("@/pages/grant-application"));
const BridgeRedeem = lazy(() => import("@/pages/bridge-redeem"));
const BoothHome = lazy(() => import("@/pages/booth-home"));
const BoothHireLanding = lazy(() => import("@/pages/360-booth"));
const PhotoBoothNigeria = lazy(() => import("@/pages/photo-booth-nigeria"));
const BookingConfirmation = lazy(() => import("@/pages/booking-confirmation"));
const AdminBoothBookings = lazy(() => import("@/pages/admin-booth-bookings"));
const AdminBoothNew = lazy(() => import("@/pages/admin-booth-new"));
const AdminBoothCalendar = lazy(() => import("@/pages/admin-booth-calendar"));
const AdminBoothInvoice = lazy(() => import("@/pages/admin-booth-invoice"));

const GROUP_PORTAL_ENABLED = false;

/* ── Portal Error Boundary ─────────────────────────────────────────── */
class PortalErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PortalErrorBoundary]", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: "#3D0B0B", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Poppins',sans-serif" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "40px 32px", maxWidth: 420, textAlign: "center", boxShadow: "0 16px 48px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: "#3D0B0B", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
              {this.state.error.message || "An unexpected error occurred loading this page."}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = "/client-portal/login"; }}
              style={{ background: "#3D0B0B", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Return to Login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  const portalUser = getPortalUser();
  const trustee = isTrusteePortalUser(portalUser);
  const [location] = useLocation();
  const analyticsRef = useRef<any>(null);
  const lastSent = useRef<{ path?: string; at?: number }>({});

  useEffect(() => {
    // initialize analytics if configured
    try {
      // lazy-import to avoid modifying server-side build when running Node
      import("./lib/analytics").then((mod) => {
        analyticsRef.current = mod;
        mod.initAnalytics();
        mod.sendPageView(window.location.pathname, document.title);
        lastSent.current = { path: window.location.pathname, at: Date.now() };
      });
    } catch (e) {
      // ignore
    }
  }, []);

  // Send pageview on every SPA navigation (debounced to avoid duplicates)
  useEffect(() => {
    try {
      const path = location || window.location.pathname;
      const now = Date.now();
      if (lastSent.current.path === path && now - (lastSent.current.at || 0) < 1000) return;
      lastSent.current = { path, at: now };
      if (analyticsRef.current && analyticsRef.current.sendPageView) {
        analyticsRef.current.sendPageView(path, document.title);
      } else {
        // If analytics not yet loaded, lazy-import and call
        import("./lib/analytics").then((mod) => {
          analyticsRef.current = mod;
          mod.initAnalytics();
          mod.sendPageView(path, document.title);
        }).catch(() => {});
      }
    } catch (e) {
      // ignore
    }
  }, [location]);
  return (
    <Suspense fallback={null}>
      <Switch>
        {/* Public pages */}
        <Route path="/">
          {() => <Redirect to="/iamher" />}
        </Route>
        <Route path="/home">{() => <Redirect to="/iamher" />}</Route>
        <Route path="/about" component={AboutPage} />
        <Route path="/platform" component={PlatformPage} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms-of-service" component={TermsOfService} />
        <Route path="/terms" component={TermsOfService} />

        {/* Projects & Programmes - public pages */}
        <Route path="/projects-and-programmes">{() => <ProjectsProgrammes />}</Route>
        <Route path="/programmes" component={ProjectsProgrammes} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/projects/public-sector" component={ProjectPublicSector} />
        <Route path="/projects/remittance" component={ProjectRemittance} />
        <Route path="/projects/funding" component={ProjectFunding} />
        <Route path="/projects/twinpay" component={ProjectTwinPay} />
        <Route path="/projects/twintrade" component={ProjectTwinTrade} />
        <Route path="/case-studies/sector/:sector" component={CaseStudySector} />
        <Route path="/case-studies/public-sector" component={CaseStudyPublicSector} />
        <Route path="/case-studies/oxford" component={CaseStudyOxford} />
        <Route path="/case-studies/twinpay" component={CaseStudyTwinpaay} />
        <Route path="/case-studies/youth" component={CaseStudyYouth} />
        <Route path="/case-studies/energy" component={CaseStudyEnergy} />
        <Route path="/consultation-request" component={ConsultationRequest} />
        <Route path="/grant-application" component={GrantApplication} />
        <Route path="/booth" component={BoothHome} />
        <Route path="/360-booth-hire-milton-keynes" component={BoothHireLanding} />
        <Route path="/photobooth" component={BoothHireLanding} />
        <Route path="/photo-booth-nigeria" component={PhotoBoothNigeria} />
        <Route path="/booking-confirmation/:token" component={BookingConfirmation} />
        <Route path="/admin/booth-bookings" component={AdminBoothBookings} />
        <Route path="/admin/booth-bookings/new" component={AdminBoothNew} />
        <Route path="/admin/booth-bookings/calendar" component={AdminBoothCalendar} />
        <Route path="/admin/booth-bookings/invoice/:token" component={AdminBoothInvoice} />

        {/* Authentication - planning app login disabled, redirect to client portal */}
        <Route path="/auth">{() => <Redirect to="/client-portal/login" />}</Route>
        <Route path="/login">{() => <Redirect to="/client-portal/login" />}</Route>
        <Route path="/signin">{() => <Redirect to="/client-portal/login" />}</Route>
        <Route path="/sign-in">{() => <Redirect to="/client-portal/login" />}</Route>
        <Route path="/client-login">{() => <Redirect to="/client-portal/login" />}</Route>
        <Route path="/planner-login">{() => <Redirect to="/client-portal/login" />}</Route>
        <Route path="/admin-login">{() => <Redirect to="/client-portal/login" />}</Route>
        <Route path="/forgot-password">{() => <Redirect to="/client-portal/login" />}</Route>
        <Route path="/client-register">{() => <Redirect to="/client-portal/login" />}</Route>
        <Route path="/auth-test">{() => <Redirect to="/client-portal/login" />}</Route>
        <Route path="/login-test">{() => <Redirect to="/client-portal/login" />}</Route>
        <Route path="/debug">{() => <Redirect to="/planner-dashboard" />}</Route>
        <Route path="/project-management">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/budget-management">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/vendor-management">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/management-dashboard">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/admin/iamher">{() => <EventAugustAdmin />}</Route>
        <Route path="/admin">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/staff" component={StaffPage} />
        <Route path="/staff-directory">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/decor-inventory">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/prospect-finder">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/ai-research">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/invoicing">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/documents">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/calendar">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/messages">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/payments">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/run-sheet">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/guest-hub">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/post-event-hub">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/event-dashboard/:eventId">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/event-planner/:eventId">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/events/:id">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/events/:eventId/guests">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/events/:eventId/invitations">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/events/:eventId/invitations/send">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/events/:eventId/reports">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/events/:eventId/closure">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/events/:eventId/resources">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/events/:eventId/analytics">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>
        <Route path="/events/:eventId/post-event">{() => <Redirect to={trustee ? "/client-portal/home" : "/client-portal/login"} />}</Route>

        {/* SAAS-PAUSED — event forms redirect to Group Portal (real domain) */}
        <Route path="/private-event-form" component={BookingEnquiry} />
        <Route path="/corporate-event-form" component={BookingEnquiry} />
        <Route path="/get-started" component={BookingEnquiry} />
        <Route path="/submission-success" component={SubmissionSuccess} />
        <Route path="/client-dashboard">{() => <Redirect to="/client-portal/home" />}</Route>

        <Route path="/planner-dashboard-enhanced">{() => <Redirect to="/planner-dashboard" />}</Route>
        <Route path="/event-timeline">{() => <Redirect to="/planner-dashboard" />}</Route>
        <Route path="/templates">{() => <Redirect to="/event-templates" />}</Route>
        <Route path="/settings">{() => <Redirect to="/planner-dashboard" />}</Route>

        {/* Group Portal — all routes live on tradenow.thetwintrade.co.uk. */}
        {/* Any cached Planning App URL redirects externally to the real Group Portal. */}
        {/* SAAS-PAUSED: do not re-enable these on Planning App without full tenant isolation. */}
        <Route path="/group-portal/login">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/login"); return null; }}</Route>
        <Route path="/group-portal/select">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/select"); return null; }}</Route>
        <Route path="/group-portal/home">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/home"); return null; }}</Route>
        <Route path="/group-portal/projects">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/projects"); return null; }}</Route>
        <Route path="/group-portal/documents">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/documents"); return null; }}</Route>
        <Route path="/group-portal/hr/admin">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/hr/admin"); return null; }}</Route>
        <Route path="/group-portal/hr/onboarding">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/hr/onboarding"); return null; }}</Route>
        <Route path="/group-portal/hr/status">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/hr/status"); return null; }}</Route>
        <Route path="/group-portal/hr">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/hr"); return null; }}</Route>
        <Route path="/group-portal/compliance">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/compliance"); return null; }}</Route>
        <Route path="/group-portal/crm">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/crm"); return null; }}</Route>
        <Route path="/group-portal/marketing">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/marketing"); return null; }}</Route>
        <Route path="/group-portal/chat">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/chat"); return null; }}</Route>
        <Route path="/group-portal/settings">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/settings"); return null; }}</Route>
        <Route path="/group-portal/ep-agent">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/ep-agent"); return null; }}</Route>
        <Route path="/group-portal/twinpaay/compliance">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/twinpaay/compliance"); return null; }}</Route>
        <Route path="/group-portal/twinpaay/aml">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/twinpaay/aml"); return null; }}</Route>
        <Route path="/group-portal/lightbulb/catalogue">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/lightbulb/catalogue"); return null; }}</Route>
        <Route path="/group-portal/lightbulb/orders">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/group-portal/lightbulb/orders"); return null; }}</Route>
        <Route path="/knowledge-base">{() => { window.location.replace("https://tradenow.thetwintrade.co.uk/knowledge-base"); return null; }}</Route>
        <Route path="/bridge/redeem" component={BridgeRedeem} />
        <Route path="/staff-login">{() => <Redirect to="/client-portal/login" />}</Route>

        {/* UK / Nigeria Dashboard Routes — clear country filter on load */}
        <Route path="/uk-dashboard">{() => {
          localStorage.setItem('ep_dashboard_country', 'UK');
          return <Redirect to="/planner-dashboard" />;
        }}</Route>
        <Route path="/nigeria-dashboard">{() => {
          localStorage.setItem('ep_dashboard_country', 'Nigeria');
          return <Redirect to="/planner-dashboard" />;
        }}</Route>
        <Route path="/dashboard">{() => <Redirect to="/planner-dashboard" />}</Route>

        <Route path="/planner-dashboard" component={PlannerDashboard} />
        <Route path="/iam-her" component={IAmHerDashboard} />
        <Route path="/iam-her/esther" component={IAmHerEstherPortal} />
        <Route path="/project-management">{() => <StaffGuard><ProjectManagementDashboard /></StaffGuard>}</Route>
        <Route path="/budget-management">{() => <StaffGuard><BudgetManagement /></StaffGuard>}</Route>
        <Route path="/budget-planner">{() => <StaffGuard><BudgetPlanner /></StaffGuard>}</Route>
        <Route path="/vendor-management">{() => <StaffGuard><VendorManagement /></StaffGuard>}</Route>
        <Route path="/event/:eventId/invitations/send">{() => <StaffGuard><InvitationSendCentre /></StaffGuard>}</Route>
        <Route path="/vendor-meetings" component={VendorMeetingManagement} />
        <Route path="/venue-theme-generator" component={VenueThemeGeneratorPage} />
        <Route path="/venue-designer" component={VenueDesignerUnified} />
        <Route path="/event-checklist" component={EventChecklist} />
        <Route path="/artifacts" component={ArtifactsPage} />
        <Route path="/management-dashboard">{() => <StaffGuard><ManagementDashboard /></StaffGuard>}</Route>
        <Route path="/contract-management" component={ContractManagement} />
        <Route path="/invoicing" component={Invoicing} />
        <Route path="/souvenirs-gifts" component={SouvenirsGifts} />
        <Route path="/graphics-branding" component={GraphicsBranding} />
        <Route path="/timeline" component={TimelineView} />
        <Route path="/reminders" component={RemindersPage} />
        <Route path="/calendar" component={CalendarView} />
        <Route path="/financial-dashboard" component={FinancialDashboard} />
        <Route path="/documents" component={DocumentStorage} />
        <Route path="/event-templates" component={EventTemplatesPage} />
        <Route path="/profit-loss" component={ProfitLossPage} />
        <Route path="/sms-center" component={SmsCenterPage} />
        <Route path="/admin">{() => <StaffGuard><AdminPanel /></StaffGuard>}</Route>
        <Route path="/tickets" component={TicketsPage} />
        <Route path="/proposals" component={ProposalBuilder} />
        <Route path="/project-portal" component={ProjectPortal} />
        <Route path="/payment-plans" component={PaymentPlans} />
        <Route path="/lead-pipeline" component={LeadPipeline} />
        <Route path="/checkin/:eventId">{({ eventId }: { eventId: string }) => <EventCheckin eventId={eventId} />}</Route>
        <Route path="/badge-generator" component={BadgeGenerator} />
        <Route path="/event-day-command">{() => <PortalErrorBoundary><EventDayCommand /></PortalErrorBoundary>}</Route>
        <Route path="/live-polling" component={LivePolling} />
        <Route path="/run-sheet" component={RunSheet} />
        <Route path="/survey-builder" component={SurveyBuilder} />
        <Route path="/vendor-ratings" component={VendorRatings} />
        <Route path="/photo-gallery" component={PhotoGallery} />
        <Route path="/vendor-directory" component={VendorDirectory} />
        <Route path="/staff-directory">{() => <StaffGuard><StaffDirectoryPage /></StaffGuard>}</Route>
        <Route path="/task-management/:eventId?" component={TaskManagementPage} />
        <Route path="/automation" component={AutomationPage} />
        <Route path="/email-campaigns" component={EmailCampaigns} />
        <Route path="/audit-trail" component={AuditTrail} />
        <Route path="/print-materials" component={PrintMaterials} />
        <Route path="/expense-tracker" component={ExpenseTracker} />
        <Route path="/expense-requests" component={ExpenseRequests} />
        <Route path="/onboarding" component={OnboardingPortal} />
        <Route path="/employees" component={EmployeeManagement} />
        <Route path="/staff-time-monitoring" component={StaffTimeMonitoring} />
        <Route path="/decor-inventory" component={DecorInventory} />
        <Route path="/prospect-finder" component={ProspectFinder} />
        <Route path="/youth-outreach" component={YouthOutreach} />
        <Route path="/venue-sourcing" component={VenueSourcing} />
        <Route path="/ai-research" component={AIResearchAssistant} />
        <Route path="/manager-intake" component={ManagerIntake} />
        <Route path="/my-assignments" component={EventResources} />
        {/* Legacy "Tender Manager" muted — the SaaS tender product (/saas-tender) is the
            single canonical tender system. Old URLs redirect there to avoid confusion. */}
        <Route path="/tender-manager">{() => <Redirect to="/saas-tender" />}</Route>
        <Route path="/tender-dashboard">{() => <Redirect to="/saas-tender" />}</Route>
        <Route path="/saas-tender" component={SaasTenderLogin} />
        <Route path="/saas-tender-dashboard" component={SaasTenderDashboard} />

        {/* Event-specific pages */}
        <Route path="/event-planner/:eventId" component={EventPlanner} />
        <Route path="/events/:id" component={EventDetails} />
        <Route path="/event-dashboard/:eventId" component={EventDashboard} />
        <Route path="/events/:eventId/guests" component={GuestManagement} />
        <Route path="/events/:eventId/invitations" component={InvitationDesigner} />
        <Route path="/events/:eventId/invitations/send" component={InvitationSendCentre} />
        <Route path="/events/:eventId/reports" component={EventReports} />
        <Route path="/events/:eventId/closure" component={EventClosure} />
        <Route path="/events/:eventId/resources" component={EventResources} />
        <Route path="/events/:eventId/analytics" component={EventAnalytics} />
        <Route path="/events/:eventId/post-event" component={PostEventAnalytics} />
        <Route path="/post-event-hub" component={PostEventHub} />
        <Route path="/internal-team-budget" component={InternalTeamBudget} />
        <Route path="/guest-hub">{() => <StaffGuard><GuestHub /></StaffGuard>}</Route>

        {/* Guest-facing pages (public) */}
        <Route path="/rsvp/:token" component={RSVPPage} />
        <Route path="/invitation/:id" component={InvitationView} />
        <Route path="/event-app/:eventId" component={EventApp} />
        <Route path="/events/:eventId/app-builder" component={EventAppBuilder} />
        <Route path="/contract-sign/:contractId" component={ClientContractSigning} />
        <Route path="/upload-docs/:token">{({ token }: { token: string }) => <UploadDocs token={token} />}</Route>
        <Route path="/pay/:invoiceId" component={InvoicePayment} />
        <Route path="/get-started">{() => <Redirect to="/booking-enquiry" />}</Route>
        <Route path="/event-selection" component={EventTypeSelection} />
        <Route path="/booking-enquiry" component={BookingEnquiry} />
        <Route path="/book" component={BookingEnquiry} />
        <Route path="/wedding" component={BookingEnquiry} />
        <Route path="/corporate" component={BookingEnquiry} />
        <Route path="/celebration" component={BookingEnquiry} />
        <Route path="/childrens-party" component={BookingEnquiry} />
        <Route path="/entertainment" component={BookingEnquiry} />
        <Route path="/day-coordination" component={BookingEnquiry} />
        <Route path="/vote/:pollId" component={PollVote} />
        <Route path="/survey/:surveyId">{({ surveyId }: { surveyId: string }) => <SurveyRespond surveyId={surveyId} />}</Route>
        <Route path="/gallery/:albumId" component={GalleryPublic} />
        <Route path="/find-seat/:eventId">{({ eventId }: { eventId: string }) => <FindYourSeat eventId={eventId} />}</Route>

        {/* Vendor portal */}
        <Route path="/vendor-portal" component={VendorPortalLogin} />
        <Route path="/vendor-portal/forgot-password" component={VendorPortalLogin} />
        <Route path="/vendor-terms">{() => <Redirect to="/terms-of-service" />}</Route>
        <Route path="/vendor-privacy">{() => <Redirect to="/privacy-policy" />}</Route>
        <Route path="/vendor-support">{() => <Redirect to="/vendor-portal" />}</Route>
        <Route path="/vendor-dashboard" component={VendorDashboard} />

        {/* Floor Plan Builder */}
        <Route path="/floor-plan-builder" component={FloorPlanBuilder} />

        {/* EP Global Operational Hub */}
        <Route path="/client-portal/login" component={ClientPortalLogin} />
        <Route path="/client-portal/reset-password" component={ClientPortalResetPassword} />
        <Route path="/client-portal/home">{() => <PortalErrorBoundary><ClientPortalHome /></PortalErrorBoundary>}</Route>
        <Route path="/client-portal/project">{() => <PortalErrorBoundary><ClientPortalProject /></PortalErrorBoundary>}</Route>
        <Route path="/client-portal/calendar">{() => <PortalErrorBoundary><ClientPortalCalendar /></PortalErrorBoundary>}</Route>
        <Route path="/meeting/:slug" component={GatewayMeetingPage} />
        <Route path="/client-portal/status">{() => <PortalErrorBoundary><ClientPortalStatus /></PortalErrorBoundary>}</Route>
        <Route path="/client-portal/payments">{() => <PortalErrorBoundary><ClientPortalPayments /></PortalErrorBoundary>}</Route>
        <Route path="/client-portal/documents">{() => <PortalErrorBoundary><ClientPortalDocuments /></PortalErrorBoundary>}</Route>
        <Route path="/client-portal/messages">{() => <PortalErrorBoundary><ClientPortalMessages /></PortalErrorBoundary>}</Route>
        <Route path="/portal/alli/client/:id">{() => <Redirect to="/client-portal/documents" />}</Route>
        <Route path="/client-portal/collaboration">{() => <Redirect to="/client-portal/home" />}</Route>
        <Route path="/client-portal/emails">{() => <Redirect to="/client-portal/home" />}</Route>
        <Route path="/client-portal/proposals">{() => <Redirect to="/client-portal/home" />}</Route>
        <Route path="/client-portal/intelligence">{() => <Redirect to="/client-portal/home" />}</Route>
        <Route path="/collaborator/accept/:token" component={CollaboratorPortal} />
        <Route path="/collaborator/:token" component={CollaboratorPortal} />
        <Route path="/client-portal">{() => <Redirect to="/client-portal/login" />}</Route>
        <Route path="/portal">{() => <Redirect to="/client-portal/login" />}</Route>
        <Route path="/client-portal/dashboard">{() => <Redirect to="/client-portal/home" />}</Route>
        <Route path="/ep-clients" component={EPClients} />

        {/* ALLI Foundation — Client Portal only. Old staff routes redirect. */}
        <Route path="/projects/alli-foundation/young-people">{() => <Redirect to="/client-portal/alli/young-people" />}</Route>
        <Route path="/projects/alli-foundation/young-people/:id">{() => <Redirect to="/client-portal/alli/young-people" />}</Route>
        <Route path="/projects/alli-foundation/partners">{() => <Redirect to="/client-portal/alli/partners" />}</Route>
        <Route path="/projects/alli-foundation/partners/:id">{() => <Redirect to="/client-portal/alli/partners" />}</Route>
        <Route path="/projects/alli-foundation/events">{() => <Redirect to="/client-portal/alli/events" />}</Route>
        <Route path="/projects/alli-foundation/action-items">{() => <Redirect to="/client-portal/alli/young-people" />}</Route>

        <Route path="/client-portal/alli/strategic-overview">{() => <PortalErrorBoundary><AlliStrategicOverviewPage /></PortalErrorBoundary>}</Route>
        <Route path="/client-portal/weekly-reports">{() => <PortalErrorBoundary><ClientPortalWeeklyReports /></PortalErrorBoundary>}</Route>
        <Route path="/client-portal/action-items">{() => <PortalErrorBoundary><ClientPortalActionItems /></PortalErrorBoundary>}</Route>
        <Route path="/client-portal/alli/young-people">{() => <PortalErrorBoundary><AlliYoungPeoplePortal /></PortalErrorBoundary>}</Route>
        <Route path="/client-portal/alli/partners">{() => <PortalErrorBoundary><AlliPartnersPortal /></PortalErrorBoundary>}</Route>
        <Route path="/client-portal/alli/funders">{() => <PortalErrorBoundary><AlliFundersPortal /></PortalErrorBoundary>}</Route>
        <Route path="/client-portal/alli/events">{() => <PortalErrorBoundary><AlliEventsPortal /></PortalErrorBoundary>}</Route>

        <Route path="/ep-crm" component={EPClientCRM} />
        <Route path="/ep-crm/:id" component={EPClientDetail} />
        <Route path="/onboarding/:token" component={OnboardingWizard} />

        <Route path="/epglobal/login" component={EPGlobalLogin} />
        <Route path="/epglobal/dashboard" component={EPGlobalDashboard} />
        <Route path="/epglobal/tasks" component={EPGlobalTasks} />
        <Route path="/epglobal/calendar" component={EPGlobalCalendar} />
        <Route path="/epglobal/invoices" component={EPGlobalInvoices} />
        <Route path="/epglobal/payments" component={EPGlobalPayments} />
        <Route path="/epglobal/activities" component={EPGlobalActivities} />
        <Route path="/epglobal/vendors" component={EPGlobalVendors} />
        <Route path="/epglobal/compliance" component={EPGlobalCompliance} />
        <Route path="/epglobal/reports" component={EPGlobalReports} />
        <Route path="/epglobal">{() => <Redirect to="/epglobal/login" />}</Route>

        {/* August / I Am Her Event */}
        <Route path="/august" component={EventAugust} />
        <Route path="/iamher" component={EventAugust} />
        <Route path="/about-the-movement" component={AboutTheMovement} />
        <Route path="/iamher/confirm" component={EventAugustConfirm} />
        <Route path="/iamher/invite" component={IAmHerInvite} />
        {/* Short URL form */}
        <Route path="/h" component={HPage} />
        <Route path="/access" component={AccessPage} />
        <Route path="/access/payment" component={PaymentPage} />
        <Route path="/meet-the-room" component={MeetTheRoom} />
        <Route path="/iamher/card" component={IAmHerCard} />
        <Route path="/iamher/stay" component={IAmHerStay} />
        <Route path="/iamher/community" component={IAmHerCommunity} />
        <Route path="/iamher/feature-your-business" component={IAmHerFeatureBusiness} />
        <Route path="/iamher/feature" component={IAmHerFeature} />
        <Route path="/iamher/business/:id" component={IAmHerBusinessProfile} />
        <Route path="/iamher/analytics" component={IAmHerAnalytics} />
        <Route path="/iamher/nominate" component={IAmHerNominate} />
        <Route path="/iamher/signature" component={IAmHerSignature} />
        <Route path="/iamher/submit-story" component={IAmHerSubmit} />
        <Route path="/iamher/stories" component={IAmHerStories} />
        <Route path="/iamher/media" component={IAmHerMedia} />
        <Route path="/stories/:slug" component={IAmHerStoryPage} />
        <Route path="/admin/iamher/stories" component={IAmHerStoriesAdmin} />
        <Route path="/admin/iamher/businesses" component={AdminIamherBusinesses} />
        <Route path="/iamher/partnership/product-brands" component={IamHerProductBrands} />
        <Route path="/iamher/partnership/payment" component={PartnershipPayment} />
        <Route path="/iamher/partnership/founding-assessment" component={FoundingAssessment} />
        <Route path="/iamher/partnership/table-nominations" component={TableNominations} />
        <Route path="/iamher/partnership" component={IAmHerBrochure} />

        {/* Application & Confirmation pipeline (Part C) */}
        <Route path="/iamher/apply/confirm" component={ApplicationConfirm} />
        <Route path="/iamher/apply/respond" component={ApplicationRespond} />
        <Route path="/admin/applications" component={ApplicationsReview} />
        <Route path="/admin/applications/director" component={ApplicationsDirector} />
        <Route path="/admin/visitor-analytics">{() => <StaffGuard><AdminVisitorAnalytics /></StaffGuard>}</Route>
        <Route path="/admin/marketing-agent">{() => <StaffGuard><AdminMarketingAgent /></StaffGuard>}</Route>

        {/* Route aliases / stubs for sidebar links */}
        <Route path="/invitation-designer">{() => <Redirect to="/planner-dashboard" />}</Route>
        <Route path="/event-closure">{() => <Redirect to="/post-event-hub" />}</Route>
        <Route path="/messaging">{() => <Redirect to="/client-portal/messages" />}</Route>
        <Route path="/checkin/select">{() => <Redirect to="/event-day-command" />}</Route>

        {/* Catch-all */}
        <Route>
          {() => <Redirect to="/planner-dashboard" />}
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209]">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <EPGlobalAuthProvider>
            <TooltipProvider>
              <Toaster />
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <CookieConsent />
              <PWAInstallPrompt />
            </TooltipProvider>
          </EPGlobalAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
