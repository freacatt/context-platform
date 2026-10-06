import { useState } from 'react';
import { useQuery } from 'convex/react';
import { Check } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { refKey, type KnowledgeRef } from '@shared/knowledge/types';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WORKSPACE_APPS } from '@/features/workspaces/apps';

interface Props {
  workspaceId: Id<'workspaces'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Items that cannot be picked (already chosen, or the item itself). */
  exclude?: Set<string>;
  onConfirm: (refs: KnowledgeRef[]) => void;
}

/** Pick several items of any app, searchable and grouped by app. */
export function ItemPickerDialog({ workspaceId, open, onOpenChange, title, description, exclude, onConfirm }: Props) {
  const catalog = useQuery(api.knowledge.catalog, open ? { workspaceId } : 'skip');
  const [picked, setPicked] = useState<Map<string, KnowledgeRef>>(new Map());

  const close = (next: boolean) => {
    if (!next) setPicked(new Map());
    onOpenChange(next);
  };
  const toggle = (ref: KnowledgeRef) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(refKey(ref))) next.delete(refKey(ref));
      else next.set(refKey(ref), ref);
      return next;
    });
  const available = (catalog ?? []).filter((c) => !exclude?.has(refKey(c)));

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Command className="rounded-md border">
          <CommandInput placeholder="Search items…" />
          <CommandList className="max-h-80">
            <CommandEmpty>{catalog === undefined ? 'Loading…' : 'No items found.'}</CommandEmpty>
            {WORKSPACE_APPS.map((info) => {
              const items = available.filter((c) => c.app === info.key);
              if (!items.length) return null;
              const Icon = info.icon;
              return (
                <CommandGroup key={info.key} heading={info.title}>
                  {items.map((c) => {
                    const on = picked.has(refKey(c));
                    return (
                      <CommandItem
                        key={refKey(c)}
                        value={`${info.title} ${c.title} ${c.id}`}
                        onSelect={() => toggle({ app: c.app, id: c.id })}
                        aria-selected={on}
                        data-picked={on}
                      >
                        <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{c.title}</span>
                        {on && <Check className="h-4 w-4" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            disabled={picked.size === 0}
            onClick={() => {
              onConfirm([...picked.values()]);
              close(false);
            }}
          >
            Add {picked.size || ''} {picked.size === 1 ? 'item' : 'items'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
