import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MessageSquare, X, Send, Trash2, Plus, Sparkles, ChevronDown, Loader2,
  AlertCircle,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id?: number;
  role: string;
  content: string;
  createdAt?: string;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  "/planner-dashboard": [
    "What tasks should I prioritize today?",
    "How do I improve client retention?",
    "Tips for managing multiple events at once",
  ],
  "/create-event": [
    "What details are essential for a corporate event?",
    "Help me estimate budget for 200 guests",
    "Nigerian wedding planning timeline tips",
  ],
  "/budget-management": [
    "How should I allocate budget categories?",
    "Tips for negotiating vendor prices",
    "What's a reasonable markup percentage?",
  ],
  "/vendor-management": [
    "How do I vet a new vendor properly?",
    "What should vendor contracts include?",
    "Red flags when selecting vendors",
  ],
  "/contract-management": [
    "What are essential contract clauses?",
    "How to handle contract disputes?",
    "Tips for force majeure clauses",
  ],
  "/invoicing": [
    "Best practices for payment terms?",
    "How to chase late payments politely?",
    "Should I offer payment plans?",
  ],
  "/decor-inventory": [
    "How to track inventory condition effectively?",
    "Tips for pricing decor rentals",
    "Best practices for deposit amounts",
  ],
  "/lead-pipeline": [
    "How to qualify event planning leads?",
    "Best follow-up email templates",
    "Converting enquiries to bookings",
  ],
  "/prospect-finder": [
    "How to approach corporate prospects?",
    "Best pitch for event planning services",
    "What industries need event planners most?",
  ],
  "/tender-dashboard": [
    "Tips for writing winning bid responses",
    "How to calculate competitive pricing?",
    "What makes a strong tender submission?",
  ],
};

const PAGE_LABELS: Record<string, string> = {
  "/planner-dashboard": "Dashboard",
  "/create-event": "Create Event",
  "/budget-management": "Budget Management",
  "/vendor-management": "Vendor Management",
  "/contract-management": "Contracts",
  "/invoicing": "Invoicing",
  "/decor-inventory": "Decor Inventory",
  "/calendar": "Calendar",
  "/financial-dashboard": "Financial Dashboard",
  "/lead-pipeline": "Lead Pipeline",
  "/prospect-finder": "Prospect Finder",
  "/tender-dashboard": "Tender Command Centre",
  "/saas-tender-dashboard": "Tender Command Centre",
  "/guest-hub": "Guest Hub",
  "/event-checklist": "Event Checklist",
  "/proposals": "Proposals",
  "/email-campaigns": "Email Campaigns",
  "/documents": "Documents",
  "/expense-tracker": "Expenses",
  "/onboarding": "Onboarding",
  "/employees": "Employees",
  "/souvenirs-gifts": "Souvenirs & Gifts",
  "/photo-gallery": "Photo Gallery",
  "/survey-builder": "Surveys",
  "/automation": "Automation",
  "/run-sheet": "Run Sheet",
  "/print-materials": "Print Materials",
};

