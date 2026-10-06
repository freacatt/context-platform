import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { History, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { PLAN_STATUS_LABELS, planProgress, type TechnicalPlanSpec } from '@shared/specs/technicalPlan';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SpecListPage } from '@/features/specs/SpecListPage';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { withErrorToast } from '@/lib/errors';

/** Offers to convert tasks left over from the retired Technical Tasks app. */
function LegacyTasksNotice() {
  const { _id: workspaceId } = useWorkspace();
  const count = useQuery(api.technicalPlans.legacyTaskCount, { workspaceId });
  const convert = useMutation(api.technicalPlans.convertLegacyTasks);
  const [busy, setBusy] = useState(false);
  if (!count) return null;
  return (
    <Alert className="mb-6">
      <History className="h-4 w-4" />
      <AlertTitle>
        {count} {count === 1 ? 'task' : 'tasks'} from Technical Tasks
      </AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>Technical Tasks became Technical Plans. Convert them: descriptions, acceptance criteria and file lists carry over, links follow.</span>
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const result = await withErrorToast(() => convert({ workspaceId }), 'Could not convert the tasks');
            setBusy(false);
            if (result) toast.success(`Converted ${result.converted} ${result.converted === 1 ? 'task' : 'tasks'} into plans`);
          }}
        >
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Convert to plans
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export default function TechnicalPlansPage() {
  return (
    <SpecListPage<TechnicalPlanSpec>
      app="technicalPlans"
      noun="plan"
      placeholder="e.g., One-click checkout"
      notice={<LegacyTasksNotice />}
      cardBody={(d) => {
        const { done, total } = planProgress(d.spec);
        return (
          <div className="mt-3 space-y-2">
            <Badge variant="secondary">{PLAN_STATUS_LABELS[d.spec.status]}</Badge>
            {total > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Progress value={(done / total) * 100} className="h-1.5" aria-label="Steps done" />
                <span className="whitespace-nowrap">
                  {done}/{total}
                </span>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
