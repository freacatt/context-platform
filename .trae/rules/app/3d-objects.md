---
alwaysApply: false
description: 
---
alwaysApply: false
applyMode: intelligence
description: Rules for the Product Definition app in the frontend workspace.
---
# Product Definition Rules

## Data Structure

The core data structure for this app is the `ProductDefinition` interface, defined in [app/src/types/productDefinition.ts](file:///home/pouria/projects/pyramid-solver/app/src/types/productDefinition.ts).

```typescript
export interface ProductDefinitionNode {
  id: string;
  label: string;
  type?: string;
  description?: string;
  question?: string;
  parent?: string;
  children?: string[];
  contextSources?: ContextSource[];
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

The core business logic is implemented in [app/src/services/productDefinitionService.ts](file:///home/pouria/projects/pyramid-solver/app/src/services/productDefinitionService.ts).

### Core Functions
- **Template Initialization**: `createProductDefinition` creates a new definition from a selected template ID:
  - Templates are defined in [app/src/services/productDefinitionTemplates.ts](file:///home/pouria/projects/pyramid-solver/app/src/services/productDefinitionTemplates.ts).
  - Available templates include at least:
    - `classic-product-definition` (default structured 10-section tree for general product work)
    - `shape-up-methodology` (Shape Up flavored structure)
    - `blank-product-definition` (root-only, empty diagram)
  - The create modal lets the user pick a template via large selectable cards. If none is chosen, the default template is used. If an unknown template ID is passed, a blank definition is created.
- **Per-Node Updates**: `updateProductDefinitionNode` updates nested node fields (description, contextSources, etc.) via dot-path updates and refreshes `lastModified`.
- **Data Normalization**: `mapDefinitionFromStorage` ensures that database snake_case fields are correctly mapped to TypeScript camelCase properties.

### Invariants
- New definitions always start from a template selected in the create modal.
- The `root` node always has ID "root".
- Templates must be compatible with `ProductDefinitionNode` (including optional `contextSources`).

### UI Behavior
- **Create Modal**: The "New Product Definition" modal includes:
  - Title input.
  - Template selector rendered as a grid of large cards, backed by `PRODUCT_DEFINITION_TEMPLATES`.
  - The template card list is wrapped in a bounded `ScrollArea` with a fixed max height so long lists scroll inside the modal body and never push the dialog header/footer off-screen. Follow this pattern for any future long lists inside modals.
- **React Flow Cards**:
  - Each node card shows the node title and, when present, a 50–100 character preview of the description.
  - Nodes with non-empty descriptions are visually highlighted.
- **Topic Modal**:
  - Uses a large Shadcn `Textarea` for the description field inside a wide dialog, sized so the text area fits the modal without causing horizontal scrollbars.
  - Supports AI description suggestions via `AiRecommendationButton`.
  - Includes an **Attachments** section that allows selecting multiple `ContextSource` items via the global `ContextSelectorModal`, using the shared `ContextAttachmentsField` component.
  - Attachments can be removed either by unchecking them in the selector modal or by clicking the remove icon on each attachment badge in the Topic modal.
  - Node-level attachments are stored on `ProductDefinitionNode.contextSources`.
