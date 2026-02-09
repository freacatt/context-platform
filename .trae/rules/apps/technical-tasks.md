---
alwaysApply: false
---
# Technical Tasks Rules

## Data Structure

The core data structure for this app is the `TechnicalTask` interface, defined in [src/types/technicalTask.ts](file:///home/pouria/projects/pyramid-solver/src/types/technicalTask.ts).

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
