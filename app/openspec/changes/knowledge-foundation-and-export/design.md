## Context

- Seven workspace apps store their data in Convex tables (`pyramids` + `pyramidCells`, `productDefinitions`, `contextDocuments` + `directories`, `diagrams`, `technicalArchitectures`, `uiUxArchitectures`, `technicalTasks` + `pipelines`).
- Markdown builders exist per app in `src/lib/export/*.ts`, but they are browser-only (they import `@/data/types` and `@/lib/download`), so Convex functions cannot use them. The Pyramid report Markdown already lives in `shared/pyramid/report.ts`.
- Relations exist only implicitly: `technicalTasks.technicalArchitectureId`, `pyramids.config.contextDocumentIds`, `contextDocuments.directoryId`. There is no way to say "this architecture implements that product definition".
- The header "Export" button downloads the JSON backup (`workspaces.exportData`); the import side remaps ids for directories, documents, pyramids, architectures and pipelines only.
- Later phases (Pyramid context refs, Design System, Technical Plan, Product Definition v2) all need: "give me item X (and what it links to) as Markdown". This change builds that once.

## Goals / Non-Goals

**Goals:**
- One serializer per app, pure, in `shared/`, usable by both Convex and the browser.
- A single registry of knowledge apps so new apps plug in with one entry.
- Typed, directed, workspace-scoped links with backlinks, plus derived links from existing references.
- Export knowledge page: choose items, expand along links, download a single `.md` or a `.zip` that is Obsidian-compatible and machine-readable (`graph.json`).
- Saved selections (Context Packs).

**Non-Goals:**
- Pyramid context entry using knowledge refs / uploads (next change).
- Redesigning any app (Design System, Technical Plan, Product Definition v2).
- `@mention` links inside rich text, graph visualisation, import of `.md`/`.zip`.
- Per-section ("anchor") links: the ref type reserves an optional `anchor`, but no UI creates one yet.

## Decisions

### 1. Knowledge item model (`shared/knowledge/types.ts`)

```ts
type KnowledgeApp = 'pyramids' | 'productDefinitions' | 'contextDocuments' | 'diagrams'
                  | 'technicalArchitectures' | 'uiUxArchitectures' | 'technicalTasks';
interface KnowledgeRef { app: KnowledgeApp; id: string; anchor?: string }
interface KnowledgeEdge { from: KnowledgeRef; to: KnowledgeRef; kind: LinkKind; source: 'explicit' | 'derived' }
interface KnowledgeItem {
  ref: KnowledgeRef; title: string; updatedAt: number;
  markdown: string;                      // body, starts with "# Title"
  meta: Record<string, string | number>; // extra frontmatter (type, status, folder…)
}
// derivedEdges(source) computes the edges an item states through its own fields.
```

- App keys equal the existing `WorkspaceApp.key` values and table names, so no mapping table is needed. (Directories and pipelines are containers, not items; they appear as `meta.folder` / `meta.pipeline`.)
- Serializers take **structural input types** defined in `shared/knowledge/` (e.g. `{ _id, title, updatedAt, data }`), not Convex `Doc<>` types, so `shared/` keeps no dependency on `convex/_generated`. Convex docs and the UI's narrowed types both satisfy them.
- **Alternative considered**: serialize in the browser only. Rejected — the Pyramid runner (next phase) must build context server-side, and export of "all + linked" is simpler as one query.

### 2. Moving the builders

- `src/lib/export/<app>.ts` Markdown functions move to `shared/knowledge/serializers/<app>.ts`; the `src/lib/export` files keep the download/XLSX wrappers and re-export the Markdown functions so current call sites and `export.test.ts`/`diagram.test.ts` stay valid.
- `contextDocumentToMarkdown` currently prints `toLocaleString()` dates; the knowledge serializer uses ISO dates (deterministic, testable). The per-item download keeps its current output.
- Pyramids: a dedicated `pyramidToKnowledge` built from `shared/pyramid/report.ts` helpers (`reportCriticalPath`, `cellQuestion`) — question, context, final answer, critical path, row-by-row conclusions. No cost table and no transcripts (calls are an audit trail; loading them would blow up the export and they are not knowledge).

### 3. Registry (`shared/knowledge/registry.ts`)

`KNOWLEDGE_APPS: { key, label, folder }[]` in dashboard order (`folder` = zip folder, e.g. `product-definitions`). UI icons/colours keep coming from `features/workspaces/apps.ts`, matched by key; a unit test asserts both lists contain the same keys.

### 4. Links table

```ts
links: defineTable({
  workspaceId: v.id('workspaces'),
  fromApp: knowledgeAppValidator, fromId: v.string(),
  toApp: knowledgeAppValidator,   toId: v.string(),
  kind: linkKindValidator, // 'references' | 'depends-on' | 'implements' | 'derived-from' | 'related'
  createdAt: v.number(),
}).index('by_workspace', ['workspaceId']).index('by_from', ['fromId']).index('by_to', ['toId'])
```

