import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, Heading, Text, Flex, Box, Badge } from '@radix-ui/themes';
import { Component } from 'lucide-react';
import { BaseComponent } from '../../../types/uiUxArchitecture';

interface ComponentNodeData {
  component: BaseComponent;
  onEdit: () => void;
}

const ComponentNode = memo(({ data }: NodeProps<ComponentNodeData>) => {
  return (
    <Card style={{ width: 220, borderTop: '4px solid var(--orange-9)' }} onClick={data.onEdit} className="cursor-pointer hover:shadow-md transition-shadow">
      <Flex gap="3" align="center">
        <Box className="p-2 bg-orange-100 rounded-full text-orange-600">
          <Component size={20} />
        </Box>
        <Box>
          <Heading size="3">{data.component.main.name || 'New Component'}</Heading>
          <Text size="1" color="gray">{data.component.type}</Text>
        </Box>
      </Flex>
      
      {data.component.main.category && (
        <Badge color="orange" size="1" mt="2">
          {data.component.main.category}
        </Badge>
      )}

      {data.component.main.description && (
        <Box mt="2">
          <Text size="1" color="gray" className="line-clamp-2">{data.component.main.description}</Text>
        </Box>
      )}

      {/* Components might be used in pages, so source handle */}
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-orange-500" />
    </Card>
  );
});

export default ComponentNode;
