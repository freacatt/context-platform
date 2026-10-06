---
alwaysApply: true
applyMode: always
description: Core architecture, data access, security and coding standards for the app (mirrors app/CLAUDE.md).
---
# App — Rules

React 19 + Vite SPA on a Convex backend. Convex is the database, the server functions, and auth (Convex Auth, email/password). There is no other backend.

## Layout

```
app/
├── convex/                 # Backend: schema, auth, one module per domain
│   ├── schema.ts           # Tables + validators (source of truth for data shape)
│   ├── auth.ts             # Convex Auth (Password provider)
│   ├── lib/access.ts       # Auth + workspace-ownership helpers — every function uses these
│   ├── lib/ai.ts           # The one way actions call AI models (key, default model, errors)
│   ├── lib/openrouter.ts   # OpenRouter client (chat completions, model catalog)
│   ├── lib/workspaceTransfer.ts  # JSON backup format (export/import)
│   ├── lib/knowledge.ts    # Loading knowledge items/edges by ref; deleteLinksOf
│   ├── ai.ts, aiSettings.ts      # AI actions for any feature + per-user AI settings
│   ├── pyramidRunner.ts    # Scheduled execution of Pyramid Solver runs
│   ├── <domain>.ts         # list/get/create/rename/update/remove per table
│   └── *.test.ts           # convex-test backend tests
├── shared/                 # Pure domain logic + types used by BOTH convex/ and src/
│   ├── ai.ts               # Provider-neutral AI contracts (messages, models, completions)
│   ├── pyramid/            # Pyramid Solver engine: board, prompts, parsing, cost, roundtable, report
│   ├── knowledge/          # Knowledge layer: item serializers, registry, link closure, export bundles
│   ├── types/              # Shapes of editor-owned JSON (architecture specs, task data, …)
│   └── *.ts                # Factories/defaults (templates, empty architectures)
└── src/
    ├── App.tsx             # Routes only (lazy-loaded per screen)
    ├── features/<domain>/  # Pages, components and hooks of one app (pyramids, diagrams, …)
    ├── components/
    │   ├── collection/     # CollectionPage + its pieces (PageHeader, CollectionToolbar, CollectionCard, EmptyState), TitleDialog
    │   ├── layout/         # AppShell, NavMain, NavUser, spinners, NotFound
    │   └── ui/             # shadcn primitives (vendored)
    ├── data/types.ts       # Entity types = Convex Doc<> narrowed with shared/ types
    ├── hooks/              # Cross-feature hooks (useDebouncedSave)
    ├── lib/                # Pure helpers (export builders, rich text, object paths, errors)
    └── test/               # Smoke tests + Convex fake + fixtures
```

## CRITICAL — Data & Security

- All reads/writes go through Convex functions. Components call them with `useQuery`/`useMutation` (`convex/react`).
- Every function MUST resolve access through `convex/lib/access.ts`:
  - Queries return `null` / `[]` when the user has no access (never throw — signed-out screens must not crash).
  - Mutations throw `ConvexError` (`requireOwnedWorkspace`, `requireOwnedDoc`).
- Ownership is per workspace: `workspaces.ownerId`; every other table has `workspaceId` + a `by_workspace` index.
- `get` queries take `id: v.string()` and use `getOwnedDocById` so malformed URL ids resolve to "not found".
- Cross-references (directory, design system, link ends, pyramid context sources) MUST be checked to be in the same workspace.
- Defaults for new documents come from `shared/` factories, applied server-side.

## Adding a Data Entity

A `{ title, spec }` app (most new apps) needs little: a `shared/specs/<app>.ts` (type, `normalize…`, defaults, `…ToMarkdown` + tests), a `spec: v.any()` table, `convex/<app>.ts` from `specDocFunctions`, a `SpecListPage` + editor with `SpecEditorShell`, and steps 4–6 below. Otherwise:

1. Add the table to `convex/schema.ts` with `workspaceId`, `title`, `updatedAt` and a `by_workspace` index; add it to `WORKSPACE_TABLES` in `convex/lib/access.ts` (cascade delete + export).
2. Write `convex/<entity>.ts` using the access helpers, plus `convex/<entity>.test.ts` (happy path, validation, another user is denied).
3. Add the type to `src/data/types.ts`; build the screens in `src/features/<entity>/` (use `CollectionPage` for the list).
4. Register the app in `src/features/workspaces/apps.ts` (dashboard + sidebar) and the routes in `src/App.tsx`.
5. Include it in `convex/lib/workspaceTransfer.ts` (export/import), with a source-id map so links can be re-linked.
6. Make it a knowledge item: add its key to `KNOWLEDGE_APP_KEYS` and `KNOWLEDGE_APPS` (`shared/knowledge/`), a serializer case in `shared/knowledge/serializers.ts` (+ derived edges if it references other items), its route in `features/knowledge/itemPath.ts`, a `LinksButton` in its editor, and call `deleteLinksOf` before deleting one.

## Code Principles

- Correctness > Completeness > Speed. Read the surrounding code before writing.
- Pure logic lives in `shared/` (domain) or `src/lib/` (UI helpers) and is unit-tested.
- Editors keep a local draft keyed by document id and save with `useDebouncedSave`; they never reset from their own server echo.
- Errors shown to users go through `withErrorToast` / `errorMessage` (`src/lib/errors.ts`) — no `alert()`.
- No `localStorage` for domain data.
- Every feature's main page looks the same: `PageHeader` with `appPage('<key>')` from `features/workspaces/apps.ts` (title, description, icon colour, card icon tint), then `CollectionToolbar` and `CollectionCard`s — `CollectionPage` does all of this for plain collections. Settings sections are tabs on `/:workspaceId/settings`.

