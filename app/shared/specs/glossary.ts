import { entries, lines, obj, text } from './primitives';

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  aliases: string[];
  /** Usage notes, examples, "not to be confused with…". */
  notes: string;
}

/** Shared language of a domain: every export and AI prompt uses the same words. */
export interface GlossarySpec {
  description: string;
  terms: GlossaryTerm[];
}

export function normalizeGlossary(raw: unknown): GlossarySpec {
  const r = obj(raw);
  return {
    description: text(r.description),
    terms: entries<GlossaryTerm>(r.terms, 'term', (t, id) => ({
      id,
      term: text(t.term, 200),
      definition: text(t.definition),
      aliases: lines(t.aliases),
      notes: text(t.notes),
    })),
  };
}

export const createDefaultGlossary = (): GlossarySpec => normalizeGlossary({});

export function glossaryToMarkdown(title: string, spec: GlossarySpec): string {
  const out = [`# ${title}`, ''];
  if (spec.description.trim()) out.push(spec.description.trim(), '');
  const terms = spec.terms.filter((t) => t.term.trim()).sort((a, b) => a.term.localeCompare(b.term));
  for (const t of terms) {
    out.push(`## ${t.term.trim()}`, '');
    const aliases = t.aliases.filter((a) => a.trim());
    if (aliases.length) out.push(`_Also: ${aliases.join(', ')}_`, '');
    if (t.definition.trim()) out.push(t.definition.trim(), '');
    if (t.notes.trim()) out.push(`> ${t.notes.trim().replace(/\n/g, '\n> ')}`, '');
  }
  return out.join('\n');
}
