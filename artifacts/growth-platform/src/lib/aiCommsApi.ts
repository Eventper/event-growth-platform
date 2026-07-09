import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
}
export function fetchWorkspaces() {
  return apiGet<{ ok: boolean; workspaces: Workspace[] }>("/api/ai-comms/workspaces");
}
export function createWorkspace(body: { name: string; description?: string }) {
  return apiPost<{ ok: boolean; workspace: Workspace }>("/api/ai-comms/workspaces", body);
}

export function fetchAiCommsClients() {
  return apiGet<{ ok: boolean; clients: any[] }>("/api/ai-comms/clients");
}
export function createAiCommsClient(body: any) {
  return apiPost<{ ok: boolean; client: any }>("/api/ai-comms/clients", body);
}
export function updateAiCommsClient(id: string, body: any) {
  return apiPatch<{ ok: boolean; client: any }>(`/api/ai-comms/clients/${id}`, body);
}

export function fetchAiCommsCampaigns(clientId?: string) {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return apiGet<{ ok: boolean; campaigns: any[] }>(`/api/ai-comms/campaigns${qs}`);
}
export function createAiCommsCampaign(body: any) {
  return apiPost<{ ok: boolean; campaign: any }>("/api/ai-comms/campaigns", body);
}
export function updateAiCommsCampaign(id: string, body: any) {
  return apiPatch<{ ok: boolean; campaign: any }>(`/api/ai-comms/campaigns/${id}`, body);
}

export function fetchAiCommsPersonas() {
  return apiGet<{ ok: boolean; personas: any[] }>("/api/ai-comms/personas");
}
export function createAiCommsPersona(body: any) {
  return apiPost<{ ok: boolean; persona: any }>("/api/ai-comms/personas", body);
}

export interface RecipientIntelligence {
  name: string;
  role: string;
  title?: string;
  company?: string;
  sector?: string;
  email?: string;
  publication?: string;
  editorialFocus?: string;
  brandValues?: string[];
  expertise?: string[];
  knownInterests?: string[];
  previousInteractions?: string;
  context?: string;
  id?: string;
}

export interface CommunicationObjective {
  desiredOutcome: string;
  urgency?: "low" | "medium" | "high";
  priority?: "relationship" | "commercial" | "visibility";
  angle?: string;
  keyMessage?: string;
  exclusions?: string[];
  maxWords?: number;
}

export function generateAiCommsMessage(body: {
  clientId: string;
  campaignId: string;
  recipient: RecipientIntelligence;
  objective: CommunicationObjective;
  personaId?: string;
}) {
  return apiPost<{
    ok: boolean;
    communication: {
      id: string;
      subject: string;
      body: string;
      html: string;
      qualityScore: number;
      reasoningSummary: string;
      personaUsed: string;
      ctaUsed: string;
      themeName: string;
      qualityGate: any;
      preWritingIntelligence: any;
      strategy: any;
      trust?: any;
    };
  }>("/api/ai-comms/generate", body);
}

// ── Brand Themes (design system) ─────────────────────────────────────────────
export interface BrandThemeDto {
  id?: string;
  clientId?: string | null;
  name: string;
  isPreset?: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: number;
  logoUrl?: string | null;
  logoPlacement: "left" | "center" | "right" | "none";
  buttonStyle: "solid" | "outline" | "pill" | "minimal";
  emailWidth: number;
  headerStyle: "minimal" | "banner" | "logo_only" | "hero";
  footerStyle: "minimal" | "standard" | "branded";
  heroImageUrl?: string | null;
  photographyStyle?: string | null;
}

export function fetchBrandThemes(clientId?: string) {
  const qs = clientId ? `?clientId=${clientId}` : "";
  return apiGet<{ ok: boolean; themes: BrandThemeDto[] }>(`/api/ai-comms/brand-themes${qs}`);
}
export function fetchThemePresets() {
  return apiGet<{ ok: boolean; presets: Record<string, BrandThemeDto> }>("/api/ai-comms/brand-themes/presets");
}
export function createBrandTheme(body: Partial<BrandThemeDto>) {
  return apiPost<{ ok: boolean; theme: BrandThemeDto }>("/api/ai-comms/brand-themes", body);
}
export function updateBrandTheme(id: string, body: Partial<BrandThemeDto>) {
  return apiPatch<{ ok: boolean; theme: BrandThemeDto }>(`/api/ai-comms/brand-themes/${id}`, body);
}
export function deleteBrandTheme(id: string) {
  return apiDelete<{ ok: boolean; deleted: boolean }>(`/api/ai-comms/brand-themes/${id}`);
}

export function sendAiCommsMessage(id: string) {
  return apiPost<{ ok: boolean; sent: boolean; recipient: string }>(`/api/ai-comms/communications/${id}/send`, {});
}

export function fetchAiCommsCommunications(filters?: { clientId?: string; campaignId?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.clientId) params.append("clientId", filters.clientId);
  if (filters?.campaignId) params.append("campaignId", filters.campaignId);
  if (filters?.status) params.append("status", filters.status);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiGet<{ ok: boolean; communications: any[] }>(`/api/ai-comms/communications${qs}`);
}

export function fetchAiCommsAnalytics(filters?: { clientId?: string; campaignId?: string }) {
  const params = new URLSearchParams();
  if (filters?.clientId) params.append("clientId", filters.clientId);
  if (filters?.campaignId) params.append("campaignId", filters.campaignId);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiGet<{ ok: boolean; analytics: any[] }>(`/api/ai-comms/analytics${qs}`);
}
