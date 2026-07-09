import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail, MessageCircle, Loader2, Plus, Edit2, CheckCircle, Clock,
  AlertCircle, Zap
} from "lucide-react";
import { useState } from "react";

const TOUCH_DAYS = [0, 4, 9, 14];

interface SequenceManagerProps {
  prospectId: number;
  prospectName?: string;
}

export default function SequenceManager({ prospectId, prospectName }: SequenceManagerProps) {
  const { toast } = useToast();
  const [showReview, setShowReview] = useState(false);
  const [editingTouchId, setEditingTouchId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [draftSequence, setDraftSequence] = useState<any>(null);

  const { data: sequences, isLoading } = useQuery<any[]>({
    queryKey: [`/api/company-prospects/${prospectId}/sequences`],
    enabled: prospectId > 0,
  });

  const generateSequenceMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/company-prospects/${prospectId}/generate-sequence`, {}),
    onSuccess: (data) => {
      setDraftSequence(data);
      setShowReview(true);
      toast({ title: "Sequence generated", description: "Review the 4-touch sequence below" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => 
      apiRequest("PATCH", `/api/company-prospects/sequences/${draftSequence.id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/company-prospects/${prospectId}/sequences`] });
      setDraftSequence(null);
      setShowReview(false);
      toast({ 
        title: "Sequence approved", 
        description: "Messages will be sent on schedule" 
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const sequenceList = sequences || [];
  const activeSequence = sequenceList.find((s: any) => ["approved", "active"].includes(s.status));
  const completedSequence = sequenceList.find((s: any) => s.status === "completed");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">Outreach Sequences</p>
          <p className="text-xs text-gray-500">Automated 4-touch email & WhatsApp follow-up</p>
        </div>
        <Button 
          size="sm" 
          onClick={() => generateSequenceMutation.mutate()}
          disabled={generateSequenceMutation.isPending || !!activeSequence}
          className="gap-2"
        >
          <Zap className="w-4 h-4" />
          Generate Sequence
        </Button>
      </div>

      {/* Active Sequence Status */}
      {activeSequence && (
        <Card className="border-l-4 border-l-green-500 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="font-medium text-green-900">Sequence Active</p>
                </div>
                <p className="text-sm text-green-800">
                  {activeSequence.messages?.length || 0} touches scheduled
                </p>
              </div>
              <div className="space-y-2">
                {activeSequence.messages?.map((msg: any) => (
                  <div key={msg.id} className="text-right">
                    <p className="text-xs font-medium">
                      {msg.channel === "email" ? <Mail className="w-3 h-3" /> : <MessageCircle className="w-3 h-3" />}
                    </p>
                    <p className="text-xs text-gray-600">
                      Day {msg.scheduled_day} • {msg.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Sequence */}
      {completedSequence && (
        <Card className="border-l-4 border-l-gray-300 bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Previous Sequence Completed</p>
                <p className="text-sm text-gray-600">No response received</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Sequence */}
      {sequenceList.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No sequences yet</p>
            <p className="text-xs text-gray-500 mt-1">Generate one to start automated outreach</p>
          </CardContent>
        </Card>
      )}

      {/* Sequence Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review 4-Touch Sequence for {prospectName}</DialogTitle>
          </DialogHeader>

          {draftSequence && (
            <div className="space-y-4">
              {draftSequence.messages?.map((msg: any, idx: number) => (
                <Card key={msg.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {msg.channel === "email" ? (
                          <Mail className="w-5 h-5 text-blue-600" />
                        ) : (
                          <MessageCircle className="w-5 h-5 text-green-600" />
                        )}
                        <div>
                          <p className="font-medium">
                            Touch {msg.touch_number} — {msg.channel === "email" ? "Email" : "WhatsApp"}
                          </p>
                          <p className="text-xs text-gray-500">Send on Day {msg.scheduled_day}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingTouchId(msg.id);
                          setEditingBody(msg.body);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {msg.subject && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Subject</p>
                        <p className="text-sm text-gray-900">{msg.subject}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-600">Message</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {editingTouchId && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-sm">Edit Message</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={editingBody}
                      onChange={(e) => setEditingBody(e.target.value)}
                      className="h-32"
                      placeholder="Edit message here..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingTouchId(null);
                          setEditingBody("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const updated = draftSequence.messages.map((m: any) =>
                            m.id === editingTouchId ? { ...m, body: editingBody } : m
                          );
                          setDraftSequence({ ...draftSequence, messages: updated });
                          setEditingTouchId(null);
                          setEditingBody("");
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraftSequence(null);
                    setShowReview(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="gap-2"
                >
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Approve & Activate
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
