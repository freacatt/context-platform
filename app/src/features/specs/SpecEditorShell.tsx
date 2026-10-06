import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { KnowledgeApp } from '@shared/knowledge/types';
import { SectionSpinner } from '@/components/layout/FullPageSpinner';
import { NotFound } from '@/components/layout/NotFound';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { LinksButton } from '@/features/knowledge/LinksButton';
import { WORKSPACE_APPS } from '@/features/workspaces/apps';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import type { SaveStatus } from '@/hooks/useDebouncedSave';
import { downloadFile, safeFilename } from '@/lib/download';
import { withErrorToast } from '@/lib/errors';
import type { ExportOption } from './exports';


interface Props {
  app: KnowledgeApp;
  id: string;
  title: string;
  onRename: (title: string) => Promise<unknown>;
  status: SaveStatus;
  exports: ExportOption[];
  /** Badges and controls next to the title (status, progress). */
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

const STATUS_TEXT: Record<SaveStatus, string> = { saved: 'All changes saved', pending: 'Saving…', saving: 'Saving…', error: 'Save failed' };

/** Header and frame of every spec editor: back, editable title, save status, links, exports. */
export function SpecEditorShell({ app, id, title, onRename, status, exports, meta, actions, children }: Props) {
  const navigate = useNavigate();
  const wp = useWorkspacePath();
  const info = WORKSPACE_APPS.find((a) => a.key === app)!;
  const Icon = info.icon;
  const [draftTitle, setDraftTitle] = useState(title);

  const commitTitle = async () => {
    const next = draftTitle.trim();
    if (!next) return setDraftTitle(title);
    if (next !== title) await withErrorToast(() => onRename(next), 'Could not rename');
  };

  const runExport = (option: ExportOption) => {
    downloadFile(option.content(), safeFilename(title, option.suffix), option.type);
    toast.success(`Exported ${option.label}`);
  };

  return (
    <div className="w-full px-4 pb-16 md:px-8">
      <div className="sticky top-0 z-10 -mx-4 mb-6 flex md:-mx-8 md:px-8 flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={() => navigate(wp(info.path))}>
          <ArrowLeft size={18} />
        </Button>
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-white ${info.colorClass}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            aria-label="Title"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="h-9 border-none bg-transparent px-1 text-xl font-bold shadow-none focus-visible:ring-1"
          />
          <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
            <span>{info.title}</span>
            <span aria-live="polite">· {STATUS_TEXT[status]}</span>
            {meta}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <LinksButton app={app} id={id} />
          {exports.length === 1 ? (
            <Button variant="outline" onClick={() => runExport(exports[0])}>
              <Download size={16} className="mr-2" /> Export .md
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download size={16} className="mr-2" /> Export <ChevronDown size={14} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {exports.map((option) => (
                  <DropdownMenuItem key={option.label} onClick={() => runExport(option)}>
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Loading and not-found states of an editor route. */
export function EditorRoute<D>({ doc, what, backTo, children }: { doc: D | null | undefined; what: string; backTo: string; children: (doc: D) => ReactNode }) {
  if (doc === undefined) return <SectionSpinner />;
  if (doc === null) return <NotFound what={what} backTo={backTo} />;
  return <>{children(doc)}</>;
}
