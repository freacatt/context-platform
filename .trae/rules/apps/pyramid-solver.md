---
alwaysApply: false
---
# Pyramid Solver Rules

## Data Structure

The core data structure for this app is the `Pyramid` interface, defined in [src/types/pyramid.ts](file:///home/pouria/projects/pyramid-solver/src/types/pyramid.ts).

```typescript
export interface Pyramid {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  context: string | null;
  createdAt: Date | null;
  lastModified: Date | null;
  status: string;
  blocks: Record<string, Block>;
  connections: any[];
  contextSources?: ContextSource[];
}
```
