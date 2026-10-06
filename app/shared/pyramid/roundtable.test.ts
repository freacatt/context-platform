import { describe, expect, it } from 'vitest';
import { parseMoney } from './money';
import { createFakeModel } from './fakeModel';
import { buildRowContext } from './rowContext';
import { BudgetExceededError, BudgetGuard, Caller, makeBrief, ProviderError, QuorumNotMetError, runRow } from './roundtable';
import type { CallRecord, HostCell, PyramidConfig } from './types';

const config = (overrides: Partial<PyramidConfig> = {}): PyramidConfig => ({
  question: 'Which market should we enter next?',
  context: '',
  contextDocumentIds: [],
  boardSize: 3,
  panel: [{ model: 'a/one' }, { model: 'b/two' }],
  host: { model: 'c/host' },
  critiqueRound: false,
  autoApprove: false,
  minPanelists: 1,
  ...overrides,
});

function setup(fake = createFakeModel(), cap: bigint | null = null) {
  const records: CallRecord[] = [];
  const guard = new BudgetGuard(cap);
  const caller = new Caller({
    complete: fake.complete,
    record: async (c) => void records.push(c),
    sleep: async () => {},
    guard,
  });
  return { fake, records, guard, caller };
}

const row1 = (cfg: PyramidConfig, results: Record<string, HostCell> = {}) =>
  buildRowContext(cfg.boardSize, results, 1, null, cfg.question);

describe('runRow', () => {
  it('runs a blind round then the host, and records every call with its cost', async () => {
    const { fake, records, guard, caller } = setup();
    const out = await runRow(config(), row1(config()), caller);
    expect(out.cells.map((c) => c.label)).toEqual(['A2', 'B1']);
    expect(out.failedPanelists).toEqual([]);
    expect(fake.calls.map((c) => c.role)).toEqual(['panel', 'panel', 'host']);
    expect(records.every((r) => r.status === 'ok')).toBe(true);
    expect(guard.spent).toBe(parseMoney('0.003'));
  });

  it('a critique round re-calls each panelist with anonymised peers', async () => {
    const { fake, caller } = setup();
    await runRow(config({ critiqueRound: true }), row1(config()), caller);
    expect(fake.calls.map((c) => c.role)).toEqual(['panel', 'panel', 'critique', 'critique', 'host']);
  });

  it('repairs invalid output with the validation error in the retry prompt', async () => {
    const fake = createFakeModel({ override: (i) => (i.role === 'host' && i.attempt === 1 ? 'not json' : undefined) });
    const { records, caller } = setup(fake);
    await runRow(config(), row1(config()), caller);
    const host = records.filter((r) => r.role === 'host');
    expect(host.map((r) => r.status)).toEqual(['invalid', 'ok']);
    expect(host[1].messages.at(-1)?.content).toMatch(/could not be used: no JSON object found/);
  });

  it('drops a failing panelist but continues while the quorum holds', async () => {
    const fake = createFakeModel({
      override: (i) => {
        if (i.model === 'b/two') throw new ProviderError('503 overloaded');
        return undefined;
      },
    });
    const { records, caller } = setup(fake);
    const out = await runRow(config(), row1(config()), caller);
    expect(out.failedPanelists).toEqual(['b/two']);
    expect(records.filter((r) => r.model === 'b/two' && r.status === 'error')).toHaveLength(3);
  });

  it('fails the row when fewer than min panelists answer', async () => {
    const fake = createFakeModel({ override: (i) => (i.role === 'panel' ? 'garbage' : undefined) });
    const { caller } = setup(fake);
    await expect(runRow(config(), row1(config()), caller)).rejects.toBeInstanceOf(QuorumNotMetError);
  });

  it('stops before a call once the cap is used up', async () => {
    const { fake, caller } = setup(createFakeModel(), parseMoney('0.002'));
    await expect(runRow(config(), row1(config()), caller)).rejects.toBeInstanceOf(BudgetExceededError);
    expect(fake.calls).toHaveLength(2); // both panelists ran; the host never started
  });
});

describe('makeBrief', () => {
  it('asks the host for a brief of the material', async () => {
    const { fake, caller } = setup();
    expect(await makeBrief(config(), 'lots of material', caller)).toBe('Brief: the key facts.');
    expect(fake.calls[0]).toMatchObject({ role: 'brief', model: 'c/host' });
  });
});

describe('buildRowContext', () => {
  it('uses edited next questions and summarises earlier rows', () => {
    const cell = (label: string, nextQuestion: string): HostCell => ({
      label,
      combinedQuestion: null,
      conclusion: `c ${label}`,
      dissent: [],
      confidence: 1,
      nextQuestion,
      summary: `summary ${label}`,
      primaryParent: null,
    });
    const results = { A2: cell('A2', 'EDITED question?'), B1: cell('B1', 'b?') };
    const ctx = buildRowContext(3, results, 2, 'brief', 'root?');
    expect(ctx.labels).toEqual(['A3', 'B2', 'C1']);
    expect(ctx.cells[0].parentQuestions).toEqual([{ label: 'A2', question: 'EDITED question?' }]);
    expect(ctx.summaries).toEqual([]);
    expect(() => buildRowContext(3, {}, 2, null, 'root?')).toThrow(/no committed result/);
  });
});
