import React from 'react';
import { Grid, Text, Flex } from '@radix-ui/themes';
import PyramidCard from './PyramidCard';
import { Pyramid } from '../../types';

interface PyramidListProps {
  pyramids: Pyramid[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  loading?: boolean;
}

const PyramidList: React.FC<PyramidListProps> = ({ pyramids, onDelete, onDuplicate, loading }) => {
  if (loading) {
     // Optional: Add a skeleton loader or similar if desired.
     // For now just returning null or maybe a loading text
     return null; 
  }

  if (!pyramids || pyramids.length === 0) {
    return (
      <Flex direction="column" align="center" justify="center" className="py-20 text-muted bg-surface rounded-lg border border-dashed border-border">
        <Text size="4" weight="bold" className="mb-2">No pyramids found</Text>
        <Text size="2">Create your first pyramid to get started!</Text>
      </Flex>
    );
  }

  return (
    <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4" width="auto">
      {pyramids.map((pyramid) => (
        <PyramidCard 
          key={pyramid.id} 
          pyramid={pyramid} 
          onDelete={onDelete} 
          onDuplicate={onDuplicate}
        />
      ))}
    </Grid>
  );
};

export default PyramidList;
