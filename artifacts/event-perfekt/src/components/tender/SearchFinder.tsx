// Tender Finder — Enhanced search UI with filters, tabs, stats, and export
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  BLUE, PURPLE, BG, CARD_BG, BORDER, GOLD, btn, card, label, input,
  fmtDate, fmtMoney, API, saasApiRequest,
} from "./ui";

const UK_REGIONS = ["UKC", "UKD", "UKE", "UKF", "UKG", "UKH", "UKI", "UKJ", "UKK", "UKL", "UKM", "UKN"];
const PROCEDURE_TYPES = ["Open", "Restricted", "Negotiated", "Competitive Dialogue", "Innovation Partnership"];
const CPV_CATEGORIES = ["Catering", "Conference", "Event", "Hospitality", "Professional Services", "Programme Management"];

export interface SearchFinderProps {
  country: "GB" | "NG";
  onTenderSelect?: (tender: any) => void;
}

interface SearchFilters {
  keywords: string[];
  categories: string[];
  regions: string[];
  procedure_types: string[];
  sme_only: boolean;
  date_from?: string;
  date_to?: string;
  status: "open" | "awarded" | "closed" | "all";
}

export default function SearchFinder({ country, onTenderSelect }: SearchFinderProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    keywords: [],
    categories: [],
    regions: [],
    procedure_types: [],
    sme_only: false,
    status: "open"
  });
  const [sort, setSort] = useState("best_match");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [filterPanel, setFilterPanel] = useState("keywords");
  const [newKeyword, setNewKeyword] = useState("");
  const [newRegion, setNewRegion] = useState("");

  // Load saved config
  const { data: config } = useQuery({
    queryKey: [`tender-config-${country}`],
    queryFn: async () => {
      const res = await saasApiRequest("GET", `${API}/saas-tender/config?country=${country}`);
      return res;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Search mutation
  const { data: searchData, isLoading: searching, mutate: search } = useMutation({
    mutationFn: async () => {
      const res = await saasApiRequest("POST", `${API}/saas-tender/search`, {
        query,
        country,
        filters,
        sort,
        page,
        pageSize
      });
      return res;
    }
  });

  // Save config mutation
  const { mutate: saveConfig } = useMutation({
    mutationFn: async (cfg: any) => {
      const res = await saasApiRequest("POST", `${API}/saas-tender/config`, {
        country,
        ...cfg
      });
      return res;
    }
  });

  // Auto-search on config/filter change
  useEffect(() => {
    search();
  }, [filters, sort, country]);

  const stats = searchData?.stats || { total: 0, open: 0, closing_soon: 0, average_value: 0 };
  const results = searchData?.results || [];
  const totalPages = searchData?.total_pages || 1;

  // Color by match score
  const scoreColor = (score: number) => {
    if (score >= 95) return "#10b981";
    if (score >= 80) return "#3b82f6";
    if (score >= 65) return "#f59e0b";
    if (score >= 50) return "#fbbf24";
    return "#9ca3af";
  };

  const scoreLabel = (score: number) => {
    if (score >= 95) return "Excellent";
    if (score >= 80) return "Strong";
    if (score >= 65) return "Good";
    if (score >= 50) return "Possible";
    return "Low";
  };

  // Export CSV
  const exportCsv = () => {
    const csv = [
      ["Title", "Buyer", "Value", "Published", "Deadline", "Status", "Source", "Match Score", "URL"].join(","),
      ...results.map((r: any) => [
        `"${(r.title || "").replace(/"/g, '""')}"`,
        r.buyer || "Unknown",
        r.value ? `£${r.value.toLocaleString()}` : "Not specified",
        r.published_date,
        r.deadline,
        r.status,
        r.source,
        r.match_score,
        r.url
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenders-${country}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const daysUntilDeadline = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Search Bar */}
      <div style={{ ...card(), borderLeft: `4px solid ${GOLD}`, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={label()}>TENDER SEARCH</label>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Keywords, buyer name, or tender title..."
              style={input()}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
          </div>
          <button onClick={() => search()} disabled={searching} style={{ ...btn(BLUE), opacity: searching ? 0.5 : 1 }}>
            {searching ? "Searching..." : "Search"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{ ...btn(CARD_BG), border: `1px solid ${BORDER}`, color: "#fff" }}
          >
            🔍 {showFilters ? "Hide" : "Show"} Filters
          </button>
          {config?.digest_email && (
            <span style={{ color: "#64748b", fontSize: 12, alignSelf: "center" }}>
              📧 Daily digest: {config.digest_email}
            </span>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <div style={{ ...card(), textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: "bold", color: GOLD }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Results Found</div>
        </div>
        <div style={{ ...card(), textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: "bold", color: BLUE }}>{stats.open}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Active Tenders</div>
        </div>
        <div style={{ ...card(), textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: "bold", color: "#f59e0b" }}>{stats.closing_soon}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Closing Soon (&lt;7 days)</div>
        </div>
        <div style={{ ...card(), textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: "bold", color: "#10b981" }}>£{Math.round(stats.average_value).toLocaleString()}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Average Value</div>
        </div>
      </div>

      {/* Status Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${BORDER}`, paddingBottom: 12 }}>
        {["all", "open", "awarded", "closed", "planned"].map((status) => (
          <button
            key={status}
            onClick={() => { setFilters({ ...filters, status: status as any }); setPage(1); }}
            style={{
              ...btn(filters.status === status ? BLUE : "transparent"),
              border: "none",
              color: filters.status === status ? "#fff" : "#94a3b8",
              textTransform: "capitalize",
              fontWeight: filters.status === status ? 600 : 400
            }}
          >
            {status === "all" ? "All" : status.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div style={{ ...card(), display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${BORDER}`, paddingBottom: 12, marginBottom: 12 }}>
            {["keywords", "regions", "procedure", "dates"].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPanel(p)}
                style={{
                  background: filterPanel === p ? BLUE : "transparent",
                  color: "#fff",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12
                }}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Keywords Filter */}
          {filterPanel === "keywords" && (
            <div>
              <label style={label()}>KEYWORDS</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add keyword..."
                  style={input()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newKeyword) {
                      setFilters({ ...filters, keywords: [...filters.keywords, newKeyword] });
                      setNewKeyword("");
                    }
                  }}
                />
                <button onClick={() => {
                  if (newKeyword) {
                    setFilters({ ...filters, keywords: [...filters.keywords, newKeyword] });
                    setNewKeyword("");
                  }
                }} style={{ ...btn(GOLD), width: 80 }}>Add</button>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {filters.keywords.map((k) => (
                  <button
                    key={k}
                    onClick={() => setFilters({ ...filters, keywords: filters.keywords.filter(x => x !== k) })}
                    style={{
                      background: GOLD,
                      color: "#000",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: "pointer"
                    }}
                  >
                    {k} ✕
                  </button>
                ))}
              </div>
              <label style={{ ...label(), marginTop: 12 }}>SME SUITABLE ONLY</label>
              <input
                type="checkbox"
                checked={filters.sme_only}
                onChange={(e) => setFilters({ ...filters, sme_only: e.target.checked })}
                style={{ cursor: "pointer" }}
              />
            </div>
          )}

          {/* Regions Filter */}
          {filterPanel === "regions" && (
            <div>
              <label style={label()}>UK REGIONS (ITL CODES)</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {UK_REGIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilters({
                      ...filters,
                      regions: filters.regions.includes(r)
                        ? filters.regions.filter(x => x !== r)
                        : [...filters.regions, r]
                    })}
                    style={{
                      background: filters.regions.includes(r) ? BLUE : CARD_BG,
                      border: `1px solid ${BORDER}`,
                      color: "#fff",
                      padding: "6px 12px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 12
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Procedure Type Filter */}
          {filterPanel === "procedure" && (
            <div>
              <label style={label()}>PROCEDURE TYPE</label>
              <div style={{ display: "grid", gap: 8 }}>
                {PROCEDURE_TYPES.map((p) => (
                  <label key={p} style={{ display: "flex", gap: 8, alignItems: "center", color: "#fff", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={filters.procedure_types.includes(p)}
                      onChange={(e) => setFilters({
                        ...filters,
                        procedure_types: e.target.checked
                          ? [...filters.procedure_types, p]
                          : filters.procedure_types.filter(x => x !== p)
                      })}
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Dates Filter */}
          {filterPanel === "dates" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={label()}>PUBLISHED FROM</label>
                <input
                  type="date"
                  value={filters.date_from || ""}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  style={input()}
                />
              </div>
              <div>
                <label style={label()}>PUBLISHED TO</label>
                <input
                  type="date"
                  value={filters.date_to || ""}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  style={input()}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sort & Controls */}
      <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <label style={label()}>SORT BY:</label>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            style={input()}
          >
            <option value="best_match">Best Match (Score)</option>
            <option value="newest">Newest First</option>
            <option value="deadline_soonest">Deadline Soonest</option>
            <option value="value_high">Value Highest</option>
          </select>
        </div>
        <button onClick={exportCsv} disabled={results.length === 0} style={{ ...btn(GOLD), opacity: results.length === 0 ? 0.5 : 1 }}>
          📥 Export CSV
        </button>
      </div>

      {/* Results Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          color: "#e2e8f0"
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Title</th>
              <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Buyer</th>
              <th style={{ padding: 12, textAlign: "center", fontWeight: 600 }}>Value</th>
              <th style={{ padding: 12, textAlign: "center", fontWeight: 600 }}>Deadline</th>
              <th style={{ padding: 12, textAlign: "center", fontWeight: 600 }}>Match</th>
              <th style={{ padding: 12, textAlign: "center", fontWeight: 600 }}>Source</th>
              <th style={{ padding: 12, textAlign: "center", fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
                  {searching ? "Searching..." : "No results found. Try different filters."}
                </td>
              </tr>
            ) : (
              results.map((r: any, idx: number) => {
                const daysLeft = daysUntilDeadline(r.deadline);
                const deadlineStyle = daysLeft <= 7 ? { color: "#ef4444", fontWeight: 600 } : {};
                return (
                  <tr key={idx} style={{ borderBottom: `1px solid ${BORDER}`, background: idx % 2 === 0 ? "transparent" : "rgba(15,23,42,0.5)" }}>
                    <td style={{ padding: 12, maxWidth: 300 }}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: BLUE, textDecoration: "none", fontWeight: 500 }}>
                        {r.title}
                      </a>
                    </td>
                    <td style={{ padding: 12 }}>{r.buyer}</td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      {r.value ? `£${Math.round(r.value).toLocaleString()}` : "Not specified"}
                    </td>
                    <td style={{ padding: 12, textAlign: "center", ...deadlineStyle }}>
                      {r.deadline}
                      <div style={{ fontSize: 11, color: daysLeft <= 7 ? "#fca5a5" : "#64748b" }}>
                        {daysLeft} days
                      </div>
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      <span style={{
                        background: scoreColor(r.match_score),
                        color: r.match_score >= 65 ? "#000" : "#fff",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: 11
                      }}>
                        {r.match_score}% {scoreLabel(r.match_score)}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: "center", fontSize: 11 }}>
                      <span style={{ background: r.source === "Contracts Finder" ? BLUE : PURPLE, padding: "4px 8px", borderRadius: 4 }}>
                        {r.source === "Contracts Finder" ? "CF" : "FaT"}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      <button
                        onClick={() => onTenderSelect?.(r)}
                        style={{ ...btn(GOLD), fontSize: 11, padding: "4px 8px" }}
                      >
                        Add to Pipeline
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          style={{ ...btn(BLUE), opacity: page === 1 ? 0.5 : 1 }}
        >
          ← Previous
        </button>
        <span style={{ color: "#94a3b8" }}>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          style={{ ...btn(BLUE), opacity: page >= totalPages ? 0.5 : 1 }}
        >
          Next →
        </button>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          style={input()}
        >
          <option value="10">10 per page</option>
          <option value="20">20 per page</option>
          <option value="50">50 per page</option>
        </select>
      </div>
    </div>
  );
}
