import { useMemo, useState, type ReactNode } from 'react';
import { Copy, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { SectionSpinner } from '@/components/layout/FullPageSpinner';
import { withErrorToast } from '@/lib/errors';
import { CollectionCard } from './CollectionCard';
import { CollectionToolbar } from './CollectionToolbar';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';
import { filterAndSort, type SortKey } from './sorting';
import { TitleDialog } from './TitleDialog';

export interface CollectionPageProps<T extends { _id: string }> {
  heading: string;
  description?: string;
  /** Header icon tile and its background class. */
  icon?: LucideIcon;
  iconClassName?: string;
  /** Singular, lower-case name of one item, e.g. "pyramid". */
  noun: string;
  /** undefined while loading. */
  items: T[] | undefined;
  getTitle: (item: T) => string;
  getTimestamp: (item: T) => number;
  timestampLabel?: string;
  onOpen: (item: T) => void;
  onCreate: (title: string) => Promise<unknown>;
  onRename: (item: T, title: string) => Promise<unknown>;
  onDelete: (item: T) => Promise<unknown>;
  onDuplicate?: (item: T) => Promise<unknown>;
  /** Extra fields for the create dialog (the page owns their state). */
  createFields?: ReactNode;
  createDialogClassName?: string;
  createPlaceholder?: string;
  /** Header actions next to the "New" button. */
  actions?: ReactNode;
  emptyIcon?: LucideIcon;
  /** Tint of the icon tile on each card (the card shows `icon`). */
  cardIconClassName?: string;
  /** Shown between the header and the toolbar (e.g. a migration banner). */
  notice?: ReactNode;
  /** Extra content on each card, under the title (status, progress). */
  renderCardBody?: (item: T) => ReactNode;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Standard screen for a workspace collection: header, search, sort, a card grid, and
 * create / rename / duplicate / delete dialogs. Built from the same pieces every feature
 * page uses (PageHeader, CollectionToolbar, CollectionCard, EmptyState).
 */
export function CollectionPage<T extends { _id: string }>({
  heading,
  description,
  icon,
  iconClassName,
  noun,
  items,
  getTitle,
  getTimestamp,
  timestampLabel,
  onOpen,
  onCreate,
  onRename,
  onDelete,
  onDuplicate,
  createFields,
  createDialogClassName,
  createPlaceholder,
  actions,
  emptyIcon,
  cardIconClassName,
  notice,
  renderCardBody,
}: CollectionPageProps<T>) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const Noun = capitalize(noun);

  const visible = useMemo(
    () => items && filterAndSort(items, search, sortBy, getTitle, getTimestamp),
    [items, search, sortBy, getTitle, getTimestamp],
  );

  return (
    <div className="container mx-auto p-4">
      <PageHeader
        title={heading}
        description={description}
        icon={icon}
        iconClassName={iconClassName}
        actions={
          <>
            {actions}
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} className="mr-2" /> New {Noun}
            </Button>
          </>
        }
      />

      {notice}

      <CollectionToolbar nounPlural={`${noun}s`} search={search} onSearchChange={setSearch} sortBy={sortBy} onSortChange={setSortBy} />

      {visible === undefined ? (
        <SectionSpinner />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={search ? `No ${noun}s match "${search}"` : `No ${noun}s yet`}
          actionLabel={search ? undefined : `Create your first ${noun}`}
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((item) => (
            <CollectionCard
              key={item._id}
              title={getTitle(item)}
              timestamp={getTimestamp(item)}
              timestampLabel={timestampLabel}
              onOpen={() => onOpen(item)}
              icon={icon}
              iconClassName={cardIconClassName}
              menu={
                <>
                  <DropdownMenuItem onClick={() => setRenameTarget(item)}>
                    <Pencil size={14} className="mr-2" /> Rename
                  </DropdownMenuItem>
                  {onDuplicate && (
                    <DropdownMenuItem onClick={() => withErrorToast(() => onDuplicate(item))}>
                      <Copy size={14} className="mr-2" /> Duplicate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setDeleteTarget(item)} className="text-red-600 focus:text-red-600">
                    <Trash2 size={14} className="mr-2" /> Delete
                  </DropdownMenuItem>
                </>
              }
            >
              {renderCardBody?.(item)}
            </CollectionCard>
          ))}
        </div>
      )}

      <TitleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={`New ${Noun}`}
        placeholder={createPlaceholder}
        submitLabel="Create"
        className={createDialogClassName}
        onSubmit={async (title) => (await withErrorToast(() => onCreate(title).then(() => true))) ?? false}
      >
        {createFields}
      </TitleDialog>

      <TitleDialog
        open={renameTarget !== null}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        title={`Rename ${Noun}`}
        initialValue={renameTarget ? getTitle(renameTarget) : ''}
        submitLabel="Save"
        onSubmit={async (title) =>
          (await withErrorToast(() => onRename(renameTarget!, title).then(() => true))) ?? false
        }
      />

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${Noun}`}
        description="This action cannot be undone."
        itemName={deleteTarget ? getTitle(deleteTarget) : ''}
        onConfirm={async () => {
          const target = deleteTarget!;
          setDeleteTarget(null);
          await withErrorToast(() => onDelete(target));
        }}
      />
    </div>
  );
}
