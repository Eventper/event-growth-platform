import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import TenderKnowledgeBase from "@/components/TenderKnowledgeBase";
import bgBallroom from "@assets/stock_images/bg_ballroom.jpg";
import bgGala from "@assets/stock_images/bg_gala.jpg";
import bgWedding from "@assets/stock_images/bg_wedding.jpg";
import bgOutdoor from "@assets/stock_images/bg_outdoor.jpg";

const COLORS = {
  bg: "#3D0B0B",
  panel: "#ffffff",
  panelBorder: "#e5e7eb",
  gold: "#330311",
  goldLight: "#C9A84C",
  green: "#22C55E",
  red: "#EF4444",
  amber: "#F59E0B",
  text: "#1f2937",
  muted: "#6b7280",
  accent: "#f8fafc",
};

const STATUS_COLORS: Record<string, string> = {
  "Active": COLORS.green,
  "In Progress": COLORS.amber,
  "Submitted": "#3B82F6",
  "Won": COLORS.gold,
  "Lost": COLORS.red,
  "Researching": COLORS.muted,
};

const PORTALS = [
  "Find a Tender (FTS)", "Contracts Finder", "SAM.gov (US)", "Crown Commercial Service",
  "NHS Supply Chain", "YPO", "OJEU", "Proactis / Due North", "In-Tend",
  "Delta eSourcing", "Jaggaer", "Bravo Solution", "SAP Ariba",
  "Atamis", "BiP Solutions / Tracker", "Sell2Wales", "Public Contracts Scotland",
  "eTendersNI", "NEPO (North East)", "ESPO", "SUPC", "LUPC",
  "FCDO", "DEFRA", "Devex", "World Bank", "AfDB", "UNDP", "Other"
];

const CATEGORIES = [
  "Events & Festivals", "Government Services", "Consulting & PMO",
  "Training & Development", "IT & Digital", "Facilities Management",
  "Souvenirs & Corporate Gifts", "FCDO Programmes", "DEFRA & Environment",
  "Africa Programmes", "International Development", "GDPR & Data Protection", "Other"
];

interface Tender {
  id: number;
  title: string;
  buyer: string;
  value_text: string;
  deadline: string;
  status: string;
  category: string;
  portal: string;
  notes: string;
  source_url?: string;
  cpv_codes?: string;
  scoring_criteria?: string;
  word_limits?: string;
  tender_questions?: string;
  contract_end_date?: string;
  closing_date?: string;
  close_date?: string;
  expiry_date?: string;
  created_at?: string;
}

const RELEVANCE_SETS = {
  all: [
    "event", "conference", "venue", "gala", "awards", "ceremony", "delegate", "mice", "hospitality", "exhibition", "festival", "summit", "forum", "symposium", "workshop", "networking", "launch", "roadshow", "banquet", "dinner", "reception",
    "project management", "programme management", "pmo", "portfolio management", "programme director", "project director", "delivery manager", "programme delivery", "project delivery", "change management", "transformation", "implementation", "governance", "assurance", "benefits realisation", "stakeholder management",
    "management consulting", "strategy", "advisory", "consultancy", "organisational development", "capacity building", "technical assistance", "business support", "enterprise support", "feasibility", "research", "evaluation", "impact assessment", "service design",
    "africa", "african", "nigeria", "kenya", "ghana", "rwanda", "tanzania", "uganda", "ethiopia", "diaspora", "international development", "overseas development", "development assistance", "aid programme", "fcdO", "dfid", "global south", "emerging markets", "developing countries",
    "community engagement", "stakeholder engagement", "public engagement", "consultation", "outreach", "community development", "social value", "engagement services", "behaviour change", "communications",
    "international trade", "export", "trade facilitation", "trade development", "inward investment", "trade mission", "trade promotion", "market development", "business network", "trade finance",
  ],
  events: ["event", "conference", "venue", "gala", "awards", "ceremony", "delegate", "hospitality", "exhibition", "festival", "summit", "forum", "dinner", "reception", "workshop", "launch"],
  pmo: ["project management", "programme management", "pmo", "portfolio", "delivery manager", "governance", "assurance", "transformation", "change management", "implementation"],
  consulting: ["consulting", "advisory", "consultancy", "strategy", "capacity building", "technical assistance", "evaluation", "research", "feasibility"],
  africa: ["africa", "african", "nigeria", "kenya", "ghana", "rwanda", "tanzania", "diaspora", "international development", "fcdO", "global south", "emerging markets"],
  trade: ["trade", "export", "international trade", "trade facilitation", "inward investment", "trade mission"],
  community: ["community engagement", "stakeholder engagement", "public engagement", "consultation", "outreach", "engagement services"],
};

// Hard relevance filter — tenders must mention at least one of these to be shown
const FINDER_RELEVANCE_TERMS = [
  "event", "conference", "venue", "gala", "awards", "ceremony", "delegate",
  "project management", "programme management", "pmo", "consulting",
  "africa", "nigeria", "diaspora", "international development",
  "community engagement", "stakeholder", "trade", "export",
];

function getFinderRelevanceMatches(tender: any): string[] {
  const haystack = normalizeText([
    tender.title,
    tender.short_summary,
    tender.description,
    tender.buyer,
    tender.category_tags,
    tender.country,
    tender.location,
    tender.notes,
  ].filter(Boolean).join(" "));
  return FINDER_RELEVANCE_TERMS.filter(term => haystack.includes(term));
}

const CATEGORY_TO_TERMS: Record<string, string[]> = {
  "Events and Venues": RELEVANCE_SETS.events,
  PMO: RELEVANCE_SETS.pmo,
  Consulting: RELEVANCE_SETS.consulting,
  Africa: RELEVANCE_SETS.africa,
  Trade: RELEVANCE_SETS.trade,
  "Community and Engagement": RELEVANCE_SETS.community,
  "All Categories": RELEVANCE_SETS.all,
};

function getToken() {
  return localStorage.getItem("tender_token") || "";
}

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

function Badge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || COLORS.muted;
  return (
    <span style={{
      background: color + "22", border: `1px solid ${color}55`,
      color: color, padding: "3px 10px", borderRadius: "2px",
      fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.12em",
      textTransform: "uppercase" as const, whiteSpace: "nowrap" as const
    }}>{status}</span>
  );
}

function Btn({ children, onClick, variant = "primary", small, disabled, style = {} }: any) {
  const base: React.CSSProperties = {
    fontFamily: "Poppins, sans-serif",
    fontSize: small ? "0.72rem" : "0.8rem",
    fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
    border: "none", cursor: disabled ? "not-allowed" : "pointer",
    padding: small ? "7px 16px" : "11px 26px",
    borderRadius: "2px", transition: "all 0.2s",
    opacity: disabled ? 0.5 : 1,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: COLORS.gold, color: "#0A0F1A" },
    secondary: { background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.panelBorder}` },
    danger: { background: "#EF444422", color: COLORS.red, border: `1px solid #EF444433` },
    green: { background: "#22C55E22", color: COLORS.green, border: `1px solid #22C55E33` },
    fcdo: { background: "#1D4ED822", color: "#60A5FA", border: `1px solid #3B82F644` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, textarea, select, options, style = {} }: any) {
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#0A0F1A", border: `1px solid ${COLORS.panelBorder}`,
    color: COLORS.text, padding: "10px 14px", borderRadius: "2px",
    fontFamily: "Poppins, sans-serif", fontSize: "0.88rem",
    marginTop: "6px", boxSizing: "border-box", ...style
  };
  return (
    <div style={{ marginBottom: "14px" }}>
      {label && <label style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{label}</label>}
      {textarea ? (
        <textarea value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} rows={4} style={{ ...inputStyle, resize: "vertical" as const }} />
      ) : select ? (
        <select value={value} onChange={(e: any) => onChange(e.target.value)} style={inputStyle}>
          <option value="">Select...</option>
          {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      )}
    </div>
  );
}

