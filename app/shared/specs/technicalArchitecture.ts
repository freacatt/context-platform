/**
 * Technical Architecture: what the system is made of, how the parts talk, the stack, the data,
 * the qualities it must have, how it ships, and the rules people and coding agents follow.
 * Loosely arc42 + C4 (container level), written to be exported as Markdown and AGENTS.md.
 */
import { bullets, choice, entries, lines, obj, section, text, type Json } from './primitives';

const option = <T extends string>(values: readonly T[], labels: Record<T, string>) => ({ values, labels });

export const ARCHITECTURE_STYLES = option(
  ['', 'monolith', 'modular-monolith', 'microservices', 'serverless', 'event-driven', 'layered', 'hexagonal', 'client-server', 'other'] as const,
  {
    '': 'Not set',
    monolith: 'Monolith',
    'modular-monolith': 'Modular monolith',
    microservices: 'Microservices',
    serverless: 'Serverless',
    'event-driven': 'Event-driven',
    layered: 'Layered',
    hexagonal: 'Hexagonal (ports & adapters)',
    'client-server': 'Client–server',
    other: 'Other',
  },
);
export type ArchitectureStyle = (typeof ARCHITECTURE_STYLES.values)[number];

export const COMPONENT_KINDS = option(
  ['web-app', 'mobile-app', 'desktop-app', 'api', 'service', 'worker', 'function', 'database', 'cache', 'queue', 'storage', 'search', 'external', 'library', 'other'] as const,
  {
    'web-app': 'Web app',
    'mobile-app': 'Mobile app',
    'desktop-app': 'Desktop app',
    api: 'API',
    service: 'Service',
    worker: 'Worker / job',
    function: 'Function',
    database: 'Database',
    cache: 'Cache',
    queue: 'Queue / stream',
    storage: 'File storage',
    search: 'Search',
    external: 'External system',
    library: 'Library / package',
    other: 'Other',
  },
);
export type ComponentKind = (typeof COMPONENT_KINDS.values)[number];

export const STACK_CATEGORIES = option(
  ['frontend', 'backend', 'data', 'infrastructure', 'devops', 'testing', 'observability', 'tooling', 'other'] as const,
  {
    frontend: 'Frontend',
    backend: 'Backend',
    data: 'Data',
    infrastructure: 'Infrastructure',
    devops: 'CI/CD',
    testing: 'Testing',
    observability: 'Observability',
    tooling: 'Tooling',
    other: 'Other',
  },
);
export type StackCategory = (typeof STACK_CATEGORIES.values)[number];

export const INTERFACE_KINDS = option(
  ['rest', 'graphql', 'grpc', 'rpc', 'websocket', 'event', 'webhook', 'sdk', 'other'] as const,
  { rest: 'REST', graphql: 'GraphQL', grpc: 'gRPC', rpc: 'RPC', websocket: 'WebSocket', event: 'Event / message', webhook: 'Webhook', sdk: 'SDK / library', other: 'Other' },
);
export type InterfaceKind = (typeof INTERFACE_KINDS.values)[number];

export const PRIORITIES = option(['high', 'medium', 'low'] as const, { high: 'High', medium: 'Medium', low: 'Low' });
export type Priority = (typeof PRIORITIES.values)[number];

/** Cross-cutting concerns, each free Markdown. */
export const CONCERNS = [
  { key: 'security', label: 'Security', hint: 'Authentication, authorization, data protection, secrets, input validation' },
  { key: 'performance', label: 'Performance', hint: 'Budgets and targets, caching, pagination, heavy work off the request path' },
  { key: 'reliability', label: 'Reliability', hint: 'Availability target, retries, idempotency, backups, failure modes' },
  { key: 'observability', label: 'Observability', hint: 'Logging, metrics, tracing, alerting' },
  { key: 'errorHandling', label: 'Error handling', hint: 'How errors are raised, mapped and shown to users' },
  { key: 'testing', label: 'Testing', hint: 'Test levels, what must be covered, tools, fixtures' },
  { key: 'codeOrganization', label: 'Code organization', hint: 'Repository and folder layout, module boundaries, where things go' },
  { key: 'conventions', label: 'Conventions', hint: 'Naming, patterns to use, anti-patterns to avoid, formatting' },
] as const;
export type ConcernKey = (typeof CONCERNS)[number]['key'];

