---
alwaysApply: false
category: "Problem Solving, Thinking and Planning"
primaryColorClass: "bg-rose-600"
---
# Diagrams Rules

## Data Structure

The core data structure for this app is the `Diagram` interface, defined in [src/types/diagram.ts](file:///home/pouria/projects/pyramid-solver/src/types/diagram.ts).

```typescript
export interface DiagramNodeData {
  title: string;
  description: string;
  contextSources?: ContextSource[];
}

export interface Diagram {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  createdAt: Date | null;
  lastModified: Date | null;
  nodes: any[]; // Using any[] to avoid strict dependency on reactflow types
  edges: any[];
}
```

## Logic & Rules

The core business logic is implemented in [src/services/diagramService.ts](file:///home/pouria/projects/pyramid-solver/src/services/diagramService.ts).

### Core Functions
- **CRUD**: Standard `createDiagram`, `getDiagram`, `updateDiagram`, `deleteDiagram` operations.
- **Initialization**: New diagrams start with empty `nodes` and `edges` arrays.
- **Timestamps**: `updateDiagram` automatically updates the `lastModified` timestamp.

### Invariants
- `nodes` and `edges` default to empty arrays if undefined in storage.
