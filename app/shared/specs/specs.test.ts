import { describe, expect, it } from 'vitest';
import { createDefaultDecision, decisionToMarkdown, normalizeDecision } from './decision';
import {
  createDefaultDesignSystem,
  designSystemFromLegacyUiUx,
  designSystemToMarkdown,
  hasLegacyDesign,
  normalizeDesignSystem,
  toCssVariables,
  toDesignTokens,
} from './designSystem';
import { glossaryToMarkdown, normalizeGlossary } from './glossary';
import { entries, lines, text } from './primitives';
import { normalizeProductSpec, productSpecFromLegacy, productSpecToMarkdown } from './productSpec';
import { normalizeResearch, researchToMarkdown } from './research';
import { normalizeRoadmap, roadmapToMarkdown } from './roadmap';
import { createDefaultTechnicalPlan, normalizeTechnicalPlan, planProgress, technicalPlanFromLegacyTask, technicalPlanToMarkdown } from './technicalPlan';

describe('spec primitives', () => {
  it('reads text and lines tolerantly', () => {
    expect(text(5)).toBe('');
    expect(text('abcdef', 3)).toBe('abc');
    expect(lines(['a', 2, '', 'b'])).toEqual(['a', '', 'b']);
    expect(lines('nope')).toEqual([]);
  });

  it('gives every entry a unique id, keeping existing ones', () => {
    const out = entries([{ id: 'x' }, {}, { id: 'x' }, 'junk', { id: '  ' }], 'item', (_raw, id) => ({ id }));
    expect(out.map((e) => e.id)).toEqual(['x', 'item-2', 'x-3', 'item-4']);
  });
});

describe('design system', () => {
  it('normalizes unknown input to an empty system and keeps the default tokens intact', () => {
    expect(normalizeDesignSystem({ colors: 'x', bogus: 1 }).colors).toEqual([]);
    const defaults = createDefaultDesignSystem();
    expect(normalizeDesignSystem(defaults)).toEqual(defaults);
  });

  it('exports W3C design tokens and CSS variables with dark mode', () => {
    const spec = normalizeDesignSystem({
      colors: [{ name: 'Primary Brand', light: '#111', dark: '#eee', description: 'Buttons' }],
      spacing: [{ name: 'sm', value: '4px' }],
      typography: [{ name: 'body', fontFamily: 'Inter', fontSize: '16px', fontWeight: '400', lineHeight: '1.5' }],
    });
    const tokens = toDesignTokens(spec) as Record<string, Record<string, unknown>>;
    expect(tokens.color['primary-brand']).toEqual({ $type: 'color', $value: '#111', $description: 'Buttons' });
    expect(tokens['color-dark']['primary-brand']).toMatchObject({ $value: '#eee' });
    expect(tokens.spacing.sm).toEqual({ $type: 'dimension', $value: '4px' });
    const css = toCssVariables(spec);
    expect(css).toContain(':root {\n  --color-primary-brand: #111;');
    expect(css).toContain('--space-sm: 4px;');
    expect(css).toContain('.dark {\n  --color-primary-brand: #eee;\n}');
  });

  it('renders Markdown with token tables and components', () => {
    const md = designSystemToMarkdown('Acme DS', normalizeDesignSystem({
      ...createDefaultDesignSystem(),
      components: [{ name: 'Button', purpose: 'Actions', variants: ['primary', 'ghost'], props: [{ name: 'size', type: "'sm' | 'md'" }], dos: ['Use one primary per view'] }],
    }));
    expect(md).toContain('# Acme DS');
    expect(md).toContain('| primary | #2563eb | #3b82f6 | Main actions and links |');
    expect(md).toContain('### Button');
    expect(md).toContain("| size | 'sm' \\| 'md' |");
    expect(md).toContain('**Do**\n\n- Use one primary per view');
  });

  it('converts a previous-version UI/UX theme and components, keeping component ids', () => {
    const theme = {
      main: { colors: { primary: '#f00', secondary: '' }, typography: { font_family: 'Inter', font_size_base: '16px' }, spacing_unit: '8px', border_radius: { sm: '2px' } },
      advanced: { shadows: { md: '0 1px 2px black' }, breakpoints: { mobile: '480px' } },
    };
    const components = [{ component_id: 'comp_1', type: 'atom', main: { name: 'Button', category: 'Inputs', required_props: ['label'] }, advanced: { props: { size: 'string' } } }];
    const spec = designSystemFromLegacyUiUx(theme, components);
    expect(spec.colors).toMatchObject([{ name: 'primary', light: '#f00', dark: '' }]);
    expect(spec.typography).toMatchObject([{ name: 'body', fontFamily: 'Inter', fontSize: '16px' }]);
    expect(spec.spacing).toMatchObject([{ name: 'unit', value: '8px' }]);
    expect(spec.components[0]).toMatchObject({ id: 'comp_1', name: 'Button', category: 'Inputs' });
    expect(spec.components[0].props.map((p) => p.name)).toEqual(['label', 'size']);
    expect(hasLegacyDesign(theme, [])).toBe(true);
    expect(hasLegacyDesign({ main: { colors: { primary: '' } } }, [])).toBe(false);
    expect(hasLegacyDesign(undefined, undefined)).toBe(false);
  });
});