export interface Dependency {
  id: string;
  /** Component id. */
  to: string;
  /** How: protocol, call, event… */
  via: string;
}

export interface ArchComponent {
  id: string;
  name: string;
  kind: ComponentKind;
  technology: string;
  responsibility: string;
  dependsOn: Dependency[];
  notes: string;
}

export interface StackItem {
  id: string;
  category: StackCategory;
  name: string;
  version: string;
  purpose: string;
}

export interface DataEntity {
  id: string;
  name: string;
  /** Component that owns (writes) it. */
  ownerId: string;
  description: string;
  fields: string[];
}

export interface ApiInterface {
  id: string;
  name: string;
  kind: InterfaceKind;
  providerId: string;
  consumerIds: string[];
  description: string;
}

export interface QualityGoal {
  id: string;
  attribute: string;
  scenario: string;
  priority: Priority;
}

export interface Environment {
  id: string;
  name: string;
  purpose: string;
  url: string;
}

export interface TechRisk {
  id: string;
  title: string;
  kind: 'risk' | 'debt';
  severity: Priority;
  description: string;
  mitigation: string;
}

export interface AgentRules {
  mustDo: string[];
  mustNot: string[];
  guidance: string[];
  definitionOfDone: string[];
}

export interface TechnicalArchitectureSpec {
  summary: string;
  style: ArchitectureStyle;
  /** Who and what the system talks to (users, external systems). */
  context: string;
  principles: string[];
  constraints: string[];
  qualityGoals: QualityGoal[];
  components: ArchComponent[];
  /** Key runtime flows ("a user places an order: …"). */
  flows: string;
  stack: StackItem[];
  data: DataEntity[];
  interfaces: ApiInterface[];
  apiConventions: string;
  concerns: Record<ConcernKey, string>;
  environments: Environment[];
  pipeline: string[];
  deployment: string;
  rules: AgentRules;
  risks: TechRisk[];
}

export function normalizeTechnicalArchitecture(raw: unknown): TechnicalArchitectureSpec {
  const r = obj(raw);
  const c = obj(r.concerns);
  const rules = obj(r.rules);
  const components = entries<ArchComponent>(r.components, 'component', (x, id) => ({
    id,
    name: text(x.name, 200),
    kind: choice(x.kind, COMPONENT_KINDS.values, 'service'),
    technology: text(x.technology, 500),
    responsibility: text(x.responsibility),
    dependsOn: entries<Dependency>(x.dependsOn, `${id}-dep`, (d, did) => ({ id: did, to: text(d.to, 64), via: text(d.via, 500) })),
    notes: text(x.notes),
  }));
  return {
    summary: text(r.summary),
    style: choice(r.style, ARCHITECTURE_STYLES.values, ''),
    context: text(r.context),
    principles: lines(r.principles),
    constraints: lines(r.constraints),
    qualityGoals: entries<QualityGoal>(r.qualityGoals, 'quality', (x, id) => ({
      id,
      attribute: text(x.attribute, 200),
      scenario: text(x.scenario, 2000),
      priority: choice(x.priority, PRIORITIES.values, 'medium'),
    })),
    components,
    flows: text(r.flows),
    stack: entries<StackItem>(r.stack, 'stack', (x, id) => ({
      id,
      category: choice(x.category, STACK_CATEGORIES.values, 'other'),
      name: text(x.name, 200),
      version: text(x.version, 100),
      purpose: text(x.purpose, 2000),
    })),
    data: entries<DataEntity>(r.data, 'entity', (x, id) => ({
      id,
      name: text(x.name, 200),
      ownerId: text(x.ownerId, 64),
      description: text(x.description),
      fields: lines(x.fields),
    })),
    interfaces: entries<ApiInterface>(r.interfaces, 'interface', (x, id) => ({
      id,
      name: text(x.name, 200),
      kind: choice(x.kind, INTERFACE_KINDS.values, 'rest'),
      providerId: text(x.providerId, 64),
      consumerIds: lines(x.consumerIds),
      description: text(x.description),
    })),
    apiConventions: text(r.apiConventions),
    concerns: Object.fromEntries(CONCERNS.map(({ key }) => [key, text(c[key])])) as Record<ConcernKey, string>,
    environments: entries<Environment>(r.environments, 'env', (x, id) => ({ id, name: text(x.name, 200), purpose: text(x.purpose, 2000), url: text(x.url, 500) })),
    pipeline: lines(r.pipeline),
    deployment: text(r.deployment),
    rules: { mustDo: lines(rules.mustDo), mustNot: lines(rules.mustNot), guidance: lines(rules.guidance), definitionOfDone: lines(rules.definitionOfDone) },
    risks: entries<TechRisk>(r.risks, 'risk', (x, id) => ({
      id,
      title: text(x.title, 500),
      kind: x.kind === 'debt' ? 'debt' : 'risk',
      severity: choice(x.severity, PRIORITIES.values, 'medium'),
      description: text(x.description),
      mitigation: text(x.mitigation),
    })),
  };
}

