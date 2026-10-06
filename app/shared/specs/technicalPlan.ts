import { bullets, choice, entries, lines, obj, section, text } from './primitives';

export const PLAN_STATUSES = ['draft', 'ready', 'in_progress', 'blocked', 'done', 'abandoned'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];
export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
  abandoned: 'Abandoned',
};

export const LEVELS = ['low', 'medium', 'high'] as const;
export type Level = (typeof LEVELS)[number];

export interface PlanStep {
  id: string;
  text: string;
  done: boolean;
}

export interface PlanPhase {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
}

export interface PlanDecision {
  id: string;
  title: string;
  decision: string;
  rationale: string;
  alternatives: string;
}

export interface PlanRisk {
  id: string;
  risk: string;
  likelihood: Level;
  impact: Level;
  mitigation: string;
}

export interface OpenQuestion {
  id: string;
  question: string;
  answer: string;
}

/**
 * A technical plan: what we will build and how, ready to hand to a person or a coding agent.
 * Its inputs (product definition, architecture, design system, decisions…) are links.
 */
export interface TechnicalPlanSpec {
  status: PlanStatus;
  goal: string;
  context: string;
  scope: string[];
  nonScope: string[];
  approach: string;
  phases: PlanPhase[];
  decisions: PlanDecision[];
  risks: PlanRisk[];
  openQuestions: OpenQuestion[];
  acceptanceCriteria: string[];
  testStrategy: string;
  rollout: string;
}

export function createDefaultTechnicalPlan(): TechnicalPlanSpec {
  return normalizeTechnicalPlan({ phases: [{ id: 'phase-1', title: 'Implementation', steps: [] }] });
}

export function normalizeTechnicalPlan(raw: unknown): TechnicalPlanSpec {
  const r = obj(raw);
  return {
    status: choice(r.status, PLAN_STATUSES, 'draft'),
    goal: text(r.goal),
    context: text(r.context),
    scope: lines(r.scope),
    nonScope: lines(r.nonScope),
    approach: text(r.approach),
    phases: entries<PlanPhase>(r.phases, 'phase', (p, id) => ({
      id,
      title: text(p.title, 500),
      description: text(p.description),
      steps: entries<PlanStep>(p.steps, `${id}-step`, (s, sid) => ({ id: sid, text: text(s.text, 2000), done: s.done === true })),
    })),
    decisions: entries<PlanDecision>(r.decisions, 'decision', (d, id) => ({
      id,
      title: text(d.title, 500),
      decision: text(d.decision),
      rationale: text(d.rationale),
      alternatives: text(d.alternatives),
    })),
    risks: entries<PlanRisk>(r.risks, 'risk', (k, id) => ({
      id,
      risk: text(k.risk),
      likelihood: choice(k.likelihood, LEVELS, 'medium'),
      impact: choice(k.impact, LEVELS, 'medium'),
      mitigation: text(k.mitigation),
    })),
    openQuestions: entries<OpenQuestion>(r.openQuestions, 'question', (q, id) => ({ id, question: text(q.question, 2000), answer: text(q.answer) })),
    acceptanceCriteria: lines(r.acceptanceCriteria),
    testStrategy: text(r.testStrategy),
    rollout: text(r.rollout),
  };
}

/** Steps done / total, over every phase. */
export function planProgress(spec: Pick<TechnicalPlanSpec, 'phases'>): { done: number; total: number } {
  const steps = spec.phases.flatMap((p) => p.steps).filter((s) => s.text.trim());
  return { done: steps.filter((s) => s.done).length, total: steps.length };
}

