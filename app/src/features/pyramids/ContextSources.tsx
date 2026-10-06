import { useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { FileText, Library, Loader2, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { knowledgeApp } from '@shared/knowledge/registry';
import type { ContextRef } from '@shared/pyramid/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Pyramid } from '@/data/types';
import { ItemPickerDialog } from '@/features/knowledge/ItemPickerDialog';
import { WORKSPACE_APPS } from '@/features/workspaces/apps';
import { formatSize } from '@/lib/export/knowledge';
import { errorMessage } from '@/lib/errors';
import { readTextUploads } from '@/lib/textUploads';

const DEPTHS = [
  { value: 0, label: 'None' },
  { value: 1, label: '1 hop' },
  { value: 2, label: '2 hops' },
  { value: -1, label: 'All' },
];

const sourceKey = (ref: ContextRef) => (ref.kind === 'item' ? `${ref.app}:${ref.id}` : `${ref.kind}:${ref.id}`);

interface Props {
  pyramid: Pyramid;
  refs: ContextRef[];
  linkDepth: number;
  onChange: (refs: ContextRef[], linkDepth: number) => void;
  /** Saves pending setup edits (before a file the setup no longer uses is deleted). */
  flush: () => Promise<unknown>;
}

/** Context sources of a pyramid setup: items of any app, context packs, uploaded Markdown. */
export function ContextSources({ pyramid, refs, linkDepth, onChange, flush }: Props) {
  const catalog = useQuery(api.knowledge.catalog, { workspaceId: pyramid.workspaceId });
  const packs = useQuery(api.contextPacks.list, { workspaceId: pyramid.workspaceId });
  const files = useQuery(api.pyramidFiles.list, { pyramidId: pyramid._id });
  const summary = useQuery(api.pyramids.contextSummary, { id: pyramid._id });
  const addFile = useMutation(api.pyramidFiles.add);
  const removeFile = useMutation(api.pyramidFiles.remove);
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const keys = new Set(refs.filter((r) => r.kind === 'item').map(sourceKey));
  const add = (more: ContextRef[]) => {
    const existing = new Set(refs.map(sourceKey));
    onChange([...refs, ...more.filter((r) => !existing.has(sourceKey(r)))], linkDepth);
  };

  const describe = (ref: ContextRef) => {
    if (ref.kind === 'item') {
      const item = catalog?.find((c) => c.app === ref.app && c.id === ref.id);
      const info = WORKSPACE_APPS.find((a) => a.key === ref.app);
      return { icon: info?.icon ?? FileText, label: knowledgeApp(ref.app).label, title: item?.title ?? (catalog ? 'Deleted item' : '…') };
    }
    if (ref.kind === 'pack') {
      const pack = packs?.find((p) => p._id === ref.id);
      return { icon: Library, label: 'Context pack', title: pack?.title ?? (packs ? 'Deleted pack' : '…') };
    }
    const file = files?.find((f) => f._id === ref.id);
    return { icon: Upload, label: file ? `Uploaded · ${formatSize(file.chars)}` : 'Uploaded', title: file?.title ?? (files ? 'Deleted file' : '…') };
  };

  const remove = async (ref: ContextRef) => {
    onChange(
      refs.filter((r) => sourceKey(r) !== sourceKey(ref)),
      linkDepth,
    );
    if (ref.kind === 'file') {
      await flush();
      try {
        await removeFile({ id: ref.id as never });
      } catch (error) {
        toast.error(errorMessage(error, 'Could not delete the file'));
      }
    }
  };

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    const { files: read, skipped } = await readTextUploads([...list]);
    const added: ContextRef[] = [];
    for (const file of read) {
      try {
        const id = await addFile({ pyramidId: pyramid._id, title: file.title, content: file.content });
        added.push({ kind: 'file', id });
      } catch (error) {
        skipped.push(`${file.title} (${errorMessage(error, 'upload failed')})`);
      }
    }
    if (added.length) add(added);
    if (added.length) toast.success(`Added ${added.length} ${added.length === 1 ? 'file' : 'files'}`);
    if (skipped.length) toast.warning(`Skipped: ${skipped.join(', ')}`);
    setUploading(false);
  };

  const unusedPacks = (packs ?? []).filter((p) => !refs.some((r) => r.kind === 'pack' && r.id === p._id));

  return (
    <div className="flex flex-col gap-3 pt-1" data-testid="context-sources">
      <span className="text-xs text-muted-foreground">
        Context sources — the host condenses them, with the text above, into a brief for the panel.
      </span>

      {refs.length > 0 && (
        <ul className="divide-y rounded-md border">
          {refs.map((ref) => {
            const { icon: Icon, label, title } = describe(ref);
            return (
              <li key={sourceKey(ref)} className="flex items-center gap-3 px-3 py-2">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remove ${title}`} onClick={() => remove(ref)}>
                  <X className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add from workspace
        </Button>
        {unusedPacks.length > 0 && (
          <Select value="" onValueChange={(id) => add([{ kind: 'pack', id }])}>
            <SelectTrigger aria-label="Add a context pack" className="h-9 w-auto gap-2">
              <Library className="h-4 w-4" />
              <SelectValue placeholder="Add context pack" />
            </SelectTrigger>
            <SelectContent>
              {unusedPacks.map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
          Upload .md / .zip
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".md,.markdown,.mdx,.txt,.zip,text/markdown,text/plain,application/zip"
          className="hidden"
          data-testid="context-upload"
          onChange={(e) => {
            const list = e.target.files;
            void upload(list).finally(() => {
              e.target.value = '';
            });
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-xs text-muted-foreground">Include linked items</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label="Include linked items"
          value={String(linkDepth)}
          onValueChange={(v) => v && onChange(refs, Number(v))}
        >
          {DEPTHS.map((d) => (
            <ToggleGroupItem
              key={d.value}
              value={String(d.value)}
              aria-label={`Context links: ${d.label}`}
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {d.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {summary && summary.sources.length > 0 && (
          <span className="text-xs text-muted-foreground" data-testid="context-summary">
            {summary.sources.length} {summary.sources.length === 1 ? 'source' : 'sources'} · ~{Math.ceil(summary.totalChars / 4).toLocaleString()} tokens
          </span>
        )}
      </div>

      <ItemPickerDialog
        workspaceId={pyramid.workspaceId}
        open={picking}
        onOpenChange={setPicking}
        title="Add context from the workspace"
        description="Any item of any app: its Markdown export becomes context."
        exclude={new Set([...keys, `pyramids:${pyramid._id}`])}
        onConfirm={(picked) => add(picked.map((r) => ({ kind: 'item', app: r.app, id: r.id })))}
      />
    </div>
  );
}
