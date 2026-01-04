import React, { useEffect, useState } from 'react';
import { Container, Box, Flex, Heading, TextField, Select, Text, Dialog, Button } from '@radix-ui/themes';
import { Search } from 'lucide-react';
import Navbar from '../components/Navbar/Navbar';
import PyramidList from '../components/Dashboard/PyramidList';
import CreatePyramidModal from '../components/Dashboard/CreatePyramidModal';
import { getUserPyramids, deletePyramid, duplicatePyramid, renamePyramid } from '../services/pyramidService';
import { useAuth } from '../contexts/AuthContext';
import { Pyramid } from '../types';

const PyramidsPage: React.FC = () => {
  const { user } = useAuth();
  const [pyramids, setPyramids] = useState<Pyramid[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recent'); // 'recent', 'modified', 'title'

  // Rename State
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameNewTitle, setRenameNewTitle] = useState("");

  const fetchPyramids = async () => {
    if (!user) return;
    try {
      const data = await getUserPyramids(user.uid);
      setPyramids(data);
    } catch (error) {
      console.error("Failed to load pyramids", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPyramids();
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      await deletePyramid(id);
      setPyramids(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      alert("Failed to delete pyramid");
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!user) return;
    try {
      await duplicatePyramid(user.uid, id);
      fetchPyramids(); 
    } catch (error) {
      alert("Failed to duplicate pyramid");
    }
  };

  const handleRename = (id: string, currentTitle: string) => {
    setRenameTargetId(id);
    setRenameNewTitle(currentTitle);
    setRenameDialogOpen(true);
  };

  const confirmRename = async () => {
    if (!renameTargetId || !renameNewTitle.trim()) return;
    try {
      await renamePyramid(renameTargetId, renameNewTitle);
      setRenameDialogOpen(false);
      fetchPyramids();
    } catch (error) {
      alert("Failed to rename pyramid");
    }
  };

  // Filter and Sort Logic
  const filteredPyramids = pyramids
    .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'recent') {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      }
      if (sortBy === 'modified') {
        const dateA = a.lastModified instanceof Date ? a.lastModified : new Date(a.lastModified || 0);
        const dateB = b.lastModified instanceof Date ? b.lastModified : new Date(b.lastModified || 0);
        return dateB.getTime() - dateA.getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

  return (
    <Box className="min-h-screen bg-background">
      <Navbar />
      <Container size="4" className="p-4">
        {/* Header Section */}
        <Flex justify="between" align="center" className="mb-8 mt-6">
          <Heading size="6" className="text-foreground">My Pyramids</Heading>
          <CreatePyramidModal />
        </Flex>

        {/* Filter Bar */}
        <Flex gap="4" className="mb-6 flex-col sm:flex-row">
          <Box className="flex-grow">
            <TextField.Root 
              placeholder="Search pyramids..." 
              size="2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            >
              <TextField.Slot>
                <Search size={16} />
              </TextField.Slot>
            </TextField.Root>
          </Box>
          
          <Box width={{ initial: "100%", sm: "200px" }}>
            <Select.Root value={sortBy} onValueChange={setSortBy}>
              <Select.Trigger className="w-full" />
              <Select.Content>
                <Select.Item value="recent">Recently Created</Select.Item>
                <Select.Item value="modified">Last Modified</Select.Item>
                <Select.Item value="title">Title (A-Z)</Select.Item>
              </Select.Content>
            </Select.Root>
          </Box>
        </Flex>

        {/* List Section */}
        <PyramidList 
          pyramids={filteredPyramids} 
          loading={loading} 
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onRename={handleRename}
        />

        <Dialog.Root open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <Dialog.Content style={{ maxWidth: 450 }}>
            <Dialog.Title>Rename Pyramid</Dialog.Title>
            <Dialog.Description size="2" mb="4">
              Enter a new title for this pyramid.
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

export default PyramidsPage;
