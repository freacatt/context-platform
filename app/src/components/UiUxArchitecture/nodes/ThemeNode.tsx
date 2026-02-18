import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from "@/components/ui/card";
import { Palette } from 'lucide-react';
import { ThemeSpecification } from '../../../types/uiUxArchitecture';

interface ThemeNodeData {
  theme: ThemeSpecification;
  onEdit: () => void;
}

const ThemeNode = memo(({ data }: NodeProps<ThemeNodeData>) => {
  return (
    <Card 
      style={{ borderTop: '4px solid #6366f1' }} // indigo-500
      onClick={data.onEdit} 
      className="w-[300px] cursor-pointer hover:shadow-md transition-shadow bg-card border-border rounded-t-2xl rounded-b-md"
    >
      <CardContent className="p-4">
        <div className="flex gap-3 items-center">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
            <Palette size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Theme & Style</h3>
            <span className="text-xs text-muted-foreground block">Global Design System</span>
          </div>
        </div>
        
        {data.theme.main.description && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground italic line-clamp-2">{data.theme.main.description}</p>
          </div>
        )}

        <div className="mt-3">
          <div className="flex gap-2 flex-wrap">
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: data.theme.main.colors.primary || '#ccc' }} title="Primary" />
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: data.theme.main.colors.secondary || '#ccc' }} title="Secondary" />
            <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: data.theme.main.colors.background || '#ccc' }} title="Background" />
          </div>
        </div>

        {/* Source handle to connect to pages if needed */}
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-500" />
      </CardContent>
    </Card>
  );
});

export default ThemeNode;
