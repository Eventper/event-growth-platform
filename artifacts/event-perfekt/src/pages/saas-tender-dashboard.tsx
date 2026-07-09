import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import TenderKnowledgeBase from "@/components/TenderKnowledgeBase";
import { FullScreenModal } from "@/components/ui/full-screen-modal";
import DiscoveryTenders from "@/components/tender/DiscoveryTenders";
import BidWriter from "@/components/tender/BidWriter";
import ElizabethTenderChat from "@/components/tender/ElizabethTenderChat";
import {
  BLUE, PURPLE, BG, CARD_BG, BORDER, GOLD, btn, card, label, input,
  fmtDate, fmtMoney, TENDER_STATUSES, LANE_THRESHOLD, LANE_CHIPS, laneScoreOf,
  API, saasApiRequest, BID_SECTIONS, governanceStatusColor, governanceBadge,
  type OrgLaneFilter,
} from "@/components/tender/ui";

// Hard relevance filter — only tenders matching at least one term are shown
const RELEVANCE_TERMS: { term: string; label: string }[] = [
  // Events & Conferences
  { term: "event", label: "Events" },
  { term: "conference", label: "Conference" },
  { term: "venue", label: "Venue" },
  { term: "gala", label: "Gala" },
  { term: "awards", label: "Awards" },
  { term: "ceremony", label: "Ceremony" },
  { term: "delegate", label: "Delegate" },
  { term: "hospitality", label: "Hospitality" },
  // Programme & Project Management
  { term: "project management", label: "Project Mgmt" },
  { term: "programme management", label: "Programme Mgmt" },
  { term: "programme delivery", label: "Programme Delivery" },
  { term: "programme support", label: "Programme Support" },
  { term: "project planning", label: "Project Planning" },
  { term: "pmo", label: "PMO" },
  // Consulting
  { term: "consulting", label: "Consulting" },
  { term: "consultancy", label: "Consultancy" },
  // Government & FCDO
  { term: "fcdo", label: "FCDO" },
  { term: "foreign commonwealth", label: "FCDO" },
  { term: "dfid", label: "DFID" },
  { term: "cefas", label: "CEFAS" },
  { term: "defra", label: "DEFRA" },
  { term: "british council", label: "British Council" },
  { term: "overseas development", label: "Overseas Dev" },
  { term: "uk aid", label: "UK Aid" },
  { term: "oda", label: "ODA" },
  { term: "bilateral", label: "Bilateral Aid" },
  { term: "technical assistance", label: "Technical Assistance" },
  { term: "technical cooperation", label: "Technical Cooperation" },
  // Africa & International
  { term: "africa", label: "Africa" },
  { term: "nigeria", label: "Nigeria" },
  { term: "ghana", label: "Ghana" },
  { term: "kenya", label: "Kenya" },
  { term: "senegal", label: "Senegal" },
  { term: "mozambique", label: "Mozambique" },
  { term: "madagascar", label: "Madagascar" },
  { term: "sierra leone", label: "Sierra Leone" },
  { term: "zambia", label: "Zambia" },
  { term: "cameroon", label: "Cameroon" },
  { term: "diaspora", label: "Diaspora" },
  { term: "international development", label: "Intl Development" },
  // Remittance, Payments & Disbursement
  { term: "remittance", label: "Remittance" },
  { term: "disbursement", label: "Disbursement" },
  { term: "cash transfer", label: "Cash Transfer" },
  { term: "cross-border payment", label: "Cross-Border Payment" },
  { term: "cross-border delivery", label: "Cross-Border Delivery" },
  { term: "payment service", label: "Payment Service" },
  { term: "mobile money", label: "Mobile Money" },
  { term: "fintech", label: "Fintech" },
  { term: "financial inclusion", label: "Financial Inclusion" },
  { term: "beneficiary payment", label: "Beneficiary Payment" },
  { term: "grant disbursement", label: "Grant Disbursement" },
  // Engagement & Capacity
  { term: "community engagement", label: "Community Engagement" },
  { term: "stakeholder", label: "Stakeholder" },
  { term: "capacity building", label: "Capacity Building" },
  { term: "governance", label: "Governance" },
  // Training & Delivery
  { term: "training", label: "Training" },
  { term: "workshop", label: "Workshop" },
  { term: "facilitation", label: "Facilitation" },
  { term: "logistics", label: "Logistics" },
  // Trade
  { term: "trade", label: "Trade" },
  { term: "export", label: "Export" },
  { term: "aid", label: "Aid" },
];

function getRelevanceMatches(tender: any): { term: string; label: string }[] {
  const haystack = [
    tender.title,
    tender.description,
    tender.buyer,
    tender.category,
    tender.location,
    tender.country,
  ].filter(Boolean).join(" ").toLowerCase();
  return RELEVANCE_TERMS.filter(({ term }) => haystack.includes(term));
}
// Palette (BLUE/PURPLE/BG/CARD_BG/BORDER/GOLD), TENDER_STATUSES, the six-lane
// filter chips (LANE_THRESHOLD/LANE_CHIPS/laneScoreOf), fmtDate/fmtMoney, the API
// base + saasApiRequest fetch helper, BID_SECTIONS, and governanceStatusColor/
// governanceBadge now live in components/tender/ui.ts and are imported above.

