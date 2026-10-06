import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useParams } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { glossaryToMarkdown, type GlossarySpec, type GlossaryTerm } from '@shared/specs/glossary';
import { newEntryId } from '@shared/specs/primitives';
import { LinesField, TextAreaField, TextField } from '@/components/form/fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { markdownExport } from '@/features/specs/exports';
import { EditorRoute, SpecEditorShell } from '@/features/specs/SpecEditorShell';
import { useSpecDraft } from '@/features/specs/useSpecDraft';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { plural } from '@/lib/plural';

function GlossaryEditor({ id, title, initial }: { id: Id<'glossaries'>; title: string; initial: GlossarySpec }) {
  const update = useMutation(api.glossaries.update);
  const rename = useMutation(api.glossaries.rename);
  const { spec, change, status } = useSpecDraft(initial, (next) => update({ id, spec: next }));
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const matches = (t: GlossaryTerm) => !query || [t.term, t.definition, ...t.aliases].some((s) => s.toLowerCase().includes(query));
  const set = (termId: string, patch: Partial<GlossaryTerm>) => change({ terms: spec.terms.map((t) => (t.id === termId ? { ...t, ...patch } : t)) });

  return (
    <SpecEditorShell
      app="glossaries"
      id={id}
      title={title}
      onRename={(next) => rename({ id, title: next })}
      status={status}
      meta={<span>· {plural(spec.terms.length, 'term')}</span>}
      exports={[markdownExport('glossary.md', () => glossaryToMarkdown(title, spec))]}
    >
      <div className="grid gap-6">
        <TextAreaField label="About this glossary" rows={2} value={spec.description} onChange={(description) => change({ description })} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input aria-label="Search terms" className="pl-9" placeholder="Search terms…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => change({ terms: [{ id: newEntryId(), term: '', definition: '', aliases: [], notes: '' }, ...spec.terms] })}>
            <Plus className="mr-1.5 h-4 w-4" /> Add term
          </Button>
        </div>
        {spec.terms.length === 0 && <p className="text-sm text-muted-foreground">No terms yet. Start with the words people use differently.</p>}
        <div className="grid gap-3">
          {spec.terms.filter(matches).map((t) => (
            <Card key={t.id} data-testid="glossary-term">
              <CardContent className="grid gap-3 pt-4 sm:grid-cols-[1fr_2fr]">
                <div className="grid gap-3">
                  <TextField label="Term" value={t.term} onChange={(term) => set(t.id, { term })} />
                  <LinesField label="Aliases" rows={2} value={t.aliases} onChange={(aliases) => set(t.id, { aliases })} />
                </div>
                <div className="grid gap-3">
                  <TextAreaField label="Definition" rows={3} value={t.definition} onChange={(definition) => set(t.id, { definition })} />
                  <TextAreaField label="Notes" rows={2} value={t.notes} onChange={(notes) => set(t.id, { notes })} placeholder="Examples, not to be confused with…" />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button variant="ghost" size="sm" aria-label={`Remove ${t.term || 'term'}`} onClick={() => change({ terms: spec.terms.filter((x) => x.id !== t.id) })}>
                    <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SpecEditorShell>
  );
}

export default function GlossaryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const wp = useWorkspacePath();
  const doc = useQuery(api.glossaries.get, { id: id! });
  return (
    <EditorRoute doc={doc} what="Glossary" backTo={wp('/glossaries')}>
      {(d) => <GlossaryEditor key={d._id} id={d._id} title={d.title} initial={d.spec} />}
    </EditorRoute>
  );
}
