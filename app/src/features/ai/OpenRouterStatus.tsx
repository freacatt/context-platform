import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink, KeyRound, Loader2, RefreshCw, Wallet } from 'lucide-react';
import type { OpenRouterKeyStatus } from '@shared/ai';
import { formatMoney, parseMoney, usdCompact } from '@shared/pyramid/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { useOpenRouterStatus } from './useOpenRouterStatus';

/** The figure the header pill shows: what is left, else credits, else today's spend. */
function headline(s: OpenRouterKeyStatus): { value: string; label: string } {
  if (s.limitRemaining !== null) return { value: usdCompact(s.limitRemaining), label: 'left' };
  if (s.credits) return { value: usdCompact(s.credits.remaining), label: 'credits' };
  return { value: usdCompact(s.usage.daily ?? s.usage.total), label: s.usage.daily !== null ? 'today' : 'used' };
}

const Tile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-muted/50 px-3 py-2">
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold tabular-nums">{value}</div>
  </div>
);

function Details({ status, updatedAt, refreshing, refresh }: { status: OpenRouterKeyStatus } & Pick<ReturnType<typeof useOpenRouterStatus>, 'updatedAt' | 'refreshing' | 'refresh'>) {
  const wp = useWorkspacePath();
  const limit = status.limit !== null ? parseMoney(status.limit) : null;
  const used = limit !== null && status.limitRemaining !== null ? limit - parseMoney(status.limitRemaining) : null;
  const percent = used !== null && limit && limit > 0n ? Number((used * 1000n) / limit) / 10 : 0;
  const head = headline(status);
  const { usage } = status;
  const tiles: [string, string | null][] = [
    ['Today', usage.daily],
    ['This week', usage.weekly],
    ['This month', usage.monthly],
    ['All time', usage.total],
  ];

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-2 p-4 pb-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">OpenRouter</div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">{status.label ?? 'API key'}</div>
        </div>
        <div className="flex shrink-0 gap-1">
          {status.source === 'deployment' && (
            <Badge variant="secondary" className="text-[10px]">
              Shared key
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            {status.isFreeTier ? 'Free tier' : 'Paid'}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums">{head.value}</span>
          <span className="text-sm text-muted-foreground">{head.label === 'left' ? 'left on this key' : head.label}</span>
        </div>
        {limit !== null && used !== null && (
          <>
            <Progress value={percent} className="h-1.5" />
            <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
              <span>
                {usdCompact(formatMoney(used))} of {usdCompact(status.limit)} used
              </span>
              {status.limitReset && <span>resets {status.limitReset}</span>}
            </div>
          </>
        )}
        {status.credits && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Account credits</span>
            <span className="font-medium tabular-nums">
              {usdCompact(status.credits.remaining)} <span className="text-muted-foreground font-normal">of {usdCompact(status.credits.total)}</span>
            </span>
          </div>
        )}
      </div>

      <div className="border-t px-4 py-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Spend on this key</div>
        <div className="grid grid-cols-2 gap-2">
          {tiles
            .filter((t): t is [string, string] => t[1] !== null)
            .map(([label, value]) => (
              <Tile key={label} label={label} value={usdCompact(value)} />
            ))}
        </div>
        {!status.credits && (
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            Account balance needs a management key —{' '}
            <a href="https://openrouter.ai/settings/credits" target="_blank" rel="noreferrer" className="underline">
              see it on OpenRouter
            </a>
            .
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t px-2 py-2">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {updatedAt ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Refresh'}
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" asChild>
            <a href="https://openrouter.ai/activity" target="_blank" rel="noreferrer">
              Activity <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
            <Link to={wp('/settings')}>Settings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Header pill with the OpenRouter key's spend and limits; opens the details. */
export function OpenRouterStatus() {
  const wp = useWorkspacePath();
  const { status, error, updatedAt, refreshing, refresh } = useOpenRouterStatus();

  if (status === null) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link to={wp('/settings')}>
          <KeyRound className="mr-2 h-4 w-4" /> Connect OpenRouter
        </Link>
      </Button>
    );
  }

  const head = status ? headline(status) : null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" aria-label="OpenRouter usage">
          {error && !status ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          ) : status === undefined ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="hidden sm:inline text-muted-foreground font-normal">OpenRouter</span>
          {head && (
            <span className="tabular-nums">
              {head.value} <span className="text-muted-foreground font-normal">{head.label}</span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {status ? (
          <Details status={status} updatedAt={updatedAt} refreshing={refreshing} refresh={refresh} />
        ) : error ? (
          <div className="flex flex-col gap-3 p-4 text-sm">
            <p className="text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={refresh}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
