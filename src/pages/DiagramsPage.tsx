import React, { useEffect, useState } from 'react';
import { Container, Box, Flex, Heading, TextField, Text, Dialog, Button, Grid, Card, IconButton, DropdownMenu } from '@radix-ui/themes';
import { Search, Plus, MoreVertical, Trash2, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Diagram } from '../types';
import { getUserDiagrams, createDiagram, deleteDiagram } from '../services/diagramService';

const DiagramsPage: React.FC = () => {
  const { user } = useAuth();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Create Modal State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const navigate = useNavigate();

  const fetchDiagrams = async () => {
    if (!user) return;
    try {
      const data = await getUserDiagrams(user.uid);
      setDiagrams(data);
    } catch (error) {
      console.error("Failed to load diagrams", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagrams();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this diagram?")) return;
    try {
      await deleteDiagram(id);
      setDiagrams(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      alert("Failed to delete diagram");
    }
  };

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return;
    setIsCreating(true);
    try {
      const id = await createDiagram(user.uid, newTitle);
      if (id) {
        setCreateDialogOpen(false);
        setNewTitle("");
        navigate(`/diagram/${id}`);
      }
    } catch (error) {
      console.error("Failed to create diagram", error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredDiagrams = diagrams
    .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
        const dateA = a.lastModified instanceof Date ? a.lastModified : new Date(a.lastModified || 0);
        const dateB = b.lastModified instanceof Date ? b.lastModified : new Date(b.lastModified || 0);
        return dateB.getTime() - dateA.getTime();
    });

  return (
    <Box className="min-h-screen bg-gray-50">
      <Container size="4" className="p-4">
        {/* Header Section */}
        <Flex justify="between" align="center" className="mb-8 mt-6">
          <Heading size="6" className="text-gray-900">My Diagrams</Heading>
          
          <Dialog.Root open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <Dialog.Trigger>
              <Button size="2" className="cursor-pointer">
                <Plus size={16} /> New Diagram
              </Button>
            </Dialog.Trigger>

            <Dialog.Content style={{ maxWidth: 450 }}>
              <Dialog.Title>Create New Diagram</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                Start a new visual diagram.
              </Dialog.Description>

              <Flex direction="column" gap="3">
                <label>
                  <Text as="div" size="2" mb="1" weight="bold">
                    Title <Text color="red">*</Text>
                  </Text>
                  <TextField.Root
                    placeholder="e.g., System Flow"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </label>
              </Flex>

              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray" className="cursor-pointer">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button onClick={handleCreate} disabled={!newTitle.trim() || isCreating} className="cursor-pointer">
                  {isCreating ? 'Creating...' : 'Create Diagram'}
                </Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>

        {/* Filter Bar */}
        <Flex gap="4" className="mb-6">
          <Box className="flex-grow">
            <TextField.Root 
              placeholder="Search diagrams..." 
              size="2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            >
              <TextField.Slot>
                <Search size={16} />
              </TextField.Slot>
            </TextField.Root>
          </Box>
        </Flex>

        {/* List Section */}
        {loading ? (
            <Text>Loading...</Text>
        ) : filteredDiagrams.length === 0 ? (
            <Flex direction="column" align="center" justify="center" className="py-20 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                <Text size="4" weight="bold" className="mb-2">No diagrams found</Text>
                <Text size="2">Create your first diagram to get started!</Text>
            </Flex>
        ) : (
            <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4">
                {filteredDiagrams.map(diagram => (
                    <Card key={diagram.id} className="cursor-pointer relative group h-full flex flex-col bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all p-4" onClick={() => navigate(`/diagram/${diagram.id}`)}>
                        <Flex direction="column" gap="3" className="h-full">
                            <Flex justify="between" align="start">
                                <Box className="flex-1 min-w-0 pr-2">
                                    <Text size="5" weight="bold" className="block mb-1 truncate text-gray-900">
                                        {diagram.title}
                                    </Text>
                                    <Flex align="center" gap="1">
                                        <Clock size={12} className="text-gray-400" />
                                        <Text size="1" color="gray">
                                            {diagram.lastModified ? new Date(diagram.lastModified).toLocaleDateString() : 'Just now'}
                                        </Text>
                                    </Flex>
                                </Box>
                                <Box onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger>
                                            <IconButton variant="ghost" color="gray" size="1" className="cursor-pointer">
                                                <MoreVertical size={16} />
                                            </IconButton>
                                        </DropdownMenu.Trigger>
                                        <DropdownMenu.Content>
                                            <DropdownMenu.Item color="red" onClick={() => handleDelete(diagram.id)} className="cursor-pointer">
                                                <Trash2 size={14} className="mr-2" /> Delete
                                            </DropdownMenu.Item>
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Root>
                                </Box>
                            </Flex>
                            <Flex justify="end" align="center" className="mt-auto pt-2">
                                <Button variant="soft" size="1" className="cursor-pointer">
                                    Open <ArrowRight size={14} />
                                </Button>
                            </Flex>
                        </Flex>
                    </Card>
                ))}
            </Grid>
        )}
      </Container>
    </Box>
  );
};

export default DiagramsPage;
