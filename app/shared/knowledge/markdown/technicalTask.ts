import type { TechnicalTaskData } from '../../types/technicalTask';

export interface TechnicalTaskInput {
  _id: string;
  title: string;
  data: TechnicalTaskData;
}

const localDate = (iso: string) => new Date(iso).toLocaleString();

/** `formatDate` defaults to the viewer's locale; knowledge export passes a deterministic one. */
export function technicalTaskToMarkdown(task: TechnicalTaskInput, formatDate: (iso: string) => string = localDate): string {
  const meta = task.data.task_metadata;
  const desc = task.data.description?.main ?? { title: task.title };
  const lines = [
    `# ${desc.title || task.title}`,
    '',
    '## Metadata',
    `- **ID:** ${meta.task_id || task._id}`,
    `- **Type:** ${meta.task_type}`,
    `- **Priority:** ${meta.priority}`,
    `- **Status:** ${meta.status}`,
    `- **Created:** ${formatDate(meta.created_at)}`,
    `- **Estimated Hours:** ${meta.estimated_hours}`,
    '',
    '## Description',
  ];
  if (desc.summary) lines.push('### Summary', desc.summary, '');
  if (desc.bug_report) lines.push('### Bug Report', desc.bug_report, '');
  if (desc.impact) lines.push('### Impact', desc.impact, '');
  if (desc.steps_to_reproduce?.length) {
    lines.push('### Steps to Reproduce', ...desc.steps_to_reproduce.map((step, i) => `${i + 1}. ${step}`), '');
  }
  if (desc.acceptance_criteria?.length) {
    lines.push('### Acceptance Criteria', ...desc.acceptance_criteria.map((c) => `- [ ] ${c}`), '');
  }
  return lines.join('\n');
}
