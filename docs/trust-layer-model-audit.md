# Trust Layer Model Audit Report

## Current Generation Paths

| Path | Current Model | Task Type | Should Be | Status |
|------|---------------|-----------|-----------|--------|
| `ai_test` | `openai/gpt-4o-mini` | Mechanical (test) | Cheap model | ✅ |
| `wizard_interview` | `openai/gpt-4o` | Strategy/Voice | Claude (voice) | ❌ |
| `wizard_market_scan` | `openai/gpt-4o` | Strategy/Voice | Claude (voice) | ❌ |
| `strategy_pack` | `openai/gpt-4o` | Strategy/Voice | Claude (voice) | ❌ |
| `prospect_score` | `openai/gpt-4o` | Mechanical (scoring) | Cheap model | ⚠️ |
| `relationship_intelligence` | `openai/gpt-4o` | Strategy/Insights | Claude (voice) | ❌ |
| `outreach_generate` | `anthropic/claude-sonnet-4` | Voice | Claude (voice) | ✅ |
| `template_generate` | `anthropic/claude-sonnet-4` | Voice | Claude (voice) | ✅ |
| `outreach_refine` | `openai/gpt-4o` | Voice (rewrite) | Claude (voice) | ❌ |
| `outreach_score` | `openai/gpt-4o` | Mechanical (score) | Cheap model | ⚠️ |
| `presentation_generate` | `openai/gpt-4o` | Voice | Claude (voice) | ❌ |
| `market_intelligence` | `anthropic/claude-3.5-sonnet` | Research | Claude (voice) | ❌ (wrong model name) |
| `reply_classify` | `openai/gpt-4o` | Mechanical (classify) | Cheap model | ⚠️ |
| `learning_insights` | `openai/gpt-4o` | Mechanical (synthesis) | Cheap model | ⚠️ |
| `elizabeth_chat` | (inline call) | Mechanical | Claude (voice) | ✅ |
| `elizabeth_coach` | (inline call) | Strategy | Claude (voice) | ✅ |

## Model Definitions

- **Voice model**: `anthropic/claude-sonnet-4` — All strategy, copy, messaging, presentation, market intelligence
- **Cheap model**: `openai/gpt-4o-mini` — Scoring, classification, deduplication, mechanical synthesis, reply classification

## Changes Required

### Switch to Claude (voice/strategy):
1. `wizard_interview` → `anthropic/claude-sonnet-4`
2. `wizard_market_scan` → `anthropic/claude-sonnet-4`
3. `strategy_pack` → `anthropic/claude-sonnet-4`
4. `relationship_intelligence` → `anthropic/claude-sonnet-4`
5. `outreach_refine` → `anthropic/claude-sonnet-4`
6. `presentation_generate` → `anthropic/claude-sonnet-4`
7. `market_intelligence` → `anthropic/claude-sonnet-4` (fix model name from `claude-3.5-sonnet`)

### Switch to cheap model (mechanical):
1. `prospect_score` → `openai/gpt-4o-mini`
2. `outreach_score` → `openai/gpt-4o-mini`
3. `reply_classify` → `openai/gpt-4o-mini`
4. `learning_insights` → `openai/gpt-4o-mini`

### Record model per output:
- All `callOpenRouter` calls already return `model` → logged to `growth_spend_logs`
- Need to add `generatedBy` field to `growth_outreach` and `growth_presentations` tables
- Need to surface model in frontend for generated messages/presentations
