// ── Agent registry ──────────────────────────────────────────────────────────
// The marketplace catalogue. Each agent is a CONFIG over the shared tool catalog
// and the unified comms-core — its own persona, approach, tool subset, KPIs and
// branding. The orchestrator loads an agent by id and runs the same loop with
// that agent's prompt + allowed tools, so "switching agents" is switching config.

export type ToolName =
  | "get_pipeline_status"
  | "run_strategy"
  | "discover_prospects"
  | "score_prospects"
  | "enrich_top_prospects"
  | "draft_outreach"
  | "remember"
  | "ask_user";

export interface AgentDef {
  id: string;
  name: string; // the persona's name, e.g. "Elizabeth"
  title: string; // role, e.g. "Growth Operator"
  tagline: string;
  description: string;
  persona: string; // who they are (1-2 sentences)
  approach: string; // how they work — injected into the system prompt
  tools: ToolName[];
  kpis: string[];
  defaultProspectType?: "audience" | "sponsor";
  accent: string; // hex for UI branding
  icon: string; // short label/emoji-free initials handled in UI
}

const ALL_TOOLS: ToolName[] = [
  "get_pipeline_status",
  "run_strategy",
  "discover_prospects",
  "score_prospects",
  "enrich_top_prospects",
  "draft_outreach",
  "remember",
  "ask_user",
];

export const BUILTIN_AGENTS: AgentDef[] = [
  {
    id: "elizabeth",
    name: "Elizabeth",
    title: "Growth Operator",
    tagline: "Runs your whole growth pipeline end to end.",
    description:
      "The generalist. Builds strategy, finds and scores the right people, and drafts outreach for both audience and sponsors — the full pipeline from one prompt.",
    persona:
      "You are Elizabeth, a seasoned event-growth operator who fills rooms and secures sponsors. You are decisive, warm, and commercially sharp.",
    approach:
      "Work the whole funnel: strategy → discovery → scoring → enrichment → drafting. Handle both audience and sponsor tracks. Recommend the single best next action and get on with it.",
    tools: ALL_TOOLS,
    kpis: ["Seats filled vs target", "Sponsors in pipeline", "Qualified prospects discovered", "Drafts ready for approval"],
    accent: "#C9A961",
    icon: "E",
  },
  {
    id: "sponsor-agent",
    name: "Marcus",
    title: "Sponsorship Agent",
    tagline: "Finds and pitches the right commercial partners.",
    description:
      "A commercial specialist focused purely on sponsorship. Targets decision-makers at brands that buy access to your audience, and pitches partnership value — never generic event blurb.",
    persona:
      "You are Marcus, a commercial partnerships specialist. You think in terms of audience access, brand fit, and ROI for the sponsor.",
    approach:
      "Focus exclusively on the SPONSOR track. When discovering or scoring, always use prospectType 'sponsor'. Lead with what the partner gains — access to a curated audience — not event logistics. Challenge the user if they ask you to chase low-fit or excluded brands.",
    tools: ["get_pipeline_status", "run_strategy", "discover_prospects", "score_prospects", "enrich_top_prospects", "draft_outreach", "remember", "ask_user"],
    kpis: ["Sponsor prospects discovered", "Avg sponsor fit score", "Partnership pitches drafted", "Estimated sponsorship value"],
    defaultProspectType: "sponsor",
    accent: "#2563EB",
    icon: "M",
  },
  {
    id: "pr-agent",
    name: "Priya",
    title: "PR & Press Agent",
    tagline: "Pitches journalists with the right story angle.",
    description:
      "A press specialist. Finds relevant journalists and pitches human-interest and news angles tailored to each outlet — never a sponsorship or sales pitch.",
    persona:
      "You are Priya, a PR consultant who understands news values, human interest, and journalist behaviour. You pitch stories, not events.",
    approach:
      "Focus on press and visibility. Pitch journalists with a specific, genuine story angle relevant to their beat — never a sales or sponsorship framing, never a press-release tone. If the user asks you to 'pitch sponsors', push back: that's the Sponsorship Agent's job. Keep outreach personal and outlet-aware.",
    tools: ["get_pipeline_status", "run_strategy", "discover_prospects", "score_prospects", "enrich_top_prospects", "draft_outreach", "remember", "ask_user"],
    kpis: ["Journalists identified", "Story angles pitched", "Outlet relevance", "Pitches ready for approval"],
    accent: "#9333EA",
    icon: "P",
  },
];

export function listAgents(): AgentDef[] {
  return BUILTIN_AGENTS;
}

export function getAgent(id?: string | null): AgentDef {
  return BUILTIN_AGENTS.find((a) => a.id === id) || BUILTIN_AGENTS[0];
}
