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

## Data Model
- Types: `ProductDefinition`, `ProductDefinitionNode` in `app/shared/types/productDefinition.ts`
- Service: `app/convex/productDefinitions.ts`
- Templates: `app/shared/productDefinitionTemplates.ts`

## Core Logic
- `createProductDefinition`: Creates from a selected template ID. Available templates: `classic-product-definition`, `shape-up-methodology`, `blank-product-definition`. Unknown template ID → blank definition.
- `updateProductDefinitionNode`: Updates nested node fields via dot-path, refreshes `lastModified`.

## UI Behavior
- **Create Modal**: Title input + template selector as grid of large cards (`PRODUCT_DEFINITION_TEMPLATES`). Template list wrapped in bounded `ScrollArea` with fixed max height — follow this pattern for all long lists in modals.
- **React Flow Cards**: Show node title + 50-100 char description preview. Nodes with descriptions visually highlighted.
