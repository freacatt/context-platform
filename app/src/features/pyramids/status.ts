import type { PyramidStatus } from '@shared/pyramid/types';

export const STATUS_LABEL: Record<PyramidStatus, string> = {
  draft: 'Draft',
  estimated: 'Estimated',
  running: 'Running',
  awaiting_approval: 'Awaiting approval',
  paused_budget: 'Paused (budget)',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const STATUS_CLASS: Record<PyramidStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  estimated: 'bg-muted text-muted-foreground',
  running: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  awaiting_approval: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  paused_budget: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  cancelled: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};
