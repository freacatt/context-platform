import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
         <div className="bg-green-600 rounded-t-full w-[40px] h-[18px] flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800">
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
        style={{ width: 12, height: 12, top: -6, left: '50%', transform: 'translateX(-50%)', borderRadius: '50%', background: '#16a34a', border: '2px solid white', zIndex: 40 }} 
      />

      {/* RIGHT */}
      <div className="absolute -right-[18px] top-1/2 transform -translate-y-1/2 z-50 pointer-events-none">
         <div className="bg-green-600 rounded-r-full w-[18px] h-[40px] flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800">
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
        style={{ width: 12, height: 12, right: -6, top: '50%', transform: 'translateY(-50%)', borderRadius: '50%', background: '#16a34a', border: '2px solid white', zIndex: 40 }} 
      />

      {/* BOTTOM */}
      <div className="absolute -bottom-[18px] left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
         <div className="bg-green-600 rounded-b-full w-[40px] h-[18px] flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800">
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
        style={{ width: 12, height: 12, bottom: -6, left: '50%', transform: 'translateX(-50%)', borderRadius: '50%', background: '#16a34a', border: '2px solid white', zIndex: 40 }} 
      />

      {/* LEFT */}
      <div className="absolute -left-[18px] top-1/2 transform -translate-y-1/2 z-50 pointer-events-none">
         <div className="bg-green-600 rounded-l-full w-[18px] h-[40px] flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800">
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
        style={{ width: 12, height: 12, left: -6, top: '50%', transform: 'translateY(-50%)', borderRadius: '50%', background: '#16a34a', border: '2px solid white', zIndex: 40 }} 
      />

      <Card 
        onClick={data.onEdit} 
        className="w-full min-h-[190px] border-2 border-gray-400 dark:border-gray-600 rounded-[10px] bg-card cursor-pointer hover:shadow-lg transition-shadow relative z-10"
      >
        <CardContent className="p-4 flex flex-col h-full">
            <div className="flex gap-3 items-center mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                <Layout size={20} />
            </div>
            <div>
                <h3 className="font-bold text-lg leading-none">{data.page.main.title || 'New Page'}</h3>
                <span className="text-xs text-muted-foreground">{data.page.main.route}</span>
            </div>
            </div>
            
            <div className="flex gap-2 mt-3 flex-wrap">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                {data.page.main.layout || 'Default Layout'}
            </Badge>
            {data.page.main.requires_auth && (
                <Badge variant="destructive" className="text-xs">Auth Required</Badge>
            )}
            </div>

            {data.page.main.condition && (
            <div className="mt-2 p-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-500 block">Condition:</span>
                <span className="text-xs text-muted-foreground line-clamp-2">{data.page.main.condition}</span>
            </div>
            )}

            {data.page.main.description && (
            <div className="mt-2">
                <p className="text-xs text-muted-foreground line-clamp-3">{data.page.main.description}</p>
            </div>
            )}

            <span className="text-xs text-muted-foreground mt-auto pt-2 block">
            {data.page.main.components.length} Components
            </span>
        </CardContent>
      </Card>
    </div>
  );
});

export default PageNode;