export default function SaasTenderDashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [country, setCountry] = useState<"GB" | "NG">("GB");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<any>(null);
  const [tenders, setTenders] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchConfig, setSearchConfig] = useState<any>(null);
  const [intelligence, setIntelligence] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [bidVaultFolders, setBidVaultFolders] = useState<any[]>([]);
  const [bidVaultFiles, setBidVaultFiles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [portalRegs, setPortalRegs] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [actionItems, setActionItems] = useState<any[]>([]);

  const [selectedTender, setSelectedTender] = useState<any>(null);
  const [tenderDocs, setTenderDocs] = useState<any[]>([]);
  const [packDocs, setPackDocs] = useState<any[]>([]);
  const [extractedFacts, setExtractedFacts] = useState<any[]>([]);
  const [activeFactTab, setActiveFactTab] = useState("requirement");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [packDocsLoading, setPackDocsLoading] = useState(false);
  const [tenderSections, setTenderSections] = useState<any[]>([]);
  const [tenderRequirements, setTenderRequirements] = useState<any[]>([]);
  const [complianceMatrix, setComplianceMatrix] = useState<any[]>([]);
  const [matrixSummary, setMatrixSummary] = useState<any>(null);
  const [rebuildingMatrix, setRebuildingMatrix] = useState(false);

  const [showTenderForm, setShowTenderForm] = useState(false);
  const [editingTender, setEditingTender] = useState<any>(null);
  const [tenderForm, setTenderForm] = useState<any>({});
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTab, setQuickAddTab] = useState<"url" | "manual">("url");
  const [quickAddUrl, setQuickAddUrl] = useState("");
  const [quickAddForm, setQuickAddForm] = useState<any>({});
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddResult, setQuickAddResult] = useState<any>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});
  const [showConfigEdit, setShowConfigEdit] = useState(false);
  const [configForm, setConfigForm] = useState<any>({ keywords: "", categories: "", countries: "", digest_email: "", digest_enabled: true });

  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [scanningIntel, setScanningIntel] = useState(false);
  const [extractingReqs, setExtractingReqs] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [askingAi, setAskingAi] = useState(false);
  const [selectedVaultFolder, setSelectedVaultFolder] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [editingPortal, setEditingPortal] = useState<any>(null);
  const [showPortalForm, setShowPortalForm] = useState(false);
  const [portalForm, setPortalForm] = useState<any>({});
  const [tenderDetailsInput, setTenderDetailsInput] = useState("");
  const [selectedTenderForBid, setSelectedTenderForBid] = useState<any>(null);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalContent, setProposalContent] = useState("");
  const [generatingBid, setGeneratingBid] = useState(false);
  const [currentProposalId, setCurrentProposalId] = useState<number | null>(null);
  const [shareLink, setShareLink] = useState("");
  const [savingProposal, setSavingProposal] = useState(false);

  // Compliance Hub state
  const [protocols, setProtocols] = useState<any[]>([]);
  const [complianceStats, setComplianceStats] = useState<any>(null);
  const [complianceDocs, setComplianceDocs] = useState<any[]>([]);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<any>(null);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [protocolCategory, setProtocolCategory] = useState("all");
  // Bid Security state
  const [bidSecurityRecords, setBidSecurityRecords] = useState<any[]>([]);
  const [showCoiForm, setShowCoiForm] = useState(false);
  const [coiForm, setCoiForm] = useState<any>({ tender_id: "", has_conflict: false, conflict_details: "", declared_by: "" });
  const [showBidVersionForm, setShowBidVersionForm] = useState(false);
  const [bidVersionForm, setBidVersionForm] = useState<any>({ tender_id: "", title: "", version_number: "", content: "" });

  // TwinPay Remittance Finder state
  const [twinpayResults, setTwinpayResults] = useState<any[]>([]);
  const [twinpayLoading, setTwinpayLoading] = useState(false);
  const [twinpayRegion, setTwinpayRegion] = useState("All Africa");
  const [twinpayType, setTwinpayType] = useState("all");
  const [twinpayEmailDraft, setTwinpayEmailDraft] = useState<any>(null);
  const [twinpayGeneratingEmail, setTwinpayGeneratingEmail] = useState<number | null>(null);

  // Contact Intel (EP-Powered Contact Verification) state
  const [contactCompany, setContactCompany] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [contactContext, setContactContext] = useState("procurement");
  const [contactResult, setContactResult] = useState<any>(null);
  const [contactHistory, setContactHistory] = useState<any[]>([]);
  const [contactLoading, setContactLoading] = useState(false);

  // Org-lane filter (Piece D)
  const [orgLaneFilter, setOrgLaneFilter] = useState<OrgLaneFilter>("all");
  const [expandedWhyId, setExpandedWhyId] = useState<number | null>(null);
  const [hoveredOrgPill, setHoveredOrgPill] = useState<{ id: number; org: string } | null>(null);

  // Not-relevant signals (Fix 3)
  const [notRelevantIds, setNotRelevantIds] = useState<Set<number>>(new Set());
  const [showNotRelevant, setShowNotRelevant] = useState(false);
  const [togglingNotRelevant, setTogglingNotRelevant] = useState<number | null>(null);

  // E2: Confidence scoring state
  const [scoringConfidence, setScoringConfidence] = useState<number | null>(null);
  const [expandedWeakPoints, setExpandedWeakPoints] = useState<number | null>(null);

  // E3: Gap analysis state
  const [analyzingGaps, setAnalyzingGaps] = useState(false);
  const [bidGaps, setBidGaps] = useState<any[]>([]);
  const [showGapsPanel, setShowGapsPanel] = useState(false);
  const [dismissedGaps, setDismissedGaps] = useState<number[]>([]);

  // E4: Evidence picker state
  const [evidencePickerSection, setEvidencePickerSection] = useState<any | null>(null);
  const [evidenceSuggestions, setEvidenceSuggestions] = useState<any[]>([]);
  const [allVaultDocs, setAllVaultDocs] = useState<any[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [attachingEvidence, setAttachingEvidence] = useState<number | null>(null);
  const [sectionAttachedEvidence, setSectionAttachedEvidence] = useState<Record<number, any[]>>({});

  // E5: Learning Loop state
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonModalSection, setLessonModalSection] = useState<any | null>(null);
  const [lessonForm, setLessonForm] = useState({ lesson_text: "", section_type: "" });
  const [savingLesson, setSavingLesson] = useState(false);
  const [lessonsVaultData, setLessonsVaultData] = useState<any[]>([]);
  const [loadingLessonsVault, setLoadingLessonsVault] = useState(false);
  const [lessonsVaultFilter, setLessonsVaultFilter] = useState("all");
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [editingLessonText, setEditingLessonText] = useState("");

  // ITT Details state
  const [ittDetails, setIttDetails] = useState<any>(null);
  const [ittForm, setIttForm] = useState<any>({});
  const [showIttPanel, setShowIttPanel] = useState(false);
  const [savingItt, setSavingItt] = useState(false);
  const [ittContacts, setIttContacts] = useState<Array<{ name: string; role: string; email: string; phone: string }>>([]);

  // Improve Section state
  const [improvingSection, setImprovingSection] = useState<number | null>(null);

  // Score Bid state
  const [scoringBid, setScoringBid] = useState(false);
  const [bidScoreResult, setBidScoreResult] = useState<any>(null);
  const [showBidScoreModal, setShowBidScoreModal] = useState(false);

  // Answer Questions state
  const [questionsInput, setQuestionsInput] = useState("");
  const [questionsAnswer, setQuestionsAnswer] = useState("");
  const [answeringQuestions, setAnsweringQuestions] = useState(false);

  // Bid Governance state
  const [governanceSections, setGovernanceSections] = useState<any[]>([]);
  const [governanceLog, setGovernanceLog] = useState<any[]>([]);
  const [loadingGovernance, setLoadingGovernance] = useState(false);
  const [governanceActionModal, setGovernanceActionModal] = useState<any>(null);
  const [governanceNotes, setGovernanceNotes] = useState("");
  const [governanceFilter, setGovernanceFilter] = useState("all");

  // Learning Vault state
  const [learningVault, setLearningVault] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [showVaultForm, setShowVaultForm] = useState(false);
  const [vaultForm, setVaultForm] = useState<any>({ tender_name: "", reference: "", buyer: "", date: "", outcome: "", our_score: "", winner_score: "", lessons: "", feedback_text: "", what_to_do_differently: "" });
  const [outcomeModal, setOutcomeModal] = useState<any>(null);
  const [outcomeForm, setOutcomeForm] = useState<any>({ outcome: "", our_score: "", winner_score: "", feedback_text: "", what_to_do_differently: "" });
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

  // Automation state
  const [automationLog, setAutomationLog] = useState<any[]>([]);
  const [loadingAutomation, setLoadingAutomation] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [fitScores, setFitScores] = useState<any[]>([]);
  const [generatingAll16, setGeneratingAll16] = useState(false);

  // AI usage / cost tracking
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [loadingAiUsage, setLoadingAiUsage] = useState(false);
  const [ceilingInput, setCeilingInput] = useState("");
  const [savingCeiling, setSavingCeiling] = useState(false);

  // Submit caution modal
  const [submitModalSection, setSubmitModalSection] = useState<any>(null);
  const [submitChecklist, setSubmitChecklist] = useState<Record<string, boolean>>({});

  // EP Agent review chat
  const [chatSection, setChatSection] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // EP Opportunity Intelligence
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [opportunitiesError, setOpportunitiesError] = useState("");

  // ── Tender Finder state (FIX 1-11) ─────────────────────────────────────────
  const [finderKeyword, setFinderKeyword]         = useState("");
  const [finderBuyer, setFinderBuyer]             = useState("");
  const [finderStatusTab, setFinderStatusTab]     = useState<string>("all");
  const [finderSmeOnly, setFinderSmeOnly]         = useState(false);
  const [finderWinner, setFinderWinner]           = useState("");
  const [finderCpv, setFinderCpv]                 = useState("");
  const [finderProcedure, setFinderProcedure]     = useState("");
  const [finderRegions, setFinderRegions]         = useState<string[]>([]);
  const [finderFrom, setFinderFrom]               = useState("");
  const [finderTo, setFinderTo]                   = useState("");
  const [finderSource, setFinderSource]           = useState<string>("both");
  const [finderSort, setFinderSort]               = useState<string>("best_match");
  const [finderPage, setFinderPage]               = useState(1);
  const [finderPageSize, setFinderPageSize]       = useState(20);
  const [finderResponse, setFinderResponse]       = useState<any>(null);
  const [finderShowFilters, setFinderShowFilters] = useState(false);
  const [finderSearched, setFinderSearched]       = useState(false);
  const [finderDbStats, setFinderDbStats]         = useState<any>(null);
  const [finderRefreshing, setFinderRefreshing]   = useState(false);
  const [buyerIntel, setBuyerIntel]               = useState<any>(null);
  const [buyerIntelLoading, setBuyerIntelLoading] = useState(false);
  const [buyerIntelName, setBuyerIntelName]       = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    const token = localStorage.getItem("saas_tender_token");
    const stored = localStorage.getItem("saas_tender_user");
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    if (!token) { setLocation("/saas-tender"); return; }
    loadData();
  }, []);

  useEffect(() => {
    if ((activeTab === "compliance" || activeTab === "bid-security") && protocols.length === 0) {
      loadComplianceData();
    }
    if (activeTab === "governance") loadGovernance();
    if (activeTab === "knowledge") loadLearningVault();
    if (activeTab === "lessons-vault") loadLessonsVault(lessonsVaultFilter);
    if (activeTab === "automation") loadAutomationLog();
    if (activeTab === "ai-usage") loadAiUsage();
    if (activeTab === "finder" && !finderSearched) {
      handleFinderSearch({ page: 1 });
    }
    if (activeTab === "finder") {
      loadFinderStats();
    }
  }, [activeTab]);

  const loadFinderStats = async () => {
    try {
      const data = await saasApiRequest("GET", `${API}/stats`);
      setFinderDbStats(data);
    } catch { /* non-blocking */ }
  };

  const refreshFinder = async () => {
    setFinderRefreshing(true);
    try {
      await handleFinderSearch({ page: 1 });
      // Give the fire-and-forget cache upsert a moment to settle, then refresh stats
      await new Promise(r => setTimeout(r, 1200));
      await loadFinderStats();
      const count = finderResponse?.pagination?.total_results ?? 0;
      showToast(`Tenders refreshed — ${count} results`);
    } catch (err: any) {
      showToast("Refresh failed: " + err.message);
    }
    setFinderRefreshing(false);
  };

  const timeAgo = (iso: string | null | undefined) => {
    if (!iso) return "never";
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 0) return "just now";
    const m = Math.floor(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
    const d = Math.floor(h / 24);
    return `${d} day${d === 1 ? "" : "s"} ago`;
  };

  const addTenderToAlliResearch = async (t: any) => {
    try {
      const payload = {
        title: t.title,
        url: t.url,
        summary: t.description || "",
        source: t.source_label || t.source || "Tender Finder",
        buyer: t.buyer,
        deadline: t.deadline,
        value: t.value,
        tags: ["alli", "tender", "violence-reduction"],
      };
      await saasApiRequest("POST", `/api/research/results`, payload).catch(async () => {
        await saasApiRequest("POST", `/api/alli-research/results`, payload);
      });
      showToast("Added to ALLI Research");
    } catch (err: any) {
      showToast("Could not save to ALLI Research: " + (err?.message || "try again"));
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [country]);

  const loadData = async () => {
    setLoading(true);
    try {
      const q = `?country=${country}`;
      const [s, t, sc, i, pu, f, fi, u, pr, w, fs, ai, nr] = await Promise.all([
        saasApiRequest("GET", `${API}/stats${q}`),
        saasApiRequest("GET", `${API}/tenders${q}`),
        saasApiRequest("GET", `${API}/search-config${q}`),
        saasApiRequest("GET", `${API}/intelligence${q}`),
        saasApiRequest("GET", `${API}/company-profile${q}`),
        saasApiRequest("GET", `${API}/bid-vault/folders${q}`),
        saasApiRequest("GET", `${API}/bid-vault/files${q}`),
        saasApiRequest("GET", `${API}/users${q}`),
        saasApiRequest("GET", `${API}/portal-registrations${q}`),
        saasApiRequest("GET", `${API}/watchlist${q}`),
        saasApiRequest("GET", `${API}/fit-scores`).catch(() => []),
        saasApiRequest("GET", `${API}/action-items${q}`).catch(() => []),
        saasApiRequest("GET", `${API}/not-relevant`).catch(() => []),
      ]);
      setStats(s); setTenders(t); setSearchConfig(sc); setIntelligence(i);
      setProfile(pu); setBidVaultFolders(f); setBidVaultFiles(fi);
      setUsers(u); setPortalRegs(pr); setWatchlist(w); setFitScores(fs || []);
      setActionItems(Array.isArray(ai) ? ai : []);
      setNotRelevantIds(new Set(Array.isArray(nr) ? nr : []));

      // Auto-seed DB from UK Contracts Finder if tenders are sparse
      const tenderList = Array.isArray(t) ? t : [];
      if (tenderList.length < 5) {
        saasApiRequest("POST", `${API}/auto-seed`, { country }).catch(() => {});
      }

      // Auto-load opportunity intelligence
      loadOpportunities();
    } catch (err: any) {
      if (err.message?.includes("401") || err.message?.includes("403")) {
        localStorage.removeItem("saas_tender_token");
        localStorage.removeItem("saas_tender_user");
        setLocation("/saas-tender");
      }
    }
    setLoading(false);
  };

  const loadOpportunities = async () => {
    setLoadingOpportunities(true);
    setOpportunitiesError("");
    try {
      const data = await saasApiRequest("GET", `${API}/opportunities?country=${country}`);
      setOpportunities(Array.isArray(data?.opportunities) ? data.opportunities : []);
    } catch (err: any) {
      setOpportunitiesError(err.message || "Could not load opportunities");
    }
    setLoadingOpportunities(false);
  };

  const logout = () => {
    localStorage.removeItem("saas_tender_token");
    localStorage.removeItem("saas_tender_user");
    setLocation("/saas-tender");
  };

  const loadComplianceData = async () => {
    setLoadingCompliance(true);
    try {
      const [prots, cstats, cdocs, bsec] = await Promise.all([
        saasApiRequest("GET", `${API}/compliance/protocols`),
        saasApiRequest("GET", `${API}/compliance/stats`),
        saasApiRequest("GET", `${API}/compliance/documents`),
        saasApiRequest("GET", `${API}/bid-security`),
      ]);
      setProtocols(prots);
      setComplianceStats(cstats);
      setComplianceDocs(cdocs);
      setBidSecurityRecords(bsec);
    } catch (err: any) { showToast("Failed to load compliance data: " + err.message); }
    setLoadingCompliance(false);
  };

  const updateProtocolStatus = async (protocolId: number, status: string, notes?: string) => {
    try {
      await saasApiRequest("PATCH", `${API}/compliance/protocols/${protocolId}`, { status, notes });
      const [prots, cstats] = await Promise.all([
        saasApiRequest("GET", `${API}/compliance/protocols`),
        saasApiRequest("GET", `${API}/compliance/stats`),
      ]);
      setProtocols(prots);
      setComplianceStats(cstats);
      showToast("Status updated");
    } catch (err: any) { showToast(err.message); }
  };

  const generateComplianceDoc = async (protocolId: number | null, documentName: string) => {
    setGeneratingDoc(documentName);
    try {
      const doc = await saasApiRequest("POST", `${API}/compliance/documents/generate`, {
        protocol_id: protocolId,
        document_name: documentName,
        document_type: "policy",
      });
      const cdocs = await saasApiRequest("GET", `${API}/compliance/documents`);
      setComplianceDocs(cdocs);
      setViewingDoc(doc);
      showToast(`${documentName} generated (v${doc.version})`);
    } catch (err: any) { showToast("Generation failed: " + err.message); }
    setGeneratingDoc(null);
  };

  const approveDoc = async (docId: number, approvedBy: string) => {
    await saasApiRequest("PATCH", `${API}/compliance/documents/${docId}`, { status: "approved", approved_by: approvedBy });
    const cdocs = await saasApiRequest("GET", `${API}/compliance/documents`);
    setComplianceDocs(cdocs);
    if (viewingDoc?.id === docId) setViewingDoc({ ...viewingDoc, status: "approved", approved_by: approvedBy });
    showToast("Document approved");
  };

  const downloadDoc = (doc: any) => {
    const blob = new Blob([doc.content || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.document_name.replace(/[^a-z0-9]/gi, "_")}_v${doc.version}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitCoi = async () => {
    try {
      const record = await saasApiRequest("POST", `${API}/bid-security`, {
        ...coiForm,
        record_type: "coi_declaration",
        title: `COI Declaration${coiForm.tender_id ? ` - ${tenders.find((t: any) => t.id == coiForm.tender_id)?.title || ""}` : ""}`,
        tender_id: coiForm.tender_id ? parseInt(coiForm.tender_id) : null,
        declared_by: coiForm.declared_by || user?.email,
      });
      setBidSecurityRecords(prev => [record, ...prev]);
      setShowCoiForm(false);
      setCoiForm({ tender_id: "", has_conflict: false, conflict_details: "", declared_by: "" });
      showToast("COI Declaration submitted");
    } catch (err: any) { showToast(err.message); }
  };

  const submitBidVersion = async () => {
    try {
      const record = await saasApiRequest("POST", `${API}/bid-security`, {
        ...bidVersionForm,
        record_type: "bid_version",
        tender_id: bidVersionForm.tender_id ? parseInt(bidVersionForm.tender_id) : null,
        declared_by: user?.email,
      });
      setBidSecurityRecords(prev => [record, ...prev]);
      setShowBidVersionForm(false);
      setBidVersionForm({ tender_id: "", title: "", version_number: "", content: "" });
      showToast("Bid version logged");
    } catch (err: any) { showToast(err.message); }
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const data = await saasApiRequest("GET", `${API}/feed/search`);
      setSearchResults((data.tenders || []).map((t: any) => ({ ...t, relevance_score: t.relevance_score ?? t.score ?? 0 })));
    } catch (err: any) { showToast("Search failed: " + err.message); }
    setSearching(false);
  };

  const handleFinderSearch = async (overrides: Record<string, any> = {}) => {
    setSearching(true);
    setFinderSearched(true);
    try {
      const params = new URLSearchParams();
      const kw = overrides.keywords ?? finderKeyword;
      if (kw)               params.set("keywords",       kw);
      if (finderBuyer)      params.set("buyer_name",     finderBuyer);
      if (finderSmeOnly)    params.set("sme_only",       "true");
      if (finderWinner)     params.set("winner",         finderWinner);
      if (finderCpv)        params.set("cpv_code",       finderCpv);
      if (finderProcedure)  params.set("procedure_type", finderProcedure);
      if (finderFrom)       params.set("published_from", finderFrom);
      if (finderTo)         params.set("published_to",   finderTo);
      if (finderRegions.length) params.set("regions",   finderRegions.join(","));
      params.set("source",    overrides.source    ?? finderSource);
      params.set("sort",      overrides.sort      ?? finderSort);
      params.set("page",      String(overrides.page ?? finderPage));
      params.set("page_size", String(finderPageSize));
      // status tab
      const tab = overrides.statusTab ?? finderStatusTab;
      if (tab && tab !== "all") params.set("statuses", tab);

      const data = await saasApiRequest("GET", `${API}/finder/search?${params.toString()}`);
      setFinderResponse(data);
    } catch (err: any) { showToast("Search failed: " + err.message); }
    setSearching(false);
  };

  const loadBuyerIntel = async (buyerName: string) => {
    if (buyerIntelName === buyerName && buyerIntel) return;
    setBuyerIntelLoading(true);
    setBuyerIntelName(buyerName);
    setBuyerIntel(null);
    try {
      const data = await saasApiRequest("GET", `${API}/finder/buyer-intel?buyer=${encodeURIComponent(buyerName)}`);
      setBuyerIntel(data);
    } catch { setBuyerIntel(null); }
    setBuyerIntelLoading(false);
  };

  const exportFinderCsv = () => {
    const results: any[] = finderResponse?.results || [];
    if (!results.length) { showToast("No results to export"); return; }
    const headers = ["Title","Buyer","Value","Published","Deadline","Status","Source","Region","Category","URL","Match Score"];
    const rows = results.map(t => [
      `"${(t.title||"").replace(/"/g,'""')}"`,
      `"${(t.buyer||"").replace(/"/g,'""')}"`,
      t.value != null ? t.value : "",
      t.published_date || "",
      t.deadline || "",
      t.status || "",
      t.source_label || t.source || "",
      t.region || "",
      `"${(t.category||"").replace(/"/g,'""')}"`,
      t.url || "",
      t.match_score ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "tender-finder-results.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const addTenderFromSearch = async (t: any) => {
    try {
      await saasApiRequest("POST", `${API}/tenders`, {
        title: t.title,
        buyer: t.buyer,
        category: t.category || t.source || "Other",
        deadline: t.deadline,
        status: "Researching",
        value_amount: t.value_amount || null,
        value_text: t.value_text || t.value || null,
        portal: t.source || null,
        source_url: t.source_url || null,
        country,
      });
      const updated = await saasApiRequest("GET", `${API}/tenders?country=${country}`);
      setTenders(updated);
      showToast(`${t.title} added to pipeline`);
      setActiveTab("tenders");
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const loadIttDetails = async (tenderId: number) => {
    try {
      const data = await saasApiRequest("GET", `${API}/tenders/${tenderId}/itt-details`);
      if (data) {
        setIttDetails(data);
        setIttForm({
          deadline_eoi: data.deadline_eoi || "",
          clarification_deadline: data.clarification_deadline || "",
          clarification_answers_date: data.clarification_answers_date || "",
          site_visit_date: data.site_visit_date || "",
          submission_portal: data.submission_portal || "",
          portal_url: data.portal_url || "",
          portal_login: data.portal_login || "",
          lot_structure: data.lot_structure || "",
          bid_bond_required: data.bid_bond_required || false,
          bid_bond_amount: data.bid_bond_amount || "",
          bid_bond_details: data.bid_bond_details || "",
          itt_notes: data.itt_notes || "",
        });
        setIttContacts(Array.isArray(data.named_contacts) ? data.named_contacts : []);
      } else {
        setIttDetails(null);
        setIttForm({});
        setIttContacts([]);
      }
    } catch { setIttDetails(null); }
  };

  const saveIttDetails = async (tenderId: number) => {
    setSavingItt(true);
    try {
      const saved = await saasApiRequest("PATCH", `${API}/tenders/${tenderId}/itt-details`, { ...ittForm, named_contacts: ittContacts });
      setIttDetails(saved);
      showToast("ITT details saved");
    } catch { showToast("Failed to save ITT details"); }
    setSavingItt(false);
  };

  const selectTender = async (t: any) => {
    setSelectedTender(t);
    setActiveTab("tender-detail");
    setPackDocs([]); setExtractedFacts([]); setShowIttPanel(false);
    const q = `?country=${country}`;
    const [docs, secs, reqs] = await Promise.all([
      saasApiRequest("GET", `${API}/documents/${t.id}${q}`),
      saasApiRequest("GET", `${API}/bid-sections/${t.id}${q}`),
      saasApiRequest("GET", `${API}/requirements/${t.id}${q}`),
    ]);
    setTenderDocs(docs); setTenderSections(secs); setTenderRequirements(reqs);
    loadComplianceMatrix(t.id);
    loadIttDetails(t.id);
    // Load Phase 2 pack docs + facts
    setPackDocsLoading(true);
    try {
      const [pd, facts] = await Promise.all([
        saasApiRequest("GET", `${API}/tenders/${t.id}/documents`),
        saasApiRequest("GET", `${API}/tenders/${t.id}/facts`),
      ]);
      setPackDocs(Array.isArray(pd) ? pd : []);
      setExtractedFacts(Array.isArray(facts) ? facts : []);
    } catch {}
    setPackDocsLoading(false);
  };

  const refreshPackDocs = async (tenderId: number) => {
    try {
      const [pd, facts] = await Promise.all([
        saasApiRequest("GET", `${API}/tenders/${tenderId}/documents`),
        saasApiRequest("GET", `${API}/tenders/${tenderId}/facts`),
      ]);
      setPackDocs(Array.isArray(pd) ? pd : []);
      setExtractedFacts(Array.isArray(facts) ? facts : []);
    } catch {}
  };

  const uploadTenderPack = async (files: FileList, tenderId: number) => {
    if (!files || files.length === 0) return;
    setUploadingFiles(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append("files", f));
      const token = localStorage.getItem("saas_tender_token");
      const res = await fetch(`${API}/tenders/${tenderId}/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const result = await res.json();
      if (result.uploaded?.length > 0) {
        showToast(`${result.uploaded.length} file(s) uploaded. Extraction in progress...`);
      }
      if (result.failed?.length > 0) {
        showToast(`${result.failed.length} file(s) skipped (unsupported format).`);
      }
      await refreshPackDocs(tenderId);
    } catch (err: any) {
      showToast("Upload failed: " + err.message);
    }
    setUploadingFiles(false);
  };

  const publishTender = async (tenderId: number) => {
    setPublishing(true);
    try {
      await saasApiRequest("POST", `${API}/${tenderId}/publish`, {});
      showToast("Tender published");
      const t = await saasApiRequest("GET", `${API}/tenders?country=${country}`);
      setTenders(t);
      if (selectedTender?.id === tenderId) {
        const refreshed = t.find((x: any) => x.id === tenderId);
        if (refreshed) setSelectedTender(refreshed);
      }
    } catch (err: any) {
      showToast(err.message || "Publish failed");
    }
    setPublishing(false);
  };

  const saveTender = async () => {
    try {
      if (editingTender) {
        await saasApiRequest("PATCH", `${API}/tenders/${editingTender.id}`, { ...tenderForm, country });
        showToast("Tender updated");
      } else {
        await saasApiRequest("POST", `${API}/tenders`, { ...tenderForm, country });
        showToast("Tender created");
      }
      setShowTenderForm(false); setEditingTender(null); setTenderForm({});
      const t = await saasApiRequest("GET", `${API}/tenders?country=${country}`);
      setTenders(t);
    } catch (err: any) { showToast(err.message); }
  };

  const deleteTender = async (id: number) => {
    if (!confirm("Delete this tender?")) return;
    await saasApiRequest("DELETE", `${API}/tenders/${id}`);
    const t = await saasApiRequest("GET", `${API}/tenders?country=${country}`);
    setTenders(t);
    if (selectedTender?.id === id) { setSelectedTender(null); setActiveTab("tenders"); }
    showToast("Tender deleted");
  };

  const toggleNotRelevant = async (tenderId: number) => {
    setTogglingNotRelevant(tenderId);
    try {
      const isNR = notRelevantIds.has(tenderId);
      if (isNR) {
        await saasApiRequest("DELETE", `${API}/tenders/${tenderId}/not-relevant`);
        setNotRelevantIds(prev => { const next = new Set(prev); next.delete(tenderId); return next; });
        showToast("Restored to pipeline");
      } else {
        await saasApiRequest("POST", `${API}/tenders/${tenderId}/not-relevant`, {});
        setNotRelevantIds(prev => new Set([...prev, tenderId]));
        showToast("Marked as not relevant — hidden from list");
      }
    } catch { showToast("Could not update"); }
    setTogglingNotRelevant(null);
  };

  const handleQuickAdd = async () => {
    setQuickAddLoading(true);
    setQuickAddResult(null);
    try {
      const payload = quickAddTab === "url"
        ? { mode: "url", url: quickAddUrl, country }
        : { mode: "manual", ...quickAddForm, country };
      const result = await saasApiRequest("POST", `${API}/tenders/quick-add`, payload);
      setQuickAddResult(result);
      showToast(`Tender added: "${result.tender?.title}" (score: ${result.score ?? "—"})`);
      const updated = await saasApiRequest("GET", `${API}/tenders?country=${country}`);
      setTenders(updated);
      // Reset form but keep modal open to show result
      setQuickAddUrl("");
      setQuickAddForm({});
    } catch (err: any) {
      showToast("Quick-add failed: " + err.message);
    }
    setQuickAddLoading(false);
  };

  const generateSection = async (sectionKey: string, sectionLabel: string) => {
    if (!selectedTender) return;
    setGenerating(sectionKey);
    try {
      await saasApiRequest("POST", `${API}/bid-sections/generate`, { tender_id: selectedTender.id, section_key: sectionKey, section_label: sectionLabel });
      const secs = await saasApiRequest("GET", `${API}/bid-sections/${selectedTender.id}`);
      setTenderSections(secs);
      showToast(`${sectionLabel} generated`);
    } catch (err: any) { showToast(err.message); }
    setGenerating(null);
  };

  const improveSection = async (section: any) => {
    if (!section?.content) return;
    setImprovingSection(section.id);
    try {
      const data = await saasApiRequest("POST", `${API}/bid-sections/${section.id}/improve`, {
        content: section.content,
        tender_title: selectedTender?.title,
        tender_buyer: selectedTender?.buyer,
        section_label: section.section_label,
      });
      const secs = await saasApiRequest("GET", `${API}/bid-sections/${selectedTender?.id}`);
      setTenderSections(secs);
      showToast(`${section.section_label} improved`);
    } catch (err: any) { showToast(err.message); }
    setImprovingSection(null);
  };

  const scoreBid = async () => {
    if (!selectedTender) return;
    setScoringBid(true);
    try {
      const data = await saasApiRequest("POST", `${API}/bid-sections/score`, {
        tender_id: selectedTender.id,
        tender_title: selectedTender.title,
        tender_buyer: selectedTender.buyer,
        tender_criteria: selectedTender.scoring_criteria || tenderDetailsInput,
      });
      setBidScoreResult(data);
      setShowBidScoreModal(true);
    } catch (err: any) { showToast(err.message); }
    setScoringBid(false);
  };

  const answerQuestions = async () => {
    if (!questionsInput.trim()) return;
    setAnsweringQuestions(true);
    setQuestionsAnswer("");
    try {
      const data = await saasApiRequest("POST", `${API}/bid-sections/answer-questions`, {
        questions: questionsInput,
        tender_title: selectedTender?.title,
        tender_buyer: selectedTender?.buyer,
        tender_value: selectedTender?.value_text,
        tender_id: selectedTender?.id,
      });
      setQuestionsAnswer(data.content || "");
    } catch (err: any) { showToast(err.message); }
    setAnsweringQuestions(false);
  };

  const extractRequirements = async () => {
    if (!selectedTender) return;
    setExtractingReqs(true);
    try {
      const data = await saasApiRequest("POST", `${API}/requirements/${selectedTender.id}/extract`, {});
      setTenderRequirements(data.requirements || []);
      showToast(`${(data.requirements || []).length} requirements extracted`);
    } catch (err: any) { showToast(err.message); }
    setExtractingReqs(false);
  };

  const toggleRequirement = async (id: number) => {
    await saasApiRequest("PATCH", `${API}/requirements/${id}/toggle`, {});
    const reqs = await saasApiRequest("GET", `${API}/requirements/${selectedTender.id}`);
    setTenderRequirements(reqs);
  };

  const loadComplianceMatrix = async (tenderId: number) => {
    try {
      const [rows, summary] = await Promise.all([
        saasApiRequest("GET", `${API}/compliance-matrix/${tenderId}`),
        saasApiRequest("GET", `${API}/compliance-matrix/${tenderId}/summary`),
      ]);
      setComplianceMatrix(Array.isArray(rows) ? rows : []);
      setMatrixSummary(summary || null);
    } catch { setComplianceMatrix([]); setMatrixSummary(null); }
  };

  const rebuildComplianceMatrix = async () => {
    if (!selectedTender) return;
    setRebuildingMatrix(true);
    try {
      const res = await saasApiRequest("POST", `${API}/compliance-matrix/${selectedTender.id}/build`, {});
      await loadComplianceMatrix(selectedTender.id);
      showToast(res?.message || "Compliance matrix rebuilt");
    } catch (err: any) { showToast(err.message); }
    setRebuildingMatrix(false);
  };

  const saveProfile = async () => {
    try {
      const data = await saasApiRequest("PATCH", `${API}/company-profile`, profileForm);
      setProfile(data);
      setShowProfileEdit(false);
      showToast("Profile saved");
    } catch (err: any) { showToast(err.message); }
  };

  const saveSearchConfig = async () => {
    try {
      const payload = {
        keywords: configForm.keywords.split(",").map((k: string) => k.trim()).filter(Boolean),
        categories: configForm.categories.split(",").map((c: string) => c.trim()).filter(Boolean),
        countries: configForm.countries.split(",").map((c: string) => c.trim()).filter(Boolean),
        digest_email: configForm.digest_email,
        digest_enabled: configForm.digest_enabled,
        country,
      };
      const data = await saasApiRequest("PATCH", `${API}/search-config`, payload);
      setSearchConfig(data);
      setShowConfigEdit(false);
      showToast("Search settings saved");
      await handleSearch();
    } catch (err: any) { showToast(err.message); }
  };

  const scanIntelligence = async () => {
    setScanningIntel(true);
    try {
      await saasApiRequest("POST", `${API}/intelligence/scan`, { country });
      const i = await saasApiRequest("GET", `${API}/intelligence?country=${country}`);
      setIntelligence(i);
      showToast("Intelligence updated");
    } catch (err: any) { showToast(err.message); }
    setScanningIntel(false);
  };

  const askAdvisor = async () => {
    if (!aiQuestion.trim()) return;
    setAskingAi(true);
    try {
      const data = await saasApiRequest("POST", `${API}/ai-advisor`, { question: aiQuestion, country });
      setAiAnswer(data.content);
    } catch (err: any) { setAiAnswer("Error: " + err.message); }
    setAskingAi(false);
  };

  const toggleWatchlist = async (extId: string) => {
    const exists = watchlist.find(w => w.tender_ext_id === extId);
    if (exists) {
      await saasApiRequest("DELETE", `${API}/watchlist/${encodeURIComponent(extId)}`);
    } else {
      await saasApiRequest("POST", `${API}/watchlist`, { tender_ext_id: extId, country });
    }
    const w = await saasApiRequest("GET", `${API}/watchlist?country=${country}`);
    setWatchlist(w);
  };

  const isWatchlisted = (extId: string) => watchlist.some(w => w.tender_ext_id === extId);

  const loadGovernance = async () => {
    setLoadingGovernance(true);
    try {
      const [secs, log] = await Promise.all([
        saasApiRequest("GET", `${API}/governance/all`),
        saasApiRequest("GET", `${API}/governance/log`),
      ]);
      setGovernanceSections(secs || []);
      setGovernanceLog(log || []);
    } catch (err: any) { showToast(err.message); }
    setLoadingGovernance(false);
  };

  const SUBMIT_CHECKLIST_ITEMS = [
    { key: "specific", label: "Every sentence is specific and evidence-based — no generic filler" },
    { key: "star", label: "STAR format used (Situation, Task, Action, Result) where applicable" },
    { key: "social_value", label: "Social value includes quantitative data (percentages, numbers, named commitments)" },
    { key: "buyer_language", label: "Buyer's own language and evaluation criteria are mirrored throughout" },
    { key: "word_count", label: "Word count is within the required limit (or confirmed no limit applies)" },
    { key: "cefas", label: "CEFAS Africa Regional Support contract referenced as primary evidence where relevant" },
  ];

  const openSubmitModal = (section: any) => {
    setSubmitModalSection(section);
    setSubmitChecklist({});
  };

  const confirmSubmitToGovernance = async () => {
    if (!submitModalSection) return;
    const allChecked = SUBMIT_CHECKLIST_ITEMS.every(item => submitChecklist[item.key]);
    if (!allChecked) { showToast("Please confirm all checklist items before submitting"); return; }
    try {
      await saasApiRequest("POST", `${API}/governance/submit/${submitModalSection.id}`, {});
      await loadGovernance();
      setSubmitModalSection(null);
      setSubmitChecklist({});
      showToast("Section submitted for review — team notified by email");
    } catch (err: any) { showToast(err.message); }
  };

  const openChat = (section: any) => {
    if (chatSection?.id === section.id) {
      setChatSection(null);
      return;
    }
    setChatSection(section);
    setChatHistory([]);
    setChatInput("");
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !chatSection || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newHistory: { role: "user" | "assistant"; content: string }[] = [...chatHistory, { role: "user", content: userMsg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    try {
      const tender = selectedTenderForBid;
      const data: any = await saasApiRequest("POST", `${API}/bid-sections/${chatSection.id}/review-chat`, {
        message: userMsg,
        history: chatHistory,
        tender_title: tender?.title || "",
        tender_buyer: tender?.buyer || "",
        tender_description: tender?.description || "",
        section_label: chatSection.section_label,
        content: chatSection.content || "",
        word_limit: chatSection.word_limit || null,
      });
      const updatedHistory: { role: "user" | "assistant"; content: string }[] = [...newHistory, { role: "assistant", content: data.reply || "" }];
      setChatHistory(updatedHistory);
      // If EP Agent updated the section content, refresh sections
      if (data.updatedContent && tender?.id) {
        const secs = await saasApiRequest("GET", `${API}/bid-sections/${tender.id}`);
        setTenderSections(secs);
        // Update chatSection with fresh content
        const updated = (secs as any[]).find((s: any) => s.id === chatSection.id);
        if (updated) setChatSection(updated);
      }
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const submitToGovernance = async (sectionId: number) => {
    try {
      await saasApiRequest("POST", `${API}/governance/submit/${sectionId}`, {});
      await loadGovernance();
      showToast("Section submitted for review — email sent");
    } catch (err: any) { showToast(err.message); }
  };

  const doGovernanceAction = async (sectionId: number, action: string) => {
    try {
      await saasApiRequest("POST", `${API}/governance/action/${sectionId}`, { action, notes: governanceNotes });
      setGovernanceActionModal(null);
      setGovernanceNotes("");
      await loadGovernance();
      showToast(`Section ${action === "approve" ? "approved" : action === "request_changes" ? "sent for revision" : "rejected"}`);
    } catch (err: any) { showToast(err.message); }
  };

  const loadLearningVault = async () => {
    setLoadingVault(true);
    try {
      const data = await saasApiRequest("GET", `${API}/learning-vault`);
      setLearningVault(data || []);
    } catch (err: any) { showToast(err.message); }
    setLoadingVault(false);
  };

  const saveVaultEntry = async () => {
    try {
      await saasApiRequest("POST", `${API}/learning-vault`, vaultForm);
      await loadLearningVault();
      setShowVaultForm(false);
      setVaultForm({ tender_name: "", reference: "", buyer: "", date: "", outcome: "", our_score: "", winner_score: "", lessons: "", feedback_text: "", what_to_do_differently: "" });
      showToast("Vault entry saved");
    } catch (err: any) { showToast(err.message); }
  };

  const submitOutcome = async () => {
    if (!outcomeModal) return;
    setSubmittingOutcome(true);
    try {
      const data = await saasApiRequest("POST", `${API}/tenders/${outcomeModal.id}/outcome`, outcomeForm);
      const t = await saasApiRequest("GET", `${API}/tenders?country=${country}`);
      setTenders(t);
      await loadLearningVault();
      setOutcomeModal(null);
      setOutcomeForm({ outcome: "", our_score: "", winner_score: "", feedback_text: "", what_to_do_differently: "" });
      showToast(`Outcome saved — ${data.lessons ? "lessons extracted and added to vault" : "vault updated"}`);
    } catch (err: any) { showToast(err.message); }
    setSubmittingOutcome(false);
  };

  const loadAutomationLog = async () => {
    setLoadingAutomation(true);
    try {
      const [log, scores] = await Promise.all([
        saasApiRequest("GET", `${API}/automation/log`),
        saasApiRequest("GET", `${API}/fit-scores`),
      ]);
      setAutomationLog(log || []);
      setFitScores(scores || []);
    } catch (err: any) { showToast(err.message); }
    setLoadingAutomation(false);
  };

  const runAutomationAction = async (action: string) => {
    setRunningAction(action);
    try {
      const result = await saasApiRequest("POST", `${API}/automation/${action}`, { entity: country });
      const msg = result.message || `${action} completed`;
      showToast(msg);
      await loadAutomationLog();
      if (action === "run-discovery") {
        const t = await saasApiRequest("GET", `${API}/tenders?country=${country}`);
        setTenders(t);
      }
    } catch (err: any) { showToast(err.message || `${action} failed`); }
    setRunningAction(null);
  };

  // ── AI usage / cost tracking ───────────────────────────────────────────────
  const loadAiUsage = async () => {
    setLoadingAiUsage(true);
    try {
      const data = await saasApiRequest("GET", `${API}/admin/ai-usage`);
      setAiUsage(data);
      setCeilingInput(data?.ceiling != null ? String(data.ceiling) : "");
    } catch (err: any) { showToast(err.message); }
    setLoadingAiUsage(false);
  };

  const saveAiCeiling = async () => {
    setSavingCeiling(true);
    try {
      const trimmed = ceilingInput.trim();
      await saasApiRequest("PUT", `${API}/admin/ai-ceiling`, { ceiling_usd: trimmed === "" ? null : trimmed });
      showToast(trimmed === "" ? "Monthly cap cleared" : `Monthly cap set to $${trimmed}`);
      await loadAiUsage();
    } catch (err: any) { showToast(err.message || "Failed to update cap"); }
    setSavingCeiling(false);
  };

  const generateAll16Sections = async () => {
    if (!selectedTenderForBid) { showToast("Select a tender first"); return; }
    setGeneratingAll16(true);
    try {
      const data = await saasApiRequest("POST", `${API}/bid-sections/generate-all`, { tender_id: selectedTenderForBid.id });
      showToast(`${data.sections?.length || 16} sections generated`);
      if (selectedTender?.id === selectedTenderForBid.id) {
        const secs = await saasApiRequest("GET", `${API}/bid-sections/${selectedTenderForBid.id}`);
        setTenderSections(secs);
      }
    } catch (err: any) { showToast(err.message); }
    setGeneratingAll16(false);
  };

  // E2: Score confidence of a single bid section
  const scoreConfidence = async (section: any) => {
    setScoringConfidence(section.id);
    try {
      const result = await saasApiRequest("POST", `${API}/bid-sections/${section.id}/score-confidence`, {});
      setTenderSections((prev: any[]) => prev.map((s: any) => s.id === section.id ? { ...s, ...result } : s));
      showToast(`Confidence scored: ${result.overall_confidence}%`);
    } catch (err: any) { showToast(err.message || "Scoring failed"); }
    setScoringConfidence(null);
  };

  // E3: Analyze gaps across all sections for the current tender
  const analyzeGaps = async () => {
    if (!selectedTenderForBid) { showToast("Select a tender first"); return; }
    setAnalyzingGaps(true);
    try {
      const result = await saasApiRequest("POST", `${API}/gaps/analyze`, { tender_id: selectedTenderForBid.id });
      setBidGaps(result.gaps || []);
      setShowGapsPanel(true);
      setDismissedGaps([]);
      showToast(`${result.count || 0} gaps identified`);
    } catch (err: any) { showToast(err.message || "Gap analysis failed"); }
    setAnalyzingGaps(false);
  };

  const dismissGap = async (gapId: number) => {
    try {
      await saasApiRequest("PATCH", `${API}/gaps/${gapId}`, { status: "resolved" });
      setDismissedGaps(prev => [...prev, gapId]);
    } catch {}
  };

  // E4: Open evidence picker for a section
  const openEvidencePicker = async (section: any) => {
    setEvidencePickerSection(section);
    setEvidenceSuggestions([]);
    setAllVaultDocs([]);
    setLoadingEvidence(true);
    try {
      const result = await saasApiRequest("GET", `${API}/bid-sections/${section.id}/evidence-suggestions`);
      setEvidenceSuggestions(result.suggestions || []);
      setAllVaultDocs(result.all_vault || []);
    } catch (err: any) { showToast(err.message || "Could not load evidence"); }
    setLoadingEvidence(false);
  };

  const attachEvidence = async (vaultDocId: number) => {
    if (!evidencePickerSection) return;
    setAttachingEvidence(vaultDocId);
    try {
      await saasApiRequest("POST", `${API}/bid-sections/${evidencePickerSection.id}/attach-evidence`, { vault_doc_id: vaultDocId });
      setEvidenceSuggestions(prev => prev.map(d => d.id === vaultDocId ? { ...d, already_attached: true } : d));
      setAllVaultDocs(prev => prev.map(d => d.id === vaultDocId ? { ...d, already_attached: true } : d));
      const attached = await saasApiRequest("GET", `${API}/bid-sections/${evidencePickerSection.id}/evidence`);
      setSectionAttachedEvidence(prev => ({ ...prev, [evidencePickerSection.id]: attached }));
      showToast("Document attached");
    } catch (err: any) { showToast(err.message || "Attach failed"); }
    setAttachingEvidence(null);
  };

  const removeAttachedEvidence = async (sectionId: number, evidenceId: number) => {
    try {
      await saasApiRequest("DELETE", `${API}/bid-sections/${sectionId}/evidence/${evidenceId}`);
      setSectionAttachedEvidence(prev => ({ ...prev, [sectionId]: (prev[sectionId] || []).filter((e: any) => e.id !== evidenceId) }));
      showToast("Evidence removed");
    } catch {}
  };

  // E5: Learning Loop handlers
  const openLessonModal = (section: any) => {
    setLessonModalSection(section);
    setLessonForm({ lesson_text: "", section_type: section.section_label || "" });
    setShowLessonModal(true);
  };

  const saveLessonFromSection = async () => {
    if (!lessonForm.lesson_text.trim()) { showToast("Please describe the lesson"); return; }
    setSavingLesson(true);
    try {
      await saasApiRequest("POST", `${API}/learning-vault/lesson`, {
        lesson_text: lessonForm.lesson_text,
        tender_id: selectedTenderForBid?.id || lessonModalSection?.tender_id,
        section_id: lessonModalSection?.id,
        section_type: lessonForm.section_type,
        overall_confidence: lessonModalSection?.overall_confidence || 0,
      });
      showToast("Lesson saved — EP Agent will apply it to future bids");
      setShowLessonModal(false);
      setLessonModalSection(null);
      setLessonForm({ lesson_text: "", section_type: "" });
    } catch (err: any) { showToast(err.message || "Save failed"); }
    setSavingLesson(false);
  };

  const loadLessonsVault = async (filter = "all") => {
    setLoadingLessonsVault(true);
    try {
      const data = await saasApiRequest("GET", `${API}/learning-vault/lessons?section_type=${filter}`);
      setLessonsVaultData(Array.isArray(data) ? data : []);
    } catch {}
    setLoadingLessonsVault(false);
  };

  const saveEditedLesson = async (id: number) => {
    try {
      await saasApiRequest("PATCH", `${API}/learning-vault/lessons/${id}`, { lessons: editingLessonText });
      setLessonsVaultData(prev => prev.map(l => l.id === id ? { ...l, lessons: editingLessonText } : l));
      setEditingLessonId(null);
      showToast("Lesson updated");
    } catch (err: any) { showToast(err.message || "Update failed"); }
  };

  const deleteLesson = async (id: number) => {
    try {
      await saasApiRequest("DELETE", `${API}/learning-vault/lessons/${id}`);
      setLessonsVaultData(prev => prev.filter(l => l.id !== id));
      showToast("Lesson removed");
    } catch (err: any) { showToast(err.message || "Delete failed"); }
  };

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "bid-writer", label: "Bid Writer", icon: "✍️" },
    { id: "governance", label: "Bid Governance", icon: "🏛️" },
    { id: "finder", label: "Tender Finder", icon: "🔍" },
    { id: "tenders", label: "All Tenders", icon: "📋" },
    { id: "compliance", label: "Compliance Hub", icon: "🛡️" },
    { id: "bid-security", label: "Bid Security", icon: "🔒" },
    { id: "portals", label: "Portals", icon: "🌐" },
    { id: "intelligence", label: "Intelligence", icon: "📡" },
    { id: "automation", label: "Automation", icon: "🤖" },
    { id: "ai-usage", label: "AI Usage & Cost", icon: "💰" },
    { id: "twinpay", label: "TwinPay Finder", icon: "💱" },
    { id: "contact-verify", label: "Contact Intel", icon: "🎯" },
    { id: "profile", label: "Company Profile", icon: "🏢" },
    { id: "vault", label: "Bid Vault", icon: "📁" },
    { id: "knowledge", label: "Knowledge Base", icon: "📚" },
    { id: "lessons-vault", label: "Lessons Vault", icon: "🧠" },
    { id: "settings", label: "Settings", icon: "⚙️" },
    { id: "team", label: "Team", icon: "👥" },
  ];

  const PORTALS = [
    // UK Government Procurement
    { name: "Find a Tender", url: "https://www.find-tender.service.gov.uk/", region: "UK", desc: "Official UK government tenders portal" },
    { name: "Contracts Finder", url: "https://www.contractsfinder.service.gov.uk/", region: "UK", desc: "UK government contracts register" },
    { name: "Crown Commercial Service", url: "https://www.crowncommercial.gov.uk/", region: "UK", desc: "Public sector procurement framework" },
    { name: "Bid Stats", url: "https://bidstats.uk/", region: "UK", desc: "UK tender statistics and tracking" },
    { name: "Tender Base", url: "https://tenderbase.co.uk/", region: "UK", desc: "UK tender search including CEFAS" },
    { name: "Cabinet Office Supplier Reg", url: "https://supplierregistration.cabinetoffice.gov.uk/", region: "UK", desc: "Central government supplier registration" },
    // UK Government Department Portals
    { name: "Home Office Jaggaer", url: "https://homeoffice.app.jaggaer.com/web/login.html", region: "UK", desc: "Home Office procurement portal" },
    { name: "Education Jaggaer", url: "https://education.app.jaggaer.com/web/login.html", region: "UK", desc: "Education sector procurement portal" },
    { name: "LUPC Bravo", url: "https://lupc.bravosolution.co.uk/web/login.shtml", region: "UK", desc: "London Universities Purchasing Consortium" },
    { name: "In-Tend", url: "https://in-tendhost.co.uk/", region: "UK", desc: "UK procurement solutions platform" },
    { name: "Arts Council Funding", url: "https://www.artscouncil.org.uk/funding", region: "UK", desc: "Arts Council England funding opportunities" },
    { name: "Council of Europe eProcurement", url: "https://eproc.coe.int/home", region: "International", desc: "Council of Europe procurement" },
    { name: "Scanmarket eSourcing", url: "https://esourcing.scanmarket.com/", region: "UK", desc: "eSourcing platform" },
    // UK Sector Portals
    { name: "YPO", url: "https://www.ypo.co.uk/", region: "UK", desc: "Education & public sector procurement" },
    { name: "Delta eSourcing", url: "https://www.delta-esourcing.com/", region: "UK", desc: "UK public sector e-sourcing" },
    { name: "Proactis", url: "https://proactis.com/", region: "UK", desc: "Supplier management platform" },
    { name: "Hospitality Tenders", url: "https://www.hospitalitytenders.co.uk/", region: "UK", desc: "Hospitality sector tender alerts" },
    { name: "Tenderlink Newcastle", url: "https://portal.tenderlink.com/newcastle/", region: "UK", desc: "Newcastle & regional tenders" },
    { name: "Atamis", url: "https://atamis-1928.my.site.com/s/Welcome", region: "UK", desc: "Procurement analytics platform" },
    { name: "Panacea Software", url: "https://app.panacea-software.com/growth", region: "UK", desc: "Business growth platform" },
    // British Council & Education
    { name: "British Council Arts", url: "https://britishcouncilarts.grantplatform.com/", region: "UK", desc: "British Council arts grants and funding" },
    { name: "British Council Alumni", url: "https://alumniuk.britishcouncil.org", region: "UK", desc: "British Council UK alumni network" },
    { name: "British Council HE & Science", url: "https://www.britishcouncil.org/education/he-science", region: "UK", desc: "Higher education and science programmes" },
    { name: "Learning & Work Institute", url: "https://learningandwork.org.uk/about-us/", region: "UK", desc: "Education and employment research" },
    { name: "Wonkhe", url: "https://wonkhe.com", region: "UK", desc: "Higher education policy and analysis" },
    { name: "The PIE News", url: "https://thepienews.com", region: "UK", desc: "International education news" },
    { name: "UCISA", url: "https://www.ucisa.ac.uk", region: "UK", desc: "Universities IT association" },
    { name: "Open UK", url: "https://www.open-uk.org/", region: "UK", desc: "Open technology community" },
    // University Networks
    { name: "Oxford Alumni", url: "https://www.alumni.ox.ac.uk", region: "UK", desc: "University of Oxford alumni" },
    { name: "Ashesi University", url: "https://www.ashesi.edu.gh", region: "Ghana", desc: "Ashesi University, Ghana" },
    { name: "University of Ghana", url: "https://www.ug.edu.gh/", region: "Ghana", desc: "University of Ghana" },
    { name: "University of Lagos", url: "https://unilag.edu.ng", region: "Nigeria", desc: "University of Lagos" },
    { name: "Covenant University", url: "https://covenantuniversity.edu.ng", region: "Nigeria", desc: "Covenant University, Nigeria" },
    // International & Africa
    { name: "UNGM", url: "https://www.ungm.org/", region: "International", desc: "United Nations procurement system" },
    { name: "UNDP Procurement", url: "https://procurement-notices.undp.org/", region: "International", desc: "UNDP tender opportunities" },
    { name: "World Bank Procurement", url: "https://www.worldbank.org/en/projects-operations/products-and-services/procurement-projects-programs", region: "International", desc: "World Bank project procurement" },
    { name: "Nigeria BPP", url: "https://www.bpp.gov.ng/", region: "Nigeria", desc: "Nigeria public procurement portal" },
    { name: "NGTenders", url: "https://www.tenders.ng/", region: "Nigeria", desc: "Nigeria tender aggregator" },
    { name: "Tenders on Time Nigeria", url: "https://www.tendersontime.com/nigeria-tenders/", region: "Nigeria", desc: "Nigeria & oil/gas tenders" },
    { name: "OCP Nigeria", url: "https://ocpnigeria.org/", region: "Nigeria", desc: "Open Contracting Partnership Nigeria" },
    { name: "D&B Business Directory", url: "https://www.dnb.com/", region: "International", desc: "Dun & Bradstreet business directory" },
    // Payments & Fintech
    { name: "Verto FX", url: "https://www.vertofx.com/", region: "International", desc: "Cross-border payments and FX" },
    // Events & Freelance
    { name: "Eventbrite", url: "https://www.eventbrite.com/", region: "International", desc: "Event ticketing and management" },
    { name: "Add to Event", url: "https://addtoevent.co.uk/", region: "UK", desc: "UK event supplier marketplace" },
    { name: "Upwork", url: "https://www.upwork.com/", region: "International", desc: "Freelance marketplace" },
    { name: "PeoplePerHour", url: "https://www.peopleperhour.com/", region: "International", desc: "Freelance services marketplace" },
    { name: "ClickUp", url: "https://clickup.com/", region: "International", desc: "Project management platform" },
  ];

  // btn/input/card/label are imported from components/tender/ui.ts

  if (loading) return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>Loading...</div>;

  const renderDashboard = () => {
    const statusCounts: Record<string, { count: number; value: number }> = {};
    TENDER_STATUSES.forEach(s => statusCounts[s] = { count: 0, value: 0 });
    (stats?.tendersByStatus || []).forEach((r: any) => { if (statusCounts[r.status]) { statusCounts[r.status] = { count: r.count, value: r.total_value }; } });
    // Derive headline counters from the SAME loaded `tenders` dataset that renders
    // the table, so the counters and the list always agree. (Previously these came
    // from a separate stats endpoint and could show 0 while the table was full.)
    const totalTenders = tenders.length;
    const totalValue = tenders.reduce((s: number, t: any) => s + (Number(t.value) || 0), 0);

    const urgencyConfig: Record<string, { color: string; bg: string; border: string; label: string; icon: string }> = {
      critical: { color: "#fff", bg: "rgba(239,68,68,0.18)", border: "#ef4444", label: "CRITICAL", icon: "🚨" },
      high:     { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "#f59e0b", label: "HIGH", icon: "🔴" },
      medium:   { color: "#60a5fa", bg: "rgba(96,165,250,0.10)", border: "#3b82f6", label: "MONITOR", icon: "🔵" },
      low:      { color: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "#475569", label: "LOW", icon: "⚪" },
    };

    const dismissActionItem = async (id: number) => {
      try {
        await saasApiRequest("PATCH", `${API}/action-items/${id}`, { status: "dismissed" });
        setActionItems(prev => prev.filter(a => a.id !== id));
      } catch {}
    };

    const daysUntil = (deadline: string | null) => {
      if (!deadline) return null;
      const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return diff;
    };

    return (
      <div style={{ display: "grid", gap: 20 }}>

        {/* EP Action Board */}
        {actionItems.length > 0 && (
          <div style={{ background: "rgba(15,10,25,0.95)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 14, padding: 20, boxShadow: "0 0 30px rgba(239,68,68,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>EP Action Board</div>
                  <div style={{ color: "#94a3b8", fontSize: 11 }}>{actionItems.length} item{actionItems.length !== 1 ? "s" : ""} requiring attention</div>
                </div>
              </div>
              {actionItems.some(a => a.urgency === "critical") && (
                <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 99, letterSpacing: 1, animation: "pulse 2s infinite" }}>URGENT ACTION REQUIRED</span>
              )}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {actionItems.map((item: any) => {
                const cfg = urgencyConfig[item.urgency] || urgencyConfig.medium;
                const days = daysUntil(item.deadline);
                return (
                  <div key={item.id} style={{ background: cfg.bg, border: `1px solid ${cfg.border}40`, borderLeft: `4px solid ${cfg.border}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{item.title}</span>
                        <span style={{ background: `${cfg.border}30`, color: cfg.color, fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 99, letterSpacing: 1, textTransform: "uppercase" as const }}>{cfg.label}</span>
                        {days !== null && (
                          <span style={{ background: days <= 7 ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)", color: days <= 7 ? "#f87171" : "#94a3b8", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
                            {days <= 0 ? "OVERDUE" : days === 1 ? "1 DAY LEFT" : `${days} DAYS`}
                          </span>
                        )}
                        {item.source && <span style={{ color: "#64748b", fontSize: 10 }}>{item.source}</span>}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>{item.description}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                        {item.action_url && (
                          <a href={item.action_url} target="_blank" rel="noopener noreferrer" style={{ background: cfg.border, color: "#fff", padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, textDecoration: "none", display: "inline-block" }}>
                            {item.action_label || "Take Action →"}
                          </a>
                        )}
                        <button onClick={() => dismissActionItem(item.id)} style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer" }}>
                          Mark Done ✓
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Total Tenders", value: totalTenders, color: BLUE },
            { label: "Pipeline Value", value: `£${fmtMoney(totalValue)}`, color: GOLD },
            { label: "Watchlist", value: watchlist.length, color: PURPLE },
            { label: "New Intel", value: stats?.newIntelligence || 0, color: "#10b981" },
          ].map((s, i) => (
            <div key={i} style={{ ...card(), textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ ...card() }}>
          <h3 style={{ color: "#fff", margin: "0 0 12px", fontSize: 15 }}>Pipeline</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
            {TENDER_STATUSES.map(s => (
              <div key={s} style={{ textAlign: "center", padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s === "Won" ? "#10b981" : s === "Lost" ? "#ef4444" : "#fff" }}>{statusCounts[s].count}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{s}</div>
                {user?.access_level === "full" && statusCounts[s].value > 0 && <div style={{ fontSize: 10, color: GOLD, marginTop: 2 }}>£{fmtMoney(statusCounts[s].value)}</div>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ ...card() }}>
            <h3 style={{ color: "#fff", margin: "0 0 12px", fontSize: 15 }}>Active Tenders</h3>
            {tenders.slice(0, 6).map(t => (
              <div key={t.id} onClick={() => selectTender(t)} style={{ padding: "8px 0", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{t.buyer} · {fmtDate(t.deadline)}</div>
                </div>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: t.status === "Won" ? "rgba(16,185,129,0.2)" : t.status === "Lost" ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)", color: t.status === "Won" ? "#10b981" : t.status === "Lost" ? "#ef4444" : "#60a5fa", fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}>{t.status || "Active"}</span>
              </div>
            ))}
            {tenders.length === 0 && (
              <div style={{ color: "#475569", fontSize: 13 }}>
                <div style={{ marginBottom: 8 }}>No tenders in pipeline yet.</div>
                <button onClick={() => setActiveTab("finder")} style={{ ...btn(BLUE), fontSize: 12, padding: "6px 14px" }}>🔍 Search for Tenders</button>
              </div>
            )}
            {tenders.length > 6 && (
              <button onClick={() => setActiveTab("tenders")} style={{ ...btn("transparent"), color: BLUE, fontSize: 11, marginTop: 8, padding: "4px 0" }}>View all {tenders.length} tenders →</button>
            )}
          </div>
          <div style={{ ...card() }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ color: "#fff", margin: 0, fontSize: 15 }}>Intelligence Feed</h3>
              <button onClick={scanIntelligence} disabled={scanningIntel} style={{ ...btn("transparent"), color: BLUE, fontSize: 11, padding: "4px 8px" }}>{scanningIntel ? "Scanning..." : "Refresh"}</button>
            </div>
            {intelligence.slice(0, 5).map(item => (
              <div key={item.id} style={{ padding: "6px 0", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>{item.title}</div>
                <div style={{ color: "#94a3b8", fontSize: 10 }}>{item.source} · {item.country}</div>
              </div>
            ))}
            {intelligence.length === 0 && <div style={{ color: "#475569", fontSize: 13 }}>Click Refresh to generate intelligence feed.</div>}
          </div>
        </div>

        {/* EP Opportunity Intelligence Panel */}
        <div style={{ ...card(), borderTop: `3px solid ${GOLD}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ color: "#fff", margin: 0, fontSize: 16 }}>⚡ EP Opportunity Intelligence</h3>
              <p style={{ color: "#94a3b8", fontSize: 12, margin: "4px 0 0" }}>
                Auto-generated tender matches based on Event Perfekt's capabilities — {country === "NG" ? "Nigeria" : "UK"} market
              </p>
            </div>
            <button
              onClick={loadOpportunities}
              disabled={loadingOpportunities}
              style={{ ...btn(GOLD + "22"), color: GOLD, border: `1px solid ${GOLD}44`, fontSize: 12, padding: "7px 16px", fontWeight: 700 }}
            >
              {loadingOpportunities ? "Generating…" : "↻ Regenerate"}
            </button>
          </div>

          {loadingOpportunities && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", color: "#94a3b8" }}>
              <div style={{ width: 18, height: 18, border: `2px solid ${GOLD}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              EP Agent is analysing market opportunities…
            </div>
          )}

          {opportunitiesError && !loadingOpportunities && (
            <div style={{ color: "#f87171", fontSize: 13, padding: "12px 0" }}>
              ⚠ {opportunitiesError} — <button onClick={loadOpportunities} style={{ background: "none", border: "none", color: BLUE, cursor: "pointer", fontSize: 13 }}>retry</button>
            </div>
          )}

          {!loadingOpportunities && !opportunitiesError && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
              {opportunities.map((opp: any, i: number) => {
                const urgencyColor = opp.urgency === "high" ? "#ef4444" : opp.urgency === "medium" ? GOLD : "#10b981";
                const score = opp.match_score ?? 0;
                const scoreColor = score >= 90 ? "#10b981" : score >= 80 ? GOLD : "#60a5fa";
                return (
                  <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>{opp.title}</div>
                        <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>{opp.buyer}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: scoreColor }}>{score}%</span>
                        <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>Match</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: urgencyColor + "22", color: urgencyColor, fontWeight: 700, border: `1px solid ${urgencyColor}44`, textTransform: "uppercase" }}>{opp.urgency} priority</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: `1px solid ${BORDER}` }}>{opp.sector}</span>
                      {opp.value_range && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: `${GOLD}11`, color: GOLD, border: `1px solid ${GOLD}33` }}>{opp.value_range}</span>}
                      {opp.deadline_hint && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(255,255,255,0.04)", color: "#64748b" }}>⏱ {opp.deadline_hint}</span>}
                    </div>
                    {Array.isArray(opp.match_reasons) && opp.match_reasons.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {opp.match_reasons.map((r: string, ri: number) => (
                          <div key={ri} style={{ fontSize: 11, color: "#cbd5e1", display: "flex", gap: 6, alignItems: "flex-start" }}>
                            <span style={{ color: "#10b981", marginTop: 1, flexShrink: 0 }}>✓</span>
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button
                        onClick={() => {
                          setFinderKeyword(opp.search_query || opp.title?.split(" ").slice(0, 3).join(" ") || "");
                          setActiveTab("finder");
                          setTimeout(() => handleFinderSearch({ keywords: opp.search_query || "" }), 100);
                        }}
                        style={{ ...btn(BLUE), fontSize: 11, padding: "6px 14px", flex: 1, fontWeight: 700 }}
                      >
                        🔍 Find Tenders
                      </button>
                      <button
                        onClick={() => {
                          setTenderForm({ title: opp.title, buyer: opp.buyer, category: opp.sector, status: "Researching", country });
                          setShowTenderForm(true);
                        }}
                        style={{ ...btn("rgba(255,255,255,0.06)"), color: "#94a3b8", fontSize: 11, padding: "6px 12px" }}
                      >
                        + Track
                      </button>
                    </div>
                  </div>
                );
              })}
              {opportunities.length === 0 && !loadingOpportunities && (
                <div style={{ color: "#475569", fontSize: 13, gridColumn: "1 / -1", padding: "20px 0", textAlign: "center" }}>
                  Click <strong style={{ color: GOLD }}>Regenerate</strong> to load EP opportunity suggestions.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFinder = () => {
    const UK_REGIONS = [
      { code: "UKC", name: "North East" }, { code: "UKD", name: "North West" },
      { code: "UKE", name: "Yorkshire & Humber" }, { code: "UKF", name: "East Midlands" },
      { code: "UKG", name: "West Midlands" }, { code: "UKH", name: "East of England" },
      { code: "UKI", name: "London" }, { code: "UKJ", name: "South East" },
      { code: "UKK", name: "South West" }, { code: "UKL", name: "Wales" },
      { code: "UKM", name: "Scotland" }, { code: "UKN", name: "Northern Ireland" },
    ];
    const STATUS_TABS = [
      { id: "all",       label: "All" },
      { id: "open",      label: "Open" },
      { id: "awarded",   label: "Awarded" },
      { id: "closed",    label: "Closed" },
      { id: "planned",   label: "Planned" },
      { id: "cancelled", label: "Cancelled" },
    ];
    const SORT_OPTIONS = [
      { value: "best_match",    label: "Best Match" },
      { value: "newest",        label: "Newest First" },
      { value: "oldest",        label: "Oldest First" },
      { value: "deadline_asc",  label: "Deadline Soonest" },
      { value: "deadline_desc", label: "Deadline Latest" },
      { value: "value_desc",    label: "Value Highest" },
      { value: "value_asc",     label: "Value Lowest" },
    ];
    const statusCounts = finderResponse?.status_counts || {};
    const stats        = finderResponse?.stats        || {};
    const pagination   = finderResponse?.pagination   || {};
    const results: any[] = finderResponse?.results    || [];
    const warnings: string[] = finderResponse?.warnings || [];
    const ftsEnabled = finderResponse?.sources?.fts_enabled;

    const statusColor = (s: string) => {
      switch (s) {
        case "open":      return { bg: "rgba(16,185,129,0.15)", color: "#10b981", border: "rgba(16,185,129,0.3)" };
        case "awarded":   return { bg: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "rgba(59,130,246,0.3)" };
        case "closed":    return { bg: "rgba(148,163,184,0.15)", color: "#94a3b8", border: "rgba(148,163,184,0.3)" };
        case "planned":   return { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "rgba(245,158,11,0.3)" };
        case "cancelled": return { bg: "rgba(239,68,68,0.15)", color: "#f87171", border: "rgba(239,68,68,0.3)" };
        default:          return { bg: "rgba(255,255,255,0.08)", color: "#94a3b8", border: BORDER };
      }
    };

    const tierColor = (tier: string) => {
      switch (tier) {
        case "excellent": return { bg: "rgba(16,185,129,0.2)", color: "#10b981" };
        case "strong":    return { bg: "rgba(34,197,94,0.15)",  color: "#4ade80" };
        case "good":      return { bg: "rgba(234,179,8,0.15)",  color: "#facc15" };
        case "possible":  return { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" };
        default:          return { bg: "rgba(148,163,184,0.1)", color: "#64748b" };
      }
    };

    const isClosingSoon = (deadline: string | null) => {
      if (!deadline) return false;
      return (new Date(deadline).getTime() - Date.now()) < 7 * 86400 * 1000;
    };

    const runSearch = (overrides = {}) => {
      setFinderPage(1);
      handleFinderSearch({ page: 1, ...overrides });
    };

    return (
      <div style={{ display: "grid", gap: 14 }}>
        {/* ── Search bar ── */}
        <div style={{ ...card(), padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              value={finderKeyword}
              onChange={e => setFinderKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runSearch()}
              style={{ ...input(), flex: 1, fontSize: 15, padding: "10px 14px" }}
              placeholder="Search tenders — e.g. event management, FCDO, Africa programme..."
            />
            <button onClick={() => setFinderShowFilters(v => !v)} style={{ ...btn("rgba(255,255,255,0.08)"), padding: "10px 16px", whiteSpace: "nowrap" }}>
              ⚙️ Filters {finderShowFilters ? "▲" : "▼"}
            </button>
            <button onClick={() => runSearch()} disabled={searching} style={{ ...btn(BLUE), padding: "10px 20px", fontWeight: 700, whiteSpace: "nowrap" }}>
              {searching ? "Searching…" : "🔍 Search"}
            </button>
            <button
              onClick={refreshFinder}
              disabled={finderRefreshing || searching}
              style={{
                background: "transparent", color: "#cbd5e1",
                border: `1px solid ${BORDER}`, borderRadius: 8,
                padding: "10px 14px", cursor: "pointer",
                fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                opacity: finderRefreshing ? 0.6 : 1,
              }}
              title="Refresh tenders from live sources"
            >
              {finderRefreshing ? "↻ Refreshing…" : "↻ Refresh"}
            </button>
            {results.length > 0 && (
              <button onClick={exportFinderCsv} style={{ ...btn("rgba(16,185,129,0.15)"), color: "#10b981", padding: "10px 14px", whiteSpace: "nowrap" }}>⬇ CSV</button>
            )}
          </div>

          {/* Advanced filters panel */}
          {finderShowFilters && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}`, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              <div>
                <label style={label()}>BUYER NAME</label>
                <input value={finderBuyer} onChange={e => setFinderBuyer(e.target.value)} style={input()} placeholder="e.g. FCDO, NHS England…" />
              </div>
              <div>
                <label style={label()}>CPV / SECTOR CODE</label>
                <input value={finderCpv} onChange={e => setFinderCpv(e.target.value)} style={input()} placeholder="e.g. 79952000" />
              </div>
              <div>
                <label style={label()}>PROCEDURE TYPE</label>
                <select value={finderProcedure} onChange={e => setFinderProcedure(e.target.value)} style={input()}>
                  <option value="">Any</option>
                  {["Open","Restricted","Negotiated","Competitive Dialogue","Innovation Partnership"].map(p =>
                    <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={label()}>SOURCE</label>
                <select value={finderSource} onChange={e => setFinderSource(e.target.value)} style={input()}>
                  <option value="both">Both</option>
                  <option value="cf">Contracts Finder only</option>
                  <option value="fts">Find a Tender only</option>
                </select>
              </div>
              <div>
                <label style={label()}>PUBLISHED FROM</label>
                <input type="date" value={finderFrom} onChange={e => setFinderFrom(e.target.value)} style={input()} />
              </div>
              <div>
                <label style={label()}>PUBLISHED TO</label>
                <input type="date" value={finderTo} onChange={e => setFinderTo(e.target.value)} style={input()} />
              </div>
              <div>
                <label style={label()}>WINNER (awarded tab)</label>
                <input value={finderWinner} onChange={e => setFinderWinner(e.target.value)} style={input()} placeholder="Winning supplier name…" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <label style={{ color: "#94a3b8", fontSize: 12, display: "flex", alignItems: "center", gap: 8, padding: "10px 0", cursor: "pointer" }}>
                  <input type="checkbox" checked={finderSmeOnly} onChange={e => setFinderSmeOnly(e.target.checked)} />
                  SME-Suitable Only
                </label>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={label()}>UK REGIONS</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {UK_REGIONS.map(r => (
                    <label key={r.code} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={finderRegions.includes(r.code)}
                        onChange={e => setFinderRegions(prev => e.target.checked ? [...prev, r.code] : prev.filter(x => x !== r.code))}
                      />
                      {r.code} — {r.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Configure-keywords nudge when org has no search config keywords ── */}
        {finderSearched && searchConfig && (!searchConfig.keywords || searchConfig.keywords.length === 0) && (
          <div style={{ background: "rgba(251,191,36,0.10)", border: `1px solid rgba(251,191,36,0.35)`, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ color: GOLD, fontWeight: 600, fontSize: 13 }}>
                Configure keywords to get relevant tenders
              </div>
              <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 2 }}>
                We're currently using your company's sector experience as a fallback. Add specific keywords (e.g. “event management”, “catering”, “venue sourcing”) to sharpen the match.
              </div>
            </div>
            <button
              onClick={() => {
                setConfigForm({
                  keywords: (searchConfig?.keywords || []).join(", "),
                  categories: (searchConfig?.categories || []).join(", "),
                  countries: (searchConfig?.countries || []).join(", "),
                  digest_email: searchConfig?.digest_email || "",
                  digest_enabled: searchConfig?.digest_enabled !== false,
                });
                setShowConfigEdit(true);
              }}
              style={{ ...btn(GOLD), whiteSpace: "nowrap" }}
            >
              Configure keywords
            </button>
          </div>
        )}

        {/* ── FTS banner if no CDP key ── */}
        {finderSearched && !ftsEnabled && finderSource !== "cf" && (
          <div style={{ background: "rgba(59,130,246,0.08)", border: `1px solid rgba(59,130,246,0.25)`, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: BLUE, fontWeight: 600, fontSize: 13 }}>Connect Find a Tender API to access high-value contracts above £139,688</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>Get your free CDP key at find-tender.service.gov.uk — then add it as FIND_A_TENDER_CDP_KEY</div>
            </div>
            <a href="https://www.find-tender.service.gov.uk" target="_blank" rel="noopener noreferrer" style={{ ...btn(BLUE), textDecoration: "none", whiteSpace: "nowrap" }}>Connect Now ↗</a>
          </div>
        )}

        {/* ── Stats bar (DB-backed via /stats, falls back to in-memory search stats) ── */}
        {finderSearched && finderResponse && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { label: "Results Found",  value: (finderDbStats?.total_results ?? pagination.total_results ?? 0), color: "#fff" },
                { label: "Active Tenders", value: (finderDbStats?.active_tenders ?? stats.active ?? 0), color: "#10b981" },
                { label: "Average Value",  value: (finderDbStats?.average_value ?? stats.average_value) != null ? `£${fmtMoney(finderDbStats?.average_value ?? stats.average_value)}` : "—", color: GOLD },
                { label: "Closing Soon",   value: (finderDbStats?.closing_soon ?? stats.closing_soon ?? 0), color: "#f87171" },
              ].map(s => (
                <div key={s.label} style={{ ...card(), padding: "14px 18px", textAlign: "center" }}>
                  <div style={{ color: s.color, fontSize: 22, fontWeight: 800 }}>{s.value}</div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 8, textAlign: "right" }}>
              Last updated: {timeAgo(finderDbStats?.last_updated)}
            </div>
          </div>
        )}

        {/* ── Status tabs (prefer DB status_counts, fall back to in-memory) ── */}
        {finderSearched && finderResponse && (
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${BORDER}`, overflowX: "auto" }}>
            {STATUS_TABS.map(tab => {
              const dbCounts = finderDbStats?.status_counts || {};
              const dbTotal =
                (dbCounts.open || 0) + (dbCounts.awarded || 0) + (dbCounts.closed || 0) +
                (dbCounts.planned || 0) + (dbCounts.cancelled || 0);
              const count = tab.id === "all"
                ? (dbTotal || statusCounts.all || 0)
                : (dbCounts[tab.id] ?? statusCounts[tab.id] ?? 0);
              const active = finderStatusTab === tab.id;
              return (
                <button key={tab.id} onClick={() => {
                  setFinderStatusTab(tab.id);
                  setFinderPage(1);
                  handleFinderSearch({ statusTab: tab.id, page: 1 });
                }} style={{
                  background: "transparent", border: "none", padding: "10px 18px", cursor: "pointer",
                  color: active ? BLUE : "#64748b", fontWeight: active ? 700 : 400, fontSize: 13,
                  borderBottom: active ? `2px solid ${BLUE}` : "2px solid transparent",
                  whiteSpace: "nowrap",
                }}>
                  {tab.label}
                  <span style={{ marginLeft: 6, background: active ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)", color: active ? BLUE : "#475569", padding: "1px 7px", borderRadius: 10, fontSize: 11 }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Results area ── */}
        {finderSearched && (
          <div style={{ ...card(), padding: 0, overflow: "hidden" }}>
            {/* Results header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
                {searching ? "Searching…" : `${pagination.total_results ?? 0} results`}
                {pagination.total_pages > 1 && !searching && (
                  <span style={{ color: "#64748b", fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                    Page {pagination.page} of {pagination.total_pages}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={finderSort} onChange={e => { setFinderSort(e.target.value); runSearch({ sort: e.target.value }); }} style={{ ...input(), padding: "6px 10px", fontSize: 12, width: "auto" }}>
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={String(finderPageSize)} onChange={e => { setFinderPageSize(Number(e.target.value)); runSearch({ page_size: Number(e.target.value) }); }} style={{ ...input(), padding: "6px 10px", fontSize: 12, width: "auto" }}>
                  {[10, 20, 50].map(n => <option key={n} value={n}>{n} per page</option>)}
                </select>
              </div>
            </div>

            {/* Warning banners */}
            {warnings.map((w, i) => (
              <div key={i} style={{ background: "rgba(245,158,11,0.08)", borderBottom: `1px solid rgba(245,158,11,0.2)`, padding: "8px 18px", color: "#f59e0b", fontSize: 12 }}>⚠️ {w}</div>
            ))}

            {/* Result cards */}
            {searching && (
              <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>Searching Contracts Finder and Find a Tender…</div>
            )}
            {!searching && results.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>
                {finderResponse ? "No tenders matched your search. Try different keywords or broaden your filters." : "Run a search above to find tenders."}
              </div>
            )}
            {!searching && results.map((t, i) => {
              const sc  = statusColor(t.status);
              const tc  = tierColor(t.match_tier);
              const soon = isClosingSoon(t.deadline);
              const watchlisted = isWatchlisted(t.url || t.id);
              return (
                <div key={t.id || i} style={{ padding: "16px 18px", borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title row */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                        <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700, textDecoration: "none", lineHeight: 1.4 }}>{t.title}</a>
                      </div>
                      {/* Badges row */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {t.status.toUpperCase()}
                        </span>
                        {t.source && (
                          <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>
                            {t.source === "CF" ? "Contracts Finder" : "Find a Tender"}
                          </span>
                        )}
                        {t.region && (
                          <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(139,92,246,0.1)", color: "#a78bfa" }}>{t.region}</span>
                        )}
                        {t.category && (
                          <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,0.05)", color: "#64748b" }}>{t.category}</span>
                        )}
                        {t.sme_suitable === true && (
                          <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(16,185,129,0.1)", color: "#6ee7b7" }}>SME Suitable</span>
                        )}
                        {t.procedure_type && (
                          <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, background: "rgba(255,255,255,0.04)", color: "#64748b" }}>{t.procedure_type}</span>
                        )}
                        {/* Match score badge */}
                        {t.match_score != null && (
                          <span style={{ padding: "2px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.color }}>
                            {t.match_score}% {t.match_tier?.charAt(0).toUpperCase() + t.match_tier?.slice(1)} match
                          </span>
                        )}
                        {t.alli_relevant && (
                          <span style={{ padding: "2px 9px", borderRadius: 6, fontSize: 10, fontWeight: 800, background: "rgba(226,200,122,0.18)", color: GOLD, border: `1px solid ${GOLD}66`, letterSpacing: "0.04em" }}>
                            ★ ALLI RELEVANT
                          </span>
                        )}
                      </div>
                      {/* Description */}
                      {t.description && (
                        <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>
                          {t.description.slice(0, 150)}{t.description.length > 150 ? "…" : ""}
                        </div>
                      )}
                      {/* Meta row */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "#64748b" }}>
                        <span>
                          <span style={{ color: "#94a3b8" }}>Buyer: </span>
                          <button onClick={() => loadBuyerIntel(t.buyer)} style={{ background: "none", border: "none", color: BLUE, cursor: "pointer", fontSize: 12, padding: 0, fontWeight: 600 }}>
                            {t.buyer}
                          </button>
                        </span>
                        {t.value != null ? (
                          <span><span style={{ color: "#94a3b8" }}>Value: </span><span style={{ color: GOLD, fontWeight: 700 }}>£{fmtMoney(t.value)}{t.value_estimated ? " (est.)" : ""}</span></span>
                        ) : (
                          <span style={{ color: "#475569" }}>Value: Not specified</span>
                        )}
                        {t.published_date && <span><span style={{ color: "#94a3b8" }}>Published: </span>{fmtDate(t.published_date)}</span>}
                        {t.deadline && (
                          <span style={{ color: soon ? "#f87171" : "#64748b" }}>
                            <span style={{ color: soon ? "#f87171" : "#94a3b8" }}>Deadline: </span>
                            {fmtDate(t.deadline)}{soon ? " ⚠️ Closing soon" : ""}
                          </span>
                        )}
                        {t.duration_months && <span><span style={{ color: "#94a3b8" }}>Duration: </span>{t.duration_months}m</span>}
                        {/* Awarded contract info */}
                        {t.winner && (
                          <span><span style={{ color: "#94a3b8" }}>Winner: </span><span style={{ color: "#60a5fa", fontWeight: 600 }}>{t.winner}</span></span>
                        )}
                        {t.award_value && (
                          <span><span style={{ color: "#94a3b8" }}>Award Value: </span><span style={{ color: GOLD, fontWeight: 700 }}>£{fmtMoney(t.award_value)}</span></span>
                        )}
                        {t.award_date && <span><span style={{ color: "#94a3b8" }}>Awarded: </span>{fmtDate(t.award_date)}</span>}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, minWidth: 120 }}>
                      <button onClick={() => toggleWatchlist(t.url || t.id)} style={{ ...btn(watchlisted ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)"), padding: "5px 10px", fontSize: 11, color: watchlisted ? GOLD : "#94a3b8" }}>
                        {watchlisted ? "⭐ Saved" : "☆ Watchlist"}
                      </button>
                      <button onClick={() => addTenderFromSearch({ ...t, source_url: t.url, value_amount: t.value })} style={{ ...btn("rgba(16,185,129,0.15)"), padding: "5px 10px", fontSize: 11, color: "#10b981" }}>
                        + Pipeline
                      </button>
                      <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ ...btn("rgba(59,130,246,0.12)"), textDecoration: "none", padding: "5px 10px", fontSize: 11, color: BLUE, textAlign: "center" }}>
                        View ↗
                      </a>
                      {t.alli_relevant && (
                        <button onClick={() => addTenderToAlliResearch(t)} style={{ ...btn("rgba(226,200,122,0.18)"), padding: "5px 10px", fontSize: 11, color: GOLD, fontWeight: 700 }}>
                          + ALLI Research
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination footer */}
            {!searching && pagination.total_pages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, padding: "14px 18px", borderTop: `1px solid ${BORDER}` }}>
                <button onClick={() => { const p = Math.max(1, finderPage - 1); setFinderPage(p); handleFinderSearch({ page: p }); }} disabled={finderPage <= 1} style={{ ...btn("rgba(255,255,255,0.08)"), padding: "6px 16px" }}>← Prev</button>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>Page {finderPage} of {pagination.total_pages}</span>
                <button onClick={() => { const p = Math.min(pagination.total_pages, finderPage + 1); setFinderPage(p); handleFinderSearch({ page: p }); }} disabled={finderPage >= pagination.total_pages} style={{ ...btn("rgba(255,255,255,0.08)"), padding: "6px 16px" }}>Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ── Buyer Intelligence Panel ── */}
        {(buyerIntelName || buyerIntelLoading) && (
          <div style={{ ...card() }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ color: "#fff", margin: 0, fontSize: 15 }}>
                🏛️ Procurement History — <span style={{ color: BLUE }}>{buyerIntelName}</span>
              </h3>
              <button onClick={() => { setBuyerIntel(null); setBuyerIntelName(""); }} style={{ ...btn("transparent"), color: "#64748b", padding: "4px 8px" }}>✕</button>
            </div>
            {buyerIntelLoading && <div style={{ color: "#64748b", fontSize: 13 }}>Loading procurement history…</div>}
            {buyerIntel && !buyerIntelLoading && (
              <div style={{ display: "grid", gap: 14 }}>
                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                  {[
                    { label: "Contracts (2yr)", value: buyerIntel.stats?.total ?? 0, color: "#fff" },
                    { label: "Avg. Value",       value: buyerIntel.stats?.average_value != null ? `£${fmtMoney(buyerIntel.stats.average_value)}` : "—", color: GOLD },
                    { label: "Renewal Opps",    value: buyerIntel.renewals?.length ?? 0, color: "#10b981" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                      <div style={{ color: s.color, fontSize: 18, fontWeight: 800 }}>{s.value}</div>
                      <div style={{ color: "#475569", fontSize: 11 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Top winners */}
                {buyerIntel.stats?.top_winners?.length > 0 && (
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Top Winning Suppliers</div>
                    {buyerIntel.stats.top_winners.map((w: any) => (
                      <div key={w.name} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                        <span style={{ color: "#e2e8f0" }}>{w.name}</span>
                        <span style={{ color: "#64748b" }}>{w.count} contract{w.count !== 1 ? "s" : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Top categories */}
                {buyerIntel.stats?.top_categories?.length > 0 && (
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Categories They Buy Most</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {buyerIntel.stats.top_categories.map((c: any) => (
                        <span key={c.name} style={{ background: "rgba(59,130,246,0.1)", border: `1px solid rgba(59,130,246,0.2)`, color: "#93c5fd", padding: "3px 10px", borderRadius: 6, fontSize: 12 }}>
                          {c.name} ({c.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Renewal opps */}
                {buyerIntel.renewals?.length > 0 && (
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>🔄 Upcoming Renewals — contracts ending within 12 months</div>
                    {buyerIntel.renewals.map((r: any, i: number) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                        <span style={{ color: "#e2e8f0", flex: 1 }}>{r.title}</span>
                        <span style={{ color: GOLD, marginLeft: 12 }}>ends {fmtDate(r.deadline)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {buyerIntel.contracts?.length === 0 && (
                  <div style={{ color: "#475569", fontSize: 13 }}>No recent awarded contracts found for this buyer. Try clicking a different buyer.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── EP Search Advisor ── */}
        <div style={{ ...card() }}>
          <h4 style={{ color: "#fff", margin: "0 0 12px", fontSize: 14 }}>EP Search Advisor</h4>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={aiQuestion} onChange={e => setAiQuestion(e.target.value)} style={{ ...input(), flex: 1 }} placeholder="Ask about CPV codes, tender strategies, procurement portals…" onKeyDown={e => e.key === "Enter" && askAdvisor()} />
            <button onClick={askAdvisor} disabled={askingAi} style={btn(PURPLE)}>{askingAi ? "…" : "Ask"}</button>
          </div>
          {aiAnswer && <div style={{ marginTop: 12, padding: 12, background: "rgba(139,92,246,0.1)", borderRadius: 8, color: "#e2e8f0", fontSize: 13, whiteSpace: "pre-wrap" }}>{aiAnswer}</div>}
        </div>
      </div>
    );
  };

  const renderTenders = () => (
    <DiscoveryTenders
      tenders={tenders}
      showTenderForm={showTenderForm}
      editingTender={editingTender}
      tenderForm={tenderForm}
      orgLaneFilter={orgLaneFilter}
      notRelevantIds={notRelevantIds}
      showNotRelevant={showNotRelevant}
      fitScores={fitScores}
      expandedWhyId={expandedWhyId}
      hoveredOrgPill={hoveredOrgPill}
      togglingNotRelevant={togglingNotRelevant}
      user={user}
      setShowQuickAdd={setShowQuickAdd}
      setQuickAddTab={setQuickAddTab}
      setQuickAddResult={setQuickAddResult}
      setEditingTender={setEditingTender}
      setTenderForm={setTenderForm}
      setShowTenderForm={setShowTenderForm}
      setOrgLaneFilter={setOrgLaneFilter}
      setShowNotRelevant={setShowNotRelevant}
      setExpandedWhyId={setExpandedWhyId}
      setHoveredOrgPill={setHoveredOrgPill}
      saveTender={saveTender}
      selectTender={selectTender}
      toggleNotRelevant={toggleNotRelevant}
      deleteTender={deleteTender}
    />
  );

  const renderTenderDetail = () => {
    if (!selectedTender) return null;
    const t = selectedTender;
    if (!t.title || !t.buyer) return <div style={{ color: "#94a3b8", padding: 16 }}>Unable to load tender details. Please try another tender.</div>;
    const reqsMet = tenderRequirements.filter(r => r.is_met).length;
    const reqsTotal = tenderRequirements.length;
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => { setSelectedTender(null); setActiveTab("tenders"); }} style={{ ...btn("rgba(255,255,255,0.1)"), padding: "6px 12px" }}>← Back</button>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>{t.title}</h2>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{t.buyer} · {t.status || "Researching"} · Deadline: {fmtDate(t.deadline)}</div>
          </div>
          <button onClick={() => publishTender(t.id)} disabled={publishing} style={{ ...btn("#10b981"), color: "#fff", fontWeight: 700 }}>
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>

        <div style={{ ...card() }}>
          <h3 style={{ color: "#fff", margin: "0 0 12px", fontSize: 15 }}>Compliance Checklist {reqsTotal > 0 && <span style={{ color: BLUE, fontSize: 12 }}>({reqsMet}/{reqsTotal})</span>}</h3>
          {reqsTotal > 0 && <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}><div style={{ height: "100%", background: reqsMet === reqsTotal ? "#10b981" : BLUE, width: `${(reqsMet / reqsTotal) * 100}%`, borderRadius: 3, transition: "width 0.3s" }} /></div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button onClick={extractRequirements} disabled={extractingReqs} style={{ ...btn(PURPLE) }}>{extractingReqs ? "Extracting..." : "🤖 Extract Requirements"}</button>
            <button onClick={rebuildComplianceMatrix} disabled={rebuildingMatrix} style={{ ...btn(BLUE) }} title="Build the formal requirements→evidence→status matrix from extracted facts">{rebuildingMatrix ? "Rebuilding..." : "🧱 Rebuild Compliance Matrix"}</button>
          </div>
          {tenderRequirements.map(r => (
            <div key={r.id} onClick={() => toggleRequirement(r.id)} style={{ padding: "8px 0", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 10, cursor: "pointer", alignItems: "flex-start" }}>
              <span style={{ fontSize: 16 }}>{r.is_met ? "✅" : "⬜"}</span>
              <div><div style={{ color: "#fff", fontSize: 13 }}>{r.description}</div><div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase" }}>{r.requirement_type}</div></div>
            </div>
          ))}
          {reqsTotal === 0 && <div style={{ color: "#475569", fontSize: 12 }}>Click "Extract Requirements" to analyse this tender.</div>}

          {/* Formal compliance matrix (requirement → evidence → status), built from extracted facts */}
          {(complianceMatrix.length > 0 || matrixSummary) && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <h4 style={{ color: "#fff", margin: 0, fontSize: 13 }}>Compliance Matrix</h4>
                {matrixSummary && (
                  <span style={{ fontSize: 11, color: matrixSummary.submit_ready ? "#10b981" : "#f59e0b", fontWeight: 700 }}>
                    {matrixSummary.submit_ready ? "✅ Submission-ready" : `⚠ ${matrixSummary.mandatory_open ?? 0} mandatory unmet`}
                  </span>
                )}
              </div>
              {complianceMatrix.map(m => (
                <div key={m.id} style={{ padding: "6px 0", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 14 }}>{m.status === "met" ? "✅" : m.status === "partial" ? "🟡" : "⬜"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontSize: 12 }}>{m.requirement}{m.is_mandatory && <span style={{ color: "#f87171", fontSize: 10, marginLeft: 6 }}>MANDATORY</span>}</div>
                    <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase" }}>{m.requirement_type}{m.evidence_summary ? ` · evidence: ${m.evidence_summary}` : ""}</div>
                  </div>
                </div>
              ))}
              {complianceMatrix.length === 0 && <div style={{ color: "#475569", fontSize: 12 }}>No matrix rows yet — extract requirements, then rebuild.</div>}
            </div>
          )}
        </div>

        <div style={{ ...card() }}>
          <h3 style={{ color: "#fff", margin: "0 0 12px", fontSize: 15 }}>Agent Bid Sections ({tenderSections.length})</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 16 }}>
            {BID_SECTIONS.map(s => {
              const existing = tenderSections.find(ts => ts.section_key === s.key);
              return (
                <button key={s.key} onClick={() => generateSection(s.key, s.label)} disabled={generating === s.key} style={{ padding: "8px 6px", background: existing ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${existing ? "rgba(16,185,129,0.3)" : BORDER}`, borderRadius: 6, color: existing ? "#10b981" : "#94a3b8", fontSize: 10, cursor: "pointer", textAlign: "left" }}>
                  {generating === s.key ? "⏳" : existing ? "✓" : "+"} {s.label}
                </button>
              );
            })}
          </div>
          {tenderSections.map(s => (
            <div key={s.id} style={{ marginBottom: 12, padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h4 style={{ color: BLUE, margin: 0, fontSize: 13 }}>{s.section_label}</h4>
                <span style={{ color: "#64748b", fontSize: 10 }}>{s.word_count} words</span>
              </div>
              <div style={{ color: "#e2e8f0", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{s.content}</div>
            </div>
          ))}
        </div>

        {/* ── Tender Pack (Phase 2) ── */}
        <div style={{ ...card() }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ color: "#fff", margin: 0, fontSize: 15 }}>
              Tender Pack
              {packDocs.length > 0 && (
                <span style={{ color: "#64748b", fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                  {packDocs.length} doc{packDocs.length !== 1 ? "s" : ""} · {extractedFacts.length} facts
                  {t.extraction_complete && <span style={{ color: "#10b981", marginLeft: 6 }}>✓ Complete</span>}
                </span>
              )}
            </h3>
            <div style={{ display: "flex", gap: 8 }}>
              {packDocs.length > 0 && (
                <>
                  <button
                    onClick={async () => {
                      await saasApiRequest("POST", `${API}/tenders/${t.id}/re-extract-all`);
                      showToast("Re-extracting all documents…");
                      setTimeout(() => refreshPackDocs(t.id), 3000);
                    }}
                    style={{ ...btn("rgba(255,255,255,0.1)"), padding: "4px 10px", fontSize: 12 }}
                  >↺ Re-extract all</button>
                  {!t.extraction_complete && (
                    <button
                      onClick={async () => {
                        await saasApiRequest("POST", `${API}/tenders/${t.id}/extraction-complete`);
                        setSelectedTender({ ...t, extraction_complete: true });
                        showToast("Marked complete");
                      }}
                      style={{ ...btn("rgba(16,185,129,0.2)"), padding: "4px 10px", fontSize: 12, color: "#10b981" }}
                    >✓ Mark complete</button>
                  )}
                </>
              )}
              <button
                onClick={() => refreshPackDocs(t.id)}
                style={{ ...btn("rgba(255,255,255,0.1)"), padding: "4px 10px", fontSize: 12 }}
              >⟳ Refresh</button>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              if (e.dataTransfer.files?.length > 0) uploadTenderPack(e.dataTransfer.files, t.id);
            }}
            style={{
              border: `2px dashed ${BORDER}`,
              borderRadius: 8,
              padding: "20px 16px",
              textAlign: "center",
              marginBottom: 16,
              background: "rgba(255,255,255,0.02)",
              cursor: "pointer",
              position: "relative",
            }}
            onClick={() => { (document.getElementById(`pack-upload-${t.id}`) as HTMLInputElement)?.click(); }}
          >
            <input
              id={`pack-upload-${t.id}`}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.odt,.rtf,.txt,.xlsx"
              style={{ display: "none" }}
              onChange={e => e.target.files && uploadTenderPack(e.target.files, t.id)}
            />
            {uploadingFiles ? (
              <div style={{ color: BLUE, fontSize: 13 }}>Uploading…</div>
            ) : (
              <>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>📎 Drop files here or click to upload</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>PDF, DOCX, ODT, RTF, TXT, XLSX · up to 50MB per file</div>
              </>
            )}
          </div>

          {/* Document list */}
          {packDocsLoading && <div style={{ color: "#64748b", fontSize: 12 }}>Loading documents…</div>}
          {packDocs.length === 0 && !packDocsLoading && (
            <div style={{ color: "#475569", fontSize: 12 }}>No documents uploaded yet. Upload the tender pack to start analysis.</div>
          )}
          {packDocs.map(d => {
            const statusColor =
              d.extraction_status === "extracted" ? "#10b981"
              : d.extraction_status === "processing" ? BLUE
              : d.extraction_status === "failed" ? "#ef4444"
              : "#94a3b8";
            const statusLabel =
              d.extraction_status === "extracted" ? "Extracted ✓"
              : d.extraction_status === "processing" ? "Processing…"
              : d.extraction_status === "failed" ? "Failed ⚠"
              : "Pending";
            const docTypeLabels: Record<string, string> = {
              itt: "ITT", specification: "Spec", pricing_schedule: "Pricing",
              terms_conditions: "T&Cs", evaluation_criteria: "Evaluation",
              questions_answers: "Q&A", response_template: "Template",
              background_doc: "Background", other: "Other",
            };
            return (
              <div key={d.id} style={{ padding: "10px 0", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>
                  {d.filename?.toLowerCase().endsWith(".pdf") ? "📄" : d.filename?.toLowerCase().endsWith(".docx") || d.filename?.toLowerCase().endsWith(".doc") ? "📝" : "📃"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#fff", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.view_url ? (
                      <a href={d.view_url} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "none" }}>
                        {d.filename}
                      </a>
                    ) : d.filename}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                    <select
                      value={d.document_type || "other"}
                      onChange={async e => {
                        await saasApiRequest("PATCH", `${API}/tenders/${t.id}/documents/${d.id}/type`, { document_type: e.target.value });
                        await refreshPackDocs(t.id);
                      }}
                      style={{ background: "transparent", color: "#94a3b8", border: "none", fontSize: 11, cursor: "pointer" }}
                    >
                      {Object.entries(docTypeLabels).map(([v, l]) => <option key={v} value={v} style={{ background: "#1e293b" }}>{l}</option>)}
                    </select>
                    {d.page_count && ` · ${d.page_count}pp`}
                    {d.word_count && ` · ${Math.round(d.word_count / 1000)}k words`}
                    {d.fact_count > 0 && ` · ${d.fact_count} facts`}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: statusColor, whiteSpace: "nowrap" }}>{statusLabel}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {d.extraction_status === "failed" && (
                    <button
                      onClick={async () => {
                        await saasApiRequest("POST", `${API}/tenders/${t.id}/documents/${d.id}/retry`);
                        showToast("Retry queued…");
                        setTimeout(() => refreshPackDocs(t.id), 2000);
                      }}
                      style={{ ...btn(BLUE), padding: "2px 8px", fontSize: 11 }}
                    >Retry</button>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete "${d.filename}"? This will also remove its extracted facts.`)) return;
                      await saasApiRequest("DELETE", `${API}/tenders/${t.id}/documents/${d.id}`);
                      await refreshPackDocs(t.id);
                    }}
                    style={{ ...btn("rgba(239,68,68,0.2)"), padding: "2px 8px", fontSize: 11, color: "#ef4444" }}
                  >✕</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Extracted Facts (Phase 2) ── */}
        {extractedFacts.length > 0 && (
          <div style={{ ...card() }}>
            <h3 style={{ color: "#fff", margin: "0 0 12px", fontSize: 15 }}>Extracted Facts ({extractedFacts.length})</h3>

            {/* Tab bar */}
            {(() => {
              const factTypes: Array<{ key: string; label: string }> = [
                { key: "deadline", label: "Deadlines" },
                { key: "requirement", label: "Requirements" },
                { key: "mandatory_pass_fail", label: "Pass/Fail" },
                { key: "evaluation_criterion", label: "Evaluation" },
                { key: "submission_format", label: "Submission" },
                { key: "red_flag", label: "Red Flags" },
                { key: "opportunity_signal", label: "Opportunities" },
                { key: "value", label: "Value" },
                { key: "key_date", label: "Key Dates" },
                { key: "contact", label: "Contacts" },
              ].filter(ft => extractedFacts.some(f => f.fact_type === ft.key));

              const factsForTab = extractedFacts.filter(f => f.fact_type === activeFactTab);

              return (
                <>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {factTypes.map(ft => (
                      <button
                        key={ft.key}
                        onClick={() => setActiveFactTab(ft.key)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 12,
                          border: `1px solid ${activeFactTab === ft.key ? BLUE : BORDER}`,
                          background: activeFactTab === ft.key ? "rgba(59,130,246,0.2)" : "transparent",
                          color: activeFactTab === ft.key ? "#fff" : "#94a3b8",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        {ft.label} ({extractedFacts.filter(f => f.fact_type === ft.key).length})
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {factsForTab.length === 0 && (
                      <div style={{ color: "#475569", fontSize: 12 }}>No {activeFactTab} facts extracted yet.</div>
                    )}
                    {factsForTab.map(fact => {
                      const confidence = fact.confidence_score || 0;
                      const confColor = confidence >= 80 ? "#10b981" : confidence >= 50 ? "#f59e0b" : "#ef4444";
                      const confLabel = confidence >= 80 ? "High" : confidence >= 50 ? "Medium" : "Low";
                      const isRedFlag = fact.fact_type === "red_flag";
                      const isOpportunity = fact.fact_type === "opportunity_signal";
                      return (
                        <div
                          key={fact.id}
                          style={{
                            padding: 10,
                            background: isRedFlag ? "rgba(239,68,68,0.08)" : isOpportunity ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${isRedFlag ? "rgba(239,68,68,0.2)" : isOpportunity ? "rgba(16,185,129,0.2)" : BORDER}`,
                            borderRadius: 8,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500 }}>{fact.fact_label}</div>
                              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{fact.fact_value}</div>
                              {fact.doc_filename && (
                                <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>
                                  {fact.doc_filename}{fact.page_reference && ` · p.${fact.page_reference}`}
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                              <span style={{ fontSize: 10, color: confColor, padding: "2px 6px", borderRadius: 4, border: `1px solid ${confColor}` }}>
                                {confLabel}
                              </span>
                              {fact.verified_by_user && (
                                <span style={{ fontSize: 10, color: "#10b981" }}>✓ Verified</span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                            {!fact.verified_by_user && (
                              <button
                                onClick={async () => {
                                  await saasApiRequest("PATCH", `${API}/facts/${fact.id}`, { verified_by_user: true });
                                  await refreshPackDocs(t.id);
                                }}
                                style={{ ...btn("rgba(16,185,129,0.15)"), padding: "2px 8px", fontSize: 11, color: "#10b981" }}
                              >✓ Verify</button>
                            )}
                            <button
                              onClick={async () => {
                                const newVal = prompt("Edit value:", fact.fact_value);
                                if (newVal !== null && newVal !== fact.fact_value) {
                                  await saasApiRequest("PATCH", `${API}/facts/${fact.id}`, { fact_value: newVal });
                                  await refreshPackDocs(t.id);
                                }
                              }}
                              style={{ ...btn("rgba(255,255,255,0.08)"), padding: "2px 8px", fontSize: 11 }}
                            >Edit</button>
                            <button
                              onClick={async () => {
                                if (!confirm("Delete this fact?")) return;
                                await saasApiRequest("DELETE", `${API}/facts/${fact.id}`);
                                setExtractedFacts(prev => prev.filter(f => f.id !== fact.id));
                              }}
                              style={{ ...btn("rgba(239,68,68,0.1)"), padding: "2px 8px", fontSize: 11, color: "#ef4444" }}
                            >✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      {/* ── ITT Details (Private Portal Capture) ── */}
        <div style={{ ...card() }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showIttPanel ? 16 : 0 }}>
            <div>
              <h3 style={{ color: "#fff", margin: 0, fontSize: 15 }}>📋 ITT Details</h3>
              <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>Private portal fields — deadlines, contacts, bid bond, portal login</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {ittDetails?.updated_at && <span style={{ color: "#475569", fontSize: 11 }}>Updated {new Date(ittDetails.updated_at).toLocaleDateString("en-GB")}</span>}
              <button onClick={() => setShowIttPanel(p => !p)} style={{ ...btn(showIttPanel ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.08)"), padding: "5px 12px", fontSize: 12 }}>
                {showIttPanel ? "▲ Collapse" : "▼ Edit Details"}
              </button>
            </div>
          </div>

          {/* Compact summary when collapsed */}
          {!showIttPanel && ittDetails && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {ittDetails.deadline_eoi && <span style={{ color: "#94a3b8", fontSize: 12 }}>EOI: <strong style={{ color: "#fff" }}>{ittDetails.deadline_eoi}</strong></span>}
              {ittDetails.clarification_deadline && <span style={{ color: "#94a3b8", fontSize: 12 }}>Clarif: <strong style={{ color: "#fff" }}>{ittDetails.clarification_deadline}</strong></span>}
              {ittDetails.site_visit_date && <span style={{ color: "#94a3b8", fontSize: 12 }}>Site Visit: <strong style={{ color: "#fff" }}>{ittDetails.site_visit_date}</strong></span>}
              {ittDetails.submission_portal && <span style={{ color: "#94a3b8", fontSize: 12 }}>Portal: <strong style={{ color: "#fff" }}>{ittDetails.submission_portal}</strong></span>}
              {ittDetails.bid_bond_required && <span style={{ color: "#f59e0b", fontSize: 12 }}>⚠ Bid Bond Required</span>}
              {!ittDetails.deadline_eoi && !ittDetails.submission_portal && <span style={{ color: "#475569", fontSize: 12 }}>No details captured yet</span>}
            </div>
          )}

          {showIttPanel && (
            <div style={{ display: "grid", gap: 16 }}>
              {/* Key Dates */}
              <div>
                <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Key Dates</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "EOI / Expression of Interest Deadline", key: "deadline_eoi" },
                    { label: "Clarification Questions Deadline", key: "clarification_deadline" },
                    { label: "Clarification Answers Published", key: "clarification_answers_date" },
                    { label: "Site Visit Date", key: "site_visit_date" },
                  ].map(f => (
                    <div key={f.key}>
                      <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>{f.label}</div>
                      <input type="date" value={ittForm[f.key] || ""} onChange={e => setIttForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#e2e8f0", padding: "7px 10px", fontSize: 13 }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Submission Portal */}
              <div>
                <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Submission Portal</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Portal Name (e.g. Jaggaer, Delta, Atamis)", key: "submission_portal", placeholder: "Jaggaer" },
                    { label: "Direct Portal URL", key: "portal_url", placeholder: "https://..." },
                    { label: "Username / Login ID", key: "portal_login", placeholder: "ep-tender-user" },
                  ].map(f => (
                    <div key={f.key}>
                      <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>{f.label}</div>
                      <input type="text" value={ittForm[f.key] || ""} placeholder={f.placeholder} onChange={e => setIttForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#e2e8f0", padding: "7px 10px", fontSize: 13 }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Lot Structure */}
              <div>
                <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>Lot Structure (describe any lots or packages)</div>
                <textarea value={ittForm.lot_structure || ""} rows={2} onChange={e => setIttForm((p: any) => ({ ...p, lot_structure: e.target.value }))}
                  placeholder="e.g. Lot 1: Event Production UK, Lot 2: Event Production International..."
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#e2e8f0", padding: "7px 10px", fontSize: 13, resize: "vertical" }} />
              </div>

              {/* Bid Bond */}
              <div>
                <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Bid Bond</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#e2e8f0", fontSize: 13 }}>
                    <input type="checkbox" checked={!!ittForm.bid_bond_required} onChange={e => setIttForm((p: any) => ({ ...p, bid_bond_required: e.target.checked }))} />
                    Bid Bond Required
                  </label>
                  {ittForm.bid_bond_required && (
                    <>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <input type="text" value={ittForm.bid_bond_amount || ""} placeholder="Amount (e.g. £5,000)" onChange={e => setIttForm((p: any) => ({ ...p, bid_bond_amount: e.target.value }))}
                          style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#e2e8f0", padding: "7px 10px", fontSize: 13 }} />
                      </div>
                      <div style={{ flex: 2, minWidth: 200 }}>
                        <input type="text" value={ittForm.bid_bond_details || ""} placeholder="Details (issuer, expiry, form required)" onChange={e => setIttForm((p: any) => ({ ...p, bid_bond_details: e.target.value }))}
                          style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#e2e8f0", padding: "7px 10px", fontSize: 13 }} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Named Contacts */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Named Contacts</div>
                  <button onClick={() => setIttContacts(p => [...p, { name: "", role: "", email: "", phone: "" }])} style={{ ...btn("rgba(59,130,246,0.2)"), padding: "3px 10px", fontSize: 11, color: BLUE }}>+ Add Contact</button>
                </div>
                {ittContacts.length === 0 && <div style={{ color: "#475569", fontSize: 12 }}>No contacts added. Click "Add Contact" to capture named contacts from the ITT.</div>}
                {ittContacts.map((c, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    {[
                      { key: "name", placeholder: "Full Name" },
                      { key: "role", placeholder: "Role / Title" },
                      { key: "email", placeholder: "Email" },
                      { key: "phone", placeholder: "Phone" },
                    ].map(f => (
                      <input key={f.key} type="text" value={(c as any)[f.key] || ""} placeholder={f.placeholder}
                        onChange={e => setIttContacts(p => p.map((x, j) => j === i ? { ...x, [f.key]: e.target.value } : x))}
                        style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#e2e8f0", padding: "6px 8px", fontSize: 12 }} />
                    ))}
                    <button onClick={() => setIttContacts(p => p.filter((_, j) => j !== i))} style={{ ...btn("rgba(239,68,68,0.15)"), padding: "4px 8px", color: "#ef4444", fontSize: 12 }}>✕</button>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>Bid Notes (anything else from the ITT worth capturing)</div>
                <textarea value={ittForm.itt_notes || ""} rows={3} onChange={e => setIttForm((p: any) => ({ ...p, itt_notes: e.target.value }))}
                  placeholder="e.g. Evaluators asked for case studies from last 3 years only. TUPE applies. Social value weighting is 20%..."
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 6, color: "#e2e8f0", padding: "7px 10px", fontSize: 13, resize: "vertical" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => saveIttDetails(t.id)} disabled={savingItt} style={{ ...btn(BLUE), padding: "8px 20px", fontWeight: 700 }}>
                  {savingItt ? "Saving…" : "💾 Save ITT Details"}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    );
  };

  const renderIntelligence = () => (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>Procurement Intelligence</h2>
        <button onClick={scanIntelligence} disabled={scanningIntel} style={btn(BLUE)}>{scanningIntel ? "Scanning..." : "🤖 Run Agent Scan"}</button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {intelligence.map(item => (
          <div key={item.id} style={{ ...card(), padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{item.summary}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, background: "rgba(59,130,246,0.15)", color: BLUE }}>{item.category}</span>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, background: "rgba(255,255,255,0.1)", color: "#94a3b8" }}>{item.country}</span>
                  <span style={{ color: "#64748b", fontSize: 10 }}>{item.source}</span>
                </div>
              </div>
              {item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ ...btn(BLUE), padding: "4px 10px", fontSize: 10, textDecoration: "none" }}>VIEW</a>}
            </div>
          </div>
        ))}
        {intelligence.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>Click "Run Agent Scan" to generate your intelligence feed.</div>}
      </div>
    </div>
  );

  const renderProfile = () => {
    const countryInfo = country === "GB" 
      ? { name: "Event Perfekt Global Ltd", number: "15875326", address: "20 Wenlock Road, London, N1 7PG", sort_code: "04-29-09", account: "78253411" }
      : { name: "Event Perfekt Management Services Limited", number: "5831022", address: "25 Kusenla Street, Lagos, Nigeria", sort_code: "N/A", account: "0740436407" };
    
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>Company Profile — {countryInfo.name}</h2>
          <button onClick={() => { setProfileForm(profile || {}); setShowProfileEdit(!showProfileEdit); }} style={btn(BLUE)}>{showProfileEdit ? "Cancel" : "✏️ Edit"}</button>
        </div>
        {showProfileEdit ? (
          <div style={{ ...card() }}>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                ["company_name", "Company Name"], ["company_number", "Company Number"], ["company_address", "Address"],
                ["directors", "Directors"], ["key_personnel", "Key Personnel"], ["phone", "Phone"], ["email", "Email"], ["website", "Website"],
                ["vat_number", "VAT Number"], ["num_employees", "Employees"], ["annual_turnover", "Annual Turnover"],
                ["insurance_pii", "Insurance PII"], ["insurance_public_liability", "Insurance Public Liability"],
                ["insurance_employers", "Employers Liability"], ["insurance_cyber", "Cyber Insurance"],
                ["certifications", "Certifications"], ["accreditations", "Accreditations"], ["policies", "Policies"],
                ["bank_name", "Bank Name"], ["bank_account", "Account Number"], ["bank_sort_code", "Sort Code"],
                ["sector_experience", "Sector Experience"], ["bio_summary", "Company Bio"],
              ].map(([key, lbl]) => (
                <div key={key}>
                  <label style={label()}>{lbl.toUpperCase()}</label>
                  {["bio_summary", "sector_experience", "policies", "certifications", "past_contracts", "social_value_statement", "equality_statement", "environmental_statement", "methodology_overview"].includes(key)
                    ? <textarea value={profileForm[key] || ""} onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })} style={{ ...input(), minHeight: 60 }} />
                    : <input value={profileForm[key] || ""} onChange={e => setProfileForm({ ...profileForm, [key]: e.target.value })} style={input()} />
                  }
                </div>
              ))}
              <button onClick={saveProfile} style={btn(BLUE)}>Save Profile</button>
            </div>
          </div>
        ) : (
          <div style={{ ...card() }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${BORDER}` }}>
              <div><div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>REGISTERED COMPANY NAME</div><div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{countryInfo.name}</div></div>
              <div><div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>COMPANIES HOUSE NUMBER</div><div style={{ color: "#fff", fontSize: 13 }}>{countryInfo.number}</div></div>
              <div><div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>REGISTERED ADDRESS</div><div style={{ color: "#fff", fontSize: 13 }}>{countryInfo.address}</div></div>
              <div><div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>DIRECTOR(S)</div><div style={{ color: "#fff", fontSize: 13 }}>{profile?.directors || "Tolulope Johnson"}</div></div>
              <div><div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>WEBSITE</div><div style={{ color: "#fff", fontSize: 13 }}>{profile?.website || "www.eventperfekt.com"}</div></div>
              <div><div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>YEAR ESTABLISHED</div><div style={{ color: "#fff", fontSize: 13 }}>{profile?.year_established || "-"}</div></div>
              <div><div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>VAT NUMBER</div><div style={{ color: "#fff", fontSize: 13 }}>{profile?.vat_number || "-"}</div></div>
              <div><div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>NUMBER OF EMPLOYEES</div><div style={{ color: "#fff", fontSize: 13 }}>{profile?.num_employees || "-"}</div></div>
            </div>
            {profile?.bio_summary && <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${BORDER}` }}><div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>COMPANY CAPABILITIES</div><div style={{ color: "#e2e8f0", fontSize: 12 }}>{profile.bio_summary}</div></div>}
            <div style={{ paddingTop: 12 }}>
              <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>BANK DETAILS ({country})</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><div style={{ color: "#94a3b8", fontSize: 10 }}>Account Name</div><div style={{ color: "#fff", fontSize: 12 }}>{countryInfo.name}</div></div>
                <div><div style={{ color: "#94a3b8", fontSize: 10 }}>Account Number</div><div style={{ color: "#fff", fontSize: 12 }}>{countryInfo.account}</div></div>
                {country === "GB" && <div><div style={{ color: "#94a3b8", fontSize: 10 }}>Sort Code</div><div style={{ color: "#fff", fontSize: 12 }}>{countryInfo.sort_code}</div></div>}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const uploadVaultFile = async (folderId: number, files: FileList) => {
    if (!files || files.length === 0) return;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder_id", String(folderId));
        formData.append("country", country);
        const result = await saasApiRequest("POST", `${API}/bid-vault/upload`, formData);
        if (result.error) showToast(`Error uploading ${file.name}`);
      }
      showToast(`${files.length} file(s) uploaded successfully`);
      const files_resp = await saasApiRequest("GET", `${API}/bid-vault/files?country=${country}`);
      setBidVaultFiles(files_resp);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const renderVault = () => (
    <div style={{ display: "grid", gap: 16 }}>
      <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>Bid Vault</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {bidVaultFolders.map(f => {
          const fileCount = bidVaultFiles.filter(fi => fi.folder_id === f.id).length;
          return (
            <div key={f.id} style={{ ...card(), padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{f.name}</div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{fileCount} file{fileCount !== 1 ? "s" : ""}</div>
                </div>
                <button onClick={() => setSelectedVaultFolder(selectedVaultFolder === f.id ? null : f.id)} style={{ ...btn("rgba(59,130,246,0.2)"), color: BLUE, padding: "4px 8px", fontSize: 11 }}>
                  {selectedVaultFolder === f.id ? "Hide" : "View"}
                </button>
              </div>
              {selectedVaultFolder === f.id && (
                <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 12, marginTop: 12 }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ ...label(), marginBottom: 8 }}>ADD FILES TO {f.name.toUpperCase()}</label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => e.target.files && uploadVaultFile(f.id, e.target.files)}
                      style={{ display: "block", width: "100%", padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: 6, color: "#fff", fontSize: 12, cursor: "pointer" }}
                    />
                  </div>
                  {bidVaultFiles.filter(fi => fi.folder_id === f.id).length > 0 && (
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                      <label style={label()}>FILES ({bidVaultFiles.filter(fi => fi.folder_id === f.id).length})</label>
                      <div style={{ maxHeight: 150, overflowY: "auto" }}>
                        {bidVaultFiles.filter(fi => fi.folder_id === f.id).map(file => (
                          <div key={file.id} style={{ padding: "8px 0", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                            <div style={{ color: "#fff", fontWeight: 500 }}>{file.file_name}</div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ color: "#64748b" }}>{fmtDate(file.created_at)}</span>
                              <a href={file.file_url} download={file.file_name} target="_blank" rel="noreferrer" style={{ color: GOLD, fontSize: 11, textDecoration: "none", padding: "2px 8px", border: `1px solid ${GOLD}`, borderRadius: 4, whiteSpace: "nowrap" }}>↓ Download</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const savePortalCreds = async () => {
    if (!editingPortal) return;
    try {
      await saasApiRequest("PATCH", `${API}/portal-registrations/${encodeURIComponent(editingPortal.portal_name)}`, {
        email: portalForm.email,
        password: portalForm.password,
        username: portalForm.username,
      });
      showToast("Portal credentials saved");
      setShowPortalForm(false);
      setEditingPortal(null);
      const pr = await saasApiRequest("GET", `${API}/portal-registrations?country=${country}`);
      setPortalRegs(pr);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const renderPortals = () => (
    <div style={{ display: "grid", gap: 16 }}>
      <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>Procurement Portals</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {PORTALS.map(p => {
          const reg = portalRegs.find(r => r.portal_name === p.name);
          return (
            <div key={p.name} style={{ ...card(), padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: BLUE, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                    {p.name} ↗
                  </a>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{p.region}</div>
                </div>
                {reg && <div style={{ padding: "4px 12px", background: "rgba(16,185,129,0.2)", color: "#10b981", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>✓ REGISTERED</div>}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 12 }}>
                {p.desc}
              </div>
              <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                {(reg?.email || reg?.username || reg?.password || (p as any).username || (p as any).password) ? (
                  <>
                    {(reg?.email || (p as any).email) && <div style={{ marginBottom: 8 }}>
                      <label style={label()}>EMAIL</label>
                      <div style={{ color: "#fff", fontSize: 12 }}>{reg?.email || (p as any).email}</div>
                    </div>}
                    {(reg?.username || (p as any).username) && <div style={{ marginBottom: 8 }}>
                      <label style={label()}>USERNAME</label>
                      <div style={{ color: "#fff", fontSize: 12 }}>{reg?.username || (p as any).username}</div>
                    </div>}
                    {(reg?.password || (p as any).password) && <div style={{ marginBottom: 0 }}>
                      <label style={label()}>PASSWORD</label>
                      <div style={{ color: "#fff", fontSize: 12 }}>{(reg?.password || (p as any).password) ? "•••••••••" : ""} <button onClick={() => { setEditingPortal(reg || { portal_name: p.name, portal_url: p.url, email: (p as any).email || "", username: (p as any).username || "", password: (p as any).password || "" }); setPortalForm({ email: reg?.email || (p as any).email || "", password: reg?.password || (p as any).password || "", username: reg?.username || (p as any).username || "" }); setShowPortalForm(true); }} style={{ color: BLUE, background: "none", border: "none", cursor: "pointer", fontSize: 11, marginLeft: 4 }}>👁</button></div>
                    </div>}
                  </>
                ) : (
                  <div style={{ color: "#64748b", fontSize: 12 }}>No saved login details</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => window.open(p.url, "_blank")} style={{ ...btn(BLUE), flex: 1 }}>Log in</button>
                <button onClick={() => { 
                  if (reg) { 
                    setEditingPortal(reg); 
                    setPortalForm({ email: reg.email || "", password: reg.password || "", username: reg.username || "" }); 
                  } else { 
                    setEditingPortal({ portal_name: p.name, portal_url: p.url }); 
                    setPortalForm({ email: "", password: "", username: "" }); 
                  }
                  setShowPortalForm(true); 
                }} style={{ ...btn("rgba(255,255,255,0.1)"), flex: 1, color: "#94a3b8" }}>
                  {reg ? "Edit" : "Add Creds"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showPortalForm && (
        <div style={{ ...card() }}>
          <h3 style={{ color: "#fff", margin: "0 0 16px", fontSize: 15 }}>
            {editingPortal?.portal_name ? `Credentials for ${editingPortal.portal_name}` : "Add Portal Credentials"}
          </h3>
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={label()}>EMAIL</label>
              <input value={portalForm.email} onChange={e => setPortalForm({...portalForm, email: e.target.value})} style={input()} placeholder="email@example.com" />
            </div>
            <div>
              <label style={label()}>USERNAME (optional)</label>
              <input value={portalForm.username} onChange={e => setPortalForm({...portalForm, username: e.target.value})} style={input()} placeholder="Username or full name" />
            </div>
            <div>
              <label style={label()}>PASSWORD</label>
              <input value={portalForm.password} onChange={e => setPortalForm({...portalForm, password: e.target.value})} type="password" style={input()} placeholder="Enter password" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={savePortalCreds} style={{ ...btn(BLUE), flex: 1 }}>Save Credentials</button>
            <button onClick={() => setShowPortalForm(false)} style={{ ...btn("rgba(239,68,68,0.15)"), flex: 1, color: "#f87171" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );

  const generateBidWithAI = async () => {
    if (!selectedTenderForBid && !tenderDetailsInput.trim()) {
      showToast("Please select a tender or paste tender details");
      return;
    }
    setGeneratingBid(true);
    try {
      if (selectedTenderForBid) {
        // Use the full EP Agent pipeline — generate all 16 sections via EP_AGENT_SYSTEM_PROMPT
        const data = await saasApiRequest("POST", `${API}/bid-sections/generate-all`, { tender_id: selectedTenderForBid.id });
        // Reload sections panel
        const secs = await saasApiRequest("GET", `${API}/bid-sections/${selectedTenderForBid.id}`);
        setTenderSections(secs);
        // Compile all sections into a combined proposal document
        const sections = (data.sections || []).filter((s: any) => s.content);
        const compiled = sections
          .map((s: any) => `## ${s.section_label}\n\n${s.content}`)
          .join("\n\n---\n\n");
        setProposalContent(compiled);
        if (!proposalTitle) setProposalTitle(selectedTenderForBid.title);
        showToast(`${sections.length} sections generated`);
      } else {
        // Fallback for pasted tender details — routed through ai-advisor with EP Agent system prompt
        const data = await saasApiRequest("POST", `${API}/ai-advisor`, {
          question: `Write a full bid proposal for the following tender:\n\n${tenderDetailsInput}`,
          country,
        });
        setProposalContent(data.content);
        showToast("Proposal draft generated");
      }
    } catch (err: any) {
      showToast(err.message);
    }
    setGeneratingBid(false);
  };

  const saveProposal = async () => {
    if (!proposalTitle.trim() || !proposalContent.trim()) {
      showToast("Please fill in both title and content");
      return;
    }
    setSavingProposal(true);
    try {
      const data = await saasApiRequest("POST", `${API}/saas-tender/proposals`, {
        tender_id: selectedTenderForBid?.id || null,
        title: proposalTitle,
        content: proposalContent
      });
      setCurrentProposalId(data.id);
      setShareLink(`https://eventperfekt.net/share/proposal/${data.share_token}`);
      showToast("Proposal saved successfully");
    } catch (err: any) {
      showToast(err.message);
    }
    setSavingProposal(false);
  };

  const exportProposalAsPDF = async () => {
    if (!proposalTitle || !proposalContent) {
      showToast("Please create proposal content first");
      return;
    }
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
          <h1 style="color: #330311; margin-bottom: 20px;">${proposalTitle}</h1>
          <div style="white-space: pre-wrap; line-height: 1.6;">${proposalContent}</div>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666;">
            <p>Generated by Event Perfekt | ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      `;
      const element = document.createElement("div");
      element.innerHTML = html;
      document.body.appendChild(element);
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => {
        const opt = { margin: 10, filename: `${proposalTitle.replace(/[^a-z0-9]/gi, "_")}.pdf`, image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { orientation: "portrait", unit: "mm", format: "a4" } };
        (window as any).html2pdf().set(opt).from(element).save();
        document.body.removeChild(element);
        showToast("PDF exported successfully");
      };
      document.head.appendChild(script);
    } catch (err: any) {
      showToast("Failed to export PDF");
    }
  };

  const formatProposal = () => {
    if (!proposalContent) {
      showToast("Please add proposal content first");
      return;
    }
    const formatted = `PROPOSAL: ${proposalTitle.toUpperCase()}\n${"=".repeat(50)}\n\nEXECUTIVE SUMMARY\n${"-".repeat(20)}\n${proposalContent}\n\nIMPLEMENTATION TIMELINE\n${"-".repeat(20)}\n• Phase 1: Planning & Scoping\n• Phase 2: Execution\n• Phase 3: Review & Closure\n\nPRICING & COMMERCIAL TERMS\n${"-".repeat(20)}\n[Add pricing details]\n\nCONCLUSION\n${"-".repeat(20)}\nWe look forward to partnering with you on this initiative.\n\nGenerated by Event Perfekt Bid Writer`;
    setProposalContent(formatted);
    showToast("Proposal formatted with standard sections");
  };

  const copyShareLink = () => {
    if (!shareLink) {
      showToast("Save the proposal first to generate a share link");
      return;
    }
    navigator.clipboard.writeText(shareLink);
    showToast("Share link copied to clipboard");
  };


  const renderBidWriter = () => (
    <BidWriter
      tenders={tenders}
      selectedTenderForBid={selectedTenderForBid}
      tenderSections={tenderSections}
      extractedFacts={extractedFacts}
      generatingAll16={generatingAll16}
      scoringBid={scoringBid}
      generatingBid={generatingBid}
      tenderDetailsInput={tenderDetailsInput}
      questionsInput={questionsInput}
      answeringQuestions={answeringQuestions}
      questionsAnswer={questionsAnswer}
      analyzingGaps={analyzingGaps}
      showGapsPanel={showGapsPanel}
      bidGaps={bidGaps}
      dismissedGaps={dismissedGaps}
      sectionAttachedEvidence={sectionAttachedEvidence}
      generating={generating}
      expandedWeakPoints={expandedWeakPoints}
      improvingSection={improvingSection}
      scoringConfidence={scoringConfidence}
      chatSection={chatSection}
      chatHistory={chatHistory}
      chatLoading={chatLoading}
      chatInput={chatInput}
      proposalTitle={proposalTitle}
      proposalContent={proposalContent}
      savingProposal={savingProposal}
      shareLink={shareLink}
      showLessonModal={showLessonModal}
      lessonModalSection={lessonModalSection}
      lessonForm={lessonForm}
      savingLesson={savingLesson}
      evidencePickerSection={evidencePickerSection}
      loadingEvidence={loadingEvidence}
      evidenceSuggestions={evidenceSuggestions}
      allVaultDocs={allVaultDocs}
      attachingEvidence={attachingEvidence}
      setSelectedTenderForBid={setSelectedTenderForBid}
      setSelectedTender={setSelectedTender}
      setTenderDetailsInput={setTenderDetailsInput}
      setExtractedFacts={setExtractedFacts}
      setPackDocs={setPackDocs}
      setTenderSections={setTenderSections}
      setQuestionsInput={setQuestionsInput}
      setShowGapsPanel={setShowGapsPanel}
      setExpandedWeakPoints={setExpandedWeakPoints}
      setGovernanceActionModal={setGovernanceActionModal}
      setActiveTab={setActiveTab}
      setChatInput={setChatInput}
      setProposalTitle={setProposalTitle}
      setProposalContent={setProposalContent}
      setShowLessonModal={setShowLessonModal}
      setLessonForm={setLessonForm}
      setEvidencePickerSection={setEvidencePickerSection}
      generateAll16Sections={generateAll16Sections}
      scoreBid={scoreBid}
      generateBidWithAI={generateBidWithAI}
      answerQuestions={answerQuestions}
      showToast={showToast}
      analyzeGaps={analyzeGaps}
      dismissGap={dismissGap}
      generateSection={generateSection}
      openLessonModal={openLessonModal}
      improveSection={improveSection}
      scoreConfidence={scoreConfidence}
      openEvidencePicker={openEvidencePicker}
      openChat={openChat}
      openSubmitModal={openSubmitModal}
      removeAttachedEvidence={removeAttachedEvidence}
      sendChatMessage={sendChatMessage}
      saveProposal={saveProposal}
      formatProposal={formatProposal}
      exportProposalAsPDF={exportProposalAsPDF}
      copyShareLink={copyShareLink}
      saveLessonFromSection={saveLessonFromSection}
      attachEvidence={attachEvidence}
    />
  );

  const renderGovernance = () => {
    const filtered = governanceFilter === "all" ? governanceSections : governanceSections.filter(s => s.governance_status === governanceFilter);
    return (
      <div style={{ display: "grid", gap: 20 }}>
        {/* Header stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {[
            { label: "All Sections", count: governanceSections.length, color: BLUE },
            { label: "In Review", count: governanceSections.filter(s => s.governance_status === "awaiting_review").length, color: GOLD },
            { label: "Approved", count: governanceSections.filter(s => s.governance_status === "approved").length, color: "#10b981" },
            { label: "Changes Req.", count: governanceSections.filter(s => s.governance_status === "changes_requested").length, color: "#f59e0b" },
            { label: "Rejected", count: governanceSections.filter(s => s.governance_status === "rejected").length, color: "#ef4444" },
          ].map((s, i) => (
            <div key={i} style={{ ...card(), textAlign: "center", cursor: "pointer", border: `1px solid ${governanceFilter === (i === 0 ? "all" : s.label === "In Review" ? "awaiting_review" : s.label.toLowerCase().replace(/ /g, "_").replace(".", "")) ? s.color : BORDER}` }}
              onClick={() => setGovernanceFilter(i === 0 ? "all" : s.label === "In Review" ? "awaiting_review" : s.label === "Approved" ? "approved" : s.label === "Changes Req." ? "changes_requested" : "rejected")}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sections table */}
        <div style={{ ...card(), padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ color: "#fff", margin: 0, fontSize: 15 }}>🏛️ Bid Governance Queue</h3>
            <button onClick={loadGovernance} disabled={loadingGovernance} style={{ ...btn("transparent"), color: BLUE, fontSize: 12, padding: "4px 8px" }}>{loadingGovernance ? "Loading..." : "↻ Refresh"}</button>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, color: "#475569", textAlign: "center" }}>No sections in this state. Submit sections from the Bid Writer tab to start governance review.</div>
          ) : filtered.map((sec: any) => (
            <div key={sec.id} style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{sec.section_label}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: `${governanceStatusColor(sec.governance_status)}20`, color: governanceStatusColor(sec.governance_status), fontWeight: 600 }}>
                    {governanceBadge(sec.governance_status)}
                  </span>
                  {sec.version > 1 && <span style={{ fontSize: 10, color: "#6366f1" }}>v{sec.version}</span>}
                </div>
                <div style={{ color: "#64748b", fontSize: 11 }}>{sec.tender_title} · {sec.buyer} · {sec.word_count} words · {fmtDate(sec.updated_at)}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {sec.governance_status === "awaiting_review" && user?.access_level === "full" && (
                  <>
                    <button onClick={() => { setGovernanceActionModal(sec); setGovernanceNotes(""); }} style={{ ...btn("#6366f1"), color: "#fff", fontSize: 11, padding: "6px 12px" }}>Review</button>
                  </>
                )}
                {sec.governance_status !== "awaiting_review" && sec.governance_status !== "not_submitted" && (
                  <button onClick={() => submitToGovernance(sec.id)} style={{ ...btn("rgba(255,255,255,0.07)"), color: "#94a3b8", fontSize: 11, padding: "6px 12px" }}>Resubmit</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Audit Log */}
        <div style={{ ...card(), padding: 16 }}>
          <h3 style={{ color: "#fff", margin: "0 0 12px", fontSize: 15 }}>📋 Governance Audit Log</h3>
          {governanceLog.slice(0, 20).map((log: any, i: number) => (
            <div key={i} style={{ padding: "6px 0", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 10, color: "#475569", minWidth: 80 }}>{fmtDate(log.timestamp)}</div>
              <div>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>{log.section_name}</span>
                <span style={{ color: "#94a3b8", fontSize: 12 }}> — {log.action.replace(/_/g, " ")}</span>
                {log.notes && <div style={{ color: "#64748b", fontSize: 11, marginTop: 2, fontStyle: "italic" }}>"{log.notes}"</div>}
                <div style={{ color: "#475569", fontSize: 10 }}>{log.performed_by}</div>
              </div>
            </div>
          ))}
          {governanceLog.length === 0 && <div style={{ color: "#475569", fontSize: 13 }}>No governance actions yet.</div>}
        </div>

        {/* Action Modal */}
        {governanceActionModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "#1e293b", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, maxWidth: 600, width: "90%", maxHeight: "80vh", overflow: "auto" }}>
              <h3 style={{ color: "#fff", margin: "0 0 4px", fontSize: 16 }}>Review: {governanceActionModal.section_label}</h3>
              <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 16 }}>{governanceActionModal.tender_title} · {governanceActionModal.word_count} words</div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 12, marginBottom: 16, maxHeight: 200, overflow: "auto" }}>
                <pre style={{ color: "#cbd5e1", fontSize: 12, margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{governanceActionModal.content}</pre>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={label()}>REVIEWER NOTES (required for changes / rejection)</label>
                <textarea value={governanceNotes} onChange={e => setGovernanceNotes(e.target.value)} style={{ ...input(), minHeight: 80 }} placeholder="Provide feedback for the writer..." />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setGovernanceActionModal(null)} style={{ ...btn("rgba(255,255,255,0.07)"), color: "#94a3b8" }}>Cancel</button>
                <button onClick={() => doGovernanceAction(governanceActionModal.id, "request_changes")} style={{ ...btn("#f59e0b"), color: "#000", fontWeight: 600 }}>Request Changes</button>
                <button onClick={() => doGovernanceAction(governanceActionModal.id, "reject")} style={{ ...btn("#ef4444"), color: "#fff", fontWeight: 600 }}>Reject</button>
                <button onClick={() => doGovernanceAction(governanceActionModal.id, "approve")} style={{ ...btn("#10b981"), color: "#fff", fontWeight: 700 }}>✓ Approve</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAutomation = () => {
    const lastRunOf = (keys: string[]) => automationLog.find((l: any) => keys.includes(l.action));
    const SCHEDULED_JOBS = [
      { keys: ["scheduled_discovery", "discovery_run"], title: "🔍 Auto Tender Discovery", cadence: "Every 6 hours", color: BLUE },
      { keys: ["scheduled_morning_briefing", "morning_briefing"], title: "☀️ Morning Briefing", cadence: "Daily · 07:00 UK", color: GOLD },
      { keys: ["deadline_alerts"], title: "⏰ Deadline Alerts", cadence: "Daily · 07:30 UK", color: "#ef4444" },
    ];
    return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Scheduled Jobs — server-side cadence + last run from the automation log */}
      <div style={{ ...card(), padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ color: "#fff", margin: 0, fontSize: 15 }}>🗓️ Scheduled Jobs</h3>
          <span style={{ color: "#64748b", fontSize: 11 }}>Runs automatically on the server · trigger manually below</span>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {SCHEDULED_JOBS.map(job => {
            const last = lastRunOf(job.keys);
            return (
              <div key={job.title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, borderLeft: `3px solid ${job.color}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{job.title}</div>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{job.cadence}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {last ? (
                    <>
                      <div style={{ color: "#cbd5e1", fontSize: 11 }}>Last run {fmtDate(last.timestamp)}</div>
                      <div style={{ color: "#64748b", fontSize: 11, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{last.result}</div>
                    </>
                  ) : (
                    <span style={{ color: "#475569", fontSize: 11 }}>No runs recorded yet</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ color: "#64748b", fontSize: 11, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
          📧 Daily digest: <span style={{ color: searchConfig?.digest_enabled ? "#10b981" : "#94a3b8" }}>{searchConfig?.digest_enabled ? "Enabled" : "Disabled"}</span>
          {searchConfig?.digest_email ? ` → ${searchConfig.digest_email}` : ""}
          <button onClick={() => setActiveTab("settings")} style={{ ...btn("transparent"), color: BLUE, fontSize: 11, padding: "0 0 0 8px" }}>Edit →</button>
        </div>
      </div>

      {/* Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { id: "run-discovery", title: "🔍 Tender Discovery", desc: `Scan Contracts Finder for ${country === "NG" ? "Nigerian" : "UK"} tenders matching your search profile. Auto-scores and adds high-fit tenders to pipeline.`, color: BLUE },
          { id: "morning-briefing", title: "☀️ Morning Briefing", desc: "Send today's pipeline summary, upcoming deadlines, and EP Agent recommendations to the admin inbox.", color: GOLD },
          { id: "deadline-alerts", title: "⏰ Deadline Alerts", desc: "Send urgent deadline notifications for tenders due within 1, 3, and 7 days.", color: "#ef4444" },
        ].map(a => (
          <div key={a.id} style={{ ...card(), borderLeft: `4px solid ${a.color}` }}>
            <h3 style={{ color: "#fff", margin: "0 0 8px", fontSize: 15 }}>{a.title}</h3>
            <p style={{ color: "#94a3b8", fontSize: 12, margin: "0 0 16px", lineHeight: 1.5 }}>{a.desc}</p>
            <button onClick={() => runAutomationAction(a.id)} disabled={runningAction === a.id} style={{ ...btn(a.color), color: a.color === GOLD ? "#000" : "#fff", fontWeight: 700, width: "100%" }}>
              {runningAction === a.id ? "⏳ Running..." : "Run Now"}
            </button>
          </div>
        ))}
      </div>

      {/* Fit Scores */}
      {fitScores.length > 0 && (
        <div style={{ ...card(), padding: 16 }}>
          <h3 style={{ color: "#fff", margin: "0 0 12px", fontSize: 15 }}>🎯 Tender Fit Scores</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {fitScores.slice(0, 20).map((s: any) => (
              <div key={s.id} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{s.tender_title || s.tender_id}</div>
                  <div style={{ color: "#94a3b8", fontSize: 11 }}>{s.buyer} · {fmtDate(s.deadline)} · {s.reasoning?.slice(0, 80)}...</div>
                </div>
                <div style={{ textAlign: "center", marginLeft: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.score >= 75 ? "#10b981" : s.score >= 50 ? GOLD : "#ef4444" }}>{s.score}</div>
                  <div style={{ fontSize: 10, color: "#475569" }}>{s.recommendation}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Automation Log */}
      <div style={{ ...card(), padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ color: "#fff", margin: 0, fontSize: 15 }}>📋 Automation Run Log</h3>
          <button onClick={loadAutomationLog} disabled={loadingAutomation} style={{ ...btn("transparent"), color: BLUE, fontSize: 12, padding: "4px 8px" }}>{loadingAutomation ? "..." : "↻ Refresh"}</button>
        </div>
        {automationLog.length === 0 ? (
          <div style={{ color: "#475569", fontSize: 13 }}>No automation runs yet. Use the actions above to start.</div>
        ) : automationLog.slice(0, 30).map((log: any, i: number) => (
          <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 10, color: "#475569", minWidth: 100 }}>{fmtDate(log.timestamp)}</div>
            <div style={{ fontSize: 12, color: "#fff", fontWeight: 500 }}>{log.action?.replace(/_/g, " ")}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{log.result}</div>
            {log.email_sent && <span style={{ fontSize: 10, color: "#10b981", marginLeft: "auto" }}>✉ sent</span>}
          </div>
        ))}
      </div>
    </div>
    );
  };

  const renderAiUsage = () => {
    const usd = (v: any) => `$${(Number(v) || 0).toFixed(2)}`;
    const spent = Number(aiUsage?.month_to_date_cost) || 0;
    const ceiling = aiUsage?.ceiling != null ? Number(aiUsage.ceiling) : null;
    const blocked = !!aiUsage?.blocked;
    const pct = ceiling && ceiling > 0 ? Math.min(100, Math.round((spent / ceiling) * 100)) : null;
    const features: any[] = aiUsage?.by_feature || [];
    const barColor = blocked ? "#ef4444" : pct != null && pct >= 80 ? GOLD : "#10b981";
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>💰 AI Usage & Cost <span style={{ color: "#64748b", fontSize: 13, fontWeight: 400 }}>· this month</span></h2>
          <button onClick={loadAiUsage} disabled={loadingAiUsage} style={{ ...btn("transparent"), color: BLUE, fontSize: 12, padding: "4px 8px" }}>{loadingAiUsage ? "..." : "↻ Refresh"}</button>
        </div>

        {blocked && (
          <div style={{ ...card(), borderLeft: "4px solid #ef4444", background: "rgba(239,68,68,0.08)", padding: 16 }}>
            <div style={{ color: "#fca5a5", fontSize: 14, fontWeight: 700 }}>⛔ Monthly AI spend cap reached</div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>New AI generations are paused until next month or until you raise the cap below.</div>
          </div>
        )}

        {/* Spend summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <div style={{ ...card(), padding: 16 }}>
            <div style={label()}>SPENT THIS MONTH</div>
            <div style={{ color: "#fff", fontSize: 28, fontWeight: 800 }}>{usd(spent)}</div>
          </div>
          <div style={{ ...card(), padding: 16 }}>
            <div style={label()}>MONTHLY CAP</div>
            <div style={{ color: ceiling == null ? "#64748b" : "#fff", fontSize: 28, fontWeight: 800 }}>{ceiling == null ? "No cap" : usd(ceiling)}</div>
          </div>
          <div style={{ ...card(), padding: 16 }}>
            <div style={label()}>REMAINING</div>
            <div style={{ color: ceiling == null ? "#64748b" : blocked ? "#ef4444" : "#10b981", fontSize: 28, fontWeight: 800 }}>{ceiling == null ? "—" : usd(Math.max(0, ceiling - spent))}</div>
          </div>
        </div>

        {/* Usage bar */}
        {pct != null && (
          <div style={{ ...card(), padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>{pct}% of cap used</span>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>{usd(spent)} / {usd(ceiling)}</span>
            </div>
            <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: barColor, transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* Cap control */}
        <div style={{ ...card() }}>
          <label style={label()}>SET MONTHLY SPEND CAP (USD)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            <input type="number" min="0" step="1" value={ceilingInput} onChange={e => setCeilingInput(e.target.value)} placeholder="e.g. 50 — leave blank for no cap" style={{ ...input(), maxWidth: 320 }} />
            <button onClick={saveAiCeiling} disabled={savingCeiling} style={btn(BLUE)}>{savingCeiling ? "Saving..." : "Save Cap"}</button>
            {ceilingInput.trim() !== "" && <button onClick={() => { setCeilingInput(""); }} style={{ ...btn("transparent"), color: "#94a3b8" }}>Clear</button>}
          </div>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 6 }}>When spend reaches the cap, AI generations are blocked until the next calendar month. Leave blank and Save to remove the cap.</div>
        </div>

        {/* Per-feature breakdown */}
        <div style={{ ...card(), padding: 16 }}>
          <h3 style={{ color: "#fff", margin: "0 0 12px", fontSize: 15 }}>Breakdown by Feature</h3>
          {features.length === 0 ? (
            <div style={{ color: "#475569", fontSize: 13 }}>{loadingAiUsage ? "Loading…" : "No AI usage recorded this month yet."}</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "0 8px 6px", color: "#64748b", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
                <span>FEATURE</span><span style={{ textAlign: "right" }}>CALLS</span><span style={{ textAlign: "right" }}>TOKENS</span><span style={{ textAlign: "right" }}>COST</span>
              </div>
              {features.map((f: any, i: number) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "8px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 13, alignItems: "center" }}>
                  <span style={{ color: "#fff" }}>{(f.feature || "unknown").replace(/_/g, " ")}</span>
                  <span style={{ color: "#94a3b8", textAlign: "right" }}>{Number(f.calls || 0).toLocaleString()}</span>
                  <span style={{ color: "#94a3b8", textAlign: "right" }}>{Number(f.tokens || 0).toLocaleString()}</span>
                  <span style={{ color: "#fff", textAlign: "right", fontWeight: 600 }}>{usd(f.cost)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div style={{ display: "grid", gap: 16 }}>
      <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>Search & Digest Settings</h2>
      <div style={{ ...card() }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={label()}>SEARCH KEYWORDS</label>
            <div style={{ color: "#fff", fontSize: 13 }}>{(searchConfig?.keywords || []).join(", ") || "Not configured"}</div>
          </div>
          <div>
            <label style={label()}>CATEGORIES</label>
            <div style={{ color: "#fff", fontSize: 13 }}>{(searchConfig?.categories || []).join(", ") || "Not configured"}</div>
          </div>
          <div>
            <label style={label()}>COUNTRIES</label>
            <div style={{ color: "#fff", fontSize: 13 }}>{(searchConfig?.countries || []).join(", ") || "Not configured"}</div>
          </div>
          <div>
            <label style={label()}>DAILY DIGEST EMAIL</label>
            <div style={{ color: "#fff", fontSize: 13 }}>{searchConfig?.digest_email || "-"} {searchConfig?.digest_enabled ? "✅ Enabled" : "❌ Disabled"}</div>
          </div>
          <button onClick={() => { setConfigForm({ keywords: (searchConfig?.keywords || []).join(", "), categories: (searchConfig?.categories || []).join(", "), countries: (searchConfig?.countries || []).join(", "), digest_email: searchConfig?.digest_email || "", digest_enabled: searchConfig?.digest_enabled !== false }); setActiveTab("finder"); setShowConfigEdit(true); }} style={btn(BLUE)}>Edit Settings in Tender Finder</button>
        </div>
      </div>
    </div>
  );

  const renderTeam = () => (
    <div style={{ display: "grid", gap: 16 }}>
      <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>Team Members ({users.length})</h2>
      <div style={{ display: "grid", gap: 8 }}>
        {users.map(u => (
          <div key={u.id} style={{ ...card(), padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{u.email} · {u.role}</div>
                {u.certifications && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {u.certifications.split(",").map((cert: string) => (
                      <span key={cert} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: cert.includes("Cyber") ? "rgba(139,92,246,0.2)" : "rgba(59,130,246,0.2)", color: cert.includes("Cyber") ? "#c084fc" : "#60a5fa" }}>
                        {cert.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: u.access_level === "full" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.1)", color: u.access_level === "full" ? "#10b981" : "#94a3b8" }}>{u.access_level}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderKnowledgeBase = () => (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Learning Vault */}
      <div style={{ ...card(), borderLeft: `4px solid ${GOLD}`, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>🏆 Win/Loss Learning Vault</h2>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: 12 }}>Bid outcomes, lessons learned, and score analysis — EP Agent uses this to improve future bids</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={loadLearningVault} disabled={loadingVault} style={{ ...btn("transparent"), color: BLUE, fontSize: 12, padding: "6px 12px" }}>{loadingVault ? "..." : "↻ Refresh"}</button>
            <button onClick={() => setShowVaultForm(!showVaultForm)} style={{ ...btn(GOLD), color: "#000", fontWeight: 700, fontSize: 12 }}>+ Add Entry</button>
          </div>
        </div>

        {/* Add Entry Form */}
        {showVaultForm && (
          <div style={{ padding: 16, background: "rgba(255,255,255,0.04)", borderRadius: 10, marginBottom: 16, display: "grid", gap: 10 }}>
            <h3 style={{ color: "#fff", margin: "0 0 8px", fontSize: 14 }}>New Learning Vault Entry</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={label()}>TENDER NAME</label><input value={vaultForm.tender_name} onChange={e => setVaultForm({ ...vaultForm, tender_name: e.target.value })} style={input()} placeholder="GM BGH Conference" /></div>
              <div><label style={label()}>REFERENCE</label><input value={vaultForm.reference} onChange={e => setVaultForm({ ...vaultForm, reference: e.target.value })} style={input()} placeholder="REF-2025-001" /></div>
              <div><label style={label()}>BUYER</label><input value={vaultForm.buyer} onChange={e => setVaultForm({ ...vaultForm, buyer: e.target.value })} style={input()} placeholder="Greater Manchester" /></div>
              <div><label style={label()}>OUTCOME</label><select value={vaultForm.outcome} onChange={e => setVaultForm({ ...vaultForm, outcome: e.target.value })} style={{ ...input(), cursor: "pointer" }}><option value="">Select...</option><option>Won</option><option>Lost</option><option>No Bid</option><option>Pending</option></select></div>
              <div><label style={label()}>OUR SCORE</label><input type="number" value={vaultForm.our_score} onChange={e => setVaultForm({ ...vaultForm, our_score: e.target.value })} style={input()} placeholder="86" /></div>
              <div><label style={label()}>WINNER SCORE</label><input type="number" value={vaultForm.winner_score} onChange={e => setVaultForm({ ...vaultForm, winner_score: e.target.value })} style={input()} placeholder="88" /></div>
            </div>
            <div><label style={label()}>LESSONS LEARNED</label><textarea value={vaultForm.lessons} onChange={e => setVaultForm({ ...vaultForm, lessons: e.target.value })} style={{ ...input(), minHeight: 80 }} placeholder="Key lessons from this bid outcome..." /></div>
            <div><label style={label()}>FEEDBACK RECEIVED</label><textarea value={vaultForm.feedback_text} onChange={e => setVaultForm({ ...vaultForm, feedback_text: e.target.value })} style={{ ...input(), minHeight: 60 }} placeholder="Official feedback from the buyer..." /></div>
            <div><label style={label()}>WHAT WE'D DO DIFFERENTLY</label><textarea value={vaultForm.what_to_do_differently} onChange={e => setVaultForm({ ...vaultForm, what_to_do_differently: e.target.value })} style={{ ...input(), minHeight: 60 }} placeholder="Action items for future bids..." /></div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowVaultForm(false)} style={{ ...btn("rgba(255,255,255,0.07)"), color: "#94a3b8" }}>Cancel</button>
              <button onClick={saveVaultEntry} style={{ ...btn(GOLD), color: "#000", fontWeight: 700 }}>Save Entry</button>
            </div>
          </div>
        )}

        {/* Record Outcome for tender */}
        <div style={{ marginBottom: 12, padding: 10, background: "rgba(59,130,246,0.06)", borderRadius: 8 }}>
          <div style={{ color: "#60a5fa", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Quick Outcome — from Pipeline</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select onChange={e => { const t = tenders.find((tn: any) => tn.id === parseInt(e.target.value)); setOutcomeModal(t || null); }} style={{ ...input(), flex: 1, cursor: "pointer" }}>
              <option value="">Select submitted tender to record outcome...</option>
              {tenders.filter((t: any) => ["Submitted", "Won", "Lost"].includes(t.status)).map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        </div>

        {/* Vault Entries */}
        {learningVault.length === 0 && !loadingVault && <div style={{ color: "#475569", fontSize: 13 }}>No vault entries yet. Add your first win/loss record above.</div>}
        <div style={{ display: "grid", gap: 10 }}>
          {learningVault.map((entry: any) => (
            <div key={entry.id} style={{ border: `1px solid ${entry.outcome === "Won" ? "rgba(16,185,129,0.3)" : entry.outcome === "Lost" ? "rgba(239,68,68,0.3)" : BORDER}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{entry.tender_name}</div>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{entry.buyer} · {entry.reference} · {fmtDate(entry.date)}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: entry.outcome === "Won" ? "rgba(16,185,129,0.2)" : entry.outcome === "Lost" ? "rgba(239,68,68,0.2)" : "rgba(100,116,139,0.2)", color: entry.outcome === "Won" ? "#10b981" : entry.outcome === "Lost" ? "#ef4444" : "#94a3b8" }}>{entry.outcome || "Pending"}</div>
                  {entry.our_score && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>Us: {entry.our_score}{entry.winner_score ? ` / Winner: ${entry.winner_score}` : ""}</div>}
                </div>
              </div>
              {entry.lessons && <div style={{ marginTop: 10, padding: 10, background: "rgba(245,158,11,0.06)", borderRadius: 6, color: "#cbd5e1", fontSize: 12, lineHeight: 1.6 }}><span style={{ color: GOLD, fontWeight: 600 }}>Lessons: </span>{entry.lessons}</div>}
              {entry.what_to_do_differently && <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 12 }}><span style={{ color: "#60a5fa", fontWeight: 600 }}>Next time: </span>{entry.what_to_do_differently}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Outcome Modal */}
      {outcomeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#1e293b", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, maxWidth: 520, width: "90%" }}>
            <h3 style={{ color: "#fff", margin: "0 0 4px", fontSize: 16 }}>Record Outcome: {outcomeModal.title}</h3>
            <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 16 }}>{outcomeModal.buyer} · {fmtDate(outcomeModal.deadline)}</div>
            <div style={{ display: "grid", gap: 10 }}>
              <div><label style={label()}>OUTCOME</label><select value={outcomeForm.outcome} onChange={e => setOutcomeForm({ ...outcomeForm, outcome: e.target.value })} style={{ ...input(), cursor: "pointer" }}><option value="">Select...</option><option>Won</option><option>Lost</option><option>Declined</option><option>Withdrawn</option></select></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={label()}>OUR SCORE (%)</label><input type="number" value={outcomeForm.our_score} onChange={e => setOutcomeForm({ ...outcomeForm, our_score: e.target.value })} style={input()} placeholder="86" /></div>
                <div><label style={label()}>WINNER SCORE (%)</label><input type="number" value={outcomeForm.winner_score} onChange={e => setOutcomeForm({ ...outcomeForm, winner_score: e.target.value })} style={input()} placeholder="88" /></div>
              </div>
              <div><label style={label()}>OFFICIAL FEEDBACK</label><textarea value={outcomeForm.feedback_text} onChange={e => setOutcomeForm({ ...outcomeForm, feedback_text: e.target.value })} style={{ ...input(), minHeight: 80 }} placeholder="Paste buyer feedback letter / debrief notes..." /></div>
              <div><label style={label()}>WHAT WE'D DO DIFFERENTLY</label><textarea value={outcomeForm.what_to_do_differently} onChange={e => setOutcomeForm({ ...outcomeForm, what_to_do_differently: e.target.value })} style={{ ...input(), minHeight: 60 }} placeholder="Specific improvements for next bid..." /></div>
              <p style={{ color: "#60a5fa", fontSize: 11, margin: 0 }}>💡 EP Agent will auto-extract lessons from your feedback and save to the vault</p>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setOutcomeModal(null)} style={{ ...btn("rgba(255,255,255,0.07)"), color: "#94a3b8" }}>Cancel</button>
              <button onClick={submitOutcome} disabled={submittingOutcome || !outcomeForm.outcome} style={{ ...btn(GOLD), color: "#000", fontWeight: 700 }}>{submittingOutcome ? "Saving..." : "Save Outcome"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bid Writing Knowledge Base */}
      <div style={{ ...card(), padding: 24 }}>
        <TenderKnowledgeBase />
      </div>
    </div>
  );

  const BADGE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
    mandatory: { bg: "rgba(239,68,68,0.18)", color: "#f87171", label: "MANDATORY" },
    scored: { bg: "rgba(59,130,246,0.18)", color: "#60a5fa", label: "SCORED" },
    certification: { bg: "rgba(245,158,11,0.18)", color: "#fbbf24", label: "CERTIFICATION" },
  };

  const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
    not_started: { bg: "rgba(100,116,139,0.2)", color: "#94a3b8", label: "Not Started" },
    in_progress: { bg: "rgba(245,158,11,0.2)", color: "#fbbf24", label: "In Progress" },
    compliant: { bg: "rgba(16,185,129,0.2)", color: "#10b981", label: "Compliant" },
    not_applicable: { bg: "rgba(100,116,139,0.12)", color: "#64748b", label: "N/A" },
  };

  const COMPLIANCE_CATEGORIES = ["all", "Legal & Corporate Governance", "Financial & Insurance", "Quality Management", "Equality, Diversity & Inclusion", "Health & Safety", "Environmental & Sustainability", "Data Protection & Cyber Security", "Anti-Fraud & Ethics"];

  const renderCompliance = () => {
    const mandatoryDone = complianceStats?.mandatory?.done || 0;
    const mandatoryTotal = complianceStats?.mandatory?.total || 0;
    const mandatoryPct = mandatoryTotal > 0 ? Math.round((mandatoryDone / mandatoryTotal) * 100) : 0;
    const byStatus = complianceStats?.byStatus || [];
    const compliantCount = byStatus.find((s: any) => s.status === "compliant")?.count || 0;
    const total = complianceStats?.total || 48;

    const filteredProtocols = protocols.filter((p: any) => {
      const catOk = protocolCategory === "all" || p.category === protocolCategory;
      const statusOk = complianceFilter === "all" || p.org_status === complianceFilter;
      return catOk && statusOk;
    });

    const grouped: Record<string, any[]> = {};
    filteredProtocols.forEach((p: any) => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });

    if (viewingDoc) {
      const docByName = complianceDocs.filter(d => d.document_name === viewingDoc.document_name).sort((a, b) => parseFloat(b.version) - parseFloat(a.version));
      return (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setViewingDoc(null)} style={{ ...btn("rgba(255,255,255,0.08)"), fontSize: 12 }}>← Back</button>
            <div>
              <h2 style={{ color: "#fff", margin: 0, fontSize: 18 }}>{viewingDoc.document_name}</h2>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>Version {viewingDoc.version} · {viewingDoc.status} · Created {fmtDate(viewingDoc.created_at)}</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button onClick={() => downloadDoc(viewingDoc)} style={btn(BLUE)}>Download .txt</button>
              {viewingDoc.status !== "approved" && (
                <button onClick={() => approveDoc(viewingDoc.id, user?.name || user?.email)} style={btn("#10b981")}>Approve Document</button>
              )}
            </div>
          </div>

          {/* Version history */}
          {docByName.length > 1 && (
            <div style={{ ...card(), padding: 12 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>VERSION HISTORY</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {docByName.map((d: any) => (
                  <button key={d.id} onClick={() => setViewingDoc(d)} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${d.id === viewingDoc.id ? BLUE : BORDER}`, background: d.id === viewingDoc.id ? "rgba(59,130,246,0.15)" : "transparent", color: d.id === viewingDoc.id ? "#60a5fa" : "#94a3b8", fontSize: 12, cursor: "pointer" }}>
                    v{d.version} · {d.status} · {fmtDate(d.created_at)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Document content */}
          <div style={{ ...card(), padding: 24 }}>
            <div style={{ background: "#fff", borderRadius: 8, padding: 32, color: "#1e293b", fontFamily: "'Poppins', sans-serif", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: "70vh", overflow: "auto" }}>
              <div style={{ textAlign: "center", marginBottom: 24, borderBottom: "2px solid #1e293b", paddingBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#64748b", marginBottom: 4 }}>{profile?.company_name || "COMPANY NAME"}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{viewingDoc.document_name}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Version {viewingDoc.version} | {viewingDoc.status === "approved" ? `Approved by ${viewingDoc.approved_by}` : "Draft"} | Review Due: {fmtDate(viewingDoc.review_due)}</div>
              </div>
              {viewingDoc.content || "No content generated yet."}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gap: 20 }}>
        {/* Header + stats */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ color: "#fff", margin: 0, fontSize: 20, fontWeight: 700 }}>Government Compliance Hub</h2>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>48 protocols across 8 categories for UK public sector tendering</div>
          </div>
          <button onClick={loadComplianceData} style={{ ...btn("rgba(255,255,255,0.08)"), fontSize: 12 }}>{loadingCompliance ? "Refreshing..." : "Refresh"}</button>
        </div>

        {/* Compliance scorecard */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Mandatory Compliant", value: `${mandatoryDone}/${mandatoryTotal}`, sub: `${mandatoryPct}% complete`, color: mandatoryPct === 100 ? "#10b981" : mandatoryPct > 50 ? GOLD : "#f87171", urgent: true },
            { label: "Total Compliant", value: `${compliantCount}/${total}`, sub: "protocols met", color: "#10b981", urgent: false },
            { label: "Policy Documents", value: complianceDocs.filter(d => d.status !== "superseded").length, sub: `${complianceDocs.filter(d => d.status === "approved").length} approved`, color: BLUE, urgent: false },
            { label: "Cyber Essentials", value: protocols.find(p => p.name === "Cyber Essentials Certification")?.org_status === "compliant" ? "✓ Done" : "⚠ Pending", sub: "critical for gov contracts", color: PURPLE, urgent: true },
          ].map((s, i) => (
            <div key={i} style={{ ...card(), padding: 16, borderLeft: `3px solid ${s.color}` }}>
              <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{s.label.toUpperCase()}</div>
              <div style={{ color: s.color, fontSize: 22, fontWeight: 800 }}>{s.value}</div>
              <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Priority alert bar */}
        {mandatoryDone < mandatoryTotal && (
          <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>🚨</span>
            <div>
              <div style={{ color: "#f87171", fontWeight: 700, fontSize: 13 }}>{mandatoryTotal - mandatoryDone} Mandatory Protocol{mandatoryTotal - mandatoryDone !== 1 ? "s" : ""} Outstanding</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>Government buyers can disqualify submissions that fail mandatory requirements. Address these immediately.</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 4 }}>
            {["all", "not_started", "in_progress", "compliant", "not_applicable"].map(s => (
              <button key={s} onClick={() => setComplianceFilter(s)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: complianceFilter === s ? BLUE : "transparent", color: complianceFilter === s ? "#fff" : "#94a3b8", fontSize: 12, cursor: "pointer", fontWeight: complianceFilter === s ? 600 : 400 }}>
                {s === "all" ? "All" : STATUS_COLORS[s]?.label || s}
              </button>
            ))}
          </div>
          <select value={protocolCategory} onChange={e => setProtocolCategory(e.target.value)} style={{ ...input(), width: "auto", padding: "6px 12px" }}>
            {COMPLIANCE_CATEGORIES.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
          </select>
        </div>

        {/* Protocol list grouped by category */}
        {loadingCompliance ? (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Loading compliance protocols...</div>
        ) : (
          Object.entries(grouped).map(([cat, prots]) => (
            <div key={cat} style={{ display: "grid", gap: 8 }}>
              <div style={{ color: "#60a5fa", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, padding: "4px 0", borderBottom: `1px solid ${BORDER}` }}>
                {cat.toUpperCase()} ({prots.length})
              </div>
              {prots.map((p: any) => {
                const badge = BADGE_COLORS[p.badge_type] || BADGE_COLORS.mandatory;
                const statusStyle = STATUS_COLORS[p.org_status] || STATUS_COLORS.not_started;
                const isExpanded = selectedProtocol?.id === p.id;
                const docVersions = complianceDocs.filter(d => d.document_name === p.document_template && d.status !== "superseded");
                const latestDoc = docVersions[0];
                const isGenerating = generatingDoc === p.document_template;

                return (
                  <div key={p.id} style={{ ...card(), padding: 0, overflow: "hidden", border: `1px solid ${p.org_status === "compliant" ? "rgba(16,185,129,0.3)" : p.badge_type === "mandatory" && p.org_status === "not_started" ? "rgba(239,68,68,0.2)" : BORDER}` }}>
                    <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setSelectedProtocol(isExpanded ? null : p)}>
                      {/* Status dot */}
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusStyle.color, flexShrink: 0 }} />
                      {/* Name + badges */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                          <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color }}>{badge.label}</span>
                          {latestDoc && <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: latestDoc.status === "approved" ? "rgba(16,185,129,0.2)" : "rgba(59,130,246,0.15)", color: latestDoc.status === "approved" ? "#10b981" : "#60a5fa" }}>v{latestDoc.version} {latestDoc.status}</span>}
                        </div>
                        <div style={{ color: "#64748b", fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</div>
                      </div>
                      {/* Status selector */}
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        {(["not_started", "in_progress", "compliant", "not_applicable"] as const).map(s => (
                          <button key={s} onClick={() => updateProtocolStatus(p.id, s)} title={STATUS_COLORS[s]?.label} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${p.org_status === s ? statusStyle.color : BORDER}`, background: p.org_status === s ? statusStyle.bg : "transparent", color: p.org_status === s ? statusStyle.color : "#64748b", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                            {s === "not_started" ? "—" : s === "in_progress" ? "▷" : s === "compliant" ? "✓" : "N"}
                          </button>
                        ))}
                      </div>
                      {/* Generate doc button */}
                      {p.document_template && (
                        <button onClick={e => { e.stopPropagation(); generateComplianceDoc(p.id, p.document_template); }} disabled={isGenerating} style={{ ...btn(isGenerating ? "#374151" : PURPLE), fontSize: 11, padding: "6px 10px", flexShrink: 0 }}>
                          {isGenerating ? "Generating..." : latestDoc ? "Regenerate" : "Generate Doc"}
                        </button>
                      )}
                      {latestDoc && (
                        <button onClick={e => { e.stopPropagation(); setViewingDoc(latestDoc); }} style={{ ...btn("rgba(255,255,255,0.08)"), fontSize: 11, padding: "6px 10px", flexShrink: 0 }}>View</button>
                      )}
                      <span style={{ color: "#64748b", fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</span>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${BORDER}` }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
                          <div>
                            <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>WHY IT MATTERS</div>
                            <div style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.6 }}>{p.rationale}</div>
                          </div>
                          <div>
                            <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>HOW TO ACTION</div>
                            <div style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.6 }}>{p.action_guide || "No specific action guide. See description."}</div>
                          </div>
                        </div>
                        {docVersions.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>DOCUMENT VERSIONS</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {complianceDocs.filter(d => d.document_name === p.document_template).map((d: any) => (
                                <button key={d.id} onClick={() => setViewingDoc(d)} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${d.status === "superseded" ? BORDER : d.status === "approved" ? "rgba(16,185,129,0.4)" : "rgba(59,130,246,0.3)"}`, background: "transparent", color: d.status === "superseded" ? "#475569" : d.status === "approved" ? "#10b981" : "#60a5fa", fontSize: 11, cursor: "pointer" }}>
                                  v{d.version} · {d.status} · {fmtDate(d.created_at)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Cyber Essentials callout */}
        {(protocolCategory === "all" || protocolCategory === "Data Protection & Cyber Security") && (
          <div style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.15))", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ fontSize: 32 }}>🛡️</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#c084fc", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Cyber Essentials — Priority Action</div>
                <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
                  Cyber Essentials is mandatory for any UK government contract involving handling of sensitive data. It is relatively quick and affordable to achieve (~£300–£500 for the basic certification). Many central government departments have required it since 2014. Without it, you will be filtered out at the SQ/PQQ stage before your bid is even read.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  {[
                    { step: "1", title: "Self-Assessment", desc: "Complete the online questionnaire covering 5 technical controls: firewalls, secure config, access control, malware protection, patch management." },
                    { step: "2", title: "Verification", desc: "Submit questionnaire to an IASME-accredited certification body who verifies your answers. Takes 1–5 days." },
                    { step: "3", title: "Certification", desc: "Receive Cyber Essentials certificate. Valid 12 months. Add to all PQQ/SQ submissions and company profile." },
                    { step: "4", title: "Upgrade to CE+", desc: "For higher-sensitivity contracts (MoD, HMRC, NHS), get Cyber Essentials Plus with independent technical audit." },
                  ].map(s => (
                    <div key={s.step} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 12 }}>
                      <div style={{ color: PURPLE, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Step {s.step}: {s.title}</div>
                      <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href="https://www.ncsc.gov.uk/cyberessentials/overview" target="_blank" rel="noopener noreferrer" style={{ ...btn(PURPLE), textDecoration: "none", fontSize: 12 }}>NCSC Cyber Essentials Guide</a>
                  <a href="https://iasme.co.uk/cyber-essentials/get-certified/" target="_blank" rel="noopener noreferrer" style={{ ...btn("rgba(255,255,255,0.08)"), textDecoration: "none", fontSize: 12, color: "#fff" }}>Find a Certification Body</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document library */}
        <div style={{ ...card() }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Policy Document Library</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>{complianceDocs.filter(d => d.status !== "superseded").length} active documents</div>
          </div>
          {complianceDocs.filter(d => d.status !== "superseded").length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: 20 }}>
              No documents generated yet. Click "Generate Doc" on any protocol above to create your first policy document.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {complianceDocs.filter(d => d.status !== "superseded").map((doc: any) => (
                <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 18 }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{doc.document_name}</div>
                    <div style={{ color: "#64748b", fontSize: 11 }}>v{doc.version} · {doc.status} · Review due {fmtDate(doc.review_due)}{doc.approved_by ? ` · Approved by ${doc.approved_by}` : ""}</div>
                  </div>
                  <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: doc.status === "approved" ? "rgba(16,185,129,0.2)" : doc.status === "under_review" ? "rgba(245,158,11,0.2)" : "rgba(59,130,246,0.15)", color: doc.status === "approved" ? "#10b981" : doc.status === "under_review" ? "#fbbf24" : "#60a5fa" }}>{doc.status}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setViewingDoc(doc)} style={{ ...btn("rgba(255,255,255,0.08)"), fontSize: 11, padding: "5px 10px" }}>View</button>
                    <button onClick={() => downloadDoc(doc)} style={{ ...btn(BLUE), fontSize: 11, padding: "5px 10px" }}>Download</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBidSecurity = () => {
    const coiRecords = bidSecurityRecords.filter(r => r.record_type === "coi_declaration");
    const versionRecords = bidSecurityRecords.filter(r => r.record_type === "bid_version");
    const conflicts = coiRecords.filter(r => r.has_conflict);

    return (
      <div style={{ display: "grid", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ color: "#fff", margin: 0, fontSize: 20, fontWeight: 700 }}>Bid Security</h2>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>Conflict of interest declarations and bid document version control</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setShowCoiForm(true); setShowBidVersionForm(false); }} style={btn(BLUE)}>+ COI Declaration</button>
            <button onClick={() => { setShowBidVersionForm(true); setShowCoiForm(false); }} style={btn(PURPLE)}>+ Log Bid Version</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Total Declarations", value: coiRecords.length, color: BLUE },
            { label: "Conflicts Declared", value: conflicts.length, color: conflicts.length > 0 ? "#f87171" : "#10b981" },
            { label: "Bid Versions Logged", value: versionRecords.length, color: PURPLE },
            { label: "Active Bids Tracked", value: new Set([...bidSecurityRecords.filter(r => r.tender_id).map(r => r.tender_id)]).size, color: GOLD },
          ].map((s, i) => (
            <div key={i} style={{ ...card(), padding: 16, borderLeft: `3px solid ${s.color}` }}>
              <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{s.label.toUpperCase()}</div>
              <div style={{ color: s.color, fontSize: 24, fontWeight: 800 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Conflict alert */}
        {conflicts.length > 0 && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px" }}>
            <div style={{ color: "#f87171", fontWeight: 700, marginBottom: 4 }}>⚠ {conflicts.length} Active Conflict(s) of Interest Declared</div>
            {conflicts.map((c: any) => (
              <div key={c.id} style={{ color: "#fca5a5", fontSize: 12, marginTop: 4 }}>
                {c.title} — {c.conflict_details}
              </div>
            ))}
            <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 8 }}>Ensure declared conflicts are managed and disclosed to the buyer as required. Undisclosed conflicts can result in disqualification and legal liability.</div>
          </div>
        )}

        {/* COI Declaration form */}
        {showCoiForm && (
          <div style={{ ...card(), border: "1px solid rgba(59,130,246,0.3)" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>New Conflict of Interest Declaration</div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={label()}>TENDER (optional)</label>
                <select value={coiForm.tender_id} onChange={e => setCoiForm({ ...coiForm, tender_id: e.target.value })} style={input()}>
                  <option value="">-- Not specific to a tender --</option>
                  {tenders.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div>
                <label style={label()}>DECLARED BY</label>
                <input value={coiForm.declared_by} onChange={e => setCoiForm({ ...coiForm, declared_by: e.target.value })} placeholder={user?.name || user?.email} style={input()} />
              </div>
              <div>
                <label style={{ ...label(), display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={coiForm.has_conflict} onChange={e => setCoiForm({ ...coiForm, has_conflict: e.target.checked })} style={{ width: 16, height: 16 }} />
                  <span>I have a conflict of interest to declare</span>
                </label>
              </div>
              {coiForm.has_conflict && (
                <div>
                  <label style={label()}>NATURE OF CONFLICT</label>
                  <textarea value={coiForm.conflict_details} onChange={e => setCoiForm({ ...coiForm, conflict_details: e.target.value })} placeholder="Describe the nature of the conflict — e.g. personal relationship with buyer contact, financial interest in competing firm, previous employment..." rows={4} style={{ ...input(), resize: "vertical" }} />
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={submitCoi} style={btn(BLUE)}>Submit Declaration</button>
                <button onClick={() => setShowCoiForm(false)} style={btn("rgba(255,255,255,0.08)")}>Cancel</button>
              </div>
              <div style={{ color: "#64748b", fontSize: 11, lineHeight: 1.5 }}>
                By submitting this declaration, you confirm that the information provided is accurate and complete. All declarations are logged with a timestamp and cannot be deleted. Submitting a declaration with no conflict confirms you have actively considered and found no conflicts.
              </div>
            </div>
          </div>
        )}

        {/* Bid version form */}
        {showBidVersionForm && (
          <div style={{ ...card(), border: "1px solid rgba(139,92,246,0.3)" }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Log Bid Document Version</div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={label()}>TENDER</label>
                  <select value={bidVersionForm.tender_id} onChange={e => setBidVersionForm({ ...bidVersionForm, tender_id: e.target.value })} style={input()}>
                    <option value="">-- Select tender --</option>
                    {tenders.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label()}>VERSION NUMBER</label>
                  <input value={bidVersionForm.version_number} onChange={e => setBidVersionForm({ ...bidVersionForm, version_number: e.target.value })} placeholder="e.g. v1.0, v2 Draft, Final" style={input()} />
                </div>
              </div>
              <div>
                <label style={label()}>DOCUMENT TITLE</label>
                <input value={bidVersionForm.title} onChange={e => setBidVersionForm({ ...bidVersionForm, title: e.target.value })} placeholder="e.g. Technical Bid v2.1 — CEFAS Event Management Framework" style={input()} />
              </div>
              <div>
                <label style={label()}>NOTES / CHANGE LOG</label>
                <textarea value={bidVersionForm.content} onChange={e => setBidVersionForm({ ...bidVersionForm, content: e.target.value })} placeholder="What changed in this version? Who reviewed it? Any sections added or revised?" rows={3} style={{ ...input(), resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={submitBidVersion} style={btn(PURPLE)}>Log Version</button>
                <button onClick={() => setShowBidVersionForm(false)} style={btn("rgba(255,255,255,0.08)")}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* COI Declarations log */}
        <div style={{ ...card() }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
            Conflict of Interest Declarations ({coiRecords.length})
          </div>
          {coiRecords.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 13, padding: "16px 0" }}>
              No declarations logged yet. Submit a COI declaration before each significant tender submission. A declaration with no conflict is equally important — it shows your compliance process is active.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {coiRecords.map((r: any) => (
                <div key={r.id} style={{ padding: "12px 14px", background: r.has_conflict ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.06)", borderRadius: 8, border: `1px solid ${r.has_conflict ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.15)"}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ color: r.has_conflict ? "#f87171" : "#10b981", fontSize: 16 }}>{r.has_conflict ? "⚠" : "✓"}</span>
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{r.title}</span>
                      </div>
                      {r.tender_title && <div style={{ color: "#64748b", fontSize: 11 }}>Tender: {r.tender_title}</div>}
                      <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>Declared by: {r.declared_by} · {fmtDate(r.created_at)}</div>
                      {r.has_conflict && r.conflict_details && (
                        <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 6, padding: "8px 10px", background: "rgba(239,68,68,0.1)", borderRadius: 6 }}>{r.conflict_details}</div>
                      )}
                    </div>
                    <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: r.has_conflict ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)", color: r.has_conflict ? "#f87171" : "#10b981", whiteSpace: "nowrap" }}>
                      {r.has_conflict ? "CONFLICT" : "NO CONFLICT"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bid Version Log */}
        <div style={{ ...card() }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
            Bid Document Version Log ({versionRecords.length})
          </div>
          {versionRecords.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 13, padding: "16px 0" }}>
              No bid versions logged yet. Log each version of your bid documents to maintain an audit trail of what was submitted and when.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {versionRecords.map((r: any) => (
                <div key={r.id} style={{ padding: "12px 14px", background: "rgba(139,92,246,0.07)", borderRadius: 8, border: `1px solid rgba(139,92,246,0.2)` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "rgba(139,92,246,0.2)", color: "#c084fc" }}>{r.version_number || "v?"}</span>
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{r.title}</span>
                      </div>
                      {r.tender_title && <div style={{ color: "#64748b", fontSize: 11 }}>Tender: {r.tender_title}</div>}
                      <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>Logged by {r.declared_by} · {fmtDate(r.created_at)}</div>
                      {r.content && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6, padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>{r.content}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bid Security Advisory */}
        <div style={{ ...card(), background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div style={{ color: GOLD, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Bid Security Best Practice</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { icon: "📋", title: "COI — Every Tender", desc: "Complete a COI declaration before submitting every significant bid. Even a 'no conflict' declaration demonstrates an active compliance process to auditors." },
              { icon: "📝", title: "Version Control", desc: "Log every draft and final submission version with timestamps. If a dispute arises about what was submitted, your version log is your evidence." },
              { icon: "⚖️", title: "Conflict Management", desc: "If a conflict exists, declare it immediately and document how it was managed. Managed and disclosed conflicts rarely disqualify. Undisclosed ones almost always do." },
            ].map((tip, i) => (
              <div key={i} style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{tip.icon}</div>
                <div style={{ color: "#fbbf24", fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{tip.title}</div>
                <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.5 }}>{tip.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const searchTwinPay = async () => {
    setTwinpayLoading(true);
    setTwinpayResults([]);
    setTwinpayEmailDraft(null);
    try {
      const data = await saasApiRequest("POST", `${API}/remittance-search`, { region: twinpayRegion, type: twinpayType });
      setTwinpayResults(data.companies || []);
      showToast(`Found ${data.companies?.length || 0} companies`);
    } catch { showToast("Search failed — please try again"); }
    setTwinpayLoading(false);
  };

  const generateTwinPayEmail = async (company: any, idx: number) => {
    setTwinpayGeneratingEmail(idx);
    try {
      const data = await saasApiRequest("POST", `${API}/twinpay-email`, { company });
      setTwinpayEmailDraft({ ...data, company_name: company.name, contact_email: company.contact_email });
      showToast("Email draft ready");
    } catch { showToast("Could not generate email"); }
    setTwinpayGeneratingEmail(null);
  };

  const renderTwinPay = () => (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>💱 TwinPaay Remittance Finder</h2>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Find organisations that actively send money to Africa — and introduce them to TwinPaay's cross-border payment services.</p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <select value={twinpayRegion} onChange={e => setTwinpayRegion(e.target.value)} style={{ ...input(), width: 200 }}>
          <option value="All Africa">All Africa</option>
          <option value="Nigeria">Nigeria</option>
          <option value="Ghana">Ghana</option>
          <option value="Kenya">Kenya</option>
          <option value="South Africa">South Africa</option>
          <option value="West Africa">West Africa</option>
          <option value="East Africa">East Africa</option>
        </select>
        <select value={twinpayType} onChange={e => setTwinpayType(e.target.value)} style={{ ...input(), width: 200 }}>
          <option value="all">All Types</option>
          <option value="corporate">Corporates</option>
          <option value="ngo">NGOs & Charities</option>
          <option value="government">Government & Embassies</option>
          <option value="church">Churches & Faith Orgs</option>
        </select>
        <button onClick={searchTwinPay} disabled={twinpayLoading} style={{ ...btn(BLUE), minWidth: 160 }}>
          {twinpayLoading ? "⟳ Searching..." : "🔍 Find Companies"}
        </button>
      </div>

      {twinpayResults.length === 0 && !twinpayLoading && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💱</div>
          <p style={{ margin: 0 }}>Select a region and type, then click "Find Companies" to discover businesses that send money to Africa.</p>
        </div>
      )}

      {twinpayResults.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {twinpayResults.map((c: any, i: number) => (
            <div key={i} style={{ ...card() }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{c.name}</span>
                    <span style={{ background: "rgba(59,130,246,0.2)", color: BLUE, fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{c.type}</span>
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>📍 {c.headquarters} · Africa: {c.africa_operations}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>{c.description}</div>
                  <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#fbbf24" }}>💡 {c.why_twinpay}</div>
                  {c.estimated_volume && <div style={{ color: "#64748b", fontSize: 11, marginTop: 6 }}>Est. volume: {c.estimated_volume}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  {c.website && <a href={`https://${c.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noreferrer" style={{ ...btn("rgba(255,255,255,0.06)"), fontSize: 11, textDecoration: "none", padding: "6px 12px" }}>🌐 Website</a>}
                  <button onClick={() => generateTwinPayEmail(c, i)} disabled={twinpayGeneratingEmail === i} style={{ ...btn("rgba(251,191,36,0.15)"), color: "#fbbf24", fontSize: 11, padding: "6px 12px" }}>
                    {twinpayGeneratingEmail === i ? "⟳ Drafting..." : "✦ Draft Email"}
                  </button>
                </div>
              </div>
              {c.contact_name && (
                <div style={{ marginTop: 10, padding: "6px 10px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, fontSize: 11 }}>
                  <span style={{ color: "#10b981" }}>👤 {c.contact_name} · {c.contact_title}</span>
                  {c.contact_email && <span style={{ color: "#64748b", marginLeft: 8 }}>· {c.contact_email}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {twinpayEmailDraft && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1e293b", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, maxWidth: 600, width: "90%", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ color: "#fff", margin: 0 }}>✦ Email Draft — {twinpayEmailDraft.company_name}</h3>
              <button onClick={() => setTwinpayEmailDraft(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>SUBJECT</div>
              <div style={{ background: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: 6, color: "#fff", fontSize: 13 }}>{twinpayEmailDraft.subject}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>EMAIL BODY</div>
              <textarea defaultValue={twinpayEmailDraft.body} rows={12} style={{ ...input(), resize: "vertical", fontSize: 12, lineHeight: 1.6 }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {twinpayEmailDraft.contact_email && (
                <a href={`mailto:${twinpayEmailDraft.contact_email}?subject=${encodeURIComponent(twinpayEmailDraft.subject)}&body=${encodeURIComponent(twinpayEmailDraft.body)}`}
                  style={{ ...btn("rgba(16,185,129,0.2)"), color: "#10b981", textDecoration: "none", fontSize: 12 }}>
                  📧 Open in Mail Client
                </a>
              )}
              <button onClick={() => { navigator.clipboard.writeText(twinpayEmailDraft.body); showToast("Copied to clipboard"); }} style={{ ...btn("rgba(255,255,255,0.08)"), fontSize: 12 }}>📋 Copy</button>
              <button onClick={() => setTwinpayEmailDraft(null)} style={{ ...btn("rgba(239,68,68,0.15)"), color: "#f87171", fontSize: 12 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const verifyContact = async () => {
    if (!contactCompany.trim()) return showToast("Please enter a company name");
    setContactLoading(true);
    setContactResult(null);
    try {
      const data = await saasApiRequest("POST", `${API}/contact-verify`, { company_name: contactCompany, website: contactWebsite, context: contactContext });
      setContactResult(data);
      setContactHistory(prev => [{ company: contactCompany, website: contactWebsite, result: data, ts: new Date().toISOString() }, ...prev.slice(0, 9)]);
      showToast(`Contact found: ${data.contact_name} (${data.confidence} confidence)`);
    } catch { showToast("Verification failed — please try again"); }
    setContactLoading(false);
  };

  const renderContactIntel = () => (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>🎯 EP Agent Contact Intelligence</h2>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Agent-driven contact lookup — find the real decision-maker (name, title, email, LinkedIn) from any company.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div style={{ ...card() }}>
          <h3 style={{ color: "#fff", margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Company Lookup</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Company Name *</div>
              <input value={contactCompany} onChange={e => setContactCompany(e.target.value)} placeholder="e.g. Accenture, NHS, Shell" style={{ ...input() }} />
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Website (optional)</div>
              <input value={contactWebsite} onChange={e => setContactWebsite(e.target.value)} placeholder="e.g. accenture.com" style={{ ...input() }} />
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Context</div>
              <select value={contactContext} onChange={e => setContactContext(e.target.value)} style={{ ...input() }}>
                <option value="procurement">Procurement / Tendering</option>
                <option value="events">Corporate Events</option>
                <option value="remittance">Payments / Remittance</option>
                <option value="partnerships">Partnerships & Business Dev</option>
              </select>
            </div>
            <button onClick={verifyContact} disabled={contactLoading || !contactCompany.trim()} style={{ ...btn(BLUE) }}>
              {contactLoading ? "⟳ Searching for contact..." : "🎯 Find Decision-Maker"}
            </button>
          </div>
        </div>

        <div style={{ ...card() }}>
          {!contactResult && !contactLoading && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
              <p style={{ margin: 0, fontSize: 13 }}>Enter a company name and click "Find Decision-Maker" to get Agent-powered contact intelligence.</p>
            </div>
          )}
          {contactLoading && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
              <p style={{ color: BLUE, margin: 0 }}>Researching decision-maker...</p>
            </div>
          )}
          {contactResult && !contactLoading && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <h3 style={{ color: "#fff", margin: 0, fontSize: 15 }}>Contact Found</h3>
                <span style={{ background: contactResult.confidence === "high" ? "rgba(16,185,129,0.2)" : contactResult.confidence === "medium" ? "rgba(251,191,36,0.2)" : "rgba(239,68,68,0.2)", color: contactResult.confidence === "high" ? "#10b981" : contactResult.confidence === "medium" ? "#fbbf24" : "#f87171", padding: "2px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                  {contactResult.confidence?.toUpperCase()} CONFIDENCE
                </span>
              </div>

              <div style={{ background: "rgba(59,130,246,0.08)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{contactResult.contact_name}</div>
                <div style={{ color: BLUE, fontSize: 13, marginBottom: 8 }}>{contactResult.contact_title}</div>
                {contactResult.contact_email && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ color: "#64748b", fontSize: 11 }}>📧</span>
                    <span style={{ color: "#e2e8f0", fontSize: 12 }}>{contactResult.contact_email}</span>
                    <button onClick={() => { navigator.clipboard.writeText(contactResult.contact_email); showToast("Email copied"); }} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 4, color: "#94a3b8", fontSize: 10, padding: "2px 6px", cursor: "pointer" }}>copy</button>
                  </div>
                )}
                {contactResult.linkedin_url && (
                  <div style={{ fontSize: 12 }}>
                    <a href={contactResult.linkedin_url} target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>🔗 LinkedIn Profile</a>
                  </div>
                )}
              </div>

              {contactResult.confidence_reason && (
                <div style={{ color: "#64748b", fontSize: 11, marginBottom: 10, fontStyle: "italic" }}>ℹ️ {contactResult.confidence_reason}</div>
              )}

              {contactResult.alternative_contacts?.length > 0 && (
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>ALTERNATIVES</div>
                  {contactResult.alternative_contacts.map((alt: any, i: number) => (
                    <div key={i} style={{ padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 4, marginBottom: 4, fontSize: 11, color: "#94a3b8" }}>
                      {alt.name} · {alt.title} {alt.email && `· ${alt.email}`}
                    </div>
                  ))}
                </div>
              )}

              {contactResult.notes && (
                <div style={{ padding: "8px 12px", background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 6, fontSize: 11, color: "#fbbf24", marginTop: 8 }}>
                  💡 {contactResult.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {contactHistory.length > 0 && (
        <div style={{ ...card() }}>
          <h3 style={{ color: "#fff", margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>Recent Lookups</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {contactHistory.map((h, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                <div>
                  <span style={{ color: "#fff", fontSize: 13 }}>{h.company}</span>
                  {h.result?.contact_name && <span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>→ {h.result.contact_name} ({h.result.contact_title})</span>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ background: h.result?.confidence === "high" ? "rgba(16,185,129,0.2)" : "rgba(251,191,36,0.2)", color: h.result?.confidence === "high" ? "#10b981" : "#fbbf24", fontSize: 9, padding: "1px 6px", borderRadius: 3 }}>{h.result?.confidence}</span>
                  <button onClick={() => { setContactCompany(h.company); setContactWebsite(h.website || ""); setContactResult(h.result); }} style={{ ...btn("rgba(59,130,246,0.15)"), color: BLUE, fontSize: 10, padding: "4px 8px" }}>View</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── E5: Lessons Vault Tab ──────────────────────────────────────────────────
  const LESSON_SECTION_TYPES = ["all", "Social Value", "Technical", "Methodology", "Pricing / Cost", "Team & Experience", "Risk Management", "Quality Assurance", "Health & Safety", "Sustainability", "GDPR & Data", "Innovation", "Cover Letter", "Executive Summary", "References", "Compliance", "Other"];
  const severityBadge = (s: string) => {
    if (s === "high") return { label: "HIGH", bg: "rgba(239,68,68,0.18)", color: "#f87171" };
    if (s === "medium") return { label: "MEDIUM", bg: "rgba(245,158,11,0.18)", color: "#fbbf24" };
    return { label: "LOW", bg: "rgba(34,197,94,0.18)", color: "#4ade80" };
  };

  const renderLessonsVault = () => (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ color: "#e2e8f0", fontSize: 20, fontWeight: 700, margin: 0 }}>🧠 Lessons Vault</h2>
          <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0 0" }}>Learnings captured from low-confidence bid sections — automatically applied to future drafts.</p>
        </div>
        <button onClick={() => loadLessonsVault(lessonsVaultFilter)} style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#94a3b8", fontSize: 12, padding: "8px 16px", cursor: "pointer" }}>↻ Refresh</button>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {LESSON_SECTION_TYPES.map(t => (
          <button key={t} onClick={() => { setLessonsVaultFilter(t); loadLessonsVault(t); }}
            style={{ background: lessonsVaultFilter === t ? "#3b82f6" : "rgba(255,255,255,0.05)", border: "1px solid", borderColor: lessonsVaultFilter === t ? "#3b82f6" : "rgba(255,255,255,0.1)", borderRadius: 20, color: lessonsVaultFilter === t ? "#fff" : "#94a3b8", fontSize: 11, padding: "5px 12px", cursor: "pointer", fontWeight: lessonsVaultFilter === t ? 700 : 400, transition: "all 0.15s" }}>
            {t === "all" ? "All Types" : t}
          </button>
        ))}
      </div>

      {loadingLessonsVault ? (
        <div style={{ textAlign: "center", color: "#64748b", padding: 60 }}>Loading lessons...</div>
      ) : lessonsVaultData.length === 0 ? (
        <div style={{ textAlign: "center", color: "#475569", padding: 60, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
          <div style={{ color: "#64748b", fontSize: 14, fontWeight: 600 }}>No lessons yet</div>
          <div style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>Open a tender in Bid Writer, score a section, and save a lesson from the weak points panel on any red-scored section.</div>
          <button onClick={() => loadLessonsVault(lessonsVaultFilter)} style={{ marginTop: 16, background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, padding: "10px 20px", cursor: "pointer" }}>Load Lessons</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {lessonsVaultData.map(l => {
            const sev = severityBadge(l.severity || "low");
            const isEditing = editingLessonId === l.id;
            return (
              <div key={l.id} style={{ background: "#1e293b", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      {l.section_type && <span style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 12, color: "#60a5fa", fontSize: 10, padding: "3px 10px", fontWeight: 600 }}>{l.section_type}</span>}
                      <span style={{ background: sev.bg, borderRadius: 12, color: sev.color, fontSize: 10, padding: "3px 10px", fontWeight: 700 }}>{sev.label}</span>
                      {l.tender_name && <span style={{ color: "#475569", fontSize: 10 }}>{l.tender_name}</span>}
                      <span style={{ color: "#334155", fontSize: 10, marginLeft: "auto" }}>{l.created_at ? new Date(l.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""}</span>
                    </div>
                    {isEditing ? (
                      <textarea value={editingLessonText} onChange={e => setEditingLessonText(e.target.value)} rows={4}
                        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 8, color: "#e2e8f0", fontSize: 12, padding: "10px 12px", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }} />
                    ) : (
                      <p style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.7, margin: 0 }}>{l.lessons}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {isEditing ? (
                      <>
                        <button onClick={() => saveEditedLesson(l.id)} style={{ background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, padding: "6px 12px", cursor: "pointer", fontWeight: 700 }}>Save</button>
                        <button onClick={() => setEditingLessonId(null)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#94a3b8", fontSize: 11, padding: "6px 12px", cursor: "pointer" }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingLessonId(l.id); setEditingLessonText(l.lessons || ""); }}
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#94a3b8", fontSize: 11, padding: "6px 12px", cursor: "pointer" }}>✏️ Edit</button>
                        <button onClick={() => deleteLesson(l.id)}
                          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, color: "#f87171", fontSize: 11, padding: "6px 12px", cursor: "pointer" }}>🗑️</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return renderDashboard();
      case "bid-writer": return renderBidWriter();
      case "governance": return renderGovernance();
      case "automation": return renderAutomation();
      case "ai-usage": return renderAiUsage();
      case "finder": return renderFinder();
      case "tenders": return renderTenders();
      case "tender-detail": return renderTenderDetail();
      case "compliance": return renderCompliance();
      case "bid-security": return renderBidSecurity();
      case "intelligence": return renderIntelligence();
      case "twinpay": return renderTwinPay();
      case "contact-verify": return renderContactIntel();
      case "profile": return renderProfile();
      case "vault": return renderVault();
      case "knowledge": return renderKnowledgeBase();
      case "portals": return renderPortals();
      case "settings": return renderSettings();
      case "team": return renderTeam();
      case "lessons-vault": return renderLessonsVault();
      default: return renderDashboard();
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "Poppins, sans-serif" }}>

      {/* ── EP Agent Review Chat Modal ─────────────────────────────────────── */}
      <FullScreenModal
        open={chatSection !== null}
        onClose={() => setChatSection(null)}
        title={<span style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 18 }}>🤖</span><div><div style={{ fontWeight: 700, fontSize: 15 }}>EP Agent — Bid Section Expert</div><div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>{chatSection?.section_label}</div></div></span>}
        dark
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          {/* Chat messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            {chatHistory.length === 0 && (
              <div style={{ color: "#6b7280", fontSize: 13, fontStyle: "italic", textAlign: "center", padding: "40px 0" }}>
                Start by asking EP Agent to review this section, or type a specific request.<br /><br />
                <span style={{ color: "#a78bfa", cursor: "pointer", fontSize: 13 }} onClick={() => setChatInput("Please review this section and tell me what needs improving")}>
                  → "Please review this section and tell me what needs improving"
                </span>
              </div>
            )}
            {chatHistory.map((msg: any, idx: number) => (
              <div key={idx} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "75%",
                  padding: "12px 16px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${msg.role === "user" ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.1)"}`,
                  color: "#e2e8f0",
                  fontSize: 13,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.role === "assistant" && (
                    <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, marginBottom: 6 }}>🤖 EP Agent</div>
                  )}
                  {msg.content}
                  {msg.role === "assistant" && msg.content.includes("[UPDATED SECTION]") && (
                    <div style={{ marginTop: 10, padding: "6px 12px", background: "rgba(16,185,129,0.15)", borderRadius: 6, fontSize: 11, color: "#10b981", fontWeight: 700 }}>
                      ✓ Section updated automatically — close this chat to see changes
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280", fontSize: 13 }}>
                  EP Agent is reviewing...
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          <div style={{ padding: "10px 24px", display: "flex", gap: 8, flexWrap: "wrap" as const, borderTop: "1px solid rgba(124,58,237,0.15)", background: "rgba(124,58,237,0.04)" }}>
            {[
              "Review and score this section",
              "Strengthen the social value with numbers",
              "Make it more specific to this buyer",
              "Rewrite in STAR format",
              "Improve the opening paragraph",
            ].map(prompt => (
              <button key={prompt} onClick={() => setChatInput(prompt)} style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontSize: 11, padding: "5px 12px", borderRadius: 99, cursor: "pointer" }}>
                {prompt}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div style={{ padding: "12px 24px", display: "flex", gap: 10, borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", flexShrink: 0 }}>
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              placeholder="Ask EP Agent to review, improve, or change anything... (Enter to send, Shift+Enter for new line)"
              style={{ flex: 1, minHeight: 52, maxHeight: 120, fontSize: 13, resize: "none" as const, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 14px", color: "#f1f5f9", outline: "none", fontFamily: "Poppins, sans-serif" }}
            />
            <button
              onClick={sendChatMessage}
              disabled={chatLoading || !chatInput.trim()}
              style={{ background: "#7c3aed", color: "#fff", fontWeight: 700, fontSize: 13, padding: "0 20px", border: "none", borderRadius: 10, cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer", flexShrink: 0, opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}
            >
              {chatLoading ? "⏳" : "Send"}
            </button>
          </div>
        </div>
      </FullScreenModal>

      {/* ── Quick-Add Tender Modal ──────────────────────────────────────────── */}
      {showQuickAdd && (
        <div
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => { if (e.target === e.currentTarget) { setShowQuickAdd(false); setQuickAddResult(null); } }}
        >
          <div style={{ background: "#0f172a", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 28, width: "min(520px, 95vw)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: "#fff", margin: 0, fontSize: 17 }}>⚡ Quick-Add Tender</h3>
              <button onClick={() => { setShowQuickAdd(false); setQuickAddResult(null); }} style={{ background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {/* Tab selector */}
            <div style={{ display: "flex", gap: 0, marginBottom: 20, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
              {(["url", "manual"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setQuickAddTab(tab); setQuickAddResult(null); }}
                  style={{ flex: 1, padding: "8px 0", background: quickAddTab === tab ? BLUE : "transparent", color: quickAddTab === tab ? "#fff" : "#94a3b8", border: "none", fontSize: 13, cursor: "pointer", fontWeight: quickAddTab === tab ? 600 : 400 }}
                >
                  {tab === "url" ? "🔗 From URL" : "✏️ Manual Entry"}
                </button>
              ))}
            </div>

            {quickAddTab === "url" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={label()}>PASTE A URL</label>
                  <input
                    value={quickAddUrl}
                    onChange={e => setQuickAddUrl(e.target.value)}
                    placeholder="https://www.find-tender.service.gov.uk/Notice/... or any procurement page"
                    style={{ ...input(), width: "100%", boxSizing: "border-box" }}
                    onKeyDown={e => e.key === "Enter" && quickAddUrl && handleQuickAdd()}
                  />
                </div>
                <div style={{ color: "#475569", fontSize: 11 }}>
                  Works with: Find a Tender, Contracts Finder, FCDO Jaggaer, Stotles, gov.uk, any public page. Intelligence will read the page and extract the title, buyer, deadline and value automatically.
                </div>
                <button
                  onClick={handleQuickAdd}
                  disabled={!quickAddUrl || quickAddLoading}
                  style={{ ...btn(BLUE), padding: "10px 0", fontWeight: 600, opacity: !quickAddUrl || quickAddLoading ? 0.5 : 1 }}
                >
                  {quickAddLoading ? "Extracting…" : "🤖 Extract & Add to Pipeline"}
                </button>
              </div>
            )}

            {quickAddTab === "manual" && (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={label()}>TITLE *</label>
                  <input value={quickAddForm.title || ""} onChange={e => setQuickAddForm({ ...quickAddForm, title: e.target.value })} style={{ ...input(), width: "100%", boxSizing: "border-box" }} placeholder="e.g. FCDO Event Production Framework 2026" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={label()}>BUYER</label>
                    <input value={quickAddForm.buyer || ""} onChange={e => setQuickAddForm({ ...quickAddForm, buyer: e.target.value })} style={input()} placeholder="e.g. FCDO" />
                  </div>
                  <div>
                    <label style={label()}>DEADLINE</label>
                    <input type="date" value={quickAddForm.deadline || ""} onChange={e => setQuickAddForm({ ...quickAddForm, deadline: e.target.value })} style={input()} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={label()}>VALUE</label>
                    <input value={quickAddForm.value_text || ""} onChange={e => setQuickAddForm({ ...quickAddForm, value_text: e.target.value })} style={input()} placeholder="e.g. £150,000,000" />
                  </div>
                  <div>
                    <label style={label()}>LINK (optional)</label>
                    <input value={quickAddForm.source_url || ""} onChange={e => setQuickAddForm({ ...quickAddForm, source_url: e.target.value })} style={input()} placeholder="https://..." />
                  </div>
                </div>
                <div>
                  <label style={label()}>SUMMARY / WHAT THEY NEED</label>
                  <textarea value={quickAddForm.summary || ""} onChange={e => setQuickAddForm({ ...quickAddForm, summary: e.target.value })} style={{ ...input(), minHeight: 70 }} placeholder="Brief description of the requirement…" />
                </div>
                <div>
                  <label style={label()}>NOTES / SOURCE</label>
                  <textarea value={quickAddForm.notes || ""} onChange={e => setQuickAddForm({ ...quickAddForm, notes: e.target.value })} style={{ ...input(), minHeight: 50 }} placeholder="e.g. Found via intelligence tools. From FCDO forward pipeline." />
                </div>
                <button
                  onClick={handleQuickAdd}
                  disabled={!quickAddForm.title || quickAddLoading}
                  style={{ ...btn(BLUE), padding: "10px 0", fontWeight: 600, opacity: !quickAddForm.title || quickAddLoading ? 0.5 : 1 }}
                >
                  {quickAddLoading ? "Adding…" : "Add to Pipeline"}
                </button>
              </div>
            )}

            {/* Result card */}
            {quickAddResult && (
              <div style={{ marginTop: 16, padding: 14, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8 }}>
                <div style={{ color: "#10b981", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>✓ Tender added to pipeline</div>
                <div style={{ color: "#e2e8f0", fontSize: 13 }}>{quickAddResult.tender?.title}</div>
                {quickAddResult.tender?.buyer && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{quickAddResult.tender.buyer}</div>}
                <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "#64748b" }}>
                  {quickAddResult.tender?.deadline && <span>⏰ {quickAddResult.tender.deadline}</span>}
                  {quickAddResult.score !== undefined && <span>Score: {quickAddResult.score}/100</span>}
                </div>
                <button
                  onClick={() => {
                    setShowQuickAdd(false);
                    setQuickAddResult(null);
                    const newTender = tenders.find((t: any) => t.id === quickAddResult.tender?.id);
                    if (newTender) selectTender(newTender);
                    else setActiveTab("tenders");
                  }}
                  style={{ ...btn(BLUE), marginTop: 10, padding: "6px 14px", fontSize: 12 }}
                >Open Tender →</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6)", color: "#fff", textAlign: "center", padding: "6px 0", fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>
        SAAS — CLIENT PLATFORM
      </div>

      <div style={{ display: "flex" }}>
        <nav style={{ width: 220, minHeight: "calc(100vh - 32px)", background: "rgba(255,255,255,0.02)", borderRight: `1px solid ${BORDER}`, padding: "16px 0", flexShrink: 0 }}>
          <div style={{ padding: "0 16px 20px", borderBottom: `1px solid ${BORDER}`, marginBottom: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Tender Command</div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{user?.org_name || "Organization"}</div>
            <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 2 }}>{user?.name} · {user?.email}</div>
          </div>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === "finder" && !finderSearched) { setTimeout(() => handleFinderSearch({ page: 1 }), 0); } }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 16px", background: activeTab === tab.id || (activeTab === "tender-detail" && tab.id === "tenders") ? "rgba(59,130,246,0.15)" : "transparent", border: "none", borderLeft: activeTab === tab.id || (activeTab === "tender-detail" && tab.id === "tenders") ? `3px solid ${BLUE}` : "3px solid transparent", color: activeTab === tab.id || (activeTab === "tender-detail" && tab.id === "tenders") ? "#fff" : "#94a3b8", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
          <div style={{ padding: "16px", borderTop: `1px solid ${BORDER}`, marginTop: 8 }}>
            <button onClick={logout} style={{ ...btn("rgba(239,68,68,0.15)"), color: "#f87171", width: "100%", fontSize: 12 }}>Sign Out</button>
          </div>
        </nav>

        <main style={{ flex: 1, padding: 24, maxWidth: "calc(100vw - 244px)", overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#fff" }}>Tender Management</h1>
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.08)", padding: 4, borderRadius: 12, border: `1px solid ${BORDER}` }}>
              <button onClick={() => setCountry("GB")} style={{ padding: "8px 20px", background: country === "GB" ? "#f59e0b" : "transparent", color: country === "GB" ? "#000" : "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.3s" }}>
                🇬🇧 GB UK
              </button>
              <button onClick={() => setCountry("NG")} style={{ padding: "8px 20px", background: country === "NG" ? "#f59e0b" : "transparent", color: country === "NG" ? "#000" : "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.3s" }}>
                🇳🇬 NG Nigeria
              </button>
            </div>
          </div>
          {renderContent()}
        </main>
      </div>

      {/* Submit to Governance — Caution Modal */}
      {submitModalSection && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 16, width: "100%", maxWidth: 560, padding: 28, boxShadow: "0 0 60px rgba(99,102,241,0.15)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
              <div style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 10, padding: "10px 12px", fontSize: 22, flexShrink: 0 }}>⚠️</div>
              <div>
                <div style={{ color: "#f59e0b", fontWeight: 800, fontSize: 15, letterSpacing: 0.3 }}>Before You Submit</div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginTop: 3 }}>{submitModalSection.section_label}</div>
                <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{submitModalSection.word_count || 0} words · Once submitted, this section enters the governance review queue and an email notification is sent to the team.</div>
              </div>
            </div>

            {/* Caution message */}
            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
              <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 12, marginBottom: 6 }}>📋 Pre-Submission Quality Checklist</div>
              <div style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.6 }}>Tick all items to confirm this section meets EP's bid quality standards. A section submitted with missing evidence or generic language risks costing points. Use EP Agent's review chat to strengthen any weak areas before submitting.</div>
            </div>

            {/* Checklist */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {SUBMIT_CHECKLIST_ITEMS.map(item => (
                <label key={item.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <div
                    onClick={() => setSubmitChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1, cursor: "pointer",
                      background: submitChecklist[item.key] ? "#10b981" : "transparent",
                      border: `2px solid ${submitChecklist[item.key] ? "#10b981" : "#475569"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {submitChecklist[item.key] && <span style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ color: submitChecklist[item.key] ? "#e2e8f0" : "#94a3b8", fontSize: 12, lineHeight: 1.5, transition: "color 0.2s" }}>{item.label}</span>
                </label>
              ))}
            </div>

            {/* Progress bar */}
            {(() => {
              const checked = SUBMIT_CHECKLIST_ITEMS.filter(i => submitChecklist[i.key]).length;
              const pct = Math.round((checked / SUBMIT_CHECKLIST_ITEMS.length) * 100);
              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>Readiness</span>
                    <span style={{ color: pct === 100 ? "#10b981" : "#f59e0b", fontSize: 11, fontWeight: 700 }}>{checked}/{SUBMIT_CHECKLIST_ITEMS.length} confirmed</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#10b981" : "#f59e0b", borderRadius: 99, transition: "width 0.3s" }} />
                  </div>
                </div>
              );
            })()}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setSubmitModalSection(null); setSubmitChecklist({}); }} style={{ ...btn("rgba(255,255,255,0.07)"), color: "#94a3b8", fontWeight: 600 }}>
                Cancel — Keep Editing
              </button>
              <button
                onClick={confirmSubmitToGovernance}
                disabled={!SUBMIT_CHECKLIST_ITEMS.every(i => submitChecklist[i.key])}
                style={{ ...btn("#6366f1"), color: "#fff", fontWeight: 700, opacity: SUBMIT_CHECKLIST_ITEMS.every(i => submitChecklist[i.key]) ? 1 : 0.4, cursor: SUBMIT_CHECKLIST_ITEMS.every(i => submitChecklist[i.key]) ? "pointer" : "not-allowed" }}
              >
                ✓ Confirm &amp; Submit to Governance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bid Score Modal */}
      {showBidScoreModal && bidScoreResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#1e2a3a", border: `1px solid ${BORDER}`, borderRadius: 12, width: "100%", maxWidth: 680, maxHeight: "85vh", overflowY: "auto", padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>EP Agent — Bid Assessment</div>
                <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginTop: 4 }}>⭐ Bid Score Report</div>
              </div>
              <button onClick={() => setShowBidScoreModal(false)} style={{ ...btn("rgba(255,255,255,0.1)"), color: "#94a3b8" }}>✕ Close</button>
            </div>

            {bidScoreResult.error ? (
              <div style={{ color: "#f87171", padding: 16, background: "rgba(248,113,113,0.1)", borderRadius: 8 }}>{bidScoreResult.error}</div>
            ) : (
              <>
                {/* Overall Score */}
                <div style={{ textAlign: "center", padding: "20px 0", borderBottom: `1px solid ${BORDER}`, marginBottom: 20 }}>
                  <div style={{ fontSize: 52, fontWeight: 900, color: bidScoreResult.average_score >= 8 ? "#10b981" : bidScoreResult.average_score >= 6 ? GOLD : "#f87171" }}>
                    {bidScoreResult.average_score}/10
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: bidScoreResult.strength_rating === "Strong" ? "#10b981" : bidScoreResult.strength_rating === "Good" ? GOLD : "#f87171" }}>
                    {bidScoreResult.strength_rating}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                    {bidScoreResult.sections_scored} section{bidScoreResult.sections_scored !== 1 ? "s" : ""} scored · {bidScoreResult.ready_to_submit ? "✓ Ready to submit" : "⚠ Needs improvement before submission"}
                  </div>
                </div>

                {/* Section Scores */}
                {bidScoreResult.section_scores && Object.keys(bidScoreResult.section_scores).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Section Breakdown</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {Object.entries(bidScoreResult.section_scores).map(([label, data]: [string, any]) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                          <div style={{ minWidth: 180, flex: 1, color: "#cbd5e1", fontSize: 12 }}>{label}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 80, height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${(data.score / 10) * 100}%`, background: data.score >= 8 ? "#10b981" : data.score >= 6 ? GOLD : "#f87171", borderRadius: 3 }} />
                            </div>
                            <span style={{ color: data.score >= 8 ? "#10b981" : data.score >= 6 ? GOLD : "#f87171", fontWeight: 700, fontSize: 12, minWidth: 30 }}>{data.score}/10</span>
                          </div>
                          {data.feedback && <div style={{ color: "#64748b", fontSize: 11, flex: 2 }}>{data.feedback}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weak Sections */}
                {bidScoreResult.weak_sections && bidScoreResult.weak_sections.length > 0 && (
                  <div style={{ padding: 14, background: "rgba(248,113,113,0.08)", border: `1px solid rgba(248,113,113,0.2)`, borderRadius: 8 }}>
                    <div style={{ color: "#f87171", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Areas Needing Improvement</div>
                    {bidScoreResult.weak_sections.map((item: string, i: number) => (
                      <div key={i} style={{ color: "#cbd5e1", fontSize: 12, marginBottom: 4, paddingLeft: 8, borderLeft: "2px solid rgba(248,113,113,0.4)" }}>{item}</div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "rgba(16,185,129,0.9)", color: "#fff", padding: "12px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast}</div>
      )}

      {/* Conversational Elizabeth — floating, available across the tender workspace */}
      <ElizabethTenderChat />
    </div>
  );
}
