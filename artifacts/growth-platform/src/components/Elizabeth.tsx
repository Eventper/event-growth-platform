import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MessageCircle, X, Send, Trash2, AlertTriangle, Info, CheckCircle, ArrowRight, Zap, Loader2, Mail, ChevronDown } from "lucide-react";
import { useEventContext } from "@/contexts/EventContext";
import { apiGet, apiPost } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RunStep {
  tool: string;
  label: string;
  status: "done" | "error";
  detail: string;
  at: string;
}

interface RunData {
  ok: boolean;
  status: "running" | "awaiting_input" | "done" | "error";
  steps: RunStep[];
  transcript: Message[];
  pendingQuestion?: string | null;
  creditsUsed?: number;
  error?: string;
}

interface MemoryData {
  ok: boolean;
  resume: Array<{ eventId: string; page: string; step: string; action: string; lastAt: string }>;
  latestRun: { id: string; status: string; title: string } | null;
  pendingEmailDrafts: number;
}

interface Agent {
  id: string;
  name: string;
  title: string;
  tagline: string;
  description: string;
  kpis: string[];
  accent: string;
  icon: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const GREETING =
  "I'm Elizabeth — your growth agent. I can answer questions about your pipeline, or run the whole thing for you: tell me “fill the room for my event” and I'll build the strategy, find prospects, score and enrich the best, and draft outreach — then hand it to you to approve. What shall we do?";

// A persona-specific opening line shown when an agent is selected.
const greetingFor = (a: Agent) =>
  a.id === "elizabeth"
    ? GREETING
    : `I'm ${a.name} — your ${a.title.toLowerCase()}. ${a.tagline} Tell me what you need and I'll get to work, then hand drafts to you to approve.`;

interface CoachData {
  ok: boolean;
  alerts?: Array<{ type: "warning" | "info" | "success"; message: string; action: string }>;
  recommendations?: Array<{ area: string; suggestion: string; priority: string }>;
  nextSteps?: string[];
  summary?: any;
}

interface ElizabethProps {
  page?: string;
}

export default function Elizabeth({ page }: ElizabethProps) {
  const { selectedEventId } = useEventContext();
  const [, setLoc] = useLocation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "coach">("coach");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Agent run state
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<RunData["status"] | null>(null);
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  // Which agent ("who you're talking to") drives the run.
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    () => localStorage.getItem("elizabeth_growth_agent") || "elizabeth",
  );
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activePollRef = useRef<string | null>(null);

  const { data: coachData } = useQuery<CoachData>({
    queryKey: ["elizabeth-coach", selectedEventId],
    queryFn: () => apiGet(`/api/growth/events/${selectedEventId}/elizabeth-coach`),
    enabled: !!selectedEventId,
    refetchInterval: 30000,
  });

  // Elizabeth's persistent memory \u2014 "where you left off"
  const { data: memory, refetch: refetchMemory } = useQuery<MemoryData>({
    queryKey: ["elizabeth-memory"],
    queryFn: () => apiGet("/api/growth/elizabeth/memory"),
    enabled: open,
  });

  // The agent marketplace \u2014 who you can talk to.
  const { data: agentData } = useQuery<{ ok: boolean; agents: Agent[] }>({
    queryKey: ["growth-agents"],
    queryFn: () => apiGet("/api/growth/agents"),
    enabled: open,
  });
  const agents = agentData?.agents ?? [];
  const activeAgent =
    agents.find((a) => a.id === selectedAgentId) ?? agents[0] ?? null;
  const accent = activeAgent?.accent ?? "#6E2433";

  const alertCount = coachData?.alerts?.length ?? 0;
  const pendingDrafts = memory?.pendingEmailDrafts ?? 0;

