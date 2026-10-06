# App — Architecture

## Overview

```
Browser (React SPA)
   │  useQuery / useMutation / useAction (WebSocket, live updates)
   ▼
Convex
   ├── Auth (Convex Auth — email/password, JWT sessions)
   ├── Functions (convex/*.ts) — every call checks auth + workspace ownership
   ├── Scheduler — Pyramid Solver runs, one action per row
   └── Database (schema in convex/schema.ts)
         │
         ▼ (actions only)
      OpenRouter (chat completions, model catalog)
```

There is one backend: Convex. Queries are reactive, so every screen updates live when data changes — in another tab, or after a mutation — with no manual refetching or sync layer.

## Layers

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Domain | `shared/` | Pure types, defaults and rules (pyramid engine, knowledge layer, AI contracts, templates, empty architectures, task data). No I/O. Used by both server and client. |
| Backend | `convex/` | Schema, auth, access control, one module per table, workspace export/import. |
| Data types | `src/data/types.ts` | Convex `Doc<>` types narrowed with `shared/` types for editor-owned JSON fields. |
| Features | `src/features/<domain>/` | Screens and components for one app; call Convex directly. |
| Shared UI | `src/components/` | `collection/` (standard list screen), `layout/` (shell, nav), `ui/` (shadcn). |
| Helpers | `src/lib/`, `src/hooks/` | Pure, tested helpers: exports, rich text, object paths, field text, debounced save, errors. |

## Data model

| Table | Key fields | Notes |
|-------|------------|-------|
| `users`, `auth*` | — | Managed by Convex Auth. |
| `workspaces` | `ownerId`, `name` | Index `by_owner`. Owner is the only user with access. |
| `pyramids` | `title`, `config`, `status`, `currentRow`, `spent`, `budgetCap?`, `estimate?`, `brief?`, `rowResults`, `executionId?` | One Pyramid Solver run. Amounts are decimal USD strings. |
| `pyramidCells` | `pyramidId`, `label`, `row`, `cell`, `originalNextQuestion?` | Host conclusions; `cell.nextQuestion` is the effective one (checkpoint edits win). Index `by_pyramid`. |
| `pyramidCalls` | `pyramidId`, `row`, `role`, `model`, `messages`, `output`, tokens, `cost`, `status` | Every provider attempt, append-only (transcripts, re-estimation). Not exported in backups. |
| `productDefinitions` | `title`, `spec?`, `data?` | `spec` is a `ProductSpec`; `data` is the previous mind-map version, read as a spec until first saved. |
| `designSystems`, `technicalPlans`, `decisions`, `glossaries`, `researchStudies`, `roadmaps` | `title`, `spec` | Spec documents (`shared/specs/`); functions from `convex/lib/specDocs.ts`. |
| `pyramidFiles` | `pyramidId`, `title`, `content` | Markdown uploaded as context of one pyramid. Index `by_pyramid`. |
| `directories` | `title` | |
| `contextDocuments` | `title`, `content`, `directoryId?` | Content is Lexical JSON. Index `by_directory`. |
| `diagrams` | `title`, `nodes`, `edges` | React Flow state. |
| `technicalArchitectures` | `title`, `spec?` + 12 optional legacy section fields | `spec` is a `TechnicalArchitectureSpec`; legacy sections are read as a spec until the first save clears them. |
| `uiUxArchitectures` | `title`, `designSystemId?`, metadata, pages, UX patterns | Legacy `theme_specification`/`base_components` until moved into a design system. |
| `pipelines`, `technicalTasks` | — | Legacy (Technical Tasks): never created; converted into technical plans. |
| `links` | `fromApp`, `fromId`, `toApp`, `toId`, `kind`, `createdAt` | Explicit relation between two items of the workspace. Ids are strings (any knowledge app); indexes `by_from`, `by_to`. No `title`. |
| `contextPacks` | `title`, `refs`, `linkDepth` | A saved selection of knowledge items. |

Every workspace table has `workspaceId` + index `by_workspace`; documents also have `title` and `updatedAt`. Deleting a workspace deletes everything in it.

Per-user tables (not workspace data): `aiSettings` (OpenRouter key, default model, default pyramid panel/host; index `by_user`), `pyramidPresets` (saved panel + host + prompts) and `aiModelCache` (the public OpenRouter catalog, refreshed at most daily).

## AI

