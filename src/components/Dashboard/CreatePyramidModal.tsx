import React, { useState } from 'react';
import { Dialog, Button, Flex, Text, TextField } from '@radix-ui/themes';
import { Plus } from 'lucide-react';
import { createPyramid } from '../../services/pyramidService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CreatePyramidModal: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;
    
    setLoading(true);
    try {
      const pyramidId = await createPyramid(user.uid, title);
      setOpen(false);
      // Reset state
      setTitle('');
      
      // Small delay to allow modal to close visually before navigating
      setTimeout(() => {
        navigate(`/pyramid/${pyramidId}`);
      }, 100);
    } catch (error) {
      console.error(error);
      alert('Failed to create pyramid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button size="2">
          <Plus size={16} /> New Pyramid
        </Button>
      </Dialog.Trigger>

      <Dialog.Content aria-describedby="pyramid-desc" aria-labelledby="pyramid-title" style={{ maxWidth: 450 }}>
        <Dialog.Title id="pyramid-title">Create New Pyramid</Dialog.Title>
        <Dialog.Description id="pyramid-desc" size="2" mb="4">
          Start a new problem-solving session.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Pyramid Title <Text color="red">*</Text>
            </Text>
            <TextField.Root
              placeholder="e.g., Q3 Sales Strategy"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button onClick={handleSubmit} disabled={!title.trim() || loading}>
            {loading ? 'Creating...' : 'Create Pyramid'}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default CreatePyramidModal;
