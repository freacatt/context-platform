import { describe, expect, it } from 'vitest';
import { buildRowContext } from './rowContext';
import {
  HOST_SYSTEM,
  PANEL_SYSTEM,
  hostRowPrompt,
  panelRowPrompt,
  resolveHostSystemPrompt,
  resolvePanelSystemPrompt,
  wordsBudget,
} from './prompts';
import type { HostCell } from './types';

const cell = (label: string, extra: Partial<HostCell> = {}): HostCell => ({
  label,
  combinedQuestion: null,
  conclusion: `Conclusion ${label}`,
  dissent: [],
  confidence: 0.8,
  nextQuestion: `Next from ${label}?`,
  summary: `Summary ${label}`,
  primaryParent: null,
  ...extra,
});

describe('prompts', () => {
  it('row 2 of a 3×3 board (snapshot)', () => {
    const ctx = buildRowContext(3, { A2: cell('A2', { dissent: ['X vs Y'] }), B1: cell('B1') }, 2, 'The brief.', 'Root question?');
    expect(panelRowPrompt(ctx, 120)).toMatchSnapshot();
    expect(hostRowPrompt(ctx, ['### A3\nAnswer: one', '### A3\nAnswer: two'], 200)).toMatchSnapshot();
  });

  it('row prompts name the expected labels and the cell tasks', () => {
    const ctx = buildRowContext(3, { A2: cell('A2'), B1: cell('B1') }, 2, null, 'Root question?');
    const prompt = panelRowPrompt(ctx, 100);
    expect(prompt).toContain('labels A3, B2, C1 and no others');
    expect(prompt).toContain('- B2 (MERGE):\n  combine the questions from A2: "Next from A2?" and B1: "Next from B1?"');
    expect(prompt).not.toContain('# Context brief');
    expect(hostRowPrompt(ctx, [], 100)).toContain('(B2: A2 or B1); null for EDGE cells.');
  });

  it('system prompts resolve default, append and replace', () => {
    expect(resolvePanelSystemPrompt(undefined, { model: 'm' })).toBe(PANEL_SYSTEM);
    expect(resolvePanelSystemPrompt('Custom', { model: 'm', systemPrompt: 'Be a skeptic.' })).toBe('Custom\n\nBe a skeptic.');
    expect(resolvePanelSystemPrompt(undefined, { model: 'm', systemPrompt: 'Only me.', promptMode: 'replace' })).toBe('Only me.');
    expect(resolveHostSystemPrompt({ model: 'h' })).toBe(HOST_SYSTEM);
  });

  it('word budgets stay within their floor and cap', () => {
    expect(wordsBudget(1500, 1, 90, 250)).toBe(250);
    expect(wordsBudget(1500, 8, 90, 250)).toBe(49);
    expect(wordsBudget(200, 8, 90, 250)).toBe(30);
  });
});