`convex/lib/openrouter.ts` talks to OpenRouter over `fetch` (429/5xx/transport → retryable `ProviderError`; other 4xx → `ProviderConfigError`). `convex/lib/ai.ts` is the one entry point for actions: it resolves the user's key (or the deployment's `OPENROUTER_API_KEY`) and default model and turns provider errors into readable `ConvexError`s. The browser uses `api.ai.complete`, `api.ai.listModels` and `api.ai.testConnection`; the key never leaves the server.

## Pyramid Solver

Ported from Roundboard. The pure engine lives in `shared/pyramid/`: `board` (geometry, critical path), `config` (defaults + validation), `prompts`, `parsing` (tolerant JSON, per-kind validation), `rowContext`, `cost` (estimate + re-estimate from measured tokens), `money`, `roundtable` (`Caller` with retries/repair prompts/budget guard, `runRow`, `makeBrief`) and `report` (Markdown, HTML, transcripts).

```
draft ─estimate─► estimated ─confirm─► running ─row done─► awaiting_approval ─approve─► running
                                         │  └─last row─► completed
                                         ├─projected > cap─► paused_budget ─raiseBudget─► awaiting_approval | running
                                         ├─row fails / runner dies─► failed ─resume─► running
any non-terminal ─cancel─► cancelled
```

`pyramidRunner.step` (scheduled action) writes the brief or runs one row, records each call as it finishes (`spent` stays truthful), and commits the row atomically only if the run is still `running` under the same `executionId` — so cancel/resume elsewhere turn a late commit into a no-op. Before each call it checks the run is still live and that spent < cap; after a row it pauses when the remaining rows are projected past the cap. A watchdog fails a run whose runner stopped writing (actions are capped at 10 minutes); resume retries only the uncommitted row.

## Knowledge layer

Every workspace item is also a **knowledge item**: Markdown with a stable ref (`{ app, id }`, where `app` is the workspace app key = table name) and relations to other items.

- `shared/knowledge/registry.ts` — `KNOWLEDGE_APPS` (key, label, zip folder), in dashboard order; the single place an app plugs in.
- `shared/knowledge/serializers.ts` — `toKnowledgeItem(source)` per app (pure; Markdown builders in `shared/knowledge/markdown/`, re-exported by the per-item downloads in `src/lib/export/`) and `derivedEdges(source)`: relations read from an item's own fields (task → architecture `depends-on`, pyramid → context documents `references`). Derived edges are never stored.
- `shared/knowledge/graph.ts` — `linkClosure` (BFS over links in both directions up to a depth, `-1` = all) and `edgesWithin`.
- `shared/knowledge/bundle.ts` — export formats: zip entries (`<folder>/<slug>.md` with YAML frontmatter and `[[wiki-links]]`, `INDEX.md`, `graph.json`) and a single Markdown file (anchors, demoted headings, relations table).
- `convex/lib/knowledge.ts` — loads items by ref (same-workspace check), all items and edges of a workspace, serializer inputs (pyramid cells, folder/pipeline titles), and `deleteLinksOf`, which every item delete calls.
- `convex/links.ts` (`listForItem`, `create`, `remove`), `convex/knowledge.ts` (`catalog`, `collect`), `convex/contextPacks.ts`.

Link kinds: `references`, `depends-on`, `implements`, `derived-from`, `related`. Self-links and duplicates (same from, to, kind) are refused.

## Apps

| App | Table(s) | Notes |
|-----|----------|-------|
| Pyramid Solver | `pyramids`, `pyramidCells`, `pyramidCalls`, `pyramidFiles` | Context: items, packs and uploaded files (`convex/lib/pyramidContext.ts`). "Save as decision" when completed. |
| Diagrams | `diagrams` | |
| Decisions | `decisions` | ADRs. |
| Product Definition | `productDefinitions` | Product model with entities (personas, jobs, features, …). |
| Research & Insights | `researchStudies` | Sources → insights with evidence. |
| Goals & Roadmap | `roadmaps` | Goals with key results; initiatives Now/Next/Later. |
| Design Systems | `designSystems` | Tokens and components; Markdown, W3C tokens, CSS exports. |
| UI/UX Architecture | `uiUxArchitectures` | Pages and navigation, built with one design system. |
| Context & Documents | `contextDocuments`, `directories` | |
| Glossary | `glossaries` | Terms, definitions, aliases. |
| Technical Architecture | `technicalArchitectures` | Components (diagram + Mermaid), stack, data, interfaces, concerns, delivery, rules; exports Markdown and AGENTS.md. |
| Technical Plans | `technicalPlans` | Replaced Technical Tasks; inputs are links. |

