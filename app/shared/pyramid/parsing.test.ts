import { describe, expect, it } from 'vitest';
import { extractCellStatement, ModelOutputError, parseJsonBlock, validateHostRow, validatePanelRow } from './parsing';

const hostCell = (label: string, extra: Record<string, unknown> = {}) => ({
  label,
  combined_question: null,
  conclusion: `c ${label}`,
  dissent: [],
  confidence: 0.7,
  next_question: `n ${label}?`,
  summary: `s ${label}`,
  primary_parent: null,
  ...extra,
});

describe('parseJsonBlock', () => {
  it.each([
    '{"cells": []}',
    '```json\n{"cells": []}\n```',
    'Here you go:\n```\n{"cells": []}\n```\nThanks',
    'Sure! {"cells": []} hope it helps',
  ])('tolerates fences and prose: %s', (text) => {
    expect(parseJsonBlock(text)).toEqual({ cells: [] });
  });

  it('picks the first object that parses after prose containing braces', () => {
    expect(parseJsonBlock('use {curly} braces: {"cells": [{"label": "A2"}]}')).toEqual({ cells: [{ label: 'A2' }] });
  });

  it('handles braces inside strings', () => {
    expect(parseJsonBlock('x {"a": "}{", "b": 1} y')).toEqual({ a: '}{', b: 1 });
  });

  it('rejects text without JSON', () => {
    expect(() => parseJsonBlock('no json here')).toThrow(ModelOutputError);
  });
});

describe('validateHostRow', () => {
  it('accepts a valid row 1 in board order', () => {
    const cells = validateHostRow({ cells: [hostCell('B1'), hostCell('A2')] }, 3, 1);
    expect(cells.map((c) => c.label)).toEqual(['A2', 'B1']);
    expect(cells[0]).toMatchObject({ conclusion: 'c A2', nextQuestion: 'n A2?', combinedQuestion: null, primaryParent: null });
  });

  it('rejects missing and extra labels', () => {
    expect(() => validateHostRow({ cells: [hostCell('A2')] }, 3, 1)).toThrow(/missing labels B1/);
    expect(() => validateHostRow({ cells: [hostCell('A2'), hostCell('B1'), hostCell('C1')] }, 3, 1)).toThrow(/unexpected labels C1/);
  });

  it('requires a combined question and a real primary parent for merge cells', () => {
    const merge = (extra: Record<string, unknown>) =>
      validateHostRow({ cells: [hostCell('A3'), hostCell('B2', extra), hostCell('C1')] }, 3, 2);
    expect(() => merge({ primary_parent: 'A2' })).toThrow(/combined_question/);
    expect(() => merge({ combined_question: 'q?', primary_parent: 'A1' })).toThrow(/primary_parent must be one of A2 or B1/);
    expect(merge({ combined_question: 'q?', primary_parent: 'b1' })[1].primaryParent).toBe('B1');
  });

  it('the final cell has no next question (blank is accepted)', () => {
    const final = (next: unknown) =>
      validateHostRow({ cells: [hostCell('B2', { combined_question: 'q?', primary_parent: 'A2', next_question: next })] }, 2, 2);
    expect(() => final('more?')).toThrow(/next_question must be null/);
    expect(final('')[0].nextQuestion).toBeNull();
  });

  it('rejects confidence out of range', () => {
    expect(() => validateHostRow({ cells: [hostCell('A2', { confidence: 1.5 }), hostCell('B1')] }, 3, 1)).toThrow(/confidence/);
  });

  it('wraps a string dissent and truncates long summaries to 100 words', () => {
    const long = Array.from({ length: 150 }, (_, i) => `w${i}`).join(' ');
    const [a] = validateHostRow({ cells: [hostCell('A2', { dissent: 'X vs Y', summary: long }), hostCell('B1')] }, 3, 1);
    expect(a.dissent).toEqual(['X vs Y']);
    expect(a.summary.split(' ')).toHaveLength(101);
    expect(a.summary.endsWith('...')).toBe(true);
  });
});

describe('validatePanelRow', () => {
  it('drops an edge cell combined question', () => {
    const cells = validatePanelRow(
      {
        cells: [
          { label: 'A2', combined_question: 'restated', answer: 'a', next_question: 'n?' },
          { label: 'B1', combined_question: null, answer: 'b', next_question: 'm?' },
        ],
      },
      3,
      1,
    );
    expect(cells[0]).toEqual({ label: 'A2', combinedQuestion: null, answer: 'a', nextQuestion: 'n?' });
  });

  it.each([{}, { cells: 'nope' }, { cells: [{ answer: 'x' }] }, { cells: [{ label: 'A2', answer: '', next_question: 'n' }] }])(
    'rejects bad shapes: %j',
    (data) => {
      expect(() => validatePanelRow(data, 3, 1)).toThrow(ModelOutputError);
    },
  );
});

describe('extractCellStatement', () => {
  it('reads one cell from raw output, leniently', () => {
    const out = 'Here:\n```json\n{"cells": [{"label": "a2", "answer": "yes", "next_question": "why?", "dissent": "X vs Y"}]}\n```';
    expect(extractCellStatement(out, 'A2')).toEqual({
      combinedQuestion: null,
      answer: 'yes',
      conclusion: null,
      nextQuestion: 'why?',
      dissent: ['X vs Y'],
      confidence: null,
      primaryParent: null,
    });
    expect(extractCellStatement(out, 'B1')).toBeNull();
    expect(extractCellStatement('not json', 'A2')).toBeNull();
  });
});
