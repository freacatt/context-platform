import { bullets, entries, lines, obj, section, text, type Json } from './primitives';

export interface ColorToken {
  id: string;
  name: string;
  light: string;
  dark: string;
  description: string;
}

export interface TypeToken {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
}

/** A named value on a scale: spacing, radius, shadow, motion or breakpoint. */
export interface ScaleToken {
  id: string;
  name: string;
  value: string;
  description: string;
}

export interface ComponentProp {
  id: string;
  name: string;
  type: string;
  description: string;
}

export interface DesignComponent {
  id: string;
  name: string;
  category: string;
  purpose: string;
  variants: string[];
  states: string[];
  props: ComponentProp[];
  dos: string[];
  donts: string[];
  accessibility: string;
}

export interface DesignSystemSpec {
  description: string;
  principles: string[];
  colors: ColorToken[];
  typography: TypeToken[];
  spacing: ScaleToken[];
  radii: ScaleToken[];
  shadows: ScaleToken[];
  motion: ScaleToken[];
  breakpoints: ScaleToken[];
  components: DesignComponent[];
  guidelines: { voiceAndTone: string; iconography: string; layout: string; accessibility: string };
}

export const SCALE_KEYS = ['spacing', 'radii', 'shadows', 'motion', 'breakpoints'] as const;
export type ScaleKey = (typeof SCALE_KEYS)[number];
export const SCALE_LABELS: Record<ScaleKey, string> = {
  spacing: 'Spacing',
  radii: 'Radius',
  shadows: 'Shadows',
  motion: 'Motion',
  breakpoints: 'Breakpoints',
};

const scale = (prefix: string, items: [string, string][]): ScaleToken[] =>
  items.map(([name, value], i) => ({ id: `${prefix}-${i + 1}`, name, value, description: '' }));

/** A new design system starts with a sensible, editable token set. */
export function createDefaultDesignSystem(): DesignSystemSpec {
  const color = (name: string, light: string, dark: string, description: string, i: number): ColorToken => ({ id: `color-${i}`, name, light, dark, description });
  return {
    description: '',
    principles: [],
    colors: [
      color('primary', '#2563eb', '#3b82f6', 'Main actions and links', 1),
      color('primary-foreground', '#ffffff', '#ffffff', 'Text on primary', 2),
      color('background', '#ffffff', '#0b0f19', 'Page background', 3),
      color('foreground', '#0f172a', '#e2e8f0', 'Body text', 4),
      color('muted', '#f1f5f9', '#1e293b', 'Subtle surfaces', 5),
      color('border', '#e2e8f0', '#1e293b', 'Dividers and inputs', 6),
      color('success', '#16a34a', '#22c55e', 'Positive states', 7),
      color('warning', '#d97706', '#f59e0b', 'Caution states', 8),
      color('danger', '#dc2626', '#ef4444', 'Errors and destructive actions', 9),
    ],
    typography: [
      ['display', '36px', '700', '1.2'],
      ['heading', '24px', '600', '1.3'],
      ['body', '16px', '400', '1.5'],
      ['small', '14px', '400', '1.4'],
      ['caption', '12px', '500', '1.4'],
    ].map(([name, fontSize, fontWeight, lineHeight], i) => ({
      id: `type-${i + 1}`,
      name,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize,
      fontWeight,
      lineHeight,
      letterSpacing: '0',
    })),
    spacing: scale('space', [['1', '4px'], ['2', '8px'], ['3', '12px'], ['4', '16px'], ['6', '24px'], ['8', '32px'], ['12', '48px']]),
    radii: scale('radius', [['sm', '4px'], ['md', '8px'], ['lg', '12px'], ['full', '9999px']]),
    shadows: scale('shadow', [['sm', '0 1px 2px rgb(0 0 0 / 0.05)'], ['md', '0 4px 8px rgb(0 0 0 / 0.08)'], ['lg', '0 12px 24px rgb(0 0 0 / 0.12)']]),
    motion: scale('motion', [['fast', '120ms ease-out'], ['base', '200ms ease-in-out'], ['slow', '320ms ease-in-out']]),
    breakpoints: scale('bp', [['sm', '640px'], ['md', '768px'], ['lg', '1024px'], ['xl', '1280px']]),
    components: [],
    guidelines: { voiceAndTone: '', iconography: '', layout: '', accessibility: '' },
  };
}

const scaleTokens = (value: unknown, prefix: string) =>
  entries<ScaleToken>(value, prefix, (r, id) => ({ id, name: text(r.name, 200), value: text(r.value, 500), description: text(r.description, 2000) }));

