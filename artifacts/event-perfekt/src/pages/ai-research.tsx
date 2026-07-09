import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import PlannerLayout from "@/components/PlannerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Send, Loader2, Copy, Bookmark, RefreshCw,
  Building2, Users, DollarSign, TrendingUp, Map, Megaphone,
  Scale, Utensils, Bot, User, ChevronRight, Trash2, Search,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  topic?: string;
}

interface SavedInsight {
  id: string;
  title: string;
  content: string;
  topic: string;
  savedAt: Date;
}

const TOPICS = [
  { id: "general",   label: "General",      icon: Bot,        color: "text-white/80",    bg: "bg-white/10" },
  { id: "venues",    label: "Venues",        icon: Building2,  color: "text-blue-400",    bg: "bg-blue-500/10" },
  { id: "vendors",   label: "Vendors",       icon: Users,      color: "text-purple-400",  bg: "bg-purple-500/10" },
  { id: "budgets",   label: "Budgets",       icon: DollarSign, color: "text-green-400",   bg: "bg-green-500/10" },
  { id: "trends",    label: "Trends",        icon: TrendingUp, color: "text-amber-400",   bg: "bg-amber-500/10" },
  { id: "logistics", label: "Logistics",     icon: Map,        color: "text-cyan-400",    bg: "bg-cyan-500/10" },
  { id: "marketing", label: "Marketing",     icon: Megaphone,  color: "text-pink-400",    bg: "bg-pink-500/10" },
  { id: "legal",     label: "Legal",         icon: Scale,      color: "text-red-400",     bg: "bg-red-500/10" },
  { id: "catering",  label: "Catering",      icon: Utensils,   color: "text-orange-400",  bg: "bg-orange-500/10" },
];

const QUICK_PROMPTS: Record<string, string[]> = {
  venues: [
    "What are the best corporate event venues in London for 200 guests under £15,000?",
    "What unique outdoor venues in Lagos work for 500-person gala dinners?",
    "How do I negotiate venue hire fees and what concessions should I ask for?",
    "What questions must I ask a venue during a site visit?",
  ],
  vendors: [
    "What should I look for when shortlisting event photographers in the UK?",
    "What are typical catering costs per head for a corporate dinner in London?",
    "How do I vet a Nigerian events decorator before hiring them?",
    "What red flags should warn me away from a vendor?",
  ],
  budgets: [
    "Create a budget breakdown for a 150-person corporate dinner in London at £50,000",
    "What percentage of my event budget should go to venue vs catering vs decor?",
    "How can I reduce event costs without reducing quality?",
    "What hidden costs do planners often miss in their budgets?",
  ],
  trends: [
    "What are the top corporate event trends for 2025 in the UK?",
    "What's trending for Nigerian wedding receptions in 2025?",
    "What technology is being used at luxury events right now?",
    "What sustainability practices are events adopting?",
  ],
  logistics: [
    "How do I build a robust event-day timeline for a 300-person gala?",
    "What staffing ratios do I need for different event types?",
    "How do I manage guest transport for a large multi-venue event?",
    "What's included in a comprehensive event risk assessment?",
  ],
  general: [
    "What makes a truly unforgettable event experience?",
    "How do I price my event planning services competitively in the UK?",
    "What should be in every event planning contract?",
    "How do I handle a client who keeps changing their requirements?",
  ],
};

