## 1. Shared knowledge layer

- [x] 1.1 Add `shared/knowledge/types.ts` (KnowledgeApp, KnowledgeRef, LinkKind + LINK_KINDS, KnowledgeEdge, KnowledgeItem, structural input types)
- [x] 1.2 Add `shared/knowledge/registry.ts` (key, label, folder per app) + test that keys match `features/workspaces/apps.ts`
- [x] 1.3 Move Markdown builders from `src/lib/export/*` into `shared/knowledge/serializers/*`; keep `src/lib/export` wrappers re-exporting them; existing export tests pass unchanged
- [x] 1.4 Add `toKnowledge` serializers for every app (ISO dates, metadata, derived edges) incl. `pyramidToKnowledge` from report helpers (no cost/transcripts)
- [x] 1.5 Add `shared/knowledge/graph.ts`: link closure (BFS, both directions, depth / unlimited)
- [x] 1.6 Add `shared/knowledge/bundle.ts`: slugs + unique paths, per-item file (frontmatter, Links, Backlinks), INDEX.md, graph.json, single-file builder with heading demotion
- [x] 1.7 Unit tests for serializers, closure, slugs, bundle (zip entries + single file)

## 2. Backend

- [x] 2.1 Schema: `links` and `contextPacks` tables (+ validators); add both to `WORKSPACE_TABLES`
- [x] 2.2 `convex/lib/knowledge.ts`: load an item by ref with ownership check, `deleteLinksOf`, explicit + derived edges for a workspace, serialize via registry
- [x] 2.3 `convex/links.ts`: listForItem, create, remove (+ tests: happy path, cross-workspace, self/duplicate, other user denied)
- [x] 2.4 Call `deleteLinksOf` from every item `remove` mutation and from pipeline delete cascade (+ test)
- [x] 2.5 `convex/knowledge.ts`: catalog and collect queries (+ tests: depth, foreign refs skipped, other user empty)
- [x] 2.6 `convex/contextPacks.ts`: list, create, update, remove (+ tests)
- [x] 2.7 Backup: include `links` in `exportData`; parse in `workspaceTransfer.ts`; id maps for all item tables in `importData`; remap links (+ round-trip test, old backup without links test)

## 3. Frontend

- [x] 3.1 Rename header button to "Export workspace"
- [x] 3.2 Sidebar footer "Export knowledge" button above Settings; route `/:workspaceId/export-knowledge` in `App.tsx`
- [x] 3.3 Add `fflate`; `src/lib/export/knowledge.ts` builds zip / single file and downloads (add `downloadBlob`)
- [x] 3.4 `ExportKnowledgePage`: app groups + checkboxes, depth + format options, summary (items, size, tokens), Download
- [x] 3.5 Context Pack bar on the page (load, save as, update, delete; ignores missing items)
- [x] 3.6 `LinksPanel` sheet (outgoing, backlinks, derived marked auto, add/remove) and a Links button on every item editor
- [x] 3.7 Smoke tests: export page renders and downloads; sidebar button navigates; links panel renders

## 4. Docs & verification

- [x] 4.1 Update `app/CLAUDE.md`, `app/architecture.md`, `app/.trae/rules/core.md` (knowledge layer, links, export, "Adding a Data Entity" step)
- [x] 4.2 `npm run check` and `npm run build` pass
- [x] 4.3 Manual browser check: links, export zip + single file, packs survive reload
