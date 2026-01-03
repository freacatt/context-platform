import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Box, Flex, Text, Button, IconButton, TextField, TextArea, DropdownMenu } from '@radix-ui/themes';
import { ArrowLeft, Save, Download, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getContextDocument, updateContextDocument } from '../services/contextDocumentService';
import { exportContextToExcel, exportContextToMarkdown } from '../services/exportService';
import { ContextDocument } from '../types';

const ContextDocumentEditor: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [document, setDocument] = useState<ContextDocument | null>(null);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!user || !documentId) return;

    const loadData = async () => {
      try {
        const docData = await getContextDocument(documentId);
        setDocument(docData);
        setTitle(docData.title);
        setContent(docData.content || '');
      } catch (error) {
        console.error("Error loading document:", error);
      }
    };

    loadData();
  }, [user, documentId]);

  const handleSave = async () => {
    if (!documentId) return;
    setSaving(true);
    try {
        await updateContextDocument(documentId, {
            title,
            content,
            type: 'text',
        });
        // Update local state to reflect changes if needed
        if (document) {
            setDocument({ ...document, title, content });
        }

    } catch (error) {
        console.error("Failed to save", error);
        alert("Failed to save changes");
    } finally {
        setSaving(false);
    }
  };

  if (!document) {
    return <Flex align="center" justify="center" height="100vh"><Text>Loading...</Text></Flex>;
  }

  return (
    <Flex direction="column" className="h-full bg-white">
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

        <Flex gap="2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="soft" color="gray" className="cursor-pointer">
                <Download size={16} /> Export <ChevronDown size={14} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => exportContextToExcel({...document, title, content})}>
                Excel (.xlsx)
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => exportContextToMarkdown({...document, title, content})}>
                Markdown (.md)
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <Button onClick={handleSave} disabled={saving} color="green" variant="soft">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Flex>
      </Flex>

      <Container size="3" className="flex-grow p-8 overflow-y-auto">
        <Box className="h-full bg-white">
            <TextArea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your context document here..."
                size="3"
                style={{ 
                    minHeight: '600px', 
                    height: '100%',
                    padding: '20px',
                    fontSize: '16px',
                    lineHeight: '1.6',
                    resize: 'none',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none',
                    boxShadow: 'none'
                }}
                className="w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
        </Box>
      </Container>
    </Flex>
  );
};

export default ContextDocumentEditor;
