import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X, Send, Loader2, Heart, MessageCircleHeart, Minimize2 } from "lucide-react";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface FormHelperBotProps {
  formContext: string;
  welcomeMessage?: string;
  suggestedQuestions?: string[];
}

const FRIENDLY_GREETINGS = [
  "Hey there! Need a hand?",
  "Hi! I'm here if you need help",
  "Hello! Ask me anything",
  "Hi! Let me help you with this",
];

const TYPING_PHRASES = [
  "Thinking...",
  "Let me check that for you...",
  "Working on it...",
  "One moment...",
];

export default function FormHelperBot({ 
  formContext, 
  welcomeMessage,
  suggestedQuestions 
}: FormHelperBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const [typingPhrase, setTypingPhrase] = useState("Thinking...");
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const defaultWelcome = welcomeMessage || "Hey! I'm Perfekt, your friendly Event Perfekt assistant. I know everything about this platform and I'm here to help you every step of the way. Ask me absolutely anything!";

  const defaultSuggestions = suggestedQuestions || [
    "What information do I need?",
    "Can you explain this field?",
    "What happens after I submit?"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isLoading) {
      setTypingPhrase(TYPING_PHRASES[Math.floor(Math.random() * TYPING_PHRASES.length)]);
    }
  }, [isLoading]);

  const showRandomBubble = useCallback(() => {
    if (hasInteracted || isOpen) return;
    const text = FRIENDLY_GREETINGS[Math.floor(Math.random() * FRIENDLY_GREETINGS.length)];
    setBubbleText(text);
    setShowBubble(true);
    setTimeout(() => setShowBubble(false), 5000);
  }, [hasInteracted, isOpen]);

  useEffect(() => {
    const initialDelay = setTimeout(() => showRandomBubble(), 2000);
    bubbleTimerRef.current = setInterval(() => showRandomBubble(), 25000);
    return () => {
      clearTimeout(initialDelay);
      if (bubbleTimerRef.current) clearInterval(bubbleTimerRef.current);
    };
  }, [showRandomBubble]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setShowBubble(false);
    setHasInteracted(true);
    if (bubbleTimerRef.current) clearInterval(bubbleTimerRef.current);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/form-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text.trim(), 
          formContext,
          history: messages.slice(-14)
        }),
      });

      if (!res.ok) throw new Error("Failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullResponse += data.content;
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", content: fullResponse };
                    return updated;
                  });
                }
              } catch {}
            }
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Oh no, I'm having a little trouble right now! Please try again in a moment, or drop us an email at admin@eventperfekt.com and we'll sort you out." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl transition-all hover:scale-105"
          style={{backgroundColor: '#330311', border: '2px solid rgba(255,255,255,0.15)'}}
        >
          <img src={eventPerfektLogo} alt="" className="w-6 h-6 rounded-full" />
          <span className="text-white text-sm font-medium">Chat with Perfekt</span>
          {messages.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
          {showBubble && (
            <div 
              className="bg-white rounded-2xl shadow-xl px-4 py-3 max-w-[240px] relative"
              style={{
                border: '2px solid #330311',
                animation: 'slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              <div 
                className="absolute -right-2 bottom-4 w-3 h-3 rotate-45 bg-white"
                style={{borderRight: '2px solid #330311', borderBottom: '2px solid #330311'}}
              />
              <p className="text-sm font-medium" style={{color: '#330311'}}>{bubbleText}</p>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Heart className="w-3 h-3 text-pink-400 fill-pink-400" />
                Your friendly EP assistant
              </p>
            </div>
          )}
          <button
            onClick={handleOpen}
            className="group w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #330311 0%, #5a0a20 50%, #8B1538 100%)',
              border: '3px solid rgba(255,255,255,0.2)'
            }}
          >
            <img 
              src={eventPerfektLogo} 
              alt="Chat with Perfekt" 
              className="w-10 h-10 rounded-full ring-2 ring-white/30 group-hover:ring-white/60 transition-all"
            />
            <span 
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white animate-pulse" 
              style={{backgroundColor: '#22c55e'}} 
            />
          </button>
        </div>
      )}

      {isOpen && (
        <div 
          className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            backgroundColor: 'white',
            border: '2px solid #330311',
            maxHeight: 'min(560px, calc(100vh - 4rem))',
            animation: 'slideInUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          <div 
            className="px-4 py-3 flex items-center justify-between flex-shrink-0"
            style={{background: 'linear-gradient(135deg, #330311, #5a0a20)'}}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={eventPerfektLogo} alt="" className="w-9 h-9 rounded-full ring-2 ring-white/30" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#330311]" />
              </div>
              <div>
                <p className="text-white font-bold text-sm flex items-center gap-1.5">
                  Perfekt
                  <MessageCircleHeart className="w-3.5 h-3.5 text-pink-300" />
                </p>
                <p className="text-white/50 text-xs">
                  {isLoading ? (
                    <span className="flex items-center gap-1">
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-green-400 animate-bounce" style={{animationDelay: '0ms'}} />
                        <span className="w-1 h-1 rounded-full bg-green-400 animate-bounce" style={{animationDelay: '150ms'}} />
                        <span className="w-1 h-1 rounded-full bg-green-400 animate-bounce" style={{animationDelay: '300ms'}} />
                      </span>
                      typing...
                    </span>
                  ) : "Online - Ask me anything!"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMinimized(true)} 
                className="text-white/50 hover:text-white p-1 rounded transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-white/50 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{minHeight: '220px', background: 'linear-gradient(180deg, #fdf8f9 0%, #fff 100%)'}}>
            <div className="flex gap-2.5">
              <img src={eventPerfektLogo} alt="" className="w-8 h-8 rounded-full flex-shrink-0 ring-1 ring-gray-200 mt-0.5" />
              <div>
                <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm" style={{border: '1px solid #f0e8ea'}}>
                  <p className="text-sm text-gray-700 leading-relaxed">{defaultWelcome}</p>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 ml-1">Just now</p>
              </div>
            </div>

            {messages.length === 0 && (
              <div className="space-y-2 mt-2">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Heart className="w-3 h-3 text-pink-300 fill-pink-300" />
                  Popular questions
                </p>
                {defaultSuggestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="block w-full text-left text-sm px-4 py-2.5 rounded-xl transition-all hover:shadow-sm active:scale-[0.98]"
                    style={{
                      background: 'white',
                      border: '1px solid #f0e8ea',
                      color: '#330311',
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-pink-400">?</span>
                      {q}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2.5", msg.role === "user" && "justify-end")}>
                {msg.role === "assistant" && (
                  <img src={eventPerfektLogo} alt="" className="w-8 h-8 rounded-full flex-shrink-0 ring-1 ring-gray-200 mt-0.5" />
                )}
                <div className={msg.role === "user" ? "max-w-[80%]" : "max-w-[85%]"}>
                  <div 
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
                      msg.role === "user" 
                        ? "rounded-tr-md text-white shadow-sm" 
                        : "rounded-tl-md bg-white shadow-sm"
                    )}
                    style={
                      msg.role === "user" 
                        ? {background: 'linear-gradient(135deg, #330311, #5a0a20)'} 
                        : {border: '1px solid #f0e8ea', color: '#374151'}
                    }
                  >
                    {msg.content || (isLoading && i === messages.length - 1 && (
                      <span className="flex items-center gap-2 text-gray-400 py-1">
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{animationDelay: '0ms'}} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{animationDelay: '150ms'}} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{animationDelay: '300ms'}} />
                        </span>
                        {typingPhrase}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 flex-shrink-0" style={{borderTop: '1px solid #f0e8ea', backgroundColor: '#fdf8f9'}}>
            <form 
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question here..."
                className="flex-1 text-sm rounded-xl border-gray-200 focus:border-[#330311] bg-white"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!input.trim() || isLoading}
                className="rounded-xl h-10 w-10 transition-all hover:scale-105"
                style={{background: input.trim() ? 'linear-gradient(135deg, #330311, #8B1538)' : '#d1d5db'}}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
              </Button>
            </form>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Powered by Event Perfekt Agent
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px) scale(0.9); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
