import { bullets, choice, entries, lines, obj, section, text, type Json } from './primitives';

export const FEATURE_PRIORITIES = ['must', 'should', 'could', 'wont'] as const;
export type FeaturePriority = (typeof FEATURE_PRIORITIES)[number];
export const FEATURE_PRIORITY_LABELS: Record<FeaturePriority, string> = { must: 'Must', should: 'Should', could: 'Could', wont: "Won't (now)" };

export const FEATURE_STATUSES = ['idea', 'planned', 'building', 'shipped'] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];
export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = { idea: 'Idea', planned: 'Planned', building: 'Building', shipped: 'Shipped' };

export const CONFIDENCES = ['low', 'medium', 'high'] as const;
export const ASSUMPTION_STATUSES = ['untested', 'validated', 'invalidated'] as const;
export const REQUIREMENT_KINDS = ['functional', 'non-functional'] as const;

export interface Persona {
  id: string;
  name: string;
  description: string;
  goals: string[];
  pains: string[];
}

/** "When <situation>, I want to <motivation>, so I can <outcome>." */
export interface Job {
  id: string;
  personaId: string;
  situation: string;
  motivation: string;
  outcome: string;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  priority: FeaturePriority;
  status: FeatureStatus;
  personaIds: string[];
  acceptanceCriteria: string[];
}

export interface Requirement {
  id: string;
  text: string;
  kind: (typeof REQUIREMENT_KINDS)[number];
}

export interface Metric {
  id: string;
  name: string;
  description: string;
  target: string;
  current: string;
}

export interface Assumption {
  id: string;
  statement: string;
  confidence: (typeof CONFIDENCES)[number];
  status: (typeof ASSUMPTION_STATUSES)[number];
  evidence: string;
}

export interface ProductRisk {
  id: string;
  risk: string;
  mitigation: string;
}

/** Product Definition: a structured product model whose entities other apps can rely on. */
export interface ProductSpec {
  vision: string;
  problem: { statement: string; context: string; alternatives: string };
  personas: Persona[];
  jobs: Job[];
  features: Feature[];
  requirements: Requirement[];
  nonGoals: string[];
  metrics: Metric[];
  assumptions: Assumption[];
  risks: ProductRisk[];
  /** Free notes; content of the previous mind-map version lands here. */
  notes: string;
}

export function normalizeProductSpec(raw: unknown): ProductSpec {
  const r = obj(raw);
  const p = obj(r.problem);
  return {
    vision: text(r.vision),
    problem: { statement: text(p.statement), context: text(p.context), alternatives: text(p.alternatives) },
    personas: entries<Persona>(r.personas, 'persona', (x, id) => ({ id, name: text(x.name, 200), description: text(x.description), goals: lines(x.goals), pains: lines(x.pains) })),
    jobs: entries<Job>(r.jobs, 'job', (x, id) => ({ id, personaId: text(x.personaId, 64), situation: text(x.situation, 2000), motivation: text(x.motivation, 2000), outcome: text(x.outcome, 2000) })),
    features: entries<Feature>(r.features, 'feature', (x, id) => ({
      id,
      name: text(x.name, 200),
      description: text(x.description),
      priority: choice(x.priority, FEATURE_PRIORITIES, 'should'),
      status: choice(x.status, FEATURE_STATUSES, 'idea'),
      personaIds: lines(x.personaIds),
      acceptanceCriteria: lines(x.acceptanceCriteria),
    })),
    requirements: entries<Requirement>(r.requirements, 'req', (x, id) => ({ id, text: text(x.text, 2000), kind: choice(x.kind, REQUIREMENT_KINDS, 'functional') })),
    nonGoals: lines(r.nonGoals),
    metrics: entries<Metric>(r.metrics, 'metric', (x, id) => ({ id, name: text(x.name, 200), description: text(x.description, 2000), target: text(x.target, 200), current: text(x.current, 200) })),
    assumptions: entries<Assumption>(r.assumptions, 'assumption', (x, id) => ({
      id,
      statement: text(x.statement, 2000),
      confidence: choice(x.confidence, CONFIDENCES, 'medium'),
      status: choice(x.status, ASSUMPTION_STATUSES, 'untested'),
      evidence: text(x.evidence),
    })),
    risks: entries<ProductRisk>(r.risks, 'risk', (x, id) => ({ id, risk: text(x.risk, 2000), mitigation: text(x.mitigation) })),
    notes: text(r.notes),
  };
}

export const createDefaultProductSpec = (): ProductSpec => normalizeProductSpec({});

interface LegacyNode {
  id?: string;
  label?: string;
  question?: string;
  description?: string;
  children?: string[];
}

/**
 * The previous mind-map version: well-known topics fill the matching fields, and the whole
 * answered tree is kept in the notes so nothing is lost.
 */
