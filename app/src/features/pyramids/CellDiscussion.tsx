import { useQuery } from 'convex/react';
import { AlertTriangle, Crown, Loader2, MessagesSquare, RotateCcw } from 'lucide-react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../../../convex/_generated/api';
import { usd } from '@shared/pyramid/money';
import { Badge } from '@/components/ui/badge';
import type { Id } from '@/data/types';

type Entry = NonNullable<FunctionReturnType<typeof api.pyramids.discussion>>[number];

const PHASES: { role: Entry['role']; title: string; hint: string }[] = [
  { role: 'panel', title: 'Blind round', hint: 'Each panelist answered without seeing the others.' },
  { role: 'critique', title: 'Critique round', hint: "Each panelist read the others' answers (anonymised) and revised." },
  { role: 'host', title: 'Host synthesis', hint: 'The host weighed the final answers and concluded the cell.' },
];

const initials = (name: string) => {
  const base = name.includes('/') ? name.split('/').pop()! : name;
  return base.replace(/[^a-z0-9]/gi, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
};

const Line = ({ label, children }: { label: string; children: string }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    <p className="text-sm whitespace-pre-wrap">{children}</p>
  </div>
);

function Message({ entry }: { entry: Entry }) {
  const isHost = entry.role === 'host';
  const who = isHost ? 'Host' : (entry.panelist ?? entry.model);
  const s = entry.statement;
  const failed = entry.status !== 'ok';

  return (
    <div className={`flex gap-3 ${failed ? 'opacity-70' : ''}`}>
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          isHost ? 'bg-indigo-600 text-white' : 'bg-muted text-foreground'
        }`}
        aria-hidden
      >
        {isHost ? <Crown className="h-4 w-4" /> : initials(who)}
      </div>
      <div className="min-w-0 flex-1 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
          <span className="font-semibold text-sm">{who}</span>
          {who !== entry.model && <span className="font-mono text-xs text-muted-foreground">{entry.model}</span>}
          {entry.attempt > 1 && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <RotateCcw className="h-3 w-3" /> retry {entry.attempt - 1}
            </Badge>
          )}
          {entry.status === 'invalid' && <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600">unusable output</Badge>}
          {entry.status === 'error' && <Badge variant="outline" className="text-[10px] border-red-400 text-red-600">failed</Badge>}
          <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
            {entry.promptTokens + entry.completionTokens > 0 && `${entry.promptTokens.toLocaleString()} → ${entry.completionTokens.toLocaleString()} tokens · `}
            {usd(entry.cost)} · {((entry.endedAt - entry.startedAt) / 1000).toFixed(1)}s
          </span>
        </div>

        {entry.status === 'error' ? (
          <p className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {entry.output}
          </p>
        ) : s ? (
          <div className="flex flex-col gap-2">
            {s.combinedQuestion && <Line label="Combined question">{s.combinedQuestion}</Line>}
            {s.answer && <Line label="Answer">{s.answer}</Line>}
            {s.conclusion && <Line label="Conclusion">{s.conclusion}</Line>}
            {s.dissent.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Dissent</div>
                <ul className="list-disc pl-5 text-sm text-amber-700 dark:text-amber-400">
                  {s.dissent.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            {s.nextQuestion && <Line label="Next question">{s.nextQuestion}</Line>}
            {(s.confidence !== null || s.primaryParent) && (
              <div className="flex gap-2 text-xs text-muted-foreground">
                {s.confidence !== null && <span>confidence {s.confidence.toFixed(2)}</span>}
                {s.primaryParent && <span>· builds mainly on {s.primaryParent}</span>}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">This reply did not contain this cell.</p>
        )}

        {entry.status !== 'error' && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-muted-foreground">Raw output</summary>
            <pre className="mt-1 max-h-64 overflow-auto rounded bg-muted p-2 text-[11px] whitespace-pre-wrap break-words">{entry.output}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

/** The roundtable behind one cell: blind answers, critiques and the host's synthesis, in order. */
export function CellDiscussion({ pyramidId, label }: { pyramidId: Id<'pyramids'>; label: string }) {
  const entries = useQuery(api.pyramids.discussion, { id: pyramidId, label });

  if (entries === undefined) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the discussion…
      </div>
    );
  }
  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
        <MessagesSquare className="h-8 w-8" />
        No discussion recorded for this block.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {PHASES.map(({ role, title, hint }) => {
        const phase = entries.filter((e) => e.role === role);
        if (phase.length === 0) return null;
        return (
          <section key={role} className="flex flex-col gap-3">
            <div>
              <h4 className="font-semibold text-sm">{title}</h4>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
            {phase.map((entry) => (
              <Message key={entry._id} entry={entry} />
            ))}
          </section>
        );
      })}
      <p className="text-xs text-muted-foreground">Full prompts for every call are in Export → Transcripts.</p>
    </div>
  );
}