Spec apps share `convex/lib/specDocs.ts` (list/get/create/rename/update/duplicate/remove, normalized specs) and the frontend pieces in `src/features/specs/` and `src/components/form/`.

## Access control (`convex/lib/access.ts`)

- `requireUserId` — the signed-in user, or throw.
- `getOwnedWorkspace` / `requireOwnedWorkspace` — workspace only if `ownerId` is the caller.
- `getOwnedDoc` / `requireOwnedDoc` — a document only if its workspace is owned by the caller.
- `getOwnedDocById` — same, from an untrusted string (URL); malformed ids → `null`.
- `listInWorkspace` — all documents of a table in an owned workspace, else `[]`.

Queries never throw for missing access (they return `null`/`[]`), so screens degrade gracefully on sign-out. Mutations throw `ConvexError` with a user-facing message.

## Frontend

- **Routing** (`src/App.tsx`): `/login`, `/workspaces`, and `/:workspaceId/*`. Every screen is lazy-loaded.
- **Current workspace**: the URL is the source of truth. `WorkspaceLayout` resolves `:workspaceId` against the user's workspaces (redirecting if unknown) and provides it via `useWorkspace()`.
- **Feature pages** share one design: `PageHeader` fed by `appPage(key)` (each app's title, description, icon colour and card icon tint live in `WORKSPACE_APPS`), `CollectionToolbar`, `CollectionCard`, `EmptyState`. `CollectionPage` composes them for plain collections; Context & Documents and the Task Board use the same pieces around their own content.
- **Editors** keep a local draft keyed by document id and autosave with `useDebouncedSave` (pending saves flush on unmount), so their own server echoes never reset what the user is typing.
- **Task board** drag-and-drop uses Convex optimistic updates.
- **Settings** (`/:workspaceId/settings`, sidebar footer): OpenRouter key, default models, panel presets, model catalog. Settings are per user, not per workspace.
- **Export knowledge** (`/:workspaceId/export-knowledge`, sidebar footer above Settings): pick items per app, expand along links (none/1/2/all), download a single `.md` or a `.zip` (built in the browser with `fflate`), save/load the selection as a context pack. The header's **Export workspace** button is the JSON backup.
- **Knowledge graph** (`/:workspaceId/knowledge-graph`, sidebar footer): Obsidian-style — a live `d3-force` simulation positions dots (coloured by app, sized by connections) rendered by React Flow; drag pulls neighbours, hover focuses a node and its neighbours, click shows details, double-click opens. Search, app toggles, orphans, repel and link-distance controls. Pure graph building in `features/knowledge/graphModel.ts`.
- **Links**: every item editor has a Links button (`features/knowledge/LinksButton.tsx`) showing links and backlinks (derived ones marked "auto") and adding/removing explicit links.
- **AI pickers** use `useModels()` (one catalog per page load) and `ModelInput` from `src/features/ai/`.

## Workspace backup

`workspaces.exportData` returns a JSON document (format `context-platform/workspace`, version 4; pyramids with their cells and files, without call transcripts; every app's documents; links and context packs; legacy tasks not yet converted); `workspaces.importData` creates a new workspace from it, re-linking directories, pyramid context (items, packs, files), design systems of UI/UX architectures, links and context pack refs (unmappable ones are dropped). Legacy technical tasks import as technical plans (linked to their architecture); previous-version product definitions import as specs. Old block-grid pyramids import as drafts of their root question; a run caught mid-row imports as `failed` so it can be resumed. The parser (`convex/lib/workspaceTransfer.ts`) also reads exports from the previous Firestore-based version of the app.

## Testing

| Suite | Tooling | Location |
|-------|---------|----------|
| Backend | `convex-test` (in-memory Convex) + fake OpenRouter `fetch` | `convex/*.test.ts` — behavior + access control per module; whole pyramid runs end to end |
| Domain / helpers | Vitest | `shared/*.test.ts`, `src/lib/**/*.test.ts`, `src/features/**/*.test.ts` |
| Smoke | Vitest + Testing Library (jsdom), fake `convex/react` | `src/test/smoke/` — every route renders; main flows call the right functions |

Run everything with `npm run check`.
