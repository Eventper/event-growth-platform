// ── Hierarchical memory service ─────────────────────────────────────────────
// Shared institutional memory for the platform. Facts are stored at a scope —
// global (the account) → brand (a client) → campaign / event → conversation (a
// run) — and recalled as a merged cascade where the most-specific scope wins.
// Both Elizabeth (orchestrator) and the comms-core read this for context.

import { db } from "./db";
import { and, eq, or, desc, sql } from "drizzle-orm";
import { growthMemory } from "@workspace/db";

export type MemoryScope = "global" | "workspace" | "brand" | "campaign" | "event" | "conversation";

// Broad → narrow. Narrower scopes override/refine broader ones. This mirrors the
// platform hierarchy: Platform(account) → Workspace → Brand → Campaign → Event →
// Communication(conversation).
const SCOPE_ORDER: MemoryScope[] = ["global", "workspace", "brand", "campaign", "event", "conversation"];
const SCOPE_LABEL: Record<MemoryScope, string> = {
  global: "Account",
  workspace: "Workspace",
  brand: "Brand",
  campaign: "Campaign",
  event: "Event",
  conversation: "This conversation",
};

export interface ScopeRef {
  scope: MemoryScope;
  scopeId: string;
}

export interface MemoryItem {
  scope: MemoryScope;
  scopeId: string;
  kind: string;
  key: string | null;
  content: string;
  weight: number;
}

// Build the ordered scope list for a request. `global` is keyed by ownerId.
export function scopeChain(ownerId: string, ids: { workspaceId?: string | null; brandId?: string | null; campaignId?: string | null; eventId?: string | null; conversationId?: string | null }): ScopeRef[] {
  const chain: ScopeRef[] = [{ scope: "global", scopeId: ownerId }];
  if (ids.workspaceId) chain.push({ scope: "workspace", scopeId: ids.workspaceId });
  if (ids.brandId) chain.push({ scope: "brand", scopeId: ids.brandId });
  if (ids.campaignId) chain.push({ scope: "campaign", scopeId: ids.campaignId });
  if (ids.eventId) chain.push({ scope: "event", scopeId: ids.eventId });
  if (ids.conversationId) chain.push({ scope: "conversation", scopeId: ids.conversationId });
  return chain;
}

// Fetch raw memory items across the cascade, ordered broad→narrow then by weight.
export async function recallMemoryItems(ownerId: string, chain: ScopeRef[], limit = 40): Promise<MemoryItem[]> {
  if (!chain.length) return [];
  const matchers = chain.map((c) => and(eq(growthMemory.scope, c.scope), eq(growthMemory.scopeId, c.scopeId)));
  const rows = await db
    .select()
    .from(growthMemory)
    .where(and(eq(growthMemory.ownerId, ownerId), or(...matchers)))
    .orderBy(desc(growthMemory.weight), desc(growthMemory.updatedAt))
    .limit(limit);
  const order = (s: string) => SCOPE_ORDER.indexOf(s as MemoryScope);
  return rows
    .map((r) => ({ scope: r.scope as MemoryScope, scopeId: r.scopeId, kind: r.kind, key: r.key, content: r.content, weight: r.weight }))
    .sort((a, b) => order(a.scope) - order(b.scope) || b.weight - a.weight);
}

// Recall the cascade formatted as a prompt-ready block (most-specific last so it
// reads as the final, overriding word).
export async function recallMemory(ownerId: string, chain: ScopeRef[], limit = 40): Promise<string> {
  const items = await recallMemoryItems(ownerId, chain, limit);
  if (!items.length) return "";
  const lines: string[] = ["INSTITUTIONAL MEMORY (more specific levels override more general ones):"];
  for (const scope of SCOPE_ORDER) {
    const group = items.filter((i) => i.scope === scope);
    if (!group.length) continue;
    lines.push(`\n[${SCOPE_LABEL[scope]}]`);
    for (const i of group) lines.push(`- ${i.key ? i.key + ": " : ""}${i.content}`);
  }
  return lines.join("\n");
}

// Write a memory. If `key` is provided, upsert within (owner, scope, scopeId, key)
// so preferences stay single-valued; otherwise append a new fact.
export async function upsertMemory(input: {
  ownerId: string;
  scope: MemoryScope;
  scopeId: string;
  content: string;
  kind?: string;
  key?: string;
  weight?: number;
  source?: string;
}): Promise<void> {
  const { ownerId, scope, scopeId, content } = input;
  const kind = input.kind || "fact";
  const weight = input.weight ?? 1;
  const source = input.source || "system";

  if (input.key) {
    const existing = await db
      .select()
      .from(growthMemory)
      .where(
        and(
          eq(growthMemory.ownerId, ownerId),
          eq(growthMemory.scope, scope),
          eq(growthMemory.scopeId, scopeId),
          eq(growthMemory.key, input.key)
        )
      );
    if (existing.length) {
      await db
        .update(growthMemory)
        .set({ content, kind, weight, source, updatedAt: new Date() })
        .where(eq(growthMemory.id, existing[0].id));
      return;
    }
  }
  await db.insert(growthMemory).values({ ownerId, scope, scopeId, kind, key: input.key || null, content, weight, source });
}

// Convenience counts (e.g. for surfacing "Elizabeth remembers N things").
export async function memoryCount(ownerId: string): Promise<number> {
  const [row] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(growthMemory).where(eq(growthMemory.ownerId, ownerId));
  return row?.c || 0;
}
