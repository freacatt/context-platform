import { useMemo, useState } from 'react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Ban, Download, ExternalLink, Loader2, PlayCircle, Scale, Wallet } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { finalLabel, rowLabels } from '@shared/pyramid/board';
import { hasContext } from '@shared/pyramid/config';
import { usd } from '@shared/pyramid/money';
import type { ReportFormat } from '@shared/pyramid/report';
import { EDITABLE_STATUSES, TERMINAL_STATUSES, type CellRecord } from '@shared/pyramid/types';
import { SectionSpinner } from '@/components/layout/FullPageSpinner';
import { NotFound } from '@/components/layout/NotFound';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { Pyramid } from '@/data/types';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { downloadFile, safeFilename } from '@/lib/download';
import { withErrorToast } from '@/lib/errors';
import { LinksButton } from '@/features/knowledge/LinksButton';
import BlockModal from './BlockModal';
import { CheckpointPanel } from './CheckpointPanel';
import PyramidBoard from './PyramidBoard';
import { RunDetails } from './RunDetails';
import { RunStatusCards } from './RunStatusCards';
import { SetupPanel } from './SetupPanel';

const EXPORTS: { format: ReportFormat; name: string; suffix: string; type: string }[] = [
  { format: 'md', name: 'Markdown report (.md)', suffix: 'report.md', type: 'text/markdown' },
  { format: 'html', name: 'HTML report (.html)', suffix: 'report.html', type: 'text/html' },
  { format: 'transcripts', name: 'Transcripts (.md)', suffix: 'transcripts.md', type: 'text/markdown' },
];

function RunAlerts({ pyramid }: { pyramid: Pyramid }) {
  const resume = useMutation(api.pyramids.resume);
  const raiseBudget = useMutation(api.pyramids.raiseBudget);
  const [newCap, setNewCap] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await withErrorToast(fn);
    setBusy(false);
  };

  if (pyramid.status === 'failed') {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Run failed at row {pyramid.currentRow + 1}</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span>{pyramid.error}</span>
          <div>
            <Button size="sm" disabled={busy} onClick={() => act(() => resume({ id: pyramid._id }))}>
              <PlayCircle size={14} className="mr-2" /> Resume
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  if (pyramid.status === 'paused_budget') {
    return (
      <Alert className="border-orange-300 dark:border-orange-800">
        <Wallet className="h-4 w-4" />
        <AlertTitle>Paused by the budget guard</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span>
            Spent {usd(pyramid.spent)} of {usd(pyramid.budgetCap)}.{' '}
            {pyramid.error ?? 'The remaining rows are projected to go past the cap.'} Raise it to continue.
          </span>
          <div className="flex gap-2 max-w-sm">
            <Input
              aria-label="New budget cap"
              placeholder="new cap (USD)"
              inputMode="decimal"
              value={newCap}
              onChange={(e) => setNewCap(e.target.value)}
            />
            <Button disabled={busy || !newCap.trim()} onClick={() => act(() => raiseBudget({ id: pyramid._id, budgetCap: newCap.trim() }))}>
              Raise cap
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  if (pyramid.status === 'running') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" />
        {hasContext(pyramid.config) && pyramid.brief === undefined
          ? 'The host is writing the context brief…'
          : `The panel is debating row ${pyramid.currentRow + 1}…`}
      </div>
    );
  }
  return null;
}