export function normalizeDesignSystem(raw: unknown): DesignSystemSpec {
  const r = obj(raw);
  const g = obj(r.guidelines);
  return {
    description: text(r.description),
    principles: lines(r.principles),
    colors: entries<ColorToken>(r.colors, 'color', (c, id) => ({
      id,
      name: text(c.name, 200),
      light: text(c.light, 200),
      dark: text(c.dark, 200),
      description: text(c.description, 2000),
    })),
    typography: entries<TypeToken>(r.typography, 'type', (t, id) => ({
      id,
      name: text(t.name, 200),
      fontFamily: text(t.fontFamily, 500),
      fontSize: text(t.fontSize, 50),
      fontWeight: text(t.fontWeight, 50),
      lineHeight: text(t.lineHeight, 50),
      letterSpacing: text(t.letterSpacing, 50),
    })),
    spacing: scaleTokens(r.spacing, 'space'),
    radii: scaleTokens(r.radii, 'radius'),
    shadows: scaleTokens(r.shadows, 'shadow'),
    motion: scaleTokens(r.motion, 'motion'),
    breakpoints: scaleTokens(r.breakpoints, 'bp'),
    components: entries<DesignComponent>(r.components, 'component', (c, id) => ({
      id,
      name: text(c.name, 200),
      category: text(c.category, 200),
      purpose: text(c.purpose),
      variants: lines(c.variants),
      states: lines(c.states),
      props: entries<ComponentProp>(c.props, 'prop', (p, pid) => ({ id: pid, name: text(p.name, 200), type: text(p.type, 500), description: text(p.description, 2000) })),
      dos: lines(c.dos),
      donts: lines(c.donts),
      accessibility: text(c.accessibility),
    })),
    guidelines: {
      voiceAndTone: text(g.voiceAndTone),
      iconography: text(g.iconography),
      layout: text(g.layout),
      accessibility: text(g.accessibility),
    },
  };
}

const tokenName = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'token';

/** Design tokens in the W3C Design Tokens Community Group format. Dark colors go under `color-dark`. */
export function toDesignTokens(spec: DesignSystemSpec): Json {
  const group = (type: string, tokens: ScaleToken[]) =>
    Object.fromEntries(tokens.filter((t) => t.value).map((t) => [tokenName(t.name), { $type: type, $value: t.value, ...(t.description && { $description: t.description }) }]));
  const colors = (mode: 'light' | 'dark') =>
    Object.fromEntries(
      spec.colors
        .filter((c) => c[mode])
        .map((c) => [tokenName(c.name), { $type: 'color', $value: c[mode], ...(c.description && { $description: c.description }) }]),
    );
  return {
    color: colors('light'),
    'color-dark': colors('dark'),
    typography: Object.fromEntries(
      spec.typography.map((t) => [
        tokenName(t.name),
        { $type: 'typography', $value: { fontFamily: t.fontFamily, fontSize: t.fontSize, fontWeight: t.fontWeight, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing } },
      ]),
    ),
    spacing: group('dimension', spec.spacing),
    radius: group('dimension', spec.radii),
    shadow: group('shadow', spec.shadows),
    motion: group('transition', spec.motion),
    breakpoint: group('dimension', spec.breakpoints),
  };
}

/** CSS custom properties: light values on :root, dark ones under .dark. */
export function toCssVariables(spec: DesignSystemSpec): string {
  const decl = (prefix: string, name: string, value: string) => `  --${prefix}-${tokenName(name)}: ${value};`;
  const root = [
    ...spec.colors.filter((c) => c.light).map((c) => decl('color', c.name, c.light)),
    ...spec.typography.flatMap((t) => [
      ...(t.fontFamily ? [decl('font', t.name, t.fontFamily)] : []),
      ...(t.fontSize ? [decl('text', t.name, t.fontSize)] : []),
      ...(t.fontWeight ? [decl('font-weight', t.name, t.fontWeight)] : []),
      ...(t.lineHeight ? [decl('leading', t.name, t.lineHeight)] : []),
    ]),
    ...spec.spacing.filter((t) => t.value).map((t) => decl('space', t.name, t.value)),
    ...spec.radii.filter((t) => t.value).map((t) => decl('radius', t.name, t.value)),
    ...spec.shadows.filter((t) => t.value).map((t) => decl('shadow', t.name, t.value)),
    ...spec.motion.filter((t) => t.value).map((t) => decl('motion', t.name, t.value)),
    ...spec.breakpoints.filter((t) => t.value).map((t) => decl('breakpoint', t.name, t.value)),
  ];
  const dark = spec.colors.filter((c) => c.dark).map((c) => decl('color', c.name, c.dark));
  return [':root {', ...root, '}', ...(dark.length ? ['', '.dark {', ...dark, '}'] : []), ''].join('\n');
}