export const createDefaultTechnicalArchitecture = (): TechnicalArchitectureSpec => normalizeTechnicalArchitecture({});

/** Whether no section has content yet (templates are offered then). */
export function isEmptyArchitecture(spec: TechnicalArchitectureSpec): boolean {
  return !Object.values(filledSections(spec)).some(Boolean);
}

// --- templates ---------------------------------------------------------------------------

export interface ArchitectureTemplate {
  id: string;
  name: string;
  description: string;
  spec: Json;
}

const dep = (to: string, via: string) => ({ to, via });

export const ARCHITECTURE_TEMPLATES: ArchitectureTemplate[] = [
  {
    id: 'web-app',
    name: 'Web app with an API',
    description: 'Single-page app, REST API, relational database, background worker.',
    spec: {
      style: 'modular-monolith',
      summary: 'A browser app talks to one API; the API owns the database; slow work runs in a worker.',
      principles: ['The API is the only writer of the database', 'Business rules live in the API, not in the UI', 'Every endpoint checks authorization'],
      components: [
        { id: 'web', name: 'Web app', kind: 'web-app', technology: 'React + TypeScript', responsibility: 'User interface', dependsOn: [dep('api', 'HTTPS / JSON')] },
        { id: 'api', name: 'API', kind: 'api', technology: 'Node.js', responsibility: 'Business logic, validation, authorization', dependsOn: [dep('db', 'SQL'), dep('queue', 'enqueue jobs'), dep('auth', 'OIDC')] },
        { id: 'worker', name: 'Worker', kind: 'worker', technology: 'Node.js', responsibility: 'Emails, imports, other slow work', dependsOn: [dep('queue', 'consume'), dep('db', 'SQL')] },
        { id: 'db', name: 'Database', kind: 'database', technology: 'PostgreSQL', responsibility: 'System of record' },
        { id: 'queue', name: 'Job queue', kind: 'queue', technology: 'Redis', responsibility: 'Background jobs' },
        { id: 'auth', name: 'Identity provider', kind: 'external', technology: 'OIDC', responsibility: 'Sign-in' },
      ],
      stack: [
        { category: 'frontend', name: 'React', purpose: 'UI' },
        { category: 'backend', name: 'Node.js', purpose: 'API and worker runtime' },
        { category: 'data', name: 'PostgreSQL', purpose: 'Relational data' },
        { category: 'testing', name: 'Vitest', purpose: 'Unit and integration tests' },
      ],
      interfaces: [{ id: 'rest', name: 'Public REST API', kind: 'rest', providerId: 'api', consumerIds: ['web'], description: 'JSON over HTTPS, versioned under /v1' }],
      rules: { mustDo: ['Validate all input at the API boundary', 'Add tests with every change'], mustNot: ['Query the database from the web app', 'Commit secrets'] },
    },
  },
  {
    id: 'serverless',
    name: 'Serverless backend',
    description: 'Client app on a managed backend (functions, database, auth) — e.g. Convex, Firebase, Supabase.',
    spec: {
      style: 'serverless',
      summary: 'Clients call backend functions; the platform provides the database, auth and scheduling.',
      principles: ['Every function checks auth and ownership', 'Pure domain logic is shared between client and functions'],
      components: [
        { id: 'client', name: 'Client app', kind: 'web-app', technology: 'React', responsibility: 'UI; calls functions only', dependsOn: [dep('functions', 'queries / mutations')] },
        { id: 'functions', name: 'Backend functions', kind: 'function', technology: '', responsibility: 'Reads, writes, auth checks, integrations', dependsOn: [dep('db', 'document API'), dep('scheduler', 'schedule')] },
        { id: 'db', name: 'Database', kind: 'database', technology: '', responsibility: 'Documents and indexes' },
        { id: 'scheduler', name: 'Scheduler', kind: 'worker', technology: '', responsibility: 'Background and scheduled work', dependsOn: [dep('functions', 'runs')] },
      ],
      rules: { mustDo: ['Go through backend functions for all data access'], mustNot: ['Call third-party APIs from the browser with secrets'] },
    },
  },
  {
    id: 'event-driven',
    name: 'Event-driven services',
    description: 'Services that own their data and integrate through a message broker.',
    spec: {
      style: 'event-driven',
      summary: 'Independent services own their data and publish domain events; others react asynchronously.',
      principles: ['Each service owns its database', 'Integrate through events, not shared tables', 'Consumers are idempotent'],
      components: [
        { id: 'gateway', name: 'API gateway', kind: 'api', responsibility: 'Routing, auth, rate limits', dependsOn: [dep('orders', 'HTTP'), dep('payments', 'HTTP')] },
        { id: 'orders', name: 'Order service', kind: 'service', responsibility: 'Orders lifecycle', dependsOn: [dep('orders-db', 'SQL'), dep('broker', 'publish OrderPlaced')] },
        { id: 'payments', name: 'Payment service', kind: 'service', responsibility: 'Charges and refunds', dependsOn: [dep('broker', 'consume OrderPlaced'), dep('psp', 'HTTPS')] },
        { id: 'broker', name: 'Message broker', kind: 'queue', technology: 'Kafka', responsibility: 'Domain events' },
        { id: 'orders-db', name: 'Orders database', kind: 'database', responsibility: 'Order data' },
        { id: 'psp', name: 'Payment provider', kind: 'external', responsibility: 'Card processing' },
      ],
      concerns: { reliability: 'At-least-once delivery; every consumer is idempotent (dedupe by event id). Outbox pattern for publishing.' },
    },
  },
];

