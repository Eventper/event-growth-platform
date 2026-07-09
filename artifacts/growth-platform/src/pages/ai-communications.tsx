import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TrustPanel } from "@/components/TrustPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  fetchAiCommsClients, createAiCommsClient, fetchAiCommsCampaigns, fetchAiCommsPersonas,
  generateAiCommsMessage, sendAiCommsMessage, fetchAiCommsCommunications,
  fetchBrandThemes, fetchThemePresets, createBrandTheme, updateBrandTheme, deleteBrandTheme,
  updateAiCommsCampaign, updateAiCommsClient,
  type BrandThemeDto,
  type RecipientIntelligence,
  type CommunicationObjective,
} from "@/lib/aiCommsApi";
import BrandThemeEditor, { buildPreviewHtml } from "@/components/BrandThemeEditor";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Sparkles, Mail, Send, Loader2, Star, ChevronRight, CheckCircle,
  XCircle, AlertTriangle, TrendingUp, Target, MessageSquare,
  Users, Briefcase, User, BarChart3, Palette, Plus, Pencil, Trash2, Check, Code,
  Lightbulb, Eye, Newspaper, Building2, Heart, Mic, UserPlus, Handshake,
} from "lucide-react";

export default function AiCommunications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedWorkspaceId, activeWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [selectedPersona, setSelectedPersona] = useState<any>(null);
  const [generated, setGenerated] = useState<any>(null);
  const [sendConfirm, setSendConfirm] = useState<string | null>(null);
  const [userEdits, setUserEdits] = useState("");
  const [previewMode, setPreviewMode] = useState<"design" | "edit">("design");
  const [editingTheme, setEditingTheme] = useState<(Partial<BrandThemeDto> & { id?: string }) | null>(null);

  // Recipient intelligence
  const [recipient, setRecipient] = useState<RecipientIntelligence>({
    name: "", role: "", title: "", company: "", sector: "", email: "",
    publication: "", editorialFocus: "", brandValues: [], expertise: [],
    knownInterests: [], previousInteractions: "", context: "",
  });

  // Communication objective
  const [objective, setObjective] = useState<CommunicationObjective>({
    desiredOutcome: "",
    urgency: "medium",
    priority: "relationship",
    angle: "",
    keyMessage: "",
    exclusions: ["pricing"],
    maxWords: 200,
  });

  const { data: clientsData } = useQuery({ queryKey: ["ai-comms-clients"], queryFn: fetchAiCommsClients });
  const { data: campaignsData } = useQuery({
    queryKey: ["ai-comms-campaigns", selectedClient?.id],
    queryFn: () => fetchAiCommsCampaigns(selectedClient?.id),
    enabled: !!selectedClient,
  });
  const { data: personasData } = useQuery({ queryKey: ["ai-comms-personas"], queryFn: fetchAiCommsPersonas });
  const { data: commsData } = useQuery({
    queryKey: ["ai-comms-communications", selectedClient?.id, selectedCampaign?.id],
    queryFn: () => fetchAiCommsCommunications({ clientId: selectedClient?.id, campaignId: selectedCampaign?.id }),
    enabled: !!selectedClient && !!selectedCampaign,
  });

  const { data: themesData } = useQuery({
    queryKey: ["ai-comms-themes", selectedClient?.id],
    queryFn: () => fetchBrandThemes(selectedClient?.id),
    enabled: !!selectedClient,
  });
  const { data: presetsData } = useQuery({ queryKey: ["ai-comms-presets"], queryFn: fetchThemePresets });

  // Brands are scoped to the active workspace. Untagged brands always show so
  // nothing disappears for accounts created before workspaces existed.
  const allClients = clientsData?.clients || [];
  const clients = selectedWorkspaceId
    ? allClients.filter((c: any) => !c.workspaceId || c.workspaceId === selectedWorkspaceId)
    : allClients;
  const campaigns = campaignsData?.campaigns || [];
  const personas = personasData?.personas || [];

  // Switching workspace clears a brand selection that no longer belongs to it.
  useEffect(() => {
    if (selectedClient && selectedClient.workspaceId && selectedClient.workspaceId !== selectedWorkspaceId) {
      setSelectedClient(null);
      setSelectedCampaign(null);
      setGenerated(null);
    }
  }, [selectedWorkspaceId]); // eslint-disable-line react-hooks/exhaustive-deps
  const communications = commsData?.communications || [];
  const themes = themesData?.themes || [];
  const presets: BrandThemeDto[] = presetsData?.presets ? Object.values(presetsData.presets) : [];

  const invalidateThemes = () => queryClient.invalidateQueries({ queryKey: ["ai-comms-themes", selectedClient?.id] });

  const saveThemeMutation = useMutation({
    mutationFn: ({ theme, id }: { theme: BrandThemeDto; id?: string }) =>
      id ? updateBrandTheme(id, theme) : createBrandTheme({ ...theme, clientId: selectedClient?.id }),
    onSuccess: () => {
      toast({ title: "Theme saved" });
      setEditingTheme(null);
      invalidateThemes();
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const deleteThemeMutation = useMutation({
    mutationFn: (id: string) => deleteBrandTheme(id),
    onSuccess: () => { toast({ title: "Theme deleted" }); invalidateThemes(); },
    onError: (err: any) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const applyThemeMutation = useMutation({
    mutationFn: ({ themeId }: { themeId: string }) => updateAiCommsCampaign(selectedCampaign.id, { brandThemeId: themeId }),
    onSuccess: (data) => {
      setSelectedCampaign(data.campaign);
      toast({ title: "Theme applied to campaign", description: "New communications will inherit this branding." });
      queryClient.invalidateQueries({ queryKey: ["ai-comms-campaigns", selectedClient?.id] });
    },
    onError: (err: any) => toast({ title: "Apply failed", description: err.message, variant: "destructive" }),
  });

  const setDefaultThemeMutation = useMutation({
    mutationFn: ({ themeId }: { themeId: string }) => updateAiCommsClient(selectedClient.id, { defaultThemeId: themeId }),
    onSuccess: (data) => {
      setSelectedClient(data.client);
      toast({ title: "Set as client default theme" });
      queryClient.invalidateQueries({ queryKey: ["ai-comms-clients"] });
    },
    onError: (err: any) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  // ── Create a brand (scoped to the active workspace) ──
  const emptyBrand = { name: "", sector: "", brandVoice: "professional", websiteUrl: "", logoUrl: "", brandPositioning: "" };
  const [newBrand, setNewBrand] = useState({ ...emptyBrand });
  const createBrandMutation = useMutation({
    mutationFn: () => createAiCommsClient({ ...newBrand, workspaceId: selectedWorkspaceId }),
    onSuccess: (data) => {
      toast({ title: "Brand created", description: "Set up its colours & logo next." });
      setNewBrand({ ...emptyBrand });
      queryClient.invalidateQueries({ queryKey: ["ai-comms-clients"] });
      // Select the new brand and jump straight to identity setup.
      setSelectedClient(data.client);
      setSelectedCampaign(null);
      setActiveTab("themes");
    },
    onError: (err: any) => toast({ title: "Create failed", description: err.message, variant: "destructive" }),
  });

  const generateMutation = useMutation({
    mutationFn: generateAiCommsMessage,
    onSuccess: (data) => {
      setGenerated(data.communication);
      toast({ title: "Message generated", description: `Quality score: ${data.communication.qualityScore}/100` });
    },
    onError: (err: any) => toast({ title: "Generation failed", description: err.message, variant: "destructive" }),
  });

  const sendMutation = useMutation({
    mutationFn: sendAiCommsMessage,
    onSuccess: (data) => {
      toast({ title: "Email sent", description: `Sent to ${data.recipient}` });
      setSendConfirm(null);
    },
    onError: (err: any) => toast({ title: "Send failed", description: err.message, variant: "destructive" }),
  });

  const handleGenerate = () => {
    if (!selectedClient || !selectedCampaign || !recipient.name || !recipient.email || !objective.desiredOutcome) {
      toast({ title: "Missing fields", description: "Select client, campaign, recipient, and desired outcome", variant: "destructive" });
      return;
    }
    generateMutation.mutate({
      clientId: selectedClient.id,
      campaignId: selectedCampaign.id,
      recipient,
      objective,
      personaId: selectedPersona?.id,
    });
  };

  const handleSend = () => {
    if (!generated?.id) return;
    sendMutation.mutate(generated.id);
  };

  const getQualityColor = (score: number) => {
    if (score >= 85) return "text-green-600 bg-green-100";
    if (score >= 70) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-ink min-h-[140px] flex items-end">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1714] via-[#5B1A2A] to-[#8B1538] opacity-90" />
        <div className="relative z-10 p-5 w-full">
          <h1 className="text-[28px] font-bold tracking-tight text-ivory font-heading">Communications Engine</h1>
          <p className="text-[14px] text-ivory/70 mt-1">Reasoning-first communications. Every message is unique. No templates.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="generate" className="gap-1"><Sparkles className="w-4 h-4" /> Generate</TabsTrigger>
          <TabsTrigger value="themes" className="gap-1"><Palette className="w-4 h-4" /> Themes</TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><MessageSquare className="w-4 h-4" /> History</TabsTrigger>
          <TabsTrigger value="clients" className="gap-1"><Briefcase className="w-4 h-4" /> Clients</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1"><BarChart3 className="w-4 h-4" /> Analytics</TabsTrigger>
        </TabsList>

        {/* GENERATE TAB */}
        <TabsContent value="generate" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Selection */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">1. Select Client</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {clients.length === 0 && <p className="text-sm text-muted-foreground">No clients yet. Create one in the Clients tab.</p>}
                  {clients.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClient(c); setSelectedCampaign(null); setGenerated(null); }}
                      className={`w-full text-left p-2 rounded-md text-sm transition-colors ${selectedClient?.id === c.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                    >
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs opacity-70">{c.sector} · {c.brandVoice}</div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {selectedClient && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">2. Select Campaign</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {campaigns.length === 0 && <p className="text-sm text-muted-foreground">No campaigns for this client.</p>}
                    {campaigns.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCampaign(c); setGenerated(null); }}
                        className={`w-full text-left p-2 rounded-md text-sm transition-colors ${selectedCampaign?.id === c.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                      >
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs opacity-70">{c.objective} · {c.status}</div>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}

              {selectedCampaign && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">3. Communication Objective</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Desired Outcome</label>
                      <Input
                        placeholder="e.g. Secure a media story about our leadership initiative"
                        value={objective.desiredOutcome}
                        onChange={(e) => setObjective({ ...objective, desiredOutcome: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Urgency</label>
                        <select
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                          value={objective.urgency}
                          onChange={(e) => setObjective({ ...objective, urgency: e.target.value as any })}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Priority</label>
                        <select
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                          value={objective.priority}
                          onChange={(e) => setObjective({ ...objective, priority: e.target.value as any })}
                        >
                          <option value="relationship">Relationship</option>
                          <option value="commercial">Commercial</option>
                          <option value="visibility">Visibility</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Story Angle</label>
                      <Input
                        placeholder="e.g. The women who quietly rebuilt their careers after burnout"
                        value={objective.angle}
                        onChange={(e) => setObjective({ ...objective, angle: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Key Message</label>
                      <Input
                        placeholder="The one thing the recipient must remember"
                        value={objective.keyMessage}
                        onChange={(e) => setObjective({ ...objective, keyMessage: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Exclusions</label>
                      <div className="flex gap-2 flex-wrap">
                        {["pricing", "dates", "venue", "speaker_names", "sponsorship_rates"].map((ex) => (
                          <button
                            key={ex}
                            onClick={() => {
                              const current = objective.exclusions || [];
                              const has = current.includes(ex);
                              setObjective({ ...objective, exclusions: has ? current.filter(c => c !== ex) : [...current, ex] });
                            }}
                            className={`px-2 py-1 rounded-md text-xs border transition-colors ${(objective.exclusions || []).includes(ex) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Middle: Recipient & Generate */}
            <div className="space-y-4">
              {selectedCampaign && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">4. Recipient Intelligence</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Name" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} />
                      <Input placeholder="Email" value={recipient.email} onChange={(e) => setRecipient({ ...recipient, email: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Title" value={recipient.title} onChange={(e) => setRecipient({ ...recipient, title: e.target.value })} />
                      <Input placeholder="Company" value={recipient.company} onChange={(e) => setRecipient({ ...recipient, company: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Sector" value={recipient.sector} onChange={(e) => setRecipient({ ...recipient, sector: e.target.value })} />
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={recipient.role}
                        onChange={(e) => setRecipient({ ...recipient, role: e.target.value })}
                      >
                        <option value="">Select role…</option>
                        <option value="journalist">Journalist / Media</option>
                        <option value="sponsor">Brand / Sponsor</option>
                        <option value="speaker">Speaker / Expert</option>
                        <option value="corporate">Corporate / Partner</option>
                        <option value="prospect">Prospect / Lead</option>
                        <option value="investor">Investor</option>
                        <option value="community">Community Member</option>
                        <option value="vip">VIP / Alumnus</option>
                        <option value="executive">Executive</option>
                        <option value="referral">Referral</option>
                      </select>
                    </div>
                    {recipient.role === "journalist" && (
                      <>
                        <Input placeholder="Publication" value={recipient.publication} onChange={(e) => setRecipient({ ...recipient, publication: e.target.value })} />
                        <Input placeholder="What they cover (editorial focus)" value={recipient.editorialFocus} onChange={(e) => setRecipient({ ...recipient, editorialFocus: e.target.value })} />
                      </>
                    )}
                    {recipient.role === "sponsor" && (
                      <Input placeholder="Brand values (comma-separated)" value={(recipient.brandValues || []).join(", ")} onChange={(e) => setRecipient({ ...recipient, brandValues: e.target.value.split(",").map(s => s.trim()) })} />
                    )}
                    <Input placeholder="Any context (recent events, previous meetings, etc.)" value={recipient.context || ""} onChange={(e) => setRecipient({ ...recipient, context: e.target.value })} />
                    <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full">
                      {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Generate Message
                    </Button>
                  </CardContent>
                </Card>
              )}

              {generated && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      Quality Score
                      <Badge className={getQualityColor(generated.qualityScore)}>{generated.qualityScore}/100</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* The unified trust report — branded engines, chosen vs rejected
                        angles, and the full scorecard. Falls back to the inline view
                        for any response generated before the trust layer. */}
                    {generated.trust ? (
                      <TrustPanel trust={generated.trust} />
                    ) : (
                      <>
                        {generated.qualityGate && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between"><span>Generic</span><span>{generated.qualityGate.generic}/100</span></div>
                            <div className="flex justify-between"><span>Hook</span><span>{generated.qualityGate.hook}/100</span></div>
                            <div className="flex justify-between"><span>Value</span><span>{generated.qualityGate.value}/100</span></div>
                            <div className="flex justify-between"><span>Brand</span><span>{generated.qualityGate.brand}/100</span></div>
                            <div className="flex justify-between"><span>Pricing</span><span>{generated.qualityGate.pricing}/100</span></div>
                            <div className="flex justify-between"><span>CTA</span><span>{generated.qualityGate.cta}/100</span></div>
                            <div className="flex justify-between"><span>Human</span><span>{generated.qualityGate.human}/100</span></div>
                            <div className="flex justify-between"><span>Subject</span><span>{generated.qualityGate.subjectQuality}/100</span></div>
                          </div>
                        )}
                        {generated.qualityGate?.passed === false && (
                          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                            <AlertTriangle className="w-3 h-3" />
                            Quality gate passed with warnings. {generated.qualityGate?.feedback?.length} issues found.
                          </div>
                        )}
                        {generated.strategy && (
                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md space-y-1">
                            <div><strong>Strategy:</strong> {generated.strategy.storyAngle}</div>
                            <div><strong>Tone:</strong> {generated.strategy.tone}</div>
                            <div><strong>CTA:</strong> {generated.strategy.cta}</div>
                          </div>
                        )}
                      </>
                    )}
                    {generated.personaUsed && (
                      <div className="text-xs text-muted-foreground">Persona: <strong>{generated.personaUsed}</strong></div>
                    )}
                    {generated.ctaUsed && (
                      <div className="text-xs text-muted-foreground">Smart CTA: <strong>{generated.ctaUsed}</strong></div>
                    )}
                    {generated.themeName && (
                      <div className="text-xs text-muted-foreground">Theme: <strong>{generated.themeName}</strong></div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Preview */}
            <div className="space-y-4">
              {generated && (
                <Card>
                  <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm">Preview</CardTitle>
                    <div className="flex gap-1">
                      <Button size="sm" variant={previewMode === "design" ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => setPreviewMode("design")}>
                        <Mail className="w-3 h-3 mr-1" /> Design
                      </Button>
                      <Button size="sm" variant={previewMode === "edit" ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => setPreviewMode("edit")}>
                        <Code className="w-3 h-3 mr-1" /> Text
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-muted rounded-md">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</div>
                      <div className="text-sm font-medium">{generated.subject}</div>
                    </div>
                    {previewMode === "design" ? (
                      <iframe
                        title="email-preview"
                        srcDoc={generated.html}
                        sandbox=""
                        className="w-full rounded-md border border-border bg-white"
                        style={{ height: 520 }}
                      />
                    ) : (
                      <Textarea
                        value={userEdits || generated.body}
                        onChange={(e) => setUserEdits(e.target.value)}
                        className="min-h-[200px] text-sm"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button variant="default" onClick={() => setSendConfirm(generated.id)} disabled={sendMutation.isPending} className="flex-1">
                        {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Send
                      </Button>
                      <Button variant="outline" onClick={() => { setGenerated(null); setUserEdits(""); }} className="flex-1">
                        <XCircle className="w-4 h-4 mr-2" /> Discard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* THEMES TAB */}
        <TabsContent value="themes" className="space-y-4">
          {!selectedClient ? (
            <div className="text-center py-12 text-ivory/70">
              <Palette className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a client in the Generate tab to manage its brand themes.</p>
            </div>
          ) : editingTheme ? (
            <BrandThemeEditor
              initial={editingTheme}
              clientId={selectedClient.id}
              saving={saveThemeMutation.isPending}
              onSave={(theme, id) => saveThemeMutation.mutate({ theme, id })}
              onCancel={() => setEditingTheme(null)}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Brand themes for {selectedClient.name}</h2>
                  <p className="text-sm text-muted-foreground">Campaigns inherit a theme automatically. Set one as the client default, or apply per campaign.</p>
                </div>
                <Button onClick={() => setEditingTheme({})}><Plus className="w-4 h-4 mr-2" /> New theme</Button>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Saved themes</h3>
                {themes.length === 0 && <p className="text-sm text-muted-foreground">No saved themes yet. Start from a preset below or create a new one.</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {themes.map((t) => (
                    <ThemeCard
                      key={t.id}
                      theme={t}
                      isClientDefault={selectedClient.defaultThemeId === t.id}
                      isCampaignTheme={selectedCampaign?.brandThemeId === t.id}
                      canApplyToCampaign={!!selectedCampaign}
                      onEdit={() => setEditingTheme(t)}
                      onDelete={() => t.id && deleteThemeMutation.mutate(t.id)}
                      onApplyToCampaign={() => t.id && applyThemeMutation.mutate({ themeId: t.id })}
                      onSetDefault={() => t.id && setDefaultThemeMutation.mutate({ themeId: t.id })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Start from a preset</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {presets.map((p) => (
                    <ThemeCard
                      key={p.name}
                      theme={p}
                      isPreset
                      onUsePreset={() => setEditingTheme({ ...p, id: undefined, name: `${p.name} — ${selectedClient.name}` })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          {communications.length === 0 && (
            <div className="text-center py-12 text-ivory/70">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No communications yet. Generate your first message.</p>
            </div>
          )}
          <div className="space-y-3">
            {communications.map((comm: any) => (
              <Card key={comm.id} className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{comm.subject}</h3>
                        <Badge variant={comm.status === "sent" ? "default" : "outline"}>{comm.status}</Badge>
                        <Badge variant="secondary" className="text-xs">{comm.qualityScore}/100</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{comm.recipientName} · {comm.recipientEmail} · {comm.messageType}</p>
                      <p className="text-xs text-muted-foreground mt-1">{comm.reasoningSummary}</p>
                    </div>
                    {comm.status === "draft" && (
                      <Button size="sm" onClick={() => setSendConfirm(comm.id)}>
                        <Send className="w-3 h-3 mr-1" /> Send
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* CLIENTS TAB */}
        <TabsContent value="clients" className="space-y-4">
          {/* Create a new brand, scoped to the active workspace. On success we
              select it and jump to the Themes tab to set up its identity. */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> New brand
                {activeWorkspace && (
                  <span className="text-xs font-normal text-muted-foreground">in {activeWorkspace.name}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Brand name *"
                  value={newBrand.name}
                  onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                />
                <Input
                  placeholder="Sector (e.g. Fintech, Hospitality)"
                  value={newBrand.sector}
                  onChange={(e) => setNewBrand({ ...newBrand, sector: e.target.value })}
                />
                <Input
                  placeholder="Website URL"
                  value={newBrand.websiteUrl}
                  onChange={(e) => setNewBrand({ ...newBrand, websiteUrl: e.target.value })}
                />
                <Input
                  placeholder="Logo URL"
                  value={newBrand.logoUrl}
                  onChange={(e) => setNewBrand({ ...newBrand, logoUrl: e.target.value })}
                />
              </div>
              <Textarea
                placeholder="Brand positioning — what it stands for, who it's for"
                value={newBrand.brandPositioning}
                onChange={(e) => setNewBrand({ ...newBrand, brandPositioning: e.target.value })}
                rows={2}
              />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Voice:</span>
                  {["professional", "friendly", "bold", "playful"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setNewBrand({ ...newBrand, brandVoice: v })}
                      className={`px-2 py-0.5 rounded-md capitalize transition-colors ${newBrand.brandVoice === v ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => createBrandMutation.mutate()}
                  disabled={!newBrand.name.trim() || createBrandMutation.isPending}
                >
                  {createBrandMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create brand
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client: any) => (
              <Card key={client.id}>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{client.name}</h3>
                  <p className="text-xs text-muted-foreground">{client.sector} · {client.brandVoice}</p>
                  <p className="text-xs text-muted-foreground">{client.brandPositioning}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(client.approvedPhrases || []).slice(0, 3).map((p: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {clients.length === 0 && (
            <div className="text-center py-12 text-ivory/70">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No brands yet. Use the form above to create your first one.</p>
            </div>
          )}
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{communications.length}</div>
                <div className="text-xs text-muted-foreground">Total Communications</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{communications.filter((c: any) => c.status === "sent").length}</div>
                <div className="text-xs text-muted-foreground">Sent</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {communications.length > 0 ? Math.round(communications.reduce((a: number, c: any) => a + c.qualityScore, 0) / communications.length) : 0}
                </div>
                <div className="text-xs text-muted-foreground">Avg Quality Score</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{personas.length}</div>
                <div className="text-xs text-muted-foreground">Active Personas</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Send Confirmation */}
      <AlertDialog open={!!sendConfirm} onOpenChange={() => setSendConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send a real email. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSendConfirm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>Send Email</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Theme card ──────────────────────────────────────────────────────────────────
function ThemeCard({
  theme, isPreset, isClientDefault, isCampaignTheme, canApplyToCampaign,
  onEdit, onDelete, onApplyToCampaign, onSetDefault, onUsePreset,
}: {
  theme: BrandThemeDto;
  isPreset?: boolean;
  isClientDefault?: boolean;
  isCampaignTheme?: boolean;
  canApplyToCampaign?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onApplyToCampaign?: () => void;
  onSetDefault?: () => void;
  onUsePreset?: () => void;
}) {
  const swatches = [theme.primaryColor, theme.secondaryColor, theme.accentColor, theme.backgroundColor];
  return (
    <Card className="overflow-hidden">
      <iframe
        title={`theme-${theme.name}`}
        srcDoc={buildPreviewHtml(theme)}
        sandbox=""
        scrolling="no"
        className="w-full border-0 bg-white pointer-events-none"
        style={{ height: 200 }}
      />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-sm truncate">{theme.name}</h3>
            {isClientDefault && <Badge variant="default" className="text-[10px] shrink-0">Default</Badge>}
            {isCampaignTheme && <Badge variant="secondary" className="text-[10px] shrink-0">On campaign</Badge>}
          </div>
          <div className="flex gap-1 shrink-0">
            {swatches.map((c, i) => (
              <span key={i} className="w-4 h-4 rounded-full border border-border" style={{ background: c }} />
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground capitalize">
          {theme.headerStyle} header · {theme.buttonStyle} button · {theme.footerStyle} footer
        </p>
        {isPreset ? (
          <Button size="sm" variant="outline" className="w-full" onClick={onUsePreset}>
            <Plus className="w-3 h-3 mr-1" /> Use as starting point
          </Button>
        ) : (
          <div className="flex flex-wrap gap-1">
            {canApplyToCampaign && !isCampaignTheme && (
              <Button size="sm" className="text-xs h-7" onClick={onApplyToCampaign}>
                <Check className="w-3 h-3 mr-1" /> Apply to campaign
              </Button>
            )}
            {!isClientDefault && (
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={onSetDefault}>Set default</Button>
            )}
            <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={onEdit}><Pencil className="w-3 h-3" /></Button>
            <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-destructive" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
