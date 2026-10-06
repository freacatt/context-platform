import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { DiagramNodeData } from '@shared/types/diagram';

const DEFAULT_BORDER = '#1f2937';
const SIDES = [
  { position: Position.Top, id: 'top' },
  { position: Position.Right, id: 'right' },
  { position: Position.Bottom, id: 'bottom' },
  { position: Position.Left, id: 'left' },
];

function DiagramNode({ data, selected }: NodeProps<DiagramNodeData>) {
  const preview = data.description.length > 50 ? `${data.description.slice(0, 50)}…` : data.description;
  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-4 min-w-[180px] text-center transition-all duration-200 ${
        selected ? 'border-indigo-500 ring-2 ring-indigo-200' : ''
      }`}
      style={{ borderWidth: 2, borderStyle: 'solid', borderColor: selected ? undefined : data.borderColor || DEFAULT_BORDER }}
    >
      <div className="font-bold text-gray-900 truncate">{data.title}</div>
      {preview && <div className="text-xs text-gray-600 mt-1 max-w-[200px] mx-auto">{preview}</div>}
      {SIDES.map(({ position, id }) => (
        <Handle
          key={`t-${id}`}
          type="target"
          position={position}
          id={`t-${id}`}
          className="!w-3 !h-3 !bg-indigo-100 !border !border-indigo-400"
        />
      ))}
      {SIDES.map(({ position, id }) => (
        <Handle
          key={id}
          type="source"
          position={position}
          id={id}
          className="!w-3 !h-3 !bg-white !border-2 !border-indigo-500 z-10 hover:!bg-indigo-500 transition-colors"
        />
      ))}
    </div>
  );
}

export default memo(DiagramNode);
