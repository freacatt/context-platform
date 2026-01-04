import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, Heading, Text, Flex, Box, Badge, IconButton } from '@radix-ui/themes';
import { Layout, Plus } from 'lucide-react';
import { Page } from '../../../types/uiUxArchitecture';

interface PageNodeData {
  page: Page;
  onEdit: () => void;
  onConnectStart?: () => void;
}

const PageNode = memo(({ data }: NodeProps<PageNodeData>) => {
  return (
    <div className="relative" style={{ width: 260 }}>
      {/* Visual & Interactive Handles placed OUTSIDE the Card structure */}
      
      {/* TOP */}
      <div className="absolute -top-[18px] left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
         <div className="bg-green-600 rounded-t-full w-[40px] h-[18px] flex items-center justify-center shadow-md border-2 border-white">
             <Plus size={14} color="white" className="mb-0.5" />
         </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Top} 
        id="top" 
        style={{ width: 40, height: 18, top: -18, left: '50%', transform: 'translateX(-50%)', borderRadius: '50% 50% 0 0', background: 'transparent', border: 'none', cursor: 'crosshair', zIndex: 60 }} 
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        id="target-top" 
        style={{ width: 12, height: 12, top: -6, left: '50%', transform: 'translateX(-50%)', borderRadius: '50%', background: 'var(--green-9)', border: '2px solid white', zIndex: 40 }} 
      />

      {/* RIGHT */}
      <div className="absolute -right-[18px] top-1/2 transform -translate-y-1/2 z-50 pointer-events-none">
         <div className="bg-green-600 rounded-r-full w-[18px] h-[40px] flex items-center justify-center shadow-md border-2 border-white">
             <Plus size={14} color="white" className="ml-0.5" />
         </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        style={{ width: 18, height: 40, right: -18, top: '50%', transform: 'translateY(-50%)', borderRadius: '0 50% 50% 0', background: 'transparent', border: 'none', cursor: 'crosshair', zIndex: 60 }} 
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        id="target-right" 
        style={{ width: 12, height: 12, right: -6, top: '50%', transform: 'translateY(-50%)', borderRadius: '50%', background: 'var(--green-9)', border: '2px solid white', zIndex: 40 }} 
      />

      {/* BOTTOM */}
      <div className="absolute -bottom-[18px] left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
         <div className="bg-green-600 rounded-b-full w-[40px] h-[18px] flex items-center justify-center shadow-md border-2 border-white">
             <Plus size={14} color="white" className="mt-0.5" />
         </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        style={{ width: 40, height: 18, bottom: -18, left: '50%', transform: 'translateX(-50%)', borderRadius: '0 0 50% 50%', background: 'transparent', border: 'none', cursor: 'crosshair', zIndex: 60 }} 
      />
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="target-bottom" 
        style={{ width: 12, height: 12, bottom: -6, left: '50%', transform: 'translateX(-50%)', borderRadius: '50%', background: 'var(--green-9)', border: '2px solid white', zIndex: 40 }} 
      />

      {/* LEFT */}
      <div className="absolute -left-[18px] top-1/2 transform -translate-y-1/2 z-50 pointer-events-none">
         <div className="bg-green-600 rounded-l-full w-[18px] h-[40px] flex items-center justify-center shadow-md border-2 border-white">
             <Plus size={14} color="white" className="mr-0.5" />
         </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left" 
        style={{ width: 18, height: 40, left: -18, top: '50%', transform: 'translateY(-50%)', borderRadius: '50% 0 0 50%', background: 'transparent', border: 'none', cursor: 'crosshair', zIndex: 60 }} 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="target-left" 
        style={{ width: 12, height: 12, left: -6, top: '50%', transform: 'translateY(-50%)', borderRadius: '50%', background: 'var(--green-9)', border: '2px solid white', zIndex: 40 }} 
      />

      <Card 
        style={{ width: '100%', minHeight: 190, border: '2px solid var(--gray-12)', borderRadius: '10px', background: 'var(--color-panel)' }} 
        onClick={data.onEdit} 
        className="cursor-pointer hover:shadow-lg transition-shadow relative z-10"
      >
        <Flex gap="3" align="center" className="mb-2">
          <Box className="p-2 bg-green-100 rounded-full text-green-600">
            <Layout size={20} />
          </Box>
          <Box>
            <Heading size="3">{data.page.main.title || 'New Page'}</Heading>
            <Text size="1" color="gray">{data.page.main.route}</Text>
          </Box>
        </Flex>
        
        <Flex gap="2" mt="3" wrap="wrap">
          <Badge color="blue" size="1">
            {data.page.main.layout || 'Default Layout'}
          </Badge>
          {data.page.main.requires_auth && (
            <Badge color="red" size="1">Auth Required</Badge>
          )}
        </Flex>

        {data.page.main.condition && (
          <Box mt="2" className="p-1 bg-yellow-50 border border-yellow-200 rounded">
            <Text size="1" color="amber" weight="bold">Condition:</Text>
            <Text size="1" color="gray" className="line-clamp-2">{data.page.main.condition}</Text>
          </Box>
        )}

        {data.page.main.description && (
          <Box mt="2">
            <Text size="1" color="gray" className="line-clamp-3">{data.page.main.description}</Text>
          </Box>
        )}

        <Text size="1" color="gray" mt="auto" className="pt-2 block">
          {data.page.main.components.length} Components
        </Text>
      </Card>
    </div>
  );
});

export default PageNode;
