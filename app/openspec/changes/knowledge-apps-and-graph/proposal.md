## Why

A knowledge base for planning and thinking needs more than products and architecture: why things were decided, the shared vocabulary, the evidence behind beliefs, and the goals work is meant to move. And with many linked items, people need to see the whole web.

## What Changes

- **Decisions** (ADRs): status, date, context, options with pros/cons, decision, consequences, follow-ups, "based on" inputs. A completed pyramid can be saved as a proposed decision linked to it.
- **Glossary**: terms with definitions, aliases and notes; searchable.
- **Research & Insights**: studies with sources (interviews, surveys, analytics…) and insights citing them with evidence, confidence and tags.
- **Goals & Roadmap**: goals with key results; initiatives Now/Next/Later linked to the goals they move.
- **Knowledge graph** page: every item in a column per app, relations as edges (explicit solid, derived dashed), filters by app and "only unlinked".
- Dashboard regrouped: Thinking & Deciding, Product, Design, Knowledge Base, Technical.

## Capabilities

### New Capabilities
- `decisions`, `glossary`, `research`, `roadmap`: the four apps.
- `knowledge-graph`: the graph page.

### Modified Capabilities

## Impact

`shared/specs/{decision,glossary,research,roadmap}.ts`, `convex/{decisions,glossaries,researchStudies,roadmaps}.ts`, `knowledge.graph`, schema, registry, apps, routes, sidebar, backups; `src/features/{decisions,glossaries,research,roadmaps}/`, `src/features/knowledge/KnowledgeGraphPage.tsx`.
