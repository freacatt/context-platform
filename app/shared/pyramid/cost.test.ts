import { describe, expect, it } from 'vitest';
import type { ModelInfo } from '../ai';
import { countCalls, estimate, pricingMap, remainingExpected, tokenAverages, UnknownModelError } from './cost';
import { parseMoney, sumMoney } from './money';
import type { PyramidConfig } from './types';

const PRICING: ModelInfo[] = [
  { id: 'a/cheap', name: 'Cheap', contextLength: 128000, promptPrice: '0.00000015', completionPrice: '0.0000006' },
  { id: 'b/mid', name: 'Mid', contextLength: 128000, promptPrice: '0.000001', completionPrice: '0.000004' },
  { id: 'c/host', name: 'Host', contextLength: 200000, promptPrice: '0.000003', completionPrice: '0.000015' },
  { id: 'f/free', name: 'Free', contextLength: 8000, promptPrice: '0', completionPrice: '0' },
];
const pricing = pricingMap(PRICING);

const config = (overrides: Partial<PyramidConfig> = {}): PyramidConfig => ({
  question: 'Which market should we enter next?',
  context: '',
  contextDocumentIds: [],
  boardSize: 8,
  panel: [{ model: 'a/cheap' }, { model: 'b/mid' }],
  host: { model: 'c/host' },
  critiqueRound: false,
  autoApprove: false,
  minPanelists: 1,
  ...overrides,
});

describe('countCalls', () => {
  it('one panel call per panelist and one host call per working row', () => {
    expect(countCalls(config({ panel: [{ model: 'a/cheap' }, { model: 'b/mid' }, { model: 'c/host' }] }))).toEqual({
      'a/cheap': 14,
      'b/mid': 14,
      'c/host': 28,
    });
  });

  it('a critique round doubles panel calls; context adds one brief call', () => {
    expect(countCalls(config({ critiqueRound: true }))['a/cheap']).toBe(28);
    expect(countCalls(config({ context: 'background' }))['c/host']).toBe(15);
  });
});

describe('estimate', () => {
  it('low < expected < high and the per-model costs sum to expected', () => {
    const est = estimate(config(), pricing);
    const [low, exp, high] = [est.low, est.expected, est.high].map(parseMoney);
    expect(0n < low && low < exp && exp < high).toBe(true);
    expect(sumMoney(Object.values(est.perModel).map(parseMoney))).toBe(exp);
  });

  it('more panelists and bigger boards cost more', () => {
    const exp = (cfg: PyramidConfig) => parseMoney(estimate(cfg, pricing).expected);
    expect(exp(config({ panel: [{ model: 'a/cheap' }, { model: 'b/mid' }, { model: 'b/mid', name: 'second' }] }))).toBeGreaterThan(exp(config()));
    expect(exp(config({ boardSize: 8 }))).toBeGreaterThan(exp(config({ boardSize: 4 })));
  });

  it('free models cost nothing', () => {
    expect(estimate(config({ panel: [{ model: 'f/free' }], host: { model: 'f/free' } }), pricing).high).toBe('0');
  });

  it('rejects models missing from the catalog', () => {
    expect(() => estimate(config({ host: { model: 'x/unknown' } }), pricing)).toThrow(UnknownModelError);
  });
});

describe('re-estimation', () => {
  it('uses measured averages and is zero past the last row', () => {
    const cfg = config({ boardSize: 3 });
    const calls = [
      { status: 'ok' as const, role: 'panel' as const, row: 1, promptTokens: 10, completionTokens: 2 },
      { status: 'ok' as const, role: 'host' as const, row: 1, promptTokens: 10, completionTokens: 2 },
    ];
    const averages = tokenAverages(calls, 3);
    expect(averages.prompt.panel).toBe(10);
    expect(averages.completionPerCell.panel).toBe(1);
    expect(remainingExpected(cfg, pricing, 2, averages)).toBeLessThan(remainingExpected(cfg, pricing, 2));
    expect(remainingExpected(cfg, pricing, 5)).toBe(0n);
  });
});