function Panel({ children, style = {} }: any) {
  return (
    <div style={{
      background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`,
      borderRadius: "4px", padding: "24px", ...style
    }}>{children}</div>
  );
}

function SectionHeading({ children, style: extraStyle }: any) {
  return (
    <div style={{
      fontFamily: "Poppins, sans-serif", fontSize: "0.65rem",
      fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const,
      color: COLORS.gold, marginBottom: "16px",
      display: "flex", alignItems: "center", gap: "12px",
      ...(extraStyle || {})
    }}>
      {children}
      <div style={{ flex: 1, height: "1px", background: COLORS.panelBorder }} />
    </div>
  );
}

function daysUntil(dateStr: string) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function normalizeText(value: string) {
  return (value || "").toLowerCase();
}

function getRelevanceResult(tender: Tender, terms: string[]) {
  const title = normalizeText(tender.title);
  const description = normalizeText((tender.notes || "") + " " + (tender.scoring_criteria || "") + " " + (tender.tender_questions || ""));
  const matches: string[] = [];
  let score = 0;
  terms.forEach((term) => {
    const termText = term.toLowerCase();
    const titleMatch = title.includes(termText);
    const descMatch = description.includes(termText);
    if (titleMatch || descMatch) {
      matches.push(termText);
      if (titleMatch) score += 10;
      if (descMatch) score += 5;
    }
  });
  return { score, matches: Array.from(new Set(matches)) };
}

const PROCUREMENT_PORTALS = [
  { name: "Find a Tender (FTS)", url: "https://www.find-tender.service.gov.uk/Search", registerUrl: "https://www.find-tender.service.gov.uk/Search", desc: "UK government above-threshold tenders", priority: true, region: "UK" },
  { name: "Contracts Finder", url: "https://www.contractsfinder.service.gov.uk/Search", registerUrl: "https://www.contractsfinder.service.gov.uk/Search", desc: "UK government below-threshold opportunities", priority: true, region: "UK" },
  { name: "FCDO Contracts", url: "https://www.contractsfinder.service.gov.uk/Search?&Category=Government&Keywords=FCDO", registerUrl: "https://www.contractsfinder.service.gov.uk/Search", desc: "Foreign, Commonwealth & Development Office", priority: true, region: "UK" },
  { name: "DEFRA Contracts", url: "https://www.contractsfinder.service.gov.uk/Search?&Category=Government&Keywords=DEFRA", registerUrl: "https://www.contractsfinder.service.gov.uk/Search", desc: "Department for Environment, Food & Rural Affairs", priority: true, region: "UK" },
  { name: "Crown Commercial Service", url: "https://www.crowncommercial.gov.uk/agreements", registerUrl: "https://www.crowncommercial.gov.uk/agreements", desc: "Framework agreements and call-offs", region: "UK" },
  { name: "Delta eSourcing", url: "https://www.delta-esourcing.com", registerUrl: "https://www.delta-esourcing.com/delta/suppliers/supplierRegistration.html", desc: "Local authority and NHS tenders", region: "UK" },
  { name: "YPO", url: "https://www.ypo.co.uk/procurement", registerUrl: "https://www.ypo.co.uk/procurement", desc: "Public sector purchasing organisation", region: "UK" },
  { name: "Proactis / Due North", url: "https://procontract.due-north.com", registerUrl: "https://procontract.due-north.com/Register", desc: "Healthcare and government procurement", region: "UK" },
  { name: "Jaggaer (formerly BravoSolution)", url: "https://www.jaggaer.com", registerUrl: "https://www.jaggaer.com/registration/", desc: "Universities, NHS Trusts and MOD eProcurement platform", region: "UK" },
  { name: "Bravo Solution", url: "https://bravosolution.co.uk", registerUrl: "https://bravosolution.co.uk", desc: "Public sector eProcurement — local authorities and universities", region: "UK" },
  { name: "In-Tend", url: "https://in-tendhost.co.uk", registerUrl: "https://in-tendhost.co.uk", desc: "eProcurement portal used by councils, housing associations, NHS", region: "UK" },
  { name: "SAP Ariba", url: "https://www.ariba.com", registerUrl: "https://service.ariba.com/Discovery.aw", desc: "Enterprise procurement network — large corporates and government", region: "UK" },
  { name: "Atamis", url: "https://atamis.co.uk", registerUrl: "https://atamis.co.uk", desc: "NHS and public sector procurement and contract management", region: "UK" },
  { name: "BiP Solutions / Tracker", url: "https://www.bipsolutions.com", registerUrl: "https://www.bipsolutions.com/free-trial/", desc: "UK & Ireland public sector tender alerts and tracking", region: "UK" },
  { name: "Sell2Wales", url: "https://www.sell2wales.gov.wales", registerUrl: "https://www.sell2wales.gov.wales", desc: "Welsh Government procurement portal", region: "UK" },
  { name: "Public Contracts Scotland", url: "https://www.publiccontractsscotland.gov.uk", registerUrl: "https://www.publiccontractsscotland.gov.uk", desc: "Scottish Government procurement portal", region: "UK" },
  { name: "eTendersNI", url: "https://etendersni.gov.uk/epps", registerUrl: "https://etendersni.gov.uk/epps", desc: "Northern Ireland public procurement portal", region: "UK" },
  { name: "NEPO (North East Procurement)", url: "https://www.nepo.org", registerUrl: "https://www.nepo.org", desc: "North East Procurement Organisation — regional framework tenders", region: "UK" },
  { name: "ESPO", url: "https://www.espo.org", registerUrl: "https://www.espo.org", desc: "Eastern Shires Purchasing Organisation — public sector buying", region: "UK" },
  { name: "SUPC", url: "https://www.supc.ac.uk", registerUrl: "https://www.supc.ac.uk", desc: "Southern Universities Purchasing Consortium", region: "UK" },
  { name: "LUPC", url: "https://www.lupc.ac.uk", registerUrl: "https://www.lupc.ac.uk", desc: "London Universities Purchasing Consortium", region: "UK" },
  { name: "NEUPC", url: "https://www.neupc.ac.uk", registerUrl: "https://www.neupc.ac.uk", desc: "North East Universities Purchasing Consortium", region: "UK" },
  { name: "NWUPC", url: "https://www.nwupc.ac.uk", registerUrl: "https://www.nwupc.ac.uk", desc: "North West Universities Purchasing Consortium", region: "UK" },
  { name: "NHS Supply Chain", url: "https://www.supplychain.nhs.uk", registerUrl: "https://www.supplychain.nhs.uk/suppliers/", desc: "NHS procurement and supply chain management", region: "UK" },
  { name: "HealthTrust Europe", url: "https://www.healthtrusteurope.com", registerUrl: "https://www.healthtrusteurope.com", desc: "NHS and healthcare sector purchasing frameworks", region: "UK" },
  { name: "Bloom Procurement", url: "https://www.bloom.services", registerUrl: "https://www.bloom.services", desc: "Public sector marketplace for professional services", region: "UK" },
  { name: "G-Cloud / Digital Marketplace", url: "https://www.digitalmarketplace.service.gov.uk", registerUrl: "https://www.digitalmarketplace.service.gov.uk", desc: "Government digital services and cloud frameworks", region: "UK" },
  { name: "Nigeria BPP (NOCOPO)", url: "https://nocopo.bpp.gov.ng", registerUrl: "https://nocopo.bpp.gov.ng/Supplier", desc: "Bureau of Public Procurement — Nigerian federal tenders", priority: true, region: "Nigeria" },
  { name: "Nigeria NOGIC JQS", url: "https://nogicjqs.gov.ng", registerUrl: "https://nogicjqs.gov.ng", desc: "Nigerian Oil & Gas Industry Content — joint qualification", region: "Nigeria" },
  { name: "Lagos State Procurement", url: "https://lagosppa.gov.ng", registerUrl: "https://lagosppa.gov.ng", desc: "Lagos State Public Procurement Agency", region: "Nigeria" },
  { name: "NGTenders.com", url: "https://ngtenders.com.ng", registerUrl: "https://ngtenders.com.ng", desc: "Aggregated Nigerian government & private sector tenders", region: "Nigeria" },
  { name: "World Bank Procurement", url: "https://projects.worldbank.org/en/projects-operations/procurement", registerUrl: "https://www.worldbank.org/en/projects-operations/products-and-services/procurement-projects-programs", desc: "International development projects worldwide", priority: true, region: "International" },
  { name: "Devex Funding", url: "https://www.devex.com/funding/tenders", registerUrl: "https://www.devex.com/account/new", desc: "Global development tenders, grants & contracts", priority: true, region: "International" },
  { name: "UNDP Procurement", url: "https://procurement-notices.undp.org", registerUrl: "https://procurement-notices.undp.org", desc: "UN Development Programme — global opportunities", region: "International" },
  { name: "UNGM", url: "https://www.ungm.org/Public/Notice", registerUrl: "https://www.ungm.org/Account/Registration", desc: "UN Global Marketplace — all UN agency tenders", region: "International" },
  { name: "AfDB Procurement", url: "https://www.afdb.org/en/projects-and-operations/procurement", registerUrl: "https://www.afdb.org/en/projects-and-operations/procurement", desc: "African Development Bank tenders", priority: true, region: "International" },
  { name: "UNICEF Supply", url: "https://www.unicef.org/supply/tenders", registerUrl: "https://www.ungm.org/Account/Registration", desc: "UNICEF procurement — children's programmes & services", region: "International" },
  { name: "SAM.gov (US Federal)", url: "https://sam.gov/search/?index=opp", registerUrl: "https://sam.gov/content/entity-registration", desc: "System for Award Management — all US federal government and USAID procurements", priority: true, region: "International" },
  { name: "USAID (via SAM.gov)", url: "https://sam.gov/search/?index=opp&sort=-modifiedDate&search_type=opp&filter=%5B%7B%22key%22:%22postedDate%22,%22value%22:%5B%7B%22from%22:%222024-01-01%22%7D%5D%7D%5D", registerUrl: "https://sam.gov/content/entity-registration", desc: "US Agency for International Development opportunities (on SAM.gov)", region: "International" },
  { name: "EU TED (Tenders Electronic Daily)", url: "https://ted.europa.eu/en/", registerUrl: "https://ted.europa.eu/en/", desc: "European Union public procurement", region: "International" },
  { name: "DG Market", url: "https://www.dgmarket.com", registerUrl: "https://www.dgmarket.com", desc: "Global tenders aggregator — development projects", region: "International" },
  { name: "ReliefWeb Jobs & Tenders", url: "https://reliefweb.int/updates?advanced-search=%28PC191%29_%28TY4607%29", registerUrl: "https://reliefweb.int", desc: "Humanitarian and development tenders", region: "International" },
  { name: "Global Tenders", url: "https://www.globaltenders.com", registerUrl: "https://www.globaltenders.com", desc: "Worldwide tender aggregator across all sectors", region: "International" },
  { name: "Add to Event", url: "https://www.addtoevent.co.uk", registerUrl: "https://www.addtoevent.co.uk/supplier/register", desc: "Source weddings, corporate events & private parties from clients directly", region: "UK" },
  { name: "Hospitality Net / Caterer.com", url: "https://www.caterer.com", registerUrl: "https://www.caterer.com", desc: "Hospitality, catering & events sector opportunities", region: "UK" },
  { name: "Bridebook", url: "https://bridebook.com/uk/suppliers", registerUrl: "https://bridebook.com/uk/suppliers/register", desc: "UK wedding supplier marketplace — source wedding clients", region: "UK" },
  { name: "Hitched", url: "https://www.hitched.co.uk/wedding-suppliers/", registerUrl: "https://www.hitched.co.uk/wedding-suppliers/", desc: "Wedding planning marketplace — couples looking for planners", region: "UK" },
  { name: "Bark", url: "https://www.bark.com/en/gb/event-planning/", registerUrl: "https://www.bark.com/en/gb/seller/signup/", desc: "Event planning leads — corporate & private events", region: "UK" },
  { name: "LinkedIn Jobs — Events", url: "https://www.linkedin.com/jobs/search/?keywords=event%20management&location=United%20Kingdom", registerUrl: "https://www.linkedin.com", desc: "Event management contract roles & jobs from companies", region: "UK" },
  { name: "Indeed — Event Jobs UK", url: "https://www.indeed.co.uk/Event-Management-jobs", registerUrl: "https://www.indeed.co.uk", desc: "Event management positions across the UK", region: "UK" },
  { name: "Reed — Event Jobs", url: "https://www.reed.co.uk/jobs/event-management-jobs", registerUrl: "https://www.reed.co.uk", desc: "Event management and hospitality careers", region: "UK" },
  { name: "Live Recruitment", url: "https://www.live-recruitment.co.uk/jobs", registerUrl: "https://www.live-recruitment.co.uk", desc: "Specialist events industry recruitment agency", region: "UK" },
  { name: "CharityJob — Events", url: "https://www.charityjob.co.uk/jobs/event-management", registerUrl: "https://www.charityjob.co.uk", desc: "Charity sector event management roles", region: "UK" },
];

function AIBidWriter({ tender, onClose }: { tender: Tender; onClose: () => void }) {
  const [activeSection, setActiveSection] = useState("executive_summary");
  const [sectionContents, setSectionContents] = useState<Record<string, string>>({});
  const [context, setContext] = useState(
    [tender.scoring_criteria && `Scoring: ${tender.scoring_criteria}`, tender.word_limits && `Word limits: ${tender.word_limits}`].filter(Boolean).join("\n")
  );
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [rfqData, setRfqData] = useState<any>(null);
  const [requiredDocs, setRequiredDocs] = useState<{name: string, description: string, uploaded: boolean}[]>([]);
  const [tasks, setTasks] = useState<{id: string, title: string, assignee: string, priority: string, status: string, due?: string}[]>([]);
  const [agentMessages, setAgentMessages] = useState<{role: string, content: string}[]>([]);
  const [agentInput, setAgentInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [rightTab, setRightTab] = useState<"agent" | "docs" | "tasks" | "tools">("agent");
  const [complianceResult, setComplianceResult] = useState<any>(null);
  const [checkingCompliance, setCheckingCompliance] = useState(false);
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [scoring, setScoring] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const agentEndRef = useRef<HTMLDivElement>(null);

  const BID_SECTIONS = [
    { id: "executive_summary", label: "Executive Summary" },
    { id: "company_overview", label: "Company Overview" },
    { id: "methodology", label: "Methodology & Approach" },
    { id: "team_experience", label: "Team & Experience" },
    { id: "social_value", label: "Social Value" },
    { id: "risk_management", label: "Risk Management" },
    { id: "timeline", label: "Timeline & Mobilisation" },
    { id: "quality_assurance", label: "Quality Assurance" },
    { id: "health_safety", label: "Health & Safety" },
    { id: "pricing", label: "Pricing & Commercial" },
    { id: "innovation", label: "Innovation" },
    { id: "sustainability", label: "Sustainability & ESG" },
    { id: "references", label: "References & Case Studies" },
    { id: "compliance_statement", label: "Compliance Statement" },
    { id: "cover_letter", label: "Cover Letter" },
    { id: "checklist_response", label: "Checklist Response" },
  ];

  const C = {
    bg: "#0D0D0D", panel: "#111827", border: "#1F2937",
    gold: "#C9A84C", burgundy: "#330311", text: "#F1F5F9",
    muted: "#64748B", green: "#10B981", red: "#EF4444", amber: "#F59E0B", blue: "#3B82F6",
  };

  const completedSections = BID_SECTIONS.filter(s => sectionContents[s.id]?.trim().length > 0);
  const currentContent = sectionContents[activeSection] || "";
  const wordCount = currentContent.trim().split(/\s+/).filter(Boolean).length;
  const activeSec = BID_SECTIONS.find(s => s.id === activeSection);
  const isGeneratingThis = generatingSection === activeSection;
  const totalWords = Object.values(sectionContents).join(" ").trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => { agentEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [agentMessages]);

  useEffect(() => {
    setAgentMessages([{
      role: "assistant",
      content: `Welcome to EP Bid Writer — **${tender.title}**\n\n**Getting started is easy:**\n1. 📎 Upload the RFQ/ITT document at the top — I'll extract all requirements, deadlines, and the documents you'll need to submit\n2. ✦ Click "Generate All 16" to draft every section instantly\n3. Review and refine each section on the left\n4. Check compliance, score your bid, then export\n\nYou can also ask me anything — "improve the executive summary", "what documents do we need?", "write a stronger cover letter".\n\n${tender.deadline ? `⚠️ Deadline: **${tender.deadline}**` : "What would you like to do first?"}`
    }]);
  }, []);

  function setSectionContent(id: string, content: string) {
    setSectionContents(prev => ({ ...prev, [id]: content }));
  }

  async function uploadRFQ(file: File) {
    setParsing(true);
    const formData = new FormData();
    formData.append("file", file);
    const token = getToken();
    try {
      const res = await fetch("/api/tender-ai/parse-tender-doc", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.parsed) {
        setRfqData(data.parsed);
        const ctx = [
          data.parsed.title && `RFQ Title: ${data.parsed.title}`,
          data.parsed.buyer && `Buyer: ${data.parsed.buyer}`,
          data.parsed.deadline && `Deadline: ${data.parsed.deadline}`,
          data.parsed.budget && `Budget: ${data.parsed.budget}`,
          data.parsed.evaluation_criteria?.length && `Evaluation: ${data.parsed.evaluation_criteria.join("; ")}`,
          context
        ].filter(Boolean).join("\n");
        setContext(ctx);
        await analyzeRFQ(data.parsed);
        setRightTab("docs");
      }
    } catch (e) { console.error("RFQ upload error:", e); }
    setParsing(false);
  }

  async function analyzeRFQ(parsed: any) {
    try {
      const res = await fetch("/api/tender-ai/analyze-rfq", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ tender: { title: tender.title, buyer: tender.buyer, value_text: tender.value_text }, parsed_data: parsed })
      });
      const data = await res.json();
      if (data.required_documents) setRequiredDocs(data.required_documents.map((d: any) => ({ ...d, uploaded: false })));
      if (data.suggested_tasks) setTasks(data.suggested_tasks.map((t: any, i: number) => ({ ...t, id: String(i), status: "pending" })));
      const strategyMsg = [
        "✅ **RFQ analysed!**",
        data.bid_strategy && `\n\n**Win Strategy:**\n${data.bid_strategy}`,
        data.win_themes?.length && `\n\n**Key Win Themes:**\n${data.win_themes.map((t: string) => `• ${t}`).join("\n")}`,
        data.key_risks?.length && `\n\n**Risks to address:**\n${data.key_risks.map((r: string) => `⚠️ ${r}`).join("\n")}`,
        data.next_steps?.length && `\n\n**Recommended next steps:**\n${data.next_steps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}`,
        `\n\nI've found **${data.required_documents?.length || 0} required documents** and created **${data.suggested_tasks?.length || 0} tasks** for your team. Click **"Generate All 16"** to draft all bid sections now.`
      ].filter(Boolean).join("");
      setAgentMessages(prev => [...prev, { role: "assistant", content: strategyMsg }]);
    } catch (e) { console.error("analyzeRFQ error:", e); }
  }

  async function generateSection(sectionId: string) {
    const sectionLabel = BID_SECTIONS.find(s => s.id === sectionId)?.label || sectionId;
    setGeneratingSection(sectionId);
    try {
      const res = await fetch("/api/tender-ai/generate-section", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          tender: { title: tender.title, buyer: tender.buyer, value_text: tender.value_text, category: tender.category },
          section_label: sectionLabel, context: context || ""
        })
      });
      const data = await res.json();
      if (data.content) setSectionContent(sectionId, data.content);
    } catch (e) { console.error("generateSection error:", e); }
    setGeneratingSection(null);
  }

  async function generateAll() {
    setGeneratingAll(true);
    setGenProgress(0);
    for (let i = 0; i < BID_SECTIONS.length; i++) {
      const s = BID_SECTIONS[i];
      setActiveSection(s.id);
      setGenProgress(Math.round((i / BID_SECTIONS.length) * 100));
      await generateSection(s.id);
      await new Promise(r => setTimeout(r, 300));
    }
    setGenProgress(100);
    setGeneratingSection(null);
    setGeneratingAll(false);
    setAgentMessages(prev => [...prev, {
      role: "assistant",
      content: `✅ **All ${BID_SECTIONS.length} bid sections drafted!**\n\nHere's what to do next:\n1. 🔍 Review each section — click any in the sidebar\n2. Ask me to improve specific sections ("make the executive summary stronger")\n3. ✓ Run **Compliance Check** to flag any gaps\n4. ⭐ **Score Bid** to get a quality rating\n5. 📋 Check the **Docs** tab — ensure all required documents are collected\n6. ↓ **Export** the complete bid document when ready\n\nGood luck with the submission! 🏆`
    }]);
  }

  async function improveSection() {
    if (!currentContent) return;
    setGeneratingSection(activeSection);
    try {
      const res = await fetch("/api/tender-ai/improve-section", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ content: currentContent })
      });
      const data = await res.json();
      if (data.content) setSectionContent(activeSection, data.content);
    } catch (e) {}
    setGeneratingSection(null);
  }

  async function sendAgentMessage() {
    if (!agentInput.trim() || agentLoading) return;
    const userMsg = agentInput.trim();
    setAgentInput("");
    setAgentMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setAgentLoading(true);
    try {
      const res = await fetch("/api/tender-ai/bid-chat", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          message: userMsg,
          tender: { title: tender.title, buyer: tender.buyer, value_text: tender.value_text },
          active_section: activeSec?.label,
          current_content: currentContent,
          context,
          history: agentMessages.slice(-6)
        })
      });
      const data = await res.json();
      setAgentMessages(prev => [...prev, { role: "assistant", content: data.content || "Please try again." }]);
      if (data.suggested_content && activeSection) setSectionContent(activeSection, data.suggested_content);
    } catch (e) {
      setAgentMessages(prev => [...prev, { role: "assistant", content: "Connection error — please try again." }]);
    }
    setAgentLoading(false);
  }

  async function checkCompliance() {
    setCheckingCompliance(true);
    try {
      const allContent = BID_SECTIONS.map(s => `${s.label}:\n${sectionContents[s.id] || "[Not drafted]"}`).join("\n\n");
      const res = await fetch("/api/tender-ai/compliance-check", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ bid_text: allContent, tender_requirements: context, questions_count: 0 })
      });
      setComplianceResult(await res.json());
      setRightTab("tools");
    } catch (e) { setComplianceResult({ error: "Failed" }); }
    setCheckingCompliance(false);
  }

  async function scoreBid() {
    setScoring(true);
    try {
      const bidSections = Object.fromEntries(BID_SECTIONS.filter(s => sectionContents[s.id]).map(s => [s.label, sectionContents[s.id]]));
      const res = await fetch("/api/tender-ai/score-bid", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ bid_sections: bidSections, tender_criteria: context, tender_title: tender.title, tender_buyer: tender.buyer })
      });
      setScoreResult(await res.json());
      setRightTab("tools");
    } catch (e) { setScoreResult({ error: "Failed" }); }
    setScoring(false);
  }

  function exportBid() {
    const lines = [`BID SUBMISSION — ${tender.title}`, `Prepared by: Event Perfekt Management Services Limited / Event Perfekt Global Ltd`, `Date: ${new Date().toLocaleDateString("en-GB")}`, ``, ``];
    BID_SECTIONS.forEach(s => {
      if (sectionContents[s.id]) {
        lines.push(s.label.toUpperCase());
        lines.push("=".repeat(s.label.length));
        lines.push("");
        lines.push(sectionContents[s.id]);
        lines.push(""); lines.push("");
      }
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Bid_${tender.title.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyAll() {
    const lines: string[] = [];
    BID_SECTIONS.forEach(s => {
      if (sectionContents[s.id]) {
        lines.push(s.label.toUpperCase(), "=".repeat(s.label.length), "", sectionContents[s.id], "", "");
      }
    });
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const btnBase = (bg: string, color: string, border?: string): React.CSSProperties => ({
    background: bg, color, border: border || "none", borderRadius: 4, padding: "6px 14px",
    fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em",
    fontFamily: "Poppins, sans-serif", textTransform: "uppercase" as const,
    cursor: "pointer", whiteSpace: "nowrap" as const, flexShrink: 0
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 2000, display: "flex", flexDirection: "column", fontFamily: "Poppins, sans-serif" }}>
      {/* ── TOP BAR ── */}
      <div style={{ background: C.burgundy, borderBottom: `1px solid rgba(201,168,76,0.3)`, padding: "0 16px", display: "flex", alignItems: "center", gap: 10, height: 54, flexShrink: 0 }}>
        <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.22em", color: C.gold, textTransform: "uppercase", whiteSpace: "nowrap" }}>EP BID WRITER</div>
        <div style={{ width: 1, height: 24, background: "rgba(201,168,76,0.3)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.text, fontSize: "0.88rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tender.title}</div>
          <div style={{ color: C.gold, fontSize: "0.62rem", letterSpacing: "0.05em" }}>{tender.buyer}{tender.deadline ? ` · Deadline: ${tender.deadline}` : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <label style={{ cursor: "pointer" }}>
            <div style={{ ...btnBase(parsing ? "rgba(201,168,76,0.1)" : "rgba(201,168,76,0.2)", C.gold, `1px solid ${C.gold}66`), opacity: parsing ? 0.7 : 1 }}>
              {parsing ? "⟳ Parsing..." : "📎 Upload RFQ"}
            </div>
            <input type="file" accept=".pdf,.docx,.doc" onChange={e => { const f = e.target.files?.[0]; if (f) uploadRFQ(f); e.target.value = ""; }} style={{ display: "none" }} disabled={parsing} />
          </label>
          <button onClick={generateAll} disabled={generatingAll || generatingSection !== null} style={{ ...btnBase(generatingAll ? "rgba(201,168,76,0.1)" : C.gold, generatingAll ? C.gold : "#000"), opacity: (generatingAll || generatingSection !== null) ? 0.7 : 1 }}>
            {generatingAll ? `⟳ ${genProgress}% done` : "✦ Generate All 16"}
          </button>
          <button onClick={checkCompliance} disabled={checkingCompliance} style={btnBase("transparent", C.muted, `1px solid ${C.border}`)}>
            {checkingCompliance ? "⟳" : "✓"} Compliance
          </button>
          <button onClick={scoreBid} disabled={scoring} style={btnBase("transparent", C.muted, `1px solid ${C.border}`)}>
            {scoring ? "⟳" : "⭐"} Score
          </button>
          <button onClick={exportBid} style={btnBase("rgba(16,185,129,0.15)", C.green, "1px solid rgba(16,185,129,0.4)")}>
            ↓ Export
          </button>
          <button onClick={onClose} style={btnBase("transparent", C.red, "1px solid rgba(239,68,68,0.4)")}>
            ✕ Close
          </button>
        </div>
      </div>

      {/* ── Generation progress bar ── */}
      {generatingAll && (
        <div style={{ height: 3, background: C.border, flexShrink: 0 }}>
          <div style={{ height: "100%", background: C.gold, width: `${genProgress}%`, transition: "width 0.6s ease" }} />
        </div>
      )}

      {/* ── MAIN 3-PANEL LAYOUT ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT: Sections sidebar */}
        <div style={{ width: 210, background: C.panel, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.muted, fontFamily: "Poppins, sans-serif" }}>
              Sections — {completedSections.length}/{BID_SECTIONS.length}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "6px" }}>
            {BID_SECTIONS.map((s, i) => {
              const hasContent = !!sectionContents[s.id]?.trim();
              const isActive = activeSection === s.id;
              const isGen = generatingSection === s.id;
              return (
                <div key={s.id} onClick={() => setActiveSection(s.id)} style={{
                  padding: "8px 10px", borderRadius: 4, cursor: "pointer", marginBottom: 2,
                  display: "flex", alignItems: "center", gap: 7,
                  background: isActive ? `${C.gold}15` : "transparent",
                  border: `1px solid ${isActive ? C.gold + "40" : "transparent"}`,
                  transition: "all 0.12s"
                }}>
                  <span style={{ fontSize: 11, color: isGen ? C.amber : hasContent ? C.green : C.border, flexShrink: 0, width: 14, textAlign: "center" }}>
                    {isGen ? "⟳" : hasContent ? "✓" : String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: "0.72rem", fontWeight: isActive ? 600 : 400, color: isActive ? C.gold : hasContent ? C.text : C.muted, lineHeight: 1.25 }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden", marginBottom: 5 }}>
              <div style={{ height: "100%", background: C.gold, width: `${(completedSections.length / BID_SECTIONS.length) * 100}%`, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: "0.62rem", color: C.muted }}>{completedSections.length} drafted · {totalWords.toLocaleString()} total words</div>
          </div>
        </div>

        {/* CENTER: The huge editor workspace */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {/* Section header bar */}
          <div style={{ padding: "10px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: "rgba(255,255,255,0.02)" }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: C.text, fontSize: "0.92rem", fontWeight: 700 }}>{activeSec?.label}</span>
              {wordCount > 0 && <span style={{ color: C.muted, fontSize: "0.7rem", marginLeft: 10 }}>{wordCount} words</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => generateSection(activeSection)} disabled={generatingSection !== null} style={{ ...btnBase(C.gold, "#000"), opacity: generatingSection !== null ? 0.6 : 1 }}>
                {isGeneratingThis ? "⟳ Drafting..." : currentContent ? "↺ Redraft" : "✦ Draft this"}
              </button>
              {currentContent && (
                <>
                  <button onClick={improveSection} disabled={generatingSection !== null} style={{ ...btnBase("rgba(16,185,129,0.12)", C.green, "1px solid rgba(16,185,129,0.3)"), opacity: generatingSection !== null ? 0.6 : 1 }}>
                    ↑ Improve
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(currentContent); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={btnBase("transparent", C.muted, `1px solid ${C.border}`)}>
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* THE GIANT EDITOR */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
            {isGeneratingThis ? (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, color: C.gold }}>
                <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite" }}>✦</div>
                <div style={{ fontFamily: "Poppins, sans-serif", letterSpacing: "0.18em", fontSize: "0.8rem", textTransform: "uppercase" }}>
                  EP Agent is drafting {activeSec?.label}...
                </div>
              </div>
            ) : (
              <textarea
                value={currentContent}
                onChange={e => setSectionContent(activeSection, e.target.value)}
                placeholder={`Click "Draft this" above to let the EP Bid Writer Agent write this section, or type directly here.\n\n${rfqData ? `RFQ loaded: ${rfqData.title || tender.title}` : "Tip: Upload the RFQ document first for the best results."}\n\nYou can also ask the EP Agent (right panel) to "write the ${activeSec?.label || "section"}" or "make it more compelling".`}
                style={{
                  flex: 1, width: "100%", height: "100%",
                  background: "transparent", border: "none", outline: "none",
                  color: C.text, padding: "24px 28px",
                  fontSize: "0.93rem", lineHeight: 1.85,
                  fontFamily: "Poppins, sans-serif",
                  resize: "none", boxSizing: "border-box"
                }}
              />
            )}
          </div>
        </div>

        {/* RIGHT: Tools panel */}
        <div style={{ width: 310, background: C.panel, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
          {/* Tab bar */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {([ ["agent", "🤖 Agent"], ["docs", "📋 Docs"], ["tasks", "📌 Tasks"], ["tools", "⚙ Tools"] ] as [string, string][]).map(([tab, label]) => (
              <button key={tab} onClick={() => setRightTab(tab as any)} style={{
                flex: 1, padding: "10px 4px", background: rightTab === tab ? `${C.burgundy}cc` : "transparent",
                border: "none", borderBottom: `2px solid ${rightTab === tab ? C.gold : "transparent"}`,
                color: rightTab === tab ? C.gold : C.muted,
                fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em",
                fontFamily: "Poppins, sans-serif", textTransform: "uppercase", cursor: "pointer"
              }}>{label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

            {/* ── AGENT TAB ── */}
            {rightTab === "agent" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {agentMessages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: msg.role === "user" ? C.gold + "33" : C.burgundy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, border: `1px solid ${msg.role === "user" ? C.gold + "44" : "rgba(201,168,76,0.25)"}`, color: msg.role === "user" ? C.gold : C.gold }}>
                        {msg.role === "user" ? "P" : "✦"}
                      </div>
                      <div style={{ maxWidth: "85%", padding: "9px 11px", borderRadius: 8, background: msg.role === "user" ? `${C.gold}12` : "rgba(255,255,255,0.04)", border: `1px solid ${msg.role === "user" ? C.gold + "20" : C.border}`, fontSize: "0.76rem", lineHeight: 1.65, color: C.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {agentLoading && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.burgundy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.gold }}>✦</div>
                      <div style={{ color: C.muted, fontSize: "0.72rem" }}>EP Agent thinking...</div>
                    </div>
                  )}
                  <div ref={agentEndRef} />
                </div>
                <div style={{ padding: "10px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 7, flexShrink: 0 }}>
                  <textarea
                    value={agentInput}
                    onChange={e => setAgentInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAgentMessage(); } }}
                    placeholder={`Ask EP Agent — "improve this section", "add more on social value", "what documents are required?", "write the cover letter"...`}
                    rows={3}
                    style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "8px 10px", fontSize: "0.76rem", resize: "none", outline: "none", fontFamily: "Poppins, sans-serif" }}
                  />
                  <button onClick={sendAgentMessage} disabled={agentLoading || !agentInput.trim()} style={{ background: C.gold, border: "none", borderRadius: 6, color: "#000", padding: "0 12px", cursor: "pointer", fontWeight: 700, fontSize: "1rem", flexShrink: 0, opacity: (agentLoading || !agentInput.trim()) ? 0.5 : 1 }}>→</button>
                </div>
              </div>
            )}

            {/* ── DOCS TAB ── */}
            {rightTab === "docs" && (
              <div style={{ padding: "12px", flex: 1 }}>
                <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.16em", color: C.muted, marginBottom: 10, fontFamily: "Poppins, sans-serif", textTransform: "uppercase" }}>Required Documents</div>
                {requiredDocs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 12px", color: C.muted }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>📋</div>
                    <div style={{ fontSize: "0.78rem" }}>Upload the RFQ document and the agent will automatically extract the full list of required documents.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 10, padding: "7px 10px", background: `${C.gold}10`, border: `1px solid ${C.gold}30`, borderRadius: 6, fontSize: "0.7rem", color: C.gold }}>
                      {requiredDocs.filter(d => d.uploaded).length}/{requiredDocs.length} documents ready
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {requiredDocs.map((doc, i) => (
                        <div key={i} style={{ padding: "9px 10px", background: doc.uploaded ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${doc.uploaded ? "rgba(16,185,129,0.2)" : C.border}`, borderRadius: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: doc.uploaded ? C.green : C.text, fontSize: "0.75rem", fontWeight: 600 }}>{doc.uploaded ? "✓ " : ""}{doc.name}</div>
                              {doc.description && <div style={{ color: C.muted, fontSize: "0.67rem", marginTop: 2, lineHeight: 1.35 }}>{doc.description}</div>}
                            </div>
                            {!doc.uploaded && (
                              <button onClick={() => setRequiredDocs(prev => prev.map((d, j) => j === i ? { ...d, uploaded: true } : d))} style={{ background: `${C.gold}15`, border: `1px solid ${C.gold}33`, color: C.gold, padding: "3px 7px", borderRadius: 4, fontSize: "0.62rem", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontWeight: 600 }}>Done</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TASKS TAB ── */}
            {rightTab === "tasks" && (
              <div style={{ padding: "12px", flex: 1 }}>
                <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.16em", color: C.muted, marginBottom: 10, fontFamily: "Poppins, sans-serif", textTransform: "uppercase" }}>Bid Tasks</div>
                {tasks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 12px", color: C.muted }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>📌</div>
                    <div style={{ fontSize: "0.78rem" }}>Tasks are auto-created when you upload the RFQ — covering document collection, PM review, and submission steps.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {tasks.map((task, i) => (
                      <div key={task.id} style={{ padding: "9px 10px", background: task.status === "done" ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${task.status === "done" ? "rgba(16,185,129,0.18)" : C.border}`, borderRadius: 6 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <button onClick={() => setTasks(prev => prev.map((t, j) => j === i ? { ...t, status: t.status === "done" ? "pending" : "done" } : t))} style={{ background: "none", border: `1px solid ${task.status === "done" ? C.green : C.border}`, borderRadius: "50%", width: 16, height: 16, cursor: "pointer", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.green, padding: 0 }}>
                            {task.status === "done" ? "✓" : ""}
                          </button>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: task.status === "done" ? C.muted : C.text, fontSize: "0.75rem", fontWeight: 500, textDecoration: task.status === "done" ? "line-through" : "none", lineHeight: 1.3 }}>{task.title}</div>
                            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                              {task.assignee && <span style={{ fontSize: "0.62rem", color: C.muted }}>👤 {task.assignee}</span>}
                              {task.priority && <span style={{ fontSize: "0.6rem", padding: "1px 5px", borderRadius: 10, background: task.priority === "high" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)", color: task.priority === "high" ? C.red : C.amber }}>{task.priority}</span>}
                              {task.due && <span style={{ fontSize: "0.62rem", color: C.muted }}>📅 {task.due}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setTasks(prev => [...prev, { id: String(Date.now()), title: "New task", assignee: "PM", priority: "medium", status: "pending" }])} style={{ padding: "7px", background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 6, color: C.muted, fontSize: "0.72rem", cursor: "pointer", textAlign: "center" }}>
                      + Add task
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── TOOLS TAB ── */}
            {rightTab === "tools" && (
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.16em", color: C.muted, marginBottom: 7, fontFamily: "Poppins, sans-serif", textTransform: "uppercase" }}>Context & Requirements</div>
                  <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="Add scoring criteria, word limits, evaluation weighting, special requirements from the RFQ..." rows={6} style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "9px 11px", fontSize: "0.76rem", resize: "vertical", outline: "none", fontFamily: "Poppins, sans-serif", boxSizing: "border-box" }} />
                </div>

                {complianceResult && (
                  <div style={{ padding: "11px", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6 }}>
                    <div style={{ color: C.blue, fontSize: "0.68rem", fontWeight: 700, marginBottom: 7, letterSpacing: "0.1em" }}>COMPLIANCE — {complianceResult.score || 0}/100</div>
                    {complianceResult.passed?.slice(0, 4).map((p: string, i: number) => <div key={i} style={{ color: C.green, fontSize: "0.68rem", marginBottom: 2 }}>✓ {p}</div>)}
                    {complianceResult.failed?.slice(0, 4).map((f: string, i: number) => <div key={i} style={{ color: C.red, fontSize: "0.68rem", marginBottom: 2 }}>✗ {f}</div>)}
                    {complianceResult.warnings?.slice(0, 3).map((w: string, i: number) => <div key={i} style={{ color: C.amber, fontSize: "0.68rem", marginBottom: 2 }}>⚠ {w}</div>)}
                    {complianceResult.summary && <div style={{ color: C.muted, fontSize: "0.68rem", marginTop: 6, fontStyle: "italic" }}>{complianceResult.summary}</div>}
                  </div>
                )}

                {scoreResult && !scoreResult.error && (
                  <div style={{ padding: "11px", background: `${C.gold}08`, border: `1px solid ${C.gold}25`, borderRadius: 6 }}>
                    <div style={{ color: C.gold, fontSize: "0.68rem", fontWeight: 700, marginBottom: 4, letterSpacing: "0.1em" }}>BID SCORE</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 700, color: (scoreResult.average_score || 0) >= 7 ? C.green : (scoreResult.average_score || 0) >= 5 ? C.amber : C.red }}>{scoreResult.average_score || 0}/10</div>
                    {scoreResult.strength_rating && <div style={{ color: C.muted, fontSize: "0.72rem", marginBottom: 6 }}>{scoreResult.strength_rating}</div>}
                    {scoreResult.weak_sections?.slice(0, 3).map((s: string, i: number) => <div key={i} style={{ color: C.red, fontSize: "0.68rem", marginTop: 3 }}>⚠ {s}</div>)}
                    {scoreResult.ready_to_submit && <div style={{ color: C.green, fontSize: "0.72rem", fontWeight: 600, marginTop: 6 }}>✓ Ready to submit</div>}
                  </div>
                )}

                <button onClick={copyAll} style={{ padding: "9px", background: `${C.gold}10`, border: `1px solid ${C.gold}28`, borderRadius: 6, color: C.gold, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {copied ? "✓ Copied!" : "Copy Entire Bid"}
                </button>
                <button onClick={exportBid} style={{ padding: "9px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 6, color: C.green, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  ↓ Export Bid Document (.txt)
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div style={{ height: 28, background: C.panel, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 16, fontSize: "0.65rem", color: C.muted, flexShrink: 0 }}>
        <span>{completedSections.length}/{BID_SECTIONS.length} sections drafted</span>
        <span>·</span>
        <span>{totalWords.toLocaleString()} total words</span>
        {rfqData && <><span>·</span><span style={{ color: C.green }}>✓ RFQ loaded</span></>}
        {requiredDocs.length > 0 && <><span>·</span><span style={{ color: requiredDocs.every(d => d.uploaded) ? C.green : C.amber }}>{requiredDocs.filter(d => d.uploaded).length}/{requiredDocs.length} docs ready</span></>}
        <span style={{ marginLeft: "auto" }}>
          {generatingSection ? `Drafting: ${BID_SECTIONS.find(s => s.id === generatingSection)?.label}...` : completedSections.length === BID_SECTIONS.length ? "✓ All sections complete — ready to export" : "EP Bid Writer Active"}
        </span>
      </div>
    </div>
  );
}

function TenderModal({ tender, onSave, onClose }: { tender?: Tender | null; onSave: (form: any) => void; onClose: () => void }) {
  const [form, setForm] = useState(tender || {
    title: "Annual Staff Recognition Awards Ceremony 2026",
    buyer: "Greater Manchester Combined Authority",
    value_text: "£85,000",
    deadline: "2026-04-30",
    contract_end_date: "2026-11-30",
    source_url: "https://www.contractsfinder.service.gov.uk/Notice/example-awards-ceremony-2026",
    status: "Researching",
    category: "Events & Festivals",
    portal: "Contracts Finder",
    cpv_codes: "79952000 — Event services, 79950000 — Exhibition and convention services",
    scoring_criteria: "Quality 60% (Method Statement 30%, Social Value 15%, Case Studies 15%), Price 40%",
    word_limits: "Method Statement: 1,500 words. Social Value response: 750 words. Case Studies: 2 examples, 500 words each.",
    notes: "Contact: Sarah Hughes, Procurement Officer (sarah.hughes@gmca.gov.uk). Pre-tender webinar scheduled 10 April. Venue shortlist includes Manchester Central and The Lowry. Budget covers full production, AV, catering for 300 guests, and post-event report."
  });
  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "4px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto", padding: "28px" }}>
        <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.2em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "6px" }}>
          {tender ? "Edit Tender" : "Add New Tender"}
        </div>
        <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.3rem", color: COLORS.text, marginBottom: "22px" }}>
          {tender ? tender.title : "New Opportunity"}
        </div>
        <Input label="Tender / Contract Title" value={(form as any).title} onChange={(v: string) => set("title", v)} placeholder="e.g. Enterprise Events Festival 2026" />
        <Input label="Buying Organisation" value={(form as any).buyer} onChange={(v: string) => set("buyer", v)} placeholder="e.g. Greater Manchester Combined Authority" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <Input label="Contract Value" value={(form as any).value_text} onChange={(v: string) => set("value_text", v)} placeholder="e.g. £50,000" />
          <Input label="Submission Deadline" value={(form as any).deadline} onChange={(v: string) => set("deadline", v)} type="date" />
        </div>
        <Input label="Contract End Date" value={(form as any).contract_end_date} onChange={(v: string) => set("contract_end_date", v)} type="date" />
        <Input label="Source URL (Link to apply)" value={(form as any).source_url} onChange={(v: string) => set("source_url", v)} placeholder="https://www.contractsfinder.service.gov.uk/..." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <Input label="Status" value={(form as any).status} onChange={(v: string) => set("status", v)} select options={Object.keys(STATUS_COLORS)} />
          <Input label="Category" value={(form as any).category} onChange={(v: string) => set("category", v)} select options={CATEGORIES} />
        </div>
        <Input label="Portal" value={(form as any).portal} onChange={(v: string) => set("portal", v)} select options={PORTALS} />
        <Input label="CPV Codes" value={(form as any).cpv_codes} onChange={(v: string) => set("cpv_codes", v)} placeholder="e.g. 79952000, 79900000" />
        <Input label="Scoring Criteria" value={(form as any).scoring_criteria} onChange={(v: string) => set("scoring_criteria", v)} textarea placeholder="e.g. Quality 60%, Price 30%, Social Value 10%" />
        <Input label="Word Limits" value={(form as any).word_limits} onChange={(v: string) => set("word_limits", v)} placeholder="e.g. Method Statement: 1500 words" />
        <Input label="Notes" value={(form as any).notes} onChange={(v: string) => set("notes", v)} textarea placeholder="Internal notes, key contacts, etc." />
        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <Btn onClick={() => onSave(form)} style={{ flex: 1 }}>Save Tender</Btn>
          <Btn onClick={onClose} variant="secondary">Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

function DeadlineBar({ tenders }: { tenders: Tender[] }) {
  const upcoming = tenders
    .filter(t => t.deadline && daysUntil(t.deadline)! > 0 && daysUntil(t.deadline)! <= 60 && t.status !== "Won" && t.status !== "Lost")
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  if (!upcoming.length) return null;

  return (
    <Panel style={{ marginBottom: "20px" }}>
      <SectionHeading>Upcoming Deadlines</SectionHeading>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {upcoming.map(t => {
          const days = daysUntil(t.deadline)!;
          const color = days <= 7 ? COLORS.red : days <= 21 ? COLORS.amber : COLORS.green;
          return (
            <div key={t.id} style={{ background: color + "11", border: `1px solid ${color}33`, borderRadius: "2px", padding: "12px 16px", minWidth: "180px", cursor: t.source_url ? "pointer" : "default" }}
              onClick={() => t.source_url && window.open(t.source_url, "_blank")}>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color, fontFamily: "Poppins, sans-serif", marginBottom: "4px" }}>
                {days === 1 ? "TOMORROW" : `${days} DAYS`}
              </div>
              <div style={{ fontSize: "0.85rem", color: COLORS.text, fontFamily: "Poppins, sans-serif", fontWeight: 500 }}>{t.title.length > 40 ? t.title.slice(0, 40) + "…" : t.title}</div>
              <div style={{ fontSize: "0.75rem", color: COLORS.muted, marginTop: "2px" }}>{t.buyer}</div>
              {t.source_url && <a href={t.source_url} target="_blank" rel="noreferrer" style={{ fontSize: "0.65rem", color: COLORS.gold, marginTop: "4px", display: "block", textDecoration: "none" }}>View on portal ↗</a>}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

const LOCAL_PRIORITY_AREAS = [
  "milton keynes", "mk", "buckinghamshire", "bucks", "northamptonshire", "northampton",
  "luton", "bedford", "bedfordshire", "bletchley", "newport pagnell", "wolverton",
  "stony stratford", "olney", "woburn", "leighton buzzard", "dunstable", "houghton regis",
  "aylesbury", "high wycombe", "wycombe", "marlow", "amersham", "chesham",
  "buckingham", "banbury", "brackley", "towcester", "daventry", "corby",
  "kettering", "wellingborough", "rushden", "cranfield", "flitwick", "biggleswade",
  "sandy", "kempston", "stewartby", "central bedfordshire",
  "milton keynes city council", "buckinghamshire council", "north northamptonshire",
  "west northamptonshire", "luton borough", "bedford borough", "central bedfordshire council",
];

function isLocalPriority(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return LOCAL_PRIORITY_AREAS.some(area => lower.includes(area));
}

function checkLocalPriority(tender: any): boolean {
  const combined = [tender.title, tender.buyer, tender.description, tender.location, tender.short_summary, tender.notes].filter(Boolean).join(" ");
  return isLocalPriority(combined);
}

const TENDER_AGENT_CATEGORIES = [
  { id: "local_councils", label: "🏠 Local Councils (Priority)", icon: "🏠", keywords: "Milton Keynes Buckinghamshire Northamptonshire Luton Bedford Bletchley Newport Pagnell Aylesbury High Wycombe council borough event management conference training", color: "#10B981", portals: "Contracts Finder, Find a Tender, In-Tend, Delta, Proactis, Jaggaer, Bravo", priority: true,
    searchUrls: [
      { name: "CF — Milton Keynes", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Milton+Keynes" },
      { name: "CF — Buckinghamshire", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Buckinghamshire" },
      { name: "CF — Northamptonshire", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Northamptonshire" },
      { name: "CF — Luton", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Luton+Borough" },
      { name: "CF — Bedford", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Bedford+Borough" },
      { name: "CF — Central Beds", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Central+Bedfordshire" },
      { name: "FaT — Milton Keynes", url: "https://www.find-tender.service.gov.uk/Search?keywords=Milton+Keynes" },
      { name: "FaT — Buckinghamshire", url: "https://www.find-tender.service.gov.uk/Search?keywords=Buckinghamshire" },
      { name: "In-Tend eProcurement", url: "https://in-tendhost.co.uk" },
      { name: "Proactis / Due North", url: "https://procontract.due-north.com" },
    ]
  },
  { id: "fcdo", label: "FCDO (Priority)", icon: "🇬🇧", keywords: "FCDO Foreign Commonwealth Development Office international development programme management events conferences meetings", color: "#3B82F6", portals: "Contracts Finder, Find a Tender, Devex, UNGM", priority: true,
    searchUrls: [
      { name: "Contracts Finder — FCDO", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=FCDO&Category=Government" },
      { name: "Find a Tender — FCDO", url: "https://www.find-tender.service.gov.uk/Search?keywords=FCDO" },
      { name: "Devex — FCDO", url: "https://www.devex.com/funding?q=FCDO" },
    ]
  },
  { id: "defra", label: "DEFRA (Priority)", icon: "🌿", keywords: "DEFRA Department Environment Food Rural Affairs sustainability climate biodiversity environmental management green events", color: "#22C55E", portals: "Contracts Finder, Find a Tender", priority: true,
    searchUrls: [
      { name: "Contracts Finder — DEFRA", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=DEFRA&Category=Government" },
      { name: "Find a Tender — DEFRA", url: "https://www.find-tender.service.gov.uk/Search?keywords=DEFRA" },
    ]
  },
  { id: "british_council", label: "British Council", icon: "🇬🇧", keywords: "British Council education culture arts English language teaching international exchange programme event conference training workshop", color: "#2563EB", portals: "Contracts Finder, Find a Tender, Devex, British Council", priority: true,
    searchUrls: [
      { name: "Contracts Finder — British Council", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=British+Council" },
      { name: "Find a Tender — British Council", url: "https://www.find-tender.service.gov.uk/Search?keywords=British+Council" },
      { name: "British Council Opportunities", url: "https://www.britishcouncil.org/partner" },
      { name: "Devex — British Council", url: "https://www.devex.com/funding?q=British+Council" },
    ]
  },
  { id: "british_high_commission", label: "British High Commission", icon: "🏛️", keywords: "British High Commission embassy consulate diplomatic UK mission overseas representation event conference reception summit", color: "#1D4ED8", portals: "Contracts Finder, Find a Tender, Devex", priority: true,
    searchUrls: [
      { name: "Contracts Finder — British High Commission", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=British+High+Commission" },
      { name: "Find a Tender — British High Commission", url: "https://www.find-tender.service.gov.uk/Search?keywords=British+High+Commission" },
      { name: "Devex — British High Commission", url: "https://www.devex.com/funding?q=British+High+Commission" },
      { name: "GOV.UK — British Embassies", url: "https://www.gov.uk/world/embassies" },
    ]
  },
  { id: "hmrc", label: "HMRC", icon: "🏛️", keywords: "HMRC HM Revenue Customs tax conference meeting event training workshop venue", color: "#DC2626", portals: "Contracts Finder, Find a Tender", priority: true,
    searchUrls: [
      { name: "Contracts Finder — HMRC", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=HMRC" },
      { name: "Find a Tender — HMRC", url: "https://www.find-tender.service.gov.uk/Search?keywords=HMRC" },
    ]
  },
  { id: "princes_trust", label: "Princes Trust", icon: "👑", keywords: "Princes Trust Kings Trust youth enterprise young entrepreneurs programme event conference training workshop mentoring", color: "#6B21A8", portals: "Contracts Finder, Find a Tender, Princes Trust", priority: true,
    searchUrls: [
      { name: "Contracts Finder — Princes Trust", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Princes+Trust" },
      { name: "Contracts Finder — Kings Trust", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Kings+Trust" },
      { name: "Find a Tender — Princes Trust", url: "https://www.find-tender.service.gov.uk/Search?keywords=Princes+Trust" },
      { name: "The King's Trust Website", url: "https://www.princes-trust.org.uk" },
    ]
  },
  { id: "cabinet_office", label: "Cabinet Office", icon: "🏛️", keywords: "Cabinet Office government conference meeting event summit civil service Crown Commercial", color: "#1E3A5F", portals: "Contracts Finder, Find a Tender, Crown Commercial", priority: true,
    searchUrls: [
      { name: "Contracts Finder — Cabinet Office", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Cabinet+Office" },
      { name: "Find a Tender — Cabinet Office", url: "https://www.find-tender.service.gov.uk/Search?keywords=Cabinet+Office" },
      { name: "Crown Commercial Service", url: "https://www.crowncommercial.gov.uk" },
    ]
  },
  { id: "home_office", label: "Home Office", icon: "🏠", keywords: "Home Office immigration borders security conference meeting event training", color: "#4B0082", portals: "Contracts Finder, Find a Tender", priority: true,
    searchUrls: [
      { name: "Contracts Finder — Home Office", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Home+Office" },
      { name: "Find a Tender — Home Office", url: "https://www.find-tender.service.gov.uk/Search?keywords=Home+Office" },
    ]
  },
  { id: "mod", label: "Ministry of Defence", icon: "⚔️", keywords: "MOD Ministry of Defence military defence conference meeting event training summit", color: "#1B4332", portals: "Contracts Finder, Find a Tender", priority: true,
    searchUrls: [
      { name: "Contracts Finder — MOD", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Ministry+of+Defence" },
      { name: "Find a Tender — MOD", url: "https://www.find-tender.service.gov.uk/Search?keywords=Ministry+of+Defence" },
    ]
  },
  { id: "nmo", label: "NMO / BEIS / DSIT", icon: "🔬", keywords: "NMO National Measurement Office BEIS Business Energy Industrial Strategy DSIT Science Innovation Technology conference event training", color: "#0369A1", portals: "Contracts Finder, Find a Tender", priority: true,
    searchUrls: [
      { name: "Contracts Finder — NMO", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=NMO+National+Measurement" },
      { name: "Contracts Finder — DSIT", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=DSIT+Science+Innovation" },
      { name: "Find a Tender — BEIS/DSIT", url: "https://www.find-tender.service.gov.uk/Search?keywords=DSIT+Science+Innovation+Technology" },
    ]
  },
  { id: "dwp", label: "DWP", icon: "👥", keywords: "DWP Department Work Pensions benefits employment conference meeting event training workshop", color: "#7C3AED", portals: "Contracts Finder, Find a Tender",
    searchUrls: [
      { name: "Contracts Finder — DWP", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=DWP+Department+Work+Pensions" },
      { name: "Find a Tender — DWP", url: "https://www.find-tender.service.gov.uk/Search?keywords=DWP" },
    ]
  },
  { id: "hm_treasury", label: "HM Treasury", icon: "💰", keywords: "HM Treasury Chancellor Exchequer financial services conference meeting event summit", color: "#B45309", portals: "Contracts Finder, Find a Tender",
    searchUrls: [
      { name: "Contracts Finder — HM Treasury", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=HM+Treasury" },
      { name: "Find a Tender — HM Treasury", url: "https://www.find-tender.service.gov.uk/Search?keywords=HM+Treasury" },
    ]
  },
  { id: "moj", label: "Ministry of Justice", icon: "⚖️", keywords: "MOJ Ministry of Justice courts tribunals conference meeting event training", color: "#0F766E", portals: "Contracts Finder, Find a Tender",
    searchUrls: [
      { name: "Contracts Finder — MOJ", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Ministry+of+Justice" },
      { name: "Find a Tender — MOJ", url: "https://www.find-tender.service.gov.uk/Search?keywords=Ministry+of+Justice" },
    ]
  },
  { id: "dfe", label: "Dept for Education", icon: "📚", keywords: "DfE Department for Education schools universities conference meeting event training workshop", color: "#EA580C", portals: "Contracts Finder, Find a Tender",
    searchUrls: [
      { name: "Contracts Finder — DfE", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Department+for+Education" },
      { name: "Find a Tender — DfE", url: "https://www.find-tender.service.gov.uk/Search?keywords=Department+Education" },
    ]
  },
  { id: "dhsc", label: "DHSC / NHS", icon: "🏥", keywords: "DHSC Department Health Social Care NHS conference meeting event training summit healthcare", color: "#0284C7", portals: "Contracts Finder, Find a Tender",
    searchUrls: [
      { name: "Contracts Finder — DHSC", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=DHSC+Department+Health+Social+Care" },
      { name: "Find a Tender — NHS Events", url: "https://www.find-tender.service.gov.uk/Search?keywords=NHS+conference+event" },
    ]
  },
  { id: "dft", label: "Dept for Transport", icon: "🚆", keywords: "DfT Department for Transport rail aviation conference meeting event training", color: "#059669", portals: "Contracts Finder, Find a Tender",
    searchUrls: [
      { name: "Contracts Finder — DfT", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Department+for+Transport" },
      { name: "Find a Tender — DfT", url: "https://www.find-tender.service.gov.uk/Search?keywords=Department+Transport" },
    ]
  },
  { id: "events_uk", label: "Events & Conferences (UK)", icon: "🎪", keywords: "event management conference corporate events festival meetings summit award ceremony gala dinner UK government", color: "#ffffff", portals: "Contracts Finder, Find a Tender, Crown Commercial, Jaggaer, In-Tend, Delta, Bravo, Bloom",
    searchUrls: [
      { name: "Contracts Finder — Events", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=event+management+conference" },
      { name: "Find a Tender — Events", url: "https://www.find-tender.service.gov.uk/Search?keywords=event+management+conference+meetings" },
      { name: "Bloom — Event Services", url: "https://www.bloom.services" },
      { name: "In-Tend — Events", url: "https://in-tendhost.co.uk" },
      { name: "Delta eSourcing", url: "https://www.delta-esourcing.com" },
    ]
  },
  { id: "events_global", label: "Events & Conferences (Global)", icon: "🌐", keywords: "event management conference meetings summit international global workshop forum symposium seminar congress", color: "#E2C87A", portals: "UNGM, Devex, World Bank, UNDP, AfDB, EU TED, USAID, DG Market",
    searchUrls: [
      { name: "UNGM — Events", url: "https://www.ungm.org/Public/Notice" },
      { name: "Devex — Events", url: "https://www.devex.com/funding?q=event+management+conference" },
      { name: "EU TED — Events", url: "https://ted.europa.eu/en/" },
      { name: "World Bank", url: "https://projects.worldbank.org/en/projects-operations/procurement" },
    ]
  },
  { id: "nigeria", label: "Nigeria Tenders", icon: "🇳🇬", keywords: "Nigeria Lagos Abuja event management conference meeting procurement federal state government BPP NGTenders", color: "#008751", portals: "BPP Nigeria, NGTenders, Lagos PPA, Devex Nigeria",
    searchUrls: [
      { name: "Nigeria BPP", url: "https://www.bpp.gov.ng" },
      { name: "NGTenders", url: "https://www.ngtenders.com" },
      { name: "Lagos State PPA", url: "https://lagosppa.gov.ng" },
      { name: "Devex — Nigeria", url: "https://www.devex.com/funding?q=Nigeria+event+conference" },
      { name: "World Bank — Nigeria", url: "https://projects.worldbank.org/en/projects-operations/procurement?countrycode_exact=NG" },
    ]
  },
  { id: "africa", label: "Africa Programmes", icon: "🌍", keywords: "Africa regional programme development Nigeria Kenya Ghana South Africa diaspora remittance capacity building conference workshop", color: "#A855F7", portals: "World Bank, AfDB, UNDP, FCDO, Devex, USAID",
    searchUrls: [
      { name: "World Bank — Africa", url: "https://projects.worldbank.org/en/projects-operations/procurement?regioncode_exact=AFR" },
      { name: "AfDB Procurement", url: "https://www.afdb.org/en/projects-and-operations/procurement" },
      { name: "Devex — Africa", url: "https://www.devex.com/funding?q=Africa+programme+event" },
      { name: "UNDP — Africa", url: "https://procurement-notices.undp.org" },
    ]
  },
  { id: "intl_dev", label: "International Development", icon: "🤝", keywords: "international development programme ODA bilateral multilateral capacity building technical assistance governance FCDO World Bank UNDP USAID", color: "#0EA5E9", portals: "Devex, World Bank, UNDP, USAID, AfDB, UNGM, DG Market",
    searchUrls: [
      { name: "Devex — Development", url: "https://www.devex.com/funding?q=international+development" },
      { name: "World Bank", url: "https://projects.worldbank.org/en/projects-operations/procurement" },
      { name: "UNDP", url: "https://procurement-notices.undp.org" },
      { name: "USAID", url: "https://www.usaid.gov/work-usaid/find-opportunity" },
      { name: "UNGM", url: "https://www.ungm.org/Public/Notice" },
    ]
  },
  { id: "ukef", label: "UK Export Finance (UKEF)", icon: "🏦", keywords: "UKEF UK Export Finance export credit trade finance Africa international trade overseas investment credit guarantee", color: "#1E40AF", portals: "Contracts Finder, Find a Tender", priority: true,
    searchUrls: [
      { name: "Contracts Finder — UKEF", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=UK+Export+Finance" },
      { name: "Find a Tender — UKEF", url: "https://www.find-tender.service.gov.uk/Search?keywords=UK+Export+Finance" },
      { name: "UKEF Website", url: "https://www.gov.uk/government/organisations/uk-export-finance" },
    ]
  },
  { id: "bii", label: "British International Investment", icon: "🌐", keywords: "BII British International Investment CDC Group development finance Africa investment capital emerging markets infrastructure", color: "#065F46", portals: "BII Website, Devex", priority: true,
    searchUrls: [
      { name: "BII Website", url: "https://www.bii.co.uk" },
      { name: "Contracts Finder — BII", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=British+International+Investment" },
      { name: "Contracts Finder — CDC Group", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=CDC+Group" },
      { name: "Devex — BII", url: "https://www.devex.com/funding?q=British+International+Investment" },
    ]
  },
  { id: "dbt", label: "Dept for Business & Trade", icon: "🤝", keywords: "DBT Department for Business and Trade DIT international trade export promotion business support Africa trade commissioner", color: "#7C2D12", portals: "Contracts Finder, Find a Tender", priority: true,
    searchUrls: [
      { name: "Contracts Finder — DBT", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=Department+Business+Trade" },
      { name: "Find a Tender — DBT", url: "https://www.find-tender.service.gov.uk/Search?keywords=Department+Business+Trade" },
      { name: "Great.gov.uk", url: "https://www.great.gov.uk" },
    ]
  },
  { id: "remittance", label: "Remittance & Payments", icon: "💸", keywords: "remittance money transfer cross-border payments payment service provider foreign exchange diaspora MSB e-money mobile money fintech digital payments currency exchange correspondent banking payout services", color: "#10B981", portals: "Contracts Finder, Find a Tender, FCA Register, UNGM, World Bank", priority: true,
    searchUrls: [
      { name: "Contracts Finder — Remittance", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=remittance+money+transfer+payment+service" },
      { name: "Find a Tender — Payments", url: "https://www.find-tender.service.gov.uk/Search?keywords=remittance+payment+services+money+transfer" },
      { name: "FCA Register (MSB)", url: "https://register.fca.org.uk/s/" },
      { name: "UNGM — Payment Services", url: "https://www.ungm.org/Public/Notice" },
      { name: "World Bank — Payment Systems", url: "https://projects.worldbank.org/en/projects-operations/procurement" },
    ]
  },
  { id: "pmo", label: "PMO & Consulting", icon: "📊", keywords: "PMO project management consultancy programme management office transformation change management strategy advisory", color: "#F59E0B", portals: "Contracts Finder, Find a Tender, Crown Commercial, Bloom, Jaggaer, In-Tend, SAP Ariba, Global Tenders",
    searchUrls: [
      { name: "Contracts Finder — PMO", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=project+management+consultancy" },
      { name: "Find a Tender — PMO", url: "https://www.find-tender.service.gov.uk/Search?keywords=programme+management+consultancy" },
      { name: "Bloom — Consultancy", url: "https://www.bloom.services" },
      { name: "Digital Marketplace — PMO", url: "https://www.digitalmarketplace.service.gov.uk" },
      { name: "Global Tenders — PMO", url: "https://www.globaltenders.com" },
    ]
  },
  { id: "training", label: "Training & Capacity Building", icon: "🎓", keywords: "training development capacity building learning skills workshop facilitation mentoring coaching professional development", color: "#EC4899", portals: "Contracts Finder, Find a Tender, Devex, UNDP, World Bank, Bloom, Jaggaer, In-Tend",
    searchUrls: [
      { name: "Contracts Finder — Training", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=training+development+capacity+building" },
      { name: "Find a Tender — Training", url: "https://www.find-tender.service.gov.uk/Search?keywords=training+development+learning+workshop" },
      { name: "Devex — Training", url: "https://www.devex.com/funding?q=training+capacity+building" },
      { name: "Bloom — Training Services", url: "https://www.bloom.services" },
    ]
  },
  { id: "souvenirs", label: "Souvenirs & Corporate Gifts", icon: "🎁", keywords: "souvenirs corporate gifts branded merchandise promotional items gift bags gift hampers event giveaways awards trophies branded products", color: "#F97316", portals: "Contracts Finder, Find a Tender, Add to Event",
    searchUrls: [
      { name: "Contracts Finder — Gifts & Merchandise", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=corporate+gifts+promotional+merchandise" },
      { name: "Find a Tender — Souvenirs", url: "https://www.find-tender.service.gov.uk/Search?keywords=corporate+gifts+souvenirs+branded+merchandise" },
    ]
  },
  { id: "universities", label: "Universities & Education", icon: "🎓", keywords: "university college higher education graduation ceremony open day freshers student union campus event academic conference", color: "#6366F1", portals: "LUPC, SUPC, NEUPC, NWUPC, Jaggaer, In-Tend, Delta, Bravo, Contracts Finder",
    searchUrls: [
      { name: "Contracts Finder — University Events", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=university+event+management" },
      { name: "Find a Tender — University", url: "https://www.find-tender.service.gov.uk/Search?keywords=university+event+conference" },
      { name: "LUPC (London Unis)", url: "https://www.lupc.ac.uk" },
      { name: "SUPC (Southern Unis)", url: "https://www.supc.ac.uk" },
      { name: "Jaggaer eProcurement", url: "https://www.jaggaer.com/uk" },
      { name: "In-Tend eProcurement", url: "https://in-tendhost.co.uk" },
      { name: "Delta eSourcing", url: "https://www.delta-esourcing.com" },
    ]
  },
  { id: "decor_styling", label: "Decor & Table Styling", icon: "✨", keywords: "decor decoration centrepiece centrepieces table dressing table styling table decor floral arrangements event styling venue dressing chair covers table linen", color: "#D946EF", portals: "Contracts Finder, Hospitality Tenders, Add to Event",
    searchUrls: [
      { name: "Contracts Finder — Decor & Styling", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=decoration+table+dressing+centrepiece+event" },
      { name: "Hospitality Tenders", url: "https://www.hospitalitytenders.co.uk" },
      { name: "Add to Event", url: "https://www.addtoevent.co.uk" },
    ]
  },
  { id: "corporate", label: "Corporate Events & Away Days", icon: "🏢", keywords: "corporate event team building away day annual dinner staff party company conference product launch brand activation corporate hospitality", color: "#0891B2", portals: "Contracts Finder, Find a Tender, Add to Event, Hospitality Tenders, Jaggaer, In-Tend, Bloom",
    searchUrls: [
      { name: "Contracts Finder — Corporate Events", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=corporate+event+hospitality" },
      { name: "Find a Tender — Corporate", url: "https://www.find-tender.service.gov.uk/Search?keywords=corporate+event+hospitality" },
      { name: "Add to Event", url: "https://www.addtoevent.co.uk" },
      { name: "Bloom — Events", url: "https://www.bloom.services" },
      { name: "In-Tend — Corporate", url: "https://in-tendhost.co.uk" },
    ]
  },
  { id: "weddings", label: "Weddings & Private Events", icon: "💒", keywords: "wedding party private celebration engagement birthday anniversary christening baby shower funeral memorial celebration of life", color: "#F43F5E", portals: "Add to Event, Hospitality Tenders, Bridebook",
    searchUrls: [
      { name: "Add to Event — Weddings", url: "https://www.addtoevent.co.uk" },
      { name: "Bridebook", url: "https://bridebook.com/uk/suppliers" },
      { name: "Hitched", url: "https://www.hitched.co.uk/wedding-suppliers/" },
      { name: "UKbride", url: "https://www.ukbride.co.uk" },
    ]
  },
  { id: "gdpr", label: "GDPR & Data Protection", icon: "🔒", keywords: "GDPR data protection data privacy information governance cybersecurity DPIA DPO services privacy compliance ISO 27001 records management privacy training", color: "#059669", portals: "Contracts Finder, Find a Tender, Crown Commercial, Digital Marketplace, Jaggaer, In-Tend, Bloom",
    searchUrls: [
      { name: "Contracts Finder — GDPR", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=GDPR+data+protection" },
      { name: "Find a Tender — Data Privacy", url: "https://www.find-tender.service.gov.uk/Search?keywords=data+protection+GDPR+privacy" },
      { name: "Contracts Finder — DPO Services", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=DPO+services+data+protection+officer" },
      { name: "Digital Marketplace — GDPR", url: "https://www.digitalmarketplace.service.gov.uk" },
      { name: "Bloom — Data Protection", url: "https://www.bloom.services" },
    ]
  },
  { id: "e2e_planning", label: "End-to-End Event Planning", icon: "🎯", keywords: "full service event planning end to end turnkey event production creative direction complete event management logistic coordination delegate management venue sourcing", color: "#14B8A6", portals: "Contracts Finder, Find a Tender, Crown Commercial, Devex, Bloom, Jaggaer, In-Tend",
    searchUrls: [
      { name: "Contracts Finder — Full Event Services", url: "https://www.contractsfinder.service.gov.uk/Search?Keywords=event+planning+management+delivery" },
      { name: "Find a Tender — Event Services", url: "https://www.find-tender.service.gov.uk/Search?keywords=event+planning+management+delivery+production" },
      { name: "Bloom — Event Planning", url: "https://www.bloom.services" },
      { name: "Devex — Event Management", url: "https://www.devex.com/funding?q=event+management+planning" },
    ]
  },
  { id: "jobs", label: "Event Management Jobs", icon: "💼", keywords: "event manager event coordinator event planner conference manager event producer event director hospitality manager contract role freelance", color: "#8B5CF6", portals: "LinkedIn, Indeed, Reed, Eventbrite Careers, Live Recruitment",
    searchUrls: [
      { name: "LinkedIn — Event Management Jobs", url: "https://www.linkedin.com/jobs/search/?keywords=event%20management&location=United%20Kingdom" },
      { name: "Indeed — Event Jobs UK", url: "https://www.indeed.co.uk/Event-Management-jobs" },
      { name: "Reed — Event Jobs", url: "https://www.reed.co.uk/jobs/event-management-jobs" },
      { name: "Live Recruitment", url: "https://www.live-recruitment.co.uk/jobs" },
      { name: "Eventbrite Careers", url: "https://www.eventbrite.co.uk/careers" },
      { name: "CharityJob — Events", url: "https://www.charityjob.co.uk/jobs/event-management" },
    ]
  },
];



function TenderRow({ tender, onEdit, onDelete, onAI, onView, docCount, accessLevel = "full" }: { tender: Tender; onEdit: () => void; onDelete: () => void; onAI: () => void; onView?: () => void; docCount?: number; accessLevel?: string }) {
  const days = daysUntil(tender.deadline);
  const urgencyColor = days !== null && days <= 7 ? COLORS.red : days !== null && days <= 21 ? COLORS.amber : COLORS.muted;
  const deadlineDisplay = tender.deadline ? new Date(tender.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  const contractEndDisplay = tender.contract_end_date ? new Date(tender.contract_end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  const createdDisplay = tender.created_at ? new Date(tender.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

  return (
    <div style={{ padding: "16px 0", borderBottom: `1px solid ${COLORS.panelBorder}`, display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", alignItems: "start" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
          {tender.source_url ? (
            <a href={tender.source_url} target="_blank" rel="noreferrer" style={{ fontFamily: "Poppins, sans-serif", fontWeight: 500, fontSize: "0.95rem", color: COLORS.gold, textDecoration: "none", cursor: "pointer" }}>
              {tender.title} ↗
            </a>
          ) : (
            <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 500, fontSize: "0.95rem", color: COLORS.text }}>{tender.title}</span>
          )}
          <Badge status={tender.status} />
        </div>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "4px" }}>
          <span style={{ fontSize: "0.78rem", color: COLORS.muted }}>🏢 {tender.buyer}</span>
          {tender.value_text && accessLevel === "full" && <span style={{ fontSize: "0.78rem", color: COLORS.gold, fontWeight: 600 }}>💰 {tender.value_text}</span>}
          {tender.value_text && accessLevel !== "full" && <span style={{ fontSize: "0.78rem", color: COLORS.muted, fontStyle: "italic" }}>💰 Restricted</span>}
          {tender.portal && (
            <span style={{ fontSize: "0.78rem", color: COLORS.muted }}>🔗 {tender.portal}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "4px" }}>
          {createdDisplay && (
            <span style={{ fontSize: "0.72rem", color: COLORS.muted, background: COLORS.accent + "55", padding: "2px 8px", borderRadius: "2px" }}>
              Added: {createdDisplay}
            </span>
          )}
          {tender.deadline && (
            <span style={{ fontSize: "0.72rem", color: urgencyColor, background: urgencyColor + "15", padding: "2px 8px", borderRadius: "2px", fontWeight: 600 }}>
              📅 Deadline: {deadlineDisplay} {days !== null ? (days > 0 ? `(${days} days)` : "— OVERDUE") : ""}
            </span>
          )}
          {contractEndDisplay && (
            <span style={{ fontSize: "0.72rem", color: COLORS.green, background: COLORS.green + "15", padding: "2px 8px", borderRadius: "2px", fontWeight: 600 }}>
              📆 Contract End: {contractEndDisplay}
            </span>
          )}
          {docCount !== undefined && docCount > 0 && (
            <span style={{ fontSize: "0.72rem", color: "#60A5FA", background: "#3B82F615", padding: "2px 8px", borderRadius: "2px", fontWeight: 600 }}>
              📄 {docCount} doc{docCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {tender.notes && <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginTop: "4px", fontStyle: "italic", lineHeight: 1.5 }}>{tender.notes.slice(0, 150)}{tender.notes.length > 150 ? "…" : ""}</div>}
      </div>
      <div style={{ display: "flex", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
        {tender.source_url && (
          <a href={tender.source_url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <Btn variant="fcdo" small>Apply ↗</Btn>
          </a>
        )}
        {onView && <Btn onClick={onView} variant="fcdo" small>📂 Open</Btn>}
        <Btn onClick={onAI} variant="green" small>✦ EP Bid</Btn>
        <Btn onClick={onEdit} variant="secondary" small>Edit</Btn>
        <Btn onClick={onDelete} variant="danger" small>✕</Btn>
      </div>
    </div>
  );
}

const PRIORITY_SERVICES = [
  { id: "Events & Conferences", label: "EVENTS & CONFERENCES", icon: "🎪", color: "#E74C3C", bg: "linear-gradient(135deg, #8B0000, #C0392B)" },
  { id: "Africa Regional Events", label: "AFRICA REGIONAL EVENTS", icon: "🌍", color: "#2ECC71", bg: "linear-gradient(135deg, #1B5E20, #2E7D32)" },
  { id: "GDPR & Data Protection", label: "GDPR & DATA PRIVACY", icon: "🔒", color: "#3498DB", bg: "linear-gradient(135deg, #0D47A1, #1976D2)" },
  { id: "Programme Management", label: "PMO & PROJECT MANAGEMENT", icon: "📋", color: "#9B59B6", bg: "transparent" },
  { id: "Africa Programmes & Remittances", label: "AFRICA PROGRAMMES & REMITTANCES", icon: "💎", color: "#F39C12", bg: "transparent" },
];

const FINDER_CATS = [
  "all", "Events & Conferences", "Africa Regional Events", "GDPR & Data Protection",
  "Programme Management", "Africa Programmes & Remittances",
  "Remittance & Payments", "Cash Transfers & Disbursements",
  "Training & Development", "FCDO Programmes", "DEFRA & Environment",
  "British Council", "British High Commission",
  "HMRC", "Princes Trust", "Cabinet Office", "Home Office", "Ministry of Defence",
  "NMO / BEIS / DSIT", "DWP", "HM Treasury", "Ministry of Justice",
  "Dept for Education", "DHSC / NHS", "Dept for Transport",
  "UK Export Finance (UKEF)", "British International Investment", "Dept for Business & Trade",
  "International Development", "Corporate Gifts & Souvenirs", "Decor & Table Styling",
  "Local Councils",
];

const FINDER_COUNTRIES = ["all", "UK", "Nigeria", "Africa", "International"];
const FINDER_SORTS = [
  { value: "deadline", label: "Deadline (soonest)" },
  { value: "published", label: "Published (newest)" },
  { value: "value", label: "Value (highest)" },
];
const RECENCY_OPTIONS = [
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

const INTEL_CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "Framework Announcements", label: "🏛 Frameworks" },
  { value: "Funding Programmes", label: "💰 Funding" },
  { value: "Procurement News", label: "📰 News" },
  { value: "Tender Alerts", label: "🔔 Tender Alerts" },
  { value: "Remittance & Payments", label: "💳 Remittance" },
  { value: "Africa Programmes", label: "🌍 Africa" },
  { value: "Donor Announcements", label: "🏢 Donors" },
];

const INTEL_COUNTRIES = [
  { value: "all", label: "All Countries" },
  { value: "UK", label: "🇬🇧 UK" },
  { value: "Nigeria", label: "🇳🇬 Nigeria" },
  { value: "Ghana", label: "🇬🇭 Ghana" },
  { value: "Kenya", label: "🇰🇪 Kenya" },
  { value: "Multi-country", label: "🌐 Multi-country" },
  { value: "Global", label: "🌍 Global" },
  { value: "Africa", label: "🌍 Africa" },
];

const INTEL_TYPE_ICON: Record<string, string> = {
  news: "📰", framework: "🏛", funding: "💰", tender_alert: "🔔",
  compliance: "⚖️", opportunity: "🎯",
};

const INTEL_TYPE_COLOR: Record<string, string> = {
  news: "#60A5FA", framework: "#C084FC", funding: "#34D399",
  tender_alert: "#F59E0B", compliance: "#F472B6", opportunity: "#22D3EE",
};

const REQ_TYPE_ICON: Record<string, string> = {
  mandatory: "🔴", insurance: "🛡️", certification: "📜", document: "📄",
  deadline: "⏰", evaluation: "📊", staffing: "👥", financial: "💰",
  technical: "⚙️", compliance: "⚖️",
};

const REQ_TYPE_COLOR: Record<string, string> = {
  mandatory: "#EF4444", insurance: "#8B5CF6", certification: "#3B82F6", document: "#60A5FA",
  deadline: "#F59E0B", evaluation: "#22D3EE", staffing: "#10B981", financial: "#ffffff",
  technical: "#6366F1", compliance: "#F472B6",
};

function RequirementsChecklist({ tenderId }: { tenderId: number }) {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const { toast } = useToast();

  const fetchRequirements = async () => {
    try {
      const token = localStorage.getItem("tender_token");
      const res = await fetch(`/api/tender-requirements/${tenderId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRequirements(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const extractRequirements = async () => {
    setExtracting(true);
    try {
      const token = localStorage.getItem("tender_token");
      const res = await fetch(`/api/tender-requirements/${tenderId}/extract`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.requirements) setRequirements(data.requirements);
      toast({ title: "Requirements Extracted", description: data.message });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setExtracting(false); }
  };

  const toggleRequirement = async (req: any) => {
    const token = localStorage.getItem("tender_token");
    const res = await fetch(`/api/tender-requirements/${req.id}/toggle`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      setRequirements(prev => prev.map(r => r.id === req.id ? { ...r, is_met: !r.is_met } : r));
    }
  };

  useEffect(() => { fetchRequirements(); }, [tenderId]);

  const metCount = requirements.filter(r => r.is_met).length;
  const totalCount = requirements.length;
  const pct = totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0;
  const grouped = requirements.reduce((acc: any, r: any) => {
    if (!acc[r.requirement_type]) acc[r.requirement_type] = [];
    acc[r.requirement_type].push(r);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Panel style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <SectionHeading style={{ marginBottom: 0 }}>🔍 Compliance Checklist</SectionHeading>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {totalCount > 0 && (
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: pct === 100 ? "#34D399" : pct > 50 ? COLORS.gold : "#EF4444", fontFamily: "Poppins, sans-serif" }}>{metCount}/{totalCount} ({pct}%)</span>
          )}
          <button onClick={extractRequirements} disabled={extracting}
            style={{ background: extracting ? COLORS.panelBorder : COLORS.gold, border: "none", color: "#1A0A0E", fontFamily: "Poppins, sans-serif", fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "6px 14px", borderRadius: "2px", cursor: extracting ? "wait" : "pointer" }}>
            {extracting ? "⏳ Extracting..." : requirements.length > 0 ? "🔄 Re-extract" : "🤖 Extract Requirements"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px", color: COLORS.muted }}>Loading...</div>
      ) : requirements.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px", color: COLORS.muted, fontSize: "0.82rem" }}>
          Click "Extract Requirements" to analyse this tender and generate a compliance checklist
        </div>
      ) : (
        <>
          <div style={{ height: "4px", background: COLORS.panelBorder, borderRadius: "2px", marginBottom: "16px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#34D399" : pct > 50 ? COLORS.gold : "#EF4444", transition: "width 0.3s", borderRadius: "2px" }} />
          </div>
          {Object.entries(grouped).map(([type, reqs]: [string, any]) => (
            <div key={type} style={{ marginBottom: "12px" }}>
              <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", color: REQ_TYPE_COLOR[type] || COLORS.gold, textTransform: "uppercase" as const, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{REQ_TYPE_ICON[type] || "📋"}</span> {type.replace(/_/g, " ")}
              </div>
              {reqs.map((req: any) => (
                <div key={req.id} onClick={() => toggleRequirement(req)}
                  style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "8px 12px", background: req.is_met ? "#34D39908" : "transparent", border: `1px solid ${req.is_met ? "#34D39933" : COLORS.panelBorder}`, borderRadius: "2px", marginBottom: "4px", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "2px", border: `2px solid ${req.is_met ? "#34D399" : COLORS.panelBorder}`, background: req.is_met ? "#34D399" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                    {req.is_met && <span style={{ color: "#1A0A0E", fontSize: "12px", fontWeight: 800 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: "0.82rem", color: req.is_met ? COLORS.muted : COLORS.text, textDecoration: req.is_met ? "line-through" : "none", lineHeight: 1.4 }}>{req.description}</span>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}

function PipelineDashboard({ accessLevel = "full" }: { accessLevel?: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("tender_token");
    fetch("/api/tender-pipeline", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) return null;

  const stages = [
    { key: "Researching", label: "Researching", color: "#60A5FA", icon: "🔍" },
    { key: "Active", label: "Active", color: "#F59E0B", icon: "⚡" },
    { key: "In Progress", label: "In Progress", color: "#8B5CF6", icon: "✍️" },
    { key: "Submitted", label: "Submitted", color: "#3B82F6", icon: "📨" },
    { key: "Won", label: "Won", color: "#34D399", icon: "🏆" },
    { key: "Lost", label: "Lost", color: "#EF4444", icon: "❌" },
  ];

  const totalValue = stages.reduce((sum, s) => sum + (data.pipeline[s.key]?.value || 0), 0);
  const activeValue = stages.filter(s => !["Won", "Lost"].includes(s.key)).reduce((sum, s) => sum + (data.pipeline[s.key]?.value || 0), 0);
  const wonValue = data.pipeline["Won"]?.value || 0;

  const fmtV = (v: number) => accessLevel !== "full" ? "•••" : v >= 1000000 ? `£${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v.toLocaleString()}`;

  return (
    <Panel style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <SectionHeading style={{ marginBottom: 0 }}>📊 Pipeline Dashboard</SectionHeading>
        {accessLevel === "full" ? (
          <div style={{ display: "flex", gap: "16px" }}>
            <span style={{ fontSize: "0.72rem", color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>TOTAL: <strong style={{ color: COLORS.text }}>{fmtV(totalValue)}</strong></span>
            <span style={{ fontSize: "0.72rem", color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>ACTIVE: <strong style={{ color: "#F59E0B" }}>{fmtV(activeValue)}</strong></span>
            <span style={{ fontSize: "0.72rem", color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>WON: <strong style={{ color: "#34D399" }}>{fmtV(wonValue)}</strong></span>
          </div>
        ) : (
          <span style={{ fontSize: "0.68rem", color: COLORS.muted, fontStyle: "italic" }}>Values restricted</span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${stages.length}, 1fr)`, gap: "8px", marginBottom: "16px" }}>
        {stages.map(s => {
          const stageData = data.pipeline[s.key] || { count: 0, value: 0 };
          return (
            <div key={s.key} style={{ background: s.color + "10", border: `1px solid ${s.color}33`, borderRadius: "2px", padding: "14px 12px", textAlign: "center" }}>
              <div style={{ fontSize: "1.2rem", marginBottom: "4px" }}>{s.icon}</div>
              <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.6rem", fontWeight: 800, color: s.color }}>{stageData.count}</div>
              <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: COLORS.muted, marginBottom: "4px" }}>{s.label}</div>
              {stageData.value > 0 && accessLevel === "full" && <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.72rem", fontWeight: 600, color: s.color }}>{fmtV(stageData.value)}</div>}
            </div>
          );
        })}
      </div>

      {totalValue > 0 && (
        <div style={{ height: "8px", background: COLORS.panelBorder, borderRadius: "4px", overflow: "hidden", display: "flex" }}>
          {stages.filter(s => (data.pipeline[s.key]?.value || 0) > 0).map(s => {
            const pct = ((data.pipeline[s.key]?.value || 0) / totalValue) * 100;
            return <div key={s.key} style={{ width: `${pct}%`, background: s.color, minWidth: pct > 0 ? "4px" : "0" }} title={`${s.label}: ${fmtV(data.pipeline[s.key]?.value)}`} />;
          })}
        </div>
      )}
    </Panel>
  );
}

function IntelligenceWidget({ onNavigate }: { onNavigate: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("tender_token");
    fetch("/api/procurement-intelligence?", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setItems(data.slice(0, 5)); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || items.length === 0) return null;

  const newCount = items.filter((i: any) => i.is_new).length;

  return (
    <Panel style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <SectionHeading style={{ marginBottom: 0 }}>📡 Procurement Intelligence</SectionHeading>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {newCount > 0 && (
            <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "#1A0A0E", background: "#34D399", padding: "2px 8px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em" }}>{newCount} NEW</span>
          )}
          <button onClick={onNavigate} style={{ background: "transparent", border: `1px solid ${COLORS.panelBorder}`, color: COLORS.gold, fontFamily: "Poppins, sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "4px 12px", borderRadius: "2px", cursor: "pointer" }}>View All →</button>
        </div>
      </div>
      {items.map((item: any) => (
        <div key={item.id} style={{ padding: "10px 0", borderBottom: `1px solid ${COLORS.panelBorder}`, display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{INTEL_TYPE_ICON[item.item_type] || "📄"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
              {item.is_new && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34D399", flexShrink: 0 }} />}
              <span style={{ fontSize: "0.82rem", color: COLORS.text, fontWeight: 500 }}>
                {item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer" style={{ color: COLORS.text, textDecoration: "none" }}>{item.title}</a> : item.title}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", fontSize: "0.68rem", color: COLORS.muted }}>
              <span style={{ color: INTEL_TYPE_COLOR[item.item_type] || COLORS.gold }}>{item.category}</span>
              <span>{item.country}</span>
              {item.source && <span>via {item.source}</span>}
            </div>
          </div>
        </div>
      ))}
    </Panel>
  );
}

const PERMISSION_DEFS = [
  { key: "financial_data", label: "Financial Data", desc: "See tender values, pipeline amounts, contract figures", icon: "💰" },
  { key: "tender_finder", label: "Tender Finder", desc: "Search & add live tenders from FCDO, Contracts Finder, Find a Tender", icon: "🔍" },
  { key: "all_tenders", label: "All Tenders", desc: "Manage your tracked tenders — edit status, deadlines, notes", icon: "📋" },
  { key: "remittance_finder", label: "Remittance Finder", desc: "Find companies that send money to Africa & generate outreach emails", icon: "💱" },
  { key: "vendor_registration", label: "Vendor Registration", desc: "Track portal registrations across procurement platforms", icon: "🖇️" },
  { key: "intelligence", label: "Procurement Tenders", desc: "Load real tenders from live sources (FCDO, EU TED, UNGM)", icon: "📡" },
  { key: "company_profile", label: "Company Profile", desc: "Store & manage your company info, team, credentials", icon: "🏢" },
  { key: "bid_vault", label: "Bid Vault", desc: "Organize past bids, proposals, and bid responses by tender", icon: "📁" },
  { key: "ep_agent", label: "EP Agent", desc: "Agent research assistant for company research, market intelligence", icon: "🤖" },
  { key: "ep_bid_writer", label: "EP Bid Writer", desc: "Auto-generate bid sections using Agent & your past bids", icon: "✍️" },
  { key: "tender_manager", label: "Tender Manager", desc: "Full tender management system with team, docs, approvals", icon: "📊" },
  { key: "team_management", label: "Team Management", desc: "Add team members, assign roles, control access permissions", icon: "👥" },
];

const ALL_ON: Record<string, boolean> = Object.fromEntries(PERMISSION_DEFS.map(p => [p.key, true]));

function getPerms(u: any): Record<string, boolean> {
  if (u.access_level === "full" && (!u.permissions || Object.keys(u.permissions).length === 0)) return { ...ALL_ON };
  if (u.permissions && Object.keys(u.permissions).length > 0) return u.permissions;
  if (u.access_level === "full") return { ...ALL_ON };
  if (u.access_level === "restricted") return Object.fromEntries(PERMISSION_DEFS.map(p => [p.key, false]));
  return { financial_data: false, tender_finder: true, all_tenders: true, remittance_finder: false, vendor_registration: true, intelligence: true, company_profile: false, bid_vault: false, ep_agent: true, ep_bid_writer: true, team_management: false };
}

function TeamManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("tender_token");
    fetch("/api/tender-users", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setUsers(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const togglePermission = async (userId: string, permKey: string, currentPerms: Record<string, boolean>) => {
    const newPerms = { ...currentPerms, [permKey]: !currentPerms[permKey] };
    setSaving(prev => ({ ...prev, [userId]: true }));
    try {
      const token = localStorage.getItem("tender_token");
      const resp = await fetch(`/api/tender-users/${userId}/permissions`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permissions: newPerms }),
      });
      if (resp.ok) {
        const updated = await resp.json();
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: updated.permissions } : u));
        toast({ title: "Permission updated" });
      } else {
        toast({ title: "Failed to update permission", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error saving permission", variant: "destructive" });
    }
    setSaving(prev => ({ ...prev, [userId]: false }));
  };

  const setAllPermissions = async (userId: string, value: boolean) => {
    const newPerms = Object.fromEntries(PERMISSION_DEFS.map(p => [p.key, value]));
    setSaving(prev => ({ ...prev, [userId]: true }));
    try {
      const token = localStorage.getItem("tender_token");
      const resp = await fetch(`/api/tender-users/${userId}/permissions`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permissions: newPerms }),
      });
      if (resp.ok) {
        const updated = await resp.json();
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions: updated.permissions } : u));
        toast({ title: value ? "All permissions granted" : "All permissions revoked" });
      } else {
        toast({ title: "Failed to update permissions", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error saving permissions", variant: "destructive" });
    }
    setSaving(prev => ({ ...prev, [userId]: false }));
  };

  const countOn = (perms: Record<string, boolean>) => Object.values(perms).filter(Boolean).length;

  return (
    <>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.8rem", fontWeight: 700 }}>Team <em style={{ color: COLORS.gold }}>Access Management</em></h1>
        <p style={{ color: COLORS.muted, marginTop: "6px", fontSize: "0.85rem" }}>Control exactly what each team member can access — toggle permissions on or off</p>
      </div>

      <Panel>
        <SectionHeading>Team Members ({users.length})</SectionHeading>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: COLORS.muted }}>Loading team...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: COLORS.muted }}>No team members found.</div>
        ) : (
          users.map(u => {
            const perms = getPerms(u);
            const onCount = countOn(perms);
            const isExpanded = expandedUser === u.id;
            return (
              <div key={u.id} style={{ borderBottom: `1px solid ${COLORS.panelBorder}` }}>
                <div
                  onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", cursor: "pointer" }}
                >
                  <div>
                    <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: "0.92rem", color: COLORS.text }}>{u.name}</div>
                    <div style={{ fontSize: "0.78rem", color: COLORS.muted }}>{u.email}{u.company ? ` · ${u.company}` : ""}</div>
                    <div style={{ fontSize: "0.68rem", color: COLORS.muted, marginTop: "2px" }}>Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString("en-GB") : "-"}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em",
                      color: onCount === PERMISSION_DEFS.length ? "#1A0A0E" : onCount === 0 ? COLORS.red : COLORS.text,
                      background: onCount === PERMISSION_DEFS.length ? COLORS.gold : onCount === 0 ? COLORS.red + "33" : COLORS.accent,
                      padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif",
                      textTransform: "uppercase" as const
                    }}>{onCount}/{PERMISSION_DEFS.length} PERMISSIONS</span>
                    <span style={{ color: COLORS.muted, fontSize: "1rem", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ paddingBottom: "20px", paddingLeft: "4px" }}>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                      <button onClick={() => setAllPermissions(u.id, true)} disabled={saving[u.id]} style={{ background: COLORS.gold + "22", border: `1px solid ${COLORS.gold}44`, color: COLORS.gold, padding: "5px 14px", borderRadius: "2px", fontSize: "0.7rem", fontWeight: 700, fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", cursor: "pointer" }}>
                        ✓ GRANT ALL
                      </button>
                      <button onClick={() => setAllPermissions(u.id, false)} disabled={saving[u.id]} style={{ background: COLORS.red + "22", border: `1px solid ${COLORS.red}44`, color: COLORS.red, padding: "5px 14px", borderRadius: "2px", fontSize: "0.7rem", fontWeight: 700, fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", cursor: "pointer" }}>
                        ✕ REVOKE ALL
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      {PERMISSION_DEFS.map(p => {
                        const isOn = perms[p.key] === true;
                        return (
                          <div
                            key={p.key}
                            onClick={() => !saving[u.id] && togglePermission(u.id, p.key, perms)}
                            style={{
                              display: "flex", alignItems: "center", gap: "12px",
                              padding: "12px 14px", borderRadius: "2px", cursor: saving[u.id] ? "wait" : "pointer",
                              background: isOn ? COLORS.gold + "10" : COLORS.accent,
                              border: `1px solid ${isOn ? COLORS.gold + "44" : COLORS.panelBorder}`,
                              transition: "all 0.15s ease"
                            }}
                          >
                            <div style={{
                              width: "22px", height: "22px", borderRadius: "3px", flexShrink: 0,
                              border: `2px solid ${isOn ? COLORS.gold : COLORS.muted + "66"}`,
                              background: isOn ? COLORS.gold : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.15s ease"
                            }}>
                              {isOn && <span style={{ color: "#1A0A0E", fontSize: "0.75rem", fontWeight: 900 }}>✓</span>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: "0.82rem", color: isOn ? COLORS.text : COLORS.muted }}>
                                {p.icon} {p.label}
                              </div>
                              <div style={{ fontSize: "0.7rem", color: COLORS.muted, marginTop: "2px" }}>{p.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </Panel>
    </>
  );
}

function IntelligenceFeed() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const { toast } = useToast();

  const fetchItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("tender_token");
      const params = new URLSearchParams();
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (filterCountry !== "all") params.set("country", filterCountry);
      if (watchlistOnly) params.set("watchlistOnly", "true");
      const res = await fetch(`/api/procurement-intelligence?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error("Intel fetch error:", err);
    } finally { setLoading(false); }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const token = localStorage.getItem("tender_token");
      const authHeaders = { Authorization: `Bearer ${token}` };
      
      // Prefer imported intelligence first, then top up from live sources
      const sources = [
        { url: "/api/tender-feed/contracts-finder?keyword=FCDO&size=20", source: "FCDO (Contracts Finder)" },
        { url: "/api/tender-feed/find-a-tender?keyword=event&size=15", source: "Find a Tender" },
        { url: "/api/tender-feed/ted-eu?size=10", source: "EU TED" },
        { url: "/api/tender-feed/ungm-undp?size=15", source: "UNGM/UNDP" },
        { url: "/api/uk-tenders?q=FCDO&status=open", source: "UK Tenders (FCDO)" },
      ];
      
      const allTenders: any[] = [];
      const existing = await fetch("/api/procurement-intelligence?limit=200", { headers: authHeaders }).then(r => r.ok ? r.json() : []).catch(() => []);
      if (Array.isArray(existing) && existing.length > 0) {
        setItems(existing);
      }
      const results = await Promise.allSettled(
        sources.map(s => 
          fetch(s.url, { headers: authHeaders })
            .then(r => r.json())
            .then(data => ({
              source: s.source,
              tenders: Array.isArray(data) ? data : data.results || data.categories?.flatMap((c: any) => c.results) || []
            }))
        )
      );
      
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.tenders) {
          r.value.tenders.forEach((t: any) => {
            allTenders.push({
              id: `${r.value.source}-${t.id}`,
              title: t.title,
              summary: t.description || t.short_summary || "",
              source: r.value.source,
              source_url: t.source_url,
              country: t.country || "UK",
              category: t.category_tags ? t.category_tags[0] : "Tender",
              item_type: "tender",
              published_date: t.publish_date || new Date().toISOString(),
              budget: t.budget || t.value_estimate,
              deadline: t.deadline || t.deadline_date,
              daysLeft: t.daysLeft,
              is_new: true,
              ai_generated: false,
            });
          });
        }
      });
      
      // Store real tenders in intelligence table
      if (allTenders.length > 0) {
        await fetch("/api/procurement-intelligence/import-tenders", {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ tenders: allTenders }),
        }).catch(() => {}); // Don't fail if endpoint doesn't exist yet
      }
      
      setItems(allTenders);
      toast({ 
        title: "Real Tenders Loaded", 
        description: `Found ${allTenders.length} live tenders from FCDO, Contracts Finder, EU TED, and UNGM` 
      });
    } catch (err: any) {
      console.error("Tender scan failed:", err);
      toast({ title: "Error", description: err.message || "Tender scan failed", variant: "destructive" });
    } finally { setScanning(false); }
  };

  const toggleWatchlist = async (item: any) => {
    const token = localStorage.getItem("tender_token");
    if (item.on_watchlist) {
      await fetch(`/api/procurement-intelligence/watchlist/${item.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      await fetch(`/api/procurement-intelligence/watchlist/${item.id}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
    }
    fetchItems();
  };

  const markAllRead = async () => {
    const token = localStorage.getItem("tender_token");
    await fetch("/api/procurement-intelligence/mark-read", {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    fetchItems();
  };

  useEffect(() => { fetchItems(); }, [filterCategory, filterCountry, watchlistOnly]);

  const newCount = items.filter((i: any) => i.is_new).length;
  const watchlistCount = items.filter((i: any) => i.on_watchlist).length;

  return (
    <>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: "12px" }}>
          <div>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.22em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "6px" }}>Live Market Feed</div>
            <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "2rem", fontWeight: 700, margin: 0 }}>Procurement <em style={{ color: COLORS.gold }}>Tenders</em></h1>
            <p style={{ color: COLORS.muted, marginTop: "6px", fontSize: "0.85rem" }}>Real live tenders from FCDO, Contracts Finder, Find a Tender, EU TED, and UNGM/UNDP</p>
          </div>
          
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }}>
        {[
          { label: "Total Items", value: items.length, color: COLORS.text },
          { label: "New Today", value: newCount, color: "#34D399" },
          { label: "On Watchlist", value: watchlistCount, color: COLORS.gold },
          { label: "Sources", value: [...new Set(items.map((i: any) => i.source))].length, color: "#60A5FA" },
        ].map(s => (
          <Panel key={s.label} style={{ textAlign: "center", padding: "20px 16px" }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "2.4rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: COLORS.muted, marginTop: "6px", fontFamily: "Poppins, sans-serif" }}>{s.label}</div>
          </Panel>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterCategory} onChange={(e: any) => setFilterCategory(e.target.value)}
          style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text, padding: "8px 14px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", fontSize: "0.82rem" }}>
          {INTEL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={filterCountry} onChange={(e: any) => setFilterCountry(e.target.value)}
          style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text, padding: "8px 14px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", fontSize: "0.82rem" }}>
          {INTEL_COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button onClick={() => setWatchlistOnly(!watchlistOnly)}
          style={{ background: watchlistOnly ? COLORS.gold + "22" : "transparent", border: `1px solid ${watchlistOnly ? COLORS.gold : COLORS.panelBorder}`, color: watchlistOnly ? COLORS.gold : COLORS.muted, fontFamily: "Poppins, sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, padding: "8px 16px", borderRadius: "2px", cursor: "pointer" }}>
          ⭐ Watchlist ({watchlistCount})
        </button>
        <div style={{ flex: 1 }} />
        {newCount > 0 && (
          <button onClick={markAllRead} style={{ background: "transparent", border: `1px solid ${COLORS.panelBorder}`, color: COLORS.muted, fontFamily: "Poppins, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "8px 14px", borderRadius: "2px", cursor: "pointer" }}>
            Mark All Read
          </button>
        )}
        <button onClick={runScan} disabled={scanning}
          style={{ background: scanning ? COLORS.panelBorder : COLORS.gold, border: "none", color: "#1A0A0E", fontFamily: "Poppins, sans-serif", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "8px 18px", borderRadius: "2px", cursor: scanning ? "wait" : "pointer" }}>
          {scanning ? "⏳ Loading..." : "📡 Load Tenders"}
        </button>
        <button onClick={async () => {
          if (!confirm("Clear all existing items and run a fresh scan?")) return;
          setScanning(true);
          try {
            const token = localStorage.getItem("tender_token");
            await fetch("/api/procurement-intelligence/clear", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
            const res = await fetch("/api/procurement-intelligence/scan?force=true", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
            const data = await res.json();
            toast({ title: "Fresh Scan", description: data.message });
            fetchItems();
          } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
          finally { setScanning(false); }
        }} disabled={scanning}
          style={{ background: "transparent", border: `1px solid ${COLORS.panelBorder}`, color: COLORS.muted, fontFamily: "Poppins, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "8px 14px", borderRadius: "2px", cursor: scanning ? "wait" : "pointer" }}>
          🗑 Clear & Rescan
        </button>
      </div>

      {loading ? (
        <Panel style={{ textAlign: "center", padding: "60px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
          <div style={{ color: COLORS.muted }}>Loading intelligence feed...</div>
        </Panel>
      ) : items.length === 0 ? (
        <Panel style={{ textAlign: "center", padding: "60px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📡</div>
          <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: COLORS.gold, marginBottom: "8px" }}>No Tenders Loaded Yet</div>
          <div style={{ color: COLORS.muted, marginBottom: "20px" }}>Click below to load live tenders from FCDO, UK Contracts Finder, and other sources</div>
          <button onClick={runScan} disabled={scanning}
            style={{ background: COLORS.gold, border: "none", color: "#1A0A0E", fontFamily: "Poppins, sans-serif", fontSize: "0.78rem", fontWeight: 800, padding: "10px 24px", borderRadius: "2px", cursor: "pointer" }}>
            {scanning ? "⏳ Loading..." : "📡 Load Live Tenders"}
          </button>
        </Panel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "calc(100vh - 340px)", overflowY: "auto", paddingRight: "4px" }}>
          {items.map((item: any) => {
            const typeColor = INTEL_TYPE_COLOR[item.item_type] || COLORS.gold;
            const typeIcon = INTEL_TYPE_ICON[item.item_type] || "📄";
            return (
              <Panel key={item.id} style={{ padding: "16px 20px", borderLeft: `3px solid ${typeColor}`, position: "relative" as const }}>
                {item.is_new && (
                  <span style={{ position: "absolute" as const, top: "10px", right: "10px", fontSize: "0.5rem", fontWeight: 800, color: "#1A0A0E", background: "#34D399", padding: "2px 8px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.12em" }}>NEW</span>
                )}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  <div style={{ fontSize: "1.6rem", flexShrink: 0, marginTop: "2px" }}>{typeIcon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.1em", color: typeColor, textTransform: "uppercase" as const, background: typeColor + "15", padding: "2px 8px", borderRadius: "2px" }}>{item.category}</span>
                      <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.55rem", fontWeight: 600, color: COLORS.muted, letterSpacing: "0.08em" }}>{item.country}</span>
                      {item.source && <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.68rem", color: COLORS.muted }}>via {item.source}</span>}
                    </div>
                    <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.92rem", fontWeight: 500, color: COLORS.text, marginBottom: "6px", lineHeight: 1.3 }}>
                      {item.source_url ? (
                        <a href={item.source_url} target="_blank" rel="noreferrer" style={{ color: COLORS.text, textDecoration: "none" }}>{item.title} <span style={{ fontSize: "0.72rem", color: COLORS.gold }}>↗</span></a>
                      ) : item.title}
                    </div>
                    {item.summary && <div style={{ fontSize: "0.8rem", color: COLORS.muted, lineHeight: 1.5, marginBottom: "8px" }}>{item.summary}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {item.published_date && <span style={{ fontSize: "0.7rem", color: COLORS.muted }}>{new Date(item.published_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
                      <button onClick={() => toggleWatchlist(item)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.72rem", color: item.on_watchlist ? COLORS.gold : COLORS.muted, fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.08em" }}>
                        {item.on_watchlist ? "⭐ On Watchlist" : "☆ Add to Watchlist"}
                      </button>
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}

function TenderFinderTab({ onAddToTracker }: { onAddToTracker: (t: any) => void }) {
  const { toast } = useToast();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [country, setCountry] = useState("all");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("deadline");
  const [recency, setRecency] = useState(60);
  const [openOnly, setOpenOnly] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [valueMin, setValueMin] = useState("");
  const [valueMax, setValueMax] = useState("");
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [showProgrammeDisbursementOnly, setShowProgrammeDisbursementOnly] = useState(false);
  const [showHighStrategicOnly, setShowHighStrategicOnly] = useState(false);
  const [searchMeta, setSearchMeta] = useState<any>(null);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [feedResults, setFeedResults] = useState<Record<string, any[]>>({});
  const [feedLoading, setFeedLoading] = useState<Record<string, boolean>>({});
  const [feedErrors, setFeedErrors] = useState<Record<string, string>>({});
  const [expandedTender, setExpandedTender] = useState<string | null>(null);
  const [agentQuery, setAgentQuery] = useState("");
  const [agentResult, setAgentResult] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [bidOutlineModal, setBidOutlineModal] = useState<any>(null);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [finderMode, setFinderMode] = useState<"search" | "browse">("search");
  const [autoSearched, setAutoSearched] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [nextRefreshIn, setNextRefreshIn] = useState(300);
  const [newTenderIds, setNewTenderIds] = useState<Set<string>>(new Set());
  const [previousTenderIds, setPreviousTenderIds] = useState<Set<string>>(new Set());
  const AUTO_REFRESH_INTERVAL = 300;

  useEffect(() => { loadWatchlist(); }, []);

  useEffect(() => {
    if (!autoSearched) {
      setAutoSearched(true);
      searchTenders();
    }
  }, []);

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    setNextRefreshIn(AUTO_REFRESH_INTERVAL);
    const countdown = setInterval(() => {
      setNextRefreshIn(prev => {
        if (prev <= 1) {
          searchTenders();
          return AUTO_REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdown);
  }, [autoRefreshEnabled, country, category, recency, sortBy, openOnly, keyword, valueMin, valueMax]);

  async function loadWatchlist() {
    try {
      const res = await fetch("/api/tender-finder/watchlist", { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) {
        setWatchlist(new Set(data.map((w: any) => w.tender_ext_id)));
      }
    } catch {}
  }

  async function searchTenders(categoryOverride?: string) {
    setLoading(true);
    setSearched(true);
    try {
      const searchCat = categoryOverride || category;
      const params = new URLSearchParams();
      if (country !== "all") params.set("country", country);
      if (searchCat !== "all") params.set("category", searchCat);
      params.set("recency", String(recency));
      params.set("sort", sortBy);
      params.set("openOnly", String(openOnly));
      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (valueMin) params.set("valueMin", valueMin);
      if (valueMax) params.set("valueMax", valueMax);
      const res = await fetch(`/api/tender-finder/search?${params.toString()}`, { headers: authHeaders() });
      if (!res.ok) { console.error("Finder search failed:", res.status, await res.text()); setLoading(false); return; }
      const data = await res.json();
      console.log("Tender Finder results:", data.tenders?.length, "total:", data.total);
      const tenders = (data.tenders || []).filter((t: any) => {
        const status = String(t.status || "").toLowerCase();
        if (["closed", "awarded", "cancelled", "expired", "won", "lost"].includes(status)) return false;
        const deadline = t.deadline || t.closing_date || t.close_date || t.expiry_date;
        if (deadline) {
          const d = new Date(deadline);
          if (!isNaN(d.getTime()) && d.getTime() <= Date.now()) return false;
          const year = d.getFullYear();
          if (year === 2023 || year === 2024 || year === 2025) return false;
        }
        if (String(t.deadline || t.closing_date || t.close_date || t.expiry_date || "").toLowerCase().includes("closing soon")) return false;
        return true;
      });
      const currentIds = new Set<string>(tenders.map((t: any) => t.tender_id as string));
      if (previousTenderIds.size > 0) {
        const freshIds = new Set<string>();
        for (const id of currentIds) {
          if (!previousTenderIds.has(id)) freshIds.add(id);
        }
        if (freshIds.size > 0) {
          setNewTenderIds(freshIds);
          toast({ title: `${freshIds.size} new tender${freshIds.size > 1 ? "s" : ""} found`, description: "New opportunities highlighted below" });
        }
      }
      setPreviousTenderIds(currentIds);
      const scoredTenders = tenders.map((t: any) => ({
        ...t,
        finderMatches: getFinderRelevanceMatches(t),
      }));
      setResults(scoredTenders);
      setSearchMeta(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  }

  async function toggleWatchlist(tender: any) {
    const id = tender.tender_id;
    if (watchlist.has(id)) {
      try {
        await fetch(`/api/tender-finder/watchlist/${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders() });
        setWatchlist(w => { const n = new Set(w); n.delete(id); return n; });
        toast({ title: "Removed from watchlist" });
      } catch {}
    } else {
      try {
        await fetch("/api/tender-finder/watchlist", {
          method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ tender_ext_id: id }),
        });
        setWatchlist(w => { const n = new Set(w); n.add(id); return n; });
        toast({ title: "Added to watchlist" });
      } catch {}
    }
  }

  async function exportCSV() {
    try {
      const params = new URLSearchParams();
      if (country !== "all") params.set("country", country);
      if (category !== "all") params.set("category", category);
      const res = await fetch(`/api/tender-finder/export-csv?${params.toString()}`, { headers: authHeaders() });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tenders-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "CSV exported" });
    } catch { toast({ title: "Export failed", variant: "destructive" }); }
  }

  async function fetchLiveFeed(catId: string) {
    const cat = TENDER_AGENT_CATEGORIES.find(c => c.id === catId)!;
    setFeedLoading(l => ({ ...l, [catId]: true }));
    setFeedErrors(e => ({ ...e, [catId]: "" }));
    try {
      const allTenders: any[] = [];
      const searchTerms: string[] = [];
      if (cat.id === "fcdo") { searchTerms.push("FCDO", "Foreign Commonwealth Development", "FCDO conference", "FCDO programme", "FCDO event", "UK aid"); }
      else if (cat.id === "defra") { searchTerms.push("DEFRA", "DEFRA conference", "DEFRA engagement", "environment sustainability event", "DEFRA meeting", "DEFRA workshop"); }
      else if (cat.id === "british_council") { searchTerms.push("British Council", "British Council conference", "British Council event", "British Council programme", "British Council training", "British Council workshop", "British Council education", "English language programme"); }
      else if (cat.id === "british_high_commission") { searchTerms.push("British High Commission", "British Embassy", "British Consulate", "UK diplomatic", "British High Commission event", "British High Commission conference", "UK mission overseas", "diplomatic reception"); }
      else if (cat.id === "hmrc") { searchTerms.push("HMRC", "HMRC conference", "HMRC meeting", "HMRC event", "HMRC training", "HMRC workshop", "HM Revenue Customs", "HMRC venue"); }
      else if (cat.id === "princes_trust") { searchTerms.push("Princes Trust", "Prince's Trust", "Kings Trust", "King's Trust", "Princes Trust event", "Princes Trust programme", "Princes Trust conference", "Kings Trust event", "youth enterprise"); }
      else if (cat.id === "cabinet_office") { searchTerms.push("Cabinet Office", "Cabinet Office conference", "Cabinet Office event", "Cabinet Office meeting", "civil service event", "Crown Commercial"); }
      else if (cat.id === "home_office") { searchTerms.push("Home Office", "Home Office conference", "Home Office event", "Home Office meeting", "Home Office training"); }
      else if (cat.id === "mod") { searchTerms.push("Ministry of Defence", "MOD conference", "MOD event", "MOD meeting", "defence conference", "military event"); }
      else if (cat.id === "nmo") { searchTerms.push("NMO", "National Measurement Office", "BEIS", "DSIT", "DSIT conference", "DSIT event", "science innovation conference"); }
      else if (cat.id === "dwp") { searchTerms.push("DWP", "DWP conference", "DWP meeting", "DWP event", "Department Work Pensions", "DWP training"); }
      else if (cat.id === "hm_treasury") { searchTerms.push("HM Treasury", "Treasury conference", "Treasury meeting", "Treasury event", "Exchequer"); }
      else if (cat.id === "moj") { searchTerms.push("Ministry of Justice", "MOJ conference", "MOJ meeting", "MOJ event", "MOJ training", "courts service"); }
      else if (cat.id === "dfe") { searchTerms.push("Department for Education", "DfE conference", "DfE meeting", "DfE event", "education conference"); }
      else if (cat.id === "dhsc") { searchTerms.push("DHSC", "Department Health Social Care", "NHS conference", "NHS event", "NHS meeting", "health conference"); }
      else if (cat.id === "dft") { searchTerms.push("Department for Transport", "DfT conference", "DfT meeting", "DfT event", "transport conference"); }
      else if (cat.id === "ukef") { searchTerms.push("UK Export Finance", "UKEF", "export credit", "trade finance", "UKEF Africa", "export guarantee"); }
      else if (cat.id === "bii") { searchTerms.push("British International Investment", "BII", "CDC Group", "development finance", "BII Africa", "CDC Africa investment"); }
      else if (cat.id === "dbt") { searchTerms.push("Department for Business and Trade", "DBT", "DIT", "international trade", "trade commissioner", "export promotion", "DBT Africa"); }
      else if (cat.id === "events_uk") { searchTerms.push("event management", "conference management", "event planning", "conference organising", "venue management", "exhibition management", "hospitality services", "delegate management", "event production"); }
      else if (cat.id === "events_global") { searchTerms.push("event management", "conference management", "summit management", "workshop facilitation", "exhibition management"); }
      else if (cat.id === "nigeria") { searchTerms.push("Nigeria event management", "Nigeria conference", "Nigeria training", "Lagos event management"); }
      else if (cat.id === "africa") { searchTerms.push("Africa programme", "Africa conference management", "Africa training", "capacity building Africa", "Africa development", "Africa project", "Africa disbursement", "Africa remittance", "Africa cross-border"); }
      else if (cat.id === "remittance") { searchTerms.push("remittance", "money transfer", "payment service provider", "cross-border payments", "foreign exchange", "diaspora remittance", "mobile money", "fintech", "payout services", "e-money", "currency exchange", "international money transfer"); }
      else if (cat.id === "intl_dev") { searchTerms.push("international development", "overseas development", "development programme", "World Bank", "UNDP", "Africa development", "bilateral aid", "technical assistance", "ODA"); }
      else if (cat.id === "pmo") { searchTerms.push("project management", "project management consultancy", "PMO services", "project delivery", "project governance", "advisory services"); }
      else if (cat.id === "training") { searchTerms.push("training services", "training delivery", "capacity building", "learning development", "professional development", "workshop delivery"); }
      else if (cat.id === "souvenirs") { searchTerms.push("corporate gifts", "promotional products", "branded merchandise", "souvenirs", "gift hampers", "trophies", "branded products"); }
      else if (cat.id === "universities") { searchTerms.push("university event management", "university conference", "graduation ceremony", "higher education event", "campus event management"); }
      else if (cat.id === "decor_styling") { searchTerms.push("decoration services", "event decoration", "table dressing", "floral arrangements", "venue dressing", "styling services", "centrepiece"); }
      else if (cat.id === "corporate") { searchTerms.push("corporate event management", "corporate hospitality", "team building", "corporate conference", "product launch event", "brand activation"); }
      else if (cat.id === "weddings") { searchTerms.push("wedding planning", "wedding coordination", "private event planning", "celebration event"); }
      else if (cat.id === "gdpr") { searchTerms.push("GDPR", "data protection", "data privacy", "information governance", "DPO services", "privacy compliance", "DPIA", "ISO 27001", "cybersecurity", "information security"); }
      else if (cat.id === "e2e_planning") { searchTerms.push("event management", "event planning", "event production", "event logistics", "event delivery", "event coordination", "delegate management"); }
      else if (cat.id === "jobs") { searchTerms.push("event manager", "event coordinator", "conference manager", "event planner", "event producer", "event director", "hospitality manager"); }
      const seen = new Set<string>();
      const feedEndpoints = [
        { url: "/api/tender-feed/contracts-finder", size: 15 },
        { url: "/api/tender-feed/find-a-tender", size: 10 },
        { url: "/api/tender-feed/pro-contract", size: 10 },
        { url: "/api/tender-feed/public-contracts-scotland", size: 8 },
        { url: "/api/tender-feed/ted-eu", size: 8 },
        ...(cat.id === "nigeria" || cat.id === "africa" || cat.id === "intl_dev" ? [
          { url: "/api/tender-feed/nigeria", size: 10 },
          { url: "/api/tender-feed/ungm-undp", size: 10 },
        ] : [
          { url: "/api/tender-feed/ungm-undp", size: 5 },
        ]),
      ];
      for (const term of searchTerms) {
        const fetchPromises = feedEndpoints.map(async (ep) => {
          try {
            const r = await fetch(`${ep.url}?keyword=${encodeURIComponent(term)}&size=${ep.size}`, { headers: { "Authorization": `Bearer ${localStorage.getItem("tender_token")}` } });
            const d = await r.json();
            for (const t of (d.tenders || [])) { if (!seen.has(t.title)) { seen.add(t.title); allTenders.push(t); } }
          } catch {}
        });
        await Promise.all(fetchPromises);
      }
      allTenders.sort((a, b) => { if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime(); return 0; });
      setFeedResults(r => ({ ...r, [catId]: allTenders }));
      if (allTenders.length === 0) setFeedErrors(e => ({ ...e, [catId]: "No tenders found for these search terms. Try a different category." }));
    } catch { setFeedErrors(e => ({ ...e, [catId]: "Failed to fetch live tenders. Please try again." })); }
    setFeedLoading(l => ({ ...l, [catId]: false }));
  }

  async function askAgent() {
    if (!agentQuery.trim()) return;
    setAgentLoading(true);
    setAgentResult("");
    try {
      const res = await fetch("/api/tender-ai/search-advisor", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ query: agentQuery }),
      });
      const data = await res.json();
      setAgentResult(data.content || "Error.");
    } catch { setAgentResult("Error connecting to EP Agent."); }
    setAgentLoading(false);
  }

  async function generateBidOutline(tender: any) {
    setGeneratingOutline(true);
    setBidOutlineModal({ title: tender.title, loading: true });
    try {
      const res = await fetch("/api/tender-ai/search-advisor", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ query: `Generate a detailed bid outline for this tender. Include: executive summary approach, key win themes, suggested evidence points from Event Perfekt's track record, questions to answer, risks to address, and recommended bid structure. TENDER: "${tender.title}" by ${tender.buyer || "unknown buyer"}. ${tender.short_summary || ""}` }),
      });
      const data = await res.json();
      setBidOutlineModal({ title: tender.title, content: data.content || "Error generating outline.", loading: false });
    } catch {
      setBidOutlineModal({ title: tender.title, error: "Failed to generate bid outline.", loading: false });
    }
    setGeneratingOutline(false);
  }

  function formatValue(amount: number | null, currency: string) {
    if (!amount) return null;
    if (currency === "GBP") return `£${amount.toLocaleString()}`;
    return `${currency} ${amount.toLocaleString()}`;
  }

  const displayed = results.filter(t => {
    if (!t.finderMatches || t.finderMatches.length === 0) return false;
    if (showWatchlistOnly && !watchlist.has(t.tender_id)) return false;
    if (showProgrammeDisbursementOnly && !t.programme_disbursement) return false;
    if (showHighStrategicOnly && !t.high_strategic_opportunity) return false;
    return true;
  });

  const formatVal = (amount: number | null, currency: string) => {
    if (!amount) return null;
    const sym = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency + " ";
    return `${sym}${Number(amount).toLocaleString()}`;
  };

  const selectStyle: any = {
    background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text,
    padding: "6px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", fontSize: "0.78rem",
    cursor: "pointer",
  };

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
          Tender <em style={{ color: COLORS.gold }}>Finder</em>
        </h1>
        <p style={{ color: COLORS.muted, marginTop: "6px", fontSize: "0.82rem" }}>
          Live tender search across UK Government, Nigeria, and international procurement portals — auto-searches on load
        </p>
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "18px" }}>
        <Btn onClick={() => setFinderMode("search")} variant={finderMode === "search" ? "primary" : "secondary"} small>🔍 Portal Search</Btn>
        <Btn onClick={() => setFinderMode("browse")} variant={finderMode === "browse" ? "primary" : "secondary"} small>📂 Browse by Category</Btn>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        {PRIORITY_SERVICES.map(svc => (
          <button key={svc.id} onClick={() => { setCategory(svc.id); setFinderMode("search"); searchTenders(svc.id); }} style={{
            background: svc.bg !== "transparent" ? svc.bg : COLORS.accent + "44",
            border: svc.bg !== "transparent" ? "none" : `1px solid ${svc.color}55`,
            color: "white",
            padding: "10px 20px",
            borderRadius: "4px",
            fontFamily: "Poppins, sans-serif",
            fontSize: "0.78rem",
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s",
            boxShadow: svc.bg !== "transparent" ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
          }}>
            <span style={{ fontSize: "1rem" }}>{svc.icon}</span> {svc.label}
          </button>
        ))}
      </div>

      {finderMode === "search" && (
        <Panel style={{ marginBottom: "20px" }}>
          <SectionHeading>🔍 Live Portal Search</SectionHeading>

          <div style={{ display: "flex", gap: "10px", marginBottom: "6px", alignItems: "stretch" }}>
            <div style={{ flex: 1, position: "relative" as const }}>
              <input value={keyword} onChange={(e: any) => setKeyword(e.target.value)}
                placeholder=""
                onKeyDown={(e: any) => e.key === "Enter" && searchTenders()}
                style={{
                  width: "100%", padding: "14px 20px", fontSize: "1rem", fontFamily: "Poppins, sans-serif",
                  background: "#0A0F1A", border: `2px solid ${COLORS.gold}55`, borderRadius: "4px",
                  color: COLORS.text, outline: "none", boxSizing: "border-box" as const,
                }} />
            </div>
            <button onClick={() => searchTenders()} disabled={loading}
              style={{
                padding: "14px 28px", fontSize: "0.9rem", fontFamily: "Poppins, sans-serif",
                fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const,
                background: `linear-gradient(135deg, ${COLORS.gold}, #B8941F)`, color: "#1A0A0E",
                border: "none", borderRadius: "4px", cursor: loading ? "wait" : "pointer",
                whiteSpace: "nowrap" as const, opacity: loading ? 0.7 : 1,
              }}>
              {loading ? "⏳ Searching..." : "🔍 Search"}
            </button>
            {keyword.trim() && (
              <button onClick={() => { setKeyword(""); searchTenders(); }}
                style={{
                  padding: "14px 16px", fontSize: "0.85rem", fontFamily: "Poppins, sans-serif",
                  background: "transparent", border: `1px solid ${COLORS.panelBorder}`, borderRadius: "4px",
                  color: COLORS.muted, cursor: "pointer",
                }} title="Clear search">
                ✕ Clear
              </button>
            )}
          </div>
          <div style={{ fontSize: "0.7rem", fontFamily: "Poppins, sans-serif", color: COLORS.muted, marginBottom: "14px", lineHeight: 1.4 }}>
            Live results from UK, Africa, World Bank, UN, FCDO, USAID &amp; global procurement portals
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: "0.6rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.12em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "4px" }}>Country</div>
              <select value={country} onChange={(e: any) => setCountry(e.target.value)} style={selectStyle}>
                {FINDER_COUNTRIES.map(c => <option key={c} value={c}>{c === "all" ? "All Countries" : c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "0.6rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.12em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "4px" }}>Category</div>
              <select value={category} onChange={(e: any) => setCategory(e.target.value)} style={selectStyle}>
                {FINDER_CATS.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "0.6rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.12em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "4px" }}>Published Within</div>
              <select value={recency} onChange={(e: any) => setRecency(Number(e.target.value))} style={selectStyle}>
                {RECENCY_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "0.6rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.12em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "4px" }}>Sort By</div>
              <select value={sortBy} onChange={(e: any) => setSortBy(e.target.value)} style={selectStyle}>
                {FINDER_SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <Btn onClick={() => searchTenders()} disabled={loading}>
              {loading ? "⏳ Searching portals..." : "🔍 Search Live Tenders"}
            </Btn>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.78rem", color: COLORS.muted }}>
              <input type="checkbox" checked={openOnly} onChange={(e: any) => setOpenOnly(e.target.checked)}
                style={{ accentColor: COLORS.gold }} />
              Open only
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.78rem", color: COLORS.muted }}>
              <input type="checkbox" checked={showWatchlistOnly} onChange={(e: any) => setShowWatchlistOnly(e.target.checked)}
                style={{ accentColor: COLORS.gold }} />
              ⭐ Watchlist only
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.78rem", color: showProgrammeDisbursementOnly ? "#10B981" : COLORS.muted }}>
              <input type="checkbox" checked={showProgrammeDisbursementOnly} onChange={(e: any) => setShowProgrammeDisbursementOnly(e.target.checked)}
                style={{ accentColor: "#10B981" }} />
              🏦 Programme + Disbursement only
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.78rem", color: showHighStrategicOnly ? "#F59E0B" : COLORS.muted }}>
              <input type="checkbox" checked={showHighStrategicOnly} onChange={(e: any) => setShowHighStrategicOnly(e.target.checked)}
                style={{ accentColor: "#F59E0B" }} />
              🔥 High Strategic only
            </label>
            {results.length > 0 && (
              <Btn onClick={exportCSV} variant="secondary" small>📥 Export CSV</Btn>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginTop: "8px", padding: "8px 12px", background: "rgba(201,168,76,0.08)", borderRadius: "6px", border: "1px solid rgba(201,168,76,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: autoRefreshEnabled ? "#10B981" : "#6B7280", boxShadow: autoRefreshEnabled ? "0 0 6px #10B981" : "none", animation: autoRefreshEnabled && !loading ? "pulse 2s infinite" : "none" }} />
              <span style={{ fontSize: "0.72rem", fontFamily: "Poppins, sans-serif", color: autoRefreshEnabled ? "#10B981" : COLORS.muted, fontWeight: 600 }}>
                {autoRefreshEnabled ? "LIVE" : "PAUSED"}
              </span>
              <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", fontSize: "0.7rem", color: COLORS.muted }}>
                <input type="checkbox" checked={autoRefreshEnabled} onChange={(e: any) => setAutoRefreshEnabled(e.target.checked)}
                  style={{ accentColor: COLORS.gold, width: "14px", height: "14px" }} />
                Auto-refresh
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {lastRefreshed && (
                <span style={{ fontSize: "0.68rem", color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>
                  Last updated: {lastRefreshed.toLocaleTimeString()}
                </span>
              )}
              {autoRefreshEnabled && !loading && (
                <span style={{ fontSize: "0.68rem", color: COLORS.gold, fontFamily: "Poppins, sans-serif", fontWeight: 600 }}>
                  Next refresh: {Math.floor(nextRefreshIn / 60)}:{String(nextRefreshIn % 60).padStart(2, "0")}
                </span>
              )}
              {loading && (
                <span style={{ fontSize: "0.68rem", color: "#F59E0B", fontFamily: "Poppins, sans-serif" }}>
                  ⏳ Refreshing live data...
                </span>
              )}
            </div>
          </div>
        </Panel>
      )}

      {finderMode === "search" && searchMeta && searched && (
        <>
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
            <Panel style={{ flex: "1 1 120px", minWidth: "120px", textAlign: "center", padding: "14px 10px" }}>
              <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.8rem", fontWeight: 800, color: COLORS.gold }}>{displayed.length}</div>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Total Results</div>
            </Panel>
            <Panel style={{ flex: "1 1 120px", minWidth: "120px", textAlign: "center", padding: "14px 10px" }}>
              <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.8rem", fontWeight: 800, color: COLORS.text }}>{searchMeta.sources_searched?.length || 0}</div>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Sources</div>
            </Panel>
            <Panel style={{ flex: "1 1 120px", minWidth: "120px", textAlign: "center", padding: "14px 10px" }}>
              <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.8rem", fontWeight: 800, color: COLORS.amber }}>{watchlist.size}</div>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Watchlist</div>
            </Panel>
            <Panel style={{ flex: "1 1 120px", minWidth: "120px", textAlign: "center", padding: "14px 10px", cursor: "pointer", border: showProgrammeDisbursementOnly ? "1px solid #10B981" : undefined }} onClick={() => setShowProgrammeDisbursementOnly(p => !p)}>
              <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.8rem", fontWeight: 800, color: "#10B981" }}>{searchMeta?.programme_disbursement_count || results.filter(t => t.programme_disbursement).length}</div>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Prog + Disbursement</div>
            </Panel>
            <Panel style={{ flex: "1 1 120px", minWidth: "120px", textAlign: "center", padding: "14px 10px", cursor: "pointer", border: showHighStrategicOnly ? "1px solid #F59E0B" : undefined, background: (searchMeta?.high_strategic_count || results.filter(t => t.high_strategic_opportunity).length) > 0 ? "#F59E0B0D" : undefined }} onClick={() => setShowHighStrategicOnly(p => !p)}>
              <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.8rem", fontWeight: 800, color: "#F59E0B" }}>{searchMeta?.high_strategic_count || results.filter(t => t.high_strategic_opportunity).length}</div>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>🔥 High Strategic</div>
            </Panel>
            {(searchMeta?.local_priority_count || 0) > 0 && (
              <Panel style={{ flex: "1 1 120px", minWidth: "120px", textAlign: "center", padding: "14px 10px" }}>
                <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.8rem", fontWeight: 800, color: "#10B981" }}>{searchMeta.local_priority_count}</div>
                <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>🏠 Local Priority</div>
              </Panel>
            )}
          </div>
          {searchMeta.sources_searched?.length > 0 && (
            <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", color: COLORS.muted, fontFamily: "Poppins, sans-serif", textTransform: "uppercase" as const, marginRight: "4px" }}>Sources:</span>
              {(searchMeta.sources_searched as string[]).map((src: string) => {
                const bg = src === "Contracts Finder" ? "#3B82F6" : src === "Find a Tender" ? "#22C55E" : src === "UNGM" ? "#8B5CF6" : src === "UNDP" ? "#06B6D4" : src === "World Bank" ? "#F59E0B" : src === "NGTenders" ? "#10B981" : src === "AfDB" ? "#EC4899" : src === "Devex" ? "#F97316" : src === "TED (EU)" ? "#6366F1" : COLORS.gold;
                const count = displayed.filter(t => t.source_name === src).length;
                return (
                  <span key={src} style={{ fontSize: "0.58rem", fontWeight: 800, padding: "3px 8px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em", color: "#1A0A0E", background: bg }}>
                    {src} ({count})
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}

      {finderMode === "search" && loading && (
        <Panel style={{ textAlign: "center", padding: "60px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "16px", animation: "pulse 1.5s infinite" }}>🔍</div>
          <div style={{ color: COLORS.gold, fontFamily: "Poppins, sans-serif", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const, marginBottom: "12px" }}>
            Searching Live Procurement Portals...
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", marginBottom: "14px" }}>
            {(country === "all" || country === "UK") && <>
              <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", color: "#1A0A0E", background: "#3B82F6" }}>Contracts Finder</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", color: "#1A0A0E", background: "#22C55E" }}>Find a Tender</span>
            </>}
            {(country === "all" || country === "Nigeria" || country === "Africa") && <>
              <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", color: "#1A0A0E", background: "#10B981" }}>NGTenders</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", color: "#1A0A0E", background: "#F59E0B" }}>World Bank</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", color: "#1A0A0E", background: "#EC4899" }}>AfDB</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", color: "#1A0A0E", background: "#F97316" }}>Devex</span>
            </>}
            {(country === "all" || country === "International" || country === "Africa" || country === "Nigeria") && <>
              <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", color: "#1A0A0E", background: "#8B5CF6" }}>UNGM</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", color: "#1A0A0E", background: "#06B6D4" }}>UNDP</span>
            </>}
          </div>
          <div style={{ color: COLORS.muted, fontSize: "0.78rem" }}>This may take 15–30 seconds as we query multiple live portals</div>
        </Panel>
      )}

      {finderMode === "search" && !loading && searched && displayed.length === 0 && (
        <Panel style={{ textAlign: "center", padding: "60px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📭</div>
          <div style={{ color: COLORS.muted, fontStyle: "italic" }}>No tenders found matching your filters. Try broadening your search or changing the category.</div>
        </Panel>
      )}

      {finderMode === "search" && !loading && displayed.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
          {displayed.map((t: any, idx: number) => {
            const days = t.deadline_date ? daysUntil(t.deadline_date) : null;
            const urgency = days !== null && days <= 7 ? COLORS.red : days !== null && days <= 14 ? COLORS.amber : COLORS.green;
            const isWatched = watchlist.has(t.tender_id);
            const val = formatVal(t.value_estimate, t.currency);
            const countryFlag = t.country === "UK" ? "🇬🇧" : t.country === "Nigeria" ? "🇳🇬" : "🌍";
            const isExpanded = expandedTender === (t.tender_id || String(idx));
            const sourceBg = t.source_name === "Contracts Finder" ? "#3B82F6" : t.source_name === "Find a Tender" ? "#22C55E" : t.source_name === "UNGM" ? "#8B5CF6" : t.source_name === "UNDP" ? "#06B6D4" : t.source_name === "World Bank" ? "#F59E0B" : t.source_name === "NGTenders" ? "#10B981" : t.source_name === "AfDB" ? "#EC4899" : t.source_name === "Devex" ? "#F97316" : t.source_name === "TED (EU)" ? "#6366F1" : t.source_name === "Pro Contract" ? "#F472B6" : t.source_name === "Public Contracts Scotland" ? "#2DD4BF" : t.source_name === "Sell2Wales" ? "#E11D48" : t.source_name === "eTenders Ireland" ? "#34D399" : t.source_name === "BPP Nigeria" ? "#A78BFA" : COLORS.gold;
            return (
              <Panel key={t.tender_id || idx} style={{ padding: "0", borderLeft: `3px solid ${urgency}`, overflow: "hidden" }}>
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: "8px" }}>
                        {t.source_url ? (
                          <a href={t.source_url} target="_blank" rel="noreferrer" style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.95rem", fontWeight: 600, color: COLORS.text, textDecoration: "none", lineHeight: 1.35, display: "inline" }}>
                            {t.title} <span style={{ fontSize: "0.72rem", color: COLORS.gold }}>↗</span>
                          </a>
                        ) : (
                          <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.95rem", fontWeight: 600, color: COLORS.text, lineHeight: 1.35 }}>{t.title}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                        <span style={{ fontSize: "0.55rem", fontWeight: 800, padding: "2px 8px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", color: "#1A0A0E", background: sourceBg }}>{t.source_name}</span>
                        <span style={{ fontSize: "0.55rem", fontWeight: 700, padding: "2px 8px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em",
                          color: COLORS.green, background: COLORS.green + "15", border: `1px solid ${COLORS.green}33` }}>{t.status === "PIN" ? "PIN" : "OPEN"}</span>
                        {t.category_tags && t.category_tags !== "Other" && (
                          <span style={{ fontSize: "0.55rem", fontWeight: 700, padding: "2px 8px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em",
                            color: COLORS.gold, background: COLORS.gold + "15", border: `1px solid ${COLORS.gold}33` }}>{t.category_tags}</span>
                        )}
                        {t.programme_disbursement && (
                          <span style={{ fontSize: "0.55rem", fontWeight: 700, padding: "2px 8px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em",
                            color: "#10B981", background: "#10B98115", border: "1px solid #10B98133" }}>🏦 PROG + DISBURSEMENT</span>
                        )}
                        {t.high_strategic_opportunity && (
                          <span style={{ fontSize: "0.55rem", fontWeight: 800, padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em",
                            color: "#1A0A0E", background: "linear-gradient(90deg, #F59E0B, #EF4444)", border: "none" }}>🔥 HIGH STRATEGIC</span>
                        )}
                        {newTenderIds.has(t.tender_id) && (
                          <span style={{ fontSize: "0.55rem", fontWeight: 800, padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em",
                            color: "#1A0A0E", background: "#22C55E", animation: "pulse 2s infinite" }}>✨ NEW</span>
                        )}
                        {checkLocalPriority(t) && (
                          <span style={{ fontSize: "0.55rem", fontWeight: 800, padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em",
                            color: "#FFFFFF", background: "linear-gradient(90deg, #10B981, #059669)", border: "none" }}>🏠 LOCAL PRIORITY</span>
                        )}
                        {t.also_on?.length > 0 && (
                          <span style={{ fontSize: "0.55rem", fontWeight: 600, padding: "2px 8px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em",
                            color: COLORS.muted, background: COLORS.accent + "44" }}>Also on: {t.also_on.join(", ")}</span>
                        )}
                      </div>
                      {t.finderMatches?.length > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                          <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, fontFamily: "Poppins, sans-serif", color: COLORS.muted, whiteSpace: "nowrap" as const }}>Matched:</span>
                          {t.finderMatches.map((m: string) => (
                            <span key={m} style={{ fontSize: "0.6rem", fontWeight: 700, padding: "2px 7px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em", color: COLORS.gold, background: COLORS.gold + "18", border: `1px solid ${COLORS.gold}33` }}>
                              {m.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, auto))", gap: "8px 20px", fontSize: "0.78rem", color: COLORS.muted }}>
                        <div><span style={{ color: COLORS.muted, fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Buyer</span><div style={{ color: COLORS.text, fontWeight: 500, marginTop: "2px" }}>{t.buyer}</div></div>
                        <div><span style={{ color: COLORS.muted, fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Location</span><div style={{ marginTop: "2px" }}>{countryFlag} {t.country}{t.location && t.location !== t.country ? ` · ${t.location}` : ""}</div></div>
                        <div><span style={{ color: COLORS.muted, fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Value</span><div style={{ color: val ? COLORS.gold : COLORS.muted, fontWeight: val ? 600 : 400, marginTop: "2px" }}>{val || "Not specified"}</div></div>
                        <div><span style={{ color: COLORS.muted, fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Deadline</span><div style={{ color: t.deadline_date ? urgency : COLORS.muted, fontWeight: t.deadline_date ? 600 : 400, marginTop: "2px" }}>{t.deadline_date ? `${t.deadline_date}${days !== null ? ` (${days}d)` : ""}` : "Not specified"}</div></div>
                        {t.publish_date && <div><span style={{ color: COLORS.muted, fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Published</span><div style={{ marginTop: "2px" }}>{t.publish_date}</div></div>}
                      </div>
                      {t.short_summary && !isExpanded && (
                        <div style={{ fontSize: "0.8rem", color: COLORS.muted, marginTop: "10px", lineHeight: 1.6, maxHeight: "48px", overflow: "hidden", position: "relative" as const }}>
                          {t.short_summary}
                          <div style={{ position: "absolute" as const, bottom: 0, left: 0, right: 0, height: "24px", background: `linear-gradient(transparent, ${COLORS.panel})` }} />
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px", flexShrink: 0, alignItems: "stretch" }}>
                      <button onClick={() => toggleWatchlist(t)} title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                        style={{ background: isWatched ? COLORS.gold + "15" : "transparent", border: `1px solid ${isWatched ? COLORS.gold + "44" : COLORS.panelBorder}`, cursor: "pointer", fontSize: "0.9rem", padding: "6px 10px", borderRadius: "2px", color: isWatched ? COLORS.gold : COLORS.muted }}>
                        {isWatched ? "⭐" : "☆"}
                      </button>
                      <Btn onClick={() => setExpandedTender(isExpanded ? null : (t.tender_id || String(idx)))} variant="secondary" small>{isExpanded ? "− Less" : "+ More"}</Btn>
                      <Btn onClick={() => onAddToTracker({
                        title: t.title, buyer: t.buyer, value: val || t.value_estimate || "",
                        deadline: t.deadline_date || "", category: t.category_tags || "",
                        source: t.source_name, description: t.short_summary || "", url: t.source_url || "",
                      })} variant="green" small>+ Track</Btn>
                      <Btn onClick={() => generateBidOutline(t)} variant="fcdo" small disabled={generatingOutline}>Bid Outline</Btn>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${COLORS.panelBorder}`, padding: "14px 18px", background: "#0A0F1A" }}>
                    {t.short_summary ? (
                      <div style={{ fontSize: "0.84rem", color: COLORS.muted, lineHeight: 1.7, marginBottom: t.cpv_codes ? "10px" : "0" }}>{t.short_summary}</div>
                    ) : (
                      <div style={{ fontSize: "0.82rem", color: COLORS.muted, fontStyle: "italic", marginBottom: t.cpv_codes ? "10px" : "0" }}>No description available. Click "View" to see full details on the source portal.</div>
                    )}
                    {t.cpv_codes && (
                      <div style={{ fontSize: "0.72rem", color: COLORS.muted, marginTop: "6px" }}>
                        <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.08em", color: COLORS.gold, fontSize: "0.62rem", textTransform: "uppercase" as const }}>CPV Codes: </span>{t.cpv_codes}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px", alignItems: "center" }}>
                      {t.source_url && (
                        <a href={t.source_url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                          <Btn variant="fcdo" small>View on {t.source_name} ↗</Btn>
                        </a>
                      )}
                      <span style={{ fontSize: "0.68rem", color: COLORS.muted }}>ID: {t.tender_id}</span>
                    </div>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      {finderMode === "browse" && (
        <>
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
            {TENDER_AGENT_CATEGORIES.map(c => {
              const count = feedResults[c.id]?.length || 0;
              return (
                <button key={c.id} onClick={() => { setActiveCategory(c.id); if (!feedResults[c.id] && !feedLoading[c.id]) fetchLiveFeed(c.id); }} style={{
                  padding: "9px 18px",
                  background: activeCategory === c.id ? c.color + "22" : "transparent",
                  border: `1px solid ${activeCategory === c.id ? c.color + "66" : COLORS.panelBorder}`,
                  color: activeCategory === c.id ? c.color : COLORS.muted,
                  fontFamily: "Poppins, sans-serif", fontSize: "0.72rem",
                  fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const,
                  cursor: "pointer", borderRadius: "2px", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: "6px"
                }}>
                  <span>{c.icon}</span> {c.label}
                  {c.priority && <span style={{ background: COLORS.red, color: "white", borderRadius: "2px", padding: "1px 5px", fontSize: "0.55rem", fontWeight: 800 }}>!</span>}
                  {count > 0 && <span style={{ background: c.color, color: "#1A0A0E", borderRadius: "2px", padding: "1px 6px", fontSize: "0.62rem", fontWeight: 800 }}>{count}</span>}
                </button>
              );
            })}
          </div>

          {activeCategory && (() => {
            const cat = TENDER_AGENT_CATEGORIES.find(c => c.id === activeCategory)!;
            const catResults = feedResults[activeCategory] || [];
            const isCatLoading = feedLoading[activeCategory];
            const catError = feedErrors[activeCategory];
            return (
              <Panel style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <SectionHeading style={{ marginBottom: 0 }}>{cat.icon} {cat.label} — Live Tenders</SectionHeading>
                  <Btn onClick={() => fetchLiveFeed(activeCategory)} small disabled={isCatLoading}>
                    {isCatLoading ? "⟳ Pulling..." : "⟳ Fetch Live Tenders"}
                  </Btn>
                </div>

                {!feedResults[activeCategory] && !isCatLoading && (
                  <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "16px" }}>{cat.icon}</div>
                    <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.3rem", color: COLORS.text, marginBottom: "8px" }}>{cat.label}</div>
                    <p style={{ color: COLORS.muted, fontSize: "0.85rem", marginBottom: "24px", maxWidth: "500px", margin: "0 auto 24px" }}>
                      Click below to pull <strong style={{ color: COLORS.gold }}>real live tenders</strong> from Contracts Finder & Find a Tender
                    </p>
                    <Btn onClick={() => fetchLiveFeed(activeCategory)}>Pull Live Tenders</Btn>
                  </div>
                )}

                {isCatLoading && (
                  <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.85rem", letterSpacing: "0.2em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "10px" }}>
                      Fetching from Contracts Finder & Find a Tender...
                    </div>
                  </div>
                )}

                {catError && !isCatLoading && (
                  <div style={{ textAlign: "center", padding: "40px", color: COLORS.muted }}>
                    <div style={{ marginBottom: "16px" }}>{catError}</div>
                    <Btn onClick={() => fetchLiveFeed(activeCategory)} small>Try Again</Btn>
                  </div>
                )}

                {catResults.length > 0 && !isCatLoading && (
                  <>
                    <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.15em", color: COLORS.green, textTransform: "uppercase" as const, marginBottom: "16px" }}>
                      {catResults.length} live tender{catResults.length !== 1 ? "s" : ""} found from government portals
                    </div>
                    {catResults.map((t: any, i: number) => {
                      const days = t.deadline ? daysUntil(t.deadline) : null;
                      const deadlineColor = days !== null ? (days <= 0 ? COLORS.red : days <= 7 ? COLORS.red : days <= 21 ? COLORS.amber : COLORS.green) : COLORS.muted;
                      const isExpanded = expandedTender === (t.id || String(i));
                      return (
                        <div key={t.id || i} style={{ borderBottom: `1px solid ${COLORS.panelBorder}`, padding: "16px 0" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", alignItems: "start" }}>
                            <div>
                              <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: "0.95rem", marginBottom: "8px" }}>
                                {t.source_url ? (
                                  <a href={t.source_url} target="_blank" rel="noreferrer" style={{ color: COLORS.gold, textDecoration: "none" }}>
                                    {t.title} ↗
                                  </a>
                                ) : <span style={{ color: COLORS.text }}>{t.title}</span>}
                              </div>
                              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                                <span style={{ fontSize: "0.78rem", color: COLORS.muted }}>🏢 {t.buyer}</span>
                                {formatValue(t.value_amount, t.value_currency) && (
                                  <span style={{ fontSize: "0.78rem", color: COLORS.green, fontWeight: 600 }}>💰 {formatValue(t.value_amount, t.value_currency)}</span>
                                )}
                                {t.deadline && (
                                  <span style={{ fontSize: "0.78rem", color: deadlineColor, fontWeight: 600 }}>
                                    📅 {t.deadline} {days !== null && days > 0 ? `(${days}d left)` : days === 0 ? "(TODAY)" : days !== null ? "(CLOSED)" : ""}
                                  </span>
                                )}
                                <span style={{ fontSize: "0.65rem", color: "#1A0A0E", background: t.source === "Contracts Finder" ? "#3B82F6" : t.source === "Find a Tender" ? "#22C55E" : t.source === "Pro Contract" ? "#F472B6" : t.source === "Public Contracts Scotland" ? "#2DD4BF" : t.source === "Sell2Wales" ? "#E11D48" : t.source === "TED (EU)" ? "#6366F1" : t.source === "eTenders Ireland" ? "#34D399" : t.source === "UNGM" ? "#8B5CF6" : t.source === "UNDP" ? "#06B6D4" : t.source === "World Bank" ? "#F59E0B" : t.source === "AfDB" ? "#EC4899" : t.source === "BPP Nigeria" ? "#A78BFA" : "#22C55E", padding: "2px 8px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", fontWeight: 800 }}>{t.source}</span>
                                {t.programme_disbursement && (
                                  <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "2px 8px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em",
                                    color: "#10B981", background: "#10B98118", border: "1px solid #10B98133" }}>🏦 PROG + DISBURSEMENT</span>
                                )}
                                {t.programme_disbursement && (t.value_amount >= 100000) && /africa|nigeria|ghana|kenya|zambia|senegal|sierra leone|morocco|egypt|mozambique|madagascar/i.test(`${t.title} ${t.description} ${t.buyer} ${t.region}`) && (
                                  <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em",
                                    color: "#1A0A0E", background: "linear-gradient(90deg, #F59E0B, #EF4444)" }}>🔥 HIGH STRATEGIC</span>
                                )}
                                {checkLocalPriority(t) && (
                                  <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 10px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em",
                                    color: "#FFFFFF", background: "linear-gradient(90deg, #10B981, #059669)" }}>🏠 LOCAL PRIORITY</span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                              {t.source_url && (
                                <a href={t.source_url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                                  <Btn variant="fcdo" small>View ↗</Btn>
                                </a>
                              )}
                              <Btn onClick={() => onAddToTracker({ title: t.title, buyer: t.buyer, value_text: formatValue(t.value_amount, t.value_currency) || "", deadline: t.deadline, source_url: t.source_url, portal: t.source, category: cat.label, status: "Active", notes: t.description })} variant="green" small>+ Track</Btn>
                              <Btn onClick={() => setExpandedTender(isExpanded ? null : (t.id || String(i)))} variant="secondary" small>{isExpanded ? "−" : "+"}</Btn>
                            </div>
                          </div>
                          {isExpanded && t.description && (
                            <div style={{ marginTop: "10px", padding: "12px", background: "#0A0F1A", borderRadius: "2px", fontSize: "0.82rem", color: COLORS.muted, lineHeight: 1.7 }}>
                              {t.description}
                              {t.published && <div style={{ marginTop: "8px", fontSize: "0.72rem", color: COLORS.muted }}>Published: {t.published}</div>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </Panel>
            );
          })()}

          {activeCategory && (() => {
            const cat = TENDER_AGENT_CATEGORIES.find(c => c.id === activeCategory)!;
            return (
              <Panel style={{ marginBottom: "20px" }}>
                <SectionHeading>🔗 {cat.label} — Portal Links</SectionHeading>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
                  {cat.searchUrls.map((u: any) => (
                    <a key={u.name} href={u.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                      <div style={{ background: COLORS.accent + "33", border: `1px solid ${COLORS.panelBorder}`, borderRadius: "2px", padding: "12px 16px", cursor: "pointer", transition: "border-color 0.2s" }}>
                        <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.82rem", fontWeight: 700, color: COLORS.gold }}>{u.name} ↗</div>
                      </div>
                    </a>
                  ))}
                </div>
              </Panel>
            );
          })()}
        </>
      )}

      <Panel style={{ marginBottom: "20px" }}>
        <SectionHeading>🤖 EP Tender Advisor — Strategy & Bid Advice</SectionHeading>
        <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
          <input value={agentQuery} onChange={(e: any) => setAgentQuery(e.target.value)} onKeyDown={(e: any) => e.key === "Enter" && askAgent()}
            placeholder='e.g. "How do I qualify for FCDO framework?" or "Help me write a social value response"'
            style={{ flex: 1, background: "#0A0F1A", border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text, padding: "12px 16px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", fontSize: "0.88rem" }}
          />
          <Btn onClick={askAgent} disabled={agentLoading || !agentQuery.trim()}>{agentLoading ? "⟳ Thinking..." : "🤖 Ask EP Agent"}</Btn>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: agentResult ? "16px" : "0" }}>
          {["How to qualify for FCDO frameworks", "Write a social value response", "DEFRA scoring criteria tips", "CPV codes for events & conferences", "Bid writing tips for government tenders", "How to win World Bank contracts"].map(q => (
            <span key={q} onClick={() => setAgentQuery(q)} style={{
              padding: "5px 12px", background: COLORS.accent + "55", border: `1px solid ${COLORS.panelBorder}`,
              borderRadius: "2px", fontSize: "0.7rem", color: COLORS.muted, cursor: "pointer",
              fontFamily: "Poppins, sans-serif", letterSpacing: "0.06em", transition: "color 0.15s"
            }}>{q}</span>
          ))}
        </div>
        {agentResult && (
          <div style={{ background: "#0A0F1A", border: `1px solid ${COLORS.panelBorder}`, borderRadius: "2px", padding: "20px", fontFamily: "Poppins, sans-serif", fontSize: "0.87rem", color: COLORS.text, lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: "500px", overflowY: "auto" }}>{agentResult}</div>
        )}
      </Panel>

      {/* Bid Outline Modal */}
      {bidOutlineModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "4px", width: "100%", maxWidth: 700, maxHeight: "85vh", overflowY: "auto", padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ color: COLORS.gold, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: "Poppins, sans-serif" }}>EP Agent — Bid Outline</div>
                <div style={{ color: COLORS.text, fontSize: "1.1rem", fontWeight: 700, marginTop: 4, fontFamily: "Poppins, sans-serif" }}>{bidOutlineModal.title}</div>
              </div>
              <button onClick={() => setBidOutlineModal(null)} style={{ background: COLORS.accent, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.muted, padding: "6px 14px", borderRadius: "2px", cursor: "pointer", fontSize: "0.8rem" }}>Close</button>
            </div>
            {bidOutlineModal.loading && <div style={{ textAlign: "center", padding: 40, color: COLORS.muted, fontSize: "0.9rem" }}>EP Agent is generating your bid outline...</div>}
            {bidOutlineModal.error && <div style={{ color: COLORS.red, padding: 16, background: COLORS.red + "15", borderRadius: "4px", fontSize: "0.85rem" }}>{bidOutlineModal.error}</div>}
            {bidOutlineModal.content && (
              <>
                <div style={{ fontSize: "0.87rem", color: COLORS.text, whiteSpace: "pre-wrap", lineHeight: 1.8, fontFamily: "Poppins, sans-serif" }}>{bidOutlineModal.content}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                  <Btn onClick={() => { navigator.clipboard.writeText(bidOutlineModal.content); }} variant="primary" small>Copy to Clipboard</Btn>
                  <Btn onClick={() => {
                    const blob = new Blob([bidOutlineModal.content], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `bid-outline-${(bidOutlineModal.title || "").slice(0, 30).replace(/[^a-z0-9]/gi, "-")}.txt`; a.click();
                    URL.revokeObjectURL(url);
                  }} variant="fcdo" small>Download</Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const BID_SECTIONS = [
  "Executive Summary", "Company Overview", "Methodology & Approach", "Social Value",
  "Relevant Experience", "Team & Expertise", "Pricing Rationale", "Risk Management",
  "Mobilisation Plan", "Cover Letter", "Quality Assurance", "Health & Safety",
  "GDPR & Data Protection", "Equality & Diversity", "Environmental Sustainability", "Safeguarding",
];

const UK_PROFILE_FIELDS: { key: string; label: string; section: string; multiline?: boolean }[] = [
  { key: "company_name", label: "Company Name", section: "Company Details" },
  { key: "company_number", label: "Companies House Number", section: "Company Details" },
  { key: "company_type", label: "Company Type", section: "Company Details" },
  { key: "incorporation_date", label: "Incorporation Date", section: "Company Details" },
  { key: "registered_address", label: "Registered Address", section: "Company Details" },
  { key: "trading_address", label: "Trading Address", section: "Company Details" },
  { key: "sic_codes", label: "SIC Codes", section: "Company Details" },
  { key: "directors", label: "Directors", section: "Company Details" },
  { key: "key_personnel", label: "Key Personnel", section: "Company Details", multiline: true },
  { key: "website", label: "Website", section: "Contact" },
  { key: "email", label: "Email", section: "Contact" },
  { key: "phone", label: "Phone", section: "Contact" },
  { key: "vat_number", label: "VAT Number", section: "Financial" },
  { key: "num_employees", label: "Number of Employees", section: "Financial" },
  { key: "annual_turnover", label: "Annual Turnover", section: "Financial" },
  { key: "bank_name", label: "Bank Name / Account Name", section: "Financial" },
  { key: "bank_account", label: "Account Number", section: "Financial" },
  { key: "bank_sort_code", label: "Sort Code", section: "Financial" },
  { key: "insurance_pii", label: "Professional Indemnity Insurance", section: "Insurance" },
  { key: "insurance_pii_value", label: "PII Cover Value", section: "Insurance" },
  { key: "insurance_public_liability", label: "Public Liability Insurance", section: "Insurance" },
  { key: "insurance_public_liability_value", label: "PL Cover Value", section: "Insurance" },
  { key: "insurance_employers", label: "Employers Liability Insurance", section: "Insurance" },
  { key: "certifications", label: "Certifications (ISO, etc.)", section: "Accreditations", multiline: true },
  { key: "accreditations", label: "Accreditations & Memberships", section: "Accreditations", multiline: true },
  { key: "policies", label: "Policies Held", section: "Accreditations", multiline: true },
  { key: "sector_experience", label: "Sector Experience", section: "Capability", multiline: true },
  { key: "past_contracts", label: "Past Contracts / Case Studies", section: "Capability", multiline: true },
  { key: "bio_summary", label: "Company Bio / Summary", section: "Capability", multiline: true },
  { key: "methodology_overview", label: "Methodology Overview", section: "Capability", multiline: true },
  { key: "social_value_statement", label: "Social Value Statement", section: "Statements", multiline: true },
  { key: "equality_statement", label: "Equality & Diversity Statement", section: "Statements", multiline: true },
  { key: "environmental_statement", label: "Environmental Statement", section: "Statements", multiline: true },
];

const NG_PROFILE_FIELDS: { key: string; label: string; section: string; multiline?: boolean }[] = [
  { key: "ng_company_name", label: "Company Name", section: "Company Details" },
  { key: "ng_company_number", label: "CAC Registration Number", section: "Company Details" },
  { key: "ng_company_type", label: "Company Type", section: "Company Details" },
  { key: "ng_company_address", label: "Registered Address", section: "Company Details" },
  { key: "ng_directors", label: "Directors", section: "Company Details" },
  { key: "ng_key_personnel", label: "Key Personnel", section: "Company Details", multiline: true },
  { key: "ng_email", label: "Email", section: "Contact" },
  { key: "ng_phone", label: "Phone", section: "Contact" },
  { key: "ng_website", label: "Website", section: "Contact" },
  { key: "ng_vat_tin", label: "TIN / VAT Number", section: "Financial" },
  { key: "ng_num_employees", label: "Number of Employees", section: "Financial" },
  { key: "ng_annual_turnover", label: "Annual Turnover", section: "Financial" },
  { key: "ng_bank_name", label: "Bank Name / Account Name", section: "Financial" },
  { key: "ng_bank_account", label: "Account Number", section: "Financial" },
  { key: "ng_bank_sort_code", label: "Sort Code / Branch", section: "Financial" },
  { key: "ng_insurance_pii", label: "Professional Indemnity Insurance", section: "Insurance" },
  { key: "ng_insurance_public_liability", label: "Public Liability Insurance", section: "Insurance" },
  { key: "ng_certifications", label: "Certifications", section: "Accreditations", multiline: true },
  { key: "ng_accreditations", label: "Accreditations & Memberships", section: "Accreditations", multiline: true },
  { key: "ng_policies", label: "Policies Held", section: "Accreditations", multiline: true },
  { key: "ng_sector_experience", label: "Sector Experience", section: "Capability", multiline: true },
  { key: "ng_past_contracts", label: "Past Contracts / Case Studies", section: "Capability", multiline: true },
  { key: "ng_bio_summary", label: "Company Bio / Summary", section: "Capability", multiline: true },
];

const PROFILE_DOC_CATEGORIES = [
  { value: "financials", label: "Financial Statements" },
  { value: "staff_cvs", label: "Staff CVs" },
  { value: "insurance", label: "Insurance Certificates" },
  { value: "policies", label: "Policy Documents" },
  { value: "certificates", label: "Certificates & Awards" },
  { value: "case_studies", label: "Case Studies" },
  { value: "general", label: "Other Documents" },
];

function CompanyProfileView({ profile, loading, editing, form, onLoad, onEdit, onCancel, onSave, onFormChange }: any) {
  const [countryTab, setCountryTab] = useState<"uk" | "ng" | "docs">("uk");
  const [profileDocs, setProfileDocs] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docCategory, setDocCategory] = useState("general");
  const [docCountry, setDocCountry] = useState<"uk" | "ng">("uk");
  const [docNotes, setDocNotes] = useState("");

  if (!profile && !loading) { onLoad(); }

  useEffect(() => { loadProfileDocs(); }, []);

  async function loadProfileDocs() {
    try {
      const res = await fetch("/api/tender-profile-documents", { headers: authHeaders() });
      if (res.ok) setProfileDocs(await res.json());
    } catch {}
  }

  async function uploadProfileDoc(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("country", docCountry);
      formData.append("category", docCategory);
      if (docNotes) formData.append("notes", docNotes);
      formData.append("uploaded_by", "Tolz");
      const token = getToken();
      const res = await fetch("/api/tender-profile-documents", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      if (res.ok) { loadProfileDocs(); setDocNotes(""); }
    } catch {}
    setUploadingDoc(false);
    e.target.value = "";
  }

  async function deleteProfileDoc(id: number) {
    if (!confirm("Delete this document?")) return;
    try {
      await fetch(`/api/tender-profile-documents/${id}`, { method: "DELETE", headers: authHeaders() });
      loadProfileDocs();
    } catch {}
  }

  if (loading || !profile) {
    return <div style={{ textAlign: "center", padding: "60px", color: COLORS.muted }}>Loading company profile...</div>;
  }

  const fields = countryTab === "uk" ? UK_PROFILE_FIELDS : NG_PROFILE_FIELDS;
  const sections = [...new Set(fields.map(f => f.section))];

  const countryTabStyle = (active: boolean) => ({
    padding: "10px 24px", background: active ? COLORS.gold + "22" : "transparent",
    border: active ? `1px solid ${COLORS.gold}44` : `1px solid ${COLORS.panelBorder}`,
    color: active ? COLORS.gold : COLORS.muted, cursor: "pointer" as const, borderRadius: "2px",
    fontFamily: "Poppins, sans-serif", fontSize: "0.8rem", fontWeight: 700,
    letterSpacing: "0.12em", textTransform: "uppercase" as const, transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.8rem", fontWeight: 700 }}>Company <em style={{ color: COLORS.gold }}>Profile</em></h1>
          <p style={{ color: COLORS.muted, marginTop: "4px", fontSize: "0.82rem" }}>Company details, financials, insurance, policies & documents for bid submissions</p>
        </div>
        {countryTab !== "docs" && (
          !editing ? (
            <Btn onClick={onEdit}>✏️ Edit Profile</Btn>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn onClick={onSave}>💾 Save</Btn>
              <Btn onClick={onCancel} variant="secondary">Cancel</Btn>
            </div>
          )
        )}
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        <button onClick={() => setCountryTab("uk")} style={countryTabStyle(countryTab === "uk")}>🇬🇧 United Kingdom</button>
        <button onClick={() => setCountryTab("ng")} style={countryTabStyle(countryTab === "ng")}>🇳🇬 Nigeria</button>
        <button onClick={() => setCountryTab("docs")} style={countryTabStyle(countryTab === "docs")}>📄 Documents</button>
      </div>

      {countryTab !== "docs" ? (
        <>
          {sections.map(section => (
            <Panel key={section} style={{ marginBottom: "16px" }}>
              <SectionHeading>{section}</SectionHeading>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {fields.filter(f => f.section === section).map(field => (
                  <div key={field.key} style={{ gridColumn: field.multiline ? "1 / -1" : undefined }}>
                    <div style={{ fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.1em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "4px" }}>{field.label}</div>
                    {editing ? (
                      field.multiline ? (
                        <textarea value={form[field.key] || ""} onChange={(e: any) => onFormChange(field.key, e.target.value)} rows={3}
                          style={{ width: "100%", background: COLORS.accent, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "2px", color: COLORS.text, padding: "8px 10px", fontFamily: "Poppins, sans-serif", fontSize: "0.82rem", resize: "vertical" as const }} />
                      ) : (
                        <input value={form[field.key] || ""} onChange={(e: any) => onFormChange(field.key, e.target.value)}
                          style={{ width: "100%", background: COLORS.accent, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "2px", color: COLORS.text, padding: "8px 10px", fontFamily: "Poppins, sans-serif", fontSize: "0.82rem" }} />
                      )
                    ) : (
                      <div style={{ fontSize: "0.85rem", color: profile[field.key] ? COLORS.text : COLORS.muted, whiteSpace: "pre-wrap", lineHeight: 1.6, padding: "4px 0" }}>
                        {profile[field.key] || "—"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </>
      ) : (
        <>
          <Panel style={{ marginBottom: "16px", padding: "20px" }}>
            <SectionHeading>Upload Document</SectionHeading>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.1em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "4px" }}>Country</div>
                <select value={docCountry} onChange={(e: any) => setDocCountry(e.target.value)}
                  style={{ background: COLORS.accent, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "2px", color: COLORS.text, padding: "8px 12px", fontFamily: "Poppins, sans-serif", fontSize: "0.82rem" }}>
                  <option value="uk">🇬🇧 UK</option>
                  <option value="ng">🇳🇬 Nigeria</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.1em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "4px" }}>Category</div>
                <select value={docCategory} onChange={(e: any) => setDocCategory(e.target.value)}
                  style={{ background: COLORS.accent, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "2px", color: COLORS.text, padding: "8px 12px", fontFamily: "Poppins, sans-serif", fontSize: "0.82rem" }}>
                  {PROFILE_DOC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Notes" value={docNotes} onChange={(v: string) => setDocNotes(v)} placeholder="e.g. 2024/25 audited accounts" />
              </div>
              <label style={{ display: "inline-block" }}>
                <Btn variant="fcdo" onClick={() => {}}>
                  {uploadingDoc ? "⟳ Uploading..." : "📤 Upload"}
                </Btn>
                <input type="file" style={{ display: "none" }} onChange={uploadProfileDoc} disabled={uploadingDoc} />
              </label>
            </div>
          </Panel>

          {(["uk", "ng"] as const).map(country => {
            const countryDocs = profileDocs.filter(d => d.country === country);
            if (countryDocs.length === 0) return null;
            return (
              <Panel key={country} style={{ marginBottom: "16px" }}>
                <SectionHeading>{country === "uk" ? "🇬🇧 UK Documents" : "🇳🇬 Nigeria Documents"}</SectionHeading>
                {PROFILE_DOC_CATEGORIES.map(cat => {
                  const catDocs = countryDocs.filter(d => d.category === cat.value);
                  if (catDocs.length === 0) return null;
                  return (
                    <div key={cat.value} style={{ marginBottom: "14px" }}>
                      <div style={{ fontSize: "0.7rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.1em", color: COLORS.muted, textTransform: "uppercase" as const, marginBottom: "6px" }}>{cat.label}</div>
                      {catDocs.map(doc => (
                        <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.panelBorder}` }}>
                          <div>
                            <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ color: COLORS.gold, textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}>📄 {doc.file_name}</a>
                            {doc.notes && <div style={{ fontSize: "0.75rem", color: COLORS.muted, marginTop: "2px" }}>{doc.notes}</div>}
                            <div style={{ fontSize: "0.68rem", color: COLORS.muted }}>
                              {doc.uploaded_by && `By ${doc.uploaded_by} · `}{doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : ""} · {doc.created_at ? new Date(doc.created_at).toLocaleDateString("en-GB") : ""}
                            </div>
                          </div>
                          <button onClick={() => deleteProfileDoc(doc.id)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </Panel>
            );
          })}

          {profileDocs.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px", color: COLORS.muted }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📄</div>
              <div>No documents uploaded yet.</div>
              <div style={{ fontSize: "0.78rem", marginTop: "6px" }}>Upload financial statements, staff CVs, insurance certificates, and other supporting documents.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TenderDetailView({ tender, docs, loadingDocs, generatingDoc, editingDoc, docEditContent, onBack, onGenerateDoc, onCreateDoc, onDeleteDoc, onEditDoc, onSaveDoc, onCancelEdit, onDocContentChange, onUpdateDocStatus, onRefreshTender, accessLevel = "full" }: any) {
  const days = daysUntil(tender.deadline);
  const urgencyColor = days !== null && days <= 7 ? COLORS.red : days !== null && days <= 21 ? COLORS.amber : COLORS.green;
  const [questionsText, setQuestionsText] = useState(tender.tender_questions || "");
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [questionsSaved, setQuestionsSaved] = useState(false);
  const [aiAnswers, setAiAnswers] = useState("");
  const [answeringAll, setAnsweringAll] = useState(false);
  const [answeringIndex, setAnsweringIndex] = useState<number | null>(null);
  const [singleAnswer, setSingleAnswer] = useState<Record<number, string>>({});
  const [activeQTab, setActiveQTab] = useState<"questions" | "answers">("questions");
  const [bidFiles, setBidFiles] = useState<any[]>([]);
  const [bidFileNotes, setBidFileNotes] = useState("");
  const [bidFileUploading, setBidFileUploading] = useState(false);
  const [bidFilesLoading, setBidFilesLoading] = useState(true);

  useEffect(() => { loadBidFiles(); }, [tender.id]);

  async function loadBidFiles() {
    setBidFilesLoading(true);
    try {
      const res = await fetch(`/api/bid-vault/files?tender_id=${tender.id}`, { headers: authHeaders() });
      if (res.ok) setBidFiles(await res.json());
    } catch {}
    setBidFilesLoading(false);
  }

  async function uploadBidFile(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBidFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tender_id", String(tender.id));
      if (bidFileNotes) formData.append("notes", bidFileNotes);
      formData.append("uploaded_by", "Tolz");
      const token = getToken();
      const res = await fetch("/api/bid-vault/files", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      if (res.ok) { loadBidFiles(); setBidFileNotes(""); }
    } catch {}
    setBidFileUploading(false);
    e.target.value = "";
  }

  async function deleteBidFile(id: number) {
    if (!confirm("Delete this file?")) return;
    try {
      await fetch(`/api/bid-vault/files/${id}`, { method: "DELETE", headers: authHeaders() });
      loadBidFiles();
    } catch {}
  }

  const parsedQuestions = questionsText.split(/\n/).filter((l: string) => l.trim()).map((q: string, i: number) => ({ index: i, text: q.trim() }));

  async function saveQuestions() {
    setSavingQuestions(true);
    try {
      await fetch(`/api/tenders/${tender.id}/questions`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ tender_questions: questionsText }) });
      setQuestionsSaved(true);
      setTimeout(() => setQuestionsSaved(false), 2000);
      if (onRefreshTender) onRefreshTender();
    } catch {}
    setSavingQuestions(false);
  }

  async function answerAllQuestions() {
    if (!questionsText.trim()) return;
    setAnsweringAll(true);
    setActiveQTab("answers");
    try {
      const res = await fetch("/api/tender-ai/answer-questions", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ tender: { title: tender.title, buyer: tender.buyer, value_text: tender.value_text, category: tender.category, scoring_criteria: tender.scoring_criteria, word_limits: tender.word_limits }, questions: questionsText })
      });
      const data = await res.json();
      setAiAnswers(data.content || "Error generating answers.");
    } catch { setAiAnswers("Error connecting to EP Assistant."); }
    setAnsweringAll(false);
  }

  async function answerSingleQuestion(idx: number) {
    setAnsweringIndex(idx);
    try {
      const res = await fetch("/api/tender-ai/answer-questions", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ tender: { title: tender.title, buyer: tender.buyer, value_text: tender.value_text, category: tender.category, scoring_criteria: tender.scoring_criteria, word_limits: tender.word_limits }, questions: questionsText, question_index: idx })
      });
      const data = await res.json();
      setSingleAnswer(prev => ({ ...prev, [idx]: data.content || "Error." }));
    } catch { setSingleAnswer(prev => ({ ...prev, [idx]: "Error connecting to EP Assistant." })); }
    setAnsweringIndex(null);
  }

  function copyText(text: string) { navigator.clipboard.writeText(text); }

  const docStatusColor = (s: string) => {
    if (s === "final") return COLORS.green;
    if (s === "review") return COLORS.amber;
    return COLORS.muted;
  };

  const tabBtnStyle = (active: boolean) => ({
    padding: "8px 20px", background: active ? COLORS.gold + "22" : "transparent",
    border: active ? `1px solid ${COLORS.gold}44` : `1px solid ${COLORS.panelBorder}`,
    color: active ? COLORS.gold : COLORS.muted, cursor: "pointer" as const, borderRadius: "2px",
    fontFamily: "Poppins, sans-serif", fontSize: "0.75rem", fontWeight: 700,
    letterSpacing: "0.12em", textTransform: "uppercase" as const, transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.gold, cursor: "pointer", fontSize: "1.2rem", padding: "4px" }}>← </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>{tender.title}</h1>
            <Badge status={tender.status} />
          </div>
          <div style={{ display: "flex", gap: "16px", marginTop: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.78rem", color: COLORS.muted }}>🏢 {tender.buyer}</span>
            {tender.value_text && accessLevel === "full" && <span style={{ fontSize: "0.78rem", color: COLORS.gold }}>💰 {tender.value_text}</span>}
            {tender.value_text && accessLevel !== "full" && <span style={{ fontSize: "0.78rem", color: COLORS.muted, fontStyle: "italic" }}>💰 Restricted</span>}
            {tender.deadline && <span style={{ fontSize: "0.78rem", color: urgencyColor }}>📅 {tender.deadline} {days !== null ? `(${days}d)` : ""}</span>}
            {tender.portal && <span style={{ fontSize: "0.78rem", color: COLORS.muted }}>🔗 {tender.portal}</span>}
          </div>
        </div>
        {tender.source_url && (
          <a href={tender.source_url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <Btn variant="fcdo" small>View on Portal ↗</Btn>
          </a>
        )}
      </div>

      {tender.notes && (
        <Panel style={{ marginBottom: "16px" }}>
          <SectionHeading>Tender Notes</SectionHeading>
          <div style={{ fontSize: "0.85rem", color: COLORS.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{tender.notes}</div>
        </Panel>
      )}

      {(tender.scoring_criteria || tender.word_limits) && (
        <Panel style={{ marginBottom: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {tender.scoring_criteria && (
              <div>
                <SectionHeading>Scoring Criteria</SectionHeading>
                <div style={{ fontSize: "0.82rem", color: COLORS.text, whiteSpace: "pre-wrap" }}>{tender.scoring_criteria}</div>
              </div>
            )}
            {tender.word_limits && (
              <div>
                <SectionHeading>Word Limits</SectionHeading>
                <div style={{ fontSize: "0.82rem", color: COLORS.text, whiteSpace: "pre-wrap" }}>{tender.word_limits}</div>
              </div>
            )}
          </div>
        </Panel>
      )}

      <RequirementsChecklist tenderId={tender.id} />

      <Panel style={{ marginBottom: "16px" }}>
        <SectionHeading>📋 Tender Questions / ITT Requirements</SectionHeading>
        <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.78rem", color: COLORS.muted, marginBottom: "14px", lineHeight: 1.6 }}>
          Paste the actual questions from the tender document (ITT/RFP/PQQ) below — one question per line. EP Assistant will read these and generate tailored answers using Event Perfekt's real company details, experience, and policies.
        </div>

        <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
          <button onClick={() => setActiveQTab("questions")} style={tabBtnStyle(activeQTab === "questions")}>✏️ Paste Questions</button>
          <button onClick={() => setActiveQTab("answers")} style={tabBtnStyle(activeQTab === "answers")}>📝 EP Answers {aiAnswers ? "✓" : ""}</button>
        </div>

        {activeQTab === "questions" && (
          <>
            <textarea value={questionsText} onChange={(e: any) => setQuestionsText(e.target.value)} rows={10}
              placeholder={"Paste the tender questions here, one per line. For example:\n\n1. Please describe your experience delivering similar events for public sector clients.\n2. Outline your methodology for managing conferences with 200+ delegates.\n3. Describe your approach to social value and community benefits.\n4. Provide details of your GDPR and data protection policies.\n5. Describe your quality assurance processes.\n6. Provide two case studies of similar work."}
              style={{ width: "100%", background: "#0A0F1A", border: `1px solid ${COLORS.panelBorder}`, borderRadius: "2px", color: COLORS.text, padding: "14px", fontFamily: "Poppins, sans-serif", fontSize: "0.85rem", lineHeight: 1.7, resize: "vertical" as const, marginBottom: "12px" }}
            />
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <Btn onClick={saveQuestions} disabled={savingQuestions} variant="secondary" small>{savingQuestions ? "Saving..." : questionsSaved ? "✓ Saved" : "💾 Save Questions"}</Btn>
              <Btn onClick={answerAllQuestions} disabled={answeringAll || !questionsText.trim()}>{answeringAll ? "⏳ EP is writing answers..." : "🤖 Generate All Answers"}</Btn>
              {parsedQuestions.length > 0 && (
                <span style={{ fontSize: "0.72rem", color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{parsedQuestions.length} question{parsedQuestions.length !== 1 ? "s" : ""} detected</span>
              )}
            </div>

            {parsedQuestions.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "0.68rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.12em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "10px" }}>
                  Answer Individual Questions
                </div>
                {parsedQuestions.map((q: any) => (
                  <div key={q.index} style={{ borderBottom: `1px solid ${COLORS.panelBorder}`, padding: "12px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ flex: 1, fontSize: "0.84rem", color: COLORS.text, lineHeight: 1.6 }}>{q.text}</div>
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        <Btn onClick={() => answerSingleQuestion(q.index)} disabled={answeringIndex === q.index} variant="green" small>
                          {answeringIndex === q.index ? "⏳..." : singleAnswer[q.index] ? "↻ Redo" : "🤖 Answer"}
                        </Btn>
                        {singleAnswer[q.index] && (
                          <Btn onClick={() => copyText(singleAnswer[q.index])} variant="secondary" small>📋 Copy</Btn>
                        )}
                      </div>
                    </div>
                    {singleAnswer[q.index] && (
                      <div style={{ marginTop: "10px", background: "#0A0F1A", border: `1px solid ${COLORS.panelBorder}`, borderRadius: "2px", padding: "14px", fontSize: "0.82rem", color: COLORS.text, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: "300px", overflowY: "auto" as const }}>{singleAnswer[q.index]}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeQTab === "answers" && (
          <>
            {answeringAll ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🤖</div>
                <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.85rem", letterSpacing: "0.2em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "8px" }}>
                  EP Assistant is writing answers to all {parsedQuestions.length} questions...
                </div>
                <div style={{ fontSize: "0.78rem", color: COLORS.muted }}>This may take a minute for complex tenders</div>
              </div>
            ) : aiAnswers ? (
              <>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <Btn onClick={() => copyText(aiAnswers)} variant="green" small>📋 Copy All Answers</Btn>
                  <Btn onClick={answerAllQuestions} variant="secondary" small>↻ Regenerate All</Btn>
                </div>
                <div style={{ background: "#0A0F1A", border: `1px solid ${COLORS.panelBorder}`, borderRadius: "2px", padding: "20px", fontFamily: "Poppins, sans-serif", fontSize: "0.85rem", color: COLORS.text, lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: "600px", overflowY: "auto" as const }}>{aiAnswers}</div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: COLORS.muted }}>
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>📝</div>
                <div style={{ fontStyle: "italic", marginBottom: "12px" }}>No answers generated yet. Paste your tender questions and click "Generate All Answers".</div>
              </div>
            )}
          </>
        )}
      </Panel>

      <Panel style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <SectionHeading style={{ marginBottom: 0 }}>Bid Documents & Responses ({docs.length})</SectionHeading>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "0.7rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.12em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "8px" }}>
            Auto-Generate Standard Bid Sections
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {BID_SECTIONS.map(s => {
              const hasDoc = docs.some((d: any) => d.section_label === s);
              const isGenerating = generatingDoc === s;
              return (
                <button key={s} onClick={() => onGenerateDoc(s)} disabled={isGenerating}
                  style={{
                    padding: "5px 12px", fontSize: "0.7rem", fontFamily: "Poppins, sans-serif",
                    fontWeight: 600, letterSpacing: "0.06em", cursor: isGenerating ? "wait" : "pointer",
                    background: hasDoc ? COLORS.green + "22" : COLORS.accent,
                    border: `1px solid ${hasDoc ? COLORS.green + "44" : COLORS.panelBorder}`,
                    color: isGenerating ? COLORS.gold : hasDoc ? COLORS.green : COLORS.muted,
                    borderRadius: "2px", transition: "all 0.15s",
                  }}>
                  {isGenerating ? "⏳ Generating..." : hasDoc ? `✓ ${s}` : `✦ ${s}`}
                </button>
              );
            })}
          </div>
        </div>

        {loadingDocs ? (
          <div style={{ textAlign: "center", padding: "30px", color: COLORS.muted }}>Loading documents...</div>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: COLORS.muted }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📄</div>
            <div style={{ fontStyle: "italic", marginBottom: "12px" }}>No documents yet. Click a section above to auto-generate, or paste your tender questions above for tailored answers.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
            {docs.map((doc: any) => (
              <div key={doc.id} style={{ background: COLORS.accent + "55", border: `1px solid ${COLORS.panelBorder}`, borderRadius: "2px", padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editingDoc?.id === doc.id ? "12px" : "0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.85rem", fontWeight: 700, color: COLORS.text }}>{doc.section_label || doc.name}</span>
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "2px 8px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em",
                      color: docStatusColor(doc.status), background: docStatusColor(doc.status) + "15", border: `1px solid ${docStatusColor(doc.status)}33`,
                    }}>{(doc.status || "draft").toUpperCase()}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {doc.status !== "final" && (
                      <button onClick={() => onUpdateDocStatus(doc.id, "final")} style={{ background: COLORS.green + "22", border: `1px solid ${COLORS.green}44`, color: COLORS.green, padding: "3px 10px", borderRadius: "2px", cursor: "pointer", fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700 }}>✓ Mark Final</button>
                    )}
                    {doc.status === "final" && (
                      <button onClick={() => onUpdateDocStatus(doc.id, "draft")} style={{ background: COLORS.amber + "22", border: `1px solid ${COLORS.amber}44`, color: COLORS.amber, padding: "3px 10px", borderRadius: "2px", cursor: "pointer", fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700 }}>↩ Reopen</button>
                    )}
                    <button onClick={() => onGenerateDoc(doc.section_label || doc.name)} style={{ background: COLORS.gold + "22", border: `1px solid ${COLORS.gold}44`, color: COLORS.gold, padding: "3px 10px", borderRadius: "2px", cursor: "pointer", fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700 }}>✦ Regenerate</button>
                    {editingDoc?.id === doc.id ? (
                      <>
                        <button onClick={() => onSaveDoc(doc.id)} style={{ background: COLORS.green + "22", border: `1px solid ${COLORS.green}44`, color: COLORS.green, padding: "3px 10px", borderRadius: "2px", cursor: "pointer", fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700 }}>💾 Save</button>
                        <button onClick={onCancelEdit} style={{ background: COLORS.accent, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.muted, padding: "3px 10px", borderRadius: "2px", cursor: "pointer", fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700 }}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => onEditDoc(doc)} style={{ background: COLORS.accent, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.muted, padding: "3px 10px", borderRadius: "2px", cursor: "pointer", fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700 }}>✏️ Edit</button>
                    )}
                    <button onClick={() => onDeleteDoc(doc.id)} style={{ background: COLORS.red + "22", border: `1px solid ${COLORS.red}44`, color: COLORS.red, padding: "3px 10px", borderRadius: "2px", cursor: "pointer", fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700 }}>✕</button>
                  </div>
                </div>
                {editingDoc?.id === doc.id ? (
                  <textarea value={docEditContent} onChange={(e: any) => onDocContentChange(e.target.value)} rows={12}
                    style={{ width: "100%", background: "#0A0F1A", border: `1px solid ${COLORS.panelBorder}`, borderRadius: "2px", color: COLORS.text, padding: "12px", fontFamily: "Poppins, sans-serif", fontSize: "0.82rem", lineHeight: 1.7, resize: "vertical" as const }} />
                ) : doc.content ? (
                  <div style={{ fontSize: "0.82rem", color: COLORS.text, lineHeight: 1.7, whiteSpace: "pre-wrap", marginTop: "10px", maxHeight: "200px", overflowY: "auto" as const, padding: "10px 0" }}>{doc.content}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <SectionHeading>📁 Bid Documents & Files</SectionHeading>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input value={bidFileNotes} onChange={(e: any) => setBidFileNotes(e.target.value)}
              placeholder="File notes (e.g. Past bid feedback, submitted proposal)"
              style={{ background: "#0A0F1A", border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text, padding: "6px 12px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", fontSize: "0.78rem", width: "320px" }}
            />
            <span style={{ display: "inline-block" }}>
              <Btn variant="fcdo" small disabled={bidFileUploading} onClick={() => {
                const fi = document.getElementById("bid-file-input-" + tender.id) as HTMLInputElement;
                if (fi) fi.click();
              }}>
                {bidFileUploading ? "⟳ Uploading..." : "📤 Upload File"}
              </Btn>
              <input id={"bid-file-input-" + tender.id} type="file" style={{ display: "none" }} onChange={uploadBidFile} disabled={bidFileUploading} />
            </span>
          </div>
        </div>
        <div style={{ fontSize: "0.75rem", color: COLORS.muted, marginBottom: "14px" }}>
          Upload supporting documents for this tender — past bids, feedback letters, reference documents, pricing breakdowns, etc. These are also available to EP Agent for bid writing context.
        </div>
        {bidFilesLoading ? (
          <div style={{ textAlign: "center", padding: "20px", color: COLORS.muted }}>Loading files...</div>
        ) : bidFiles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: COLORS.muted }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>📁</div>
            <div style={{ fontStyle: "italic" }}>No files uploaded for this tender yet.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
            {bidFiles.map((file: any) => (
              <div key={file.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: COLORS.accent + "55", border: `1px solid ${COLORS.panelBorder}`, borderRadius: "2px" }}>
                <div>
                  <a href={file.file_url} target="_blank" rel="noreferrer" style={{ color: COLORS.gold, textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}>
                    📄 {file.file_name}
                  </a>
                  {file.notes && <div style={{ fontSize: "0.75rem", color: COLORS.muted, marginTop: "2px", fontStyle: "italic" }}>{file.notes}</div>}
                  <div style={{ fontSize: "0.68rem", color: COLORS.muted, marginTop: "2px" }}>
                    {file.uploaded_by && `By ${file.uploaded_by} · `}{file.file_type || ""} · {file.file_size ? `${(file.file_size / 1024).toFixed(0)} KB` : ""} · {file.created_at ? new Date(file.created_at).toLocaleDateString("en-GB") : ""}
                  </div>
                </div>
                <button onClick={() => deleteBidFile(file.id)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: "0.85rem" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function EPAgentChat() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const quickActions = [
    { label: "Pipeline Overview", prompt: "Give me a full pipeline overview — how many tenders at each stage and their total values?" },
    { label: "Check All Bids", prompt: "Check the status of all active bids — which ones have the most sections complete and which need work?" },
    { label: "Approaching Deadlines", prompt: "Which tenders have deadlines approaching in the next 14 days? What's their readiness status?" },
    { label: "Compliance Check", prompt: "Run a compliance check across all tenders — which ones have unmet requirements?" },
    { label: "What Can We Bid On?", prompt: "Based on Event Perfekt's capabilities and experience, what types of tenders should we be looking for? Suggest specific search terms and CPV codes." },
    { label: "Weekly Summary", prompt: "Give me a weekly summary — new tenders added, bids in progress, deadlines this week, and recommended priorities." },
  ];

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;
    const newMessages = [...messages, { role: "user", content: content.trim() }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const token = localStorage.getItem("tender_token");
      const resp = await fetch("/api/tender-ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await resp.json();
      if (resp.ok && data.content) {
        setMessages([...newMessages, { role: "assistant", content: data.content }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: `Error: ${data.message || "Failed to get response"}` }]);
      }
    } catch (err: any) {
      setMessages([...newMessages, { role: "assistant", content: `Connection error: ${err.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function formatMessage(text: string) {
    return text.split("\n").map((line, i) => {
      let formatted = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code style="background:#ffffff22;padding:1px 4px;border-radius:2px;font-size:0.8em">$1</code>');
      if (line.startsWith("### ")) return <h4 key={i} style={{ color: COLORS.gold, fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.1em", margin: "12px 0 4px", textTransform: "uppercase" }} dangerouslySetInnerHTML={{ __html: formatted.slice(4) }} />;
      if (line.startsWith("## ")) return <h3 key={i} style={{ color: COLORS.gold, fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "1rem", margin: "14px 0 6px" }} dangerouslySetInnerHTML={{ __html: formatted.slice(3) }} />;
      if (line.startsWith("# ")) return <h2 key={i} style={{ color: COLORS.gold, fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "1.1rem", margin: "16px 0 8px" }} dangerouslySetInnerHTML={{ __html: formatted.slice(2) }} />;
      if (line.startsWith("- ") || line.startsWith("• ") || line.startsWith("* ")) return <div key={i} style={{ paddingLeft: "12px", marginBottom: "3px", position: "relative" as const }}><span style={{ position: "absolute" as const, left: 0, color: COLORS.gold }}>•</span><span dangerouslySetInnerHTML={{ __html: formatted.slice(2) }} /></div>;
      if (/^\d+\.\s/.test(line)) return <div key={i} style={{ paddingLeft: "16px", marginBottom: "3px" }} dangerouslySetInnerHTML={{ __html: formatted }} />;
      if (line.startsWith("---")) return <hr key={i} style={{ border: "none", borderTop: `1px solid ${COLORS.panelBorder}`, margin: "10px 0" }} />;
      if (line.trim() === "") return <div key={i} style={{ height: "8px" }} />;
      return <div key={i} style={{ marginBottom: "3px" }} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.22em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "6px" }}>EP-Powered Assistant</div>
        <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>EP <em style={{ color: COLORS.gold }}>Agent</em></h1>
        <p style={{ color: COLORS.muted, fontSize: "0.75rem", margin: "6px 0 0", fontFamily: "Poppins, sans-serif" }}>
          Your intelligent tender management assistant. Ask about bid status, pipeline, deadlines, compliance, or strategy.
        </p>
      </div>

      {messages.length === 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", color: COLORS.muted, textTransform: "uppercase" as const, marginBottom: "10px" }}>Quick Actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
            {quickActions.map((qa, i) => (
              <button key={i} onClick={() => sendMessage(qa.prompt)} style={{
                background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "6px",
                padding: "12px 14px", cursor: "pointer", textAlign: "left" as const, transition: "all 0.15s",
                color: COLORS.text, fontFamily: "Poppins, sans-serif", fontSize: "0.72rem"
              }}
                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = COLORS.gold + "66"; (e.target as HTMLElement).style.background = COLORS.gold + "0a"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = COLORS.panelBorder; (e.target as HTMLElement).style.background = COLORS.panel; }}
              >
                <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.05em", color: COLORS.gold, marginBottom: "4px" }}>{qa.label}</div>
                <div style={{ color: COLORS.muted, fontSize: "0.65rem", lineHeight: 1.4 }}>{qa.prompt.slice(0, 60)}...</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{
        background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "8px",
        minHeight: messages.length > 0 ? "400px" : "200px", maxHeight: "600px", overflowY: "auto" as const,
        padding: "16px", marginBottom: "12px", display: "flex", flexDirection: "column" as const, gap: "14px"
      }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" as const, gap: "8px", opacity: 0.5 }}>
            <div style={{ fontSize: "2rem" }}>🤖</div>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.75rem", letterSpacing: "0.15em", color: COLORS.muted, textTransform: "uppercase" as const }}>EP Agent Ready</div>
            <div style={{ fontSize: "0.65rem", color: COLORS.muted }}>Type a message or use a quick action above</div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column" as const,
            alignItems: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              fontFamily: "Poppins, sans-serif", fontSize: "0.55rem", fontWeight: 700,
              letterSpacing: "0.15em", color: msg.role === "user" ? COLORS.gold : COLORS.accent,
              textTransform: "uppercase" as const, marginBottom: "4px",
              paddingLeft: msg.role === "assistant" ? "2px" : "0",
              paddingRight: msg.role === "user" ? "2px" : "0",
            }}>
              {msg.role === "user" ? "You" : "EP Agent"}
            </div>
            <div style={{
              background: msg.role === "user" ? COLORS.gold + "15" : COLORS.bg,
              border: `1px solid ${msg.role === "user" ? COLORS.gold + "33" : COLORS.panelBorder}`,
              borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              padding: "12px 16px", maxWidth: "85%", fontSize: "0.78rem", lineHeight: 1.6,
              color: COLORS.text, fontFamily: "Poppins, sans-serif",
            }}>
              {msg.role === "assistant" ? formatMessage(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-start" }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.15em", color: COLORS.accent, textTransform: "uppercase" as const, marginBottom: "4px" }}>EP Agent</div>
            <div style={{
              background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "12px 12px 12px 2px",
              padding: "12px 20px", display: "flex", gap: "6px", alignItems: "center"
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLORS.gold, animation: "pulse 1.4s infinite", animationDelay: "0s" }} />
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLORS.gold, animation: "pulse 1.4s infinite", animationDelay: "0.2s" }} />
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: COLORS.gold, animation: "pulse 1.4s infinite", animationDelay: "0.4s" }} />
              <span style={{ fontSize: "0.65rem", color: COLORS.muted, marginLeft: "8px" }}>Analysing your tenders...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }`}</style>

      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Ask EP Agent anything... e.g. 'Check the status of all active bids' or 'What's our pipeline looking like?'"
          rows={2}
          style={{
            flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "8px",
            padding: "12px 16px", color: COLORS.text, fontSize: "0.78rem", fontFamily: "Poppins, sans-serif",
            resize: "none" as const, outline: "none", lineHeight: 1.5,
          }}
          onFocus={e => (e.target.style.borderColor = COLORS.gold + "66")}
          onBlur={e => (e.target.style.borderColor = COLORS.panelBorder)}
          disabled={loading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? COLORS.panelBorder : COLORS.gold,
            color: loading || !input.trim() ? COLORS.muted : "#1A0A0E",
            border: "none", borderRadius: "8px", padding: "12px 24px", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "0.75rem",
            letterSpacing: "0.1em", textTransform: "uppercase" as const, transition: "all 0.15s",
            whiteSpace: "nowrap" as const,
          }}
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>

      {messages.length > 0 && (
        <div style={{ textAlign: "center" as const, marginTop: "10px" }}>
          <button onClick={() => setMessages([])} style={{
            background: "transparent", border: `1px solid ${COLORS.panelBorder}`, borderRadius: "4px",
            padding: "4px 12px", color: COLORS.muted, fontSize: "0.6rem", cursor: "pointer",
            fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" as const,
          }}>Clear Conversation</button>
        </div>
      )}
    </div>
  );
}

export default function TenderDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [view, setView] = useState("dashboard");
  const [showAdd, setShowAdd] = useState(false);
  const [editTender, setEditTender] = useState<Tender | null>(null);
  const [aiTender, setAiTender] = useState<Tender | null>(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [tenderDocs, setTenderDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});
  const [profileUnlocked, setProfileUnlocked] = useState(false);
  const [profilePassword, setProfilePassword] = useState("");
  const [profilePasswordError, setProfilePasswordError] = useState("");
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [docEditContent, setDocEditContent] = useState("");
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultPasswordError, setVaultPasswordError] = useState("");
  const [vaultFolders, setVaultFolders] = useState<any[]>([]);
  const [vaultFiles, setVaultFiles] = useState<any[]>([]);
  const [vaultCurrentFolder, setVaultCurrentFolder] = useState<any>(null);
  const [vaultShowNewFolder, setVaultShowNewFolder] = useState(false);
  const [vaultNewFolderName, setVaultNewFolderName] = useState("");
  const [vaultNewFolderDesc, setVaultNewFolderDesc] = useState("");
  const [vaultUploadNotes, setVaultUploadNotes] = useState("");
  const [vaultUploading, setVaultUploading] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [portalRegistrations, setPortalRegistrations] = useState<any[]>([]);
  const [portalRegsLoading, setPortalRegsLoading] = useState(false);

  const [remittanceResults, setRemittanceResults] = useState<any[]>([]);
  const [remittanceLoading, setRemittanceLoading] = useState(false);
  const [remittanceRegion, setRemittanceRegion] = useState("All Africa");
  const [remittanceType, setRemittanceType] = useState("all");
  const [remittanceEmailDraft, setRemittanceEmailDraft] = useState<any>(null);
  const [remittanceGeneratingEmail, setRemittanceGeneratingEmail] = useState<number | null>(null);
  const [remittanceSending, setRemittanceSending] = useState(false);
  const [verifyingContact, setVerifyingContact] = useState<number | null>(null);
  const [verifiedContacts, setVerifiedContacts] = useState<Record<number, any>>({});
  const [showAllResults, setShowAllResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // ── Bid Governance ───────────────────────────────────────────────
  const [governanceSections, setGovernanceSections] = useState<any[]>([]);
  const [governanceLog, setGovernanceLog] = useState<any[]>([]);
  const [governanceLoading, setGovernanceLoading] = useState(false);
  const [governanceNotes, setGovernanceNotes] = useState("");
  const [governanceActionSection, setGovernanceActionSection] = useState<any>(null);
  const [governanceFilter, setGovernanceFilter] = useState("all");

  // ── Learning Vault ───────────────────────────────────────────────
  const [learningVault, setLearningVault] = useState<any[]>([]);
  const [learningVaultLoading, setLearningVaultLoading] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState<any>({});

  // ── Automation ───────────────────────────────────────────────────
  const [automationLog, setAutomationLog] = useState<any[]>([]);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<any>(null);
  const [deadlineAlerts, setDeadlineAlerts] = useState<any>(null);

  async function verifyRemittanceContact(company: any, idx: number) {
    setVerifyingContact(idx);
    try {
      const res = await fetch("/api/tender-ai/verify-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("tender_token")}` },
        body: JSON.stringify({
          company_name: company.name,
          website: company.website,
          current_contact_name: company.contact_name,
          current_contact_email: company.contact_email,
          context: "twinpay"
        })
      });
      const data = await res.json();
      if (res.ok) {
        setVerifiedContacts(prev => ({ ...prev, [idx]: data }));
        const updated = [...remittanceResults];
        if (data.contact_name) updated[idx] = { ...updated[idx], contact_name: data.contact_name, contact_title: data.contact_title, contact_email: data.contact_email };
        setRemittanceResults(updated);
        toast({ title: "Contact Verified", description: `${data.contact_name} (${data.confidence} confidence)` });
      } else {
        toast({ title: "Verification Failed", description: data.message || "Failed to verify contact", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to verify contact — please try again", variant: "destructive" });
    }
    setVerifyingContact(null);
  }

  async function searchRemittanceCompanies() {
    setRemittanceLoading(true);
    setRemittanceResults([]);
    try {
      const res = await fetch("/api/tender-ai/remittance-search", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ region: remittanceRegion, type: remittanceType })
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setRemittanceResults(data.companies || []);
      toast({ title: `Found ${data.companies?.length || 0} companies`, description: "Companies operating in Africa remittances" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRemittanceLoading(false);
    }
  }

  const visibleTenders = tenders.filter((t: any) => {
    const status = String(t.status || "").toLowerCase();
    const deadline = t.deadline || t.closing_date || t.close_date || t.expiry_date;
    if (["closed", "awarded", "cancelled", "expired", "won", "lost"].includes(status)) return false;
    if (deadline) {
      const d = new Date(deadline);
      if (!isNaN(d.getTime()) && d.getTime() <= Date.now()) return false;
    }
    return true;
  });

  async function searchTenders(categoryOverride?: string) {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/tenders?search=${encodeURIComponent(search)}&category=${encodeURIComponent(categoryOverride || filter)}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const categoryName = categoryOverride || filter || "All Categories";
      const terms = SEARCH_TERMS[categoryName] || RELEVANCE_SETS.all;
      const scored = (data || []).map((t: any) => {
        const { score, matches } = getTenderRelevance(t, terms);
        return {
          ...t,
          relevanceScore: score,
          relevanceMatches: matches,
          relevanceLabel: score >= 30 ? "High Relevance" : score >= 10 ? "Medium Relevance" : "Low Relevance",
        };
      });
      const visible = scored
        .filter((t: any) => showAllResults || t.relevanceScore >= 10)
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
      setSearchResults(visible);
      setTenders(visible as Tender[]);
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  }

  function getTenderRelevance(tender: any, terms: string[]) {
    const title = normalizeText(tender.title || "");
    const description = normalizeText([
      tender.description,
      tender.notes,
      tender.buyer,
      tender.category_tags,
      tender.category,
      tender.portal,
      tender.source,
    ].filter(Boolean).join(" "));
    const matches: string[] = [];
    let score = 0;
    for (const term of terms) {
      const needle = term.toLowerCase();
      const titleMatch = title.includes(needle);
      const descMatch = description.includes(needle);
      if (titleMatch || descMatch) {
        matches.push(term);
        if (titleMatch) score += 10;
        if (descMatch) score += 5;
      }
    }
    return { score, matches: Array.from(new Set(matches)) };
  }

  const SEARCH_TERMS: Record<string, string[]> = {
    "All Categories": RELEVANCE_SETS.all,
    "Events and Venues": RELEVANCE_SETS.events,
    PMO: RELEVANCE_SETS.pmo,
    Consulting: RELEVANCE_SETS.consulting,
    Africa: RELEVANCE_SETS.africa,
    Trade: RELEVANCE_SETS.trade,
    "Community and Engagement": RELEVANCE_SETS.community,
  };

  async function generateTwinPayEmail(company: any, index: number) {
    setRemittanceGeneratingEmail(index);
    try {
      const res = await fetch("/api/tender-ai/twinpay-email", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ company })
      });
      if (!res.ok) throw new Error("Email generation failed");
      const data = await res.json();
      setRemittanceEmailDraft({ ...data, company_name: company.name, to: company.contact_email || "", contact_name: company.contact_name || "", contact_title: company.contact_title || "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRemittanceGeneratingEmail(null);
    }
  }

  async function sendTwinPayEmail() {
    if (!remittanceEmailDraft || remittanceSending) return;
    setRemittanceSending(true);
    try {
      const res = await fetch("/api/tender-ai/send-twinpay-email", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(remittanceEmailDraft)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Send failed" }));
        throw new Error(errData.message || "Send failed");
      }
      toast({ title: "Email Sent!", description: `Introduction sent to ${remittanceEmailDraft.company_name}` });
      setRemittanceEmailDraft(null);
    } catch (err: any) {
      toast({ title: "Email Failed", description: err.message, variant: "destructive" });
    } finally {
      setRemittanceSending(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("tender_token");
    fetchTenders();
    fetchDocCounts();
    fetchPortalRegistrations();
    if (token) {
      fetch("/api/tender-auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) localStorage.setItem("tender_user", JSON.stringify(d)); })
        .catch(() => {});
    }
  }, []);

  async function fetchTenders() {
    try {
      const res = await fetch("/api/tenders", { headers: authHeaders() });
      if (!res.ok) { setLoadingData(false); return; }
      const data = await res.json();
      setTenders(data);
    } catch {
      toast({ title: "Error loading tenders", variant: "destructive" });
    }
    setLoadingData(false);
  }

  async function fetchDocCounts() {
    try {
      const res = await fetch("/api/tender-doc-counts", { headers: authHeaders() });
      if (res.ok) { const data = await res.json(); setDocCounts(data); }
    } catch {}
  }

  async function fetchPortalRegistrations() {
    setPortalRegsLoading(true);
    try {
      const res = await fetch("/api/tender-portal-registrations", { headers: authHeaders() });
      if (res.ok) setPortalRegistrations(await res.json());
    } catch {}
    setPortalRegsLoading(false);
  }

  function isPortalRegistered(portalName: string, portalUrl: string) {
    return portalRegistrations.some((r: any) => {
      if (r.portal_name === portalName) return true;
      try {
        const rHost = new URL(r.portal_url || "").hostname.replace("www.", "");
        const pHost = new URL(portalUrl).hostname.replace("www.", "");
        if (rHost === pHost) return true;
      } catch {}
      return false;
    });
  }

  async function markPortalRegistered(portal: any) {
    try {
      const res = await fetch("/api/tender-portal-registrations", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ portal_name: portal.name, portal_url: portal.url, login_url: portal.registerUrl || portal.url, region: portal.region, category: "Procurement" }),
      });
      if (res.ok) fetchPortalRegistrations();
    } catch {}
  }

  async function unmarkPortalRegistered(portalName: string) {
    try {
      await fetch(`/api/tender-portal-registrations/${encodeURIComponent(portalName)}`, { method: "DELETE", headers: authHeaders() });
      fetchPortalRegistrations();
    } catch {}
  }

  async function verifyVaultPassword() {
    setVaultPasswordError("");
    try {
      const res = await fetch("/api/bid-vault/verify", {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ password: vaultPassword })
      });
      if (res.ok) { setVaultUnlocked(true); setVaultPassword(""); loadVaultData(); }
      else { setVaultPasswordError("Incorrect password"); }
    } catch { setVaultPasswordError("Error verifying password"); }
  }

  async function loadVaultData() {
    setVaultLoading(true);
    try {
      const [fRes, fiRes] = await Promise.all([
        fetch("/api/bid-vault/folders", { headers: authHeaders() }),
        fetch("/api/bid-vault/files", { headers: authHeaders() }),
      ]);
      if (fRes.ok) setVaultFolders(await fRes.json());
      if (fiRes.ok) setVaultFiles(await fiRes.json());
    } catch {}
    setVaultLoading(false);
  }

  async function loadGovernance() {
    setGovernanceLoading(true);
    try {
      const [secRes, logRes] = await Promise.all([
        fetch("/api/tender-governance/all", { headers: authHeaders() }),
        fetch("/api/tender-governance/log", { headers: authHeaders() }),
      ]);
      if (secRes.ok) setGovernanceSections(await secRes.json());
      if (logRes.ok) setGovernanceLog(await logRes.json());
    } catch {}
    setGovernanceLoading(false);
  }

  async function submitToGovernance(sectionId: number) {
    try {
      await fetch(`/api/tender-governance/submit/${sectionId}`, { method: "POST", headers: authHeaders() });
      toast({ title: "Section submitted for review" });
      loadGovernance();
    } catch {}
  }

  async function doGovernanceAction(sectionId: number, action: string) {
    try {
      await fetch(`/api/tender-governance/action/${sectionId}`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ action, notes: governanceNotes }),
      });
      toast({ title: `Section ${action}d` });
      setGovernanceActionSection(null);
      setGovernanceNotes("");
      loadGovernance();
    } catch {}
  }

  async function loadLearningVault() {
    setLearningVaultLoading(true);
    try {
      const res = await fetch("/api/tender-learning-vault", { headers: authHeaders() });
      if (res.ok) setLearningVault(await res.json());
    } catch {}
    setLearningVaultLoading(false);
  }

  async function saveLesson() {
    try {
      await fetch("/api/tender-learning-vault", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify(lessonForm),
      });
      setShowAddLesson(false);
      setLessonForm({});
      loadLearningVault();
      toast({ title: "Lesson saved to vault" });
    } catch {}
  }

  async function deleteLesson(id: number) {
    if (!confirm("Delete this lesson?")) return;
    try {
      await fetch(`/api/tender-learning-vault/${id}`, { method: "DELETE", headers: authHeaders() });
      loadLearningVault();
    } catch {}
  }

  async function loadAutomationLog() {
    try {
      const res = await fetch("/api/tender-automation/log", { headers: authHeaders() });
      if (res.ok) setAutomationLog(await res.json());
    } catch {}
  }

  async function runDiscovery() {
    setAutomationLoading(true);
    setDiscoveryResult(null);
    try {
      const res = await fetch("/api/tender-automation/run-discovery", {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ entity: "GB" }),
      });
      const data = await res.json();
      setDiscoveryResult(data);
      loadAutomationLog();
      fetchTenders();
      toast({ title: data.message });
    } catch {}
    setAutomationLoading(false);
  }

  async function runDeadlineAlerts() {
    setAutomationLoading(true);
    try {
      const res = await fetch("/api/tender-automation/deadline-alerts", { method: "POST", headers: authHeaders() });
      const data = await res.json();
      setDeadlineAlerts(data);
      loadAutomationLog();
      toast({ title: data.message });
    } catch {}
    setAutomationLoading(false);
  }

  async function createVaultFolder() {
    if (!vaultNewFolderName.trim()) return;
    try {
      const res = await fetch("/api/bid-vault/folders", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ name: vaultNewFolderName, parent_id: vaultCurrentFolder?.id || null, description: vaultNewFolderDesc || null })
      });
      if (res.ok) { setVaultShowNewFolder(false); setVaultNewFolderName(""); setVaultNewFolderDesc(""); loadVaultData(); }
    } catch {}
  }

  async function deleteVaultFolder(id: number) {
    if (!confirm("Delete this folder and all its files?")) return;
    try {
      await fetch(`/api/bid-vault/folders/${id}`, { method: "DELETE", headers: authHeaders() });
      loadVaultData();
      if (vaultCurrentFolder?.id === id) setVaultCurrentFolder(null);
    } catch {}
  }

  async function uploadVaultFile(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVaultUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (vaultCurrentFolder) formData.append("folder_id", String(vaultCurrentFolder.id));
      if (vaultUploadNotes) formData.append("notes", vaultUploadNotes);
      formData.append("uploaded_by", "Tolz");
      const token = getToken();
      const res = await fetch("/api/bid-vault/files", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      if (res.ok) { loadVaultData(); setVaultUploadNotes(""); }
    } catch {}
    setVaultUploading(false);
    e.target.value = "";
  }

  async function deleteVaultFile(id: number) {
    if (!confirm("Delete this file?")) return;
    try {
      await fetch(`/api/bid-vault/files/${id}`, { method: "DELETE", headers: authHeaders() });
      loadVaultData();
    } catch {}
  }

  async function verifyProfilePassword() {
    setProfilePasswordError("");
    try {
      const res = await fetch("/api/tender-company-profile/verify", {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ password: profilePassword })
      });
      if (res.ok) {
        setProfileUnlocked(true);
        setProfilePassword("");
        loadCompanyProfile();
      } else {
        setProfilePasswordError("Incorrect password. Access denied.");
      }
    } catch { setProfilePasswordError("Error verifying password."); }
  }

  async function loadCompanyProfile() {
    setLoadingProfile(true);
    try {
      const res = await fetch("/api/tender-company-profile", { headers: authHeaders() });
      const data = await res.json();
      setCompanyProfile(data);
      setProfileForm(data);
    } catch { toast({ title: "Error loading profile", variant: "destructive" }); }
    setLoadingProfile(false);
  }

  async function saveCompanyProfile() {
    try {
      const res = await fetch("/api/tender-company-profile", { method: "PATCH", headers: authHeaders(), body: JSON.stringify(profileForm) });
      const data = await res.json();
      setCompanyProfile(data);
      setEditingProfile(false);
      toast({ title: "Company profile saved" });
    } catch { toast({ title: "Error saving profile", variant: "destructive" }); }
  }

  async function loadTenderDocs(tenderId: number) {
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/documents`, { headers: authHeaders() });
      setTenderDocs(await res.json());
    } catch { toast({ title: "Error loading documents", variant: "destructive" }); }
    setLoadingDocs(false);
  }

  async function createDoc(tenderId: number, name: string, sectionLabel: string, docType: string = "response") {
    try {
      const res = await fetch(`/api/tenders/${tenderId}/documents`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ name, section_label: sectionLabel, doc_type: docType }),
      });
      const doc = await res.json();
      setTenderDocs(prev => [...prev, doc]);
      return doc;
    } catch { toast({ title: "Error creating document", variant: "destructive" }); }
  }

  async function updateDoc(tenderId: number, docId: number, updates: any) {
    try {
      const res = await fetch(`/api/tenders/${tenderId}/documents/${docId}`, {
        method: "PATCH", headers: authHeaders(), body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setTenderDocs(prev => prev.map(d => d.id === docId ? updated : d));
      return updated;
    } catch { toast({ title: "Error updating document", variant: "destructive" }); }
  }

  async function deleteDoc(tenderId: number, docId: number) {
    if (!confirm("Delete this document?")) return;
    try {
      await fetch(`/api/tenders/${tenderId}/documents/${docId}`, { method: "DELETE", headers: authHeaders() });
      setTenderDocs(prev => prev.filter(d => d.id !== docId));
      toast({ title: "Document deleted" });
    } catch { toast({ title: "Error deleting document", variant: "destructive" }); }
  }

  async function autoGenerateDoc(tenderId: number, sectionLabel: string) {
    setGeneratingDoc(sectionLabel);
    try {
      const res = await fetch("/api/tender-ai/auto-generate", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ tender_id: tenderId, section_label: sectionLabel }),
      });
      const data = await res.json();
      if (data.content) {
        const existingDoc = tenderDocs.find(d => d.section_label === sectionLabel);
        if (existingDoc) {
          await updateDoc(tenderId, existingDoc.id, { content: data.content, status: "draft" });
        } else {
          const doc = await createDoc(tenderId, sectionLabel, sectionLabel);
          if (doc) await updateDoc(tenderId, doc.id, { content: data.content });
        }
        toast({ title: `${sectionLabel} generated` });
      }
    } catch { toast({ title: "Error generating content", variant: "destructive" }); }
    setGeneratingDoc(null);
  }

  function openTenderDetail(tender: Tender) {
    setSelectedTender(tender);
    setView("tender_detail");
    loadTenderDocs(tender.id);
  }

  async function saveTender(form: any) {
    try {
      if (form.id) {
        await fetch(`/api/tenders/${form.id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(form) });
      } else {
        await fetch("/api/tenders", { method: "POST", headers: authHeaders(), body: JSON.stringify(form) });
      }
      await fetchTenders();
      setShowAdd(false);
      setEditTender(null);
      toast({ title: form.id ? "Tender updated" : "Tender added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function deleteTender(id: number) {
    if (!confirm("Delete this tender?")) return;
    try {
      await fetch(`/api/tenders/${id}`, { method: "DELETE", headers: authHeaders() });
      await fetchTenders();
      toast({ title: "Tender deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  function logout() {
    localStorage.removeItem("tender_token");
    localStorage.removeItem("tender_user");
    setLocation("/planner-dashboard");
  }

  const statuses = ["All", ...Object.keys(STATUS_COLORS)];
  const filtered = tenders.filter(t => {
    const hiddenStatuses = ["closed", "awarded", "cancelled"];
    const tenderStatus = String(t.status || "").toLowerCase();
    if (hiddenStatuses.includes(tenderStatus)) return false;
    const deadline = t.deadline || t.closing_date || t.close_date || t.expiry_date;
    if (deadline) {
      const d = new Date(deadline);
      if (!isNaN(d.getTime()) && d.getTime() < Date.now()) return false;
    }
    const matchStatus = filter === "All" || t.status === filter;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.buyer.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: tenders.length,
    active: tenders.filter(t => ["Active", "In Progress"].includes(t.status) && !["closed", "awarded", "cancelled"].includes(String(t.status || "").toLowerCase())).length,
    submitted: tenders.filter(t => t.status === "Submitted" && !["closed", "awarded", "cancelled"].includes(String(t.status || "").toLowerCase())).length,
    won: tenders.filter(t => t.status === "Won" && !["closed", "awarded", "cancelled"].includes(String(t.status || "").toLowerCase())).length,
  };

  const user = (() => { try { return JSON.parse(localStorage.getItem("tender_user") || "{}"); } catch { return {}; } })();
  const accessLevel: string = user.access_level || "standard";
  const userPerms = getPerms(user);
  const hasPerm = (key: string) => userPerms[key] === true;

  const primaryNavItems = [
    { id: "dashboard", label: "Dashboard", perm: null },
    { id: "finder", label: "🔍 Tender Finder", perm: "tender_finder" },
    { id: "tenders", label: "All Tenders", perm: "all_tenders" },
    { id: "governance", label: "🏛️ Bid Governance", perm: null, onClick: () => loadGovernance() },
    { id: "intelligence", label: "📡 Procurement Tenders", perm: "intelligence" },
    { id: "vault", label: "📁 Bid Vault", perm: "bid_vault" },
  ];
  const secondaryNavItems = [
    { id: "learning-vault", label: "📖 Learning Vault", perm: null, onClick: () => loadLearningVault() },
    { id: "automation", label: "🤖 Automation", perm: null, onClick: () => loadAutomationLog() },
    { id: "remittance", label: "💱 Remittance Finder", perm: "remittance_finder" },
    { id: "portals", label: "📋 Vendor Registration", perm: "vendor_registration" },
    { id: "profile", label: "🏢 Company Profile", perm: "company_profile" },
    { id: "knowledge", label: "📚 Knowledge Base", perm: null },
    { id: "assistant", label: "🤖 EP Agent", perm: "ep_agent" },
    { id: "team", label: "👥 Team", perm: "team_management" },
  ];
  const primaryNavItems_filtered = primaryNavItems.filter(n => n.perm === null || hasPerm(n.perm));
  const secondaryNavItems_filtered = secondaryNavItems.filter(n => n.perm === null || hasPerm(n.perm));
  const [showSecondaryNav, setShowSecondaryNav] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "Poppins, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Barlow+Condensed:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      <div style={{ background: "linear-gradient(90deg, #330311, #8B1538)", color: "#ffffff", textAlign: "center" as const, padding: "6px 0", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.22em", fontFamily: "Poppins, sans-serif" }}>INTERNAL — EVENT PERFEKT</div>

      <nav style={{ background: COLORS.panel, borderBottom: `1px solid ${COLORS.panelBorder}`, position: "sticky" as const, top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", minHeight: "44px", flexWrap: "wrap" as const, gap: "8px" }}>
          <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "0.08em", whiteSpace: "nowrap" as const }}>
            EVENT <span style={{ color: COLORS.gold }}>PERFEKT</span> GLOBAL
            <span style={{ fontSize: "0.58rem", fontWeight: 400, color: COLORS.muted, marginLeft: "8px", letterSpacing: "0.15em" }}>TENDER MANAGER</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const, justifyContent: "flex-end" }}>
            <span style={{ fontSize: "0.65rem", color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{user.name || user.email || ""}</span>
            <span style={{
              fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.1em",
              color: Object.values(userPerms).every(Boolean) ? "#1A0A0E" : COLORS.text,
              background: Object.values(userPerms).every(Boolean) ? COLORS.gold : Object.values(userPerms).every(v => !v) ? COLORS.red + "33" : COLORS.accent,
              padding: "2px 6px", borderRadius: "2px", fontFamily: "Poppins, sans-serif",
              textTransform: "uppercase" as const
            }}>{Object.values(userPerms).filter(Boolean).length}/{PERMISSION_DEFS.length} ACCESS</span>
            <Btn onClick={() => setShowAdd(true)} small>+ Add Tender</Btn>
            <Btn onClick={() => setLocation("/planner-dashboard")} variant="fcdo" small>← Planning</Btn>
            <Btn onClick={logout} variant="danger" small>Logout</Btn>
          </div>
        </div>
        <div style={{ display: "flex", gap: "4px", padding: "0 24px 8px", flexWrap: "wrap" as const, justifyContent: "flex-start", alignItems: "center" }}>
          {primaryNavItems_filtered.map(n => (
            <button key={n.id} onClick={() => { setView(n.id); if ((n as any).onClick) (n as any).onClick(); if (n.id !== "profile") { setProfileUnlocked(false); setProfilePassword(""); setProfilePasswordError(""); } if (n.id !== "vault") { setVaultUnlocked(false); setVaultPassword(""); setVaultPasswordError(""); } }} style={{
              background: view === n.id ? COLORS.gold + "22" : "transparent",
              border: view === n.id ? `1px solid ${COLORS.gold}44` : "1px solid transparent",
              color: view === n.id ? COLORS.gold : COLORS.muted,
              fontFamily: "Poppins, sans-serif", fontSize: "0.75rem",
              fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const,
              padding: "6px 16px", cursor: "pointer", borderRadius: "3px", transition: "all 0.15s",
              whiteSpace: "nowrap" as const
            }}>{n.label}</button>
          ))}
          {secondaryNavItems_filtered.length > 0 && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowSecondaryNav(!showSecondaryNav)} style={{
                background: "transparent",
                border: `1px solid ${COLORS.panelBorder}`,
                color: COLORS.muted,
                fontFamily: "Poppins, sans-serif", fontSize: "0.75rem",
                fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const,
                padding: "6px 16px", cursor: "pointer", borderRadius: "3px", transition: "all 0.15s"
              }}>⋮ More</button>
              {showSecondaryNav && (
                <div style={{
                  position: "absolute" as const, top: "100%", left: 0, marginTop: "4px", background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "3px", zIndex: 200, minWidth: "180px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}>
                  {secondaryNavItems_filtered.map(n => (
                    <button key={n.id} onClick={() => { setView(n.id); setShowSecondaryNav(false); if ((n as any).onClick) (n as any).onClick(); if (n.id !== "profile") { setProfileUnlocked(false); setProfilePassword(""); setProfilePasswordError(""); } if (n.id !== "vault") { setVaultUnlocked(false); setVaultPassword(""); setVaultPasswordError(""); } }} style={{
                      display: "block", width: "100%", textAlign: "left" as const,
                      background: view === n.id ? COLORS.gold + "22" : "transparent",
                      border: "none", color: view === n.id ? COLORS.gold : COLORS.text,
                      fontFamily: "Poppins, sans-serif", fontSize: "0.75rem",
                      fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const,
                      padding: "8px 14px", cursor: "pointer", transition: "all 0.15s"
                    }}>{n.label}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <div style={{ padding: "40px 40px", maxWidth: "1280px", margin: "0 auto" }}>
        {loadingData ? (
          <div style={{ textAlign: "center", padding: "120px 40px", color: COLORS.muted }}>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.85rem", letterSpacing: "0.2em", textTransform: "uppercase" as const }}>Loading tenders...</div>
          </div>
        ) : (
          <>
            {view === "dashboard" && (
              <>
                <div style={{ marginBottom: "48px" }}>
                  <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.22em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "8px" }}>Event Perfekt Global Ltd</div>
                  <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "2.4rem", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Tender <em style={{ color: COLORS.gold }}>Command Centre</em></h1>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px", marginBottom: "48px" }}>
                  {[
                    { label: "Total Tracked", value: stats.total, color: COLORS.text },
                    { label: "Active / In Progress", value: stats.active, color: COLORS.amber },
                    { label: "Submitted", value: stats.submitted, color: "#3B82F6" },
                    { label: "Won", value: stats.won, color: COLORS.gold },
                  ].map(s => (
                    <Panel key={s.label} style={{ textAlign: "center", padding: "28px 20px" }}>
                      <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "2.8rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: COLORS.muted, marginTop: "12px", fontFamily: "Poppins, sans-serif" }}>{s.label}</div>
                    </Panel>
                  ))}
                </div>

                <div style={{ marginBottom: "48px" }}>
                  <PipelineDashboard accessLevel={hasPerm("financial_data") ? "full" : "restricted"} />
                </div>

                <div style={{ marginBottom: "48px" }}>
                  <DeadlineBar tenders={tenders} />
                </div>

                <div style={{ marginBottom: "48px" }}>
                  <IntelligenceWidget onNavigate={() => setView("intelligence")} />
                </div>

                <Panel style={{ marginBottom: "48px" }}>
                  <SectionHeading>🔴 Priority Portals — FCDO & DEFRA</SectionHeading>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                    {PROCUREMENT_PORTALS.filter(p => p.priority).map(p => (
                      <a key={p.name} href={p.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                        <div style={{ background: "#1D4ED815", border: "1px solid #3B82F633", borderRadius: "2px", padding: "14px 16px", cursor: "pointer", transition: "border-color 0.2s" }}>
                          <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.82rem", fontWeight: 700, color: "#60A5FA", marginBottom: "4px" }}>{p.name} ↗</div>
                          <div style={{ fontSize: "0.78rem", color: COLORS.muted }}>{p.desc}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </Panel>

                <Panel style={{ marginBottom: "48px" }}>
                  <SectionHeading>Active Opportunities</SectionHeading>
                  {tenders.filter(t => ["Active", "In Progress", "Submitted"].includes(t.status)).length === 0 && (
                    <div style={{ color: COLORS.muted, textAlign: "center", padding: "40px" }}>
                      <div style={{ fontStyle: "italic", marginBottom: "16px" }}>No active tenders. Use the Tender Finder to discover live opportunities.</div>
                      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                        <Btn onClick={() => setView("finder")}>🔍 Open Tender Finder</Btn>
                      </div>
                    </div>
                  )}
                  {tenders.filter(t => ["Active", "In Progress", "Submitted"].includes(t.status)).map(t => (
                    <TenderRow key={t.id} tender={t} onEdit={() => setEditTender(t)} onDelete={() => deleteTender(t.id)} onAI={() => setAiTender(t)} onView={() => openTenderDetail(t)} docCount={docCounts[String(t.id)] || 0} accessLevel={hasPerm("financial_data") ? "full" : "restricted"} />
                  ))}
                </Panel>
              </>
            )}

            {view === "tenders" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                  <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "2.2rem", fontWeight: 700 }}>All <em style={{ color: COLORS.gold }}>Tenders</em></h1>
                  <Btn onClick={() => setShowAdd(true)}>+ Add Tender</Btn>
                </div>
                <div style={{ display: "flex", gap: "10px", marginBottom: "28px", flexWrap: "wrap", alignItems: "center" }}>
                  <input value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="Search tenders..."
                    style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text, padding: "10px 14px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", fontSize: "0.85rem", width: "280px" }}
                  />
                  {statuses.map(s => {
                    const count = s === "All" ? tenders.length : tenders.filter(t => t.status === s).length;
                    return (
                      <button key={s} onClick={() => setFilter(s)} style={{
                        background: filter === s ? COLORS.gold : "transparent",
                        border: `1px solid ${filter === s ? COLORS.gold : COLORS.panelBorder}`,
                        color: filter === s ? "#0A0F1A" : COLORS.muted,
                        fontFamily: "Poppins, sans-serif", fontSize: "0.68rem",
                        fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const,
                        padding: "8px 14px", borderRadius: "2px", cursor: "pointer", position: "relative" as const
                      }}>
                        {s}
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, marginLeft: "6px", opacity: 0.8 }}>({count})</span>
                      </button>
                    );
                  })}
                </div>
                <Panel>
                  {filtered.length === 0 && (
                    <div style={{ color: COLORS.muted, textAlign: "center", padding: "40px", fontStyle: "italic" }}>No tenders found.</div>
                  )}
                  {filtered.map(t => (
                    <TenderRow key={t.id} tender={t} onEdit={() => setEditTender(t)} onDelete={() => deleteTender(t.id)} onAI={() => setAiTender(t)} onView={() => openTenderDetail(t)} docCount={docCounts[String(t.id)] || 0} accessLevel={hasPerm("financial_data") ? "full" : "restricted"} />
                  ))}
                </Panel>
              </>
            )}

            {view === "finder" && (
              <TenderFinderTab onAddToTracker={(t: any) => {
                saveTender({
                  title: t.title, buyer: t.buyer || "See details", value_text: t.value || "",
                  deadline: t.deadline || "", status: "Researching", category: t.category || "",
                  portal: t.source || "", notes: t.description || "", source_url: t.url || "",
                });
                toast({ title: "Tender tracked", description: t.title });
              }} />
            )}

            {view === "portals" && (
              <>
                <div style={{ marginBottom: "24px" }}>
                  <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.8rem", fontWeight: 700 }}>Vendor <em style={{ color: COLORS.gold }}>Registration</em></h1>
                  <p style={{ color: COLORS.muted, marginTop: "6px" }}>Register Event Perfekt as a vendor on corporate and government procurement portals — track your registration status across UK, Nigeria, and international platforms</p>
                </div>

                <Panel style={{ marginBottom: "20px" }}>
                  <SectionHeading>🔴 Priority — FCDO, DEFRA & Nigeria</SectionHeading>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                    {PROCUREMENT_PORTALS.filter(p => p.priority).map(p => {
                      const registered = isPortalRegistered(p.name, p.url);
                      return (
                        <div key={p.name} style={{ background: "#1D4ED815", border: `1px solid ${registered ? COLORS.green + "44" : "#3B82F644"}`, borderRadius: "2px", padding: "20px", transition: "all 0.2s" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <a href={p.url} target="_blank" rel="noreferrer" style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.9rem", fontWeight: 700, color: "#60A5FA", textDecoration: "none" }}>{p.name} ↗</a>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <span style={{ fontSize: "0.6rem", fontWeight: 700, color: COLORS.muted, background: COLORS.accent, padding: "2px 8px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em" }}>{p.region}</span>
                              {registered ? (
                                <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "#1A0A0E", background: COLORS.green, padding: "2px 6px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em" }}>REGISTERED ✓</span>
                              ) : (
                                <span style={{ fontSize: "0.55rem", fontWeight: 800, color: COLORS.red, background: COLORS.red + "15", padding: "2px 6px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em" }}>NOT REGISTERED</span>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize: "0.82rem", color: COLORS.muted, marginBottom: registered ? "0" : "8px" }}>{p.desc}</div>
                          {!registered && (
                            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
                              <a href={p.registerUrl || p.url} target="_blank" rel="noreferrer" style={{
                                fontSize: "0.65rem", fontWeight: 700, color: "#60A5FA", textDecoration: "none",
                                fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em",
                                background: "#1D4ED822", padding: "3px 10px", borderRadius: "2px", border: "1px solid #3B82F633"
                              }}>REGISTER ↗</a>
                              <button onClick={() => markPortalRegistered(p)} style={{
                                fontSize: "0.6rem", fontWeight: 700, color: COLORS.green, background: COLORS.green + "15",
                                border: `1px solid ${COLORS.green}33`, padding: "3px 10px", borderRadius: "2px", cursor: "pointer",
                                fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em"
                              }}>MARK AS REGISTERED ✓</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Panel>

                {["UK", "Nigeria", "International"].map(region => (
                  <Panel key={region} style={{ marginBottom: "20px" }}>
                    <SectionHeading>{region === "UK" ? "🇬🇧" : region === "Nigeria" ? "🇳🇬" : "🌍"} {region} Portals</SectionHeading>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                      {PROCUREMENT_PORTALS.filter(p => p.region === region).map(p => {
                        const registered = isPortalRegistered(p.name, p.url);
                        return (
                          <div key={p.name} style={{ background: registered ? COLORS.green + "08" : "#EF444408", border: `1px solid ${registered ? COLORS.green + "44" : "#EF444433"}`, borderRadius: "2px", padding: "16px", transition: "border-color 0.2s" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                              <a href={p.url} target="_blank" rel="noreferrer" style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.82rem", fontWeight: 700, color: COLORS.gold, textDecoration: "none" }}>{p.name} ↗</a>
                              {registered ? (
                                <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "#1A0A0E", background: COLORS.green, padding: "2px 6px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", cursor: "pointer" }}
                                  onClick={() => { if (confirm(`Unmark "${p.name}" as registered?`)) unmarkPortalRegistered(p.name); }}
                                  title="Click to unmark as registered">REGISTERED ✓</span>
                              ) : (
                                <span style={{ fontSize: "0.55rem", fontWeight: 800, color: COLORS.red, background: COLORS.red + "15", padding: "2px 6px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em" }}>NOT REGISTERED</span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: COLORS.muted, marginBottom: "8px" }}>{p.desc}</div>
                            {!registered && (
                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <a href={p.registerUrl || p.url} target="_blank" rel="noreferrer" style={{
                                  fontSize: "0.65rem", fontWeight: 700, color: "#60A5FA", textDecoration: "none",
                                  fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em",
                                  background: "#1D4ED815", padding: "3px 10px", borderRadius: "2px", border: "1px solid #3B82F633"
                                }}>REGISTER ↗</a>
                                <button onClick={() => markPortalRegistered(p)} style={{
                                  fontSize: "0.6rem", fontWeight: 700, color: COLORS.green, background: COLORS.green + "15",
                                  border: `1px solid ${COLORS.green}33`, padding: "3px 10px", borderRadius: "2px", cursor: "pointer",
                                  fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em"
                                }}>MARK AS REGISTERED ✓</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                ))}

                <Panel style={{ marginBottom: "20px" }}>
                  <SectionHeading>All Registered Portals ({portalRegistrations.length})</SectionHeading>
                  <div style={{ fontSize: "0.78rem", color: COLORS.muted, marginBottom: "16px" }}>All sites Event Perfekt has accounts on — click to go to login page</div>
                  {portalRegsLoading ? (
                    <div style={{ textAlign: "center", padding: "20px", color: COLORS.muted }}>Loading...</div>
                  ) : (
                    ["UK", "International", "Nigeria"].map(region => {
                      const portals = portalRegistrations.filter((p: any) => p.region === region);
                      if (!portals.length) return null;
                      return (
                        <div key={region} style={{ marginBottom: "14px" }}>
                          <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "8px" }}>
                            {region === "UK" ? "🇬🇧" : region === "Nigeria" ? "🇳🇬" : "🌍"} {region}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" }}>
                            {portals.map((p: any) => (
                              <a key={p.portal_name} href={p.login_url || p.portal_url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                                <div style={{ background: COLORS.green + "08", border: `1px solid ${COLORS.green}33`, borderRadius: "2px", padding: "10px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div>
                                    <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.75rem", fontWeight: 700, color: COLORS.gold }}>{p.portal_name}</div>
                                    <div style={{ fontSize: "0.62rem", color: COLORS.muted }}>{p.category}</div>
                                  </div>
                                  <span style={{ fontSize: "0.6rem", color: COLORS.green, fontWeight: 700 }}>LOGIN ↗</span>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </Panel>
              </>
            )}

            {view === "intelligence" && (
              <IntelligenceFeed />
            )}

            {view === "profile" && !profileUnlocked && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "4px", padding: "40px", maxWidth: "420px", width: "100%", textAlign: "center" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔒</div>
                  <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: COLORS.gold, marginBottom: "8px" }}>Company Profile Protected</div>
                  <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.82rem", color: COLORS.muted, marginBottom: "24px", lineHeight: 1.6 }}>
                    This section contains sensitive company information including bank details, VAT, insurance, and registered addresses. Enter the access password to continue.
                  </div>
                  <input
                    type="password"
                    value={profilePassword}
                    onChange={(e: any) => { setProfilePassword(e.target.value); setProfilePasswordError(""); }}
                    onKeyDown={(e: any) => e.key === "Enter" && profilePassword.trim() && verifyProfilePassword()}
                    placeholder="Enter password..."
                    style={{ width: "100%", background: "#0A0F1A", border: `1px solid ${profilePasswordError ? "#EF4444" : COLORS.panelBorder}`, color: COLORS.text, padding: "14px 16px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", fontSize: "0.92rem", marginBottom: "12px", textAlign: "center", letterSpacing: "0.15em" }}
                  />
                  {profilePasswordError && (
                    <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.78rem", color: "#EF4444", marginBottom: "12px" }}>{profilePasswordError}</div>
                  )}
                  <button onClick={verifyProfilePassword} disabled={!profilePassword.trim()} style={{
                    width: "100%", padding: "12px", background: profilePassword.trim() ? COLORS.gold : COLORS.accent,
                    color: "#1A0A0E", border: "none", borderRadius: "2px", fontFamily: "Poppins, sans-serif",
                    fontSize: "0.82rem", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase" as const,
                    cursor: profilePassword.trim() ? "pointer" : "not-allowed", transition: "all 0.2s"
                  }}>Unlock Company Profile</button>
                </div>
              </div>
            )}

            {view === "profile" && profileUnlocked && (
              <CompanyProfileView
                profile={companyProfile}
                loading={loadingProfile}
                editing={editingProfile}
                form={profileForm}
                onLoad={loadCompanyProfile}
                onEdit={() => { setEditingProfile(true); setProfileForm({ ...companyProfile }); }}
                onCancel={() => setEditingProfile(false)}
                onSave={saveCompanyProfile}
                onFormChange={(field: string, value: string) => setProfileForm((p: any) => ({ ...p, [field]: value }))}
              />
            )}

            {view === "vault" && !hasPerm("bid_vault") && (
              <div style={{ maxWidth: "440px", margin: "80px auto", textAlign: "center" }}>
                <Panel style={{ padding: "40px" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔒</div>
                  <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: COLORS.gold, marginBottom: "8px" }}>Access Restricted</div>
                  <div style={{ fontSize: "0.85rem", color: COLORS.muted }}>The Bid Vault contains past bids and sensitive financial information. Full access is required to view this section. Contact your administrator to upgrade your access level.</div>
                </Panel>
              </div>
            )}

            {view === "vault" && hasPerm("bid_vault") && !vaultUnlocked && (
              <div style={{ maxWidth: "440px", margin: "80px auto", textAlign: "center" }}>
                <Panel style={{ padding: "40px" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔐</div>
                  <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.3rem", fontWeight: 700, color: COLORS.gold, marginBottom: "8px" }}>Bid Vault Protected</div>
                  <div style={{ fontSize: "0.85rem", color: COLORS.muted, marginBottom: "24px" }}>Enter the password to access stored bid documents and files.</div>
                  <input type="password" value={vaultPassword} onChange={(e: any) => setVaultPassword(e.target.value)}
                    onKeyDown={(e: any) => e.key === "Enter" && verifyVaultPassword()}
                    placeholder="Enter vault password"
                    style={{ width: "100%", background: "#0A0F1A", border: `1px solid ${vaultPasswordError ? COLORS.red : COLORS.panelBorder}`, color: COLORS.text, padding: "12px 16px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", fontSize: "0.9rem", marginBottom: "12px", textAlign: "center" }}
                  />
                  {vaultPasswordError && <div style={{ color: COLORS.red, fontSize: "0.8rem", marginBottom: "12px" }}>{vaultPasswordError}</div>}
                  <button onClick={verifyVaultPassword} style={{
                    background: COLORS.gold, color: "#0A0F1A", border: "none", padding: "10px 28px", borderRadius: "2px",
                    fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.1em",
                    textTransform: "uppercase" as const, cursor: "pointer", width: "100%"
                  }}>Unlock Bid Vault</button>
                </Panel>
              </div>
            )}

            {view === "vault" && hasPerm("bid_vault") && vaultUnlocked && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div>
                    <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.8rem", fontWeight: 700 }}>
                      📁 Bid <em style={{ color: COLORS.gold }}>Vault</em>
                    </h1>
                    <div style={{ fontSize: "0.8rem", color: COLORS.muted, marginTop: "4px" }}>
                      All bid documents across your tenders — past bids, feedback, proposals. Also used by EP Agent for bid writing context.
                    </div>
                  </div>
                </div>

                {/* Upload Section */}
                <Panel style={{ marginBottom: "24px", padding: "20px" }}>
                  <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.15em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "12px" }}>
                    📎 Upload Bid Documents
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "end" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: COLORS.muted, marginBottom: "6px", textTransform: "uppercase" as const }}>File</label>
                      <input type="file" onChange={uploadVaultFile} disabled={vaultUploading} style={{ width: "100%", fontSize: "0.85rem" }} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: COLORS.muted, marginBottom: "6px", textTransform: "uppercase" as const }}>Notes</label>
                      <input 
                        type="text" 
                        value={vaultUploadNotes} 
                        onChange={(e: any) => setVaultUploadNotes(e.target.value)}
                        placeholder="e.g. Winning bid, Client feedback, Past questions..." 
                        style={{ width: "100%", background: "#0A0F1A", border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text, padding: "8px 12px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", fontSize: "0.85rem" }}
                      />
                    </div>
                  </div>
                  {vaultUploading && <div style={{ marginTop: "8px", fontSize: "0.8rem", color: COLORS.gold }}>⟳ Uploading...</div>}
                </Panel>

                {vaultLoading ? (
                  <div style={{ textAlign: "center", padding: "60px", color: COLORS.muted }}>⟳ Loading...</div>
                ) : vaultFiles.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px", color: COLORS.muted }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📁</div>
                    <div style={{ fontSize: "0.95rem", marginBottom: "8px" }}>No bid documents yet</div>
                    <div style={{ fontSize: "0.8rem" }}>Open a tender and use the "Bid Documents & Files" section to upload past bids, feedback, and supporting documents.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
                      <Panel style={{ padding: "16px", textAlign: "center" }}>
                        <div style={{ fontSize: "1.8rem", fontWeight: 700, color: COLORS.gold, fontFamily: "Poppins, sans-serif" }}>{vaultFiles.length}</div>
                        <div style={{ fontSize: "0.7rem", color: COLORS.muted, fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Total Files</div>
                      </Panel>
                      <Panel style={{ padding: "16px", textAlign: "center" }}>
                        <div style={{ fontSize: "1.8rem", fontWeight: 700, color: COLORS.gold, fontFamily: "Poppins, sans-serif" }}>
                          {[...new Set(vaultFiles.filter(f => f.tender_id).map(f => f.tender_id))].length}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: COLORS.muted, fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Tenders With Files</div>
                      </Panel>
                      <Panel style={{ padding: "16px", textAlign: "center" }}>
                        <div style={{ fontSize: "1.8rem", fontWeight: 700, color: COLORS.gold, fontFamily: "Poppins, sans-serif" }}>
                          {(vaultFiles.reduce((sum: number, f: any) => sum + (f.file_size || 0), 0) / (1024 * 1024)).toFixed(1)} MB
                        </div>
                        <div style={{ fontSize: "0.7rem", color: COLORS.muted, fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Total Size</div>
                      </Panel>
                    </div>

                    {(() => {
                      const tenderIds = [...new Set(vaultFiles.filter((f: any) => f.tender_id).map((f: any) => f.tender_id))];
                      const unlinked = vaultFiles.filter((f: any) => !f.tender_id);
                      return (
                        <>
                          {tenderIds.map((tid: any) => {
                            const files = vaultFiles.filter((f: any) => f.tender_id === tid);
                            const t = tenders.find((t: any) => t.id === tid);
                            return (
                              <Panel key={tid} style={{ marginBottom: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <span style={{ fontSize: "1.1rem" }}>📋</span>
                                    <div>
                                      <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: "0.9rem", color: COLORS.text }}>{t ? t.title : `Tender #${tid}`}</div>
                                      {t && <div style={{ fontSize: "0.7rem", color: COLORS.muted }}>{t.buyer}{t.status ? ` · ${t.status}` : ""}</div>}
                                    </div>
                                  </div>
                                  <span style={{ fontSize: "0.7rem", color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{files.length} file{files.length !== 1 ? "s" : ""}</span>
                                </div>
                                {files.map((file: any) => (
                                  <div key={file.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: `1px solid ${COLORS.panelBorder}` }}>
                                    <div>
                                      <a href={file.file_url} target="_blank" rel="noreferrer" style={{ color: COLORS.gold, textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}>📄 {file.file_name}</a>
                                      {file.notes && <div style={{ fontSize: "0.73rem", color: COLORS.muted, marginTop: "2px", fontStyle: "italic" }}>{file.notes}</div>}
                                      <div style={{ fontSize: "0.68rem", color: COLORS.muted }}>
                                        {file.uploaded_by && `By ${file.uploaded_by} · `}{file.file_size ? `${(file.file_size / 1024).toFixed(0)} KB` : ""} · {file.created_at ? new Date(file.created_at).toLocaleDateString("en-GB") : ""}
                                      </div>
                                    </div>
                                    <button onClick={() => deleteVaultFile(file.id)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
                                  </div>
                                ))}
                              </Panel>
                            );
                          })}
                          {unlinked.length > 0 && (
                            <Panel style={{ marginBottom: "12px" }}>
                              <SectionHeading>Unfiled Documents</SectionHeading>
                              {unlinked.map((file: any) => (
                                <div key={file.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.panelBorder}` }}>
                                  <div>
                                    <a href={file.file_url} target="_blank" rel="noreferrer" style={{ color: COLORS.gold, textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}>📄 {file.file_name}</a>
                                    {file.notes && <div style={{ fontSize: "0.73rem", color: COLORS.muted, marginTop: "2px" }}>{file.notes}</div>}
                                    <div style={{ fontSize: "0.68rem", color: COLORS.muted }}>
                                      {file.uploaded_by && `By ${file.uploaded_by} · `}{file.file_size ? `${(file.file_size / 1024).toFixed(0)} KB` : ""} · {file.created_at ? new Date(file.created_at).toLocaleDateString("en-GB") : ""}
                                    </div>
                                  </div>
                                  <button onClick={() => deleteVaultFile(file.id)} style={{ background: "none", border: "none", color: COLORS.red, cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
                                </div>
                              ))}
                            </Panel>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </>
            )}

            {view === "knowledge" && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COLORS.gold}22`, borderRadius: 12, padding: 24 }}>
                <TenderKnowledgeBase />
              </div>
            )}

            {view === "remittance" && (
              <>
                <div style={{ marginBottom: "28px" }}>
                  <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.22em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "6px" }}>Business Development</div>
                  <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>Remittance <em style={{ color: COLORS.gold }}>Company Finder</em></h1>
                  <p style={{ color: COLORS.muted, fontSize: "0.85rem", marginTop: "8px" }}>Find companies and organisations that actively send money to Africa — corporates, NGOs, government agencies, importers, churches, employers — and introduce them to the payment gateway</p>
                </div>

                <Panel style={{ marginBottom: "24px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "16px", alignItems: "end" }}>
                    <div>
                      <label style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: COLORS.muted, fontFamily: "Poppins, sans-serif", display: "block", marginBottom: "6px" }}>Region Focus</label>
                      <select value={remittanceRegion} onChange={(e) => setRemittanceRegion(e.target.value)} style={{ width: "100%", background: "#0A0F1A", border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text, padding: "10px 14px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", fontSize: "0.88rem" }}>
                        <option value="All Africa">All Africa</option>
                        <option value="West Africa">West Africa (Nigeria, Ghana, Senegal)</option>
                        <option value="East Africa">East Africa (Kenya, Uganda, Tanzania)</option>
                        <option value="Southern Africa">Southern Africa (South Africa, Zimbabwe)</option>
                        <option value="North Africa">North Africa (Egypt, Morocco)</option>
                        <option value="UK to Africa">UK to Africa Corridors</option>
                        <option value="US to Africa">US to Africa Corridors</option>
                        <option value="EU to Africa">EU to Africa Corridors</option>
                        <option value="Middle East to Africa">Middle East to Africa</option>
                        <option value="Global">Global Remittance Operators</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: COLORS.muted, fontFamily: "Poppins, sans-serif", display: "block", marginBottom: "6px" }}>Company Type</label>
                      <select value={remittanceType} onChange={(e) => setRemittanceType(e.target.value)} style={{ width: "100%", background: "#0A0F1A", border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text, padding: "10px 14px", borderRadius: "2px", fontFamily: "Poppins, sans-serif", fontSize: "0.88rem" }}>
                        <option value="all">All Types</option>
                        <option value="corporates">Corporates (operations/staff in Africa)</option>
                        <option value="ngos">NGOs & Charities (funding to Africa)</option>
                        <option value="importers">Importers / Exporters / Traders</option>
                        <option value="diaspora_employers">Diaspora Employers / Remote Teams</option>
                        <option value="agencies">Recruitment & Staffing Agencies</option>
                        <option value="churches">Churches & Faith Organisations</option>
                        <option value="schools">Schools & Universities</option>
                        <option value="government">Government & Development Agencies (FCDO, USAID, GIZ etc.)</option>
                        <option value="govt_contractors">Private Companies with Govt Africa Contracts</option>
                      </select>
                    </div>
                    <Btn onClick={searchRemittanceCompanies} disabled={remittanceLoading}>
                      {remittanceLoading ? "⟳ Searching..." : "🔍 Find Companies"}
                    </Btn>
                  </div>
                </Panel>

                {remittanceLoading && (
                  <div style={{ textAlign: "center", padding: "60px", color: COLORS.muted }}>
                    <div style={{ fontSize: "2rem", marginBottom: "12px" }}>💱</div>
                    <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.85rem", letterSpacing: "0.2em", textTransform: "uppercase" as const }}>EP is researching remittance companies...</div>
                    <p style={{ fontSize: "0.75rem", marginTop: "8px", color: COLORS.muted }}>Searching for {remittanceRegion} — {remittanceType === "all" ? "all types" : remittanceType.replace(/_/g, " ")}</p>
                  </div>
                )}

                {!remittanceLoading && remittanceResults.length === 0 && view === "remittance" && (
                  <Panel style={{ textAlign: "center", padding: "60px" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>💱</div>
                    <p style={{ color: COLORS.muted, fontSize: "0.85rem" }}>Select a region and company type, then click "Find Companies" to discover businesses that actively send money to Africa and could use the payment gateway.</p>
                  </Panel>
                )}

                {!remittanceLoading && remittanceResults.length > 0 && (
                  <div>
                    <SectionHeading>Found {remittanceResults.length} Companies</SectionHeading>
                    <div style={{ display: "grid", gap: "14px" }}>
                      {remittanceResults.map((company: any, idx: number) => (
                        <Panel key={idx} style={{ padding: "20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                                <h3 style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.1rem", margin: 0, color: COLORS.text }}>{company.name}</h3>
                                {company.type && (
                                  <span style={{ background: COLORS.gold + "22", border: `1px solid ${COLORS.gold}44`, color: COLORS.gold, padding: "2px 10px", borderRadius: "2px", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: "Poppins, sans-serif" }}>{company.type}</span>
                                )}
                                {company.estimated_volume && (
                                  <span style={{ background: COLORS.green + "22", border: `1px solid ${COLORS.green}44`, color: COLORS.green, padding: "2px 10px", borderRadius: "2px", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: "Poppins, sans-serif" }}>{company.estimated_volume}</span>
                                )}
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "16px", fontSize: "0.78rem", color: COLORS.muted, marginBottom: "10px" }}>
                                {company.headquarters && <span>📍 {company.headquarters}</span>}
                                {company.africa_operations && <span>🌍 Africa: {company.africa_operations}</span>}
                              </div>
                              <p style={{ fontSize: "0.82rem", color: COLORS.text, lineHeight: 1.6, margin: 0 }}>{company.description}</p>
                              {(company.awarded_by || company.contract_details) && (
                                <div style={{ marginTop: "8px", padding: "8px 12px", background: "#0D2818", border: `1px solid ${COLORS.green}33`, borderRadius: "2px" }}>
                                  {company.awarded_by && (
                                    <div style={{ fontSize: "0.72rem", marginBottom: company.contract_details ? "4px" : "0" }}>
                                      <span style={{ fontWeight: 700, color: COLORS.green, fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em" }}>🏛️ AWARDED BY: </span>
                                      <span style={{ color: COLORS.text }}>{company.awarded_by}</span>
                                    </div>
                                  )}
                                  {company.contract_details && (
                                    <div style={{ fontSize: "0.72rem" }}>
                                      <span style={{ fontWeight: 700, color: COLORS.green, fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em" }}>📄 CONTRACT: </span>
                                      <span style={{ color: COLORS.muted }}>{company.contract_details}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {company.why_twinpay && (
                                <div style={{ marginTop: "8px", padding: "8px 12px", background: COLORS.gold + "12", border: `1px solid ${COLORS.gold}33`, borderRadius: "2px" }}>
                                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: COLORS.gold, fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em" }}>💡 WHY TWINPAY: </span>
                                  <span style={{ fontSize: "0.78rem", color: COLORS.text }}>{company.why_twinpay}</span>
                                </div>
                              )}
                              {company.services && (
                                <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
                                  {(Array.isArray(company.services) ? company.services : [company.services]).map((s: string, si: number) => (
                                    <span key={si} style={{ background: COLORS.accent, color: COLORS.muted, padding: "3px 10px", borderRadius: "2px", fontSize: "0.65rem", fontWeight: 600, fontFamily: "Poppins, sans-serif", letterSpacing: "0.08em" }}>{s}</span>
                                  ))}
                                </div>
                              )}
                              {(company.contact_name || company.contact_email) && (
                                <div style={{ marginTop: "8px", fontSize: "0.75rem", color: COLORS.gold }}>
                                  {company.contact_name && <span>👤 {company.contact_name}{company.contact_title ? ` — ${company.contact_title}` : ""}</span>}
                                  {company.contact_name && company.contact_email && <span style={{ margin: "0 8px", color: COLORS.muted }}>|</span>}
                                  {company.contact_email && <span>✉ {company.contact_email}</span>}
                                </div>
                              )}
                              {company.website && (
                                <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: COLORS.gold, marginTop: "4px", display: "inline-block", textDecoration: "none" }}>🌐 {company.website} ↗</a>
                              )}
                              {company.procurement_portals && Array.isArray(company.procurement_portals) && company.procurement_portals.length > 0 && (
                                <div style={{ marginTop: "10px", padding: "10px 14px", background: "#1a1025", border: `1px solid #6B21A844`, borderRadius: "2px" }}>
                                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#A78BFA", fontFamily: "Poppins, sans-serif", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "6px" }}>📋 TENDER / PROCUREMENT PORTALS</div>
                                  <div style={{ display: "flex", flexDirection: "column" as const, gap: "4px" }}>
                                    {company.procurement_portals.map((portal: any, pi: number) => (
                                      <div key={pi} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem" }}>
                                        <a href={portal.url?.startsWith("http") ? portal.url : `https://${portal.url}`} target="_blank" rel="noreferrer" style={{ color: "#A78BFA", textDecoration: "none", fontWeight: 600 }}>{portal.portal_name} ↗</a>
                                        {portal.notes && <span style={{ color: COLORS.muted, fontSize: "0.7rem" }}>— {portal.notes}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px", flexShrink: 0 }}>
                              <Btn onClick={() => verifyRemittanceContact(company, idx)} small variant="secondary" disabled={verifyingContact === idx}>
                                {verifyingContact === idx ? "⟳ Verifying..." : verifiedContacts[idx] ? "✓ Re-verify Contact" : "🔍 Verify Contact"}
                              </Btn>
                              <Btn onClick={() => generateTwinPayEmail(company, idx)} small disabled={remittanceGeneratingEmail === idx}>
                                {remittanceGeneratingEmail === idx ? "⟳ Drafting..." : "✦ Draft Email"}
                              </Btn>
                              {company.website && (
                                <Btn onClick={() => window.open(company.website.startsWith("http") ? company.website : `https://${company.website}`, "_blank")} variant="secondary" small>🌐 Visit Site</Btn>
                              )}
                            </div>
                            {verifiedContacts[idx] && (
                              <div style={{ marginTop: "10px", padding: "12px 14px", background: "#0A1628", border: `1px solid #3B82F644`, borderRadius: "2px", width: "100%" }}>
                                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#60A5FA", fontFamily: "Poppins, sans-serif", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: "8px" }}>🔍 EP-VERIFIED CONTACT</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.78rem" }}>
                                  <div><span style={{ color: COLORS.muted }}>Name: </span><span style={{ color: COLORS.text, fontWeight: 600 }}>{verifiedContacts[idx].contact_name}</span></div>
                                  <div><span style={{ color: COLORS.muted }}>Title: </span><span style={{ color: COLORS.text }}>{verifiedContacts[idx].contact_title}</span></div>
                                  <div><span style={{ color: COLORS.muted }}>Email: </span><span style={{ color: "#60A5FA", fontWeight: 600 }}>{verifiedContacts[idx].contact_email}</span></div>
                                  <div><span style={{ color: COLORS.muted }}>Pattern: </span><span style={{ color: COLORS.text }}>{verifiedContacts[idx].email_pattern}</span></div>
                                </div>
                                {verifiedContacts[idx].linkedin_url && (
                                  <a href={verifiedContacts[idx].linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: "#60A5FA", marginTop: "6px", display: "inline-block", textDecoration: "none" }}>🔗 LinkedIn Profile ↗</a>
                                )}
                                <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "0.6rem", padding: "2px 8px", borderRadius: "2px", fontWeight: 700, fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" as const, background: verifiedContacts[idx].confidence === "high" ? "#16A34A33" : verifiedContacts[idx].confidence === "medium" ? "#EAB30833" : "#EF444433", color: verifiedContacts[idx].confidence === "high" ? COLORS.green : verifiedContacts[idx].confidence === "medium" ? "#EAB308" : "#EF4444", border: `1px solid ${verifiedContacts[idx].confidence === "high" ? COLORS.green + "44" : verifiedContacts[idx].confidence === "medium" ? "#EAB30844" : "#EF444444"}` }}>{verifiedContacts[idx].confidence} confidence</span>
                                  <span style={{ fontSize: "0.68rem", color: COLORS.muted }}>{verifiedContacts[idx].confidence_reason}</span>
                                </div>
                                {verifiedContacts[idx].alternative_contacts?.length > 0 && (
                                  <div style={{ marginTop: "8px", fontSize: "0.72rem" }}>
                                    <span style={{ color: COLORS.muted }}>Alternatives: </span>
                                    {verifiedContacts[idx].alternative_contacts.map((alt: any, ai: number) => (
                                      <span key={ai} style={{ color: COLORS.text }}>{alt.name} ({alt.title}) — <span style={{ color: "#60A5FA" }}>{alt.email}</span>{ai < verifiedContacts[idx].alternative_contacts.length - 1 ? " | " : ""}</span>
                                    ))}
                                  </div>
                                )}
                                {verifiedContacts[idx].notes && (
                                  <div style={{ marginTop: "6px", fontSize: "0.7rem", color: COLORS.muted, fontStyle: "italic" }}>💡 {verifiedContacts[idx].notes}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </Panel>
                      ))}
                    </div>
                  </div>
                )}

                {remittanceEmailDraft && (
                  <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setRemittanceEmailDraft(null)}>
                    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "6px", width: "100%", maxWidth: "680px", maxHeight: "90vh", overflow: "auto" as const, padding: "32px" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ fontFamily: "Poppins, sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.22em", color: COLORS.gold, textTransform: "uppercase" as const, marginBottom: "6px" }}>Introduction Email</div>
                      <h2 style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.3rem", marginBottom: "24px" }}>Email to <em style={{ color: COLORS.gold }}>{remittanceEmailDraft.company_name}</em></h2>

                      <Input label="To" value={remittanceEmailDraft.to} onChange={(v: string) => setRemittanceEmailDraft({ ...remittanceEmailDraft, to: v })} placeholder="contact@company.com" />
                      <Input label="Subject" value={remittanceEmailDraft.subject} onChange={(v: string) => setRemittanceEmailDraft({ ...remittanceEmailDraft, subject: v })} />
                      <Input label="Message" value={remittanceEmailDraft.body} onChange={(v: string) => setRemittanceEmailDraft({ ...remittanceEmailDraft, body: v })} textarea />

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                        <Btn onClick={() => setRemittanceEmailDraft(null)} variant="secondary" disabled={remittanceSending}>Cancel</Btn>
                        <Btn onClick={sendTwinPayEmail} disabled={remittanceSending}>{remittanceSending ? "⟳ Sending..." : "📤 Send Email"}</Btn>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── BID GOVERNANCE ──────────────────────────────────────── */}
            {view === "governance" && (
              <div>
                <SectionHeading>🏛️ Bid Governance</SectionHeading>
                <p style={{ color: COLORS.muted, fontSize: "0.82rem", marginBottom: "24px" }}>Review, approve or reject bid sections before submission. All actions are logged.</p>

                {/* Filter bar */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" as const }}>
                  {["all", "not_submitted", "awaiting_review", "approved", "rejected", "changes_requested", "rewritten"].map(f => (
                    <button key={f} onClick={() => setGovernanceFilter(f)} style={{ padding: "4px 14px", borderRadius: "3px", border: `1px solid ${governanceFilter === f ? COLORS.gold : COLORS.panelBorder}`, background: governanceFilter === f ? COLORS.gold + "22" : "transparent", color: governanceFilter === f ? COLORS.gold : COLORS.muted, fontFamily: "Poppins, sans-serif", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" }}>{f.replace(/_/g, " ")}</button>
                  ))}
                </div>

                {governanceLoading ? <div style={{ color: COLORS.muted }}>Loading...</div> : (
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
                    {(governanceFilter === "all" ? governanceSections : governanceSections.filter(s => s.governance_status === governanceFilter)).length === 0 ? (
                      <Panel><div style={{ textAlign: "center", color: COLORS.muted, padding: "40px" }}>No sections yet. Generate bid sections from a tender to begin.</div></Panel>
                    ) : (
                      (governanceFilter === "all" ? governanceSections : governanceSections.filter(s => s.governance_status === governanceFilter)).map((s: any) => {
                        const statusColor: Record<string, string> = { approved: "#34D399", rejected: "#EF4444", awaiting_review: COLORS.gold, not_submitted: COLORS.muted, changes_requested: "#F97316", rewritten: "#60A5FA" };
                        const sc = statusColor[s.governance_status] || COLORS.muted;
                        return (
                          <Panel key={s.id}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "0.9rem", marginBottom: "2px" }}>{s.name}</div>
                                <div style={{ color: COLORS.muted, fontSize: "0.75rem" }}>{s.tender_title || "—"} · {s.buyer || "—"} · v{s.version || 1}</div>
                                {s.content && <div style={{ color: COLORS.muted, fontSize: "0.78rem", marginTop: "6px", maxHeight: "60px", overflow: "hidden" }}>{s.content.slice(0, 200)}...</div>}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px", alignItems: "flex-end" }}>
                                <span style={{ padding: "2px 10px", borderRadius: "2px", background: sc + "22", color: sc, fontSize: "0.65rem", fontWeight: 700, fontFamily: "Poppins, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{(s.governance_status || "").replace(/_/g, " ")}</span>
                                <div style={{ display: "flex", gap: "4px" }}>
                                  {s.governance_status === "not_submitted" && <Btn small onClick={() => submitToGovernance(s.id)}>Submit</Btn>}
                                  {s.governance_status === "awaiting_review" && <>
                                    <Btn small onClick={() => doGovernanceAction(s.id, "approve")}>✓ Approve</Btn>
                                    <Btn small variant="danger" onClick={() => setGovernanceActionSection({ ...s, mode: "reject" })}>✗ Reject</Btn>
                                    <Btn small variant="secondary" onClick={() => setGovernanceActionSection({ ...s, mode: "request_changes" })}>↩ Changes</Btn>
                                  </>}
                                </div>
                              </div>
                            </div>
                          </Panel>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Audit Log */}
                <SectionHeading style={{ marginTop: "32px" }}>Audit Log</SectionHeading>
                <Panel>
                  {governanceLog.length === 0 ? <div style={{ color: COLORS.muted, fontSize: "0.82rem" }}>No actions recorded yet.</div> : (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                      {governanceLog.slice(0, 20).map((log: any) => (
                        <div key={log.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start", borderBottom: `1px solid ${COLORS.panelBorder}`, paddingBottom: "8px" }}>
                          <div style={{ color: COLORS.gold, fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const, minWidth: "100px" }}>{log.action?.replace(/_/g, " ")}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.8rem" }}>{log.section_name || "Section"} — {log.tender_title || "Tender"}</div>
                            {log.notes && <div style={{ color: COLORS.muted, fontSize: "0.75rem" }}>{log.notes}</div>}
                          </div>
                          <div style={{ color: COLORS.muted, fontSize: "0.7rem", whiteSpace: "nowrap" as const }}>{log.performed_by} · {log.created_at ? new Date(log.created_at).toLocaleDateString("en-GB") : ""}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                {/* Action Modal */}
                {governanceActionSection && (
                  <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setGovernanceActionSection(null)}>
                    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "6px", padding: "28px", maxWidth: "500px", width: "100%" }} onClick={e => e.stopPropagation()}>
                      <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: "16px" }}>{governanceActionSection.mode === "reject" ? "Reject Section" : "Request Changes"} — {governanceActionSection.name}</div>
                      <Input label="Notes (required for changes — EP Agent will auto-rewrite)" value={governanceNotes} onChange={setGovernanceNotes} textarea placeholder="What needs to be changed or improved?" />
                      <div style={{ display: "flex", gap: "10px", marginTop: "16px", justifyContent: "flex-end" }}>
                        <Btn variant="secondary" onClick={() => setGovernanceActionSection(null)}>Cancel</Btn>
                        <Btn variant={governanceActionSection.mode === "reject" ? "danger" : "primary"} onClick={() => doGovernanceAction(governanceActionSection.id, governanceActionSection.mode)}>{governanceActionSection.mode === "reject" ? "Reject" : "Request Changes + Auto-Rewrite"}</Btn>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── LEARNING VAULT ───────────────────────────────────────── */}
            {view === "learning-vault" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <SectionHeading>📖 Learning Vault</SectionHeading>
                  <Btn small onClick={() => { setShowAddLesson(true); setLessonForm({}); }}>+ Add Lesson</Btn>
                </div>
                <p style={{ color: COLORS.muted, fontSize: "0.82rem", marginBottom: "24px" }}>Win/loss lessons applied by EP Agent when drafting future bids.</p>

                {learningVaultLoading ? <div style={{ color: COLORS.muted }}>Loading...</div> : (
                  learningVault.length === 0 ? (
                    <Panel><div style={{ textAlign: "center", color: COLORS.muted, padding: "40px" }}>No lessons yet. Add your first win/loss lesson.</div></Panel>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
                      {learningVault.map((v: any) => (
                        <Panel key={v.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                                <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>{v.tender_name}</span>
                                <span style={{ padding: "1px 8px", borderRadius: "2px", background: v.outcome === "Won" ? "#34D39922" : "#EF444422", color: v.outcome === "Won" ? "#34D399" : "#EF4444", fontSize: "0.65rem", fontWeight: 700, fontFamily: "Poppins, sans-serif", textTransform: "uppercase" as const }}>{v.outcome || "—"}</span>
                              </div>
                              <div style={{ color: COLORS.muted, fontSize: "0.75rem", marginBottom: "6px" }}>{v.reference && `Ref: ${v.reference} · `}{v.buyer} {v.our_score && `· Our score: ${v.our_score}%`} {v.winner_score && `vs Winner: ${v.winner_score}%`}</div>
                              {v.lessons && <div style={{ color: COLORS.text, fontSize: "0.8rem", lineHeight: 1.5 }}>{v.lessons}</div>}
                            </div>
                            <Btn small variant="danger" onClick={() => deleteLesson(v.id)}>Delete</Btn>
                          </div>
                        </Panel>
                      ))}
                    </div>
                  )
                )}

                {showAddLesson && (
                  <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setShowAddLesson(false)}>
                    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "6px", padding: "28px", maxWidth: "600px", width: "100%", maxHeight: "90vh", overflowY: "auto" as const }} onClick={e => e.stopPropagation()}>
                      <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: "20px" }}>Add Win/Loss Lesson</div>
                      <Input label="Tender Name" value={lessonForm.tender_name || ""} onChange={(v: string) => setLessonForm((f: any) => ({ ...f, tender_name: v }))} placeholder="e.g. GM BGH Event Management" />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <Input label="Reference" value={lessonForm.reference || ""} onChange={(v: string) => setLessonForm((f: any) => ({ ...f, reference: v }))} placeholder="T25003" />
                        <Input label="Outcome" value={lessonForm.outcome || ""} onChange={(v: string) => setLessonForm((f: any) => ({ ...f, outcome: v }))} select options={["Won", "Lost", "Withdrawn"]} />
                      </div>
                      <Input label="Buyer" value={lessonForm.buyer || ""} onChange={(v: string) => setLessonForm((f: any) => ({ ...f, buyer: v }))} placeholder="Organisation name" />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <Input label="Our Score (%)" value={lessonForm.our_score || ""} onChange={(v: string) => setLessonForm((f: any) => ({ ...f, our_score: v }))} type="number" />
                        <Input label="Winner Score (%)" value={lessonForm.winner_score || ""} onChange={(v: string) => setLessonForm((f: any) => ({ ...f, winner_score: v }))} type="number" />
                      </div>
                      <Input label="Key Lessons (applied to future bids)" value={lessonForm.lessons || ""} onChange={(v: string) => setLessonForm((f: any) => ({ ...f, lessons: v }))} textarea placeholder="What should EP Agent do differently next time?" />
                      <div style={{ display: "flex", gap: "10px", marginTop: "16px", justifyContent: "flex-end" }}>
                        <Btn variant="secondary" onClick={() => setShowAddLesson(false)}>Cancel</Btn>
                        <Btn onClick={saveLesson}>Save Lesson</Btn>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── AUTOMATION ───────────────────────────────────────────── */}
            {view === "automation" && (
              <div>
                <SectionHeading>🤖 Automation</SectionHeading>
                <p style={{ color: COLORS.muted, fontSize: "0.82rem", marginBottom: "24px" }}>Run automated discovery cycles and deadline checks against live procurement portals.</p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "32px" }}>
                  <Panel>
                    <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "0.9rem", marginBottom: "6px" }}>🔍 Tender Discovery</div>
                    <div style={{ color: COLORS.muted, fontSize: "0.78rem", marginBottom: "14px" }}>Search Contracts Finder for new tenders matching your profile and add them to the pipeline automatically.</div>
                    {discoveryResult && <div style={{ padding: "8px 12px", background: COLORS.gold + "15", border: `1px solid ${COLORS.gold}33`, borderRadius: "4px", color: COLORS.gold, fontSize: "0.78rem", marginBottom: "10px" }}>{discoveryResult.message}</div>}
                    <Btn onClick={runDiscovery} disabled={automationLoading}>{automationLoading ? "⟳ Scanning..." : "Run Discovery Now"}</Btn>
                  </Panel>

                  <Panel>
                    <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "0.9rem", marginBottom: "6px" }}>⏰ Deadline Alerts</div>
                    <div style={{ color: COLORS.muted, fontSize: "0.78rem", marginBottom: "14px" }}>Check which tenders have deadlines within 3 days (urgent) and within 7 days (this week).</div>
                    {deadlineAlerts && <div style={{ padding: "8px 12px", background: COLORS.red + "15", border: `1px solid ${COLORS.red}33`, borderRadius: "4px", color: COLORS.red, fontSize: "0.78rem", marginBottom: "10px" }}>⚠️ {deadlineAlerts.urgent?.length || 0} urgent · {deadlineAlerts.soon?.length || 0} this week</div>}
                    <Btn variant="fcdo" onClick={runDeadlineAlerts} disabled={automationLoading}>{automationLoading ? "⟳ Checking..." : "Check Deadlines"}</Btn>
                  </Panel>

                  <Panel>
                    <div style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "0.9rem", marginBottom: "6px" }}>📋 Generate All 16 Sections</div>
                    <div style={{ color: COLORS.muted, fontSize: "0.78rem", marginBottom: "14px" }}>Pick a tender and EP Agent will draft all 16 bid sections at once using Learning Vault lessons.</div>
                    <select style={{ width: "100%", padding: "8px", background: COLORS.panelBorder, border: `1px solid ${COLORS.panelBorder}`, borderRadius: "4px", color: COLORS.text, fontSize: "0.82rem", marginBottom: "10px" }} id="gen16-select">
                      <option value="">Select a tender...</option>
                      {tenders.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                    <Btn onClick={async () => {
                      const sel = document.getElementById("gen16-select") as HTMLSelectElement;
                      if (!sel?.value) { toast({ title: "Select a tender first", variant: "destructive" }); return; }
                      setAutomationLoading(true);
                      try {
                        const res = await fetch("/api/tender-ai/generate-all-16", { method: "POST", headers: authHeaders(), body: JSON.stringify({ tender_id: parseInt(sel.value) }) });
                        const data = await res.json();
                        toast({ title: data.message });
                        loadGovernance();
                      } catch {}
                      setAutomationLoading(false);
                    }} disabled={automationLoading}>{automationLoading ? "⟳ Drafting..." : "Generate All 16 Sections"}</Btn>
                  </Panel>
                </div>

                {/* Automation Run Log */}
                <SectionHeading>Run Log</SectionHeading>
                <Panel>
                  {automationLog.length === 0 ? <div style={{ color: COLORS.muted, fontSize: "0.82rem" }}>No automation runs yet.</div> : (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                      {automationLog.map((log: any) => (
                        <div key={log.id} style={{ display: "flex", gap: "12px", alignItems: "center", borderBottom: `1px solid ${COLORS.panelBorder}`, paddingBottom: "8px" }}>
                          <div style={{ color: COLORS.gold, fontSize: "0.65rem", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, minWidth: "120px" }}>{log.action?.replace(/_/g, " ")}</div>
                          <div style={{ flex: 1, color: COLORS.text, fontSize: "0.8rem" }}>{log.result}</div>
                          <div style={{ color: COLORS.muted, fontSize: "0.7rem", whiteSpace: "nowrap" as const }}>{log.created_at ? new Date(log.created_at).toLocaleString("en-GB") : ""}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            )}

            {view === "assistant" && (
              <EPAgentChat />
            )}

            {view === "team" && hasPerm("team_management") && (
              <TeamManagement />
            )}

            {view === "tender_detail" && selectedTender && (
              <TenderDetailView
                tender={selectedTender}
                docs={tenderDocs}
                loadingDocs={loadingDocs}
                generatingDoc={generatingDoc}
                editingDoc={editingDoc}
                docEditContent={docEditContent}
                onBack={() => { setView("tenders"); setSelectedTender(null); }}
                onGenerateDoc={(section: string) => autoGenerateDoc(selectedTender.id, section)}
                onCreateDoc={(name: string, section: string) => createDoc(selectedTender.id, name, section)}
                onDeleteDoc={(docId: number) => deleteDoc(selectedTender.id, docId)}
                onEditDoc={(doc: any) => { setEditingDoc(doc); setDocEditContent(doc.content || ""); }}
                onSaveDoc={(docId: number) => { updateDoc(selectedTender.id, docId, { content: docEditContent }); setEditingDoc(null); }}
                onCancelEdit={() => setEditingDoc(null)}
                onDocContentChange={setDocEditContent}
                onUpdateDocStatus={(docId: number, status: string) => updateDoc(selectedTender.id, docId, { status })}
                onRefreshTender={fetchTenders}
                accessLevel={hasPerm("financial_data") ? "full" : "restricted"}
              />
            )}
          </>
        )}
      </div>

      {showAdd && <TenderModal onSave={saveTender} onClose={() => setShowAdd(false)} />}
      {editTender && <TenderModal tender={editTender} onSave={saveTender} onClose={() => setEditTender(null)} />}
      {aiTender && <AIBidWriter tender={aiTender} onClose={() => setAiTender(null)} />}
    </div>
  );
}
