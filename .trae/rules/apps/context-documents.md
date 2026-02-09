---
alwaysApply: false
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
