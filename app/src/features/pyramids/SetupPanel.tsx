import { useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Link } from 'react-router-dom';
import { ChevronRight, KeyRound, Loader2, PlayCircle, Sigma } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { MAX_BOARD_SIZE, MIN_BOARD_SIZE, workingRows } from '@shared/pyramid/board';
import { contextLinkDepthOf, contextRefsOf, QUESTION_MAX } from '@shared/pyramid/config';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Pyramid } from '@/data/types';
import { useModels } from '@/features/ai/useModels';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { withErrorToast } from '@/lib/errors';
import { ContextSources } from './ContextSources';
import { EstimateStep } from './EstimateStep';
import { PanelEditor } from './PanelEditor';

type Config = Pyramid['config'];

const BOARD_SIZES = Array.from({ length: MAX_BOARD_SIZE - MIN_BOARD_SIZE + 1 }, (_, i) => MIN_BOARD_SIZE + i);

/**
 * The setup of a pyramid that has not started: question, context, panel, host, board.
 * Edits autosave; "Estimate cost" prices the setup, then "Start" runs it under a budget cap.
 * Mount it with `key={pyramid._id}`: the local draft never resets from its own server echo.
 */
export function SetupPanel({ pyramid }: { pyramid: Pyramid }) {
  const updateConfig = useMutation(api.pyramids.updateConfig);
  const estimate = useAction(api.pyramids.estimate);
  const confirm = useMutation(api.pyramids.confirm);
  const settings = useQuery(api.aiSettings.get, {});
  const presets = useQuery(api.pyramidPresets.list, {});
  const { models } = useModels();
  const wp = useWorkspacePath();

  const [config, setConfig] = useState<Config>(pyramid.config);
  const [cap, setCap] = useState<string | null>(null);
  const [busy, setBusy] = useState<'estimate' | 'start' | null>(null);
  const { status: saveStatus, schedule, flush } = useDebouncedSave(() => updateConfig({ id: pyramid._id, config }));

  const change = (patch: Partial<Config>) => {
    setConfig((c) => ({ ...c, ...patch }));
    schedule();
  };

  const runEstimate = async () => {
    setBusy('estimate');
    await flush();
    const result = await withErrorToast(() => estimate({ id: pyramid._id }), 'Could not estimate the cost');
    if (result) setCap(result.high);
    setBusy(null);
  };

  const start = async () => {
    setBusy('start');
    await withErrorToast(() => confirm({ id: pyramid._id, budgetCap: (cap ?? pyramid.estimate?.high ?? '').trim() || undefined }));
    setBusy(null);
  };

  const applyPreset = (presetId: string) => {
    const preset = presets?.find((p) => p._id === presetId);
    if (!preset) return;
    change({
      panel: preset.panel,
      host: preset.host,
      critiqueRound: preset.critiqueRound,
      defaultSystemPrompt: preset.defaultSystemPrompt,
      minPanelists: Math.min(config.minPanelists, preset.panel.length),
    });
  };

  const estimated = pyramid.status === 'estimated' && pyramid.estimate && saveStatus === 'saved';
  const ready = config.question.trim().length >= 10 && config.panel.some((p) => p.model.trim()) && config.host.model.trim();

  return (
    <div className="flex flex-col gap-4">
      {settings?.keySource === 'none' && (
        <Alert>
          <KeyRound className="h-4 w-4" />
          <AlertTitle>Connect OpenRouter first</AlertTitle>
          <AlertDescription>
            The panel and host are OpenRouter models.{' '}
            <Link to={wp('/settings')} className="underline font-medium">
              Add your API key in Settings
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-lg">Setup</CardTitle>
            <CardDescription>
              Ask one root question; a panel of models debates every row and a host concludes it.
            </CardDescription>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap" aria-live="polite">
            {saveStatus === 'saved' ? 'All changes saved' : saveStatus === 'error' ? 'Save failed' : 'Saving…'}
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-1.5">
            <Label htmlFor="pyramid-question" className="font-bold">
              Root question
            </Label>
            <Textarea
              id="pyramid-question"
              rows={3}
              maxLength={QUESTION_MAX}
              placeholder="What should we decide, diagnose, or design? (at least 10 characters)"
              value={config.question}
              onChange={(e) => change({ question: e.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pyramid-context" className="font-bold">
              Context
            </Label>
            <Textarea
              id="pyramid-context"
              rows={3}
              placeholder="Background, constraints, numbers… (optional)"
              value={config.context}
              onChange={(e) => change({ context: e.target.value })}
            />
            <ContextSources
              pyramid={pyramid}
              refs={contextRefsOf(config)}
              linkDepth={contextLinkDepthOf(config)}
              onChange={(contextRefs, contextLinkDepth) => change({ contextDocumentIds: [], contextRefs, contextLinkDepth })}
              flush={flush}
            />
          </div>

          {presets && presets.length > 0 && (
            <div className="grid gap-1.5 max-w-sm">
              <Label>Load preset</Label>
              <Select onValueChange={applyPreset}>
                <SelectTrigger aria-label="Load preset">
                  <SelectValue placeholder="Choose a saved panel…" />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <PanelEditor
            panel={config.panel}
            onChange={(panel) => change({ panel, minPanelists: Math.max(1, Math.min(config.minPanelists, panel.length)) })}
            host={config.host}
            onHostChange={(host) => change({ host })}
            models={models}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="grid gap-1.5">
              <Label>Board size</Label>
              <Select value={String(config.boardSize)} onValueChange={(size) => change({ boardSize: Number(size) })}>
                <SelectTrigger aria-label="Board size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOARD_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}x{n} ({workingRows(n).length} rows)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm h-9">
              <Checkbox checked={config.critiqueRound} onCheckedChange={(on) => change({ critiqueRound: on === true })} />
              Critique round
            </label>
            <label className="flex items-center gap-2 text-sm h-9">
              <Checkbox checked={config.autoApprove} onCheckedChange={(on) => change({ autoApprove: on === true })} />
              Auto-approve rows
            </label>
          </div>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="px-0 group">
                <ChevronRight className="mr-1 h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                Advanced
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-4 pt-2">
              <div className="grid gap-1.5">
                <Label htmlFor="pyramid-panel-prompt">Panel system prompt</Label>
                <Textarea
                  id="pyramid-panel-prompt"
                  rows={3}
                  placeholder="Optional; replaces the built-in panel prompt (a panelist's extra prompt is appended to it)"
                  value={config.defaultSystemPrompt ?? ''}
                  onChange={(e) => change({ defaultSystemPrompt: e.target.value || undefined })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pyramid-host-prompt">Host system prompt</Label>
                <Textarea
                  id="pyramid-host-prompt"
                  rows={3}
                  placeholder="Optional; replaces the built-in host prompt"
                  value={config.host.systemPrompt ?? ''}
                  onChange={(e) => change({ host: { ...config.host, systemPrompt: e.target.value || undefined } })}
                />
              </div>
              <div className="grid gap-1.5 max-w-[200px]">
                <Label htmlFor="pyramid-min-panelists">Minimum panelists per row</Label>
                <Input
                  id="pyramid-min-panelists"
                  type="number"
                  min={1}
                  max={Math.max(1, config.panel.length)}
                  value={config.minPanelists}
                  onChange={(e) =>
                    change({ minPanelists: Math.max(1, Math.min(config.panel.length || 1, Math.floor(Number(e.target.value) || 1))) })
                  }
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex justify-end">
            <Button variant={estimated ? 'outline' : 'default'} onClick={runEstimate} disabled={!ready || busy !== null}>
              {busy === 'estimate' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sigma className="mr-2 h-4 w-4" />}
              {estimated ? 'Re-estimate' : 'Estimate cost'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {estimated && pyramid.estimate && (
        <Card className="border-indigo-300 dark:border-indigo-800">
          <CardHeader>
            <CardTitle className="text-lg">Cost estimate</CardTitle>
            <CardDescription>Nothing is billed until you start. Models see the question and context via OpenRouter.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <EstimateStep estimate={pyramid.estimate} cap={cap ?? pyramid.estimate.high} onCapChange={setCap} />
            <div className="flex justify-end">
              <Button onClick={start} disabled={busy !== null || !(cap ?? pyramid.estimate.high).trim()}>
                {busy === 'start' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Start pyramid
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
