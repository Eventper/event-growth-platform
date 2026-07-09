import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, ChevronDown, ChevronUp, CheckCircle, BookOpen, 
  Target, Users, Shield, Heart, DollarSign, Link, Monitor,
  AlertTriangle, Lock, FileCheck, TrendingUp, BarChart,
  FileText, Star, UserCheck, LogOut, ClipboardCheck, Leaf,
  GraduationCap, Receipt
} from "lucide-react";
import { BID_WRITING_GUIDE, GUIDE_CATEGORIES, type GuideCard } from "@/data/bid-writing-guide";

const iconMap: Record<string, any> = {
  Target, Users, Shield, Heart, DollarSign, Link, Monitor,
  AlertTriangle, Lock, FileCheck, TrendingUp, BarChart,
  FileText, Star, UserCheck, LogOut, ClipboardCheck, Leaf,
  GraduationCap, CheckCircle, BookOpen, Receipt,
  HardHat: Shield, Gantt: BarChart, Accessibility: Users,
};

const categoryColors: Record<string, string> = {
  "Getting Started": "bg-blue-500/20 text-blue-300",
  "Understanding the Buyer": "bg-purple-500/20 text-purple-300",
  "Compliance & Standards": "bg-red-500/20 text-red-300",
  "Delivery & Operations": "bg-green-500/20 text-green-300",
  "Commercial": "bg-amber-500/20 text-amber-300",
  "Quality & Evidence": "bg-indigo-500/20 text-indigo-300",
};

function GuideCardComponent({ card, isCompleted, onToggleComplete }: {
  card: GuideCard;
  isCompleted: boolean;
  onToggleComplete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const IconComponent = iconMap[card.icon] || BookOpen;

  return (
    <Card className={`border transition-all duration-200 ${isCompleted ? 'border-green-500/30 bg-green-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'}`}>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-green-500/20' : 'bg-slate-700'}`}>
              <IconComponent className={`w-5 h-5 ${isCompleted ? 'text-green-400' : 'text-slate-300'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-sm font-bold text-white">{card.title}</CardTitle>
                {isCompleted && <CheckCircle className="w-4 h-4 text-green-400" />}
              </div>
              <Badge className={`text-[10px] ${categoryColors[card.category] || 'bg-slate-700 text-slate-300'}`}>
                {card.category}
              </Badge>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">{card.summary}</p>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">What You'll Learn</h4>
            <ul className="space-y-2">
              {card.questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-blue-300">✓</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-green-300 uppercase tracking-wider mb-2">Key Tips</h4>
            <ul className="space-y-1">
              {card.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
                  <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2 pt-2">
            {card.link && (
              <a
                href={card.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button
                  size="sm"
                  className="text-xs w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                >
                  📖 Read Official Guidance ↗
                </Button>
              </a>
            )}
            <Button
              size="sm"
              variant={isCompleted ? "outline" : "default"}
              className={`text-xs ${isCompleted ? 'border-green-500 text-green-300 hover:bg-green-500/10' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
              onClick={(e) => { e.stopPropagation(); onToggleComplete(card.id); }}
            >
              {isCompleted ? "Mark as Unread" : "Mark as Completed"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function TenderKnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [completedCards, setCompletedCards] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("kb_completed_cards");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const toggleComplete = (id: string) => {
    setCompletedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("kb_completed_cards", JSON.stringify([...next]));
      return next;
    });
  };

  const filtered = BID_WRITING_GUIDE.filter(card => {
    const matchesCategory = activeCategory === "All" || card.category === activeCategory;
    const matchesSearch = !searchQuery || 
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.questions.some(q => q.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const completedCount = completedCards.size;
  const totalCount = BID_WRITING_GUIDE.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Knowledge Base</h2>
          <p className="text-sm text-slate-300">Bid writing guides, training materials, and best practices for winning tenders.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/20 rounded-lg px-4 py-2 text-center border border-blue-500/30">
            <p className="text-2xl font-bold text-blue-300">{progressPercent}%</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Completed</p>
          </div>
          <div className="bg-green-500/20 rounded-lg px-4 py-2 text-center border border-green-500/30">
            <p className="text-2xl font-bold text-green-300">{completedCount}/{totalCount}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Cards Read</p>
          </div>
        </div>
      </div>

      <div className="w-full bg-slate-700/50 rounded-full h-2">
        <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search guides, questions, tips..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className={`text-xs ${activeCategory === "All" ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'}`}
          onClick={() => setActiveCategory("All")}
        >
          All ({BID_WRITING_GUIDE.length})
        </Button>
        {GUIDE_CATEGORIES.map(cat => {
          const count = BID_WRITING_GUIDE.filter(c => c.category === cat).length;
          return (
            <Button
              key={cat}
              size="sm"
              className={`text-xs ${activeCategory === cat ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat} ({count})
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(card => (
          <GuideCardComponent
            key={card.id}
            card={card}
            isCompleted={completedCards.has(card.id)}
            onToggleComplete={toggleComplete}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto text-slate-500 mb-4" />
          <p className="text-slate-300">No guides found matching your search.</p>
        </div>
      )}
    </div>
  );
}