- Ids are strings (an `Id<>` union over seven tables is awkward in validators); every function normalizes them with `ctx.db.normalizeId(table, id)` and checks the doc is in the link's workspace. Self-links and exact duplicates (same from, to, kind) are rejected.
- `links` does **not** carry `title`/`updatedAt` — it is in `WORKSPACE_TABLES` for cascade delete, but is not a collection.
- **Cleanup**: a helper `deleteLinksOf(ctx, id)` (both directions, via `by_from` and `by_to`) is called from every item `remove` mutation and from cascades that delete items (pipeline delete → its tasks).
- Derived edges (`task → architecture: depends-on`, `pyramid → contextDocument: references`) are **not** stored; they are computed by serializers so they can never go stale.
- **Alternative considered**: storing links inside each document. Rejected — backlinks would need a full scan, and every app's schema would change.

### 5. Functions

- `links.listForItem({ workspaceId, app, id })` → `{ outgoing, incoming }` with resolved titles (explicit + derived). Queries return empty on no access.
- `links.create({ workspaceId, from, to, kind })`, `links.remove({ id })`.
- `knowledge.catalog({ workspaceId })` → lightweight `{ app, id, title, updatedAt }[]` for pickers.
- `knowledge.collect({ workspaceId, refs, linkDepth })` → `{ workspaceName, items: KnowledgeItem[], edges: KnowledgeEdge[] }`. Server loads the selected docs, runs the link closure (BFS over explicit + derived edges, both directions, up to `linkDepth`; `-1` = unlimited), serializes all reached items with the registry. Refs outside the workspace or not found are silently skipped.
- `contextPacks.list / create / update / remove` — `{ workspaceId, title, updatedAt, refs: KnowledgeRef[], linkDepth: number }`.

### 6. Bundle format (`shared/knowledge/bundle.ts`, pure)

- **Slugs/paths**: `<folder>/<slug>.md`, slug = lowercased title, non-alphanumerics → `-`, trimmed, max 80 chars, `untitled` fallback; collisions get `-2`, `-3` (assigned in a stable order: app order, then title, then id).
- **Per-item file**: YAML frontmatter (`id`, `app`, `title`, `updated` ISO, `meta` keys, `links: [{ kind, to: <path> }]`), then the item body, then `## Links` (outgoing, `- kind: [[path-without-.md|Title]]`) and `## Backlinks` — only edges whose both ends are in the export.
- **INDEX.md**: workspace name, export timestamp, items grouped by app with wiki-links, and a relations table `| From | Relation | To |`.
- **graph.json**: `{ workspace, exportedAt, nodes: [{ id, app, title, path }], edges: [{ from, to, kind, source }] }`.
- **Single `.md`**: title + contents list, then each item under an HTML anchor `<a id="<app>-<slug>"></a>` with its headings demoted one level (skipping fenced code), its links rendered as `[Title](#anchor)`, and a final "Relations" table.
- Zipping happens in the browser with `fflate.zipSync` (≈8 kB gzip, synchronous, no workers); the bundle builder returns `Record<path, string>` so it is unit-testable without zip.
- Size estimate: bytes of the generated output and `≈ tokens = ceil(chars / 4)` (shown as an approximation).

### 7. UI

- `WorkspaceLayout`: button label "Export workspace" (title attribute identical).
- `WorkspaceSidebar` footer: a second `SidebarMenuButton` "Export knowledge" / "Markdown & relations" above Settings, same styling, active on its route.
- Route `/:workspaceId/export-knowledge` → `src/features/knowledge/ExportKnowledgePage.tsx`: left column = app groups with checkboxes (from `knowledge.catalog`), right column = options (link depth: none/1/2/all; format: single/zip), Context Pack bar (select, save as, update, delete), summary (items selected → items after expansion, size, tokens) and the Download button. The summary calls `knowledge.collect` reactively with the current selection, so what you see is what you download.
- `src/features/knowledge/LinksPanel.tsx`: a `Sheet` opened from a "Links" button in each editor header; lists outgoing and incoming links (explicit removable, derived marked "auto"), and an "Add link" form (kind select + item combobox from the catalog).

## Risks / Trade-offs

- [Convex query limits (reads ≈16 MB / 32k docs) on huge workspaces] → `collect` only reads selected docs + closure and never reads `pyramidCalls`; documented limit; a later change can paginate per app.
- [String ids in `links` lose type-level referential safety] → all writes normalize + ownership-check ids; cleanup on delete; tests cover cross-workspace refusal.
- [Moving builders could change existing per-item export output] → keep the `src/lib/export` wrappers and existing tests; only the knowledge serializers use ISO dates.
- [Headings demotion in single-file mode could break code blocks] → demote only outside fenced blocks; unit-tested.
- [Wiki-link syntax isn't standard Markdown] → it is what Obsidian/Foam use; frontmatter + `graph.json` carry the same relations in standard form.

## Migration Plan

- Additive schema (two new tables) — no data migration. Existing backups import fine (no `links` key → no links). New backups include `links`, remapped through id maps; import now builds id maps for every item table (product definitions, diagrams, UI/UX architectures, technical tasks gain maps).
- Rollback: remove the routes/buttons; the tables can stay empty.

## Open Questions

- None blocking. Link kinds are a fixed list for now; custom kinds can come later.
