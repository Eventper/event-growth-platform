import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mail, Plus, Send, Eye, Trash2, Clock, CheckCircle, FileText, Users, Calendar, Printer, Code2, EyeOff, UserPlus, AlertCircle, Sparkles } from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";

interface Campaign {
  id: string;
  event_id: string | null;
  subject: string;
  body_html: string;
  recipients: { email: string; name?: string }[];
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  created_at: string;
}

const EMAIL_TEMPLATES = [
  {
    name: "Event Invitation",
    subject: "You're Invited! 🎉",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #8B1538; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0;">You're Invited!</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">We'd love for you to join us</p>
  </div>
  <div style="padding: 30px; background: #ffffff; border: 1px solid #eee;">
    <p>Dear Guest,</p>
    <p>We are delighted to invite you to our upcoming event. Your presence would make the occasion truly special.</p>
    <div style="background: #f8f4f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B1538;">
      <p style="margin: 5px 0;"><strong>Event:</strong> [Event Name]</p>
      <p style="margin: 5px 0;"><strong>Date:</strong> [Event Date]</p>
      <p style="margin: 5px 0;"><strong>Venue:</strong> [Venue]</p>
    </div>
    <p>We look forward to seeing you there!</p>
    <p>Warm regards,<br/>Event Perfekt Team</p>
  </div>
</div>`,
  },
  {
    name: "Save the Date",
    subject: "Save the Date! 📅",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #8B1538, #330311); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">Save the Date</h1>
  </div>
  <div style="padding: 30px; background: #ffffff; border: 1px solid #eee; text-align: center;">
    <p style="font-size: 18px; color: #333;">We are thrilled to announce</p>
    <h2 style="color: #8B1538; font-size: 24px;">[Event Name]</h2>
    <div style="background: #f8f4f5; padding: 20px; border-radius: 8px; margin: 20px auto; max-width: 300px;">
      <p style="font-size: 24px; font-weight: bold; color: #8B1538; margin: 0;">[Event Date]</p>
    </div>
    <p>Formal invitation to follow. Mark your calendars!</p>
    <p>With love,<br/>Event Perfekt Team</p>
  </div>
</div>`,
  },
  {
    name: "Thank You",
    subject: "Thank You for Attending! 🙏",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0;">Thank You!</h1>
  </div>
  <div style="padding: 30px; background: #ffffff; border: 1px solid #eee;">
    <p>Dear Guest,</p>
    <p>Thank you for being part of our special event. Your presence made it truly memorable.</p>
    <p>We hope you enjoyed the celebration as much as we did. It was wonderful having you there!</p>
    <p>With gratitude,<br/>Event Perfekt Team</p>
  </div>
</div>`,
  },
  {
    name: "Follow-up",
    subject: "Following Up on Our Event",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #8B1538; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0;">Quick Follow-Up</h1>
  </div>
  <div style="padding: 30px; background: #ffffff; border: 1px solid #eee;">
    <p>Dear Guest,</p>
    <p>We wanted to follow up after our recent event. We hope you had a wonderful time!</p>
    <p>We'd love to hear your feedback. Your thoughts help us create even better experiences in the future.</p>
    <p>Feel free to reply to this email with any comments or suggestions.</p>
    <p>Best regards,<br/>Event Perfekt Team</p>
  </div>
</div>`,
  },
];

