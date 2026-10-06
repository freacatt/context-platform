import { useMutation, useQuery } from 'convex/react';
import { useParams } from 'react-router-dom';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { newEntryId } from '@shared/specs/primitives';
import {
  ASSUMPTION_STATUSES,
  CONFIDENCES,
  FEATURE_PRIORITIES,
  FEATURE_PRIORITY_LABELS,
  FEATURE_STATUSES,
  FEATURE_STATUS_LABELS,
  REQUIREMENT_KINDS,
  productSpecToMarkdown,
  type Assumption,
  type Feature,
  type Job,
  type Metric,
  type Persona,
  type ProductRisk,
  type ProductSpec,
  type Requirement,
} from '@shared/specs/productSpec';
import { EntryList, LinesField, SelectField, TextAreaField, TextField } from '@/components/form/fields';
import { optionsOf } from '@/components/form/options';
import { RowsEditor } from '@/components/form/RowsEditor';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { markdownExport } from '@/features/specs/exports';
import { EditorRoute, SpecEditorShell } from '@/features/specs/SpecEditorShell';
import { useSpecDraft } from '@/features/specs/useSpecDraft';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { plural } from '@/lib/plural';

type Change = (patch: Partial<ProductSpec>) => void;

function UsersTab({ spec, change }: { spec: ProductSpec; change: Change }) {
  const NOBODY = '__none__';
  return (
    <div className="grid gap-8">
      <EntryList<Persona>
        label="Personas"
        noun="persona"
        items={spec.personas}
        onChange={(personas) => change({ personas })}
        create={() => ({ id: newEntryId(), name: '', description: '', goals: [], pains: [] })}
        title={(p) => p.name}
        render={(p, set) => (
          <div className="grid gap-3">
            <TextField label="Persona name" value={p.name} onChange={(name) => set({ name })} placeholder="Busy team lead" />
            <TextAreaField label="Who they are" rows={2} value={p.description} onChange={(description) => set({ description })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <LinesField label="Goals" rows={3} value={p.goals} onChange={(goals) => set({ goals })} />
              <LinesField label="Pains" rows={3} value={p.pains} onChange={(pains) => set({ pains })} />
            </div>
          </div>
        )}
      />
      <EntryList<Job>
        label="Jobs to be done"
        noun="job"
        items={spec.jobs}
        onChange={(jobs) => change({ jobs })}
        create={() => ({ id: newEntryId(), personaId: spec.personas[0]?.id ?? '', situation: '', motivation: '', outcome: '' })}
        title={(j) => (j.motivation ? `I want to ${j.motivation}` : '')}
        empty="When ___, I want to ___, so I can ___."
        render={(j, set) => (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="font-semibold">Persona</Label>
              <Select value={j.personaId || NOBODY} onValueChange={(v) => set({ personaId: v === NOBODY ? '' : v })}>
                <SelectTrigger aria-label="Persona">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOBODY}>Anyone</SelectItem>
                  {spec.personas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name || 'Unnamed persona'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TextField label="When…" value={j.situation} onChange={(situation) => set({ situation })} placeholder="I start a new project" />
            <TextField label="I want to…" value={j.motivation} onChange={(motivation) => set({ motivation })} placeholder="gather what we already know" />
            <TextField label="So I can…" value={j.outcome} onChange={(outcome) => set({ outcome })} placeholder="decide faster" />
          </div>
        )}
      />
    </div>
  );
}

function FeaturesTab({ spec, change }: { spec: ProductSpec; change: Change }) {
  return (
    <EntryList<Feature>
      label="Features"
      noun="feature"
      items={spec.features}
      onChange={(features) => change({ features })}
      create={() => ({ id: newEntryId(), name: '', description: '', priority: 'should', status: 'idea', personaIds: [], acceptanceCriteria: [] })}
      title={(f) => f.name}
      render={(f, set) => (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{FEATURE_PRIORITY_LABELS[f.priority]}</Badge>
            <Badge variant="secondary">{FEATURE_STATUS_LABELS[f.status]}</Badge>
          </div>
          <TextField label="Feature name" value={f.name} onChange={(name) => set({ name })} />
          <TextAreaField label="Description" rows={3} value={f.description} onChange={(description) => set({ description })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Priority" value={f.priority} onChange={(priority) => set({ priority })} options={optionsOf(FEATURE_PRIORITIES, FEATURE_PRIORITY_LABELS)} />
            <SelectField label="Status" value={f.status} onChange={(status) => set({ status })} options={optionsOf(FEATURE_STATUSES, FEATURE_STATUS_LABELS)} />
          </div>
          {spec.personas.length > 0 && (
            <fieldset className="grid gap-1.5">
              <legend className="mb-1 text-sm font-semibold">For</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {spec.personas.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={f.personaIds.includes(p.id)}
                      onCheckedChange={(on) => set({ personaIds: on === true ? [...f.personaIds, p.id] : f.personaIds.filter((x) => x !== p.id) })}
                    />
                    {p.name || 'Unnamed persona'}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <LinesField label="Acceptance criteria" rows={3} value={f.acceptanceCriteria} onChange={(acceptanceCriteria) => set({ acceptanceCriteria })} />
        </div>
      )}
    />
  );
}

function ProductDefinitionEditor({ id, title, initial }: { id: Id<'productDefinitions'>; title: string; initial: ProductSpec }) {
  const update = useMutation(api.productDefinitions.update);
  const rename = useMutation(api.productDefinitions.rename);
  const { spec, change, status } = useSpecDraft(initial, (next) => update({ id, spec: next }));
  const problem = (key: keyof ProductSpec['problem']) => (value: string) => change({ problem: { ...spec.problem, [key]: value } });

  return (
    <SpecEditorShell
      app="productDefinitions"
      id={id}
      title={title}
      onRename={(next) => rename({ id, title: next })}
      status={status}
      meta={<span>· {plural(spec.personas.length, 'persona')} · {plural(spec.features.length, 'feature')}</span>}
      exports={[markdownExport('product_definition.md', () => productSpecToMarkdown(title, spec))]}
    >
      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="overview">Vision & problem</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="scope">Requirements</TabsTrigger>
          <TabsTrigger value="success">Success</TabsTrigger>
          <TabsTrigger value="risks">Assumptions & risks</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-5">
          <TextAreaField label="Vision" rows={3} value={spec.vision} onChange={(vision) => change({ vision })} placeholder="What is this product, for whom, and why does it matter?" />
          <div className="grid gap-5 xl:grid-cols-3">
            <TextAreaField label="Problem" rows={6} value={spec.problem.statement} onChange={problem('statement')} placeholder="What pain or friction do people have today?" />
            <TextAreaField label="Context" rows={6} value={spec.problem.context} onChange={problem('context')} placeholder="Why now? What changed?" />
            <TextAreaField label="Current alternatives" rows={6} value={spec.problem.alternatives} onChange={problem('alternatives')} placeholder="How do people solve it today?" />
          </div>
        </TabsContent>

        <TabsContent value="users">
          <UsersTab spec={spec} change={change} />
        </TabsContent>

        <TabsContent value="features">
          <FeaturesTab spec={spec} change={change} />
        </TabsContent>

        <TabsContent value="scope" className="grid gap-8">
          <RowsEditor<Requirement>
            label="Requirements"
            noun="requirement"
            items={spec.requirements}
            onChange={(requirements) => change({ requirements })}
            create={() => ({ id: newEntryId(), text: '', kind: 'functional' })}
            columns={[
              { key: 'text', label: 'Requirement' },
              {
                key: 'kind',
                label: 'Kind',
                className: 'w-44',
                render: (r, set) => (
                  <Select value={r.kind} onValueChange={(kind) => set({ kind: kind as Requirement['kind'] })}>
                    <SelectTrigger aria-label="Requirement kind" className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUIREMENT_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k === 'functional' ? 'Functional' : 'Non-functional'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ),
              },
            ]}
          />
          <LinesField label="Non-goals" value={spec.nonGoals} onChange={(nonGoals) => change({ nonGoals })} hint="What this product deliberately does not do. One per line." />
        </TabsContent>

        <TabsContent value="success">
          <RowsEditor<Metric>
            label="Success metrics"
            noun="metric"
            items={spec.metrics}
            onChange={(metrics) => change({ metrics })}
            create={() => ({ id: newEntryId(), name: '', description: '', target: '', current: '' })}
            columns={[
              { key: 'name', label: 'Metric', placeholder: 'Weekly active teams' },
              { key: 'target', label: 'Target', className: 'w-28' },
              { key: 'current', label: 'Current', className: 'w-28' },
              { key: 'description', label: 'How it is measured' },
            ]}
          />
        </TabsContent>

        <TabsContent value="risks" className="grid gap-8">
          <EntryList<Assumption>
            label="Assumptions"
            noun="assumption"
            items={spec.assumptions}
            onChange={(assumptions) => change({ assumptions })}
            create={() => ({ id: newEntryId(), statement: '', confidence: 'medium', status: 'untested', evidence: '' })}
            title={(a) => a.statement}
            empty="What must be true for this product to succeed? Write it down, then test it."
            render={(a, set) => (
              <div className="grid gap-3">
                <TextAreaField label="We believe…" rows={2} value={a.statement} onChange={(statement) => set({ statement })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField label="Confidence" value={a.confidence} onChange={(confidence) => set({ confidence })} options={optionsOf(CONFIDENCES)} />
                  <SelectField label="Status" value={a.status} onChange={(s) => set({ status: s })} options={optionsOf(ASSUMPTION_STATUSES)} />
                </div>
                <TextAreaField label="Evidence" rows={2} value={a.evidence} onChange={(evidence) => set({ evidence })} placeholder="Research, data, experiments (link Research & Insights)" />
              </div>
            )}
          />
          <RowsEditor<ProductRisk>
            label="Risks"
            noun="risk"
            items={spec.risks}
            onChange={(risks) => change({ risks })}
            create={() => ({ id: newEntryId(), risk: '', mitigation: '' })}
            columns={[
              { key: 'risk', label: 'Risk' },
              { key: 'mitigation', label: 'Mitigation' },
            ]}
          />
        </TabsContent>

        <TabsContent value="notes">
          <TextAreaField label="Notes" rows={16} value={spec.notes} onChange={(notes) => change({ notes })} hint="Markdown. Content of the previous mind-map version of this definition is kept here." />
        </TabsContent>
      </Tabs>
    </SpecEditorShell>
  );
}

export default function ProductDefinitionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const wp = useWorkspacePath();
  const doc = useQuery(api.productDefinitions.get, { id: id! });
  return (
    <EditorRoute doc={doc} what="Product definition" backTo={wp('/product-definitions')}>
      {(d) => <ProductDefinitionEditor key={d._id} id={d._id} title={d.title} initial={d.spec} />}
    </EditorRoute>
  );
}
