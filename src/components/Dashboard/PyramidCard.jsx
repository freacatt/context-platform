import React from 'react';
import { Card, Flex, Text, Button, Badge, Box, DropdownMenu, IconButton } from '@radix-ui/themes';
import { Clock, ArrowRight, Trash2, MoreVertical, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PyramidCard = ({ pyramid, onDelete, onDuplicate }) => {
  const navigate = useNavigate();

  const handleOpen = () => {
    navigate(`/pyramid/${pyramid.id}`);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${pyramid.title}"?`)) {
      onDelete(pyramid.id);
    }
  };

  const handleDuplicate = () => {
    onDuplicate(pyramid.id);
  };

  // Format date safely
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    // Handle Firestore Timestamp or standard Date or null
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return 'Just now';
    
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card className="cursor-pointer relative group h-full flex flex-col backdrop-blur-md bg-white/70 border border-white/50 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl ring-1 ring-black/5" onClick={handleOpen}>
      <Flex direction="column" gap="3" className="h-full">
        <Flex justify="between" align="start">
          <Box className="flex-1 min-w-0 pr-2">
            <Text size="5" weight="bold" className="block mb-1 truncate tracking-tight text-gray-900" title={pyramid.title}>
              {pyramid.title}
            </Text>
            <Flex align="center" gap="2">
              <Flex align="center" gap="1">
                <Clock size={12} className="text-gray-400" />
                <Text size="1" color="gray" className="text-gray-500 font-medium">
                  {formatDate(pyramid.createdAt)}
                </Text>
              </Flex>
            </Flex>
          </Box>
          
          <Box onClick={(e) => e.stopPropagation()}>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton variant="ghost" color="gray" size="1">
                  <MoreVertical size={16} />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onClick={handleDuplicate}>
                  <Copy size={14} className="mr-2" /> Duplicate
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item color="red" onClick={handleDelete}>
                  <Trash2 size={14} className="mr-2" /> Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Box>
        </Flex>

        <Flex justify="end" align="center" className="mt-auto pt-2">
          <Button variant="soft" size="1" onClick={(e) => { e.stopPropagation(); handleOpen(); }}>
            Open <ArrowRight size={14} />
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
};

export default PyramidCard;
