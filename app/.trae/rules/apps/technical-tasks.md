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
- A "Backlog" pipeline is auto-created if no pipelines exist.
- Tasks MUST always belong to a `pipelineId`.
- `batchUpdateTasks` MUST dual-write to both `technicalTasks` and `globalTasks`.

## Data Model
- Types: `TechnicalTask`, `TechnicalTaskData` in `app/src/types/technicalTask.ts`
- Service: `app/src/services/technicalTaskService.ts`

## Core Logic
- `getPipelines`: Fetches pipelines, auto-deduplicates "Backlog" if multiple found.
- `batchUpdatePipelines`: Updates pipeline order.
- `batchUpdateTasks`: Updates task order and pipeline assignment (drag-drop). Dual-writes to `technicalTasks` + `globalTasks`.