## AI

- All AI goes through OpenRouter from Convex **actions** — never from the browser. Browser code calls `api.ai.complete` / `api.ai.listModels`; other actions use `convex/lib/ai.ts` (`completeForUser`, `requireAiAccess`, `loadModels`).
- The OpenRouter key is per user (`aiSettings`, set on the Settings page) with an optional deployment fallback `OPENROUTER_API_KEY`. Queries never return it — only a hint.
- The workspace header shows the key's usage, limit and remaining (and the account's credit balance when the key is a management key) via `ai.accountStatus`, refreshed every minute.
- Money is exact: decimal strings at boundaries, bigint pico-dollars in memory (`shared/pyramid/money.ts`). Never floats.
- Tests never hit the network: stub `fetch` with `convex/fakeOpenRouter.helpers.ts` (backed by `shared/pyramid/fakeModel.ts`).

## Commands (run in `app/`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Convex (local backend) + Vite |
| `npm run setup:auth` | One-time: generate auth keys on the Convex deployment |
| `npm run check` | Typecheck + lint + all tests |
| `npm test` | Backend (convex-test) + frontend (jsdom) tests |
| `npm run build` | Typecheck + production build |

## Definition of Done

- `npm run check` passes (typecheck, lint, tests) and `npm run build` succeeds.
- New Convex functions have tests, including access denied for another user.
- New screens are covered by a smoke test in `src/test/smoke/`.
- Manual: the flow works in the browser and survives a reload.

## App-Specific Rules

- **Pyramid Solver** — a multi-model roundtable (ported from Roundboard). A root question expands across an N×N diamond (2..8) and converges to one answer; per row a panel of 1–6 OpenRouter models answers blind (optional critique round), the host concludes. Status machine in `convex/pyramids.ts`; execution in `convex/pyramidRunner.ts` (one scheduled action per row, atomic row commits guarded by `executionId`, budget guard, watchdog). Setup is editable only in `draft`/`estimated`; the user may edit only next questions at a checkpoint. Prompt text lives only in `shared/pyramid/prompts.ts` (snapshot-tested).
- **Pyramid context** — `config.contextRefs`: items of any app, context packs, and Markdown files uploaded to the pyramid (`pyramidFiles`, private to it; `.zip` is unpacked in the browser), expanded along links by `contextLinkDepth`. Resolved only by `convex/lib/pyramidContext.ts` (same-workspace checks; files must belong to the pyramid); the brief reads at most `RAW_CONTEXT_MAX_CHARS`. Legacy `contextDocumentIds` are folded into `contextRefs` on save.
- **Spec apps** (Design Systems, Technical Plans, Decisions, Glossary, Research & Insights, Goals & Roadmap) — documents are `{ title, spec }`; the spec shape, defaults, normalizer and Markdown live in `shared/specs/<app>.ts`; Convex functions come from `specDocFunctions` (`convex/lib/specDocs.ts`), which normalizes on every write and read. Editors use `useSpecDraft` + `SpecEditorShell` (`src/features/specs/`) and the fields in `src/components/form/`.
- **Product Definition** — a structured product model (`ProductSpec`: vision, problem, personas, jobs, features, requirements, non-goals, metrics, assumptions, risks, notes) in `spec`. Documents of the previous mind-map version (`data`) are read as a spec (`productSpecFromLegacy`: known topics fill fields, every answer goes to notes) and `data` is dropped on the first save.
- **Context Documents** — content is Lexical JSON (legacy plain text is still read). Deleting a directory moves its documents to the top level.
- **Diagrams** — React Flow nodes/edges, autosaved with `diagrams.saveGraph`.
- **Technical Architecture** — a `TechnicalArchitectureSpec` (shared/specs/technicalArchitecture.ts): overview and quality goals, components with dependencies (diagram laid out by `componentLevels`, Mermaid in exports), stack, data, interfaces, cross-cutting concerns, delivery, rules for changes, risks. Exports Markdown and AGENTS.md. Previous fixed-section documents are read through `technicalArchitectureFromLegacy` (nothing dropped) and their sections are cleared on the first save.
- **Technical Plans** — replaced Technical Tasks. A plan's inputs are its outgoing links. Legacy `technicalTasks`/`pipelines` are never created; they stay readable (and linkable) until `technicalPlans.convertLegacyTasks` turns them into plans and repoints links, packs and pyramid context. Backups with tasks import them as plans.
- **Design Systems / UI/UX Architecture** — tokens and components live in design systems (exports: Markdown, W3C design tokens JSON, CSS variables). A UI/UX architecture links one design system (`designSystemId`, a derived link) and holds pages and navigation; legacy theme/components move into a new design system with `uiUxArchitectures.extractDesignSystem`. Deleting a design system unlinks it.
- **Decisions** — ADRs; `decisions.createFromPyramid` records a completed pyramid's final answer, linked `derived-from` it.
- **Knowledge & links** — every item serializes to Markdown via `shared/knowledge/` (pure; used by Convex and the browser). Explicit links live in `links` (string ids, always normalized and same-workspace checked); derived links are computed from item fields, never stored. Deleting an item deletes its links (`deleteLinksOf`). Export knowledge (`/:workspaceId/export-knowledge`) collects server-side (`knowledge.collect`) and packages in the browser (`fflate`). Context packs are saved selections. The knowledge graph (`/:workspaceId/knowledge-graph`, `knowledge.graph`) shows every item and relation.
