import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Flex, Text, Button, IconButton, TextField, DropdownMenu } from '@radix-ui/themes';
import { ArrowLeft, Save, Download, ChevronDown, Folder } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getContextDocument, updateContextDocument, assignContextDocumentToDirectory } from '../services/contextDocumentService';
import { exportContextToExcel, exportContextToMarkdown } from '../services/exportService';
import { ContextDocument } from '../types';
import { getUserDirectories } from '../services/directoryService';
import { Editor } from '../components/blocks/editor-x/editor';
import { SerializedEditorState, $getRoot } from 'lexical';

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
    return <Flex align="center" justify="center" height="100vh"><Text>Loading...</Text></Flex>;
  }

  return (
    <Flex direction="column" className="h-full flex-grow bg-white">
      <Flex 
        justify="between" 
        align="center" 
        className="px-6 py-3 border-b border-gray-200 bg-white shadow-sm z-10"
      >
        <Flex align="center" gap="4">
          <IconButton variant="ghost" onClick={() => navigate('/context-documents')}>
            <ArrowLeft size={20} />
          </IconButton>
          <Box>
             <TextField.Root 
                variant="soft" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                style={{ fontSize: '1.2rem', fontWeight: 'bold', width: '300px' }}
                placeholder="Document Title"
             />
          </Box>
        </Flex>

        <Flex gap="2" align="center">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="soft" color="gray" className="cursor-pointer">
                <Folder size={16} /> {(document.directoryId && directories.find(d => d.id === document.directoryId)?.title) || 'No Directory'} <ChevronDown size={14} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => assignDirectory(null)}>
                No Directory
              </DropdownMenu.Item>
              {directories.map(dir => (
                <DropdownMenu.Item key={dir.id} onClick={() => assignDirectory(dir.id)}>
                  {dir.title}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="soft" color="gray" className="cursor-pointer">
                <Download size={16} /> Export <ChevronDown size={14} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => exportContextToExcel({...document, title, content: plainText || JSON.stringify(editorState)})}>
                Excel (.xlsx)
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => exportContextToMarkdown({...document, title, content: plainText || JSON.stringify(editorState)})}>
                Markdown (.md)
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <Button onClick={handleSave} disabled={saving} color="green" variant="soft">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Flex>
      </Flex>

      <Box className="flex-grow flex flex-col p-8 overflow-hidden bg-gray-50">
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
      </Box>
    </Flex>
  );
};

export default ContextDocumentEditor;
