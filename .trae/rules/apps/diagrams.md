---
alwaysApply: false
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
