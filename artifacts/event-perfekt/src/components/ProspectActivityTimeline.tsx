import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Mail, Phone, Calendar, MessageCircle, FileText, ArrowRight,
  Loader2, Plus, X, Clock, User
} from "lucide-react";
import { useState } from "react";

const ACTIVITY_ICONS: Record<string, any> = {
  email_sent: Mail,
  email_opened: Mail,
  email_replied: Mail,
  whatsapp_sent: MessageCircle,
  whatsapp_replied: MessageCircle,
  call_logged: Phone,
  meeting_logged: Calendar,
  note_added: FileText,
  stage_changed: ArrowRight,
  proposal_sent: FileText,
  contract_sent: FileText,
  won: Badge,
  lost: X,
};

const ACTIVITY_LABELS: Record<string, string> = {
  email_sent: "Email sent",
  email_opened: "Email opened",
  email_replied: "Email replied",
  whatsapp_sent: "WhatsApp sent",
  whatsapp_replied: "WhatsApp replied",
  call_logged: "Call logged",
  meeting_logged: "Meeting logged",
  note_added: "Note added",
  stage_changed: "Stage changed",
  proposal_sent: "Proposal sent",
  contract_sent: "Contract sent",
  won: "Won",
  lost: "Lost",
};

interface ProspectActivityTimelineProps {
  prospectId: number;
}

export default function ProspectActivityTimeline({ prospectId }: ProspectActivityTimelineProps) {
  const { toast } = useToast();
  const [showLogForm, setShowLogForm] = useState(false);
  const [logType, setLogType] = useState("note_added");
  const [logContent, setLogContent] = useState("");
  const [logMetadata, setLogMetadata] = useState<Record<string, any>>({});

  const { data: activities, isLoading } = useQuery<any[]>({
    queryKey: [`/api/company-prospects/${prospectId}/activities`],
    enabled: prospectId > 0,
  });

  const createActivityMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/company-prospects/${prospectId}/activities`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/company-prospects/${prospectId}/activities`] });
      setLogType("note_added");
      setLogContent("");
      setLogMetadata({});
      setShowLogForm(false);
      toast({ title: "Activity logged", description: "Activity has been added to timeline" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleLogActivity = () => {
    if (!logContent.trim()) {
      toast({ title: "Error", description: "Content cannot be empty", variant: "destructive" });
      return;
    }

    const data: any = {
      type: logType,
      content: logContent,
      metadata: logMetadata,
    };

    if (logType.includes("email")) {
      data.subject = logMetadata.subject || "No subject";
    }

    createActivityMutation.mutate(data);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    
    return d.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const activityList = activities || [];
  const lastActivity = activityList[0];
  const daysSinceContact = lastActivity 
    ? Math.floor((Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const showWarning = daysSinceContact > 14;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">Activity Timeline</p>
          <p className="text-xs text-gray-500">
            {activityList.length} interaction{activityList.length !== 1 ? "s" : ""} •{" "}
            {lastActivity ? (
              <span className={showWarning ? "text-red-600 font-medium" : ""}>
                Last contact {formatDate(lastActivity.created_at)}
              </span>
            ) : (
              "No activity yet"
            )}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowLogForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Log Activity
        </Button>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {activityList.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">No activities logged yet</p>
        ) : (
          activityList.map((activity: any) => {
            const Icon = ACTIVITY_ICONS[activity.type] || Clock;
            const label = ACTIVITY_LABELS[activity.type] || activity.type;
            
            return (
              <Card key={activity.id} className="border-l-4 border-l-amber-400">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <Icon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm text-gray-900">{label}</p>
                        <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(activity.created_at)}</span>
                      </div>
                      {activity.subject && (
                        <p className="text-xs text-gray-600 mb-1">
                          <strong>Subject:</strong> {activity.subject}
                        </p>
                      )}
                      <p className="text-xs text-gray-700 line-clamp-2">{activity.content}</p>
                      {activity.sent_by_name && (
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">Logged by {activity.sent_by_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Activity Type</label>
              <Select value={logType} onValueChange={setLogType}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_sent">Email Sent</SelectItem>
                  <SelectItem value="email_replied">Email Replied</SelectItem>
                  <SelectItem value="whatsapp_sent">WhatsApp Sent</SelectItem>
                  <SelectItem value="whatsapp_replied">WhatsApp Replied</SelectItem>
                  <SelectItem value="call_logged">Call Logged</SelectItem>
                  <SelectItem value="meeting_logged">Meeting Logged</SelectItem>
                  <SelectItem value="note_added">Note Added</SelectItem>
                  <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                  <SelectItem value="contract_sent">Contract Sent</SelectItem>
                  <SelectItem value="stage_changed">Stage Changed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {logType.includes("email") && (
              <div>
                <label className="text-sm font-medium">Subject (for emails)</label>
                <Input
                  placeholder="Email subject"
                  value={logMetadata.subject || ""}
                  onChange={(e) =>
                    setLogMetadata({ ...logMetadata, subject: e.target.value })
                  }
                  className="mt-2"
                />
              </div>
            )}

            {logType === "call_logged" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Duration (minutes)</label>
                  <Input
                    type="number"
                    placeholder="5"
                    value={logMetadata.duration || ""}
                    onChange={(e) =>
                      setLogMetadata({ ...logMetadata, duration: parseInt(e.target.value) })
                    }
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Outcome</label>
                  <Select value={logMetadata.outcome || ""} onValueChange={(v) =>
                    setLogMetadata({ ...logMetadata, outcome: v })
                  }>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                      <SelectItem value="no_answer">No Answer</SelectItem>
                      <SelectItem value="voicemail">Left Voicemail</SelectItem>
                      <SelectItem value="follow_up">Follow-up Agreed</SelectItem>
                      <SelectItem value="meeting_booked">Meeting Booked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Notes / Message</label>
              <Textarea
                placeholder="Enter the activity details..."
                value={logContent}
                onChange={(e) => setLogContent(e.target.value)}
                className="mt-2 h-24"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowLogForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleLogActivity} disabled={createActivityMutation.isPending}>
                {createActivityMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Activity"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
