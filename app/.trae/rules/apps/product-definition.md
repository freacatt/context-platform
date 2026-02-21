---
alwaysApply: false
applyMode: intelligence
description: Rules for the Product Definition app.
globs:
  - "app/src/**/productDefinition*"
  - "app/src/**/ProductDefinition*"
category: "Problem Solving, Thinking and Planning"
primaryColorClass: "bg-indigo-600"
---
# Product Definition Rules

## CRITICAL
- New definitions MUST start from a template selected in the create modal.
- Root node MUST always have ID `"root"`.
- Templates MUST be compatible with `ProductDefinitionNode` (including optional `contextSources`).

## Data Model
- Types: `ProductDefinition`, `ProductDefinitionNode` in `app/src/types/productDefinition.ts`
- Service: `app/src/services/productDefinitionService.ts`
- Templates: `app/src/services/productDefinitionTemplates.ts`

## Core Logic
- `createProductDefinition`: Creates from a selected template ID. Available templates: `classic-product-definition`, `shape-up-methodology`, `blank-product-definition`. Unknown template ID → blank definition.
- `updateProductDefinitionNode`: Updates nested node fields via dot-path, refreshes `lastModified`.
- `mapDefinitionFromStorage`: Maps snake_case DB fields to camelCase TypeScript properties.

## UI Behavior
- **Create Modal**: Title input + template selector as grid of large cards (`PRODUCT_DEFINITION_TEMPLATES`). Template list wrapped in bounded `ScrollArea` with fixed max height — follow this pattern for all long lists in modals.
- **React Flow Cards**: Show node title + 50-100 char description preview. Nodes with descriptions visually highlighted.
- **Topic Modal**: Large `Textarea` for description. AI suggestions via `AiRecommendationButton`. Attachments section using `ContextSelectorModal` and `ContextAttachmentsField`. Node-level attachments stored on `ProductDefinitionNode.contextSources`.
