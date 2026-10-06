import { useState, type ReactNode } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  Cable,
  Check,
  Compass,
  Copy,
  Layers,
  LayoutGrid,
  Link2,
  List,
  Network,
  Plus,
  Rocket,
  ShieldCheck,
  Table2,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { newEntryId } from '@shared/specs/primitives';
import {
  ARCHITECTURE_STYLES,
  ARCHITECTURE_TEMPLATES,
  COMPONENT_KINDS,
  CONCERNS,
  INTERFACE_KINDS,
  PRIORITIES,
  STACK_CATEGORIES,
  filledSections,
  isEmptyArchitecture,
  normalizeTechnicalArchitecture,
  technicalArchitectureToAgentsMd,
  technicalArchitectureToMarkdown,
  type ApiInterface,
  type ArchComponent,
  type DataEntity,
  type Dependency,
  type Environment,
  type QualityGoal,
  type StackItem,
  type TechRisk,
  type TechnicalArchitectureSpec,
} from '@shared/specs/technicalArchitecture';
import { EntryList, LinesField, SelectField, TextAreaField, TextField } from '@/components/form/fields';
import { RowsEditor } from '@/components/form/RowsEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { InputsPanel } from '@/features/knowledge/InputsPanel';
import { markdownExport } from '@/features/specs/exports';
import { EditorRoute, SpecEditorShell } from '@/features/specs/SpecEditorShell';
import { useSpecDraft } from '@/features/specs/useSpecDraft';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { cn } from '@/lib/utils';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { KIND_ICONS, KIND_TONES } from './kindStyles';

type Spec = TechnicalArchitectureSpec;
type Change = (patch: Partial<Spec> | ((current: Spec) => Spec)) => void;

const SECTIONS: { key: keyof ReturnType<typeof filledSections> | 'related'; label: string; icon: LucideIcon; description: string }[] = [
  { key: 'overview', label: 'Overview', icon: Compass, description: 'What the system is, its style, context, principles, constraints and the qualities it must have.' },
  { key: 'components', label: 'Components', icon: Network, description: 'The parts the system is made of and how they depend on each other.' },
  { key: 'stack', label: 'Tech stack', icon: Layers, description: 'Languages, frameworks, services and tools, with versions and why they are used.' },
  { key: 'data', label: 'Data', icon: Table2, description: 'The main entities, who owns them and their key fields.' },
  { key: 'interfaces', label: 'Interfaces', icon: Cable, description: 'APIs and events between components and to the outside, and their conventions.' },
  { key: 'concerns', label: 'Quality & cross-cutting', icon: ShieldCheck, description: 'How the system handles security, performance, reliability, observability, errors, testing, and how the code is organized.' },
  { key: 'delivery', label: 'Delivery', icon: Rocket, description: 'Environments, the CI/CD pipeline and how releases and rollbacks work.' },
  { key: 'rules', label: 'Rules for changes', icon: Bot, description: 'What every change — by a person or a coding agent — must and must not do. Exported as AGENTS.md.' },
  { key: 'risks', label: 'Risks & tech debt', icon: AlertTriangle, description: 'What could go wrong and what we owe ourselves.' },
  { key: 'related', label: 'Related', icon: Link2, description: 'Decisions, product definitions, design systems and plans this architecture serves or follows.' },
];

const optionsOf = <T extends string>(o: { values: readonly T[]; labels: Record<T, string> }) => o.values.map((value) => ({ value, label: o.labels[value] }));

const NONE = '__none__';
/** Radix Select cannot hold '' (the "not set" style). */
const UNSET = '__unset__';

