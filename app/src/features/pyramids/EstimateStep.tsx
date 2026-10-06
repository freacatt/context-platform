import { usd } from '@shared/pyramid/money';
import type { CostEstimate } from '@shared/pyramid/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface EstimateStepProps {
  estimate: CostEstimate;
  cap: string;
  onCapChange: (cap: string) => void;
}

/** Low / expected / high cost, per-model calls, and the budget cap to start with. */
export function EstimateStep({ estimate, cap, onCapChange }: EstimateStepProps) {
  const models = Object.keys(estimate.calls).sort();
  const stats: [string, string][] = [
    ['Low', estimate.low],
    ['Expected', estimate.expected],
    ['High', estimate.high],
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {stats.map(([name, value]) => (
          <div key={name} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{name}</div>
            <div className="text-xl font-bold tabular-nums">{usd(value)}</div>
          </div>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead className="text-right">Calls</TableHead>
            <TableHead className="text-right">Expected</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.map((m) => (
            <TableRow key={m}>
              <TableCell className="font-mono text-xs">{m}</TableCell>
              <TableCell className="text-right tabular-nums">{estimate.calls[m]}</TableCell>
              <TableCell className="text-right tabular-nums">{usd(estimate.perModel[m])}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="grid gap-1.5 max-w-xs">
        <Label htmlFor="pyramid-cap" className="font-bold">
          Budget cap (USD)
        </Label>
        <Input id="pyramid-cap" inputMode="decimal" value={cap} onChange={(e) => onCapChange(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          The run pauses before projected spend would pass this cap. Defaults to the high estimate.
        </p>
      </div>
    </div>
  );
}
