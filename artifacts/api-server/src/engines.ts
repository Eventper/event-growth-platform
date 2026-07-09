// ── Branded AI engines ──────────────────────────────────────────────────────
// The platform never exposes a raw model name ("claude-opus", "gpt-4o") or the
// word "AI" to a user. Instead every model tier is presented as a *named engine*
// with a role the user understands. This is two vision points at once:
//   #7 "never expose raw AI" — users see "Reasoning Engine", not a model slug.
//   #8 "multi-model orchestration" — each engine is a distinct model tier, and
//       a piece of work is routed to the right one (reason on the strongest,
//       draft on the mid-tier, classify on the cheap-and-fast one).
//
// MODELS (ai-shared) stays the single source of truth for the actual slugs;
// this layer is the human-facing mapping on top of it.

import { MODELS } from "./ai-shared";

export type EngineId = "reasoning" | "editorial" | "research" | "quality";

export interface EngineDef {
  id: EngineId;
  name: string; // user-facing name — never a model slug
  role: string; // one line: what this engine is for
  model: string | null; // underlying model slug, or null for deterministic engines
  accent: string; // hex for UI badges
}

// The engine catalogue. Order = the pipeline order a communication flows through.
export const ENGINES: Record<EngineId, EngineDef> = {
  reasoning: {
    id: "reasoning",
    name: "Reasoning Engine",
    role: "Plans strategy, weighs angles, and orchestrates the work",
    model: MODELS.orchestrator, // strongest tier
    accent: "#C9A961",
  },
  editorial: {
    id: "editorial",
    name: "Editorial Engine",
    role: "Writes and refines the communication in the brand voice",
    model: MODELS.drafting,
    accent: "#2563EB",
  },
  research: {
    id: "research",
    name: "Research Engine",
    role: "Scores fit, classifies prospects, and scans the market",
    model: MODELS.classify, // cheap-and-fast tier
    accent: "#9333EA",
  },
  quality: {
    id: "quality",
    name: "Quality Engine",
    role: "Grades every draft against ten editorial standards",
    model: null, // deterministic scorecard — no model call
    accent: "#4A9E6A",
  },
};

export const ENGINE_LIST: EngineDef[] = Object.values(ENGINES);

// Map a raw model slug back to the engine that owns it — used to brand spend
// logs and to tag which engines touched a given draft.
export function engineForModel(model: string | null | undefined): EngineDef | null {
  if (!model) return null;
  return ENGINE_LIST.find((e) => e.model === model) || null;
}

// The user-facing name for a model slug, e.g. for spend dashboards. Falls back
// to a neutral label rather than ever leaking the slug.
export function engineNameForModel(model: string | null | undefined): string {
  return engineForModel(model)?.name || "Communications Engine";
}

// A compact public descriptor of an engine for embedding in draft metadata /
// API responses (no internal model slug).
export function publicEngine(id: EngineId): { id: EngineId; name: string; role: string; accent: string } {
  const e = ENGINES[id];
  return { id: e.id, name: e.name, role: e.role, accent: e.accent };
}

// The Quality Engine's published rubric: the ten dimensions it grades, with the
// human-facing label for each raw key produced by runQualityGate(). Surfaced as
// a scorecard so the user sees *why* a draft scored what it did.
export const QUALITY_DIMENSIONS: Array<{ key: string; label: string; hint: string }> = [
  { key: "hook", label: "Hook", hint: "Does the opening earn attention?" },
  { key: "relevant", label: "Relevance", hint: "Is it about this recipient, not us?" },
  { key: "value", label: "Value", hint: "Is the recipient's gain explicit?" },
  { key: "subjectQuality", label: "Subject", hint: "An editorial hook, not a label?" },
  { key: "human", label: "Human tone", hint: "Reads like a person, not a template?" },
  { key: "generic", label: "Originality", hint: "Free of generic filler phrases?" },
  { key: "brand", label: "Brand fit", hint: "Honours the brand voice and rules?" },
  { key: "cta", label: "Call to action", hint: "One clear, soft next step?" },
  { key: "infoDump", label: "Focus", hint: "No information dump — links instead?" },
  { key: "pricing", label: "Compliance", hint: "No pricing/dates unless permitted?" },
];

// Build the public scorecard from a runQualityGate() result.
export function buildScorecard(quality: any): {
  overall: number;
  passed: boolean;
  dimensions: Array<{ key: string; label: string; hint: string; score: number }>;
} {
  return {
    overall: typeof quality?.total === "number" ? quality.total : 0,
    passed: !!quality?.passed,
    dimensions: QUALITY_DIMENSIONS.map((d) => ({ ...d, score: typeof quality?.[d.key] === "number" ? quality[d.key] : 0 })),
  };
}
