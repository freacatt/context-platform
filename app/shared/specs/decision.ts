import { bullets, choice, entries, lines, obj, section, text } from './primitives';

export const DECISION_STATUSES = ['proposed', 'accepted', 'rejected', 'superseded', 'deprecated'] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];
export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  proposed: 'Proposed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  superseded: 'Superseded',
  deprecated: 'Deprecated',
};

export interface DecisionOption {
  id: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
}

/** An architecture/product decision record (ADR). */
export interface DecisionSpec {
  status: DecisionStatus;
  /** ISO date (yyyy-mm-dd) the decision was made. */
  date: string;
  context: string;
  options: DecisionOption[];
  decision: string;
  consequences: string;
  followUps: string[];
}

export function normalizeDecision(raw: unknown): DecisionSpec {
  const r = obj(raw);
  const date = text(r.date, 10);
  return {
    status: choice(r.status, DECISION_STATUSES, 'proposed'),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    context: text(r.context),
    options: entries<DecisionOption>(r.options, 'option', (o, id) => ({
      id,
      title: text(o.title, 500),
      description: text(o.description),
      pros: lines(o.pros),
      cons: lines(o.cons),
    })),
    decision: text(r.decision),
    consequences: text(r.consequences),
    followUps: lines(r.followUps),
  };
}

export const createDefaultDecision = (today: string): DecisionSpec => normalizeDecision({ date: today });

export function decisionToMarkdown(title: string, spec: DecisionSpec): string {
  const out = [`# ${title}`, '', `**Status:** ${DECISION_STATUS_LABELS[spec.status]}${spec.date ? ` · **Date:** ${spec.date}` : ''}`, ''];
  out.push(...section('## Context', spec.context));
  const options = spec.options.filter((o) => o.title.trim() || o.description.trim());
  if (options.length) {
    out.push('## Options considered', '');
    options.forEach((o, i) => {
      out.push(`### Option ${i + 1}: ${o.title.trim() || 'Untitled'}`, '');
      if (o.description.trim()) out.push(o.description.trim(), '');
      out.push(...section('**Pros**', bullets(o.pros)), ...section('**Cons**', bullets(o.cons)));
    });
  }
  out.push(...section('## Decision', spec.decision), ...section('## Consequences', spec.consequences), ...section('## Follow-ups', bullets(spec.followUps, '- [ ] ')));
  return out.join('\n');
}