// --- diagram ------------------------------------------------------------------------------

/**
 * Columns for a left-to-right diagram: a component sits one column right of the deepest
 * component depending on it (callers left, dependencies right). Cycles are cut.
 */
export function componentLevels(components: Pick<ArchComponent, 'id' | 'dependsOn'>[]): Map<string, number> {
  const ids = new Set(components.map((c) => c.id));
  const callers = new Map<string, string[]>(components.map((c) => [c.id, []]));
  for (const c of components) for (const d of c.dependsOn) if (ids.has(d.to) && d.to !== c.id) callers.get(d.to)!.push(c.id);
  const level = new Map<string, number>();
  const visit = (id: string, path: Set<string>): number => {
    if (level.has(id)) return level.get(id)!;
    if (path.has(id)) return 0;
    path.add(id);
    const value = Math.max(0, ...callers.get(id)!.map((caller) => visit(caller, path) + 1));
    path.delete(id);
    level.set(id, value);
    return value;
  };
  for (const c of components) visit(c.id, new Set());
  return level;
}

const mermaidId = (id: string) => `c_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
const mermaidText = (s: string) => s.replace(/["[\]{}()<>|]/g, ' ').replace(/\s+/g, ' ').trim();

/** A Mermaid flowchart of the components and their dependencies. */
export function componentsMermaid(spec: Pick<TechnicalArchitectureSpec, 'components'>): string {
  const ids = new Set(spec.components.map((c) => c.id));
  const out = ['flowchart LR'];
  for (const c of spec.components) {
    const label = [c.name || 'Unnamed', c.technology && `<i>${mermaidText(c.technology)}</i>`].filter(Boolean).join('<br/>');
    const shape = c.kind === 'database' ? [`[(`, `)]`] : c.kind === 'external' ? [`[/`, `/]`] : c.kind === 'queue' ? [`>`, `]`] : [`[`, `]`];
    out.push(`  ${mermaidId(c.id)}${shape[0]}"${label.replace(/"/g, "'")}"${shape[1]}`);
  }
  for (const c of spec.components) {
    for (const d of c.dependsOn) {
      if (!ids.has(d.to)) continue;
      out.push(d.via.trim() ? `  ${mermaidId(c.id)} -->|${mermaidText(d.via)}| ${mermaidId(d.to)}` : `  ${mermaidId(c.id)} --> ${mermaidId(d.to)}`);
    }
  }
  return out.join('\n');
}

