import { useMutation, useQuery } from 'convex/react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { newEntryId } from '@shared/specs/primitives';
import { HORIZONS, HORIZON_LABELS, INITIATIVE_STATUSES, roadmapToMarkdown, type Goal, type Horizon, type Initiative, type KeyResult, type RoadmapSpec } from '@shared/specs/roadmap';
import { EntryList, SelectField, TextAreaField, TextField } from '@/components/form/fields';
import { optionsOf } from '@/components/form/options';
import { RowsEditor } from '@/components/form/RowsEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { markdownExport } from '@/features/specs/exports';
import { EditorRoute, SpecEditorShell } from '@/features/specs/SpecEditorShell';
import { useSpecDraft } from '@/features/specs/useSpecDraft';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';

function InitiativeCard({ item, goals, onChange, onRemove }: { item: Initiative; goals: Goal[]; onChange: (patch: Partial<Initiative>) => void; onRemove: () => void }) {
  return (
    <Card data-testid="initiative">
      <CardContent className="grid gap-3 pt-4">
        <TextField label="Initiative" value={item.title} onChange={(title) => onChange({ title })} />
        <TextAreaField label="Description" rows={2} value={item.description} onChange={(description) => onChange({ description })} />
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="Horizon" value={item.horizon} onChange={(horizon) => onChange({ horizon })} options={optionsOf(HORIZONS, HORIZON_LABELS)} />
          <SelectField label="Status" value={item.status} onChange={(status) => onChange({ status })} options={optionsOf(INITIATIVE_STATUSES)} />
        </div>
        {goals.length > 0 && (
          <fieldset>
            <legend className="mb-1 text-sm font-semibold">Moves</legend>
            <div className="grid gap-1.5">
              {goals.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={item.goalIds.includes(g.id)} onCheckedChange={(on) => onChange({ goalIds: on === true ? [...item.goalIds, g.id] : item.goalIds.filter((x) => x !== g.id) })} />
                  {g.objective || 'Untitled goal'}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" aria-label={`Remove ${item.title || 'initiative'}`} onClick={onRemove}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RoadmapEditor({ id, title, initial }: { id: Id<'roadmaps'>; title: string; initial: RoadmapSpec }) {
  const update = useMutation(api.roadmaps.update);
  const rename = useMutation(api.roadmaps.rename);
  const { spec, change, status } = useSpecDraft(initial, (next) => update({ id, spec: next }));
  const setInitiative = (initiativeId: string, patch: Partial<Initiative>) => change({ initiatives: spec.initiatives.map((i) => (i.id === initiativeId ? { ...i, ...patch } : i)) });
  const add = (horizon: Horizon) => change({ initiatives: [...spec.initiatives, { id: newEntryId(), title: '', description: '', horizon, status: 'proposed', goalIds: [] }] });

  return (
    <SpecEditorShell
      app="roadmaps"
      id={id}
      title={title}
      onRename={(next) => rename({ id, title: next })}
      status={status}
      exports={[markdownExport('roadmap.md', () => roadmapToMarkdown(title, spec))]}
    >
      <Tabs defaultValue="roadmap">
        <TabsList className="mb-4">
          <TabsTrigger value="roadmap">Now / Next / Later</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap" className="grid gap-5">
          <TextAreaField label="Vision" rows={2} value={spec.vision} onChange={(vision) => change({ vision })} />
          <div className="grid gap-4 lg:grid-cols-3">
            {HORIZONS.map((horizon) => {
              const items = spec.initiatives.filter((i) => i.horizon === horizon);
              return (
                <section key={horizon} className="space-y-3 rounded-lg bg-muted/40 p-3" aria-label={HORIZON_LABELS[horizon]}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {HORIZON_LABELS[horizon]} <Badge variant="secondary">{items.length}</Badge>
                    </h3>
                    <Button variant="ghost" size="sm" aria-label={`Add initiative to ${HORIZON_LABELS[horizon]}`} onClick={() => add(horizon)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {items.map((item) => (
                    <InitiativeCard
                      key={item.id}
                      item={item}
                      goals={spec.goals}
                      onChange={(patch) => setInitiative(item.id, patch)}
                      onRemove={() => change({ initiatives: spec.initiatives.filter((i) => i.id !== item.id) })}
                    />
                  ))}
                </section>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="goals">
          <EntryList<Goal>
            label="Goals"
            noun="goal"
            items={spec.goals}
            onChange={(goals) => change({ goals })}
            create={() => ({ id: newEntryId(), objective: '', description: '', keyResults: [] })}
            title={(g) => g.objective}
            render={(g, set) => (
              <div className="grid gap-3">
                <TextField label="Objective" value={g.objective} onChange={(objective) => set({ objective })} placeholder="Become the default tool for product teams" />
                <TextAreaField label="Why" rows={2} value={g.description} onChange={(description) => set({ description })} />
                <RowsEditor<KeyResult>
                  label="Key results"
                  noun="key result"
                  items={g.keyResults}
                  onChange={(keyResults) => set({ keyResults })}
                  create={() => ({ id: newEntryId(), text: '', target: '', current: '' })}
                  columns={[
                    { key: 'text', label: 'Key result' },
                    { key: 'target', label: 'Target', className: 'w-28' },
                    { key: 'current', label: 'Current', className: 'w-28' },
                  ]}
                />
              </div>
            )}
          />
        </TabsContent>
      </Tabs>
    </SpecEditorShell>
  );
}

export default function RoadmapEditorPage() {
  const { id } = useParams<{ id: string }>();
  const wp = useWorkspacePath();
  const doc = useQuery(api.roadmaps.get, { id: id! });
  return (
    <EditorRoute doc={doc} what="Roadmap" backTo={wp('/roadmaps')}>
      {(d) => <RoadmapEditor key={d._id} id={d._id} title={d.title} initial={d.spec} />}
    </EditorRoute>
  );
}
