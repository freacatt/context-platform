## Why

Technical Architecture was a fixed, web-API-centric form of nested key/value maps (HTTP methods, status codes, coverage maps) edited one field at a time in a modal. It was hard to fill, could not describe the parts of a system or how they connect, and its export was weak context for people and coding agents.

## What Changes

- **BREAKING** New model (arc42/C4-inspired): overview (summary, style, system context, principles, constraints, quality goals), components with dependencies, key flows, tech stack, data entities, interfaces and API conventions, cross-cutting concerns, delivery (environments, pipeline, deployment), rules for changes (always / never / guidance / definition of done), risks and tech debt, related items (links).
- New editor: section navigator with completion, live component diagram (click to edit), template gallery for empty architectures (web app + API, serverless, event-driven), full-width layouts.
- Exports: arc42-style Markdown with a Mermaid component diagram, and AGENTS.md for coding agents (also copyable from the rules section).
- Previous documents are read as the new model (layers → components, stack maps → table, standards → concerns, preservation/AI rules → rules); their sections are cleared on the first save. Backups of either version import.

## Capabilities

### New Capabilities
- `technical-architecture`: The architecture model, editor, diagram, exports and legacy conversion.

### Modified Capabilities

## Impact

`shared/specs/technicalArchitecture.ts` (+ tests), `convex/technicalArchitectures.ts` (`update` replaces `updateSections`), schema (`spec`, optional legacy sections), backups, knowledge serializer, `src/features/technicalArchitectures/` rewritten (old field editor retired).
