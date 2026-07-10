import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Mail, Building2, Users, Send, Eye, Edit2, ThumbsUp, ThumbsDown } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function GrowthCampaigns() {
  const [activeTab, setActiveTab] = useState("overview"); // overview, pending, sent
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedBody, setEditedBody] = useState("");

  // Fetch campaign stats
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["/api/growth-campaigns/stats"],
    queryFn: async () => {
      const res = await fetch("/api/growth-campaigns/stats");
      return res.json();
    },
  });

  // Fetch pending drafts
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ["/api/growth-campaigns/pending"],
    queryFn: async () => {
      const res = await fetch("/api/growth-campaigns/pending");
      return res.json();
    },
  });

  // Generate guest invitations
  const generateGuestInvitations = useMutation({
    mutationFn: async (limit: number = 30) => {
      const res = await fetch("/api/growth-campaigns/generate-guest-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });
      return res.json();
    },
    onSuccess: () => {
      refetchPending();
      refetchStats();
    },
  });

  // Generate partner proposals
  const generatePartnerProposals = useMutation({
    mutationFn: async (limit: number = 30) => {
      const res = await fetch("/api/growth-campaigns/generate-partner-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });
      return res.json();
    },
    onSuccess: () => {
      refetchPending();
      refetchStats();
    },
  });

  // Send approved emails
  const sendApprovedEmails = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/growth-campaigns/send-approved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      return res.json();
    },
    onSuccess: () => {
      refetchPending();
      refetchStats();
    },
  });

  if (statsLoading || pendingLoading) {
    return <div className="p-8 text-center">Loading campaign dashboard...</div>;
  }

  const stats = statsData || { by_type: {}, totals: { pending: 0, approved: 0, sent: 0 } };
  const pending = pendingData || { count: 0, drafts: [], by_type: {} };

  const getTypeIcon = (type: string) => {
    if (type.includes("guest")) return <Users className="w-4 h-4" />;
    return <Building2 className="w-4 h-4" />;
  };

  const getTypeBadgeColor = (type: string) => {
    if (type.includes("guest")) return "bg-blue-100 text-blue-800";
    if (type.includes("sponsor")) return "bg-purple-100 text-purple-800";
    if (type.includes("brand")) return "bg-pink-100 text-pink-800";
    if (type.includes("media")) return "bg-orange-100 text-orange-800";
    if (type.includes("employer")) return "bg-green-100 text-green-800";
    if (type.includes("civic")) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Growth Hub Campaign Manager</h1>
          <p className="text-lg text-gray-600">Generate and manage personalized guest invitations and partner proposals</p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                📧 Guest Invitations
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">Generate personalized invitations for 100 women</p>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                onClick={() => generateGuestInvitations.mutate(30)}
                disabled={generateGuestInvitations.isPending}
                className="w-full"
              >
                {generateGuestInvitations.isPending ? "Generating..." : "Generate 30 Guest Invitations"}
              </Button>
              {generateGuestInvitations.data && (
                <p className="text-sm text-green-600 mt-2 font-semibold">✓ {generateGuestInvitations.data.drafted} drafts created</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-purple-600" />
                🤝 Partner Outreach
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">Generate proposals for 30 organizations</p>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                onClick={() => generatePartnerProposals.mutate(30)}
                disabled={generatePartnerProposals.isPending}
                className="w-full"
              >
                {generatePartnerProposals.isPending ? "Generating..." : "Generate 30 Partner Proposals"}
              </Button>
              {generatePartnerProposals.data && (
                <p className="text-sm text-green-600 mt-2 font-semibold">✓ {generatePartnerProposals.data.drafted} drafts created</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Campaign Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{stats.totals?.pending || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Awaiting Approval</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">{stats.totals?.approved || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Approved</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{stats.totals?.sent || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Sent</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{stats.totals?.total || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          {["overview", "pending", "approved"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-semibold ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(stats.by_type || {}).map(([type, data]: [string, any]) => (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getTypeIcon(type)}
                    {type.replace(/_/g, " ").toUpperCase()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold">{data.pending || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-yellow-600">{data.approved || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Sent</p>
                      <p className="text-2xl font-bold text-green-600">{data.sent || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-2xl font-bold">{data.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pending Tab */}
        {activeTab === "pending" && (
          <Card>
            <CardHeader>
              <CardTitle>
                Awaiting Approval ({pending.count})
                {stats.totals?.approved > 0 && (
                  <Button
                    size="sm"
                    onClick={() => sendApprovedEmails.mutate()}
                    disabled={sendApprovedEmails.isPending}
                    className="ml-4 float-right"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send All Approved
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pending.drafts?.map((draft: any) => (
                  <div
                    key={draft.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => {
                      setSelectedDraft(draft);
                      setEditedBody(draft.body);
                      setEditMode(false);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getTypeIcon(draft.trigger_type)}
                          <Badge className={getTypeBadgeColor(draft.trigger_type)}>
                            {draft.trigger_type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="font-semibold text-gray-900">{draft.subject}</p>
                        <p className="text-sm text-gray-600">To: {draft.to_email}</p>
                        <p className="text-xs text-gray-500 mt-1">From: {draft.company_name} ({draft.contact_name})</p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {new Date(draft.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Draft Detail Dialog */}
        <Dialog open={!!selectedDraft} onOpenChange={() => setSelectedDraft(null)}>
          <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedDraft?.subject}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">To:</p>
                  <p className="font-semibold">{selectedDraft?.to_email}</p>
                </div>
                <div>
                  <p className="text-gray-600">From:</p>
                  <p className="font-semibold">{selectedDraft?.company_name}</p>
                </div>
              </div>

              {/* Email Body */}
              {!editMode ? (
                <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm">
                  {selectedDraft?.body}
                </div>
              ) : (
                <Textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="min-h-64"
                  placeholder="Edit email body..."
                />
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditMode(!editMode)}
                  className="flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  {editMode ? "Cancel" : "Edit"}
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    // Approve draft
                    fetch(`/api/pending-emails/${selectedDraft.id}/approve`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                    }).then(() => {
                      refetchPending();
                      refetchStats();
                      setSelectedDraft(null);
                    });
                  }}
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Approve
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    // Reject draft
                    fetch(`/api/pending-emails/${selectedDraft.id}/reject`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                    }).then(() => {
                      refetchPending();
                      refetchStats();
                      setSelectedDraft(null);
                    });
                  }}
                  className="flex items-center gap-2"
                >
                  <ThumbsDown className="w-4 h-4" />
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Next Steps */}
        <Card className="mt-12 border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <p>✅ Click "Generate 30 Guest Invitations" to create personalized invitations</p>
            <p>✅ Click "Generate 30 Partner Proposals" to create personalized partnership proposals</p>
            <p>✅ Review each draft in the "Pending" tab</p>
            <p>✅ Click to view, edit if needed, then approve or reject</p>
            <p>✅ When ready, click "Send All Approved" to dispatch the approved emails</p>
            <p className="font-semibold text-blue-900">All emails require manual approval before sending.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