// --- markdown -----------------------------------------------------------------------------

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim() || ' ';
const table = (head: string[], rows: string[][]) =>
  rows.length ? [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)] : [];

export function technicalArchitectureToMarkdown(title: string, spec: TechnicalArchitectureSpec): string {
  const name = (id: string) => spec.components.find((c) => c.id === id)?.name || id;
  const out = [`# ${title}`, ''];
  if (spec.summary.trim()) out.push(spec.summary.trim(), '');
  if (spec.style) out.push(`**Architecture style:** ${ARCHITECTURE_STYLES.labels[spec.style]}`, '');
  out.push(...section('## Context', spec.context), ...section('## Principles', bullets(spec.principles)), ...section('## Constraints', bullets(spec.constraints)));
  out.push(
    ...section(
      '## Quality goals',
      table(['Priority', 'Quality', 'Scenario / target'], spec.qualityGoals.map((q) => [PRIORITIES.labels[q.priority], q.attribute, q.scenario])),
    ),
  );

  if (spec.components.length) {
    out.push('## Components', '', '```mermaid', componentsMermaid(spec), '```', '');
    for (const c of spec.components) {
      out.push(`### ${c.name || 'Unnamed component'}`, '', `_${COMPONENT_KINDS.labels[c.kind]}${c.technology ? ` · ${c.technology}` : ''}_`, '');
      if (c.responsibility.trim()) out.push(c.responsibility.trim(), '');
      const deps = c.dependsOn.filter((d) => d.to);
      if (deps.length) out.push('Depends on:', ...deps.map((d) => `- ${name(d.to)}${d.via ? ` (${d.via})` : ''}`), '');
      if (c.notes.trim()) out.push(c.notes.trim(), '');
    }
  }
  out.push(...section('## Key flows', spec.flows));

  if (spec.stack.length) {
    out.push('## Technology stack', '');
    for (const category of STACK_CATEGORIES.values) {
      const items = spec.stack.filter((s) => s.category === category && s.name.trim());
      if (items.length) out.push(`### ${STACK_CATEGORIES.labels[category]}`, '', ...table(['Technology', 'Version', 'Purpose'], items.map((s) => [s.name, s.version, s.purpose])), '');
    }
  }

  if (spec.data.length) {
    out.push('## Data', '');
    for (const e of spec.data) {
      out.push(`### ${e.name || 'Unnamed entity'}`, '');
      if (e.ownerId) out.push(`_Owned by ${name(e.ownerId)}_`, '');
      if (e.description.trim()) out.push(e.description.trim(), '');
      if (e.fields.some((f) => f.trim())) out.push(...bullets(e.fields), '');
    }
  }

  if (spec.interfaces.length || spec.apiConventions.trim()) {
    out.push('## Interfaces', '');
    if (spec.interfaces.length) {
      out.push(
        ...table(
          ['Interface', 'Kind', 'Provider', 'Consumers', 'Description'],
          spec.interfaces.map((i) => [i.name, INTERFACE_KINDS.labels[i.kind], i.providerId ? name(i.providerId) : '', i.consumerIds.map(name).join(', '), i.description]),
        ),
        '',
      );
    }
    out.push(...section('### API conventions', spec.apiConventions));
  }

  const concerns = CONCERNS.filter((c) => spec.concerns[c.key].trim());
  if (concerns.length) {
    out.push('## Cross-cutting concerns', '');
    for (const c of concerns) out.push(`### ${c.label}`, '', spec.concerns[c.key].trim(), '');
  }

  if (spec.environments.length || spec.pipeline.length || spec.deployment.trim()) {
    out.push('## Delivery', '');
    out.push(...table(['Environment', 'Purpose', 'URL'], spec.environments.map((e) => [e.name, e.purpose, e.url])));
    if (spec.environments.length) out.push('');
    out.push(...section('### CI/CD pipeline', spec.pipeline.filter((s) => s.trim()).map((s, i) => `${i + 1}. ${s.trim()}`)));
    out.push(...section('### Deployment', spec.deployment));
  }

  const r = spec.rules;
  if (r.mustDo.length || r.mustNot.length || r.guidance.length || r.definitionOfDone.length) {
    out.push(
      '## Rules for changes',
      '',
      ...section('### Always', bullets(r.mustDo)),
      ...section('### Never', bullets(r.mustNot)),
      ...section('### Guidance', bullets(r.guidance)),
      ...section('### Definition of done', bullets(r.definitionOfDone, '- [ ] ')),
    );
  }

  if (spec.risks.length) {
    out.push(
      '## Risks and technical debt',
      '',
      ...table(
        ['', 'Severity', 'Item', 'Mitigation'],
        spec.risks.map((k) => [k.kind === 'debt' ? 'Debt' : 'Risk', PRIORITIES.labels[k.severity], [k.title, k.description].filter((s) => s.trim()).join(' — '), k.mitigation]),
      ),
      '',
    );
  }
  return out.join('\n');
}

