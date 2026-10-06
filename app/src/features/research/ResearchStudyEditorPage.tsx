import { useMutation, useQuery } from 'convex/react';
import { useParams } from 'react-router-dom';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { newEntryId } from '@shared/specs/primitives';
import { INSIGHT_CONFIDENCES, SOURCE_KINDS, SOURCE_KIND_LABELS, researchToMarkdown, type Insight, type ResearchSource, type ResearchSpec } from '@shared/specs/research';
import { EntryList, LinesField, SelectField, TextAreaField, TextField } from '@/components/form/fields';
import { optionsOf } from '@/components/form/options';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { markdownExport } from '@/features/specs/exports';
import { EditorRoute, SpecEditorShell } from '@/features/specs/SpecEditorShell';
import { useSpecDraft } from '@/features/specs/useSpecDraft';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { plural } from '@/lib/plural';

function ResearchEditor({ id, title, initial }: { id: Id<'researchStudies'>; title: string; initial: ResearchSpec }) {
  const update = useMutation(api.researchStudies.update);
  const rename = useMutation(api.researchStudies.rename);
  const { spec, change, status } = useSpecDraft(initial, (next) => update({ id, spec: next }));

  return (
    <SpecEditorShell
      app="researchStudies"
      id={id}
      title={title}
      onRename={(next) => rename({ id, title: next })}
      status={status}
      meta={<span>· {plural(spec.sources.length, 'source')} · {plural(spec.insights.length, 'insight')}</span>}
      exports={[markdownExport('research.md', () => researchToMarkdown(title, spec))]}
    >
      <Tabs defaultValue="insights">
        <TabsList className="mb-4">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="study">Study</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <EntryList<Insight>
            label="Insights"
            noun="insight"
            items={spec.insights}
            onChange={(insights) => change({ insights })}
            create={() => ({ id: newEntryId(), statement: '', evidence: '', confidence: 'medium', sourceIds: [], tags: [] })}
            title={(i) => i.statement}
            empty="What did you learn? One insight per card, with the evidence behind it."
            render={(i, set) => (
              <div className="grid gap-3">
                <TextAreaField label="Insight" rows={2} value={i.statement} onChange={(statement) => set({ statement })} />
                <TextAreaField label="Evidence" rows={3} value={i.evidence} onChange={(evidence) => set({ evidence })} placeholder="Quotes, numbers, observations" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField label="Confidence" value={i.confidence} onChange={(confidence) => set({ confidence })} options={optionsOf(INSIGHT_CONFIDENCES)} />
                  <LinesField label="Tags" rows={2} value={i.tags} onChange={(tags) => set({ tags })} />
                </div>
                {spec.sources.length > 0 && (
                  <fieldset>
                    <legend className="mb-1 text-sm font-semibold">Sources</legend>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {spec.sources.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={i.sourceIds.includes(s.id)}
                            onCheckedChange={(on) => set({ sourceIds: on === true ? [...i.sourceIds, s.id] : i.sourceIds.filter((x) => x !== s.id) })}
                          />
                          {s.title || 'Untitled source'}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="sources">
          <EntryList<ResearchSource>
            label="Sources"
            noun="source"
            items={spec.sources}
            onChange={(sources) => change({ sources })}
            create={() => ({ id: newEntryId(), title: '', kind: 'interview', date: '', notes: '' })}
            title={(s) => s.title}
            render={(s, set) => (
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField label="Source" className="sm:col-span-1" value={s.title} onChange={(t) => set({ title: t })} placeholder="Call with Ana" />
                  <SelectField label="Kind" value={s.kind} onChange={(kind) => set({ kind })} options={optionsOf(SOURCE_KINDS, SOURCE_KIND_LABELS)} />
                  <TextField label="Date" type="date" value={s.date} onChange={(date) => set({ date })} />
                </div>
                <TextAreaField label="Notes" rows={6} value={s.notes} onChange={(notes) => set({ notes })} placeholder="Raw notes, transcript excerpts, data" />
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="study" className="grid gap-5">
          <TextAreaField label="Goal" value={spec.goal} onChange={(goal) => change({ goal })} placeholder="What do we want to learn, and what decision will it inform?" />
          <TextAreaField label="Method" value={spec.method} onChange={(method) => change({ method })} />
          <TextAreaField label="Participants" value={spec.participants} onChange={(participants) => change({ participants })} />
        </TabsContent>
      </Tabs>
    </SpecEditorShell>
  );
}

export default function ResearchStudyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const wp = useWorkspacePath();
  const doc = useQuery(api.researchStudies.get, { id: id! });
  return (
    <EditorRoute doc={doc} what="Research study" backTo={wp('/research')}>
      {(d) => <ResearchEditor key={d._id} id={d._id} title={d.title} initial={d.spec} />}
    </EditorRoute>
  );
}
