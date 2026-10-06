import { DECISION_STATUS_LABELS, type DecisionSpec } from '@shared/specs/decision';
import { Badge } from '@/components/ui/badge';
import { SpecListPage } from '@/features/specs/SpecListPage';

export default function DecisionsPage() {
  return (
    <SpecListPage<DecisionSpec>
      app="decisions"
      noun="decision"
      placeholder="e.g., Use Convex as the only backend"
      cardBody={(d) => (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={d.spec.status === 'accepted' ? 'default' : 'secondary'}>{DECISION_STATUS_LABELS[d.spec.status]}</Badge>
          {d.spec.date && <span>{d.spec.date}</span>}
        </div>
      )}
    />
  );
}