export default function AIResearchAssistant() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [activeTopic, setActiveTopic] = useState("general");
  const [isLoading, setIsLoading] = useState(false);
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [eventContext, setEventContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text, timestamp: new Date(), topic: activeTopic };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("tender_token");
      const res = await fetch("/api/ai-research", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: text,
          topic: activeTopic,
          context: eventContext,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();

      const assistantMsg: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        topic: activeTopic,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      toast({ title: "Error", description: "Could not reach the Marketing Agent service. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const saveInsight = (msg: Message) => {
    const insight: SavedInsight = {
      id: Date.now().toString(),
      title: msg.content.slice(0, 60) + (msg.content.length > 60 ? "..." : ""),
      content: msg.content,
      topic: msg.topic || activeTopic,
      savedAt: new Date(),
    };
    setSavedInsights(prev => [insight, ...prev]);
    toast({ title: "Saved", description: "Insight saved to your research library" });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Response copied to clipboard" });
  };

  const clearChat = () => {
    setMessages([]);
  };

  const activeTopic_ = TOPICS.find(t => t.id === activeTopic)!;

  return (
    <PlannerLayout>
      <div className="min-h-screen bg-[#0d0106]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#330311] to-[#1a0209] border-b border-[#4a0a1e] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">Marketing Agent</h1>
                <p className="text-white/40 text-xs">Context-aware event planning research — venues, vendors, budgets & more</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-white/50 hover:text-white text-xs" onClick={() => setShowContext(!showContext)}>
                {showContext ? "Hide" : "Set"} Event Context
              </Button>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" className="text-white/50 hover:text-red-400 text-xs" onClick={clearChat}>
                  <Trash2 className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>

          {showContext && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <Input
                placeholder="Optional: Describe your current event (e.g. '250-person corporate gala in London, £45k budget, November 2025') for more targeted advice..."
                value={eventContext}
                onChange={e => setEventContext(e.target.value)}
                className="bg-[#330311]/50 border-[#4a0a1e] text-white text-sm placeholder:text-white/30"
              />
            </div>
          )}
        </div>

        <div className="flex h-[calc(100vh-120px)]">
          {/* Left panel — Topics + Quick prompts */}
          <div className="w-72 border-r border-[#4a0a1e] bg-[#0d0106] flex flex-col">
            {/* Topic selector */}
            <div className="p-4 border-b border-[#4a0a1e]">
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-3">Research Topic</p>
              <div className="grid grid-cols-3 gap-1.5">
                {TOPICS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTopic(t.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-center ${
                      activeTopic === t.id
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-[#4a0a1e] bg-[#1a0209] hover:border-white/20"
                    }`}
                  >
                    <t.icon className={`w-3.5 h-3.5 ${activeTopic === t.id ? "text-amber-400" : t.color}`} />
                    <span className={`text-[9px] font-medium ${activeTopic === t.id ? "text-amber-300" : "text-white/50"}`}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick prompts */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-3">Quick Questions</p>
              <div className="space-y-2">
                {(QUICK_PROMPTS[activeTopic] || QUICK_PROMPTS.general).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left text-xs text-white/60 hover:text-white bg-[#1a0209] hover:bg-[#330311]/50 border border-[#4a0a1e] hover:border-white/20 rounded-lg p-2.5 transition-all flex items-start gap-2"
                  >
                    <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-400/60" />
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Saved insights */}
              {savedInsights.length > 0 && (
                <div className="mt-5">
                  <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-3">Saved Insights ({savedInsights.length})</p>
                  <div className="space-y-2">
                    {savedInsights.map(insight => (
                      <div key={insight.id} className="bg-[#1a0209] border border-[#4a0a1e] rounded-lg p-2">
                        <Badge className="text-[9px] mb-1 bg-amber-500/10 text-amber-400 border-amber-500/20">{insight.topic}</Badge>
                        <p className="text-white/60 text-[10px] leading-relaxed">{insight.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-amber-400" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">Marketing Agent</h3>
                  <p className="text-white/40 text-sm max-w-sm">
                    Ask me anything about venues, vendors, budgets, trends, logistics, legal requirements, or marketing. Select a topic on the left for specialized expertise.
                  </p>
                  {eventContext && (
                    <div className="mt-4 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-xs max-w-sm">
                      🎯 Context: {eventContext}
                    </div>
                  )}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-[#8B1538]" : "bg-amber-500/20 border border-amber-500/30"
                  }`}>
                    {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
                  </div>

                  <div className={`flex-1 max-w-2xl ${msg.role === "user" ? "flex flex-col items-end" : ""}`}>
                    {msg.topic && msg.role === "assistant" && (
                      <Badge className="text-[9px] mb-1 bg-white/5 text-white/40 border-white/10">
                        {TOPICS.find(t => t.id === msg.topic)?.label || msg.topic}
                      </Badge>
                    )}
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[#8B1538] text-white rounded-tr-sm"
                        : "bg-[#1a0209] border border-[#4a0a1e] text-white/90 rounded-tl-sm"
                    }`}>
                      {msg.content}
                    </div>

                    {msg.role === "assistant" && (
                      <div className="flex gap-2 mt-1.5">
                        <button onClick={() => copyToClipboard(msg.content)} className="text-[10px] text-white/30 hover:text-white/70 flex items-center gap-1">
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                        <button onClick={() => saveInsight(msg)} className="text-[10px] text-white/30 hover:text-amber-400 flex items-center gap-1">
                          <Bookmark className="w-3 h-3" /> Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="bg-[#1a0209] border border-[#4a0a1e] rounded-2xl rounded-tl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-[#4a0a1e] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${activeTopic_.bg} border-white/10`}>
                  <activeTopic_.icon className={`w-3 h-3 ${activeTopic_.color}`} />
                  <span className={activeTopic_.color}>{activeTopic_.label}</span>
                </div>
                {eventContext && (
                  <span className="text-white/30 text-xs truncate max-w-xs">📍 {eventContext.slice(0, 40)}...</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={`Ask about ${activeTopic === "general" ? "event planning" : activeTopic}...`}
                  className="bg-[#1a0209] border-[#4a0a1e] text-white placeholder:text-white/30 focus:border-amber-500/40"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="bg-[#8B1538] hover:bg-[#6d0f2c] text-white px-4"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-white/20 text-[10px] mt-2 text-center">Press Enter to send · Shift+Enter for new line · Select a topic for specialist knowledge</p>
            </div>
          </div>
        </div>
      </div>
    </PlannerLayout>
  );
}
