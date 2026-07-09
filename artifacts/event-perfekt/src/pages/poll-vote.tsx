import { useState } from "react";
import { useParams } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  CheckCircle,
  MessageSquare,
  Vote,
  Send,
} from "lucide-react";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";

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
  question_text: string;
  submitted_by: string | null;
  is_answered: boolean;
  created_at: string;
}

export default function PollVote() {
  usePageMeta({ title: "Live Poll — Event Perfekt" });

  const { pollId } = useParams<{ pollId: string }>();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [hasVoted, setHasVoted] = useState(false);
  const [qaName, setQaName] = useState("");
  const [qaQuestion, setQaQuestion] = useState("");

  const { data: poll, isLoading } = useQuery<Poll>({
    queryKey: ["/api/polls", pollId, "results"],
    refetchInterval: 5000,
  });

  const { data: questions = [] } = useQuery<PollQuestion[]>({
    queryKey: ["/api/polls", pollId, "questions"],
    refetchInterval: 5000,
  });

  const voteMutation = useMutation({
    mutationFn: async (option: string) => {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setHasVoted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/polls", pollId, "results"] });
      toast({ title: "Vote submitted!" });
    },
    onError: (err: any) => {
      toast({ title: err.message || "Failed to vote", variant: "destructive" });
    },
  });

  const submitQuestionMutation = useMutation({
    mutationFn: async (data: { question_text: string; submitted_by: string }) => {
      const res = await fetch(`/api/polls/${pollId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls", pollId, "questions"] });
      setQaQuestion("");
      setQaName("");
      toast({ title: "Question submitted!" });
    },
  });

  const handleVote = () => {
    if (!selectedOption) {
      toast({ title: "Please select an option", variant: "destructive" });
      return;
    }
    voteMutation.mutate(selectedOption);
  };

  const handleSubmitQuestion = () => {
    if (!qaQuestion.trim()) {
      toast({ title: "Please enter a question", variant: "destructive" });
      return;
    }
    submitQuestionMutation.mutate({
      question_text: qaQuestion,
      submitted_by: qaName || "Anonymous",
    });
  };

  const getTotalVotes = (votes: Record<string, number>) =>
    Object.values(votes || {}).reduce((s, v) => s + v, 0);

  const getVotePercent = (votes: Record<string, number>, option: string) => {
    const total = getTotalVotes(votes);
    if (total === 0) return 0;
    return Math.round(((votes[option] || 0) / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B1538]"></div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800">Poll Not Found</h2>
            <p className="text-gray-500 mt-2">This poll may have been removed or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-2xl mx-auto px-4 flex items-center gap-3">
          <img src={logoPath} alt="Event Perfekt" className="w-10 h-10 rounded-full object-cover" />
          <div>
            <h1 className="text-lg font-bold text-[#8B1538] font-['Poppins']">Event Perfekt</h1>
            <p className="text-xs text-gray-500">...making yours perfekt</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Tabs defaultValue="vote">
          <TabsList className="w-full mb-6 bg-gray-100">
            <TabsTrigger value="vote" className="flex-1 data-[state=active]:bg-[#8B1538] data-[state=active]:text-white">
              <Vote className="w-4 h-4 mr-2" /> Vote
            </TabsTrigger>
            <TabsTrigger value="results" className="flex-1 data-[state=active]:bg-[#8B1538] data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" /> Results
            </TabsTrigger>
            <TabsTrigger value="qa" className="flex-1 data-[state=active]:bg-[#8B1538] data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-2" /> Q&A
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vote">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-800 text-xl">{poll.question}</CardTitle>
                  <Badge variant={poll.status === "active" ? "default" : "secondary"} className={poll.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                    {poll.status === "active" ? "Active" : "Closed"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {poll.status === "closed" ? (
                  <p className="text-gray-500 text-center py-8">This poll has been closed.</p>
                ) : hasVoted ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-800">Thank you for voting!</p>
                    <p className="text-gray-500 mt-1">Check the Results tab to see live results.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(poll.options || []).map((option: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedOption(option)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedOption === option
                            ? "border-[#8B1538] bg-[#8B1538]/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedOption === option ? "border-[#8B1538]" : "border-gray-300"
                          }`}>
                            {selectedOption === option && <div className="w-3 h-3 rounded-full bg-[#8B1538]" />}
                          </div>
                          <span className="text-gray-700">{option}</span>
                        </div>
                      </button>
                    ))}
                    <Button
                      onClick={handleVote}
                      disabled={!selectedOption || voteMutation.isPending}
                      className="w-full mt-4 bg-[#8B1538] hover:bg-[#6d1029] text-white"
                    >
                      {voteMutation.isPending ? "Submitting..." : "Submit Vote"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-800">{poll.question}</CardTitle>
                <p className="text-sm text-gray-500">{getTotalVotes(poll.votes)} total votes</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {(poll.options || []).map((option: string, idx: number) => {
                  const pct = getVotePercent(poll.votes, option);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 font-medium">{option}</span>
                        <span className="text-gray-500">{poll.votes?.[option] || 0} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div
                          className="bg-[#8B1538] h-3 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qa">
            <div className="space-y-6">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-800 text-lg">Ask a Question</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-gray-600">Your Name (optional)</Label>
                    <Input
                      value={qaName}
                      onChange={(e) => setQaName(e.target.value)}
                      placeholder="Anonymous"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-600">Your Question</Label>
                    <Textarea
                      value={qaQuestion}
                      onChange={(e) => setQaQuestion(e.target.value)}
                      placeholder="Type your question here..."
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleSubmitQuestion}
                    disabled={!qaQuestion.trim() || submitQuestionMutation.isPending}
                    className="w-full bg-[#8B1538] hover:bg-[#6d1029] text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {submitQuestionMutation.isPending ? "Submitting..." : "Submit Question"}
                  </Button>
                </CardContent>
              </Card>

              {(questions || []).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-gray-700 font-semibold">Questions</h3>
                  {(questions || []).map((q) => (
                    <Card key={q.id} className="border-gray-200">
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-gray-800">{q.question_text}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {q.submitted_by || "Anonymous"} · {new Date(q.created_at).toLocaleString()}
                            </p>
                          </div>
                          {q.is_answered && (
                            <Badge className="bg-green-100 text-green-700 ml-2">Answered</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
