import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { knowledgeApp } from '@shared/knowledge/registry';
import { LINK_KIND_LABELS, refKey, type KnowledgeApp, type LinkKind } from '@shared/knowledge/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WORKSPACE_APPS } from '@/features/workspaces/apps';
import { useWorkspace, useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { withErrorToast } from '@/lib/errors';
import { ItemPickerDialog } from './ItemPickerDialog';
import { itemPath } from './itemPath';

interface Props {
  app: KnowledgeApp;
  id: string;
  /** Relation new inputs get. */
  kind?: LinkKind;
  title?: string;
  description?: string;
}

/** The items this one builds on (its outgoing links), with "Add input". */
export function InputsPanel({ app, id, kind = 'depends-on', title = 'Inputs', description }: Props) {
  const { _id: workspaceId } = useWorkspace();
  const wp = useWorkspacePath();
  const links = useQuery(api.links.listForItem, { workspaceId, app, id });
  const create = useMutation(api.links.create);
  const remove = useMutation(api.links.remove);
  const [picking, setPicking] = useState(false);
  const outgoing = links?.outgoing ?? [];

  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add input
        </Button>
      </div>
      {outgoing.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing linked yet. Link the product definition, architecture, design system or decisions this builds on.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {outgoing.map((e) => {
            const info = WORKSPACE_APPS.find((a) => a.key === e.app);
            const Icon = info?.icon;
            return (
              <li key={`${e.kind}-${e.app}-${e.id}`} className="flex items-center gap-3 px-3 py-2">
                {Icon && (
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded ${info.tintClassName}`}>
                    <Icon size={14} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Link to={wp(itemPath(e.app, e.id))} className="block truncate text-sm font-medium hover:underline">
                    {e.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{knowledgeApp(e.app).label}</p>
                </div>
                <Badge variant="secondary">{LINK_KIND_LABELS[e.kind]}</Badge>
                {e.linkId && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remove input ${e.title}`} onClick={() => withErrorToast(() => remove({ id: e.linkId as Id<'links'> }))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ItemPickerDialog
        workspaceId={workspaceId}
        open={picking}
        onOpenChange={setPicking}
        title="Add inputs"
        description={`Linked as “${LINK_KIND_LABELS[kind]}”.`}
        exclude={new Set([refKey({ app, id }), ...outgoing.filter((e) => e.kind === kind).map((e) => refKey(e))])}
        onConfirm={async (refs) => {
          for (const ref of refs) await withErrorToast(() => create({ workspaceId, from: { app, id }, to: ref, kind }), 'Could not add the input');
        }}
      />
    </section>
  );
}
