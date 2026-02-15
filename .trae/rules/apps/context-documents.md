---
alwaysApply: false
category: "Knowledge Base"
primaryColorClass: "bg-amber-600"
---
# Context Documents Rules

## Data Structure

The core data structure for this app is the `ContextDocument` interface, defined in [src/types/contextDocument.ts](file:///home/pouria/projects/pyramid-solver/src/types/contextDocument.ts).

```typescript
export interface ContextDocument {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  type: string;
  content: string;
  notionId: string;
  createdAt: Date | null;
  lastModified: Date | null;
  directoryId?: string | null;
}
```

## Logic & Rules

The core business logic is implemented in [src/services/contextDocumentService.ts](file:///home/pouria/projects/pyramid-solver/src/services/contextDocumentService.ts).

### Core Functions
- **Document Management**:
  - `createContextDocument`: Initializes a document with empty content and type 'text'.
  - `getUserContextDocuments`: Fetches documents filtered by `userId` and optionally `workspaceId`.
  - `updateContextDocument`: Supports partial updates (patch) for title, content, type, etc.
- **Directory Management**: (Implemented in [src/services/directoryService.ts](file:///home/pouria/projects/pyramid-solver/src/services/directoryService.ts))
  - `createDirectory`: Creates a new folder to organize documents.
  - `deleteDirectory`: Deletes a directory and moves all contained documents to the root (sets `directoryId` to null).
  - `getDirectoryDocuments`: Fetches documents within a specific directory (or root if `directoryId` is null).

### Invariants
- Documents must always be associated with a `userId`.
- The `type` field defaults to "text" but can support other formats.
- When a directory is deleted, its documents are preserved but moved to the root level.
