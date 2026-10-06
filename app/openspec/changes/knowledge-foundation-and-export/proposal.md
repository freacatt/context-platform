## Why

The workspace apps (Pyramid Solver, Product Definition, Context & Documents, Diagrams, Technical Architecture, UI/UX Architecture, Technical Tasks) each hold valuable thinking, but it is trapped in per-app editors and per-app one-off exports. The goal of the platform is a structured, connected knowledge base that can be exported as Markdown and reused as context anywhere (in other apps, in AI coding agents, in Obsidian). This change lays the shared foundation every later phase builds on (Pyramid context refs, Design System, Technical Plan, Product Definition v2), and ships the first user-visible payoff: exporting the workspace's knowledge as Markdown with its relations.

## What Changes

- **Knowledge layer in `shared/knowledge/`**: one serializer per app turning a stored document into a knowledge item (stable ref, title, slug/path, frontmatter, Markdown body, derived links). The Markdown builders move from browser-only `src/lib/export/` into `shared/` so Convex functions can use them too; the per-item download buttons keep working unchanged.
- **Knowledge registry**: one entry per app (key, folder name, label) — the single place a new app plugs into export and, later, AI context.
- **Relations between items**:
  - New `links` table (typed, directed edges between any two items of the same workspace) with list/create/remove functions and a **Links panel** (outgoing links + backlinks, add/remove) on every item editor.
  - Derived links computed from existing references (task → technical architecture, pyramid → context documents).
  - Deleting an item deletes its links; links are included in the workspace JSON backup and remapped on import.
- **Header button renamed** from "Export" to **"Export workspace"** (still the JSON backup).
- **New "Export knowledge" button** in the sidebar footer, above Settings, opening `/:workspaceId/export-knowledge`:
  - Pick apps and individual items (select all per app).
  - Optionally include linked items (depth 1, 2 or all).
  - Format: **single `.md`** or **`.zip`** of one `.md` per item with YAML frontmatter and `[[wiki-links]]`, plus `INDEX.md` (contents + relations table) and `graph.json` (nodes + edges).
  - Live item count and size/token estimate before download.
- **Context Packs**: save the current selection (items + link depth) under a name, reload or delete it. Packs are the reusable unit later consumed by Pyramid context.

## Capabilities

### New Capabilities
- `knowledge-items`: Turning every workspace item into a Markdown knowledge item with stable identity, path and derived relations; the app registry.
- `knowledge-links`: Explicit typed links between items, backlinks, link lifecycle (cleanup, backup/import), and the Links panel.
- `knowledge-export`: The Export knowledge page — selection, linked-item expansion, single-file and zip output formats, INDEX.md, graph.json, size estimate.
- `context-packs`: Named, saved selections of knowledge items.
- `workspace-export-entry`: The header "Export workspace" (JSON backup) and sidebar "Export knowledge" entry points.

### Modified Capabilities
<!-- No existing specs in openspec/specs/; nothing to modify. -->

## Impact

- **Schema**: new tables `links` and `contextPacks` (both workspace-scoped, added to `WORKSPACE_TABLES`).
- **Convex**: new `convex/links.ts`, `convex/knowledge.ts`, `convex/contextPacks.ts` (+ tests); every domain `remove` mutation cleans up links; `workspaces.exportData/importData` and `convex/lib/workspaceTransfer.ts` carry links (with id remapping for all item tables).
- **Shared**: new `shared/knowledge/` (types, registry, serializers, slugging, link closure, bundle builders) with unit tests; Markdown builders move here from `src/lib/export/`.
- **Frontend**: `WorkspaceLayout` button label; `WorkspaceSidebar` footer button; new `src/features/knowledge/` (export page, Links panel); new route in `src/App.tsx`; Links panel on each editor page; smoke test.
- **Dependency**: `fflate` (zip creation in the browser).
- **Docs**: `app/CLAUDE.md`, `app/architecture.md`, `app/.trae/rules/core.md` ("Adding a Data Entity" gains a "register a knowledge serializer" step).
