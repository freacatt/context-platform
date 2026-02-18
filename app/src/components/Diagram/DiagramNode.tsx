import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { DiagramNodeData } from '../../types';

const DiagramNode = ({ data, selected }: NodeProps<DiagramNodeData>) => {
  return (
    <div 
      className={`bg-white rounded-lg shadow-sm p-4 min-w-[180px] text-center transition-all duration-200
        ${selected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-800'}
      `}
      style={{
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: selected ? undefined : (data as any).borderColor || '#1f2937' // Default gray-800
      }}
    >
      {/* Title */}
      <div className="font-bold text-gray-900 truncate">{data.title}</div>
      
      {/* Description Preview (optional) */}
      {data.description && (
        <div className="text-xs text-gray-600 mt-1 max-w-[200px] mx-auto">
          {(data.description.length > 50 ? (data.description.slice(0, 50) + '…') : data.description)}
        </div>
      )}

      {/* Target Handles (4 sides) */}
      <Handle type="target" position={Position.Top} id="t-top" className="!w-3 !h-3 !bg-indigo-100 !border !border-indigo-400" />
      <Handle type="target" position={Position.Right} id="t-right" className="!w-3 !h-3 !bg-indigo-100 !border !border-indigo-400" />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="!w-3 !h-3 !bg-indigo-100 !border !border-indigo-400" />
      <Handle type="target" position={Position.Left} id="t-left" className="!w-3 !h-3 !bg-indigo-100 !border !border-indigo-400" />

      {/* Source Handles (4 buttons) */}
      {/* Top */}
      <Handle 
        type="source" 
        position={Position.Top} 
        id="top"
        className="!w-3 !h-3 !bg-white !border-2 !border-indigo-500 z-10 hover:!bg-indigo-500 transition-colors" 
      />
      {/* Right */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right"
        className="!w-3 !h-3 !bg-white !border-2 !border-indigo-500 z-10 hover:!bg-indigo-500 transition-colors" 
      />
      {/* Bottom */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom"
        className="!w-3 !h-3 !bg-white !border-2 !border-indigo-500 z-10 hover:!bg-indigo-500 transition-colors" 
      />
      {/* Left */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left"
        className="!w-3 !h-3 !bg-white !border-2 !border-indigo-500 z-10 hover:!bg-indigo-500 transition-colors" 
      />
    </div>
  );
};

export default memo(DiagramNode);
