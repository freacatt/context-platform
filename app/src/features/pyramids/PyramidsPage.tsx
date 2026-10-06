import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { Pyramid as PyramidIcon } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { CollectionPage } from '@/components/collection/CollectionPage';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Pyramid } from '@/data/types';
import { useWorkspace, useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { appPage } from '@/features/workspaces/apps';

const getTitle = (p: Pyramid) => p.title;
const getUpdated = (p: Pyramid) => p.updatedAt;

export default function PyramidsPage() {
  const { _id: workspaceId } = useWorkspace();
  const wp = useWorkspacePath();
  const navigate = useNavigate();
  const pyramids = useQuery(api.pyramids.list, { workspaceId });
  const create = useMutation(api.pyramids.create);
  const rename = useMutation(api.pyramids.rename);
  const duplicate = useMutation(api.pyramids.duplicate);
  const remove = useMutation(api.pyramids.remove);
  const [question, setQuestion] = useState('');

  return (
    <CollectionPage
      {...appPage('pyramids')}
      noun="pyramid"
      items={pyramids}
      getTitle={getTitle}
      getTimestamp={getUpdated}
      onOpen={(p) => navigate(wp(`/pyramid/${p._id}`))}
      onCreate={async (title) => {
        const id = await create({ workspaceId, title, question: question.trim() || undefined });
        setQuestion('');
        navigate(wp(`/pyramid/${id}`));
      }}
      onRename={(p, title) => rename({ id: p._id, title })}
      onDuplicate={(p) => duplicate({ id: p._id })}
      onDelete={(p) => remove({ id: p._id })}
      createPlaceholder="e.g., Q3 Market Entry"
      createFields={
        <div className="flex flex-col gap-2">
          <Label htmlFor="pyramid-root-question">Root question (optional)</Label>
          <Textarea
            id="pyramid-root-question"
            placeholder="What should we decide, diagnose, or design?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
          />
        </div>
      }
      emptyIcon={PyramidIcon}
    />
  );
}
