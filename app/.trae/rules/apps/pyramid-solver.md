---
alwaysApply: false
applyMode: intelligence
description: Rules for the Pyramid Solver app.
globs:
  - "app/src/**/pyramid*"
  - "app/src/**/Pyramid*"
  - "app/shared/pyramid/**"
  - "app/convex/pyramid*"
category: "Problem Solving, Thinking and Planning"
primaryColorClass: "bg-indigo-600"
---
# Pyramid Solver Rules

A multi-model roundtable (ported from Roundboard): one root question expands across an N×N diamond (N = 2..8), then converges to one final answer. Each working row is debated by 1–6 OpenRouter panelists and concluded by a host model.

## CRITICAL
- Models are called only from Convex actions (`convex/pyramidRunner.ts` via `convex/lib/openrouter.ts`) with the workspace owner's key. Never from the browser.
- Money is exact (decimal strings / bigint, `shared/pyramid/money.ts`). A run never spends past its confirmed cap: hard stop before any call once spent ≥ cap, pause at a row boundary when the remaining rows are projected past it.
- A row commits atomically and only if the run is still `running` under the same `executionId`.
- Context documents must be in the pyramid's workspace (checked on save and when read).
- Prompt text lives only in `shared/pyramid/prompts.ts`; changing it updates its snapshot.

## Board
- Cell (u, v) → label `chr(65+u) + (v+1)`, row `u + v`. Kinds: ROOT (A1, no call), EDGE (one parent), MERGE (two parents), FINAL (last cell, no next question).
- Critical path: FINAL back to ROOT along `primaryParent`.

## Lifecycle (`convex/pyramids.ts`)
- `create` → draft with the user's default panel/host; `updateConfig` only in draft/estimated (resets to draft).
- `estimate` (action) validates the setup and prices it; `confirm` starts with a cap (default: high estimate).
- `approveRow` at a checkpoint may edit only next questions of that row (`originalNextQuestion` is kept).
- `raiseBudget`, `cancel`, `resume` (failed, or a running run with no activity for 10 minutes).
- `report` renders Markdown, HTML (with the board) or transcripts.
- `details` totals a run (cost/tokens per model and role, calls, timing) for the Run details panel; `discussion` returns every call of a cell's row with what it said about that cell (block dialog → Discussion tab).

## UI (`app/src/features/pyramids/`)
- Keeps the wooden chess-board look (`Block`, `PyramidBoard` with pan/zoom/fit, `BlockModal`).
- Draft/estimated → `SetupPanel` (autosaved draft, estimate, start). Running → status cards, alerts, checkpoint, final answer.
