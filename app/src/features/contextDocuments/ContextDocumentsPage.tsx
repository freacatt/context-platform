import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Folder, FolderPlus, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { CollectionToolbar } from '@/components/collection/CollectionToolbar';
import { EmptyState } from '@/components/collection/EmptyState';
import { PageHeader } from '@/components/collection/PageHeader';
import { filterAndSort, type SortKey } from '@/components/collection/sorting';
import { TitleDialog } from '@/components/collection/TitleDialog';
import { SectionSpinner } from '@/components/layout/FullPageSpinner';
import { Button } from '@/components/ui/button';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { ContextDocument, Directory } from '@/data/types';
import { appPage } from '@/features/workspaces/apps';
import { useWorkspace, useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { withErrorToast } from '@/lib/errors';
import { DocumentCard } from './DocumentCard';
import { useDocumentActions } from './useDocumentActions';

const getTitle = (d: ContextDocument) => d.title;
const getUpdated = (d: ContextDocument) => d.updatedAt;

export default function ContextDocumentsPage() {
  const { _id: workspaceId } = useWorkspace();
  const wp = useWorkspacePath();
  const navigate = useNavigate();
  const documents = useQuery(api.contextDocuments.list, { workspaceId });
  const directories = useQuery(api.directories.list, { workspaceId }) ?? [];
  const createDocument = useMutation(api.contextDocuments.create);
  const createDirectory = useMutation(api.directories.create);
  const renameDirectory = useMutation(api.directories.rename);
  const removeDirectory = useMutation(api.directories.remove);
  const { cardActions, dialogs } = useDocumentActions();
  const { heading, description, icon, iconClassName } = appPage('contextDocuments');

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [dialog, setDialog] = useState<'document' | 'directory' | null>(null);
  const [renameDir, setRenameDir] = useState<Directory | null>(null);
  const [deleteDir, setDeleteDir] = useState<Directory | null>(null);

  const visible = useMemo(() => documents && filterAndSort(documents, search, sortBy, getTitle, getUpdated), [documents, search, sortBy]);

  return (
    <div className="container mx-auto p-4">
      <PageHeader
        title={heading}
        description={description}
        icon={icon}
        iconClassName={iconClassName}
        actions={
          <>
            <Button variant="outline" onClick={() => setDialog('directory')}>
              <FolderPlus size={16} className="mr-2" /> New Directory
            </Button>
            <Button onClick={() => setDialog('document')}>
              <Plus size={16} className="mr-2" /> New Document
            </Button>
          </>
        }
      />

      <CollectionToolbar nounPlural="documents" search={search} onSearchChange={setSearch} sortBy={sortBy} onSortChange={setSortBy} />

      {directories.length > 0 && (
        <nav aria-label="Directories" className="flex gap-2 flex-wrap mb-6">
          {directories.map((dir) => (
            <div key={dir._id} className="flex items-center rounded-md border bg-card pr-1">
              <Button variant="ghost" className="px-3 h-9 hover:bg-transparent" onClick={() => navigate(wp(`/directory/${dir._id}`))}>
                <Folder size={14} className="mr-2 text-muted-foreground" /> {dir.title}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Actions for ${dir.title}`}>
                    <MoreVertical size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setRenameDir(dir)}>
                    <Pencil size={14} className="mr-2" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteDir(dir)}>
                    <Trash2 size={14} className="mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </nav>
      )}

      {visible === undefined ? (
        <SectionSpinner />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={search ? `No documents match "${search}"` : 'No documents yet'}
          actionLabel={search ? undefined : 'Create your first document'}
          onAction={() => setDialog('document')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((doc) => (
            <DocumentCard key={doc._id} doc={doc} directories={directories} {...cardActions(doc)} />
          ))}
        </div>
      )}

      <TitleDialog
        open={dialog === 'document'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="New Document"
        placeholder="e.g. Market Research 2024"
        submitLabel="Create"
        onSubmit={async (title) => {
          const id = await withErrorToast(() => createDocument({ workspaceId, title }));
          if (!id) return false;
          navigate(wp(`/context-document/${id}`));
        }}
      />
      <TitleDialog
        open={dialog === 'directory'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="New Directory"
        label="Name"
        submitLabel="Create"
        onSubmit={async (title) => (await withErrorToast(() => createDirectory({ workspaceId, title }).then(() => true))) ?? false}
      />
      <TitleDialog
        open={renameDir !== null}
        onOpenChange={(open) => !open && setRenameDir(null)}
        title="Rename Directory"
        label="Name"
        initialValue={renameDir?.title ?? ''}
        submitLabel="Save"
        onSubmit={async (title) =>
          (await withErrorToast(() => renameDirectory({ id: renameDir!._id, title }).then(() => true))) ?? false
        }
      />
      <DeleteConfirmDialog
        open={deleteDir !== null}
        onOpenChange={(open) => !open && setDeleteDir(null)}
        title="Delete Directory"
        description="Documents in this directory are kept and moved back to the top level."
        itemName={deleteDir?.title ?? ''}
        onConfirm={async () => {
          const target = deleteDir!;
          setDeleteDir(null);
          await withErrorToast(() => removeDirectory({ id: target._id }));
        }}
      />
      {dialogs}
    </div>
  );
}
