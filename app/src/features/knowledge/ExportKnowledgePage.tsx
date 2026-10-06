import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Download, FileDown, Loader2, Save, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { ALL_LINKS } from '@shared/knowledge/graph';
import { KNOWLEDGE_APPS } from '@shared/knowledge/registry';
import { refKey, type KnowledgeRef } from '@shared/knowledge/types';
import { PageHeader } from '@/components/collection/PageHeader';
import { TitleDialog } from '@/components/collection/TitleDialog';
import { SectionSpinner } from '@/components/layout/FullPageSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { WORKSPACE_APPS } from '@/features/workspaces/apps';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { buildKnowledgeOutput, downloadKnowledgeOutput, formatSize, type KnowledgeFormat } from '@/lib/export/knowledge';
import { withErrorToast } from '@/lib/errors';

const DEPTHS = [
  { value: 0, label: 'None' },
  { value: 1, label: '1 hop' },
  { value: 2, label: '2 hops' },
  { value: ALL_LINKS, label: 'All' },
];

const appIcon = (key: string) => WORKSPACE_APPS.find((a) => a.key === key);

/** Makes the chosen option of an outline toggle group unmistakable. */
const toggleOn = 'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground';

/** Pick workspace items, expand along their links, and download them as Markdown. */
export default function ExportKnowledgePage() {
  const workspace = useWorkspace();
  const workspaceId = workspace._id;
  const catalog = useQuery(api.knowledge.catalog, { workspaceId });
  const packs = useQuery(api.contextPacks.list, { workspaceId });
  const createPack = useMutation(api.contextPacks.create);
  const updatePack = useMutation(api.contextPacks.update);
  const removePack = useMutation(api.contextPacks.remove);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [linkDepth, setLinkDepth] = useState(0);
  const [format, setFormat] = useState<KnowledgeFormat>('zip');
  const [search, setSearch] = useState('');
  const [packId, setPackId] = useState<Id<'contextPacks'> | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const byKey = useMemo(() => new Map((catalog ?? []).map((c) => [refKey(c), c])), [catalog]);
  // Items deleted since they were selected drop out on their own.
  const refs: KnowledgeRef[] = useMemo(
    () => [...selected].flatMap((key) => {
      const item = byKey.get(key);
      return item ? [{ app: item.app, id: item.id }] : [];
    }),
    [selected, byKey],
  );

  const collected = useQuery(api.knowledge.collect, refs.length ? { workspaceId, refs, linkDepth } : 'skip');
  const output = useMemo(
    () =>
      collected && refs.length
        ? buildKnowledgeOutput({ ...collected, exportedAt: new Date().toISOString() }, format)
        : null,
    [collected, refs.length, format],
  );

  if (catalog === undefined || packs === undefined) return <SectionSpinner />;

  const pack = packs.find((p) => p._id === packId) ?? null;
  const query = search.trim().toLowerCase();
  const groups = KNOWLEDGE_APPS.map((app) => ({
    app,
    items: catalog
      .filter((c) => c.app === app.key && (!query || c.title.toLowerCase().includes(query)))
      .sort((a, b) => a.title.localeCompare(b.title)),
  })).filter((g) => g.items.length > 0);

  const toggle = (keys: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (on) next.add(key);
        else next.delete(key);
      }
      return next;
    });

  const loadPack = (id: string) => {
    const found = packs.find((p) => p._id === id);
    if (!found) return;
    setPackId(found._id);
    setSelected(new Set(found.refs.map(refKey).filter((key) => byKey.has(key))));
    setLinkDepth(found.linkDepth);
  };

  const download = () => {
    if (!collected) return;
    downloadKnowledgeOutput(buildKnowledgeOutput({ ...collected, exportedAt: new Date().toISOString() }, format));
    toast.success('Knowledge exported');
  };

  const stillLoading = refs.length > 0 && collected === undefined;

  return (
    <div className="w-full px-4 pb-12 md:px-8">
      <PageHeader
        title="Export knowledge"
        description="Pick items from any app, pull in what they link to, and download them as Markdown — one file, or a zip with one file per item, an index and a relations graph."
        icon={FileDown}
        iconClassName="bg-slate-700"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              aria-label="Search items"
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {groups.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                {catalog.length === 0 ? 'This workspace has no items yet.' : 'No items match your search.'}
              </CardContent>
            </Card>
          )}

          {groups.map(({ app, items }) => {
            const keys = items.map(refKey);
            const count = keys.filter((k) => selected.has(k)).length;
            const info = appIcon(app.key);
            const Icon = info?.icon;
            return (
              <Card key={app.key} data-testid={`knowledge-group-${app.key}`}>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 py-3">
                  <Checkbox
                    aria-label={`Select all ${app.label}`}
                    checked={count === keys.length ? true : count > 0 ? 'indeterminate' : false}
                    onCheckedChange={(on) => toggle(keys, on === true)}
                  />
                  {Icon && (
                    <span className={`flex size-7 items-center justify-center rounded-md ${info.tintClassName}`}>
                      <Icon size={15} />
                    </span>
                  )}
                  <CardTitle className="text-base flex-1">{app.label}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {count}/{keys.length}
                  </span>
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  <ul className="divide-y">
                    {items.map((item) => {
                      const key = refKey(item);
                      const id = `knowledge-${key}`;
                      return (
                        <li key={key} className="flex items-center gap-3 py-2">
                          <Checkbox id={id} checked={selected.has(key)} onCheckedChange={(on) => toggle([key], on === true)} />
                          <Label htmlFor={id} className="flex-1 min-w-0 truncate font-normal cursor-pointer">
                            {item.title}
                          </Label>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4 lg:sticky lg:top-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Context pack</CardTitle>
              <CardDescription>Save this selection to reuse it later.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {packs.length > 0 && (
                <Select value={packId ?? ''} onValueChange={loadPack}>
                  <SelectTrigger aria-label="Load a context pack">
                    <SelectValue placeholder="Load a pack…" />
                  </SelectTrigger>
                  <SelectContent>
                    {packs.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={refs.length === 0} onClick={() => setSaveOpen(true)}>
                  <Save size={14} className="mr-1.5" /> Save as pack
                </Button>
                {pack && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const ok = await withErrorToast(() => updatePack({ id: pack._id, refs, linkDepth }), 'Could not update the pack');
                        if (ok !== undefined) toast.success(`Updated “${pack.title}”`);
                      }}
                    >
                      Update “{pack.title}”
                    </Button>
                    <Button variant="ghost" size="sm" aria-label="Delete pack" onClick={() => setDeleteOpen(true)}>
                      <Trash2 size={14} />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Include linked items</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  aria-label="Include linked items"
                  value={String(linkDepth)}
                  onValueChange={(v) => v && setLinkDepth(Number(v))}
                  className="justify-start flex-wrap"
                >
                  {DEPTHS.map((d) => (
                    <ToggleGroupItem key={d.value} value={String(d.value)} aria-label={`Links: ${d.label}`} className={toggleOn}>
                      {d.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  aria-label="Format"
                  value={format}
                  onValueChange={(v) => v && setFormat(v as KnowledgeFormat)}
                  className="justify-start"
                >
                  <ToggleGroupItem value="zip" aria-label="Zip of Markdown files" className={toggleOn}>
                    .zip (file per item)
                  </ToggleGroupItem>
                  <ToggleGroupItem value="single" aria-label="Single Markdown file" className={toggleOn}>
                    Single .md
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <dl className="grid grid-cols-2 gap-y-1 text-sm" data-testid="knowledge-summary">
                <dt className="text-muted-foreground">Selected</dt>
                <dd className="text-right">{refs.length}</dd>
                <dt className="text-muted-foreground">With linked items</dt>
                <dd className="text-right">{collected && refs.length ? collected.items.length : 0}</dd>
                <dt className="text-muted-foreground">Relations</dt>
                <dd className="text-right">{collected && refs.length ? collected.edges.length : 0}</dd>
                <dt className="text-muted-foreground">Size</dt>
                <dd className="text-right">{output ? formatSize(output.chars) : '—'}</dd>
                <dt className="text-muted-foreground">Tokens (approx.)</dt>
                <dd className="text-right">{output ? `~${output.tokens.toLocaleString()}` : '—'}</dd>
              </dl>
              <Button className="w-full" disabled={!output || stillLoading} onClick={download}>
                {stillLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
                Download {format === 'zip' ? '.zip' : '.md'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <TitleDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title="Save context pack"
        description="A named selection you can load again here (and later use as AI context)."
        label="Name"
        submitLabel="Save"
        onSubmit={async (title) => {
          const id = await withErrorToast(() => createPack({ workspaceId, title, refs, linkDepth }), 'Could not save the pack');
          if (id === undefined) return false;
          setPackId(id);
          toast.success('Context pack saved');
        }}
      />
      {pack && (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete context pack"
          description="The pack is deleted; the items in it are not."
          itemName={pack.title}
          onConfirm={async () => {
            const ok = await withErrorToast(() => removePack({ id: pack._id }), 'Could not delete the pack');
            if (ok !== undefined) {
              setPackId(null);
              setDeleteOpen(false);
            }
          }}
        />
      )}
    </div>
  );
}
