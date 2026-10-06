import { useMutation, useQuery } from 'convex/react';
import { useParams } from 'react-router-dom';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { DECISION_STATUSES, DECISION_STATUS_LABELS, decisionToMarkdown, type DecisionOption, type DecisionSpec } from '@shared/specs/decision';
import { newEntryId } from '@shared/specs/primitives';
import { EntryList, LinesField, SelectField, TextAreaField, TextField } from '@/components/form/fields';
import { optionsOf } from '@/components/form/options';
import { InputsPanel } from '@/features/knowledge/InputsPanel';
import { markdownExport } from '@/features/specs/exports';
import { EditorRoute, SpecEditorShell } from '@/features/specs/SpecEditorShell';
import { useSpecDraft } from '@/features/specs/useSpecDraft';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';

function DecisionEditor({ id, title, initial }: { id: Id<'decisions'>; title: string; initial: DecisionSpec }) {
  const update = useMutation(api.decisions.update);
  const rename = useMutation(api.decisions.rename);
  const { spec, change, status } = useSpecDraft(initial, (next) => update({ id, spec: next }));

  return (
    <SpecEditorShell
      app="decisions"
      id={id}
      title={title}
      onRename={(next) => rename({ id, title: next })}
      status={status}
      exports={[markdownExport('decision.md', () => decisionToMarkdown(title, spec))]}
    >
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Status" value={spec.status} onChange={(s) => change({ status: s })} options={optionsOf(DECISION_STATUSES, DECISION_STATUS_LABELS)} />
          <TextField label="Date" type="date" value={spec.date} onChange={(date) => change({ date })} />
        </div>
        <TextAreaField label="Context" rows={5} value={spec.context} onChange={(context) => change({ context })} placeholder="The situation and forces at play. What question does this decision answer?" />
        <EntryList<DecisionOption>
          label="Options considered"
          noun="option"
          items={spec.options}
          onChange={(options) => change({ options })}
          create={() => ({ id: newEntryId(), title: '', description: '', pros: [], cons: [] })}
          title={(o, i) => `Option ${i + 1}${o.title ? `: ${o.title}` : ''}`}
          render={(o, set) => (
            <div className="grid gap-3">
              <TextField label="Option" value={o.title} onChange={(t) => set({ title: t })} />
              <TextAreaField label="Description" rows={2} value={o.description} onChange={(description) => set({ description })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <LinesField label="Pros" rows={3} value={o.pros} onChange={(pros) => set({ pros })} />
                <LinesField label="Cons" rows={3} value={o.cons} onChange={(cons) => set({ cons })} />
              </div>
            </div>
          )}
        />
        <TextAreaField label="Decision" rows={4} value={spec.decision} onChange={(decision) => change({ decision })} placeholder="What we decided, stated so it can be followed" />
        <TextAreaField label="Consequences" rows={4} value={spec.consequences} onChange={(consequences) => change({ consequences })} placeholder="What becomes easier, what becomes harder, what to watch" />
        <LinesField label="Follow-ups" value={spec.followUps} onChange={(followUps) => change({ followUps })} />
        <InputsPanel app="decisions" id={id} kind="derived-from" title="Based on" description="Pyramids, research, documents this decision draws on." />
      </div>
    </SpecEditorShell>
  );
}

export default function DecisionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const wp = useWorkspacePath();
  const doc = useQuery(api.decisions.get, { id: id! });
  return (
    <EditorRoute doc={doc} what="Decision" backTo={wp('/decisions')}>
      {(d) => <DecisionEditor key={d._id} id={d._id} title={d.title} initial={d.spec} />}
    </EditorRoute>
  );
}
