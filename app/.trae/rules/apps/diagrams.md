---
alwaysApply: false
applyMode: intelligence
description: Rules for the Diagrams app.
globs:
  - "app/src/**/diagram*"
  - "app/src/**/Diagram*"
category: "Problem Solving, Thinking and Planning"
primaryColorClass: "bg-rose-600"
---
# Diagrams Rules

## CRITICAL
- `nodes` and `edges` MUST default to empty arrays if undefined in storage.

## Data Model
- Types: `Diagram`, `DiagramNodeData` in `app/src/types/diagram.ts`
- Service: `app/src/services/diagramService.ts`

## Core Logic
- Standard CRUD: `createDiagram`, `getDiagram`, `updateDiagram`, `deleteDiagram`.
- New diagrams start with empty `nodes` and `edges` arrays.
- `updateDiagram` auto-updates `lastModified`.
