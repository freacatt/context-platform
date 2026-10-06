import { useState, type ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { ChevronDown, FileText } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { workingRows } from '@shared/pyramid/board';
import { HOST_DEFAULTS, PANELIST_DEFAULTS } from '@shared/pyramid/config';
import { usd } from '@shared/pyramid/money';
import { displayName } from '@shared/pyramid/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Pyramid } from '@/data/types';

const ROLE_LABEL: Record<string, string> = { brief: 'Brief', panel: 'Blind round', critique: 'Critique round', host: 'Host' };
const ROLE_ORDER = Object.keys(ROLE_LABEL);

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-2">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
    {children}
  </section>
);

const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="rounded-lg border p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-semibold tabular-nums mt-0.5">{value}</div>
  </div>
);

/** Everything about a run in one collapsible panel: setup, models, prompts, brief, cost, timing. */
export function RunDetails({ pyramid }: { pyramid: Pyramid }) {
  const [open, setOpen] = useState(false);
  const details = useQuery(api.pyramids.details, open ? { id: pyramid._id } : 'skip');
  const { config } = pyramid;
  const modelCost = new Map(details?.models.map((m) => [m.model, m]) ?? []);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 p-4 text-left">
          <div>
            <div className="font-semibold">Run details</div>
            <div className="text-xs text-muted-foreground">
              {config.panel.length} panelist{config.panel.length > 1 ? 's' : ''} · host {config.host.model} · {config.boardSize}x
              {config.boardSize} board
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="flex flex-col gap-6 border-t pt-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Spent" value={`${usd(pyramid.spent)} of ${usd(pyramid.budgetCap)}`} />
              <Stat label="Model calls" value={details ? `${details.totalCalls}${details.failedCalls ? ` (${details.failedCalls} retried)` : ''}` : '…'} />
              <Stat
                label="Duration"
                value={details?.startedAt && details.endedAt ? formatDuration(details.endedAt - details.startedAt) : '-'}
              />
              <Stat label="Rows" value={`${pyramid.currentRow} / ${workingRows(config.boardSize).length}`} />
            </div>

            <Section title="Question">
              <p className="text-sm whitespace-pre-wrap">{config.question}</p>
              {config.context.trim() && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{config.context}</p>}
              {details && details.contextSources.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {details.contextSources.map((d, i) => (
                    <Badge key={i} variant="secondary" className="gap-1" title={d.label}>
                      <FileText className="h-3 w-3" /> {d.title}
                    </Badge>
                  ))}
                </div>
              )}
            </Section>

            {pyramid.brief && (
              <Section title="Context brief (written by the host)">
                <details className="rounded-md border bg-muted/30 p-3 text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Show the brief every row was given</summary>
                  <p className="mt-2 whitespace-pre-wrap">{pyramid.brief}</p>
                </details>
              </Section>
            )}

            <Section title="Models">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Prompt</TableHead>
                      <TableHead className="text-right">Temp.</TableHead>
                      <TableHead className="text-right">Max tokens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.panel.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap">
                          <span className="font-medium">{displayName(p) === p.model ? `Panelist ${i + 1}` : displayName(p)}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.model}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                          {p.systemPrompt ? (
                            <span title={p.systemPrompt} className="line-clamp-2">
                              {p.promptMode === 'replace' ? 'Replaces: ' : 'Adds: '}
                              {p.systemPrompt}
                            </span>
                          ) : config.defaultSystemPrompt ? (
                            'Custom panel prompt'
                          ) : (
                            'Built-in'
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.temperature ?? PANELIST_DEFAULTS.temperature}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.maxTokens ?? PANELIST_DEFAULTS.maxTokens}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-medium">Host</TableCell>
                      <TableCell className="font-mono text-xs">{config.host.model}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                        {config.host.systemPrompt ? <span title={config.host.systemPrompt} className="line-clamp-2">{config.host.systemPrompt}</span> : 'Built-in'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{config.host.temperature ?? HOST_DEFAULTS.temperature}</TableCell>
                      <TableCell className="text-right tabular-nums">{config.host.maxTokens ?? HOST_DEFAULTS.maxTokens}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Critique round {config.critiqueRound ? 'on' : 'off'}</Badge>
                <Badge variant="outline">Auto-approve {config.autoApprove ? 'on' : 'off'}</Badge>
                <Badge variant="outline">At least {config.minPanelists} panelist{config.minPanelists > 1 ? 's' : ''} per row</Badge>
              </div>
            </Section>

            <Section title="Cost">
              {details === undefined ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : details === null || details.totalCalls === 0 ? (
                <p className="text-sm text-muted-foreground">No model calls yet.</p>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model</TableHead>
                          <TableHead className="text-right">Calls</TableHead>
                          <TableHead className="text-right">Tokens in</TableHead>
                          <TableHead className="text-right">Tokens out</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...modelCost.values()].map((m) => (
                          <TableRow key={m.model}>
                            <TableCell className="font-mono text-xs">{m.model}</TableCell>
                            <TableCell className="text-right tabular-nums">{m.calls}</TableCell>
                            <TableCell className="text-right tabular-nums">{m.promptTokens.toLocaleString()}</TableCell>
                            <TableCell className="text-right tabular-nums">{m.completionTokens.toLocaleString()}</TableCell>
                            <TableCell className="text-right tabular-nums">{usd(m.cost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell className="font-semibold">Total</TableCell>
                          <TableCell className="text-right tabular-nums">{details.totalCalls}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {details.models.reduce((a, m) => a + m.promptTokens, 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {details.models.reduce((a, m) => a + m.completionTokens, 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{usd(details.totalCost)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(details.roles)
                      .sort(([a], [b]) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b))
                      .map(([role, r]) => (
                      <Badge key={role} variant="secondary" className="font-normal">
                        {ROLE_LABEL[role] ?? role}: {r.calls} call{r.calls > 1 ? 's' : ''} · {usd(r.cost)}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </Section>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
