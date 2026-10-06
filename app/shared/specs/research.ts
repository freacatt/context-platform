import { choice, entries, lines, obj, section, text } from './primitives';

export const SOURCE_KINDS = ['interview', 'survey', 'usability-test', 'analytics', 'support', 'competitor', 'desk-research', 'other'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  interview: 'Interview',
  survey: 'Survey',
  'usability-test': 'Usability test',
  analytics: 'Analytics',
  support: 'Support tickets',
  competitor: 'Competitor',
  'desk-research': 'Desk research',
  other: 'Other',
};

export const INSIGHT_CONFIDENCES = ['low', 'medium', 'high'] as const;

export interface ResearchSource {
  id: string;
  title: string;
  kind: SourceKind;
  date: string;
  notes: string;
}

export interface Insight {
  id: string;
  statement: string;
  evidence: string;
  confidence: (typeof INSIGHT_CONFIDENCES)[number];
  /** Source ids the insight is based on. */
  sourceIds: string[];
  tags: string[];
}

/** A research study: raw sources and the insights drawn from them. */
export interface ResearchSpec {
  goal: string;
  method: string;
  participants: string;
  sources: ResearchSource[];
  insights: Insight[];
}

export function normalizeResearch(raw: unknown): ResearchSpec {
  const r = obj(raw);
  return {
    goal: text(r.goal),
    method: text(r.method),
    participants: text(r.participants),
    sources: entries<ResearchSource>(r.sources, 'source', (s, id) => ({
      id,
      title: text(s.title, 500),
      kind: choice(s.kind, SOURCE_KINDS, 'interview'),
      date: text(s.date, 10),
      notes: text(s.notes),
    })),
    insights: entries<Insight>(r.insights, 'insight', (i, id) => ({
      id,
      statement: text(i.statement, 2000),
      evidence: text(i.evidence),
      confidence: choice(i.confidence, INSIGHT_CONFIDENCES, 'medium'),
      sourceIds: lines(i.sourceIds),
      tags: lines(i.tags),
    })),
  };
}

export const createDefaultResearch = (): ResearchSpec => normalizeResearch({});

export function researchToMarkdown(title: string, spec: ResearchSpec): string {
  const sourceTitle = (id: string) => spec.sources.find((s) => s.id === id)?.title || id;
  const out = [`# ${title}`, ''];
  out.push(...section('## Goal', spec.goal), ...section('## Method', spec.method), ...section('## Participants', spec.participants));
  const insights = spec.insights.filter((i) => i.statement.trim());
  if (insights.length) {
    out.push('## Insights', '');
    insights.forEach((i, n) => {
      out.push(`### ${n + 1}. ${i.statement.trim()}`, '', `_Confidence: ${i.confidence}${i.tags.length ? ` · Tags: ${i.tags.join(', ')}` : ''}_`, '');
      if (i.evidence.trim()) out.push(i.evidence.trim(), '');
      if (i.sourceIds.length) out.push(`Sources: ${i.sourceIds.map(sourceTitle).join('; ')}`, '');
    });
  }
  const sources = spec.sources.filter((s) => s.title.trim() || s.notes.trim());
  if (sources.length) {
    out.push('## Sources', '');
    for (const s of sources) {
      out.push(`### ${s.title.trim() || 'Untitled source'}`, '', `_${SOURCE_KIND_LABELS[s.kind]}${s.date ? ` · ${s.date}` : ''}_`, '');
      if (s.notes.trim()) out.push(s.notes.trim(), '');
    }
  }
  return out.join('\n');
}
