import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Zap, CheckCircle } from "lucide-react";

export interface ContactResult {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface Props {
  onSelect: (contact: ContactResult) => void;
  filled?: boolean;
  className?: string;
}

export default function ContactAutoFill({ onSelect, filled = false, className = "" }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/employees"] });
  const { data: allGuests = [] } = useQuery<any[]>({ queryKey: ["/api/guests/all"] });

  const sources = [
    ...employees.map((e: any) => ({
      id: `emp-${e.id}`,
      firstName: e.first_name || "",
      lastName: e.last_name || "",
      email: e.email || "",
      phone: e.phone || "",
      role: e.job_title || e.role || "",
      source: "Employee",
    })),
    ...(allGuests as any[]).map((g: any) => ({
      id: `guest-${g.id}`,
      firstName: g.firstName || g.first_name || "",
      lastName: g.lastName || g.last_name || "",
      email: g.email || "",
      phone: g.phone || "",
      role: g.group || "",
      source: "Guest",
    })),
  ];

  const results = query.trim().length > 0
    ? sources.filter(c => {
        const q = query.toLowerCase();
        return `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
          || c.email.toLowerCase().includes(q)
          || c.phone.includes(q)
          || c.role.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  const pick = (c: typeof sources[0]) => {
    onSelect({ firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone });
    setQuery(`${c.firstName} ${c.lastName}`);
    setOpen(false);
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4 text-yellow-400 flex-shrink-0" />
        <span className="text-yellow-400 text-xs font-bold uppercase tracking-wide">Quick Auto-Fill</span>
        <span className="text-gray-400 text-xs hidden sm:inline">Search employees or contacts</span>
      </div>
      <div ref={ref} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search by name, email or phone..."
            className="pl-9 bg-[#2a020d] border-[#4a0a1e] text-white placeholder:text-gray-500"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {open && results.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a0108] border border-[#4a0a1e] rounded-lg shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
            {results.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#330311] transition-colors text-left border-b border-[#4a0a1e] last:border-0"
              >
                <div className="w-9 h-9 rounded-full bg-[#330311] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {c.firstName?.[0]}{c.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{c.firstName} {c.lastName}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {c.email && <span className="truncate">{c.email}</span>}
                    {c.phone && <span>{c.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge className={`text-xs ${c.source === "Employee" ? "bg-blue-900 text-blue-200" : "bg-green-900 text-green-200"}`}>
                    {c.source}
                  </Badge>
                  <Zap className="h-3.5 w-3.5 text-yellow-400" />
                </div>
              </button>
            ))}
          </div>
        )}

        {open && query.trim().length > 0 && results.length === 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a0108] border border-[#4a0a1e] rounded-lg p-3 text-center text-gray-400 text-sm">
            No contacts found — fill in manually below
          </div>
        )}
      </div>

      {filled && (
        <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
          <CheckCircle className="h-3.5 w-3.5" />
          Fields auto-filled — review and adjust if needed
        </div>
      )}
    </div>
  );
}
