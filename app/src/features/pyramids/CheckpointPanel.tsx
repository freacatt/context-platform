import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { usd } from '@shared/pyramid/money';
import type { CellRecord } from '@shared/pyramid/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Pyramid } from '@/data/types';
import { withErrorToast } from '@/lib/errors';

interface CheckpointPanelProps {
  pyramid: Pyramid;
  /** Cells of the checkpoint row, in board order. */
  rowRecords: CellRecord[];
  edits: Record<string, string>;
  onEditsChange: (edits: Record<string, string>) => void;
}

/** Checkpoint after a row: read the host's conclusions, edit next questions, approve. */
export function CheckpointPanel({ pyramid, rowRecords, edits, onEditsChange }: CheckpointPanelProps) {
  const row = pyramid.currentRow;
  const summary = useQuery(api.pyramids.rowSummary, { id: pyramid._id, row });
  const approve = useMutation(api.pyramids.approveRow);
  const [busy, setBusy] = useState(false);

  const changed = Object.fromEntries(
    Object.entries(edits).filter(([lbl, q]) => {
      const original = rowRecords.find((r) => r.label === lbl)?.cell.nextQuestion;
      return q.trim() && q.trim() !== original;
    }),
  );
  const count = Object.keys(changed).length;

  const onApprove = async () => {
    setBusy(true);
    const ok = await withErrorToast(() => approve({ id: pyramid._id, row, edits: changed }), 'Could not approve the row');
    setBusy(false);
    if (ok !== undefined) onEditsChange({});
  };

  return (
    <Card className="border-amber-300 dark:border-amber-800">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-lg">Checkpoint · Row {row}</CardTitle>
          <CardDescription>Review the host&apos;s conclusions. Edit any next question before the next row is debated.</CardDescription>
        </div>
        {summary && <Badge variant="outline">row cost {usd(summary.cost)}</Badge>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {summary && summary.failedPanelists.length > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-400">Failed panelists: {summary.failedPanelists.join(', ')}</p>
        )}
        {rowRecords.map(({ label, cell }) => (
          <div key={label} className="border-t pt-4 first:border-t-0 first:pt-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-indigo-600 hover:bg-indigo-600">{label}</Badge>
              <span className="text-xs text-muted-foreground">confidence {cell.confidence.toFixed(2)}</span>
            </div>
            {cell.combinedQuestion && <p className="text-sm text-muted-foreground mb-1">{cell.combinedQuestion}</p>}
            <p className="text-sm whitespace-pre-wrap">{cell.conclusion}</p>
            {cell.dissent.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-sm text-amber-700 dark:text-amber-400">
                {cell.dissent.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
            {cell.nextQuestion !== null && (
              <div className="mt-2 grid gap-1.5">
                <Label htmlFor={`next-${label}`} className="text-xs font-bold">
                  Next question
                </Label>
                <Textarea
                  id={`next-${label}`}
                  rows={2}
                  value={edits[label] ?? cell.nextQuestion}
                  onChange={(e) => onEditsChange({ ...edits, [label]: e.target.value })}
                />
              </div>
            )}
          </div>
        ))}
        <div className="flex justify-end">
          <Button onClick={onApprove} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {count ? `Approve with ${count} edit${count > 1 ? 's' : ''}` : 'Approve row'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
