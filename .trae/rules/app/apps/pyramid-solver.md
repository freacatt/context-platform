alwaysApply: false
applyMode: intelligence
category: "Problem Solving, Thinking and Planning"
primaryColorClass: "bg-indigo-600"
---
# Pyramid Solver Rules

## Data Structure

The core data structure for this app is the `Pyramid` interface, defined in [app/src/types/pyramid.ts](file:///home/pouria/projects/pyramid-solver/app/src/types/pyramid.ts).

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

## Logic & Rules

The core business logic is implemented in [app/src/services/pyramidService.ts](file:///home/pouria/projects/pyramid-solver/app/src/services/pyramidService.ts).

### Core Functions
- **Initialization**: `createPyramid` initializes a new pyramid with a standard 8x8 grid (64 blocks) of type 'question'.
- **Duplication**: `duplicatePyramid` creates a deep copy of a pyramid, appending "(Copy)" to the title, but resetting the ID and timestamps.
- **Sorting**: `getUserPyramids` returns pyramids sorted by `lastModified` descending (newest first).
- **Real-time Sync**: `subscribeToPyramid` provides real-time updates via the storage adapter's subscription mechanism.

### Invariants
- Every pyramid MUST have exactly 64 blocks initialized upon creation.
- Deleting a pyramid (`deletePyramid`) permanently removes it from storage.
