## Why

A pyramid could only read free text and Context Documents. The knowledge base now spans every app, so a question should be able to draw on any item (an architecture, a plan, a design system), on saved context packs, and on Markdown the user already has elsewhere.

## What Changes

- Pyramid setup gets **context sources**: items of any app, context packs, and uploaded `.md`/`.txt` files or `.zip` archives of them (unpacked in the browser), plus an "Include linked items" depth.
- Uploaded files are stored per pyramid (`pyramidFiles`), private to it, copied on duplicate, deleted with it.
- The brief is built from every resolved source (items as their Markdown export); estimating refuses a context over ~150k tokens.
- `contextDocumentIds` stays readable and is folded into `contextRefs` when the setup is saved; backups carry refs and files.

## Capabilities

### New Capabilities
- `pyramid-context`: Context sources of a pyramid (items, packs, files, link depth), their resolution, limits and lifecycle.

### Modified Capabilities

## Impact

`shared/pyramid/{types,config}.ts`, `convex/schema.ts` (`pyramidFiles`, `contextRefs`, `contextLinkDepth`), `convex/lib/pyramidContext.ts`, `convex/pyramidFiles.ts`, `convex/pyramids.ts`, `convex/pyramidRunner.ts`, backup import/export, `src/features/pyramids/ContextSources.tsx`, `src/features/knowledge/ItemPickerDialog.tsx`, `src/lib/textUploads.ts`.
