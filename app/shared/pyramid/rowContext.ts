/**
 * What a row's prompts are built from: the root question, the brief, a summary of every
 * earlier cell (≤ 100 words each) and the full records of the current row's parents.
 */
import { coord, kind, label, lastRow, parents, phase, rowCoords, type CellKind } from './board';
import type { HostCell } from './types';

export interface EarlierSummary {
  label: string;
  row: number;
  summary: string;
}

export interface ParentRecord {
  label: string;
  kind: CellKind;
  combinedQuestion: string | null;
  conclusion: string | null;
  dissent: string[];
  nextQuestion: string | null;
}

export interface CellTask {
  label: string;
  kind: CellKind;
  parentQuestions: { label: string; question: string }[];
}

export interface RowContext {
  question: string;
  brief: string | null;
  boardSize: number;
  row: number;
  lastRow: number;
  phase: string;
  summaries: EarlierSummary[];
  parents: ParentRecord[];
  cells: CellTask[];
  labels: string[];
}

/**
 * `results` maps label → HostCell carrying the EFFECTIVE (possibly user-edited) next question.
 * Throws when a parent of this row has not been concluded.
 */
export function buildRowContext(
  n: number,
  results: Record<string, HostCell>,
  row: number,
  brief: string | null,
  question: string,
): RowContext {
  const coords = rowCoords(n, row);
  const parentLabels = [...new Set(coords.flatMap(([u, v]) => parents(u, v)))].sort(
    (a, b) => coord(n, a)[0] - coord(n, b)[0],
  );

  const record = (lbl: string): ParentRecord => {
    const k = kind(n, ...coord(n, lbl));
    if (k === 'root') {
      return { label: lbl, kind: k, combinedQuestion: null, conclusion: null, dissent: [], nextQuestion: question };
    }
    const cell = results[lbl];
    if (!cell) throw new Error(`row ${row} needs ${lbl}, which has no committed result`);
    return {
      label: lbl,
      kind: k,
      combinedQuestion: cell.combinedQuestion,
      conclusion: cell.conclusion,
      dissent: cell.dissent,
      nextQuestion: cell.nextQuestion,
    };
  };
  const parentRecords = new Map(parentLabels.map((l) => [l, record(l)]));

  const summaries: EarlierSummary[] = [];
  for (let r = 1; r < row; r++) {
    for (const [u, v] of rowCoords(n, r)) {
      const lbl = label(u, v);
      if (!parentRecords.has(lbl) && results[lbl]) summaries.push({ label: lbl, row: r, summary: results[lbl].summary });
    }
  }

  const cells = coords.map(([u, v]) => ({
    label: label(u, v),
    kind: kind(n, u, v),
    parentQuestions: parents(u, v).map((p) => ({ label: p, question: parentRecords.get(p)!.nextQuestion ?? '' })),
  }));

  return {
    question,
    brief,
    boardSize: n,
    row,
    lastRow: lastRow(n),
    phase: phase(n, row),
    summaries,
    parents: [...parentRecords.values()],
    cells,
    labels: cells.map((c) => c.label),
  };
}

/** Raw context sent to the brief: the free-text note plus each context document. */
export function buildRawContext(note: string, documents: { title: string; text: string }[]): string {
  const parts = note.trim() ? [note.trim()] : [];
  for (const d of documents) parts.push(`### Document: ${d.title}\n${d.text.trim()}`);
  return parts.join('\n\n');
}
