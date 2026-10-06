import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Folder, Plus } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { EmptyState } from '@/components/collection/EmptyState';
import { PageHeader } from '@/components/collection/PageHeader';
import { TitleDialog } from '@/components/collection/TitleDialog';
import { SectionSpinner } from '@/components/layout/FullPageSpinner';
import { NotFound } from '@/components/layout/NotFound';
import { Button } from '@/components/ui/button';
import { appPage } from '@/features/workspaces/apps';
import { useWorkspace, useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { withErrorToast } from '@/lib/errors';
import { DocumentCard } from './DocumentCard';
import { useDocumentActions } from './useDocumentActions';

const { iconClassName } = appPage('contextDocuments');

export default function DirectoryDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const { _id: workspaceId } = useWorkspace();
  const wp = useWorkspacePath();
  const navigate = useNavigate();
  const directory = useQuery(api.directories.get, { id: id! });
  const directories = useQuery(api.directories.list, { workspaceId }) ?? [];
  const documents = useQuery(api.contextDocuments.listInDirectory, directory ? { directoryId: directory._id } : 'skip');
  const createDocument = useMutation(api.contextDocuments.create);
  const { cardActions, dialogs } = useDocumentActions();
  const [creating, setCreating] = useState(false);

  if (directory === undefined) return <SectionSpinner />;
  if (directory === null) return <NotFound what="Directory" backTo={wp('/context-documents')} />;

  return (
    <div className="container mx-auto p-4">
      <PageHeader
        back={
          <Button variant="ghost" onClick={() => navigate(wp('/context-documents'))}>
            <ArrowLeft size={16} className="mr-2" /> Back to Context & Documents
          </Button>
        }
        title={directory.title}
        description={`${documents?.length ?? 0} document${documents?.length === 1 ? '' : 's'} in this directory`}
        icon={Folder}
        iconClassName={iconClassName}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} className="mr-2" /> New Document
          </Button>
        }
      />

      {documents === undefined ? (
        <SectionSpinner />
      ) : documents.length === 0 ? (
        <EmptyState icon={Folder} title="This directory is empty" actionLabel="Create a document here" onAction={() => setCreating(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <DocumentCard key={doc._id} doc={doc} directories={directories} {...cardActions(doc)} />
          ))}
        </div>
      )}

      <TitleDialog
        open={creating}
        onOpenChange={setCreating}
        title={`New Document in ${directory.title}`}
        submitLabel="Create"
        onSubmit={async (title) => {
          const docId = await withErrorToast(() => createDocument({ workspaceId, title, directoryId: directory._id }));
          if (!docId) return false;
          navigate(wp(`/context-document/${docId}`));
        }}
      />
      {dialogs}
    </div>
  );
}
