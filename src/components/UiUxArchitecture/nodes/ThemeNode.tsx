import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, Heading, Text, Flex, Box } from '@radix-ui/themes';
import { Palette } from 'lucide-react';
import { ThemeSpecification } from '../../../types/uiUxArchitecture';

interface ThemeNodeData {
  theme: ThemeSpecification;
  onEdit: () => void;
}

const ThemeNode = memo(({ data }: NodeProps<ThemeNodeData>) => {
  return (
    <Card style={{ width: 300, borderTop: '4px solid var(--accent-9)', borderRadius: '16px 16px 4px 4px' }} onClick={data.onEdit} className="cursor-pointer hover:shadow-md transition-shadow">
      <Flex gap="3" align="center">
        <Box className="p-2 bg-indigo-100 rounded-full text-indigo-600">
          <Palette size={20} />
        </Box>
        <Box>
          <Heading size="3">Theme & Style</Heading>
          <Text size="1" color="gray">Global Design System</Text>
        </Box>
      </Flex>
      
      {data.theme.main.description && (
        <Box mt="2">
          <Text size="1" color="gray" className="italic line-clamp-2">{data.theme.main.description}</Text>
        </Box>
      )}

      <Box mt="3">
        <Flex gap="2" wrap="wrap">
          <Box style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: data.theme.main.colors.primary || '#ccc' }} title="Primary" />
          <Box style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: data.theme.main.colors.secondary || '#ccc' }} title="Secondary" />
          <Box style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: data.theme.main.colors.background || '#ccc' }} title="Background" />
        </Flex>
      </Box>

      {/* Source handle to connect to pages if needed */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-500" />
    </Card>
  );
});

export default ThemeNode;
