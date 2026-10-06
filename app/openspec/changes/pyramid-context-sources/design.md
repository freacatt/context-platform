## Context

The runner read `config.contextDocumentIds` directly. Knowledge items, packs and link expansion already exist (`shared/knowledge`, `convex/lib/knowledge.ts`).

## Goals / Non-Goals

**Goals:** any item, packs, uploads as context; one resolver for estimate, run and UI summary; no schema migration.
**Non-Goals:** sharing uploads across pyramids (they are private), PDF/Word uploads, per-source token budgets.

## Decisions

- `contextRefs: ({kind:'item',app,id} | {kind:'pack',id} | {kind:'file',id})[]` and `contextLinkDepth` are optional config fields; `contextRefsOf(cfg)` merges legacy document ids, so old documents need no migration and are normalized on the next save.
- `resolveContext` (convex/lib/pyramidContext.ts) is the only resolver: files first, then items (selected, expanded by the pyramid's depth) and packs (expanded by their own depth); each item once; the pyramid itself never. It uses unchecked workspace reads because the runner has no user; every caller checks ownership first.
- Files are stored as text documents (≤500k chars, ≤100 per pyramid); the client adds the file ref to its local draft after `pyramidFiles.add`, and removes the ref (then flushes) before deleting a file, so a pending save never points at a deleted file.
- Zips are unpacked with `fflate` in the browser; only Markdown/text entries are kept (no `__MACOSX`, no hidden paths).

## Risks / Trade-offs

- [Large contexts] → `RAW_CONTEXT_MAX_CHARS` (600k chars) enforced at estimate; the setup shows sources and an approximate token count.
- [Whole-workspace reads per resolution] → acceptable at current sizes; same trade-off as knowledge export.
