alwaysApply: false
applyMode: intelligence
category: "Technical"
primaryColorClass: "bg-blue-600"
---
# Technical Tasks Rules

## Data Structure

The core data structure for this app is the `TechnicalTask` interface, defined in [app/src/types/technicalTask.ts](file:///home/pouria/projects/pyramid-solver/app/src/types/technicalTask.ts).

```typescript
export interface TechnicalTask {
    id: string;
    pipelineId: string;
    userId: string;
    workspaceId?: string;
    title: string;
    type: TaskType;
    technicalArchitectureId: string; // Ref to specific technical architecture
    data: TechnicalTaskData;
    createdAt: Date;
    updatedAt: Date;
    order: number;
}

export interface TechnicalTaskData {
    task_metadata: TaskMetadata;
    description: Section<DescriptionMain, DescriptionAdvanced>;
    components: Section<ComponentsMain, ComponentsAdvanced>;
    architecture: Section<ArchitectureMain, ArchitectureAdvanced>;
    dependencies: Section<DependenciesMain, DependenciesAdvanced>;
    unit_tests: Section<UnitTestsMain, UnitTestsAdvanced>;
    validation_checklist: Section<ValidationChecklistMain, ValidationChecklistAdvanced>;
    preservation_rules: Section<PreservationRulesMain, PreservationRulesAdvanced>;
}
```

## Logic & Rules

The core business logic is implemented in [app/src/services/technicalTaskService.ts](file:///home/pouria/projects/pyramid-solver/app/src/services/technicalTaskService.ts).

### Core Functions
- **Pipeline Management**: `getPipelines` fetches task pipelines and automatically deduplicates "Backlog" pipelines if multiple are found (merging tasks into one).
- **Batch Updates**: 
  - `batchUpdatePipelines`: Updates the order of pipelines.
  - `batchUpdateTasks`: Updates the order and pipeline assignment of tasks (drag-and-drop).
- **Dual Write**: `batchUpdateTasks` updates both `technicalTasks` (local/app context) and `globalTasks` (global context) to ensure visibility.

### Invariants
- A "Backlog" pipeline is automatically created if no pipelines exist.
- Tasks must always belong to a `pipelineId`.
