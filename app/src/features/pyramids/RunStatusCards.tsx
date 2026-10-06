import { lastRow } from '@shared/pyramid/board';
import { tryParseMoney, usd } from '@shared/pyramid/money';
import { displayName } from '@shared/pyramid/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Pyramid } from '@/data/types';
import { STATUS_CLASS, STATUS_LABEL } from './status';

export function StatusBadge({ status }: { status: Pyramid['status'] }) {
  return (
    <Badge variant="outline" className={`${STATUS_CLASS[status]} border-transparent`}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/** Status, progress, spend vs cap and panel of a run. */
export function RunStatusCards({ pyramid }: { pyramid: Pyramid }) {
  const { config } = pyramid;
  const total = lastRow(config.boardSize);
  const spent = tryParseMoney(pyramid.spent) ?? 0n;
  const cap = tryParseMoney(pyramid.budgetCap);
  // Percent with 0.1% resolution, computed exactly.
  const spentPercent = cap && cap > 0n ? Number((spent * 1000n) / cap) / 10 : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Status</div>
          <StatusBadge status={pyramid.status} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Progress</div>
          <div className="font-semibold tabular-nums">
            Row {pyramid.currentRow} / {total}
          </div>
          <Progress value={(pyramid.currentRow / total) * 100} className="mt-2 h-1.5" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Spent / cap</div>
          <div className="font-semibold tabular-nums">
            {usd(pyramid.spent)} <span className="text-muted-foreground font-normal">of {usd(pyramid.budgetCap)}</span>
          </div>
          {cap !== null && <Progress value={spentPercent} className="mt-2 h-1.5" />}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Panel</div>
          <div className="text-sm truncate" title={config.panel.map(displayName).join(', ')}>
            {config.panel.length} panelists · host <span className="font-mono text-xs">{config.host.model}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {config.boardSize}x{config.boardSize}
            {config.critiqueRound ? ' · critique round' : ''}
            {config.autoApprove ? ' · auto-approve' : ''}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
