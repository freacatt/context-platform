---
alwaysApply: false
applyMode: intelligence
description: Rules for the Technical Tasks (Kanban) app.
globs:
  - "app/src/**/technicalTask*"
  - "app/src/**/TechnicalTask*"
category: "Technical"
primaryColorClass: "bg-blue-600"
---
# Technical Tasks Rules

## CRITICAL
- A "Backlog" pipeline is created with every workspace; the last pipeline cannot be deleted.
- Tasks MUST always belong to a `pipelineId`.

## Data Model
- Types: `TechnicalTask`, `TechnicalTaskData` in `app/shared/types/technicalTask.ts`
- Service: `app/convex/technicalTasks.ts` + `app/convex/pipelines.ts`

## Core Logic
- `technicalTasks.create`: new tasks go to the top of their pipeline with default data (`createDefaultTaskData`).
- `technicalTasks.move`: applies drag-and-drop placements (computed by `placementsAfterDrop`).
- `pipelines.reorder`: sets pipeline order from an ordered id list.
- `pipelines.remove`: deletes the pipeline and its tasks.
