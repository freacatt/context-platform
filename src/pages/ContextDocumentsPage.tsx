import React, { useEffect, useState } from 'react';
import { Container, Box, Flex, Heading, TextField, Text, Button, Card, IconButton, Dialog } from '@radix-ui/themes';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserContextDocuments, createContextDocument, deleteContextDocument } from '../services/contextDocumentService';
import { Link, useNavigate } from 'react-router-dom';
import { ContextDocument } from '../types';

const ContextDocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ContextDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      const data = await getUserContextDocuments(user.uid);
      setDocuments(data);
    } catch (error) {
      console.error("Failed to load documents", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const handleCreate = async () => {
      if (!user || !newTitle.trim()) return;
      setIsCreating(true);
      try {
          const id = await createContextDocument(user.uid, newTitle, 'text');
          setIsCreateOpen(false);
          setNewTitle('');
          if (id) {
              navigate(`/context-document/${id}`);
          }
      } catch (error) {
          console.error(error);
          alert("Failed to create document");
      } finally {
          setIsCreating(false);
      }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this document?")) {
        try {
            await deleteContextDocument(id);
            setDocuments(prev => prev.filter(d => d.id !== id));
        } catch (error) {
            alert("Failed to delete document");
        }
    }
  };

  const filteredDocuments = documents.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box className="h-full bg-white">
      <Container size="4" className="p-4">
        {/* Header Section */}
        <Flex justify="between" align="center" className="mb-8 mt-6">
          <Box>
            <Heading size="6" className="text-gray-800">Context & Documents</Heading>
            <Text color="gray" size="2">Create knowledge base documents to use as context for your products.</Text>
          </Box>
          
          <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <Dialog.Trigger>
              <Button size="2" variant="solid" color="amber" className="cursor-pointer">
                  <Plus size={16} /> New Document
              </Button>
            </Dialog.Trigger>
            <Dialog.Content style={{ maxWidth: 450 }}>
              <Dialog.Title>Create New Context Document</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                  Enter a title for your new document.
              </Dialog.Description>

              <Flex direction="column" gap="3">
                  <label>
                      <Text as="div" size="2" mb="1" weight="bold">
                          Title
                      </Text>
                      <TextField.Root
                          placeholder="e.g. Market Research 2024"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                      />
                  </label>

                  <Flex gap="3" mt="4" justify="end">
                      <Dialog.Close>
                          <Button variant="soft" color="gray">Cancel</Button>
                      </Dialog.Close>
                      <Button onClick={handleCreate} disabled={isCreating}>
                          {isCreating ? 'Creating...' : 'Create Document'}
                      </Button>
                  </Flex>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>

        {/* Search */}
        <Box className="mb-6">
             <TextField.Root
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            >
                <TextField.Slot>
                    {/* Icon can go here */}
                </TextField.Slot>
            </TextField.Root>
        </Box>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map(doc => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow border border-gray-200 flex flex-col">
                    <Link to={`/context-document/${doc.id}`} className="block flex-grow">
                        <Flex direction="column" height="100%" justify="between" p="3">
                            <Box>
                                <Flex align="center" gap="2" mb="2">
                                    <FileText size={20} className="text-amber-500" />
                                    <Heading size="3">{doc.title}</Heading>
                                </Flex>
                                <Text size="2" color="gray" className="line-clamp-3">
                                    {doc.content ? doc.content.substring(0, 100) + '...' : 'No content yet.'}
                                </Text>
                            </Box>
                        </Flex>
                    </Link>
                    <Flex justify="between" align="center" p="3" pt="0" className="border-t border-gray-100 mt-2 pt-2">
                         <Text size="1" color="gray">
                            Last modified: {(() => {
                                if (!doc.lastModified) return '';
                                const date = doc.lastModified instanceof Date ? doc.lastModified : new Date(doc.lastModified);
                                return date.toLocaleDateString();
                            })()}
                        </Text>
                        <IconButton 
                            variant="ghost" 
                            color="red" 
                            onClick={(e) => handleDelete(doc.id, e)}
                            className="cursor-pointer hover:bg-red-50"
                        >
                            <Trash2 size={16} />
                        </IconButton>
                    </Flex>
                </Card>
            ))}
            
            {filteredDocuments.length === 0 && (
                <Box className="col-span-full py-12 text-center">
                    <Text color="gray">No documents found. Create one to get started!</Text>
                </Box>
            )}
        </div>
      </Container>
    </Box>
  );
};

export default ContextDocumentsPage;
