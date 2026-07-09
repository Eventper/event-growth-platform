import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PlannerSidebar from "@/components/PlannerSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Eye, Send, Copy, BarChart3,
  Star, CheckCircle, MessageSquare, List,
  FileText, ClipboardList, Printer
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";

interface SurveyQuestion {
  id: string;
  type: "rating" | "multiple_choice" | "text" | "yes_no";
  question: string;
  options?: string[];
  required: boolean;
}

interface Survey {
  id: number;
  event_id: string | null;
  title: string;
  questions: SurveyQuestion[];
  status: string;
  created_at: string;
}

interface SurveyResponse {
  id: number;
  survey_id: number;
  respondent_name: string;
  respondent_email: string;
  answers: any[];
  created_at: string;
}

const TEMPLATES: Record<string, { title: string; questions: SurveyQuestion[] }> = {
  event_satisfaction: {
    title: "Event Satisfaction Survey",
    questions: [
      { id: "t1", type: "rating", question: "How would you rate the overall event experience?", required: true },
      { id: "t2", type: "rating", question: "How satisfied were you with the venue?", required: true },
      { id: "t3", type: "rating", question: "How would you rate the food and beverages?", required: true },
      { id: "t4", type: "multiple_choice", question: "What did you enjoy most?", options: ["Venue", "Food", "Entertainment", "Networking", "Speakers"], required: true },
      { id: "t5", type: "yes_no", question: "Would you attend a similar event in the future?", required: true },
      { id: "t6", type: "text", question: "Any additional comments or suggestions?", required: false },
    ],
  },
  vendor_feedback: {
    title: "Vendor Feedback Survey",
    questions: [
      { id: "v1", type: "rating", question: "How would you rate the communication with the vendor?", required: true },
      { id: "v2", type: "rating", question: "How satisfied were you with the quality of service?", required: true },
      { id: "v3", type: "rating", question: "Was the vendor punctual and professional?", required: true },
      { id: "v4", type: "rating", question: "How would you rate the value for money?", required: true },
      { id: "v5", type: "yes_no", question: "Would you recommend this vendor?", required: true },
      { id: "v6", type: "text", question: "Please share any specific feedback about the vendor.", required: false },
    ],
  },
  corporate_event: {
    title: "Corporate Event Feedback",
    questions: [
      { id: "c1", type: "rating", question: "How relevant was the event content to your work?", required: true },
      { id: "c2", type: "rating", question: "How effective were the speakers/presenters?", required: true },
      { id: "c3", type: "rating", question: "How would you rate the event organization?", required: true },
      { id: "c4", type: "multiple_choice", question: "Which session was most valuable?", options: ["Keynote", "Panel Discussion", "Workshop", "Networking", "Breakout Sessions"], required: true },
      { id: "c5", type: "multiple_choice", question: "How did you hear about this event?", options: ["Email", "Social Media", "Colleague", "Company Intranet", "Other"], required: false },
      { id: "c6", type: "yes_no", question: "Did the event meet your expectations?", required: true },
      { id: "c7", type: "text", question: "What topics would you like covered in future events?", required: false },
    ],
  },
};

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export default function SurveyBuilder() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("surveys");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [previewSurvey, setPreviewSurvey] = useState<Survey | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newEventId, setNewEventId] = useState("");
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);

  const { data: surveys = [], isLoading } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/surveys", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      setShowCreate(false);
      resetForm();
      toast({ title: "Survey created successfully" });
    },
    onError: () => toast({ title: "Failed to create survey", variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/surveys/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      toast({ title: "Survey updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/surveys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      setSelectedSurvey(null);
      toast({ title: "Survey deleted" });
    },
  });

  function resetForm() {
    setNewTitle("");
    setNewEventId("");
    setQuestions([]);
  }

  function applyTemplate(key: string) {
    const tpl = TEMPLATES[key];
    setNewTitle(tpl.title);
    setQuestions(tpl.questions.map((q) => ({ ...q, id: generateId() })));
  }

  function addQuestion(type: SurveyQuestion["type"]) {
    setQuestions([
      ...questions,
      {
        id: generateId(),
        type,
        question: "",
        options: type === "multiple_choice" ? ["Option 1", "Option 2"] : undefined,
        required: true,
      },
    ]);
  }

  function updateQuestion(id: string, updates: Partial<SurveyQuestion>) {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  }

  function removeQuestion(id: string) {
    setQuestions(questions.filter((q) => q.id !== id));
  }

  function addOption(qId: string) {
    setQuestions(
      questions.map((q) =>
        q.id === qId ? { ...q, options: [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`] } : q
      )
    );
  }

  function updateOption(qId: string, idx: number, val: string) {
    setQuestions(
      questions.map((q) =>
        q.id === qId ? { ...q, options: q.options?.map((o, i) => (i === idx ? val : o)) } : q
      )
    );
  }

  function removeOption(qId: string, idx: number) {
    setQuestions(
      questions.map((q) =>
        q.id === qId ? { ...q, options: q.options?.filter((_, i) => i !== idx) } : q
      )
    );
  }

  function handleCreate() {
    if (!newTitle.trim()) {
      toast({ title: "Please enter a survey title", variant: "destructive" });
      return;
    }
    if (questions.length === 0) {
      toast({ title: "Please add at least one question", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      title: newTitle,
      event_id: newEventId || null,
      questions,
    });
  }

  function copySurveyLink(id: number) {
    const link = `https://eventperfekt.net/survey/${id}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Survey link copied to clipboard" });
  }

  const questionTypeIcon = (type: string) => {
    switch (type) {
      case "rating": return <Star className="w-4 h-4" />;
      case "multiple_choice": return <List className="w-4 h-4" />;
      case "text": return <MessageSquare className="w-4 h-4" />;
      case "yes_no": return <CheckCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-600";
      case "closed": return "bg-red-600";
      default: return "bg-yellow-600";
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#16213e] via-[#1a1a2e] to-[#0f3460]">
      <PlannerSidebar />
      <main className="flex-1 lg:ml-60 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white font-[Poppins]">Survey Builder</h1>
              <p className="text-gray-400 mt-1">Create and manage post-event surveys</p>
            </div>
            <div className="flex gap-2">
              {surveys.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => openPrintWindow({
                    title: "Surveys",
                    stats: [
                      { label: "Total Surveys", value: surveys.length },
                      { label: "Active", value: surveys.filter(s => s.status === "active").length },
                      { label: "Draft", value: surveys.filter(s => s.status === "draft").length },
                      { label: "Closed", value: surveys.filter(s => s.status === "closed").length },
                    ],
                    columns: [
                      { header: "Title", key: "title" },
                      { header: "Questions", key: "questions", format: (v: any[]) => String(v?.length || 0) },
                      { header: "Status", key: "status" },
                      { header: "Created", key: "created_at", format: (v: string) => new Date(v).toLocaleDateString() },
                    ],
                    rows: surveys,
                  })}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              )}
              <Button
                onClick={() => { resetForm(); setShowCreate(true); }}
                className="bg-[#8B1538] hover:bg-[#6d1029] text-white"
              >
                <Plus className="w-4 h-4 mr-2" /> New Survey
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/10 border-white/20 mb-6">
              <TabsTrigger value="surveys" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-gray-300">
                <ClipboardList className="w-4 h-4 mr-2" /> Surveys
              </TabsTrigger>
              <TabsTrigger value="results" className="data-[state=active]:bg-[#8B1538] data-[state=active]:text-white text-gray-300">
                <BarChart3 className="w-4 h-4 mr-2" /> Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="surveys">
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-white/5 border-white/10 animate-pulse h-40" />
                  ))}
                </div>
              ) : surveys.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <ClipboardList className="w-16 h-16 text-gray-500 mb-4" />
                    <h3 className="text-white text-lg font-semibold">No Surveys Yet</h3>
                    <p className="text-gray-400 mt-2 text-center">Create your first survey to start collecting feedback</p>
                    <Button onClick={() => setShowCreate(true)} className="mt-4 bg-[#8B1538] hover:bg-[#6d1029] text-white">
                      <Plus className="w-4 h-4 mr-2" /> Create Survey
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {surveys.map((s) => (
                    <Card key={s.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition cursor-pointer" onClick={() => setSelectedSurvey(s)}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-white text-lg">{s.title}</CardTitle>
                          <Badge className={`${statusColor(s.status)} text-white text-xs`}>{s.status}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-400 text-sm">{s.questions.length} questions</p>
                        <p className="text-gray-500 text-xs mt-1">Created {new Date(s.created_at).toLocaleDateString()}</p>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setPreviewSurvey(s); }}>
                            <Eye className="w-3 h-3 mr-1" /> Preview
                          </Button>
                          <Button size="sm" variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10" onClick={(e) => { e.stopPropagation(); copySurveyLink(s.id); }}>
                            <Copy className="w-3 h-3 mr-1" /> Link
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="results">
              <SurveyResults surveys={surveys} />
            </TabsContent>
          </Tabs>

          {showCreate && (
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a1a2e] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white text-xl">Create New Survey</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-sm text-gray-400 self-center">Templates:</span>
                    {Object.entries(TEMPLATES).map(([key, tpl]) => (
                      <Button key={key} size="sm" variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10" onClick={() => applyTemplate(key)}>
                        {tpl.title}
                      </Button>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Survey Title</label>
                      <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Event Feedback" className="bg-white/10 border-white/20 text-white" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Event (Optional)</label>
                      <Select value={newEventId} onValueChange={setNewEventId}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select event" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No event</SelectItem>
                          {events.map((e: any) => (
                            <SelectItem key={e.id} value={String(e.id)}>{e.title || e.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <span className="text-sm text-gray-400 self-center">Add Question:</span>
                    <Button size="sm" variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10" onClick={() => addQuestion("rating")}>
                      <Star className="w-3 h-3 mr-1" /> Rating
                    </Button>
                    <Button size="sm" variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10" onClick={() => addQuestion("multiple_choice")}>
                      <List className="w-3 h-3 mr-1" /> Multiple Choice
                    </Button>
                    <Button size="sm" variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10" onClick={() => addQuestion("text")}>
                      <MessageSquare className="w-3 h-3 mr-1" /> Text
                    </Button>
                    <Button size="sm" variant="outline" className="border-white/20 text-gray-300 hover:bg-white/10" onClick={() => addQuestion("yes_no")}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Yes/No
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                    {questions.map((q, idx) => (
                      <Card key={q.id} className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-gray-500 text-sm mt-2">{idx + 1}.</span>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                {questionTypeIcon(q.type)}
                                <Badge variant="outline" className="text-xs border-white/20 text-gray-400">{q.type.replace("_", " ")}</Badge>
                              </div>
                              <Input
                                value={q.question}
                                onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                                placeholder="Enter your question"
                                className="bg-white/10 border-white/20 text-white"
                              />
                              {q.type === "multiple_choice" && (
                                <div className="space-y-2 pl-4">
                                  {q.options?.map((opt, oi) => (
                                    <div key={oi} className="flex gap-2">
                                      <Input
                                        value={opt}
                                        onChange={(e) => updateOption(q.id, oi, e.target.value)}
                                        className="bg-white/5 border-white/10 text-white text-sm"
                                      />
                                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => removeOption(q.id, oi)}>
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white" onClick={() => addOption(q.id)}>
                                    <Plus className="w-3 h-3 mr-1" /> Add Option
                                  </Button>
                                </div>
                              )}
                            </div>
                            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => removeQuestion(q.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {questions.length > 0 && (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" className="border-white/20 text-gray-300" onClick={() => setShowCreate(false)}>Cancel</Button>
                      <Button className="bg-[#8B1538] hover:bg-[#6d1029] text-white" onClick={handleCreate} disabled={createMutation.isPending}>
                        {createMutation.isPending ? "Creating..." : "Create Survey"}
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {selectedSurvey && (
            <Dialog open={!!selectedSurvey} onOpenChange={() => setSelectedSurvey(null)}>
              <DialogContent className="max-w-2xl bg-[#1a1a2e] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">{selectedSurvey.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColor(selectedSurvey.status)} text-white`}>{selectedSurvey.status}</Badge>
                    <span className="text-gray-400 text-sm">{selectedSurvey.questions.length} questions</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedSurvey.status === "draft" && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { updateStatusMutation.mutate({ id: selectedSurvey.id, status: "active" }); setSelectedSurvey(null); }}>
                        <Send className="w-3 h-3 mr-1" /> Activate
                      </Button>
                    )}
                    {selectedSurvey.status === "active" && (
                      <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => { updateStatusMutation.mutate({ id: selectedSurvey.id, status: "closed" }); setSelectedSurvey(null); }}>
                        Close Survey
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="border-white/20 text-gray-300" onClick={() => copySurveyLink(selectedSurvey.id)}>
                      <Copy className="w-3 h-3 mr-1" /> Copy Link
                    </Button>
                    <Button size="sm" variant="outline" className="border-white/20 text-gray-300" onClick={() => { setPreviewSurvey(selectedSurvey); setSelectedSurvey(null); }}>
                      <Eye className="w-3 h-3 mr-1" /> Preview
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(selectedSurvey.id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {selectedSurvey.questions.map((q, i) => (
                      <div key={q.id} className="flex items-start gap-2 p-2 bg-white/5 rounded">
                        <span className="text-gray-500 text-sm">{i + 1}.</span>
                        <div>
                          <div className="flex items-center gap-2">
                            {questionTypeIcon(q.type)}
                            <span className="text-white text-sm">{q.question}</span>
                          </div>
                          {q.type === "multiple_choice" && q.options && (
                            <div className="ml-6 mt-1 text-xs text-gray-400">
                              {q.options.join(" • ")}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {previewSurvey && (
            <Dialog open={!!previewSurvey} onOpenChange={() => setPreviewSurvey(null)}>
              <DialogContent className="max-w-2xl bg-white text-black max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-[#8B1538] text-xl">{previewSurvey.title}</DialogTitle>
                </DialogHeader>
                <p className="text-gray-500 text-sm">Preview — this is how respondents will see the survey</p>
                <div className="space-y-4 mt-4">
                  {previewSurvey.questions.map((q, i) => (
                    <div key={q.id} className="space-y-2">
                      <label className="font-medium text-sm">
                        {i + 1}. {q.question} {q.required && <span className="text-red-500">*</span>}
                      </label>
                      {q.type === "rating" && (
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} className="w-6 h-6 text-gray-300" />
                          ))}
                        </div>
                      )}
                      {q.type === "multiple_choice" && q.options?.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input type="radio" disabled name={`preview-${q.id}`} className="accent-[#8B1538]" />
                          <span className="text-sm">{opt}</span>
                        </div>
                      ))}
                      {q.type === "text" && <Textarea disabled placeholder="Type your answer..." className="bg-gray-50" />}
                      {q.type === "yes_no" && (
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2"><input type="radio" disabled /><span className="text-sm">Yes</span></div>
                          <div className="flex items-center gap-2"><input type="radio" disabled /><span className="text-sm">No</span></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </main>
    </div>
  );
}

function SurveyResults({ surveys }: { surveys: Survey[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: responses = [], isLoading } = useQuery<SurveyResponse[]>({
    queryKey: ["/api/surveys", selectedId, "results"],
    enabled: !!selectedId,
  });

  const selected = surveys.find((s) => s.id === selectedId);

  function computeStats(question: SurveyQuestion, allResponses: SurveyResponse[]) {
    const answers = allResponses.map((r) => {
      const ans = (r.answers as any[]).find((a: any) => a.questionId === question.id);
      return ans?.value;
    }).filter(Boolean);

    if (question.type === "rating") {
      const nums = answers.map(Number).filter((n) => !isNaN(n));
      const avg = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : "N/A";
      return { type: "rating" as const, average: avg, count: nums.length, distribution: [1, 2, 3, 4, 5].map((n) => ({ rating: n, count: nums.filter((x) => x === n).length })) };
    }
    if (question.type === "yes_no") {
      const yes = answers.filter((a) => a === "yes" || a === "Yes").length;
      const no = answers.filter((a) => a === "no" || a === "No").length;
      return { type: "yes_no" as const, yes, no, total: answers.length };
    }
    if (question.type === "multiple_choice") {
      const counts: Record<string, number> = {};
      answers.forEach((a) => { counts[a] = (counts[a] || 0) + 1; });
      return { type: "multiple_choice" as const, counts, total: answers.length };
    }
    return { type: "text" as const, answers };
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-gray-400 mb-1 block">Select Survey</label>
        <Select value={selectedId ? String(selectedId) : ""} onValueChange={(v) => setSelectedId(Number(v))}>
          <SelectTrigger className="bg-white/10 border-white/20 text-white max-w-sm">
            <SelectValue placeholder="Choose a survey" />
          </SelectTrigger>
          <SelectContent>
            {surveys.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>{s.title} ({s.status})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedId && isLoading && <p className="text-gray-400">Loading responses...</p>}

      {selectedId && !isLoading && selected && (
        <div className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{responses.length}</p>
                  <p className="text-gray-400 text-sm">Total Responses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {responses.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No responses yet. Share the survey link to start collecting feedback.</p>
              </CardContent>
            </Card>
          ) : (
            selected.questions.map((q, i) => {
              const stats = computeStats(q, responses);
              return (
                <Card key={q.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <p className="text-white font-medium mb-3">{i + 1}. {q.question}</p>
                    {stats.type === "rating" && (
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-yellow-400">{stats.average} <span className="text-sm text-gray-400">/ 5</span></p>
                        <div className="flex gap-1 items-end h-16">
                          {stats.distribution.map((d) => (
                            <div key={d.rating} className="flex-1 text-center">
                              <div className="bg-yellow-500/30 rounded-t mx-auto" style={{ height: `${Math.max(4, (d.count / Math.max(1, stats.count)) * 48)}px`, width: "100%" }} />
                              <span className="text-xs text-gray-400">{d.rating}★</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {stats.type === "yes_no" && (
                      <div className="flex gap-4">
                        <div className="flex-1 bg-green-500/20 rounded p-3 text-center">
                          <p className="text-lg font-bold text-green-400">{stats.yes}</p>
                          <p className="text-xs text-gray-400">Yes</p>
                        </div>
                        <div className="flex-1 bg-red-500/20 rounded p-3 text-center">
                          <p className="text-lg font-bold text-red-400">{stats.no}</p>
                          <p className="text-xs text-gray-400">No</p>
                        </div>
                      </div>
                    )}
                    {stats.type === "multiple_choice" && (
                      <div className="space-y-2">
                        {Object.entries(stats.counts).sort(([, a], [, b]) => b - a).map(([opt, count]) => (
                          <div key={opt} className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-300">{opt}</span>
                                <span className="text-gray-400">{count}</span>
                              </div>
                              <div className="h-2 bg-white/10 rounded-full">
                                <div className="h-full bg-[#8B1538] rounded-full" style={{ width: `${(count / stats.total) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {stats.type === "text" && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {stats.answers.map((a, ai) => (
                          <p key={ai} className="text-gray-300 text-sm bg-white/5 p-2 rounded">{a}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
