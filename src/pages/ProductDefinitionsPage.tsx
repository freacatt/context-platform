import React, { useEffect, useState } from 'react';
import { Container, Box, Flex, Heading, TextField, Text, Button, Card, Badge, IconButton, Dialog } from '@radix-ui/themes';
import { Search, Plus, GitMerge, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProductDefinitions, createProductDefinition, deleteProductDefinition } from '../services/productDefinitionService';
import { useNavigate } from 'react-router-dom';
import { ProductDefinition } from '../types';

const ProductDefinitionsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [definitions, setDefinitions] = useState<ProductDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const fetchDefinitions = async () => {
    if (!user) return;
    try {
      const data = await getUserProductDefinitions(user.uid);
      setDefinitions(data);
    } catch (error) {
      console.error("Failed to load product definitions", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefinitions();
  }, [user]);

  const handleCreate = async () => {
      if (!user || !newTitle.trim()) return;
      setIsCreating(true);
      try {
          const id = await createProductDefinition(user.uid, newTitle);
          setIsCreateOpen(false);
          setNewTitle('');
          // Navigate to editor
          navigate(`/product-definition/${id}`);
      } catch (error) {
          console.error(error);
          alert("Failed to create definition");
      } finally {
          setIsCreating(false);
      }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this definition?")) {
        try {
            await deleteProductDefinition(id);
            setDefinitions(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            alert("Failed to delete definition");
        }
    }
  };

  const filteredDefinitions = definitions.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box className="h-full bg-white">
      <Container size="4" className="p-4">
        {/* Header Section */}
        <Flex justify="between" align="center" className="mb-8 mt-6">
          <Box>
            <Heading size="6" className="text-gray-800">Product Definitions</Heading>
            <Text color="gray" size="2">Shape Up your product ideas with structured definitions.</Text>
          </Box>
          
          <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <Dialog.Trigger>
                <Button size="2" variant="solid" color="teal" className="cursor-pointer">
                    <Plus size={16} /> New Definition
                </Button>
            </Dialog.Trigger>
            <Dialog.Content style={{ maxWidth: 450 }}>
                <Dialog.Title>Create New Product Definition</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    Enter a title for your new product definition workspace.
                </Dialog.Description>

                <Flex direction="column" gap="3">
                    <label>
                        <Text as="div" size="2" mb="1" weight="bold">
                            Title
                        </Text>
                        <TextField.Root
                            placeholder="e.g. Mobile App Redesign"
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
                    <Button onClick={handleCreate} disabled={!newTitle.trim() || isCreating} color="teal">
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
              placeholder="Search definitions..." 
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
        ) : filteredDefinitions.length === 0 ? (
            <Flex direction="column" align="center" justify="center" className="py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <GitMerge size={48} className="text-gray-300 mb-4" />
                <Heading size="4" color="gray">No Product Definitions Yet</Heading>
                <Text color="gray" className="mb-4">Start by creating your first definition.</Text>
                <Button variant="outline" color="teal" onClick={() => setIsCreateOpen(true)}>
                    Create New Definition
                </Button>
            </Flex>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDefinitions.map(def => (
                    <Card key={def.id} className="hover:shadow-md transition-shadow border-l-4 border-l-teal-500 flex flex-col">
                        <Box className="flex-grow cursor-pointer p-3" onClick={() => navigate(`/product-definition/${def.id}`)}>
                            <Flex direction="column" gap="2">
                                <Heading size="3" className="truncate">{def.title}</Heading>
                                <Text size="1" color="gray">
                                    Created: {(() => {
                                        if (!def.createdAt) return 'Just now';
                                        const date = def.createdAt instanceof Date ? def.createdAt : new Date(def.createdAt);
                                        return date.toLocaleDateString();
                                    })()}
                                </Text>
                                <Flex gap="2" mt="2">
                                    
                                    {def.linkedPyramidId && <Badge color="indigo" variant="soft">Linked Pyramid</Badge>}
                                </Flex>
                            </Flex>
                        </Box>
                        <Flex justify="end" p="2" className="border-t border-gray-100">
                             <IconButton size="1" variant="ghost" color="red" onClick={(e) => handleDelete(def.id, e)} className="cursor-pointer">
                                <Trash2 size={14} />
                            </IconButton>
                        </Flex>
                    </Card>
                ))}
            </div>
        )}
      </Container>
    </Box>
  );
};

export default ProductDefinitionsPage;
