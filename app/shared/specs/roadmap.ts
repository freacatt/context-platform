import { choice, entries, lines, obj, section, text } from './primitives';

export const HORIZONS = ['now', 'next', 'later'] as const;
export type Horizon = (typeof HORIZONS)[number];
export const HORIZON_LABELS: Record<Horizon, string> = { now: 'Now', next: 'Next', later: 'Later' };

export const INITIATIVE_STATUSES = ['proposed', 'active', 'done', 'dropped'] as const;
export type InitiativeStatus = (typeof INITIATIVE_STATUSES)[number];

export interface KeyResult {
  id: string;
  text: string;
  target: string;
  current: string;
}

export interface Goal {
  id: string;
  objective: string;
  description: string;
  keyResults: KeyResult[];
}

export interface Initiative {
  id: string;
  title: string;
  description: string;
  horizon: Horizon;
  status: InitiativeStatus;
  goalIds: string[];
}

/** Outcomes (goals + key results) and the initiatives that move them, Now/Next/Later. */
export interface RoadmapSpec {
  vision: string;
  goals: Goal[];
  initiatives: Initiative[];
}

export function normalizeRoadmap(raw: unknown): RoadmapSpec {
  const r = obj(raw);
  return {
    vision: text(r.vision),
    goals: entries<Goal>(r.goals, 'goal', (g, id) => ({
      id,
      objective: text(g.objective, 500),
      description: text(g.description),
      keyResults: entries<KeyResult>(g.keyResults, `${id}-kr`, (k, kid) => ({ id: kid, text: text(k.text, 1000), target: text(k.target, 200), current: text(k.current, 200) })),
    })),
    initiatives: entries<Initiative>(r.initiatives, 'initiative', (i, id) => ({
      id,
      title: text(i.title, 500),
      description: text(i.description),
      horizon: choice(i.horizon, HORIZONS, 'next'),
      status: choice(i.status, INITIATIVE_STATUSES, 'proposed'),
      goalIds: lines(i.goalIds),
    })),
  };
}

export const createDefaultRoadmap = (): RoadmapSpec => normalizeRoadmap({});

export function roadmapToMarkdown(title: string, spec: RoadmapSpec): string {
  const goalName = (id: string) => spec.goals.find((g) => g.id === id)?.objective || id;
  const out = [`# ${title}`, ''];
  out.push(...section('## Vision', spec.vision));
  const goals = spec.goals.filter((g) => g.objective.trim());
  if (goals.length) {
    out.push('## Goals', '');
    for (const g of goals) {
      out.push(`### ${g.objective.trim()}`, '');
      if (g.description.trim()) out.push(g.description.trim(), '');
      const krs = g.keyResults.filter((k) => k.text.trim());
      if (krs.length) out.push(...krs.map((k) => `- ${k.text.trim()}${k.target ? ` — target ${k.target}` : ''}${k.current ? `, now ${k.current}` : ''}`), '');
    }
  }
  for (const horizon of HORIZONS) {
    const items = spec.initiatives.filter((i) => i.horizon === horizon && i.title.trim());
    if (!items.length) continue;
    out.push(`## ${HORIZON_LABELS[horizon]}`, '');
    for (const i of items) {
      out.push(`- **${i.title.trim()}** _(${i.status})_${i.goalIds.length ? ` → ${i.goalIds.map(goalName).join(', ')}` : ''}`);
      if (i.description.trim()) out.push(`  ${i.description.trim().replace(/\n/g, '\n  ')}`);
    }
    out.push('');
  }
  return out.join('\n');
}
