import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Component } from 'lucide-react';
import { BaseComponent } from '../../../types/uiUxArchitecture';

interface ComponentNodeData {
  component: BaseComponent;
  onEdit: () => void;
}

const ComponentNode = memo(({ data }: NodeProps<ComponentNodeData>) => {
  return (
    <Card 
      style={{ borderTop: '4px solid #f97316' }} // orange-500
      onClick={data.onEdit} 
      className="w-[220px] cursor-pointer hover:shadow-md transition-shadow bg-card border-border"
    >
      <CardContent className="p-4">
        <div className="flex gap-3 items-center">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
            <Component size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">{data.component.main.name || 'New Component'}</h3>
            <span className="text-xs text-muted-foreground block">{data.component.type}</span>
          </div>
        </div>
        
        {data.component.main.category && (
          <Badge className="mt-2 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/50 dark:text-orange-300 border-none shadow-none">
            {data.component.main.category}
          </Badge>
        )}

        {data.component.main.description && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground line-clamp-2">{data.component.main.description}</p>
          </div>
        )}

        {/* Components might be used in pages, so source handle */}
        <Handle type="source" position={Position.Right} className="w-3 h-3 bg-orange-500" />
      </CardContent>
    </Card>
  );
});

export default ComponentNode;
