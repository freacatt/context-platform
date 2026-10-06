import { useNavigate } from 'react-router-dom';
import { ChevronDown, Folder, Pencil, Trash2 } from 'lucide-react';
import { CollectionCard } from '@/components/collection/CollectionCard';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { ContextDocument, Directory, Id } from '@/data/types';
import { appPage } from '@/features/workspaces/apps';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { documentPreview } from '@/lib/richText';

interface DocumentCardProps {
  doc: ContextDocument;
  directories: Directory[];
  onMove: (directoryId: Id<'directories'> | null) => void;
  onRename: () => void;
  onDelete: () => void;
}

const { icon, cardIconClassName } = appPage('contextDocuments');

/** A document in the standard collection card, with a preview and its directory. */
export function DocumentCard({ doc, directories, onMove, onRename, onDelete }: DocumentCardProps) {
  const wp = useWorkspacePath();
  const navigate = useNavigate();
  const directoryTitle = directories.find((d) => d._id === doc.directoryId)?.title ?? 'No Directory';

  return (
    <CollectionCard
      title={doc.title}
      timestamp={doc.updatedAt}
      onOpen={() => navigate(wp(`/context-document/${doc._id}`))}
      icon={icon}
      iconClassName={cardIconClassName}
      menu={
        <>
          <DropdownMenuItem onClick={onRename}>
            <Pencil size={14} className="mr-2" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
            <Trash2 size={14} className="mr-2" /> Delete
          </DropdownMenuItem>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{documentPreview(doc.content)}</p>
      <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 max-w-full rounded-full bg-muted/60 px-2.5 text-xs font-normal text-muted-foreground hover:bg-muted"
              aria-label={`Directory of ${doc.title}`}
            >
              <Folder size={12} className="mr-1.5 shrink-0" />
              <span className="truncate">{directoryTitle}</span>
              <ChevronDown size={12} className="ml-1 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onMove(null)}>No Directory</DropdownMenuItem>
            {directories.map((dir) => (
              <DropdownMenuItem key={dir._id} onClick={() => onMove(dir._id)}>
                {dir.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CollectionCard>
  );
}
