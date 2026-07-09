import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageMeta } from "@/hooks/use-page-meta";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Star, CheckCircle, Send } from "lucide-react";
import logoPath from "@assets/3d_Logo_1772145137902.jpg";
import FormHelperBot from "@/components/FormHelperBot";

interface SurveyQuestion {
  id: string;
  type: "rating" | "multiple_choice" | "text" | "yes_no";
  question: string;
  options?: string[];
  required: boolean;
}

interface Survey {
  id: number;
  title: string;
  questions: SurveyQuestion[];
  status: string;
}

export default function SurveyRespond({ surveyId }: { surveyId: string }) {
  usePageMeta({ title: "Survey — Event Perfekt" });

  const { toast } = useToast();
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: survey, isLoading, error } = useQuery<Survey>({
    queryKey: ["/api/surveys", surveyId, "public"],
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/surveys/${surveyId}/respond`, data),
    onSuccess: () => setSubmitted(true),
    onError: () => toast({ title: "Failed to submit response", variant: "destructive" }),
  });

  function setAnswer(questionId: string, value: any) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleSubmit() {
    if (!survey) return;
    const missing = survey.questions.filter((q) => q.required && !answers[q.id]);
    if (missing.length > 0) {
      toast({ title: `Please answer all required questions (${missing.length} remaining)`, variant: "destructive" });
      return;
    }
    const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
    submitMutation.mutate({
      respondent_name: respondentName,
      respondent_email: respondentEmail,
      answers: formattedAnswers,
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#8B1538] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold text-gray-800">Survey Not Found</h2>
            <p className="text-gray-500 mt-2">This survey may have been removed or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (survey.status === "closed") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold text-gray-800">Survey Closed</h2>
            <p className="text-gray-500 mt-2">This survey is no longer accepting responses.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800">Thank You!</h2>
            <p className="text-gray-500 mt-2">Your response has been recorded. We appreciate your feedback.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <img src={logoPath} alt="Event Perfekt" className="w-16 h-16 rounded-full mx-auto mb-3 object-cover" />
          <h1 className="text-2xl font-bold text-[#8B1538] font-[Poppins]">{survey.title}</h1>
          <p className="text-gray-500 mt-1 text-sm">Your feedback helps us create better events</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Your Name</label>
                <Input value={respondentName} onChange={(e) => setRespondentName(e.target.value)} placeholder="Enter your name" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Your Email</label>
                <Input value={respondentEmail} onChange={(e) => setRespondentEmail(e.target.value)} placeholder="Enter your email" type="email" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {survey.questions.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="p-6">
                <label className="font-medium text-gray-800 block mb-3">
                  {i + 1}. {q.question} {q.required && <span className="text-red-500">*</span>}
                </label>

                {q.type === "rating" && (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setAnswer(q.id, n)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${answers[q.id] >= n ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                        />
                      </button>
                    ))}
                    {answers[q.id] && <span className="text-sm text-gray-500 self-center ml-2">{answers[q.id]}/5</span>}
                  </div>
                )}

                {q.type === "multiple_choice" && q.options?.map((opt) => (
                  <div key={opt} className="flex items-center gap-3 py-1">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswer(q.id, opt)}
                      className="accent-[#8B1538] w-4 h-4"
                    />
                    <span className="text-gray-700">{opt}</span>
                  </div>
                ))}

                {q.type === "text" && (
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Type your answer..."
                    rows={3}
                  />
                )}

                {q.type === "yes_no" && (
                  <div className="flex gap-4">
                    <Button
                      variant={answers[q.id] === "Yes" ? "default" : "outline"}
                      className={answers[q.id] === "Yes" ? "bg-[#8B1538] text-white" : ""}
                      onClick={() => setAnswer(q.id, "Yes")}
                    >
                      Yes
                    </Button>
                    <Button
                      variant={answers[q.id] === "No" ? "default" : "outline"}
                      className={answers[q.id] === "No" ? "bg-[#8B1538] text-white" : ""}
                      onClick={() => setAnswer(q.id, "No")}
                    >
                      No
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button
            size="lg"
            className="bg-[#8B1538] hover:bg-[#6d1029] text-white px-8"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {submitMutation.isPending ? "Submitting..." : "Submit Response"}
          </Button>
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">Powered by Event Perfekt</p>
      </div>
      <FormHelperBot formContext="survey" welcomeMessage="Hi! Thanks for taking the time to give feedback. I can explain any question if you're unsure." suggestedQuestions={["Why is my feedback important?", "Is my response anonymous?", "How long does this take?"]} />
    </div>
  );
}