export function productSpecFromLegacy(data: unknown): ProductSpec {
  const nodes = obj(data) as Record<string, LegacyNode>;
  const answer = (...labels: string[]) => {
    for (const node of Object.values(nodes)) {
      const label = text(node?.label).replace(/^\d+(\.\d+)*\.?\s*/, '').trim().toLowerCase();
      if (labels.includes(label) && text(node?.description).trim()) return text(node.description).trim();
    }
    return '';
  };
  // Answered topics under their ancestors' headings; branches without any answer are left out.
  const notes: string[] = [];
  const printed = new Set<string>();
  const walk = (id: string, depth: number, ancestors: { id: string; heading: string }[]) => {
    const node = nodes[id];
    if (!node || typeof node !== 'object' || ancestors.some((a) => a.id === id)) return;
    const path = id === 'root' ? ancestors : [...ancestors, { id, heading: `${'#'.repeat(Math.min(depth + 2, 6))} ${text(node.label) || id}` }];
    const description = text(node.description).trim();
    if (description) {
      for (const a of path) {
        if (printed.has(a.id)) continue;
        printed.add(a.id);
        notes.push(a.heading, '');
      }
      if (text(node.question).trim()) notes.push(`_${text(node.question).trim()}_`, '');
      notes.push(description, '');
    }
    for (const child of Array.isArray(node.children) ? node.children : []) {
      if (typeof child === 'string') walk(child, depth + 1, path);
    }
  };
  walk('root', 0, []);
  return normalizeProductSpec({
    vision: answer('product summary', 'vision', 'product vision', 'summary'),
    problem: {
      statement: answer('current pain', 'problem', 'problem statement', 'the problem'),
      context: answer('background & motivation', 'background', 'context'),
      alternatives: answer('existing alternatives', 'alternatives'),
    },
    notes: notes.length ? `## From the previous version\n\n${notes.join('\n').trim()}\n` : '',
  } satisfies Json);
}

export function productSpecToMarkdown(title: string, spec: ProductSpec): string {
  const personaName = (id: string) => spec.personas.find((p) => p.id === id)?.name || 'Someone';
  const out = [`# ${title}`, ''];
  out.push(...section('## Vision', spec.vision));
  out.push(
    ...section('## Problem', [
      ...(spec.problem.statement.trim() ? [spec.problem.statement.trim(), ''] : []),
      ...(spec.problem.context.trim() ? [`**Context:** ${spec.problem.context.trim()}`, ''] : []),
      ...(spec.problem.alternatives.trim() ? [`**Current alternatives:** ${spec.problem.alternatives.trim()}`] : []),
    ]),
  );
  if (spec.personas.length) {
    out.push('## Personas', '');
    for (const p of spec.personas) {
      out.push(`### ${p.name || 'Unnamed persona'}`, '');
      if (p.description.trim()) out.push(p.description.trim(), '');
      out.push(...section('**Goals**', bullets(p.goals)), ...section('**Pains**', bullets(p.pains)));
    }
  }
  const jobs = spec.jobs.filter((j) => j.situation.trim() || j.motivation.trim());
  if (jobs.length) {
    out.push('## Jobs to be done', '', ...jobs.map((j) => `- **${personaName(j.personaId)}:** When ${j.situation.trim()}, I want to ${j.motivation.trim()}${j.outcome.trim() ? `, so I can ${j.outcome.trim()}` : ''}.`), '');
  }
  if (spec.features.length) {
    out.push('## Features', '');
    for (const f of spec.features) {
      out.push(`### ${f.name || 'Unnamed feature'}`, '', `_Priority: ${FEATURE_PRIORITY_LABELS[f.priority]} · Status: ${FEATURE_STATUS_LABELS[f.status]}${f.personaIds.length ? ` · For: ${f.personaIds.map(personaName).join(', ')}` : ''}_`, '');
      if (f.description.trim()) out.push(f.description.trim(), '');
      out.push(...section('**Acceptance criteria**', bullets(f.acceptanceCriteria, '- [ ] ')));
    }
  }
  const reqs = spec.requirements.filter((r) => r.text.trim());
  if (reqs.length) {
    out.push('## Requirements', '');
    for (const kind of REQUIREMENT_KINDS) {
      const items = reqs.filter((r) => r.kind === kind);
      if (items.length) out.push(`### ${kind === 'functional' ? 'Functional' : 'Non-functional'}`, '', ...items.map((r) => `- ${r.text.trim()}`), '');
    }
  }
  out.push(...section('## Non-goals', bullets(spec.nonGoals)));
  if (spec.metrics.length) {
    out.push('## Success metrics', '', '| Metric | Target | Current | Notes |', '|---|---|---|---|');
    for (const m of spec.metrics) out.push(`| ${m.name} | ${m.target} | ${m.current} | ${m.description.replace(/\n/g, ' ')} |`);
    out.push('');
  }
  if (spec.assumptions.length) {
    out.push('## Assumptions', '');
    for (const a of spec.assumptions) out.push(`- ${a.statement.trim()} _(confidence: ${a.confidence}; ${a.status})_${a.evidence.trim() ? ` — ${a.evidence.trim()}` : ''}`);
    out.push('');
  }
  if (spec.risks.length) {
    out.push('## Risks', '', ...spec.risks.map((r) => `- ${r.risk.trim()}${r.mitigation.trim() ? ` — **Mitigation:** ${r.mitigation.trim()}` : ''}`), '');
  }
  out.push(...section('## Notes', spec.notes));
  return out.join('\n');
}