function FinalAnswer({ record }: { record: CellRecord }) {
  const { cell } = record;
  return (
    <Card className="border-emerald-300 dark:border-emerald-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          Final answer <Badge variant="outline">confidence {cell.confidence.toFixed(2)}</Badge>
        </CardTitle>
        {cell.combinedQuestion && <p className="text-sm text-muted-foreground">{cell.combinedQuestion}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p className="whitespace-pre-wrap">{cell.conclusion}</p>
        {cell.dissent.length > 0 && (
          <ul className="list-disc pl-5 text-amber-700 dark:text-amber-400">
            {cell.dissent.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PyramidEditor({ pyramid }: { pyramid: Pyramid }) {
  const navigate = useNavigate();
  const wp = useWorkspacePath();
  const convex = useConvex();
  const cancel = useMutation(api.pyramids.cancel);
  const saveAsDecision = useMutation(api.decisions.createFromPyramid);
  const cellList = useQuery(api.pyramids.cells, { id: pyramid._id });
  const [selected, setSelected] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const { config, status } = pyramid;
  const n = config.boardSize;
  const records = useMemo(() => Object.fromEntries((cellList ?? []).map((c) => [c.label, c])), [cellList]);
  const checkpointRow = status === 'awaiting_approval' ? pyramid.currentRow : null;
  const checkpointRecords = checkpointRow === null ? [] : rowLabels(n, checkpointRow).flatMap((l) => records[l] ?? []);
  const finalRecord = records[finalLabel(n)];
  const editable = (label: string) => checkpointRow !== null && records[label]?.row === checkpointRow;
  const setup = EDITABLE_STATUSES.includes(status);

  const loadReport = (format: ReportFormat) => convex.query(api.pyramids.report, { id: pyramid._id, format });
  const exportReport = (format: ReportFormat, suffix: string, type: string) =>
    withErrorToast(async () => {
      const text = await loadReport(format);
      if (text !== null) downloadFile(text, safeFilename(pyramid.title, suffix), type);
    }, 'Could not build the report');
  const openHtml = () =>
    withErrorToast(async () => {
      const html = await loadReport('html');
      if (html !== null) window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank', 'noopener');
    }, 'Could not build the report');

  return (
    <div className="h-full bg-muted/20 flex flex-col">
      <div className="container mx-auto p-4 pb-2 flex flex-col gap-4">
        <div>
          <Button variant="ghost" onClick={() => navigate(wp('/pyramids'))} className="hover:bg-muted">
            <ArrowLeft size={16} className="mr-2" /> Back to Pyramids
          </Button>
        </div>

        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{pyramid.title}</h1>
            {!setup && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{config.question}</p>}
          </div>
          <div className="flex gap-2">
            <LinksButton app="pyramids" id={pyramid._id} />
            {!setup && (
              <>
                  {status === 'completed' && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const id = await withErrorToast(() => saveAsDecision({ pyramidId: pyramid._id }), 'Could not save the decision');
                      if (id) navigate(wp(`/decision/${id}`));
                    }}
                  >
                    <Scale size={16} className="mr-2" /> Save as decision
                  </Button>
                )}
              {!TERMINAL_STATUSES.includes(status) && (
                  <Button variant="outline" onClick={() => withErrorToast(() => cancel({ id: pyramid._id }))}>
                    <Ban size={16} className="mr-2" /> Cancel run
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Download size={16} className="mr-2" /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={openHtml}>
                      <ExternalLink size={14} className="mr-2" /> Open HTML report
                    </DropdownMenuItem>
                    {EXPORTS.map((e) => (
                      <DropdownMenuItem key={e.format} onClick={() => exportReport(e.format, e.suffix, e.type)}>
                        {e.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {setup ? (
          <SetupPanel key={pyramid._id} pyramid={pyramid} />
        ) : (
          <>
            <RunStatusCards pyramid={pyramid} />
            <RunAlerts pyramid={pyramid} />
            {status === 'completed' && finalRecord && <FinalAnswer record={finalRecord} />}
            <RunDetails pyramid={pyramid} />
            {checkpointRow !== null && (
              <CheckpointPanel key={checkpointRow} pyramid={pyramid} rowRecords={checkpointRecords} edits={edits} onEditsChange={setEdits} />
            )}
          </>
        )}
      </div>

      <div className="px-4 pb-4 w-full relative h-[70vh] min-h-[480px]">
        <PyramidBoard
          size={n}
          records={records}
          rootQuestion={config.question}
          currentRow={pyramid.currentRow}
          running={status === 'running'}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      {selected && (
        <BlockModal
          key={selected}
          pyramidId={pyramid._id}
          label={selected}
          size={n}
          records={records}
          rootQuestion={config.question}
          editable={editable(selected)}
          pendingEdit={edits[selected]}
          onClose={() => setSelected(null)}
          onEdit={(label, question) => setEdits({ ...edits, [label]: question })}
        />
      )}
    </div>
  );
}

export default function PyramidEditorPage() {
  const { pyramidId } = useParams<{ pyramidId: string }>();
  const wp = useWorkspacePath();
  const pyramid = useQuery(api.pyramids.get, { id: pyramidId! });

  if (pyramid === undefined) return <SectionSpinner />;
  if (pyramid === null) return <NotFound what="Pyramid" backTo={wp('/pyramids')} />;
  return <PyramidEditor pyramid={pyramid} />;
}
