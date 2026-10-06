import { useMutation, useQuery } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { Layout } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';
import { CollectionPage } from '@/components/collection/CollectionPage';
import { useWorkspace, useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { appPage } from '@/features/workspaces/apps';

type Item = Doc<'uiUxArchitectures'>;
const getTitle = (a: Item) => a.title;
const getUpdated = (a: Item) => a.updatedAt;

export default function UiUxArchitecturesPage() {
  const { _id: workspaceId } = useWorkspace();
  const wp = useWorkspacePath();
  const navigate = useNavigate();
  const items = useQuery(api.uiUxArchitectures.list, { workspaceId });
  const create = useMutation(api.uiUxArchitectures.create);
  const rename = useMutation(api.uiUxArchitectures.rename);
  const remove = useMutation(api.uiUxArchitectures.remove);

  return (
    <CollectionPage
      {...appPage('uiUxArchitectures')}
      noun="architecture"
      items={items}
      getTitle={getTitle}
      getTimestamp={getUpdated}
      onOpen={(a) => navigate(wp(`/ui-ux-architecture/${a._id}`))}
      onCreate={async (title) => navigate(wp(`/ui-ux-architecture/${await create({ workspaceId, title })}`))}
      onRename={(a, title) => rename({ id: a._id, title })}
      onDelete={(a) => remove({ id: a._id })}
      createPlaceholder="e.g., Customer Portal"
      emptyIcon={Layout}
    />
  );
}