function ComponentSelect({ label, value, onChange, components, exclude }: { label: string; value: string; onChange: (id: string) => void; components: ArchComponent[]; exclude?: string }) {
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
      <SelectTrigger aria-label={label} className="h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>—</SelectItem>
        {components
          .filter((c) => c.id !== exclude)
          .map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name || 'Unnamed component'}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

function SectionHeading({ icon: Icon, label, description, action }: { icon: LucideIcon; label: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{label}</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

// --- sections -------------------------------------------------------------------------------

function TemplateGallery({ change }: { change: Change }) {
  return (
    <Card className="mb-8 border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Start from a template</CardTitle>
        <CardDescription>Fill the architecture with a common shape, then adapt it. Or just start writing below.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {ARCHITECTURE_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => change(normalizeTechnicalArchitecture(template.spec))}
            className="rounded-lg border bg-background p-4 text-left transition hover:border-primary hover:shadow-sm"
          >
            <p className="font-medium">{template.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function OverviewSection({ spec, change }: { spec: Spec; change: Change }) {
  return (
    <div className="grid gap-6">
      {isEmptyArchitecture(spec) && <TemplateGallery change={change} />}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <TextAreaField label="Summary" rows={4} value={spec.summary} onChange={(summary) => change({ summary })} placeholder="What the system does and how it is put together, in a few sentences" />
        <SelectField
          label="Architecture style"
          value={spec.style || UNSET}
          onChange={(style) => change({ style: style === UNSET ? '' : (style as Spec['style']) })}
          options={optionsOf(ARCHITECTURE_STYLES).map((o) => ({ value: o.value || UNSET, label: o.label }))}
        />
      </div>
      <TextAreaField label="System context" rows={4} value={spec.context} onChange={(context) => change({ context })} placeholder="Who uses the system, and which external systems it talks to" />
      <div className="grid gap-6 xl:grid-cols-2">
        <LinesField label="Principles" value={spec.principles} onChange={(principles) => change({ principles })} placeholder={'Business rules live in the backend\nEvery function checks authorization'} />
        <LinesField label="Constraints" value={spec.constraints} onChange={(constraints) => change({ constraints })} placeholder={'Must run on AWS\nGDPR: data stays in the EU'} />
      </div>
      <RowsEditor<QualityGoal>
        label="Quality goals"
        noun="quality goal"
        items={spec.qualityGoals}
        onChange={(qualityGoals) => change({ qualityGoals })}
        create={() => ({ id: newEntryId(), attribute: '', scenario: '', priority: 'medium' })}
        columns={[
          {
            key: 'priority',
            label: 'Priority',
            className: 'w-32',
            render: (q, set) => (
              <Select value={q.priority} onValueChange={(priority) => set({ priority: priority as QualityGoal['priority'] })}>
                <SelectTrigger aria-label="Priority" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {optionsOf(PRIORITIES).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ),
          },
          { key: 'attribute', label: 'Quality', placeholder: 'Performance', className: 'w-48' },
          { key: 'scenario', label: 'Scenario / measurable target', placeholder: 'Search answers in < 300 ms at p95 with 1k concurrent users' },
        ]}
      />
    </div>
  );
}

function DependenciesEditor({ component, components, onChange }: { component: ArchComponent; components: ArchComponent[]; onChange: (deps: Dependency[]) => void }) {
  const deps = component.dependsOn;
  const update = (i: number, patch: Partial<Dependency>) => onChange(deps.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold">Depends on</p>
      {deps.map((d, i) => (
        <div key={d.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
          <ComponentSelect label={`Dependency ${i + 1} of ${component.name || 'component'}`} value={d.to} onChange={(to) => update(i, { to })} components={components} exclude={component.id} />
          <Input aria-label={`Dependency ${i + 1} via`} className="h-8" placeholder="via (HTTPS, SQL, events…)" value={d.via} onChange={(e) => update(i, { via: e.target.value })} />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remove dependency ${i + 1}`} onClick={() => onChange(deps.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" className="justify-self-start" disabled={components.length < 2} onClick={() => onChange([...deps, { id: newEntryId(), to: '', via: '' }])}>
        <Plus className="mr-1.5 h-4 w-4" /> Add dependency
      </Button>
    </div>
  );
}

function ComponentsSection({ spec, change }: { spec: Spec; change: Change }) {
  const [view, setView] = useState<'diagram' | 'list'>(spec.components.length ? 'diagram' : 'list');
  const add = () => {
    change({ components: [...spec.components, { id: newEntryId(), name: '', kind: 'service', technology: '', responsibility: '', dependsOn: [], notes: '' }] });
    setView('list');
  };
  const focus = (id: string) => {
    setView('list');
    requestAnimationFrame(() => document.getElementById(`component-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && setView(v as typeof view)} aria-label="Components view">
          <ToggleGroupItem value="diagram" aria-label="Diagram view" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <LayoutGrid className="mr-1.5 h-4 w-4" /> Diagram
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <List className="mr-1.5 h-4 w-4" /> Details
          </ToggleGroupItem>
        </ToggleGroup>
        <Button onClick={add}>
          <Plus className="mr-1.5 h-4 w-4" /> Add component
        </Button>
      </div>

      {view === 'diagram' ? (
        spec.components.length ? (
          <div className="grid gap-3">
            <ArchitectureDiagram components={spec.components} onSelect={focus} />
            <div className="flex flex-wrap gap-2">
              {spec.components.map((c) => {
                const Icon = KIND_ICONS[c.kind];
                return (
                  <button key={c.id} type="button" onClick={() => focus(c.id)} className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs', KIND_TONES[c.kind])}>
                    <Icon size={12} /> {c.name || 'Unnamed'}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Add components to see the diagram.</p>
        )
      ) : (
        <EntryList<ArchComponent>
          label="Components"
          noun="component"
          hideAdd
          items={spec.components}
          onChange={(components) => change({ components })}
          create={() => ({ id: newEntryId(), name: '', kind: 'service', technology: '', responsibility: '', dependsOn: [], notes: '' })}
          title={(c) => c.name}
          anchorId={(c) => `component-${c.id}`}
          empty="No components yet: web app, API, workers, databases, queues, external systems…"
          render={(c, set) => (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label="Component name" value={c.name} onChange={(name) => set({ name })} placeholder="Orders API" />
                  <SelectField label="Kind" value={c.kind} onChange={(kind) => set({ kind })} options={optionsOf(COMPONENT_KINDS)} />
                </div>
                <TextField label="Technology" value={c.technology} onChange={(technology) => set({ technology })} placeholder="Node.js + Fastify" />
                <TextAreaField label="Responsibility" rows={3} value={c.responsibility} onChange={(responsibility) => set({ responsibility })} placeholder="What it does and owns — and what it does not" />
              </div>
              <div className="grid content-start gap-3">
                <DependenciesEditor component={c} components={spec.components} onChange={(dependsOn) => set({ dependsOn })} />
                <TextAreaField label="Notes" rows={3} value={c.notes} onChange={(notes) => set({ notes })} placeholder="Scaling, ownership, gotchas" />
              </div>
            </div>
          )}
        />
      )}

      <TextAreaField label="Key flows" rows={5} value={spec.flows} onChange={(flows) => change({ flows })} placeholder={'1. User places an order: Web app → API → Database, then API enqueues "send receipt"\n2. …'} />
    </div>
  );
}

function StackSection({ spec, change }: { spec: Spec; change: Change }) {
  const grouped = STACK_CATEGORIES.values.map((category) => ({ category, items: spec.stack.filter((s) => s.category === category && s.name.trim()) })).filter((g) => g.items.length);
  return (
    <div className="grid gap-6">
      {grouped.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {grouped.map(({ category, items }) => (
            <div key={category} className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{STACK_CATEGORIES.labels[category]}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((s) => (
                  <Badge key={s.id} variant="secondary">
                    {s.name}
                    {s.version && <span className="ml-1 text-muted-foreground">{s.version}</span>}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <RowsEditor<StackItem>
        label="Technologies"
        noun="technology"
        items={spec.stack}
        onChange={(stack) => change({ stack })}
        create={() => ({ id: newEntryId(), category: 'backend', name: '', version: '', purpose: '' })}
        columns={[
          {
            key: 'category',
            label: 'Category',
            className: 'w-44',
            render: (s, set) => (
              <Select value={s.category} onValueChange={(category) => set({ category: category as StackItem['category'] })}>
                <SelectTrigger aria-label="Category" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {optionsOf(STACK_CATEGORIES).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ),
          },
          { key: 'name', label: 'Technology', placeholder: 'PostgreSQL', className: 'w-56' },
          { key: 'version', label: 'Version', placeholder: '16', className: 'w-28' },
          { key: 'purpose', label: 'Purpose / why', placeholder: 'System of record; chosen for JSONB and row-level security' },
        ]}
      />
    </div>
  );
}

function DataSection({ spec, change }: { spec: Spec; change: Change }) {
  return (
    <EntryList<DataEntity>
      label="Entities"
      noun="entity"
      items={spec.data}
      onChange={(data) => change({ data })}
      create={() => ({ id: newEntryId(), name: '', ownerId: '', description: '', fields: [] })}
      title={(e) => e.name}
      empty="No entities yet. List the core records (User, Order, Invoice…) and who owns them."
      render={(e, set) => (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid content-start gap-3">
            <TextField label="Entity" value={e.name} onChange={(name) => set({ name })} placeholder="Order" />
            <div className="grid gap-1.5">
              <span className="text-sm font-semibold">Owned by</span>
              <ComponentSelect label={`Owner of ${e.name || 'entity'}`} value={e.ownerId} onChange={(ownerId) => set({ ownerId })} components={spec.components} />
            </div>
            <TextAreaField label="Description" rows={3} value={e.description} onChange={(description) => set({ description })} />
          </div>
          <LinesField label="Key fields" rows={7} value={e.fields} onChange={(fields) => set({ fields })} placeholder={'id: uuid\nstatus: draft | paid | shipped\ncustomerId → Customer'} />
        </div>
      )}
    />
  );
}

function InterfacesSection({ spec, change }: { spec: Spec; change: Change }) {
  return (
    <div className="grid gap-6">
      <EntryList<ApiInterface>
        label="Interfaces"
        noun="interface"
        items={spec.interfaces}
        onChange={(interfaces) => change({ interfaces })}
        create={() => ({ id: newEntryId(), name: '', kind: 'rest', providerId: '', consumerIds: [], description: '' })}
        title={(i) => i.name}
        render={(i, set) => (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid content-start gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Interface" value={i.name} onChange={(name) => set({ name })} placeholder="Orders API" />
                <SelectField label="Kind" value={i.kind} onChange={(kind) => set({ kind })} options={optionsOf(INTERFACE_KINDS)} />
              </div>
              <div className="grid gap-1.5">
                <span className="text-sm font-semibold">Provided by</span>
                <ComponentSelect label={`Provider of ${i.name || 'interface'}`} value={i.providerId} onChange={(providerId) => set({ providerId })} components={spec.components} />
              </div>
              <TextAreaField label="Description" rows={3} value={i.description} onChange={(description) => set({ description })} placeholder="Operations or events, auth, versioning" />
            </div>
            {spec.components.length > 0 && (
              <fieldset className="grid content-start gap-2">
                <legend className="mb-1 text-sm font-semibold">Used by</legend>
                {spec.components
                  .filter((c) => c.id !== i.providerId)
                  .map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={i.consumerIds.includes(c.id)}
                        onCheckedChange={(on) => set({ consumerIds: on === true ? [...i.consumerIds, c.id] : i.consumerIds.filter((x) => x !== c.id) })}
                      />
                      {c.name || 'Unnamed component'}
                    </label>
                  ))}
              </fieldset>
            )}
          </div>
        )}
      />
      <TextAreaField
        label="API conventions"
        rows={6}
        value={spec.apiConventions}
        onChange={(apiConventions) => change({ apiConventions })}
        placeholder="URL and naming style, versioning, pagination, error format, idempotency keys…"
      />
    </div>
  );
}

function ConcernsSection({ spec, change }: { spec: Spec; change: Change }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {CONCERNS.map((c) => (
        <TextAreaField
          key={c.key}
          label={c.label}
          rows={6}
          value={spec.concerns[c.key]}
          onChange={(value) => change((s) => ({ ...s, concerns: { ...s.concerns, [c.key]: value } }))}
          placeholder={c.hint}
        />
      ))}
    </div>
  );
}

function DeliverySection({ spec, change }: { spec: Spec; change: Change }) {
  return (
    <div className="grid gap-6">
      <RowsEditor<Environment>
        label="Environments"
        noun="environment"
        items={spec.environments}
        onChange={(environments) => change({ environments })}
        create={() => ({ id: newEntryId(), name: '', purpose: '', url: '' })}
        columns={[
          { key: 'name', label: 'Environment', placeholder: 'production', className: 'w-48' },
          { key: 'purpose', label: 'Purpose' },
          { key: 'url', label: 'URL', className: 'w-72' },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <LinesField label="CI/CD pipeline" rows={7} value={spec.pipeline} onChange={(pipeline) => change({ pipeline })} hint="One step per line, in order" placeholder={'Install\nTypecheck and lint\nTest\nBuild\nDeploy to staging\nDeploy to production (manual approval)'} />
        <TextAreaField label="Deployment & rollback" rows={7} value={spec.deployment} onChange={(deployment) => change({ deployment })} placeholder="Branching, release cadence, migrations, feature flags, how to roll back" />
      </div>
    </div>
  );
}

function RulesSection({ title, spec, change }: { title: string; spec: Spec; change: Change }) {
  const rules = spec.rules;
  const set = (patch: Partial<Spec['rules']>) => change((s) => ({ ...s, rules: { ...s.rules, ...patch } }));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(technicalArchitectureToAgentsMd(title, spec));
      toast.success('AGENTS.md copied');
    } catch {
      toast.error('Could not copy; use Export → AGENTS.md');
    }
  };
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border-l-4 border-emerald-500 pl-4">
          <LinesField label="Always" rows={6} value={rules.mustDo} onChange={(mustDo) => set({ mustDo })} placeholder={'Check workspace ownership in every function\nAdd tests for every new function'} />
        </div>
        <div className="rounded-lg border-l-4 border-red-500 pl-4">
          <LinesField label="Never" rows={6} value={rules.mustNot} onChange={(mustNot) => set({ mustNot })} placeholder={'Access the database from the browser\nCommit secrets'} />
        </div>
        <LinesField label="Guidance" rows={6} value={rules.guidance} onChange={(guidance) => set({ guidance })} placeholder={'Read the surrounding code before writing\nPrefer small, focused modules'} />
        <LinesField label="Definition of done" rows={6} value={rules.definitionOfDone} onChange={(definitionOfDone) => set({ definitionOfDone })} placeholder={'Typecheck, lint and tests pass\nDocs updated'} />
      </div>
      <Card className="bg-muted/30">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <p className="max-w-2xl text-sm text-muted-foreground">
            These rules, with the summary, components, stack, conventions, security and testing, make up the AGENTS.md export — drop it in the repository for Claude Code, Cursor and other agents.
          </p>
          <Button variant="outline" onClick={copy}>
            <Copy className="mr-1.5 h-4 w-4" /> Copy AGENTS.md
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RisksSection({ spec, change }: { spec: Spec; change: Change }) {
  return (
    <EntryList<TechRisk>
      label="Risks and debt"
      noun="item"
      items={spec.risks}
      onChange={(risks) => change({ risks })}
      create={() => ({ id: newEntryId(), title: '', kind: 'risk', severity: 'medium', description: '', mitigation: '' })}
      title={(r) => r.title}
      render={(r, set) => (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid content-start gap-3">
            <TextField label="Title" value={r.title} onChange={(t) => set({ title: t })} />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Type" value={r.kind} onChange={(kind) => set({ kind })} options={[{ value: 'risk', label: 'Risk' }, { value: 'debt', label: 'Tech debt' }]} />
              <SelectField label="Severity" value={r.severity} onChange={(severity) => set({ severity })} options={optionsOf(PRIORITIES)} />
            </div>
          </div>
          <div className="grid gap-3">
            <TextAreaField label="Description" rows={2} value={r.description} onChange={(description) => set({ description })} />
            <TextAreaField label="Mitigation / plan" rows={2} value={r.mitigation} onChange={(mitigation) => set({ mitigation })} />
          </div>
        </div>
      )}
    />
  );
}

// --- editor ----------------------------------------------------------------------------------

function TechnicalArchitectureEditor({ id, title, initial }: { id: Id<'technicalArchitectures'>; title: string; initial: Spec }) {
  const update = useMutation(api.technicalArchitectures.update);
  const rename = useMutation(api.technicalArchitectures.rename);
  const { spec, change, status } = useSpecDraft(initial, (next) => update({ id, spec: next }));
  const [active, setActive] = useState<(typeof SECTIONS)[number]['key']>('overview');
  const filled = filledSections(spec);
  const done = Object.values(filled).filter(Boolean).length;
  const current = SECTIONS.find((s) => s.key === active)!;

  return (
    <SpecEditorShell
      app="technicalArchitectures"
      id={id}
      title={title}
      onRename={(next) => rename({ id, title: next })}
      status={status}
      meta={
        <span>
          · {spec.style ? ARCHITECTURE_STYLES.labels[spec.style] : 'Style not set'} · {done}/{Object.keys(filled).length} sections
        </span>
      }
      exports={[
        markdownExport('architecture.md', () => technicalArchitectureToMarkdown(title, spec)),
        { label: 'AGENTS.md (for coding agents)', suffix: 'AGENTS.md', type: 'text/markdown', content: () => technicalArchitectureToAgentsMd(title, spec) },
      ]}
    >
      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Sections" className="lg:sticky lg:top-28 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isFilled = s.key !== 'related' && filled[s.key];
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    aria-current={active === s.key ? 'page' : undefined}
                    onClick={() => setActive(s.key)}
                    className={cn(
                      'flex w-full items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition',
                      active === s.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1">{s.label}</span>
                    {isFilled && <Check size={14} aria-label="has content" className={active === s.key ? '' : 'text-emerald-600'} />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 hidden px-3 lg:block">
            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / Object.keys(filled).length) * 100}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {done} of {Object.keys(filled).length} sections filled
            </p>
          </div>
        </nav>

        <section aria-label={current.label} className="min-w-0">
          <SectionHeading icon={current.icon} label={current.label} description={current.description} />
          {active === 'overview' && <OverviewSection spec={spec} change={change} />}
          {active === 'components' && <ComponentsSection spec={spec} change={change} />}
          {active === 'stack' && <StackSection spec={spec} change={change} />}
          {active === 'data' && <DataSection spec={spec} change={change} />}
          {active === 'interfaces' && <InterfacesSection spec={spec} change={change} />}
          {active === 'concerns' && <ConcernsSection spec={spec} change={change} />}
          {active === 'delivery' && <DeliverySection spec={spec} change={change} />}
          {active === 'rules' && <RulesSection title={title} spec={spec} change={change} />}
          {active === 'risks' && <RisksSection spec={spec} change={change} />}
          {active === 'related' && <InputsPanel app="technicalArchitectures" id={id} kind="references" title="Related items" description="Link decisions (why it is like this), product definitions (what it serves), design systems and plans." />}
        </section>
      </div>
    </SpecEditorShell>
  );
}

export default function TechnicalArchitectureEditorPage() {
  const { id } = useParams<{ id: string }>();
  const wp = useWorkspacePath();
  const doc = useQuery(api.technicalArchitectures.get, { id: id! });
  return (
    <EditorRoute doc={doc} what="Technical architecture" backTo={wp('/technical-architectures')}>
      {(d) => <TechnicalArchitectureEditor key={d._id} id={d._id} title={d.title} initial={d.spec} />}
    </EditorRoute>
  );
}
