import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useNavigate, useParams } from 'react-router-dom';
import type { SerializedEditorState } from 'lexical';
import { ArrowLeft, ChevronDown, Download, Folder, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { Editor } from '@/components/blocks/editor-x/editor';
import { SectionSpinner } from '@/components/layout/FullPageSpinner';
import { NotFound } from '@/components/layout/NotFound';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { ContextDocument } from '@/data/types';
import { useWorkspace, useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { withErrorToast } from '@/lib/errors';
import { exportContextDocumentToExcel, exportContextDocumentToMarkdown } from '@/lib/export/contextDocument';
import { LinksButton } from '@/features/knowledge/LinksButton';
import { toEditorState } from '@/lib/richText';

/**
 * Edits a loaded document. Keeps its own draft of title and content so live
 * updates from the server never overwrite what the user is typing.
 */
function DocumentEditor({ doc }: { doc: ContextDocument }) {
  const { _id: workspaceId } = useWorkspace();
  const wp = useWorkspacePath();
  const navigate = useNavigate();
  const directories = useQuery(api.directories.list, { workspaceId }) ?? [];
  const update = useMutation(api.contextDocuments.update);
  const move = useMutation(api.contextDocuments.moveToDirectory);

  // Keyed per document by the parent, so this runs once per opened document.
  const [initialState] = useState(() => toEditorState(doc.content));
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState<SerializedEditorState>(initialState);
  const [saving, setSaving] = useState(false);

  const draft = { ...doc, title, content: JSON.stringify(content) };
  const directoryTitle = directories.find((d) => d._id === doc.directoryId)?.title ?? 'No Directory';

  const save = async () => {
    setSaving(true);
    const ok = await withErrorToast(() => update({ id: doc._id, title, content: JSON.stringify(content) }), 'Failed to save');
    setSaving(false);
    if (ok !== undefined) toast.success('Saved');
  };

  return (
    <div className="flex flex-col h-full flex-grow bg-background">
      <div className="flex justify-between items-center px-6 py-3 border-b border-border bg-background shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => navigate(wp('/context-documents'))}>
            <ArrowLeft size={20} />
          </Button>
          <Input
            aria-label="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-bold w-[300px] border-none shadow-none focus-visible:ring-1 bg-transparent"
            placeholder="Document Title"
          />
        </div>

        <div className="flex gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                <Folder size={16} className="mr-2" />
                {directoryTitle}
                <ChevronDown size={14} className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => withErrorToast(() => move({ id: doc._id, directoryId: null }))}>
                No Directory
              </DropdownMenuItem>
              {directories.map((dir) => (
                <DropdownMenuItem key={dir._id} onClick={() => withErrorToast(() => move({ id: doc._id, directoryId: dir._id }))}>
                  {dir.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <LinksButton app="contextDocuments" id={doc._id} variant="secondary" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                <Download size={16} className="mr-2" /> Export <ChevronDown size={14} className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportContextDocumentToExcel(draft)}>Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportContextDocumentToMarkdown(draft)}>Markdown (.md)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={save} disabled={saving || !title.trim()} className="bg-green-600 hover:bg-green-700 text-white">
            <Save size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="flex-grow flex flex-col p-8 overflow-hidden bg-muted/20">
        <div className="flex-grow flex flex-col h-full max-w-5xl mx-auto w-full">
          <Editor editorSerializedState={initialState} onSerializedChange={setContent} />
        </div>
      </div>
    </div>
  );
}

export default function ContextDocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const wp = useWorkspacePath();
  const doc = useQuery(api.contextDocuments.get, { id: id! });

  if (doc === undefined) return <SectionSpinner />;
  if (doc === null) return <NotFound what="Document" backTo={wp('/context-documents')} />;
  return <DocumentEditor key={doc._id} doc={doc} />;
}