  useEffect(() => {
    const saved = localStorage.getItem("elizabeth_growth_messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("elizabeth_growth_messages", JSON.stringify(messages));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, steps]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open, tab]);

  // ⌘K / Ctrl+K summons Elizabeth from anywhere — she is not bound to the corner.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // "Hand to Elizabeth" — any card can summon her with a seeded prompt. She
  // opens with the ask pre-filled; the human still reviews and sends it.
  useEffect(() => {
    const onHand = (e: Event) => {
      const detail = (e as CustomEvent).detail as { prompt?: string } | undefined;
      setOpen(true);
      setTab("chat");
      if (detail?.prompt) {
        setInput(detail.prompt);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("elizabeth:open", onHand as EventListener);
    return () => window.removeEventListener("elizabeth:open", onHand as EventListener);
  }, []);

  // Poll a run until it reaches a terminal/awaiting state, streaming steps + prose.
  const pollRun = useCallback(async (id: string) => {
    activePollRef.current = id;
    while (activePollRef.current === id) {
      let data: RunData;
      try {
        data = await apiGet<RunData>(`/api/growth/elizabeth/run/${id}`);
      } catch {
        await sleep(1500);
        continue;
      }
      setSteps(data.steps || []);
      if (data.transcript?.length) setMessages(data.transcript);
      setRunStatus(data.status);
      setPendingQuestion(data.pendingQuestion || null);
      if (data.status === "done" || data.status === "awaiting_input" || data.status === "error") {
        setLoading(false);
        if (data.status === "error") setError(data.error || "Something went wrong on my side.");
        refetchMemory();
        break;
      }
      await sleep(1400);
    }
  }, [refetchMemory]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setError("");
    const optimistic = [...messages, { role: "user" as const, content: text }];
    setMessages(optimistic);
    setLoading(true);
    try {
      let id = runId;
      if (runStatus === "awaiting_input" && id) {
        await apiPost(`/api/growth/elizabeth/run/${id}/reply`, { message: text });
      } else {
        const r = await apiPost<{ runId: string }>("/api/growth/elizabeth/run", { messages: optimistic, agentId: selectedAgentId });
        id = r.runId;
        setRunId(id);
      }
      setRunStatus("running");
      setPendingQuestion(null);
      pollRun(id!);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => {
    activePollRef.current = null;
    setMessages([{ role: "assistant", content: GREETING }]);
    setSteps([]);
    setRunId(null);
    setRunStatus(null);
    setPendingQuestion(null);
    setError("");
    localStorage.removeItem("elizabeth_growth_messages");
  };

  const goToQueue = () => {
    setLoc("/outreach");
    setOpen(false);
  };

  // Switching agent starts a fresh conversation with that persona's greeting —
  // a new persona/toolset shouldn't inherit another agent's run thread.
  const switchAgent = (a: Agent) => {
    setShowAgentPicker(false);
    if (a.id === selectedAgentId) return;
    activePollRef.current = null;
    setSelectedAgentId(a.id);
    localStorage.setItem("elizabeth_growth_agent", a.id);
    setMessages([{ role: "assistant", content: greetingFor(a) }]);
    setSteps([]);
    setRunId(null);
    setRunStatus(null);
    setPendingQuestion(null);
    setError("");
    setTab("chat");
    localStorage.removeItem("elizabeth_growth_messages");
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gold text-ink shadow-lg shadow-gold/20 hover:scale-105 hover:shadow-gold/30 transition-all flex items-center justify-center"
          aria-label="Open chat with Elizabeth"
        >
          <MessageCircle className="w-6 h-6" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#C74A4A] text-white text-[10px] font-bold flex items-center justify-center">
              {alertCount}
            </span>
          )}
          <span className="absolute -bottom-6 right-0 text-[10px] font-medium text-ivory/50 whitespace-nowrap tracking-wide">
            ⌘K
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-32px)] h-[520px] max-h-[calc(100vh-48px)] bg-[#1A0A0E] border border-gold/20 rounded-xl overflow-hidden flex flex-col shadow-2xl shadow-black/40">
          {/* Header — click the identity to switch agent */}
          <div className="relative flex items-center justify-between px-4 py-3 border-b border-gold/15">
            <button
              onClick={() => setShowAgentPicker((v) => !v)}
              className="flex items-center gap-3 group text-left"
              title="Switch agent"
            >
              <div
                className="w-8 h-8 rounded-full border flex items-center justify-center text-[13px] font-medium"
                style={{ color: accent, borderColor: `${accent}55`, backgroundColor: `${accent}1A` }}
              >
                {activeAgent?.icon ?? "E"}
              </div>
              <div>
                <p className="text-[13px] font-medium text-ivory flex items-center gap-1">
                  {activeAgent?.name ?? "Elizabeth"}
                  <ChevronDown className={`w-3 h-3 text-ivory/40 transition-transform ${showAgentPicker ? "rotate-180" : ""}`} />
                </p>
                <p className="text-[10px] text-ivory/40 tracking-widest uppercase">{activeAgent?.title ?? "Growth Operator"}</p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <button onClick={clearChat} className="text-ivory/30 hover:text-ivory/60 transition-colors" title="Clear chat">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="text-ivory/40 hover:text-ivory/70 transition-colors text-lg leading-none" aria-label="Close chat">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Agent marketplace dropdown */}
            {showAgentPicker && (
              <div className="absolute top-full left-3 right-3 z-10 mt-1 rounded-xl border border-gold/20 bg-[#1A0A0E] shadow-2xl shadow-black/50 overflow-hidden">
                <div className="px-3 py-2 text-[9px] text-ivory/30 uppercase tracking-widest border-b border-ivory/[0.06]">
                  Choose your agent
                </div>
                <div className="max-h-[320px] overflow-y-auto py-1">
                  {agents.length === 0 && (
                    <div className="px-3 py-3 text-[12px] text-ivory/40">Loading agents…</div>
                  )}
                  {agents.map((a) => {
                    const isActive = a.id === selectedAgentId;
                    return (
                      <button
                        key={a.id}
                        onClick={() => switchAgent(a)}
                        className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors ${
                          isActive ? "bg-ivory/[0.06]" : "hover:bg-ivory/[0.03]"
                        }`}
                      >
                        <div
                          className="mt-0.5 w-7 h-7 shrink-0 rounded-full border flex items-center justify-center text-[12px] font-medium"
                          style={{ color: a.accent, borderColor: `${a.accent}55`, backgroundColor: `${a.accent}1A` }}
                        >
                          {a.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] font-medium text-ivory">{a.name}</span>
                            <span className="text-[9px] text-ivory/40 uppercase tracking-wider">{a.title}</span>
                            {isActive && <CheckCircle className="w-3 h-3" style={{ color: a.accent }} />}
                          </div>
                          <div className="text-[11px] text-ivory/50 leading-snug mt-0.5">{a.tagline}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-gold/10">
            <button
              onClick={() => setTab("coach")}
              className={`flex-1 py-2 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                tab === "coach" ? "text-gold border-b-2 border-gold" : "text-ivory/40"
              }`}
            >
              <Zap className="w-3 h-3 inline mr-1" />
              Coach
              {alertCount > 0 && (
                <span className="ml-1 w-4 h-4 inline-flex items-center justify-center rounded-full bg-[#C74A4A] text-white text-[9px] font-bold">
                  {alertCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("chat")}
              className={`flex-1 py-2 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                tab === "chat" ? "text-gold border-b-2 border-gold" : "text-ivory/40"
              }`}
            >
              <MessageCircle className="w-3 h-3 inline mr-1" />
              Chat
            </button>
          </div>

          {/* Coach tab */}
          {tab === "coach" && (
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {!selectedEventId && (
                <div className="text-[13px] text-ivory/50 text-center py-6">
                  Select an event to see growth alerts and recommendations.
                </div>
              )}
              {selectedEventId && !coachData && (
                <div className="flex items-center justify-center py-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse delay-100 ml-1" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse delay-200 ml-1" />
                </div>
              )}
              {coachData?.alerts?.map((alert, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-3 border text-[12px] ${
                    alert.type === "warning"
                      ? "bg-[#C74A4A]/10 border-[#C74A4A]/20 text-ivory/90"
                      : alert.type === "success"
                      ? "bg-[#4A9E6A]/10 border-[#4A9E6A]/20 text-ivory/90"
                      : "bg-gold/10 border-gold/20 text-ivory/90"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {alert.type === "warning" && <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#C74A4A]" />}
                    {alert.type === "success" && <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#4A9E6A]" />}
                    {alert.type === "info" && <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gold" />}
                    <div>
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-ivory/60 mt-1">{alert.action}</div>
                    </div>
                  </div>
                </div>
              ))}
              {coachData?.alerts?.length === 0 && (
                <div className="text-center py-6 text-[12px] text-ivory/40">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-[#4A9E6A]/60" />
                  All caught up. No alerts right now.
                </div>
              )}
              {coachData?.recommendations && coachData.recommendations.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] text-ivory/30 uppercase tracking-widest mb-2">Recommendations</div>
                  {coachData.recommendations.map((rec, i) => (
                    <div key={i} className="rounded-lg p-3 bg-ivory/5 border border-ivory/10 text-[12px] mb-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[10px] font-bold uppercase ${
                          rec.priority === "high" ? "text-[#C74A4A]" : rec.priority === "medium" ? "text-gold" : "text-[#4A9E6A]"
                        }`}>{rec.priority}</span>
                        <span className="text-ivory/40 text-[10px]">{rec.area}</span>
                      </div>
                      <div className="text-ivory/80">{rec.suggestion}</div>
                    </div>
                  ))}
                </div>
              )}
              {coachData?.nextSteps && coachData.nextSteps.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] text-ivory/30 uppercase tracking-widest mb-2">Next Steps</div>
                  {coachData.nextSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px] text-ivory/70 mb-1">
                      <ArrowRight className="w-3 h-3 text-gold" />
                      {step}
                    </div>
                  ))}
                </div>
              )}
              {coachData?.summary && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="rounded-lg p-2 bg-ivory/5 border border-ivory/10 text-center">
                    <div className="text-[16px] font-bold text-gold">{coachData.summary.paidCount}</div>
                    <div className="text-[9px] text-ivory/40 uppercase">Paid</div>
                  </div>
                  <div className="rounded-lg p-2 bg-ivory/5 border border-ivory/10 text-center">
                    <div className="text-[16px] font-bold text-gold">{coachData.summary.sentMessages}</div>
                    <div className="text-[9px] text-ivory/40 uppercase">Sent</div>
                  </div>
                  <div className="rounded-lg p-2 bg-ivory/5 border border-ivory/10 text-center">
                    <div className="text-[16px] font-bold text-gold">{coachData.summary.replyRate?.toFixed(1)}%</div>
                    <div className="text-[9px] text-ivory/40 uppercase">Reply</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat tab */}
          {tab === "chat" && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {/* Memory recap — where you left off */}
                {memory && (memory.resume?.length > 0 || pendingDrafts > 0) && (
                  <div className="rounded-lg p-3 bg-gold/[0.07] border border-gold/15 text-[12px]">
                    <div className="text-[10px] text-gold/80 uppercase tracking-widest mb-1.5">Where you left off</div>
                    {memory.resume?.slice(0, 2).map((r, i) => (
                      <div key={i} className="text-ivory/70 mb-1 flex items-start gap-1.5">
                        <ArrowRight className="w-3 h-3 text-gold mt-0.5 shrink-0" />
                        {r.action}
                      </div>
                    ))}
                    {pendingDrafts > 0 && (
                      <button onClick={goToQueue} className="mt-1.5 inline-flex items-center gap-1.5 text-gold hover:underline">
                        <Mail className="w-3 h-3" /> Review {pendingDrafts} email{pendingDrafts === 1 ? "" : "s"} awaiting approval
                      </button>
                    )}
                  </div>
                )}

                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "self-end rounded-2xl rounded-tr-sm bg-gold/15 text-ivory border border-gold/10"
                        : "self-start rounded-2xl rounded-tl-sm bg-ivory/5 text-ivory border border-ivory/[0.06]"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}

                {/* Live step timeline */}
                {steps.length > 0 && (
                  <div className="self-start w-full rounded-lg border border-ivory/[0.08] bg-ivory/[0.03] p-2.5 flex flex-col gap-1.5">
                    {steps.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11.5px]">
                        {s.status === "error" ? (
                          <AlertTriangle className="w-3 h-3 text-[#C74A4A] mt-0.5 shrink-0" />
                        ) : (
                          <CheckCircle className="w-3 h-3 text-[#4A9E6A] mt-0.5 shrink-0" />
                        )}
                        <div>
                          <span className="text-ivory/80 font-medium">{s.label}</span>
                          {s.detail && <span className="text-ivory/45"> — {s.detail}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Approval-queue CTA after a drafting run */}
                {runStatus === "done" && pendingDrafts > 0 && (
                  <button
                    onClick={goToQueue}
                    className="self-start inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-gold text-ink text-[12px] font-medium hover:opacity-90 transition-all"
                  >
                    <Mail className="w-3.5 h-3.5" /> Review {pendingDrafts} email{pendingDrafts === 1 ? "" : "s"} in the approval queue
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {loading && (
                  <div className="self-start flex items-center gap-2 px-3 py-2 text-[12px] text-ivory/50">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gold" />
                    {steps.length > 0 ? "Elizabeth is working…" : "Elizabeth is thinking…"}
                  </div>
                )}
                {error && !loading && (
                  <div className="self-center text-[11px] text-red-300/80 py-1">{error}</div>
                )}
              </div>
              <div className="px-4 pt-2 pb-3 border-t border-gold/10">
                {pendingQuestion && runStatus === "awaiting_input" && (
                  <div className="text-[11px] text-gold/80 mb-2 px-1">Elizabeth needs your input — reply below.</div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={runStatus === "awaiting_input" ? "Your answer…" : "Tell Elizabeth what to do…"}
                    disabled={loading}
                    className="flex-1 px-3.5 py-2.5 text-[13px] bg-ivory/5 border border-ivory/10 rounded-full text-ivory placeholder:text-ivory/30 outline-none focus:border-gold/30 transition-colors disabled:opacity-50"
                  />
                  <button
                    onClick={send}
                    disabled={loading || !input.trim()}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      input.trim() && !loading ? "bg-gold text-ink hover:opacity-90 cursor-pointer" : "bg-gold/20 text-ink/40 cursor-default"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
