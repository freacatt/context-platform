import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { TitleDialog } from '@/components/collection/TitleDialog';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import type { ContextDocument, Id } from '@/data/types';
import { withErrorToast } from '@/lib/errors';

/** Rename / move / delete for document cards, plus the dialogs those actions need. */
export function useDocumentActions() {
  const rename = useMutation(api.contextDocuments.update);
  const move = useMutation(api.contextDocuments.moveToDirectory);
  const remove = useMutation(api.contextDocuments.remove);
  const [renameTarget, setRenameTarget] = useState<ContextDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContextDocument | null>(null);

  const cardActions = (doc: ContextDocument) => ({
    onMove: (directoryId: Id<'directories'> | null) => void withErrorToast(() => move({ id: doc._id, directoryId })),
    onRename: () => setRenameTarget(doc),
    onDelete: () => setDeleteTarget(doc),
  });

  const dialogs = (
    <>
      <TitleDialog
        open={renameTarget !== null}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        title="Rename Document"
        initialValue={renameTarget?.title ?? ''}
        submitLabel="Save"
        onSubmit={async (title) => (await withErrorToast(() => rename({ id: renameTarget!._id, title }).then(() => true))) ?? false}
      />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Document"
        description="This action cannot be undone."
        itemName={deleteTarget?.title ?? ''}
        onConfirm={async () => {
          const target = deleteTarget!;
          setDeleteTarget(null);
          await withErrorToast(() => remove({ id: target._id }));
        }}
      />
    </>
  );

  return { cardActions, dialogs };
}