export function designSystemToMarkdown(title: string, spec: DesignSystemSpec): string {
  const table = (head: string[], rows: string[][]) =>
    rows.length ? [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map((c) => c.replace(/\|/g, '\\|') || ' ').join(' | ')} |`)] : [];
  const scaleSection = (heading: string, tokens: ScaleToken[]) =>
    section(`### ${heading}`, table(['Token', 'Value', 'Notes'], tokens.map((t) => [t.name, t.value, t.description])));
  const out = [`# ${title}`, ''];
  if (spec.description.trim()) out.push(spec.description.trim(), '');
  out.push(...section('## Principles', bullets(spec.principles)));
  const tokens = [
    ...section('### Colors', table(['Token', 'Light', 'Dark', 'Usage'], spec.colors.map((c) => [c.name, c.light, c.dark, c.description]))),
    ...section(
      '### Typography',
      table(['Token', 'Font', 'Size', 'Weight', 'Line height', 'Tracking'], spec.typography.map((t) => [t.name, t.fontFamily, t.fontSize, t.fontWeight, t.lineHeight, t.letterSpacing])),
    ),
    ...scaleSection('Spacing', spec.spacing),
    ...scaleSection('Radius', spec.radii),
    ...scaleSection('Shadows', spec.shadows),
    ...scaleSection('Motion', spec.motion),
    ...scaleSection('Breakpoints', spec.breakpoints),
  ];
  if (tokens.length) out.push('## Tokens', '', ...tokens);
  if (spec.components.length) {
    out.push('## Components', '');
    for (const c of spec.components) {
      out.push(`### ${c.name || 'Untitled component'}`, '');
      if (c.category) out.push(`_Category: ${c.category}_`, '');
      if (c.purpose.trim()) out.push(c.purpose.trim(), '');
      if (c.variants.some((v) => v.trim())) out.push(`**Variants:** ${c.variants.filter((v) => v.trim()).join(', ')}`, '');
      if (c.states.some((v) => v.trim())) out.push(`**States:** ${c.states.filter((v) => v.trim()).join(', ')}`, '');
      if (c.props.length) out.push('**Props:**', '', ...table(['Prop', 'Type', 'Description'], c.props.map((p) => [p.name, p.type, p.description])), '');
      out.push(...section('**Do**', bullets(c.dos)), ...section("**Don't**", bullets(c.donts)));
      if (c.accessibility.trim()) out.push(`**Accessibility:** ${c.accessibility.trim()}`, '');
    }
  }
  const g = spec.guidelines;
  out.push(
    ...section('## Voice and tone', g.voiceAndTone),
    ...section('## Iconography', g.iconography),
    ...section('## Layout', g.layout),
    ...section('## Accessibility', g.accessibility),
  );
  return out.join('\n');
}

export type { Json };

/**
 * A design system from the theme and base components of a UI/UX architecture of the previous
 * version. Component ids are kept so the architecture's pages still point at them.
 */
export function designSystemFromLegacyUiUx(theme: unknown, components: unknown): DesignSystemSpec {
  const main = obj(obj(theme).main);
  const advanced = obj(obj(theme).advanced);
  const pairs = (value: unknown) => Object.entries(obj(value)).filter(([, v]) => typeof v === 'string' && v.trim()) as [string, string][];
  const typography = obj(main.typography);
  return normalizeDesignSystem({
    description: text(main.description),
    colors: pairs(main.colors).map(([name, light]) => ({ name, light, dark: '' })),
    typography:
      text(typography.font_family) || text(typography.font_size_base)
        ? [{ name: 'body', fontFamily: text(typography.font_family), fontSize: text(typography.font_size_base) }]
        : [],
    spacing: text(main.spacing_unit) ? [{ name: 'unit', value: text(main.spacing_unit) }] : [],
    radii: pairs(main.border_radius).map(([name, value]) => ({ name, value })),
    shadows: pairs(advanced.shadows).map(([name, value]) => ({ name, value })),
    breakpoints: pairs(advanced.breakpoints).map(([name, value]) => ({ name, value })),
    components: (Array.isArray(components) ? components : []).map((raw) => {
      const c = obj(raw);
      const m = obj(c.main);
      const props = Object.entries(obj(obj(c.advanced).props)).map(([name, type]) => ({ name, type: text(type), description: '' }));
      const required = lines(m.required_props).filter((name) => !props.some((p) => p.name === name));
      return {
        id: text(c.component_id, 64),
        name: text(m.name),
        category: text(m.category) || text(c.type),
        purpose: text(m.description),
        props: [...required.map((name) => ({ name, type: '', description: 'Required' })), ...props],
      };
    }),
  });
}

/** Whether a legacy theme or component list holds anything worth keeping. */
export function hasLegacyDesign(theme: unknown, components: unknown): boolean {
  const spec = designSystemFromLegacyUiUx(theme, components);
  return spec.colors.length + spec.typography.length + spec.spacing.length + spec.radii.length + spec.shadows.length + spec.breakpoints.length + spec.components.length > 0;
}
