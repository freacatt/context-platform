import type { ReactNode } from 'react';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReference } from 'convex/server';
import { useNavigate } from 'react-router-dom';
import type { Id } from '../../../convex/_generated/dataModel';
import { CollectionPage } from '@/components/collection/CollectionPage';
import { WORKSPACE_APPS, appPage } from '@/features/workspaces/apps';
import { useWorkspace, useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { SPEC_API, type SpecAppKey } from './specApi';

export interface SpecListItem<S = unknown> {
  _id: string;
  title: string;
  updatedAt: number;
  spec: S;
}

type Fns = {
  list: FunctionReference<'query', 'public', { workspaceId: Id<'workspaces'> }, SpecListItem[]>;
  create: FunctionReference<'mutation', 'public', { workspaceId: Id<'workspaces'>; title: string }, string>;
  rename: FunctionReference<'mutation', 'public', { id: string; title: string }, null>;
  duplicate: FunctionReference<'mutation', 'public', { id: string }, string>;
  remove: FunctionReference<'mutation', 'public', { id: string }, null>;
};

const getTitle = (d: SpecListItem) => d.title;
const getUpdated = (d: SpecListItem) => d.updatedAt;

interface Props<S> {
  app: SpecAppKey;
  noun: string;
  placeholder?: string;
  notice?: ReactNode;
  cardBody?: (item: SpecListItem<S>) => ReactNode;
}

/** The list screen of a spec app: the standard collection page. */
export function SpecListPage<S>({ app, noun, placeholder, notice, cardBody }: Props<S>) {
  const fns = SPEC_API[app] as unknown as Fns;
  const { _id: workspaceId } = useWorkspace();
  const wp = useWorkspacePath();
  const navigate = useNavigate();
  const items = useQuery(fns.list, { workspaceId });
  const create = useMutation(fns.create);
  const rename = useMutation(fns.rename);
  const duplicate = useMutation(fns.duplicate);
  const remove = useMutation(fns.remove);
  const info = WORKSPACE_APPS.find((a) => a.key === app)!;
  const open = (id: string) => navigate(wp(`${info.itemPath}/${id}`));

  return (
    <CollectionPage
      {...appPage(app)}
      noun={noun}
      items={items}
      getTitle={getTitle}
      getTimestamp={getUpdated}
      onOpen={(d) => open(d._id)}
      onCreate={async (title) => open(await create({ workspaceId, title }))}
      onRename={(d, title) => rename({ id: d._id, title })}
      onDuplicate={(d) => duplicate({ id: d._id })}
      onDelete={(d) => remove({ id: d._id })}
      createPlaceholder={placeholder}
      emptyIcon={info.icon}
      notice={notice}
      renderCardBody={cardBody as ((item: SpecListItem) => ReactNode) | undefined}
    />
  );
}