/**
 * Instructions for coding agents (AGENTS.md / CLAUDE.md): what the system is, the stack,
 * where things live, conventions, and the rules — no history, no rationale.
 */
export function technicalArchitectureToAgentsMd(title: string, spec: TechnicalArchitectureSpec): string {
  const out = [`# ${title} — instructions for coding agents`, ''];
  if (spec.summary.trim()) out.push(spec.summary.trim(), '');
  if (spec.components.length) {
    out.push('## System', '');
    for (const c of spec.components) {
      out.push(`- **${c.name || 'Unnamed'}** (${COMPONENT_KINDS.labels[c.kind]}${c.technology ? `, ${c.technology}` : ''})${c.responsibility.trim() ? `: ${c.responsibility.trim()}` : ''}`);
    }
    out.push('');
  }
  const stack = spec.stack.filter((s) => s.name.trim());
  if (stack.length) out.push('## Stack', '', ...stack.map((s) => `- ${STACK_CATEGORIES.labels[s.category]}: ${s.name}${s.version ? ` ${s.version}` : ''}${s.purpose ? ` — ${s.purpose}` : ''}`), '');
  out.push(...section('## Principles', bullets(spec.principles)));
  out.push(...section('## Code organization', spec.concerns.codeOrganization));
  out.push(...section('## Conventions', spec.concerns.conventions));
  out.push(...section('## API conventions', spec.apiConventions));
  out.push(...section('## Error handling', spec.concerns.errorHandling));
  out.push(...section('## Security', spec.concerns.security));
  out.push(...section('## Testing', spec.concerns.testing));
  const r = spec.rules;
  out.push(
    ...section('## Always', bullets(r.mustDo)),
    ...section('## Never', bullets(r.mustNot)),
    ...section('## Guidance', bullets(r.guidance)),
    ...section('## Definition of done', bullets(r.definitionOfDone, '- [ ] ')),
  );
  return out.join('\n');
}

// --- previous version ---------------------------------------------------------------------

