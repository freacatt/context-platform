# Product Definition Rules

## Data Structure

The core data structure for this app is the `ProductDefinition` interface, defined in [src/types/productDefinition.ts](file:///home/pouria/projects/pyramid-solver/src/types/productDefinition.ts).

```typescript
export interface ProductDefinitionNode {
  id: string;
  label: string;
  type?: string;
  description?: string;
  question?: string;
  parent?: string;
  children?: string[];
}

export interface ProductDefinition {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  createdAt: Date | null;
  lastModified: Date | null;
  linkedPyramidId: string | null;
  contextSources: ContextSource[];
  data: Record<string, ProductDefinitionNode>;
}
```
