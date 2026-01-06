import React, { useEffect, useState } from 'react';
import { Container, Box, Flex, Heading, TextField, Text, Button, Card, IconButton, Dialog, DropdownMenu } from '@radix-ui/themes';
import { Plus, Trash2, FileText, Edit2, Folder, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserContextDocuments, createContextDocument, deleteContextDocument, renameContextDocument, assignContextDocumentToDirectory } from '../services/contextDocumentService';
import { getUserDirectories, createDirectory } from '../services/directoryService';
import { Link, useNavigate } from 'react-router-dom';
import { ContextDocument } from '../types';

const ContextDocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ContextDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [directories, setDirectories] = useState<{ id: string; title: string }[]>([]);
  
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isCreateDirOpen, setIsCreateDirOpen] = useState<boolean>(false);
  const [newDirTitle, setNewDirTitle] = useState<string>('');
  const [isCreatingDir, setIsCreatingDir] = useState<boolean>(false);

  // Rename State
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameNewTitle, setRenameNewTitle] = useState("");

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

  const fetchDirectories = async () => {
    if (!user) return;
    try {
      const data = await getUserDirectories(user.uid);
      setDirectories(data.map(d => ({ id: d.id, title: d.title })));
    } catch (error) {
      console.error("Failed to load directories", error);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  useEffect(() => {
    fetchDirectories();
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

  const handleCreateDirectory = async () => {
    if (!user || !newDirTitle.trim()) return;
    setIsCreatingDir(true);
    try {
      const id = await createDirectory(user.uid, newDirTitle.trim());
      setIsCreateDirOpen(false);
      setNewDirTitle('');
      await fetchDirectories();
    } catch (error) {
      console.error(error);
      alert('Failed to create directory');
    } finally {
      setIsCreatingDir(false);
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

  const handleRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameTargetId(id);
    setRenameNewTitle(currentTitle);
    setRenameDialogOpen(true);
  };

  const confirmRename = async () => {
    if (!renameTargetId || !renameNewTitle.trim()) return;
    try {
      await renameContextDocument(renameTargetId, renameNewTitle);
      setRenameDialogOpen(false);
      fetchDocuments();
    } catch (error) {
      alert("Failed to rename document");
    }
  };

  const assignDirectory = async (docId: string, dirId: string | null) => {
    try {
      await assignContextDocumentToDirectory(docId, dirId);
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, directoryId: dirId } : d));
    } catch (error) {
      alert('Failed to assign directory');
    }
  };

  const filteredDocuments = documents.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box className="h-full flex-grow bg-white">
      <Container size="4" className="p-4">
        {/* Header Section */}
        <Flex justify="between" align="center" className="mb-8 mt-6">
          <Box>
            <Heading size="6" className="text-gray-800">Context & Documents</Heading>
            <Text color="gray" size="2">Create knowledge base documents to use as context for your products.</Text>
          </Box>
          
          <Flex align="center" gap="2">
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

            <Dialog.Root open={isCreateDirOpen} onOpenChange={setIsCreateDirOpen}>
              <Dialog.Trigger>
                <Button 
                  size="2" 
                  variant="solid" 
                  className="cursor-pointer bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 shadow-sm hover:shadow-md transition-all duration-200 rounded-md"
                >
                  <Folder size={16} className="mr-2 text-white" /> New Directory
                </Button>
              </Dialog.Trigger>
              <Dialog.Content style={{ maxWidth: 450 }}>
                <Dialog.Title>Create Directory</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                  Enter a name for the directory.
                </Dialog.Description>
                <Flex direction="column" gap="3">
                  <label>
                    <Text as="div" size="2" mb="1" weight="bold">Name</Text>
                    <TextField.Root
                      placeholder="e.g. Research"
                      value={newDirTitle}
                      onChange={(e) => setNewDirTitle(e.target.value)}
                    />
                  </label>
                  <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                      <Button variant="soft" color="gray">Cancel</Button>
                    </Dialog.Close>
                    <Button onClick={handleCreateDirectory} disabled={isCreatingDir}>
                      {isCreatingDir ? 'Creating...' : 'Create Directory'}
                    </Button>
                  </Flex>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>
          </Flex>
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

        {/* Directories */}
        <Box className="mb-4">
          <Flex gap="2" wrap="wrap">
            {directories.map(dir => (
              <Button 
                key={dir.id} 
                variant="soft" 
                color="indigo" 
                className="cursor-pointer"
                onClick={() => navigate(`/directory/${dir.id}`)}
              >
                <Folder size={14} className="mr-2" /> {dir.title}
              </Button>
            ))}
          </Flex>
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
                        <Flex gap="2" align="center">
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger>
                                <Button variant="soft" color="gray" className="cursor-pointer">
                                  <Folder size={14} className="mr-2" />
                                  {(doc.directoryId && directories.find(d => d.id === doc.directoryId)?.title) || 'No Directory'}
                                  <ChevronDown size={14} className="ml-2" />
                                </Button>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Content>
                                <DropdownMenu.Item onClick={() => assignDirectory(doc.id, null)}>
                                  No Directory
                                </DropdownMenu.Item>
                                {directories.map(dir => (
                                  <DropdownMenu.Item key={dir.id} onClick={() => assignDirectory(doc.id, dir.id)}>
                                    {dir.title}
                                  </DropdownMenu.Item>
                                ))}
                              </DropdownMenu.Content>
                            </DropdownMenu.Root>
                            <IconButton 
                                variant="ghost" 
                                color="gray" 
                                onClick={(e) => handleRename(doc.id, doc.title, e)}
                                className="cursor-pointer hover:bg-gray-50"
                            >
                                <Edit2 size={16} />
                            </IconButton>
                            <IconButton 
                                variant="ghost" 
                                color="red" 
                                onClick={(e) => handleDelete(doc.id, e)}
                                className="cursor-pointer hover:bg-red-50"
                            >
                                <Trash2 size={16} />
                            </IconButton>
                        </Flex>
                    </Flex>
                </Card>
            ))}
            
            {filteredDocuments.length === 0 && (
                <Box className="col-span-full py-12 text-center">
                    <Text color="gray">No documents found. Create one to get started!</Text>
                </Box>
            )}
        </div>

        <Dialog.Root open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <Dialog.Content style={{ maxWidth: 450 }}>
            <Dialog.Title>Rename Document</Dialog.Title>
            <Dialog.Description size="2" mb="4">
              Enter a new title for this document.
            </Dialog.Description>

            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Title
                </Text>
                <TextField.Root
                  value={renameNewTitle}
                  onChange={(e) => setRenameNewTitle(e.target.value)}
                  placeholder="Enter new title"
                />
              </label>
            </Flex>

            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button onClick={confirmRename}>
                Save
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      </Container>
    </Box>
  );
};

export default ContextDocumentsPage;
