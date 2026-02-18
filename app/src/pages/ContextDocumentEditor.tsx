import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Download, ChevronDown, Folder } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getContextDocument, updateContextDocument, assignContextDocumentToDirectory } from '../services/contextDocumentService';
import { exportContextToExcel, exportContextToMarkdown } from '../services/exportService';
import { ContextDocument } from '../types';
import { getUserDirectories } from '../services/directoryService';
import { Editor } from '../components/blocks/editor-x/editor';
import { SerializedEditorState, $getRoot } from 'lexical';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ContextDocumentEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const documentId = id;
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [document, setDocument] = useState<ContextDocument | null>(null);
  const [title, setTitle] = useState<string>('');
  // We'll store the serialized state object here
  const [editorState, setEditorState] = useState<SerializedEditorState | undefined>(undefined);
  // Store plain text for export
  const [plainText, setPlainText] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [directories, setDirectories] = useState<{ id: string; title: string }[]>([]);

  // Helper to convert plain text or JSON string to SerializedEditorState
  const parseContent = (content: string): SerializedEditorState => {
    if (!content) {
      setPlainText('');
      // Return a default empty state
      return {
        root: {
          children: [
            {
              children: [],
              direction: "ltr",
              format: "",
              indent: 0,
              type: "paragraph",
              version: 1
            }
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "root",
          version: 1
        }
      } as unknown as SerializedEditorState;
    }

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      if (parsed && parsed.root) {
        // We can't easily extract text from JSON here without an editor instance
        // So plainText might be empty initially for JSON content until edited
        return parsed;
      }
      throw new Error("Not a valid Lexical state");
    } catch (e) {
      // Fallback: treat as plain text
      setPlainText(content);
      return {
        root: {
          children: [
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: "normal",
                  style: "",
                  text: content,
                  type: "text",
                  version: 1
                }
              ],
              direction: "ltr",
              format: "",
              indent: 0,
              type: "paragraph",
              version: 1
            }
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "root",
          version: 1
        }
      } as unknown as SerializedEditorState;
    }
  };

  useEffect(() => {
    if (!user || !documentId) return;

    const loadData = async () => {
      try {
        const docData = await getContextDocument(documentId);
        setDocument(docData);
        setTitle(docData.title);
        setEditorState(parseContent(docData.content || ''));
      } catch (error) {
        console.error("Error loading document:", error);
      }
    };

    loadData();
  }, [user, documentId]);

  useEffect(() => {
    const loadDirs = async () => {
      if (!user) return;
      const data = await getUserDirectories(user.uid);
      setDirectories(data.map(d => ({ id: d.id, title: d.title })));
    };
    loadDirs();
  }, [user]);

  const handleSave = async () => {
    if (!documentId) return;
    setSaving(true);
    try {
        const contentString = JSON.stringify(editorState);
        await updateContextDocument(documentId, {
            title,
            content: contentString,
            type: 'text',
        });
        // Update local state to reflect changes if needed
        if (document) {
            setDocument({ ...document, title, content: contentString });
        }

    } catch (error) {
        console.error("Failed to save", error);
        alert("Failed to save changes");
    } finally {
        setSaving(false);
    }
  };

  const assignDirectory = async (dirId: string | null) => {
    if (!documentId) return;
    try {
      await assignContextDocumentToDirectory(documentId, dirId);
      if (document) setDocument({ ...document, directoryId: dirId });
    } catch (e) {
      alert('Failed to assign directory');
    }
  };

  if (!document || !editorState) {
    return <div className="flex items-center justify-center h-screen"><p>Loading...</p></div>;
  }

  return (
    <div className="flex flex-col h-full flex-grow bg-background">
      <div 
        className="flex justify-between items-center px-6 py-3 border-b border-border bg-background shadow-sm z-10"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/context-documents')}>
            <ArrowLeft size={20} />
          </Button>
          <div>
             <Input
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-bold w-[300px] border-none shadow-none focus-visible:ring-1 bg-transparent"
                placeholder="Document Title"
             />
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="cursor-pointer">
                <Folder size={16} className="mr-2" /> 
                {(document.directoryId && directories.find(d => d.id === document.directoryId)?.title) || 'No Directory'} 
                <ChevronDown size={14} className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => assignDirectory(null)}>
                No Directory
              </DropdownMenuItem>
              {directories.map(dir => (
                <DropdownMenuItem key={dir.id} onClick={() => assignDirectory(dir.id)}>
                  {dir.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="cursor-pointer">
                <Download size={16} className="mr-2" /> Export <ChevronDown size={14} className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportContextToExcel({...document, title, content: plainText || JSON.stringify(editorState)})}>
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportContextToMarkdown({...document, title, content: plainText || JSON.stringify(editorState)})}>
                Markdown (.md)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
            <Save size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="flex-grow flex flex-col p-8 overflow-hidden bg-muted/20">
        <div className="flex-grow flex flex-col h-full max-w-5xl mx-auto w-full">
            <Editor
                key={documentId}
                editorSerializedState={editorState}
                onSerializedChange={(value) => setEditorState(value)}
                onChange={(state) => {
                  state.read(() => {
                    const text = $getRoot().getTextContent();
                    setPlainText(text);
                  });
                }}
            />
            {/* <div>Editor Temporarily Disabled for Debugging</div> */}
        </div>
      </div>
    </div>
  );
};

export default ContextDocumentEditor;
