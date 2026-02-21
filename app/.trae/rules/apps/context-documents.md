---
alwaysApply: false
applyMode: intelligence
description: Rules for the Context Documents (Knowledge Base) app.
globs:
  - "app/src/**/contextDocument*"
  - "app/src/**/ContextDocument*"
  - "app/src/**/directory*"
  - "app/src/**/Directory*"
category: "Knowledge Base"
primaryColorClass: "bg-amber-600"
---
# Context Documents Rules

## CRITICAL
- Documents MUST always be associated with a `userId`.
- Type defaults to `"text"`.
- Deleting a directory preserves its documents — moves them to root (`directoryId` = null).

## Data Model
- Type: `ContextDocument` in `app/src/types/contextDocument.ts`
- Service: `app/src/services/contextDocumentService.ts`
- Directory Service: `app/src/services/directoryService.ts`

## Core Logic
- `createContextDocument`: Initializes with empty content, type `"text"`.
- `getUserContextDocuments`: Filters by `userId` and optionally `workspaceId`.
- `updateContextDocument`: Supports partial updates (patch).
- `createDirectory` / `deleteDirectory` / `getDirectoryDocuments`: Folder management. Delete moves docs to root.
