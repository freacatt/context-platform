import { useMutation, useQuery } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { CollectionPage } from '@/components/collection/CollectionPage';
import { AppShell } from '@/components/layout/AppShell';
import type { Workspace } from '@/data/types';
import { ImportWorkspaceButton } from './WorkspaceTransfer';
import { WorkspacesListSidebar } from './WorkspacesListSidebar';

const getName = (w: Workspace) => w.name;
const getCreated = (w: Workspace) => w._creationTime;

export default function WorkspacesPage() {
  const workspaces = useQuery(api.workspaces.list);
  const create = useMutation(api.workspaces.create);
  const rename = useMutation(api.workspaces.rename);
  const remove = useMutation(api.workspaces.remove);
  const navigate = useNavigate();

  return (
    <AppShell sidebar={<WorkspacesListSidebar />}>
      <CollectionPage
        heading="Workspaces"
        description="Manage your workspaces and projects."
        icon={FolderOpen}
        iconClassName="bg-slate-700"
        cardIconClassName="bg-slate-500/10 text-slate-700 dark:text-slate-300"
        noun="workspace"
        items={workspaces}
        getTitle={getName}
        getTimestamp={getCreated}
        timestampLabel="Created"
        onOpen={(w) => navigate(`/${w._id}/dashboard`)}
        onCreate={async (name) => navigate(`/${await create({ name })}/dashboard`)}
        onRename={(w, name) => rename({ id: w._id, name })}
        onDelete={(w) => remove({ id: w._id })}
        createPlaceholder="My Awesome Workspace"
        actions={<ImportWorkspaceButton />}
        emptyIcon={FolderOpen}
      />
    </AppShell>
  );
}
