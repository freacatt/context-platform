/**
 * Every prompt the Pyramid Solver sends. Prompt text lives only in this file; changing a
 * prompt changes its snapshot in prompts.test.ts.
 */
import type { CellTask, RowContext } from './rowContext';
import type { HostConfig, PanelCell, PanelistConfig } from './types';

export const PANEL_SYSTEM = `You are a panelist at a structured roundtable. The roundtable solves one hard question by
expanding it into sub-questions, row by row, and then merging those lines of inquiry back into
a single final answer. Each row, every panelist answers independently; a host then concludes.

How to work:
- Be concrete. Prefer numbers, mechanisms, named options, trade-offs, and testable claims over generalities.
- When information is missing, state the assumption you are making and continue; never refuse.
- Challenge the framing of a question when it is wrong, and say why in your answer.
- Respect the word budget you are given. Depth beats length.
- Reply with one JSON object only, exactly in the requested schema. No prose before or after it.`;

export const HOST_SYSTEM = `You are the host of a structured roundtable. Independent panelists have answered the same row
of questions. You conclude every cell of the row authoritatively and steer the next row.

How to work:
- Judge arguments on their merits, not by majority. Keep the strongest reasoning, correct errors, fill gaps.
- Preserve real disagreement: when panelists differ on something that changes the conclusion,
  record it in \`dissent\` as one short sentence stating both positions. Do not invent dissent and
  do not record differences in wording. Use an empty list when there is none.
- Calibrate \`confidence\` from 0 to 1 to how well-supported the conclusion is.
- Write next questions that move the whole board toward a final answer to the root question:
  specific, answerable, and not overlapping with sibling cells.
- Reply with one JSON object only, exactly in the requested schema. No prose before or after it.`;

export const BRIEF_SYSTEM = `You compress reference material into a brief for a panel of analysts. You never answer the
question yourself; you only decide what the analysts must know.`;

const lines = (...parts: (string | false | null | undefined | string[])[]): string =>
  parts
    .flat()
    .filter((p): p is string => typeof p === 'string')
    .join('\n');

export function briefPrompt(question: string, material: string): string {
  return lines(
    '# Root question',
    question,
    '',
    '# Your task',
    'Write a brief of at most 1500 words from the material below. Keep every fact, number, constraint,',
    'name, date, and decision that could matter for answering the root question. Drop boilerplate and',
    'anything irrelevant. Use short headed sections and bullet points. Do not answer the root question.',
    'Reply in plain Markdown, not JSON.',
    '',
    '# Material',
    material,
  ).trim();
}

function cellTaskLine(c: CellTask): string[] {
  const [a, b] = c.parentQuestions;
  const q = (p: { label: string; question: string }) => `${p.label}: "${p.question}"`;
  if (c.kind === 'edge') return [`- ${c.label} (EDGE):`, `  answer the question from ${q(a)}`];
  if (c.kind === 'merge') return [`- ${c.label} (MERGE):`, `  combine the questions from ${q(a)} and ${q(b)}`];
  return [
    `- ${c.label} (FINAL):`,
    `  FINAL cell. Combine the questions from ${q(a)} and ${q(b)}, then give the final answer to the root question`,
  ];
}

/** The shared head of every row prompt: where we are, what came before, what to do. */
export function rowTask(ctx: RowContext): string {
  return lines(
    '# Root question',
    ctx.question,
    '',
    ctx.brief ? ['# Context brief', ctx.brief, ''] : null,
    '# Where we are',
    `The board is a ${ctx.boardSize}x${ctx.boardSize} diamond. This is row ${ctx.row} of ${ctx.lastRow}: ${ctx.phase}.`,
    'Cell kinds:',
    "- EDGE: answer the single parent's next question, then ask a new next question.",
    "- MERGE: combine the two parents' next questions into one combined question, answer it, then ask a new next question.",
    "- FINAL: combine the two parents' next questions into a combined question whose answer resolves the root question,",
    '  answer it as the final answer to the root question, and ask no next question.',
    'When several cells answer the same question, give each cell a distinct angle and ask different next questions.',
    '',
    ctx.summaries.length > 0
      ? ['# Earlier conclusions', ...ctx.summaries.map((s) => `- ${s.label} (row ${s.row}): ${s.summary}`), '']
      : null,
    '# Parent cells',
    ...ctx.parents.map((p) =>
      lines(
        `## ${p.label} (${p.kind})`,
        p.kind === 'root'
          ? `Root question: ${p.nextQuestion}`
          : lines(
              p.combinedQuestion ? `Combined question: ${p.combinedQuestion}` : null,
              `Conclusion: ${p.conclusion}`,
              p.dissent.length > 0 ? ['Dissent:', ...p.dissent.map((d) => `- ${d}`)] : null,
              `Next question: ${p.nextQuestion}`,
            ),
        '',
      ),
    ),
    '# Cells in this row',
    ...ctx.cells.flatMap(cellTaskLine),
  );
}

