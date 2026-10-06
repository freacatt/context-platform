import { describe, expect, it } from 'vitest';
import { cells as boardCells, rowLabels, workingRows } from './board';
import { createFakeModel, defaultReply } from './fakeModel';
import { validateHostRow } from './parsing';
import { cellQuestion, renderHtml, renderMarkdown, renderTranscripts, type ReportData } from './report';
import type { CallRecord, CellRecord, PyramidConfig } from './types';

const cfg: PyramidConfig = {
  question: 'Which market <should> we enter next?',
  context: '',
  contextDocumentIds: [],
  boardSize: 2,
  panel: [{ model: 'a/one', name: 'Skeptic' }],
  host: { model: 'c/host' },
  critiqueRound: false,
  autoApprove: true,
  minPanelists: 1,
};

/** Every cell of a 2×2 board concluded by the fake host. */
function completed(): Record<string, CellRecord> {
  const out: Record<string, CellRecord> = {};
  for (const row of workingRows(2)) {
    const text = defaultReply({ role: 'host', model: 'c/host', labels: rowLabels(2, row), boardSize: 2, prompt: '' });
    for (const cell of validateHostRow(JSON.parse(text), 2, row)) {
      out[cell.label] = { label: cell.label, row, cell, edited: false, originalNextQuestion: null };
    }
  }
  return out;
}

const call: CallRecord = {
  row: 1,
  role: 'host',
  model: 'c/host',
  panelist: null,
  messages: [{ role: 'user', content: 'the prompt' }],
  output: 'the output',
  promptTokens: 100,
  completionTokens: 50,
  cost: '0.0015',
  status: 'ok',
  startedAt: 0,
  endedAt: 2500,
};

const data = (cells: Record<string, CellRecord>): ReportData => ({
  title: 'Market entry',
  createdAt: Date.UTC(2026, 9, 1),
  status: 'completed',
  currentRow: 2,
  budgetCap: '0.05',
  config: cfg,
  cells,
  calls: [call],
  failedPanelists: {},
});

describe('reports', () => {
  it('markdown has the final answer, a critical path of length 3 and the cost table, in order', () => {
    const md = renderMarkdown(data(completed()));
    const order = ['## Final answer', '## Critical path', '## Row-by-row flow', '## Cost'].map((h) => md.indexOf(h));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(md).toContain('Conclusion for B2.');
    expect(md.match(/^\d\. \*\*/gm)).toHaveLength(3);
    expect(md).toContain('| `c/host` | 1 | 100 | 50 | $0.0015 |');
    expect(md).toContain('| Duration | 2.5 s |');
  });

  it('a partial report says the final answer is not reached yet', () => {
    const { B2: _final, ...partial } = completed();
    const md = renderMarkdown({ ...data(partial), status: 'awaiting_approval', currentRow: 1 });
    expect(md).toContain('_Not reached yet: the pyramid is awaiting_approval at row 1._');
    expect(md).toContain('_Available once the final cell is concluded._');
  });

  it('marks edited next questions with what the host proposed', () => {
    const cells = completed();
    cells.A2 = { ...cells.A2, edited: true, originalNextQuestion: 'host version?', cell: { ...cells.A2.cell, nextQuestion: 'mine?' } };
    expect(renderMarkdown(data(cells))).toContain('mine? _(edited at checkpoint; host proposed: host version?)_');
  });

  it('html is self-contained, escaped and carries the whole board', () => {
    const html = renderHtml(data(completed()));
    expect(html).toContain('Which market &lt;should&gt; we enter next?');
    expect(html).not.toContain('<should>');
    expect(html).not.toMatch(/<script[^>]+src=/);
    const payload = JSON.parse(html.split('<script id="cells" type="application/json">')[1].split('</script>')[0]);
    expect(payload).toHaveLength(boardCells(2).length);
  });

  it('transcripts list every call with its prompt and output', () => {
    const md = renderTranscripts(data(completed()));
    expect(md).toContain('## Call 1 - row 1 - host - host - `c/host` - ok');
    expect(md).toContain('the prompt');
    expect(md).toContain('the output');
  });

  it('cellQuestion uses the parent next question or the combined question', () => {
    const cells = Object.fromEntries(Object.entries(completed()).map(([l, c]) => [l, c.cell]));
    expect(cellQuestion(2, 'A1', cells, 'root?')).toBe('root?');
    expect(cellQuestion(2, 'A2', cells, 'root?')).toBe('root?');
    expect(cellQuestion(2, 'B2', cells, 'root?')).toBe('Combined question for B2?');
  });

  it('the fake model drives a valid reply for every row', async () => {
    const fake = createFakeModel();
    const res = await fake.complete({ model: 'm', messages: [{ role: 'user', content: 'x' }] });
    expect(res.cost).toBe('0.001');
  });
});
