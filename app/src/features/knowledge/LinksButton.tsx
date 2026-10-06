import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Link } from 'react-router-dom';
import { Link2, X } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { knowledgeApp } from '@shared/knowledge/registry';
import { LINK_KIND_LABELS, LINK_KINDS, type KnowledgeApp, type LinkKind } from '@shared/knowledge/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { WORKSPACE_APPS } from '@/features/workspaces/apps';
import { useWorkspace, useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { withErrorToast } from '@/lib/errors';
import { itemPath } from './itemPath';

interface Props {
  app: KnowledgeApp;
  id: string;
  /** Button styling to match the editor's header. */
  variant?: 'outline' | 'secondary' | 'ghost';
}

/** Header button opening the item's links and backlinks. */
export function LinksButton({ app, id, variant = 'outline' }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={variant}>
          <Link2 size={16} className="mr-2" /> Links
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {open && <LinksPanel app={app} id={id} />}
      </SheetContent>
    </Sheet>
  );
}

type Entry = NonNullable<ReturnType<typeof useLinks>>['outgoing'][number];

function useLinks(app: KnowledgeApp, id: string) {
  const { _id: workspaceId } = useWorkspace();
  return useQuery(api.links.listForItem, { workspaceId, app, id });
}

function AppIcon({ app }: { app: KnowledgeApp }) {
  const info = WORKSPACE_APPS.find((a) => a.key === app);
  if (!info) return null;
  const Icon = info.icon;
  return (
    <span className={`flex size-6 shrink-0 items-center justify-center rounded ${info.tintClassName}`} title={knowledgeApp(app).label}>
      <Icon size={13} />
    </span>
  );
}

function LinkRow({ entry, onRemove }: { entry: Entry; onRemove: (id: Id<'links'>) => void }) {
  const wp = useWorkspacePath();
  return (
    <li className="flex items-center gap-2 py-1.5" data-testid="link-row">
      <AppIcon app={entry.app} />
      <Link to={wp(itemPath(entry.app, entry.id))} className="flex-1 min-w-0 truncate text-sm hover:underline">
        {entry.title}
      </Link>
      {entry.source === 'derived' && (
        <Badge variant="secondary" className="text-[10px]" title="From the item's own fields">
          auto
        </Badge>
      )}
      {entry.linkId && (
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remove link to ${entry.title}`} onClick={() => onRemove(entry.linkId!)}>
          <X size={14} />
        </Button>
      )}
    </li>
  );
}

function grouped(entries: Entry[]) {
  return LINK_KINDS.map((kind) => ({ kind, entries: entries.filter((e) => e.kind === kind) })).filter((g) => g.entries.length);
}

function LinksPanel({ app, id }: { app: KnowledgeApp; id: string }) {
  const { _id: workspaceId } = useWorkspace();
  const links = useLinks(app, id);
  const catalog = useQuery(api.knowledge.catalog, { workspaceId });
  const create = useMutation(api.links.create);
  const remove = useMutation(api.links.remove);
  const [kind, setKind] = useState<LinkKind>('references');

  const linkedKeys = new Set((links?.outgoing ?? []).filter((e) => e.kind === kind).map((e) => `${e.app}:${e.id}`));
  const candidates = (catalog ?? []).filter((c) => !(c.app === app && c.id === id) && !linkedKeys.has(`${c.app}:${c.id}`));

  const add = (to: { app: KnowledgeApp; id: string }) =>
    withErrorToast(() => create({ workspaceId, from: { app, id }, to, kind }), 'Could not add the link');
  const onRemove = (linkId: Id<'links'>) => withErrorToast(() => remove({ id: linkId }), 'Could not remove the link');

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>Links</SheetTitle>
        <SheetDescription>How this item relates to the rest of the workspace. Links travel with knowledge exports.</SheetDescription>
      </SheetHeader>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Links to</h3>
        {links?.outgoing.length ? (
          grouped(links.outgoing).map((g) => (
            <div key={g.kind}>
              <p className="text-xs text-muted-foreground">{LINK_KIND_LABELS[g.kind]}</p>
              <ul>{g.entries.map((e) => <LinkRow key={`${e.kind}-${e.app}-${e.id}`} entry={e} onRemove={onRemove} />)}</ul>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No links yet.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Linked from</h3>
        {links?.incoming.length ? (
          grouped(links.incoming).map((g) => (
            <div key={g.kind}>
              <p className="text-xs text-muted-foreground">{LINK_KIND_LABELS[g.kind]} this</p>
              <ul>{g.entries.map((e) => <LinkRow key={`${e.kind}-${e.app}-${e.id}`} entry={e} onRemove={onRemove} />)}</ul>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No backlinks.</p>
        )}
      </section>

      <section className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">Add a link</h3>
        <div className="space-y-1.5">
          <Label>Relation</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as LinkKind)}>
            <SelectTrigger aria-label="Relation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LINK_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {LINK_KIND_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Command className="rounded-md border">
          <CommandInput placeholder="Search items to link…" />
          <CommandList className="max-h-64">
            <CommandEmpty>No items found.</CommandEmpty>
            {WORKSPACE_APPS.map((info) => {
              const items = candidates.filter((c) => c.app === info.key);
              if (!items.length) return null;
              return (
                <CommandGroup key={info.key} heading={info.title}>
                  {items.map((c) => (
                    <CommandItem key={`${c.app}:${c.id}`} value={`${info.title} ${c.title} ${c.id}`} onSelect={() => add({ app: c.app, id: c.id })}>
                      {c.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </section>
    </div>
  );
}
