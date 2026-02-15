---
alwaysApply: false
category: "Product design & Management"
primaryColorClass: "bg-teal-600"
---
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

## Logic & Rules

The core business logic is implemented in [src/services/productDefinitionService.ts](file:///home/pouria/projects/pyramid-solver/src/services/productDefinitionService.ts).

### Core Functions
- **Template Initialization**: `createProductDefinition` creates a new definition with a pre-defined tree structure:
  1. **Problem & Goals**: (Problem Statement, Investment Limits, Baseline Comparison)
  2. **Solution Concepts**: (Key Flows, Rough Sketches, Scope Boundaries)
  3. **Risks & Unknowns**: (Technical Risks, Design Challenges, Risk Mitigation)
  4. **Implementation Strategy**: (Components, Complexity Analysis, Milestones)
- **Data Normalization**: `mapDefinitionFromStorage` ensures that database snake_case fields are correctly mapped to TypeScript camelCase properties.

### Invariants
- New definitions always start with the standard 4-section template.
- The `root` node always has ID "root".