export default function EmailCampaigns() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    subject: "",
    body_html: "",
    event_id: "",
    recipients: "" as string,
    scheduled_at: "",
  });
  const [showBodyPreview, setShowBodyPreview] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setShowCreate(false);
      resetForm();
      toast({ title: "Campaign created", description: "Your email campaign has been saved as a draft." });
    },
    onError: () => toast({ title: "Error", description: "Failed to create campaign", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/campaigns/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setEditingCampaign(null);
      resetForm();
      toast({ title: "Campaign updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update campaign", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete campaign", variant: "destructive" }),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/campaigns/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: "Campaign sent!", description: "Emails are being delivered to recipients." });
    },
    onError: () => toast({ title: "Error", description: "Failed to send campaign", variant: "destructive" }),
  });

  const resetForm = () => {
    setFormData({ subject: "", body_html: "", event_id: "", recipients: "", scheduled_at: "" });
  };

  const parseRecipients = (text: string): { email: string; name?: string }[] => {
    return text
      .split(/[\n,;]+/)
      .map((line) => line.trim())
      .filter((line) => line.includes("@"))
      .map((line) => {
        const match = line.match(/^(.+?)\s*<(.+?)>$/);
        if (match) return { name: match[1].trim(), email: match[2].trim() };
        return { email: line.trim() };
      });
  };

  const handleSave = () => {
    const recipients = parseRecipients(formData.recipients);
    const payload = {
      subject: formData.subject,
      body_html: formData.body_html,
      event_id: formData.event_id || null,
      recipients,
      status: formData.scheduled_at ? "scheduled" : "draft",
      scheduled_at: formData.scheduled_at || null,
    };

    if (editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      subject: campaign.subject,
      body_html: campaign.body_html || "",
      event_id: campaign.event_id || "",
      recipients: (campaign.recipients || []).map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)).join("\n"),
      scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : "",
    });
    setShowCreate(true);
  };

  const applyTemplate = (template: (typeof EMAIL_TEMPLATES)[number]) => {
    setFormData((prev) => ({ ...prev, subject: template.subject, body_html: template.body }));
    setShowBodyPreview(false);
    toast({ title: "Template applied", description: `${template.name} template loaded — preview it with the Preview button below.` });
  };

  const importGuestsFromEvent = async (eventId: string) => {
    if (!eventId || eventId === "none") return;
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`/api/events/${eventId}/guests`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error("Failed to fetch guests");
      const guests: any[] = await resp.json();
      const confirmed = guests.filter((g) => g.rsvpStatus === "confirmed" || g.email);
      if (!confirmed.length) {
        toast({ title: "No guests found", description: "No guests with email addresses found for this event.", variant: "destructive" });
        return;
      }
      const lines = confirmed
        .filter((g) => g.email)
        .map((g) => (g.name ? `${g.name} <${g.email}>` : g.email));
      setFormData((prev) => ({ ...prev, recipients: lines.join("\n") }));
      toast({ title: `${lines.length} guests imported`, description: "Recipient list updated from event guest list." });
    } catch {
      toast({ title: "Import failed", description: "Could not load guest list.", variant: "destructive" });
    }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: "bg-gray-500/20 text-gray-300 border-gray-500/30",
      scheduled: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      sent: "bg-green-500/20 text-green-300 border-green-500/30",
    };
    return <Badge className={`${variants[status] || variants.draft} border`}>{status}</Badge>;
  };

  const statusIcon = (status: string) => {
    if (status === "sent") return <CheckCircle className="h-4 w-4 text-green-400" />;
    if (status === "scheduled") return <Clock className="h-4 w-4 text-blue-400" />;
    return <FileText className="h-4 w-4 text-gray-400" />;
  };

  const draftCampaigns = campaigns.filter((c) => c.status === "draft");
  const scheduledCampaigns = campaigns.filter((c) => c.status === "scheduled");
  const sentCampaigns = campaigns.filter((c) => c.status === "sent");

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#16213e] via-[#1a1a2e] to-[#0f0f1a]">
      <PlannerSidebar />
      <main className="flex-1 lg:ml-60 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Mail className="h-8 w-8 text-pink-400" />
                Email Campaigns
              </h1>
              <p className="text-gray-400 mt-1">Create, manage and send email campaigns to your guests and clients</p>
            </div>
            <div className="flex items-center gap-3">
              {campaigns.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => {
                    openPrintWindow({
                      title: "Email Campaigns",
                      stats: [
                        { label: "Total Campaigns", value: campaigns.length },
                        { label: "Drafts", value: draftCampaigns.length },
                        { label: "Scheduled", value: scheduledCampaigns.length },
                        { label: "Sent", value: sentCampaigns.length },
                      ],
                      columns: [
                        { header: "Subject", key: "subject" },
                        { header: "Recipients", key: "recipients", align: "center" },
                        { header: "Status", key: "status" },
                        { header: "Sent Count", key: "sentCount", align: "center" },
                        { header: "Created", key: "created" },
                      ],
                      rows: campaigns.map((c) => ({
                        subject: c.subject,
                        recipients: (c.recipients || []).length,
                        status: c.status,
                        sentCount: c.sent_count || 0,
                        created: new Date(c.created_at).toLocaleDateString(),
                      })),
                      orientation: "landscape",
                    });
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              )}
              <Button
                onClick={() => {
                  resetForm();
                  setEditingCampaign(null);
                  setShowCreate(true);
                }}
                className="bg-gradient-to-r from-[#8B1538] to-[#330311] hover:from-[#a01d45] hover:to-[#4a0519] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="bg-white/5 border-white/10 backdrop-blur-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-gray-500/20 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{draftCampaigns.length}</p>
                  <p className="text-sm text-gray-400">Drafts</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 backdrop-blur-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{scheduledCampaigns.length}</p>
                  <p className="text-sm text-gray-400">Scheduled</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 backdrop-blur-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{sentCampaigns.length}</p>
                  <p className="text-sm text-gray-400">Sent</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {showCreate && (
            <Card className="bg-white/5 border-white/10 backdrop-blur-md mb-8">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Mail className="h-5 w-5 text-pink-400" />
                  {editingCampaign ? "Edit Campaign" : "Create Campaign"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-gray-300 mb-2 block">Use Template</Label>
                  <div className="flex flex-wrap gap-2">
                    {EMAIL_TEMPLATES.map((t) => (
                      <Button
                        key={t.name}
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate(t)}
                        className="border-[#8B1538] text-[#8B1538] hover:bg-[#8B1538]/10"
                      >
                        {t.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Subject *</Label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                      placeholder="Email subject line"
                      className="bg-white/5 border-white/20 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Event (optional)</Label>
                    <Select value={formData.event_id} onValueChange={(v) => setFormData((p) => ({ ...p, event_id: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white mt-1">
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No event</SelectItem>
                        {events.map((e: any) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name || e.eventName || `Event #${e.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Email Body with HTML Editor + Preview Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-gray-300">Email Body</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {showBodyPreview ? "Showing rendered email preview" : "Editing HTML source"}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 h-7 text-xs"
                        onClick={() => setShowBodyPreview((v) => !v)}
                      >
                        {showBodyPreview ? <><Code2 className="h-3 w-3 mr-1" />Edit HTML</> : <><Eye className="h-3 w-3 mr-1" />Preview Email</>}
                      </Button>
                    </div>
                  </div>

                  {showBodyPreview ? (
                    <div className="rounded-lg border border-white/10 overflow-hidden">
                      <div className="bg-white/10 border-b border-white/10 px-3 py-1.5 text-xs text-gray-400 flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        Email Preview — <span className="text-white">{formData.subject || "No subject"}</span>
                      </div>
                      <div className="bg-white rounded-b-lg">
                        {formData.body_html ? (
                          <div
                            className="p-4"
                            dangerouslySetInnerHTML={{ __html: formData.body_html }}
                          />
                        ) : (
                          <div className="p-8 text-center text-gray-400">
                            <Mail className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p>No email body yet — apply a template or write HTML above.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Textarea
                        value={formData.body_html}
                        onChange={(e) => setFormData((p) => ({ ...p, body_html: e.target.value }))}
                        placeholder="Paste or write HTML here. Click a template above to get started quickly."
                        rows={12}
                        className="bg-white/5 border-white/20 text-white mt-1 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This is HTML code — what you see here becomes a formatted email. Use a template above to start, then click <strong className="text-gray-400">Preview Email</strong> to see how it will look to recipients.
                      </p>
                    </div>
                  )}
                </div>

                {/* Recipients */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-gray-300">
                      Recipients
                      {formData.recipients && (
                        <span className="ml-2 text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                          {parseRecipients(formData.recipients).length} recipients
                        </span>
                      )}
                    </Label>
                    {formData.event_id && formData.event_id !== "none" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10 h-7 text-xs"
                        onClick={() => importGuestsFromEvent(formData.event_id)}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Import Guest Emails
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={formData.recipients}
                    onChange={(e) => setFormData((p) => ({ ...p, recipients: e.target.value }))}
                    placeholder={"john@example.com\nJane Doe <jane@example.com>\n\nOr select an event above and click 'Import Guest Emails'"}
                    rows={4}
                    className="bg-white/5 border-white/20 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">One email per line, or comma-separated. Format: email@example.com or Name &lt;email@example.com&gt;</p>
                </div>

                {/* Schedule */}
                <div>
                  <Label className="text-gray-300">Schedule Send (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData((p) => ({ ...p, scheduled_at: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white mt-1 max-w-xs"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to save as draft. You can send manually from the campaign list.</p>
                </div>

                {/* How sending works */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3">
                  <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-300">
                    <strong className="text-blue-200">How to send:</strong> Save the campaign as a draft, then click the <strong>Send</strong> button on the campaign card to deliver it to all recipients. You need at least one recipient email to send.
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={!formData.subject || createMutation.isPending || updateMutation.isPending}
                    className="bg-gradient-to-r from-[#8B1538] to-[#330311] hover:from-[#a01d45] hover:to-[#4a0519] text-white"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingCampaign ? "Update Campaign" : "Save as Draft"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreate(false);
                      setEditingCampaign(null);
                      resetForm();
                    }}
                    className="border-white/20 text-gray-300 hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="all" className="data-[state=active]:bg-white/10 text-gray-300">
                All ({campaigns.length})
              </TabsTrigger>
              <TabsTrigger value="draft" className="data-[state=active]:bg-white/10 text-gray-300">
                Drafts ({draftCampaigns.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="data-[state=active]:bg-white/10 text-gray-300">
                Scheduled ({scheduledCampaigns.length})
              </TabsTrigger>
              <TabsTrigger value="sent" className="data-[state=active]:bg-white/10 text-gray-300">
                Sent ({sentCampaigns.length})
              </TabsTrigger>
            </TabsList>

            {["all", "draft", "scheduled", "sent"].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-3">
                {isLoading ? (
                  <div className="text-center text-gray-400 py-12">Loading campaigns...</div>
                ) : (
                  (() => {
                    const list = tab === "all" ? campaigns : campaigns.filter((c) => c.status === tab);
                    if (list.length === 0)
                      return (
                        <div className="text-center text-gray-400 py-12">
                          <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p>No {tab === "all" ? "" : tab} campaigns yet</p>
                        </div>
                      );
                    return list.map((campaign) => (
                      <Card key={campaign.id} className="bg-white/5 border-white/10 backdrop-blur-md hover:bg-white/[0.07] transition-colors">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {statusIcon(campaign.status)}
                                <h3 className="text-white font-semibold truncate">{campaign.subject}</h3>
                                {statusBadge(campaign.status)}
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-2">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  {(campaign.recipients || []).length} recipients
                                </span>
                                {campaign.sent_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Send className="h-3.5 w-3.5" />
                                    {campaign.sent_count} sent
                                  </span>
                                )}
                                {campaign.scheduled_at && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Scheduled: {new Date(campaign.scheduled_at).toLocaleString()}
                                  </span>
                                )}
                                {campaign.sent_at && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Sent: {new Date(campaign.sent_at).toLocaleString()}
                                  </span>
                                )}
                                <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPreviewCampaign(campaign)}
                                    className="border-white/20 text-gray-300 hover:bg-white/10"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white text-black">
                                  <DialogHeader>
                                    <DialogTitle>Preview: {campaign.subject}</DialogTitle>
                                  </DialogHeader>
                                  <div
                                    className="mt-4 border rounded-lg p-4"
                                    dangerouslySetInnerHTML={{ __html: campaign.body_html || "<p>No content</p>" }}
                                  />
                                </DialogContent>
                              </Dialog>
                              {campaign.status === "draft" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(campaign)}
                                    className="border-white/20 text-gray-300 hover:bg-white/10"
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => sendMutation.mutate(campaign.id)}
                                    disabled={sendMutation.isPending || (campaign.recipients || []).length === 0}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Send className="h-4 w-4 mr-1" />
                                    Send
                                  </Button>
                                </>
                              )}
                              {campaign.status === "scheduled" && (
                                <Button
                                  size="sm"
                                  onClick={() => sendMutation.mutate(campaign.id)}
                                  disabled={sendMutation.isPending}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  Send Now
                                </Button>
                              )}
                              {campaign.status !== "sent" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Delete this campaign?")) deleteMutation.mutate(campaign.id);
                                  }}
                                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ));
                  })()
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