describe('technical plan', () => {
  it('starts with one implementation phase and counts progress', () => {
    const plan = createDefaultTechnicalPlan();
    expect(plan.status).toBe('draft');
    expect(plan.phases).toMatchObject([{ title: 'Implementation', steps: [] }]);
    const progress = planProgress(normalizeTechnicalPlan({ phases: [{ steps: [{ text: 'a', done: true }, { text: 'b' }, { text: '  ' }] }] }));
    expect(progress).toEqual({ done: 1, total: 2 });
  });

  it('renders a plan an agent can follow', () => {
    const md = technicalPlanToMarkdown('Checkout v2', normalizeTechnicalPlan({
      status: 'in_progress',
      goal: 'Ship one-click checkout',
      scope: ['Saved cards'],
      nonScope: ['Crypto'],
      phases: [{ title: 'API', steps: [{ text: 'Add endpoint', done: true }, { text: 'Add tests' }] }],
      risks: [{ risk: 'PCI scope', likelihood: 'high', impact: 'high', mitigation: 'Use tokens' }],
      openQuestions: [{ question: 'Which PSP?', answer: 'Stripe' }],
      acceptanceCriteria: ['Pays in one click'],
    }));
    expect(md).toContain('**Status:** In progress · 1/2 steps done');
    expect(md).toContain('## Goal\n\nShip one-click checkout');
    expect(md).toContain('### Phase 1: API\n\n- [x] Add endpoint\n- [ ] Add tests');
    expect(md).toContain('| PCI scope | high | high | Use tokens |');
    expect(md).toContain('- Which PSP?\n  - **Answer:** Stripe');
    expect(md).toContain('## Acceptance criteria\n\n- [ ] Pays in one click');
    expect(md).not.toContain('## Test strategy');
  });

  it('converts a legacy task', () => {
    const plan = technicalPlanFromLegacyTask({
      task_metadata: { status: 'IN_PROGRESS' },
      description: { main: { title: 'Login', summary: 'Let users sign in', bug_report: 'Crash on submit', steps_to_reproduce: ['Open', 'Submit'], acceptance_criteria: ['No crash'] } },
      components: { main: { files_to_create: [{ path: 'src/a.ts', purpose: 'form' }], files_to_modify: [{ path: 'src/b.ts' }] } },
    });
    expect(plan.status).toBe('in_progress');
    expect(plan.goal).toBe('Let users sign in');
    expect(plan.context).toContain('Crash on submit');
    expect(plan.context).toContain('1. Open\n2. Submit');
    expect(plan.acceptanceCriteria).toEqual(['No crash']);
    expect(plan.phases[0].steps.map((s) => s.text)).toEqual(['Create `src/a.ts` — form', 'Modify `src/b.ts`']);
    expect(technicalPlanFromLegacyTask(null).status).toBe('draft');
  });
});