const PANEL_SCHEMA =
  '{"cells": [{"label": "<label>", "combined_question": "<string or null>", "answer": "<string>", "next_question": "<string or null>"}]}';

const panelRules = (words: number) => [
  'Rules:',
  '- combined_question: a string for MERGE and FINAL cells; null for EDGE cells.',
  `- answer: at most ${words} words.`,
  '- next_question: a string for EDGE and MERGE cells; null for the FINAL cell.',
];

const outputHead = (labels: string[]) => [
  '# Output',
  `Return exactly one JSON object with one entry per cell, labels ${labels.join(', ')} and no others:`,
];

export function panelRowPrompt(ctx: RowContext, words: number): string {
  return lines(
    rowTask(ctx),
    '',
    '# Your task',
    'Answer every cell listed above.',
    '',
    ...outputHead(ctx.labels),
    PANEL_SCHEMA,
    ...panelRules(words),
  );
}

/** A panelist's row output as readable text (for critique and host prompts). */
export function panelOutputText(cells: PanelCell[]): string {
  return lines(
    ...cells.map((c) =>
      lines(
        `### ${c.label}`,
        c.combinedQuestion ? `Combined question: ${c.combinedQuestion}` : null,
        `Answer: ${c.answer}`,
        c.nextQuestion ? `Next question: ${c.nextQuestion}` : null,
        '',
      ),
    ),
  ).trim();
}

const numbered = (outputs: string[]) => outputs.flatMap((out, i) => [`## Panelist ${i + 1}`, out, '']);

export function critiquePrompt(ctx: RowContext, ownOutput: string, peers: string[], words: number): string {
  return lines(
    rowTask(ctx),
    '',
    '# Your earlier answer',
    ownOutput,
    '',
    "# Other panelists' answers",
    ...numbered(peers),
    '# Your task',
    'Revise your answer for every cell. Keep what survives scrutiny, fix your errors, adopt better',
    'arguments from the other panelists, and keep your position where you still think they are wrong.',
    '',
    ...outputHead(ctx.labels),
    PANEL_SCHEMA,
    ...panelRules(words),
  );
}

export function hostRowPrompt(ctx: RowContext, panelOutputs: string[], words: number): string {
  const merging = ctx.cells.filter((c) => c.kind === 'merge' || c.kind === 'final');
  const parentChoices = merging.length
    ? merging.map((c) => `${c.label}: ${c.parentQuestions.map((p) => p.label).join(' or ')}`).join('; ')
    : 'no such cells in this row';
  return lines(
    rowTask(ctx),
    '',
    '# Panelist answers',
    ...numbered(panelOutputs),
    '# Your task',
    'Conclude every cell of this row from the panelist answers above. Your output is authoritative:',
    'it is what later rows build on.',
    '',
    ...outputHead(ctx.labels),
    '{"cells": [{"label": "<label>", "combined_question": "<string or null>", "conclusion": "<string>", "dissent": ["<string>"], "confidence": <number 0..1>, "next_question": "<string or null>", "summary": "<string>", "primary_parent": "<label or null>"}]}',
    'Rules:',
    '- combined_question: a string for MERGE and FINAL cells; null for EDGE cells.',
    `- conclusion: at most ${words} words.`,
    '- dissent: real disagreements between panelists worth keeping; [] when there are none.',
    '- confidence: from 0 to 1.',
    '- next_question: a string for EDGE and MERGE cells; null for the FINAL cell.',
    '- summary: at most 100 words, understandable on its own; later rows see only this.',
    '- primary_parent: for MERGE and FINAL cells, the parent label whose line of reasoning contributed most',
    `  (${parentChoices}); null for EDGE cells.`,
  );
}

export function repairPrompt(error: string, labels: string[]): string {
  return lines(
    `Your previous reply could not be used: ${error}`,
    labels.length
      ? `Reply again with only the corrected JSON object for cells ${labels.join(', ')}, following the schema exactly.`
      : 'Reply again, following the instructions exactly.',
  );
}

/** Global default (or built-in), then the panelist override: appended, or replacing it. */
export function resolvePanelSystemPrompt(defaultPrompt: string | undefined, p: PanelistConfig): string {
  const base = defaultPrompt ?? PANEL_SYSTEM;
  if (!p.systemPrompt) return base;
  return p.promptMode === 'replace' ? p.systemPrompt : `${base}\n\n${p.systemPrompt}`;
}

export const resolveHostSystemPrompt = (h: HostConfig): string => h.systemPrompt || HOST_SYSTEM;

/** Per-cell word budget that keeps a whole row's JSON inside `maxTokens`. */
export function wordsBudget(maxTokens: number, width: number, overheadTokens: number, cap: number): number {
  const perCell = (maxTokens * 0.85) / Math.max(width, 1) - overheadTokens;
  return Math.floor(Math.max(30, Math.min(cap, perCell / 1.4)));
}
