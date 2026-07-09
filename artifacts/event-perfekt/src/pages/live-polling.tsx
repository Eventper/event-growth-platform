import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  BarChart3,
  Plus,
  Trash2,
  Share2,
  QrCode,
  Copy,
  CheckCircle,
  XCircle,
  MessageSquare,
  Vote,
  Eye,
  Clock,
  Printer,
} from "lucide-react";

interface Poll {
  id: string;
  event_id: string | null;
  question: string;
  options: string[];
  votes: Record<string, number>;
  status: string;
  created_at: string;
}

interface PollQuestion {
  id: string;
  poll_id: string;
  event_id: string | null;
  question_text: string;
  submitted_by: string | null;
  is_answered: boolean;
  created_at: string;
}

export default function LivePolling() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState<string[]>(["", ""]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<string>("");

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const { data: polls = [], isLoading: pollsLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls", selectedEventId ? `?event_id=${selectedEventId}` : ""],
  });

  const { data: questions = [] } = useQuery<PollQuestion[]>({
    queryKey: ["/api/polls/questions", selectedEventId ? `?event_id=${selectedEventId}` : ""],
    enabled: true,
  });

  const createPollMutation = useMutation({
    mutationFn: async (data: { event_id: string; question: string; options: string[] }) => {
      return apiRequest("POST", "/api/polls", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      setCreateDialogOpen(false);
      setNewQuestion("");
      setNewOptions(["", ""]);
      toast({ title: "Poll created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create poll", variant: "destructive" });
    },
  });

  const closePollMutation = useMutation({
    mutationFn: async (pollId: string) => {
      return apiRequest("PATCH", `/api/polls/${pollId}`, { status: "closed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      toast({ title: "Poll closed" });
    },
  });

  const deletePollMutation = useMutation({
    mutationFn: async (pollId: string) => {
      return apiRequest("DELETE", `/api/polls/${pollId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      toast({ title: "Poll deleted" });
    },
  });

  const answerQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      return apiRequest("PATCH", `/api/polls/questions/${questionId}`, { is_answered: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls/questions"] });
      toast({ title: "Question marked as answered" });
    },
  });

  const handleCreatePoll = () => {
    const filteredOptions = newOptions.filter((o) => o.trim() !== "");
    if (!newQuestion.trim() || filteredOptions.length < 2) {
      toast({ title: "Please enter a question and at least 2 options", variant: "destructive" });
      return;
    }
    createPollMutation.mutate({
      event_id: selectedEventId || "",
      question: newQuestion,
      options: filteredOptions,
    });
  };

  const addOption = () => setNewOptions([...newOptions, ""]);
  const removeOption = (idx: number) => {
    if (newOptions.length > 2) setNewOptions(newOptions.filter((_, i) => i !== idx));
  };
  const updateOption = (idx: number, val: string) => {
    const updated = [...newOptions];
    updated[idx] = val;
    setNewOptions(updated);
  };

  const getVoteUrl = (pollId: string) => `https://eventperfekt.net/vote/${pollId}`;

  const copyLink = (pollId: string) => {
    navigator.clipboard.writeText(getVoteUrl(pollId));
    toast({ title: "Link copied to clipboard" });
  };

  const getTotalVotes = (votes: Record<string, number>) =>
    Object.values(votes || {}).reduce((s, v) => s + v, 0);

  const getVotePercent = (votes: Record<string, number>, option: string) => {
    const total = getTotalVotes(votes);
    if (total === 0) return 0;
    return Math.round(((votes[option] || 0) / total) * 100);
  };

  const handlePrintResults = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const pollCards = (polls || []).map((poll: Poll) => {
      const total = getTotalVotes(poll.votes || {});
      const bars = (poll.options || []).map(opt => {
        const count = (poll.votes || {})[opt] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `<div style="margin:6px 0;">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px;">
            <span>${opt}</span><span style="color:#666;">${count} votes (${pct}%)</span>
          </div>
          <div style="width:100%;height:20px;background:#f0f0f0;border-radius:4px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:#8B1538;border-radius:4px;"></div>
          </div>
        </div>`;
      }).join("");
      return `<div style="border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:16px;page-break-inside:avoid;">
        <h3 style="margin:0 0 4px;color:#330311;">${poll.question}</h3>
        <p style="font-size:12px;color:#666;margin:0 0 12px;">Total Votes: ${total} | Status: ${poll.status}</p>
        ${bars}
      </div>`;
    }).join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Poll Results</title>
      <style>
        body { font-family: 'Poppins', sans-serif;, Arial, sans-serif; padding: 30px; color: #333; }
        h1 { color: #330311; margin-bottom: 5px; }
        .subtitle { color: #666; margin-bottom: 20px; }
        .footer { margin-top: 25px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
        @media print { body { padding: 15px; } }
      </style></head><body>
      <h1>Poll Results</h1>
      <p class="subtitle">Printed: ${new Date().toLocaleString()}</p>
      ${pollCards}
      <div class="footer">Event Perfekt — ...making yours perfekt</div>
    </body></html>`);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  return (
    <div className="min-h-screen bg-[#16213e]">
      <PlannerSidebar />
      <main className="lg:ml-60 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white font-['Poppins']">Live Polling & Q&A</h1>
              <p className="text-gray-400 mt-1">Create polls and manage audience questions for your events</p>
            </div>
            <div className="flex items-center gap-3">
              {(polls || []).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintResults}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Results
                </Button>
              )}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#8B1538] hover:bg-[#6d1029] text-white">
                  <Plus className="w-4 h-4 mr-2" /> Create Poll
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a2744] border-[#2a3a5c] text-white max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Poll</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-gray-300">Event (optional)</Label>
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                      <SelectTrigger className="bg-[#16213e] border-[#2a3a5c] text-white">
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2744] border-[#2a3a5c]">
                        <SelectItem value="none" className="text-gray-300">No event</SelectItem>
                        {(events || []).map((e: any) => (
                          <SelectItem key={e.id} value={e.id} className="text-gray-300">
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Question</Label>
                    <Textarea
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="What would you like to ask?"
                      className="bg-[#16213e] border-[#2a3a5c] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Options</Label>
                    <div className="space-y-2 mt-1">
                      {newOptions.map((opt, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(idx, e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                            className="bg-[#16213e] border-[#2a3a5c] text-white"
                          />
                          {newOptions.length > 2 && (
                            <Button variant="ghost" size="icon" onClick={() => removeOption(idx)} className="text-red-400 hover:text-red-300">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addOption} className="border-[#2a3a5c] text-gray-300 hover:bg-[#2a3a5c]">
                        <Plus className="w-3 h-3 mr-1" /> Add Option
                      </Button>
                    </div>
                  </div>
                  <Button onClick={handleCreatePoll} disabled={createPollMutation.isPending} className="w-full bg-[#8B1538] hover:bg-[#6d1029] text-white">
                    {createPollMutation.isPending ? "Creating..." : "Create Poll"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <div className="mb-6">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-64 bg-[#1a2744] border-[#2a3a5c] text-white">
                <SelectValue placeholder="Filter by event" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2744] border-[#2a3a5c]">
                <SelectItem value="all" className="text-gray-300">All Events</SelectItem>
                {(events || []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id} className="text-gray-300">
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="polls" className="space-y-6">
            <TabsList className="bg-[#1a2744] border border-[#2a3a5c]">
              <TabsTrigger value="polls" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-gray-400">
                <Vote className="w-4 h-4 mr-2" /> Polls
              </TabsTrigger>
              <TabsTrigger value="qa" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-gray-400">
                <MessageSquare className="w-4 h-4 mr-2" /> Q&A
              </TabsTrigger>
            </TabsList>

            <TabsContent value="polls">
              {pollsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B1538]"></div>
                </div>
              ) : (polls || []).length === 0 ? (
                <Card className="bg-[#1a2744]/80 border-[#2a3a5c]">
                  <CardContent className="flex flex-col items-center py-16">
                    <BarChart3 className="w-16 h-16 text-gray-500 mb-4" />
                    <p className="text-gray-400 text-lg">No polls yet</p>
                    <p className="text-gray-500 text-sm mt-1">Create your first poll to engage your audience</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {(polls || []).map((poll) => (
                    <Card key={poll.id} className="bg-[#1a2744]/80 border-[#2a3a5c] backdrop-blur-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-white text-lg leading-tight">{poll.question}</CardTitle>
                          <Badge variant={poll.status === "active" ? "default" : "secondary"} className={poll.status === "active" ? "bg-green-600/20 text-green-400 border-green-600/30" : "bg-gray-600/20 text-gray-400 border-gray-600/30"}>
                            {poll.status === "active" ? "Active" : "Closed"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(poll.created_at).toLocaleDateString()}
                          <span className="ml-2">{getTotalVotes(poll.votes)} votes</span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          {(poll.options || []).map((option: string, idx: number) => {
                            const pct = getVotePercent(poll.votes, option);
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-300">{option}</span>
                                  <span className="text-gray-400">{poll.votes?.[option] || 0} ({pct}%)</span>
                                </div>
                                <div className="w-full bg-[#16213e] rounded-full h-2.5">
                                  <div
                                    className="bg-[#8B1538] h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-[#2a3a5c]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyLink(poll.id)}
                            className="text-gray-400 hover:text-white hover:bg-[#2a3a5c]"
                          >
                            <Copy className="w-3 h-3 mr-1" /> Copy Link
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedPollId(poll.id); setQrDialogOpen(true); }}
                            className="text-gray-400 hover:text-white hover:bg-[#2a3a5c]"
                          >
                            <QrCode className="w-3 h-3 mr-1" /> QR
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/vote/${poll.id}`, "_blank")}
                            className="text-gray-400 hover:text-white hover:bg-[#2a3a5c]"
                          >
                            <Eye className="w-3 h-3 mr-1" /> Preview
                          </Button>
                          {poll.status === "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => closePollMutation.mutate(poll.id)}
                              className="text-yellow-400 hover:text-yellow-300 hover:bg-[#2a3a5c] ml-auto"
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Close
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePollMutation.mutate(poll.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-[#2a3a5c]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="qa">
              {(questions || []).length === 0 ? (
                <Card className="bg-[#1a2744]/80 border-[#2a3a5c]">
                  <CardContent className="flex flex-col items-center py-16">
                    <MessageSquare className="w-16 h-16 text-gray-500 mb-4" />
                    <p className="text-gray-400 text-lg">No questions submitted yet</p>
                    <p className="text-gray-500 text-sm mt-1">Questions from attendees will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {(questions || []).map((q) => (
                    <Card key={q.id} className="bg-[#1a2744]/80 border-[#2a3a5c]">
                      <CardContent className="flex items-start justify-between py-4">
                        <div className="flex-1">
                          <p className="text-white">{q.question_text}</p>
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                            {q.submitted_by && <span>From: {q.submitted_by}</span>}
                            <span>{new Date(q.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {q.is_answered ? (
                            <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Answered</Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => answerQuestionMutation.mutate(q.id)}
                              className="bg-[#8B1538] hover:bg-[#6d1029] text-white"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Mark Answered
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="bg-[#1a2744] border-[#2a3a5c] text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-white">Share Poll</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getVoteUrl(selectedPollId))}`}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
              <div className="w-full">
                <Label className="text-gray-400 text-sm">Voting Link</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={getVoteUrl(selectedPollId)} readOnly className="bg-[#16213e] border-[#2a3a5c] text-white text-sm" />
                  <Button size="sm" onClick={() => copyLink(selectedPollId)} className="bg-[#8B1538] hover:bg-[#6d1029]">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
