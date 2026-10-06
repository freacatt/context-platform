import { describe, expect, it } from 'vitest';
import { createDefaultTechnicalArchitecture as createLegacyDefaults } from '../technicalArchitecture';
import {
  ARCHITECTURE_TEMPLATES,
  componentLevels,
  componentsMermaid,
  createDefaultTechnicalArchitecture,
  filledSections,
  isEmptyArchitecture,
  normalizeTechnicalArchitecture,
  technicalArchitectureFromLegacy,
  technicalArchitectureSpecOf,
  technicalArchitectureToAgentsMd,
  technicalArchitectureToMarkdown,
} from './technicalArchitecture';

const webApp = normalizeTechnicalArchitecture(ARCHITECTURE_TEMPLATES.find((t) => t.id === 'web-app')!.spec);

describe('technical architecture model', () => {
  it('normalizes junk to an empty architecture with every concern', () => {
    const spec = normalizeTechnicalArchitecture({ style: 'blockchain', components: [{ kind: 'spaceship' }], concerns: { security: 'TLS', bogus: 'x' } });
    expect(spec.style).toBe('');
    expect(spec.components[0]).toMatchObject({ id: 'component-1', kind: 'service', dependsOn: [] });
    expect(Object.keys(spec.concerns)).toEqual(['security', 'performance', 'reliability', 'observability', 'errorHandling', 'testing', 'codeOrganization', 'conventions']);
    expect(spec.concerns.security).toBe('TLS');
    expect(isEmptyArchitecture(createDefaultTechnicalArchitecture())).toBe(true);
    expect(isEmptyArchitecture(spec)).toBe(false);
  });

  it('every template normalizes to itself and points dependencies at its own components', () => {
    for (const template of ARCHITECTURE_TEMPLATES) {
      const spec = normalizeTechnicalArchitecture(template.spec);
      expect(normalizeTechnicalArchitecture(spec)).toEqual(spec);
      const ids = new Set(spec.components.map((c) => c.id));
      for (const c of spec.components) for (const d of c.dependsOn) expect(ids.has(d.to), `${template.id}: ${c.id} → ${d.to}`).toBe(true);
    }
  });

  it('places callers left of their dependencies and survives cycles', () => {
    const levels = componentLevels(webApp.components);
    expect(levels.get('web')).toBe(0);
    expect(levels.get('api')).toBe(1);
    expect(levels.get('worker')).toBe(0);
    expect(levels.get('db')).toBe(2);
    const cyclic = componentLevels([
      { id: 'a', dependsOn: [{ id: '1', to: 'b', via: '' }] },
      { id: 'b', dependsOn: [{ id: '2', to: 'a', via: '' }] },
    ]);
    expect([...cyclic.keys()].sort()).toEqual(['a', 'b']);
  });

  it('draws a Mermaid flowchart with shapes and labelled edges', () => {
    const mermaid = componentsMermaid(webApp);
    expect(mermaid.startsWith('flowchart LR')).toBe(true);
    expect(mermaid).toContain('c_db[("Database<br/><i>PostgreSQL</i>")]');
    expect(mermaid).toContain('c_web -->|HTTPS / JSON| c_api');
    expect(mermaid).toContain('c_auth[/"Identity provider<br/><i>OIDC</i>"/]');
  });

  it('exports arc42-style Markdown and an AGENTS.md', () => {
    const md = technicalArchitectureToMarkdown('Shop', webApp);
    expect(md).toContain('**Architecture style:** Modular monolith');
    expect(md).toContain('```mermaid\nflowchart LR');
    expect(md).toContain('### API\n\n_API · Node.js_\n\nBusiness logic, validation, authorization\n\nDepends on:\n- Database (SQL)');
    expect(md).toContain('| Public REST API | REST | API | Web app | JSON over HTTPS, versioned under /v1 |');
    expect(md).toContain('### Always\n\n- Validate all input at the API boundary');
    expect(md).not.toContain('## Delivery');

    const agents = technicalArchitectureToAgentsMd('Shop', webApp);
    expect(agents).toContain('# Shop — instructions for coding agents');
    expect(agents).toContain('- **API** (API, Node.js): Business logic, validation, authorization');
    expect(agents).toContain('## Never\n\n- Query the database from the web app');
    expect(agents).not.toContain('mermaid');
  });

  it('reports which sections have content', () => {
    expect(Object.values(filledSections(createDefaultTechnicalArchitecture())).every((v) => !v)).toBe(true);
    expect(filledSections(webApp)).toMatchObject({ overview: true, components: true, stack: true, interfaces: true, rules: true, data: false, delivery: false });
  });
});

describe('previous-version architectures', () => {
  it('convert without losing what was filled in', () => {
    const legacy = createLegacyDefaults(new Date('2026-01-02T00:00:00Z')) as unknown as Record<string, Record<string, Record<string, unknown>>>;
    legacy.metadata = { description: 'Our backend' } as never;
    legacy.system_architecture.main = { architecture_type: 'MVC', layers: ['UI', 'API'], core_principles: ['Keep it simple'], data_flow: 'UI calls API' };
    legacy.system_architecture.advanced = { layer_details: { UI: { technologies: ['React'], depends_on: 'API' } } };
    legacy.technology_stack.main = { frontend: { framework: 'React', language: '' }, backend: { database: 'Postgres' }, testing: { unit: 'Vitest' } };
    legacy.api_standards.main = { url_format: '/api/v1/resource', http_methods: { GET: 'read' } };
    legacy.security_standards.main = { authentication: { method: 'JWT' } };
    legacy.deployment_cicd.main = { environments: { prod: 'Live' }, ci_pipeline: ['lint', 'test'], git_workflow: { branching: 'trunk' } };
    legacy.preservation_rules.main = { core_principles: ['Never break the API'] };
    legacy.design_patterns.advanced = { anti_patterns_to_avoid: ['God objects'] };
    legacy.ai_development_instructions.advanced = { quality_gates: ['Tests pass'] };

    const spec = technicalArchitectureFromLegacy(legacy);
    expect(spec.summary).toBe('Our backend');
    expect(spec.principles).toEqual(['Keep it simple']);
    expect(spec.components).toMatchObject([
      { id: 'layer-ui', name: 'UI', technology: 'React', dependsOn: [{ to: 'layer-api' }] },
      { id: 'layer-api', name: 'API' },
    ]);
    expect(spec.flows).toBe('UI calls API');
    expect(spec.stack.map((s) => `${s.category}:${s.name}:${s.purpose}`)).toEqual(['frontend:React:framework', 'data:Postgres:database', 'testing:Vitest:unit']);
    expect(spec.apiConventions).toContain('**URL format:** /api/v1/resource');
    expect(spec.apiConventions).toContain('**HTTP methods**\n- GET: read');
    expect(spec.concerns.security).toContain('- method: JWT');
    expect(spec.environments).toMatchObject([{ name: 'prod', purpose: 'Live' }]);
    expect(spec.pipeline).toEqual(['lint', 'test']);
    expect(spec.deployment).toContain('**Branching:** trunk');
    expect(spec.rules.mustDo).toContain('Never break the API');
    expect(spec.rules.mustNot).toEqual(['God objects']);
    expect(spec.rules.definitionOfDone).toEqual(['Tests pass']);
  });

  it('picks the spec when a document has one', () => {
    expect(technicalArchitectureSpecOf({ spec: { summary: 'New' }, metadata: { description: 'Old' } }).summary).toBe('New');
    expect(technicalArchitectureSpecOf({ metadata: { description: 'Old' } }).summary).toBe('Old');
    expect(technicalArchitectureSpecOf({}).components).toEqual([]);
  });
});
