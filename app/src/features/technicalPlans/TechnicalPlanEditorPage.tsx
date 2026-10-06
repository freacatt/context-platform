import { useMutation, useQuery } from 'convex/react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { newEntryId } from '@shared/specs/primitives';
import {
  LEVELS,
  PLAN_STATUSES,
  PLAN_STATUS_LABELS,
  planProgress,
  technicalPlanToMarkdown,
  type OpenQuestion,
  type PlanDecision,
  type PlanPhase,
  type PlanRisk,
  type PlanStep,
  type TechnicalPlanSpec,
} from '@shared/specs/technicalPlan';
import { EntryList, LinesField, SelectField, TextAreaField, TextField } from '@/components/form/fields';
import { optionsOf } from '@/components/form/options';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputsPanel } from '@/features/knowledge/InputsPanel';
import { markdownExport } from '@/features/specs/exports';
import { EditorRoute, SpecEditorShell } from '@/features/specs/SpecEditorShell';
import { useSpecDraft } from '@/features/specs/useSpecDraft';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';

function StepsEditor({ phase, steps, onChange }: { phase: string; steps: PlanStep[]; onChange: (steps: PlanStep[]) => void }) {
  const update = (i: number, patch: Partial<PlanStep>) => onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="space-y-2" aria-label={`Steps of ${phase}`}>
      <p className="text-sm font-semibold">Steps</p>
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <Checkbox aria-label={`Step ${i + 1} done`} checked={step.done} onCheckedChange={(on) => update(i, { done: on === true })} />
          <Input
            aria-label={`Step ${i + 1}`}
            className={`h-8 ${step.done ? 'text-muted-foreground line-through' : ''}`}
            value={step.text}
            onChange={(e) => update(i, { text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onChange([...steps.slice(0, i + 1), { id: newEntryId(), text: '', done: false }, ...steps.slice(i + 1)]);
            }}
            placeholder="What to do"
          />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remove step ${i + 1}`} onClick={() => onChange(steps.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...steps, { id: newEntryId(), text: '', done: false }])}>
        <Plus className="mr-1.5 h-4 w-4" /> Add step
      </Button>
    </div>
  );
}

function TechnicalPlanEditor({ id, title, initial }: { id: Id<'technicalPlans'>; title: string; initial: TechnicalPlanSpec }) {
  const update = useMutation(api.technicalPlans.update);
  const rename = useMutation(api.technicalPlans.rename);
  const { spec, change, status } = useSpecDraft(initial, (next) => update({ id, spec: next }));
  const { done, total } = planProgress(spec);

  return (
    <SpecEditorShell
      app="technicalPlans"
      id={id}
      title={title}
      onRename={(next) => rename({ id, title: next })}
      status={status}
      meta={total > 0 ? <span>· {done}/{total} steps done</span> : undefined}
      actions={
        <Select value={spec.status} onValueChange={(v) => change({ status: v as TechnicalPlanSpec['status'] })}>
          <SelectTrigger aria-label="Status" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAN_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {PLAN_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      exports={[markdownExport('plan.md', () => technicalPlanToMarkdown(title, spec))]}
    >
      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="plan">Approach & phases</TabsTrigger>
          <TabsTrigger value="decisions">Decisions & risks</TabsTrigger>
          <TabsTrigger value="done">Definition of done</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-5">
          <TextAreaField label="Goal" rows={3} value={spec.goal} onChange={(goal) => change({ goal })} placeholder="What will be true when this plan is done?" />
          <TextAreaField label="Context" value={spec.context} onChange={(context) => change({ context })} placeholder="Why now, what exists today, constraints" />
          <div className="grid gap-5 sm:grid-cols-2">
            <LinesField label="In scope" value={spec.scope} onChange={(scope) => change({ scope })} />
            <LinesField label="Out of scope" value={spec.nonScope} onChange={(nonScope) => change({ nonScope })} />
          </div>
        </TabsContent>

        <TabsContent value="inputs">
          <InputsPanel app="technicalPlans" id={id} description="What this plan builds on. Linked items travel with exports and can be used as AI context." />
        </TabsContent>

        <TabsContent value="plan" className="grid gap-6">
          <TextAreaField label="Approach" rows={6} value={spec.approach} onChange={(approach) => change({ approach })} placeholder="The technical approach in a few paragraphs: components, data, flows" />
          <EntryList<PlanPhase>
            label="Phases"
            noun="phase"
            items={spec.phases}
            onChange={(phases) => change({ phases })}
            create={() => ({ id: newEntryId(), title: '', description: '', steps: [] })}
            title={(p, i) => `Phase ${i + 1}${p.title ? `: ${p.title}` : ''}`}
            render={(p, set) => (
              <div className="grid gap-3">
                <TextField label="Phase title" value={p.title} onChange={(t) => set({ title: t })} />
                <TextAreaField label="Description" rows={2} value={p.description} onChange={(description) => set({ description })} />
                <StepsEditor phase={p.title || 'phase'} steps={p.steps} onChange={(steps) => set({ steps })} />
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="decisions" className="grid gap-8">
          <EntryList<PlanDecision>
            label="Decisions"
            noun="decision"
            items={spec.decisions}
            onChange={(decisions) => change({ decisions })}
            create={() => ({ id: newEntryId(), title: '', decision: '', rationale: '', alternatives: '' })}
            title={(d) => d.title}
            empty="No decisions yet. Bigger ones deserve their own record in Decisions — link it as an input."
            render={(d, set) => (
              <div className="grid gap-3">
                <TextField label="Decision title" value={d.title} onChange={(t) => set({ title: t })} />
                <TextAreaField label="Decision" rows={2} value={d.decision} onChange={(decision) => set({ decision })} />
                <TextAreaField label="Rationale" rows={2} value={d.rationale} onChange={(rationale) => set({ rationale })} />
                <TextAreaField label="Alternatives considered" rows={2} value={d.alternatives} onChange={(alternatives) => set({ alternatives })} />
              </div>
            )}
          />
          <EntryList<PlanRisk>
            label="Risks"
            noun="risk"
            items={spec.risks}
            onChange={(risks) => change({ risks })}
            create={() => ({ id: newEntryId(), risk: '', likelihood: 'medium', impact: 'medium', mitigation: '' })}
            title={(r) => r.risk}
            render={(r, set) => (
              <div className="grid gap-3">
                <TextAreaField label="Risk" rows={2} value={r.risk} onChange={(risk) => set({ risk })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField label="Likelihood" value={r.likelihood} onChange={(likelihood) => set({ likelihood })} options={optionsOf(LEVELS)} />
                  <SelectField label="Impact" value={r.impact} onChange={(impact) => set({ impact })} options={optionsOf(LEVELS)} />
                </div>
                <TextAreaField label="Mitigation" rows={2} value={r.mitigation} onChange={(mitigation) => set({ mitigation })} />
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="done" className="grid gap-6">
          <LinesField label="Acceptance criteria" value={spec.acceptanceCriteria} onChange={(acceptanceCriteria) => change({ acceptanceCriteria })} />
          <TextAreaField label="Test strategy" value={spec.testStrategy} onChange={(testStrategy) => change({ testStrategy })} placeholder="Unit, integration, end-to-end, manual checks" />
          <TextAreaField label="Rollout" value={spec.rollout} onChange={(rollout) => change({ rollout })} placeholder="Flags, migration, monitoring, rollback" />
          <EntryList<OpenQuestion>
            label="Open questions"
            noun="question"
            items={spec.openQuestions}
            onChange={(openQuestions) => change({ openQuestions })}
            create={() => ({ id: newEntryId(), question: '', answer: '' })}
            title={(q) => q.question}
            render={(q, set) => (
              <div className="grid gap-3">
                <TextField label="Question" value={q.question} onChange={(question) => set({ question })} />
                <TextAreaField label="Answer" rows={2} value={q.answer} onChange={(answer) => set({ answer })} />
              </div>
            )}
          />
        </TabsContent>
      </Tabs>
    </SpecEditorShell>
  );
}

export default function TechnicalPlanEditorPage() {
  const { id } = useParams<{ id: string }>();
  const wp = useWorkspacePath();
  const doc = useQuery(api.technicalPlans.get, { id: id! });
  return (
    <EditorRoute doc={doc} what="Technical plan" backTo={wp('/technical-plans')}>
      {(d) => <TechnicalPlanEditor key={d._id} id={d._id} title={d.title} initial={d.spec} />}
    </EditorRoute>
  );
}