export function technicalPlanToMarkdown(title: string, spec: TechnicalPlanSpec): string {
  const progress = planProgress(spec);
  const out = [`# ${title}`, '', `**Status:** ${PLAN_STATUS_LABELS[spec.status]}${progress.total ? ` · ${progress.done}/${progress.total} steps done` : ''}`, ''];
  out.push(
    ...section('## Goal', spec.goal),
    ...section('## Context', spec.context),
    ...section('## Scope', bullets(spec.scope)),
    ...section('## Out of scope', bullets(spec.nonScope)),
    ...section('## Approach', spec.approach),
  );
  const phases = spec.phases.filter((p) => p.title.trim() || p.description.trim() || p.steps.length);
  if (phases.length) {
    out.push('## Implementation plan', '');
    phases.forEach((p, i) => {
      out.push(`### Phase ${i + 1}: ${p.title.trim() || 'Untitled'}`, '');
      if (p.description.trim()) out.push(p.description.trim(), '');
      const steps = p.steps.filter((s) => s.text.trim());
      if (steps.length) out.push(...steps.map((s) => `- [${s.done ? 'x' : ' '}] ${s.text.trim()}`), '');
    });
  }
  if (spec.decisions.length) {
    out.push('## Decisions', '');
    for (const d of spec.decisions) {
      out.push(`### ${d.title.trim() || 'Decision'}`, '');
      if (d.decision.trim()) out.push(d.decision.trim(), '');
      if (d.rationale.trim()) out.push(`**Why:** ${d.rationale.trim()}`, '');
      if (d.alternatives.trim()) out.push(`**Alternatives considered:** ${d.alternatives.trim()}`, '');
    }
  }
  if (spec.risks.length) {
    out.push('## Risks', '', '| Risk | Likelihood | Impact | Mitigation |', '|---|---|---|---|');
    for (const k of spec.risks) out.push(`| ${k.risk.replace(/\|/g, '\\|')} | ${k.likelihood} | ${k.impact} | ${k.mitigation.replace(/\|/g, '\\|')} |`);
    out.push('');
  }
  const questions = spec.openQuestions.filter((q) => q.question.trim());
  if (questions.length) {
    out.push('## Open questions', '', ...questions.map((q) => `- ${q.question.trim()}${q.answer.trim() ? `\n  - **Answer:** ${q.answer.trim()}` : ''}`), '');
  }
  out.push(
    ...section('## Acceptance criteria', bullets(spec.acceptanceCriteria, '- [ ] ')),
    ...section('## Test strategy', spec.testStrategy),
    ...section('## Rollout', spec.rollout),
  );
  return out.join('\n');
}

/**
 * A plan from a task of the retired Technical Tasks app: description → goal/context,
 * acceptance criteria and reproduction steps kept, component and file lists become steps.
 */
export function technicalPlanFromLegacyTask(data: unknown): TechnicalPlanSpec {
  const d = obj(data);
  const meta = obj(d.task_metadata);
  const desc = obj(obj(d.description).main);
  const components = obj(obj(d.components).main);
  const files = [
    ...entriesOf(components.files_to_create).map((f) => `Create \`${text(f.path, 500)}\`${text(f.purpose, 1000) ? ` — ${text(f.purpose, 1000)}` : ''}`),
    ...entriesOf(components.files_to_modify).map((f) => `Modify \`${text(f.path, 500)}\`${text(f.changes ?? f.reason, 1000) ? ` — ${text(f.changes ?? f.reason, 1000)}` : ''}`),
  ];
  const repro = lines(desc.steps_to_reproduce);
  const statusMap: Record<string, (typeof PLAN_STATUSES)[number]> = {
    PENDING: 'ready',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'done',
    BLOCKED: 'blocked',
  };
  const context = [text(desc.bug_report), text(desc.impact), repro.length ? `Steps to reproduce:\n${repro.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : '']
    .filter((s) => s.trim())
    .join('\n\n');
  return normalizeTechnicalPlan({
    status: statusMap[text(meta.status)] ?? 'draft',
    goal: text(desc.summary) || text(desc.title),
    context,
    phases: [{ id: 'phase-1', title: 'Implementation', steps: files.map((f, i) => ({ id: `step-${i + 1}`, text: f, done: false })) }],
    acceptanceCriteria: lines(desc.acceptance_criteria),
  });
}

const entriesOf = (value: unknown) => (Array.isArray(value) ? value.map(obj) : []);
