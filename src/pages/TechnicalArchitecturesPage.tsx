import React, { useEffect, useState } from 'react';
import { Container, Box, Flex, Heading, TextField, Text, Button, Card, IconButton, Dialog } from '@radix-ui/themes';
import { Search, Plus, Server, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserTechnicalArchitectures, createTechnicalArchitecture, deleteTechnicalArchitecture } from '../services/technicalArchitectureService';
import { useNavigate } from 'react-router-dom';
import { TechnicalArchitecture } from '../types';
import AuthenticatedLayout from '../components/Layout/AuthenticatedLayout';

export const TechnicalArchitecturesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [architectures, setArchitectures] = useState<TechnicalArchitecture[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const fetchArchitectures = async () => {
    if (!user) return;
    try {
      const data = await getUserTechnicalArchitectures(user.uid);
      setArchitectures(data);
    } catch (error) {
      console.error("Failed to load technical architectures", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchitectures();
  }, [user]);

  const handleCreate = async () => {
      if (!user || !newTitle.trim()) return;
      setIsCreating(true);
      try {
          const id = await createTechnicalArchitecture(user.uid, newTitle);
          setIsCreateOpen(false);
          setNewTitle('');
          // Navigate to editor
          if (id) {
            navigate(`/technical-architecture/${id}`);
          }
      } catch (error) {
          console.error(error);
          alert("Failed to create architecture");
      } finally {
          setIsCreating(false);
      }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this architecture?")) {
        try {
            await deleteTechnicalArchitecture(id);
            setArchitectures(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            alert("Failed to delete architecture");
        }
    }
  };

  const filteredArchitectures = architectures.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AuthenticatedLayout>
    <Box className="h-full bg-white">
      <Container size="4" className="p-4">
        {/* Header Section */}
        <Flex justify="between" align="center" className="mb-8 mt-6">
          <Box>
            <Heading size="6" className="text-gray-800">Technical Architectures</Heading>
            <Text color="gray" size="2">Define and manage your system architecture standards.</Text>
          </Box>
          
          <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <Dialog.Trigger>
                <Button size="2" variant="solid" color="purple" className="cursor-pointer">
                    <Plus size={16} /> New Architecture
                </Button>
            </Dialog.Trigger>
            <Dialog.Content style={{ maxWidth: 450 }}>
                <Dialog.Title>Create New Technical Architecture</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    Enter a title for your new architecture definition.
                </Dialog.Description>

                <Flex direction="column" gap="3">
                    <label>
                        <Text as="div" size="2" mb="1" weight="bold">
                            Title
                        </Text>
                        <TextField.Root
                            placeholder="e.g. Microservices Architecture"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                        />
                    </label>
                </Flex>

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">
                            Cancel
                        </Button>
                    </Dialog.Close>
                    <Button onClick={handleCreate} disabled={!newTitle.trim() || isCreating} color="purple">
                        {isCreating ? 'Creating...' : 'Create'}
                    </Button>
                </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>

        {/* Filter Bar */}
        <Flex gap="4" className="mb-6">
          <Box className="flex-grow max-w-md">
            <TextField.Root 
              placeholder="Search architectures..." 
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
            <Flex justify="center" py="8"><Text>Loading...</Text></Flex>
        ) : filteredArchitectures.length === 0 ? (
            <Flex direction="column" align="center" justify="center" className="py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <Server size={48} className="text-gray-300 mb-4" />
                <Heading size="4" color="gray">No Architectures Yet</Heading>
                <Text color="gray" className="mb-4">Start by creating your first architecture definition.</Text>
                <Button variant="outline" color="purple" onClick={() => setIsCreateOpen(true)}>
                    Create New Architecture
                </Button>
            </Flex>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArchitectures.map(arch => (
                    <Card key={arch.id} className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500 flex flex-col">
                        <Box className="flex-grow cursor-pointer p-3" onClick={() => navigate(`/technical-architecture/${arch.id}`)}>
                            <Flex direction="column" gap="2">
                                <Heading size="3" className="truncate">{arch.title}</Heading>
                                <Text size="1" color="gray" className="line-clamp-2">
                                    {arch.metadata?.description || "No description provided"}
                                </Text>
                            </Flex>
                        </Box>
                        <Flex justify="end" p="2" className="border-t border-gray-100">
                             <IconButton size="1" variant="ghost" color="red" onClick={(e) => handleDelete(arch.id, e)} className="cursor-pointer">
                                <Trash2 size={14} />
                            </IconButton>
                        </Flex>
                    </Card>
                ))}
            </div>
        )}
      </Container>
    </Box>
    </AuthenticatedLayout>
  );
};