export default function AIChatBox() {
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [activeConvoId, setActiveConvoId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevLocationRef = useRef(location);

  const currentPageLabel = PAGE_LABELS[location] || null;
  const currentSuggestions = PAGE_SUGGESTIONS[location] || [
    "What are the top wedding venues in Lagos?",
    "Budget breakdown for a 200-guest gala",
    "Corporate event trends for 2026",
  ];

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: open,
  });

  const { data: activeConvo } = useQuery<{ messages: Message[] }>({
    queryKey: ["/api/conversations", activeConvoId],
    queryFn: () =>
      fetch(`/api/conversations/${activeConvoId}`).then((r) => r.json()),
    enabled: !!activeConvoId,
  });

  const messages: Message[] = activeConvo?.messages || [];

  const createConvoMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("POST", "/api/conversations", { title });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveConvoId(data.id);
      setShowHistory(false);
    },
  });

  const deleteConvoMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (activeConvoId) setActiveConvoId(null);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, activeConvoId]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg = input.trim();
    setInput("");

    let convoId = activeConvoId;
    if (!convoId) {
      const convo = await createConvoMutation.mutateAsync(
        userMsg.slice(0, 50) + (userMsg.length > 50 ? "..." : "")
      );
      convoId = convo.id;
      setActiveConvoId(convo.id);
    }

    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/conversations/${convoId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg, pageContext: location }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.done) break;
                if (data.content) {
                  accumulated += data.content;
                  setStreamingContent(accumulated);
                }
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", convoId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    }
  };

  const startNewChat = () => {
    setActiveConvoId(null);
    setShowHistory(false);
    setStreamingContent("");
    setInput("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300",
          open
            ? "bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20"
            : "bg-gradient-to-br from-[#8B1538] to-[#330311] text-white hover:scale-110"
        )}
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[400px] max-h-[600px] bg-[#0d0a1a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-[#330311] to-[#8B1538] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-white font-semibold text-sm">
                  Agent Research
                </span>
                {currentPageLabel && (
                  <span className="text-white/50 text-[10px] flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-green-400 inline-block" />
                    {currentPageLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="text-white/60 hover:text-white hover:bg-white/10 h-7 w-7 p-0"
                title="Chat history"
              >
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    showHistory && "rotate-180"
                  )}
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewChat}
                className="text-white/60 hover:text-white hover:bg-white/10 h-7 w-7 p-0"
                title="New chat"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {showHistory && (
            <div className="border-b border-white/10 max-h-48 overflow-y-auto bg-[#0d0a1a]">
              {(conversations as Conversation[]).length === 0 ? (
                <p className="text-white/30 text-xs text-center py-4">
                  No conversations yet
                </p>
              ) : (
                (conversations as Conversation[]).map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-xs cursor-pointer hover:bg-white/5 transition-colors",
                      activeConvoId === c.id && "bg-white/10"
                    )}
                  >
                    <span
                      className="text-white/70 truncate flex-1"
                      onClick={() => {
                        setActiveConvoId(c.id);
                        setShowHistory(false);
                      }}
                    >
                      {c.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConvoMutation.mutate(c.id);
                      }}
                      className="text-white/20 hover:text-red-400 ml-2 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[420px]">
            {!activeConvoId && messages.length === 0 && !streamingContent && (
              <div className="text-center py-8">
                <Sparkles className="w-10 h-10 text-[#8B1538]/40 mx-auto mb-3" />
                <h3 className="text-white/60 font-medium text-sm mb-1">
                  Agent Research
                </h3>
                {currentPageLabel && (
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400/70 text-[10px] font-medium uppercase tracking-wider">
                      Context: {currentPageLabel}
                    </span>
                  </div>
                )}
                <p className="text-white/30 text-xs leading-relaxed max-w-[280px] mx-auto">
                  {currentPageLabel
                    ? `I'm aware you're on ${currentPageLabel}. Ask me anything related to this page or general event planning.`
                    : "Ask me about venues, vendors, budgets, event trends, cultural traditions, decor ideas, and more."}
                </p>
                <div className="mt-4 space-y-1.5">
                  {currentSuggestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      className="block w-full text-left text-[11px] text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-[#8B1538] text-white rounded-br-md"
                      : "bg-white/5 text-white/80 border border-white/10 rounded-bl-md"
                  )}
                >
                  <div className="whitespace-pre-wrap break-words text-[13px]">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2.5 bg-white/5 text-white/80 border border-white/10">
                  <div className="whitespace-pre-wrap break-words text-[13px]">
                    {streamingContent}
                    <span className="inline-block w-1.5 h-4 bg-[#8B1538] ml-0.5 animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {isStreaming && !streamingContent && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md px-3.5 py-2.5 bg-white/5 border border-white/10">
                  <Loader2 className="w-4 h-4 text-[#8B1538] animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-white/10 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-center gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about events, vendors, budgets..."
                className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-9 rounded-xl"
                disabled={isStreaming}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || isStreaming}
                className="bg-[#8B1538] hover:bg-[#a01d45] text-white h-9 w-9 p-0 rounded-xl"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
