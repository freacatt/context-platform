import type { TaskType, TechnicalTaskData } from './types/technicalTask';

export const TASK_TYPES = ['NEW_TASK', 'FIX_TASK'] as const satisfies readonly TaskType[];

export const DEFAULT_PIPELINE_TITLE = 'Backlog';

/** Starting data for a new task: metadata filled in, every section present but empty. */
export const createDefaultTaskData = (
  params: { title: string; type: TaskType; architectureRef: string; now?: Date },
): TechnicalTaskData => ({
  task_metadata: {
    task_id: '',
    task_type: params.type,
    parent_architecture_ref: params.architectureRef,
    created_at: (params.now ?? new Date()).toISOString(),
    priority: 'MEDIUM',
    status: 'PENDING',
    assigned_to: '',
    estimated_hours: 0,
  },
  description: { main: { title: params.title }, advanced: {} },
  components: { main: {}, advanced: {} },
  architecture: { main: {}, advanced: {} },
  dependencies: { main: {}, advanced: {} },
  unit_tests: { main: {} as TechnicalTaskData['unit_tests']['main'], advanced: {} },
  validation_checklist: { main: {}, advanced: {} as TechnicalTaskData['validation_checklist']['advanced'] },
  preservation_rules: {
    main: {} as TechnicalTaskData['preservation_rules']['main'],
    advanced: {} as TechnicalTaskData['preservation_rules']['advanced'],
  },
});
