## Why

Technical Tasks modelled tickets (files to create, functions to fix, test lists) — detail coding agents now work out themselves. What people and agents need is a plan: what we build, why, how, in which steps, what could go wrong and when it is done, connected to the product and architecture it implements.

## What Changes

- **BREAKING** Technical Tasks (kanban, pipelines) is retired; **Technical Plans** replaces it: status, goal, context, scope/out of scope, approach, phases with checklist steps, decisions, risks, open questions, acceptance criteria, test strategy, rollout. Inputs are links (Inputs tab).
- Legacy tasks stay readable and linkable until the user converts them (banner on the plans page): each becomes a plan, links/packs/pyramid refs follow, tasks and pipelines are deleted. Backups with tasks import them as plans.
- Old task URLs redirect to Technical Plans; new workspaces no longer get a "Backlog" pipeline.

## Capabilities

### New Capabilities
- `technical-plans`: Plans, their progress and export, and the conversion of legacy tasks.

### Modified Capabilities

## Impact

`shared/specs/technicalPlan.ts`, `convex/technicalPlans.ts`, removal of `convex/technicalTasks.ts`, `convex/pipelines.ts`, `src/features/technicalTasks/`; legacy tables kept in the schema; registry (`technicalTasks` marked legacy), backups, routes.
