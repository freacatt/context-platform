## 1. Domain and backend

- [x] 1.1 `ContextRef`, `contextRefsOf`, `contextLinkDepthOf`, size limits in shared/pyramid
- [x] 1.2 Schema: `contextRefs`, `contextLinkDepth`, `pyramidFiles`
- [x] 1.3 `convex/lib/pyramidContext.ts` resolver + ref validation; runner and estimate use it
- [x] 1.4 `pyramidFiles` list/add/remove; duplicate copies, delete removes files
- [x] 1.5 `pyramids.contextSummary`; `details.contextSources`
- [x] 1.6 Backup export/import of refs and files
- [x] 1.7 Tests: sources in the brief, link depth, legacy folding, refusals, files lifecycle, size limit, round trip

## 2. Frontend

- [x] 2.1 `readTextUploads` (zip via fflate) + tests
- [x] 2.2 `ItemPickerDialog` (multi-select across apps)
- [x] 2.3 `ContextSources` in the setup panel; run details list sources
- [x] 2.4 Smoke test
