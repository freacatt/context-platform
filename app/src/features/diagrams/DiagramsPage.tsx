import { useMutation, useQuery } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { Workflow } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { CollectionPage } from '@/components/collection/CollectionPage';
import type { Diagram } from '@/data/types';
import { useWorkspace, useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { appPage } from '@/features/workspaces/apps';

const getTitle = (d: Diagram) => d.title;
const getUpdated = (d: Diagram) => d.updatedAt;

export default function DiagramsPage() {
  const { _id: workspaceId } = useWorkspace();
  const wp = useWorkspacePath();
  const navigate = useNavigate();
  const diagrams = useQuery(api.diagrams.list, { workspaceId });
  const create = useMutation(api.diagrams.create);
  const rename = useMutation(api.diagrams.rename);
  const remove = useMutation(api.diagrams.remove);

  return (
    <CollectionPage
      {...appPage('diagrams')}
      noun="diagram"
      items={diagrams}
      getTitle={getTitle}
      getTimestamp={getUpdated}
      onOpen={(d) => navigate(wp(`/diagram/${d._id}`))}
      onCreate={async (title) => navigate(wp(`/diagram/${await create({ workspaceId, title })}`))}
      onRename={(d, title) => rename({ id: d._id, title })}
      onDelete={(d) => remove({ id: d._id })}
      createPlaceholder="e.g., System Flow"
      emptyIcon={Workflow}
    />
  );
}