const pairs = (value: unknown): string[] =>
  Object.entries(obj(value))
    .filter(([, v]) => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}`);

const strings = (value: unknown) => lines(value).filter((s) => s.trim());

/** Markdown paragraphs from labelled parts, skipping empty ones. */
const prose = (parts: [string, string[] | string][]) =>
  parts
    .map(([label, body]) => {
      const content = Array.isArray(body) ? body.filter((s) => s.trim()) : body.trim() ? [body.trim()] : [];
      if (!content.length) return '';
      return Array.isArray(body) ? `**${label}**\n${content.map((s) => `- ${s}`).join('\n')}` : `**${label}:** ${content[0]}`;
    })
    .filter(Boolean)
    .join('\n\n');

/** A known style for a free-text architecture type ("Modular monolith", "MVC"…), or ''. */
export function styleFromText(value: string): ArchitectureStyle {
  const t = value.toLowerCase();
  if (!t.trim()) return '';
  if (t.includes('modular')) return 'modular-monolith';
  if (t.includes('microservice')) return 'microservices';
  if (t.includes('serverless')) return 'serverless';
  if (t.includes('event')) return 'event-driven';
  if (t.includes('hexagonal') || t.includes('ports')) return 'hexagonal';
  if (t.includes('monolith')) return 'monolith';
  if (t.includes('client') && t.includes('server')) return 'client-server';
  if (t.includes('layer') || t.includes('n-tier') || t.includes('mvc')) return 'layered';
  return '';
}

/**
 * A spec from the previous fixed-section version: layers become components, the stack a
 * table, standards and rules become concerns and agent rules. Nothing filled in is dropped.
 */
export function technicalArchitectureFromLegacy(sections: unknown): TechnicalArchitectureSpec {
  const s = obj(sections);
  const main = (key: string) => obj(obj(s[key]).main);
  const advanced = (key: string) => obj(obj(s[key]).advanced);

  const system = main('system_architecture');
  const layerDetails = obj(advanced('system_architecture').layer_details);
  const layers = strings(system.layers);
  const layerId = (name: string) => `layer-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const components = layers.map((name) => {
    const detail = obj(layerDetails[name]);
    const dependsOn = typeof detail.depends_on === 'string' && layers.includes(detail.depends_on) ? [{ to: layerId(detail.depends_on), via: '' }] : [];
    return { id: layerId(name), name, kind: 'other', technology: strings(detail.technologies).join(', '), responsibility: '', dependsOn };
  });

  const stack = main('technology_stack');
  const stackAdvanced = advanced('technology_stack');
  const stackItems = [
    ...Object.entries(obj(stack.frontend)).map(([k, v]) => ({ category: 'frontend', name: text(v), purpose: k })),
    ...Object.entries(obj(stack.backend)).map(([k, v]) => ({ category: k === 'database' || k === 'orm' || k === 'cache' ? 'data' : 'backend', name: text(v), purpose: k })),
    ...Object.entries(obj(stack.testing)).map(([k, v]) => ({ category: 'testing', name: text(v), purpose: k })),
    ...Object.entries(obj(stackAdvanced.frontend_extras)).map(([k, v]) => ({ category: 'frontend', name: text(v), purpose: k })),
    ...Object.entries(obj(stackAdvanced.backend_extras)).map(([k, v]) => ({ category: 'backend', name: text(v), purpose: k })),
    ...Object.entries(obj(stackAdvanced.devops)).map(([k, v]) => ({ category: 'devops', name: text(v), purpose: k })),
  ].filter((i) => i.name.trim());

  const code = main('code_organization');
  const codeAdvanced = advanced('code_organization');
  const patterns = main('design_patterns');
  const patternsAdvanced = advanced('design_patterns');
  const api = main('api_standards');
  const apiAdvanced = advanced('api_standards');
  const security = main('security_standards');
  const securityAdvanced = advanced('security_standards');
  const performance = main('performance_standards');
  const performanceAdvanced = advanced('performance_standards');
  const testing = main('testing_standards');
  const testingAdvanced = advanced('testing_standards');
  const deployment = main('deployment_cicd');
  const deploymentAdvanced = advanced('deployment_cicd');
  const git = obj(deployment.git_workflow);
  const preservation = main('preservation_rules');
  const modification = obj(advanced('preservation_rules').code_modification);
  const ai = main('ai_development_instructions');
  const aiAdvanced = advanced('ai_development_instructions');
  const mandatory = (Array.isArray(patterns.mandatory_patterns) ? patterns.mandatory_patterns : [])
    .map(obj)
    .map((p) => `${text(p.name)}${text(p.layer) ? ` (${text(p.layer)})` : ''}: ${text(p.rule)}`)
    .filter((p) => p.replace(/[:\s()]/g, ''));

  const architectureType = text(system.architecture_type).trim();
  return normalizeTechnicalArchitecture({
    summary: text(obj(s.metadata).description),
    style: styleFromText(architectureType),
    context: architectureType ? `Architecture type: ${architectureType}` : '',
    principles: strings(system.core_principles),
    components,
    flows: text(system.data_flow),
    stack: stackItems,
    apiConventions: prose([
      ['URL format', text(api.url_format)],
      ['Versioning', text(api.versioning)],
      ['Resource naming', text(api.resource_naming)],
      ['HTTP methods', pairs(api.http_methods)],
      ['Status codes', pairs(api.status_codes)],
      ['Query parameters', pairs(apiAdvanced.query_parameters)],
      ['Authentication', text(apiAdvanced.authentication)],
      ['Rate limiting', text(apiAdvanced.rate_limiting)],
    ]),
    concerns: {
      security: prose([
        ['Authentication', pairs(security.authentication)],
        ['Authorization', [text(obj(security.authorization).model), ...strings(obj(security.authorization).roles).map((r) => `role: ${r}`)]],
        ['Input validation', pairs(security.input_validation)],
        ['Data protection', pairs(security.data_protection)],
        ['Vulnerability prevention', pairs(securityAdvanced.vulnerability_prevention)],
        ['Secrets', pairs(securityAdvanced.secrets_management)],
      ]),
      performance: prose([
        ['Frontend metrics', pairs(performance.frontend_metrics)],
        ['Backend targets', pairs(performance.backend_targets)],
        ['Rules', strings(performance.optimization_rules)],
        ['Frontend optimization', pairs(performanceAdvanced.frontend_optimization)],
        ['Database', strings(obj(performanceAdvanced.backend_optimization).database)],
      ]),
      testing: prose([
        ['Coverage', pairs(testing.coverage_requirements)],
        ['Test pyramid', pairs(testing.test_pyramid)],
        ['Frameworks', pairs(testing.frameworks)],
        ['Unit testing', pairs(testingAdvanced.unit_testing)],
        ['Critical end-to-end flows', strings(testingAdvanced.e2e_critical_flows)],
      ]),
      codeOrganization: prose([
        ['Directory structure', pairs(code.directory_structure)],
        ['File naming', pairs(codeAdvanced.file_naming)],
        ['File size limits', pairs(codeAdvanced.file_size_limits)],
        ['Import order', strings(codeAdvanced.import_order)],
      ]),
      conventions: prose([
        ['Naming', pairs(code.naming_conventions)],
        ['Mandatory patterns', mandatory],
        ['Frontend patterns', pairs(patternsAdvanced.frontend_patterns)],
      ]),
    },
    environments: Object.entries(obj(deployment.environments))
      .filter(([, v]) => text(v).trim())
      .map(([name, purpose]) => ({ name, purpose: text(purpose) })),
    pipeline: strings(deployment.ci_pipeline),
    deployment: prose([
      ['Branching', text(git.branching)],
      ['Branches', strings(git.branches)],
      ['Commit format', text(git.commit_format)],
      ['CD pipeline', pairs(deploymentAdvanced.cd_pipeline)],
      ['Strategies', pairs(deploymentAdvanced.deployment_strategies)],
      ['Rollback', text(deploymentAdvanced.rollback)],
    ]),
    rules: {
      mustDo: [
        ...strings(preservation.core_principles),
        ...strings(modification.before_changing),
        ...strings(modification.while_changing),
        ...strings(modification.after_changing),
        ...strings(ai.task_requirements),
      ],
      mustNot: [
        ...strings(patternsAdvanced.anti_patterns_to_avoid),
        ...strings(preservation.api_contracts).map((r) => `Break API contract: ${r}`),
        ...strings(preservation.database_schema).map((r) => `Break database schema rule: ${r}`),
      ],
      guidance: [...strings(ai.context_awareness), ...strings(ai.code_generation)],
      definitionOfDone: [...strings(aiAdvanced.quality_gates), ...strings(aiAdvanced.validation_before_deployment)],
    },
  });
}

/** The spec of a stored document: its `spec`, or one built from the previous version's sections. */
export function technicalArchitectureSpecOf(doc: { spec?: unknown } & Json): TechnicalArchitectureSpec {
  return doc.spec !== undefined ? normalizeTechnicalArchitecture(doc.spec) : technicalArchitectureFromLegacy(doc);
}

/** How many of the editor's sections have content (for the progress indicator). */
export function filledSections(spec: TechnicalArchitectureSpec): Record<string, boolean> {
  const any = (...values: (string | unknown[])[]) => values.some((v) => (typeof v === 'string' ? v.trim() !== '' : v.length > 0));
  return {
    overview: any(spec.summary, spec.context, spec.principles, spec.constraints, spec.qualityGoals) || spec.style !== '',
    components: any(spec.components, spec.flows),
    stack: any(spec.stack),
    data: any(spec.data),
    interfaces: any(spec.interfaces, spec.apiConventions),
    concerns: CONCERNS.some((c) => spec.concerns[c.key].trim()),
    delivery: any(spec.environments, spec.pipeline, spec.deployment),
    rules: any(spec.rules.mustDo, spec.rules.mustNot, spec.rules.guidance, spec.rules.definitionOfDone),
    risks: any(spec.risks),
  };
}