describe('product spec', () => {
  it('normalizes entities and renders personas, jobs, features and metrics', () => {
    const spec = normalizeProductSpec({
      vision: 'Fast checkout for everyone',
      personas: [{ id: 'p1', name: 'Busy parent', goals: ['Save time'] }],
      jobs: [{ personaId: 'p1', situation: 'I am in a hurry', motivation: 'pay fast', outcome: 'get back to my kids' }],
      features: [{ name: 'One-click pay', priority: 'must', status: 'planned', personaIds: ['p1'], acceptanceCriteria: ['1 click'] }],
      metrics: [{ name: 'Conversion', target: '5%', current: '3%' }],
      bogus: true,
    });
    expect(spec.features[0]).toMatchObject({ priority: 'must', status: 'planned' });
    const md = productSpecToMarkdown('Shop', spec);
    expect(md).toContain('## Vision\n\nFast checkout for everyone');
    expect(md).toContain('- **Busy parent:** When I am in a hurry, I want to pay fast, so I can get back to my kids.');
    expect(md).toContain('_Priority: Must · Status: Planned · For: Busy parent_');
    expect(md).toContain('| Conversion | 5% | 3% |');
  });

  it('builds a spec from the previous mind-map version without losing answers', () => {
    const legacy = {
      root: { id: 'root', label: 'Product Definition', children: ['1', '2'] },
      '1': { id: '1', label: '1. Product Overview', children: ['1-1', '1-2'] },
      '1-1': { id: '1-1', label: 'Product Summary', question: 'What is it?', description: 'A thinking tool' },
      '1-2': { id: '1-2', label: 'Background & Motivation', description: 'Teams lose context' },
      '2': { id: '2', label: '2. Problem', children: ['2-1', '2-2'] },
      '2-1': { id: '2-1', label: 'Current Pain', description: 'Docs are scattered' },
      '2-2': { id: '2-2', label: 'Root Causes', description: '' },
    };
    const spec = productSpecFromLegacy(legacy);
    expect(spec.vision).toBe('A thinking tool');
    expect(spec.problem.statement).toBe('Docs are scattered');
    expect(spec.problem.context).toBe('Teams lose context');
    expect(spec.notes).toBe(
      '## From the previous version\n\n### 1. Product Overview\n\n#### Product Summary\n\n_What is it?_\n\nA thinking tool\n\n#### Background & Motivation\n\nTeams lose context\n\n### 2. Problem\n\n#### Current Pain\n\nDocs are scattered\n',
    );
    expect(productSpecFromLegacy({}).notes).toBe('');
  });
});

describe('decisions, glossary, research, roadmap', () => {
  it('keeps valid dates only and renders an ADR', () => {
    expect(normalizeDecision({ date: 'tomorrow' }).date).toBe('');
    expect(createDefaultDecision('2026-10-07')).toMatchObject({ status: 'proposed', date: '2026-10-07' });
    const md = decisionToMarkdown('Use Convex', normalizeDecision({
      status: 'accepted',
      date: '2026-10-07',
      context: 'We need a backend',
      options: [{ title: 'Convex', pros: ['Reactive'], cons: ['Vendor'] }],
      decision: 'Convex',
      followUps: ['Write ADR 2'],
    }));
    expect(md).toContain('**Status:** Accepted · **Date:** 2026-10-07');
    expect(md).toContain('### Option 1: Convex');
    expect(md).toContain('**Pros**\n\n- Reactive');
    expect(md).toContain('## Follow-ups\n\n- [ ] Write ADR 2');
  });

  it('sorts glossary terms and shows aliases', () => {
    const md = glossaryToMarkdown('Terms', normalizeGlossary({ terms: [{ term: 'Workspace', definition: 'A container' }, { term: 'App', definition: 'A tool', aliases: ['Module'] }, { term: '' }] }));
    expect(md.indexOf('## App')).toBeLessThan(md.indexOf('## Workspace'));
    expect(md).toContain('_Also: Module_');
  });

  it('renders research insights with their sources', () => {
    const md = researchToMarkdown('Interviews', normalizeResearch({
      goal: 'Why churn?',
      sources: [{ id: 's1', title: 'Call with Ana', kind: 'interview', date: '2026-09-01' }],
      insights: [{ statement: 'Setup is too slow', confidence: 'high', sourceIds: ['s1'], tags: ['onboarding'] }],
    }));
    expect(md).toContain('### 1. Setup is too slow');
    expect(md).toContain('_Confidence: high · Tags: onboarding_');
    expect(md).toContain('Sources: Call with Ana');
    expect(md).toContain('_Interview · 2026-09-01_');
  });

  it('groups roadmap initiatives by horizon and names their goals', () => {
    const md = roadmapToMarkdown('2026', normalizeRoadmap({
      goals: [{ id: 'g1', objective: 'Grow revenue', keyResults: [{ text: 'MRR', target: '$50k', current: '$30k' }] }],
      initiatives: [
        { title: 'Pricing page', horizon: 'now', status: 'active', goalIds: ['g1'] },
        { title: 'Partner API', horizon: 'later' },
      ],
    }));
    expect(md).toContain('- MRR — target $50k, now $30k');
    expect(md).toContain('## Now\n\n- **Pricing page** _(active)_ → Grow revenue');
    expect(md).toContain('## Later\n\n- **Partner API** _(proposed)_');
    expect(md).not.toContain('## Next');
  });
});
