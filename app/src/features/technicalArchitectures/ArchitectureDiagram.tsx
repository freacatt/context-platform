import { useMemo } from 'react';
import ReactFlow, { Background, Controls, Handle, MarkerType, Position, type Edge, type Node, type NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';
import { COMPONENT_KINDS, componentLevels, type ArchComponent } from '@shared/specs/technicalArchitecture';
import { KIND_ICONS, KIND_TONES } from './kindStyles';

type ComponentNodeData = { component: ArchComponent };

function ComponentNode({ data }: NodeProps<ComponentNodeData>) {
  const c = data.component;
  const Icon = KIND_ICONS[c.kind];
  return (
    <div className={`w-56 rounded-xl border-2 bg-background px-3 py-2 shadow-sm ${KIND_TONES[c.kind]}`}>
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <div className="flex items-center gap-2">
        <Icon size={16} className="shrink-0" />
        <span className="truncate font-semibold text-foreground">{c.name || 'Unnamed'}</span>
      </div>
      <p className="mt-0.5 truncate text-xs">
        {COMPONENT_KINDS.labels[c.kind]}
        {c.technology && ` · ${c.technology}`}
      </p>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  );
}

const nodeTypes = { component: ComponentNode };

const COLUMN = 300;
const ROW = 100;

/** Components laid out left to right by dependency depth; click a node to edit it. */
export function ArchitectureDiagram({ components, onSelect }: { components: ArchComponent[]; onSelect?: (id: string) => void }) {
  const { nodes, edges } = useMemo(() => {
    const levels = componentLevels(components);
    const rows = new Map<number, number>();
    const nodes: Node<ComponentNodeData>[] = components.map((component) => {
      const level = levels.get(component.id) ?? 0;
      const row = rows.get(level) ?? 0;
      rows.set(level, row + 1);
      return { id: component.id, type: 'component', position: { x: level * COLUMN, y: row * ROW }, data: { component }, draggable: false };
    });
    const ids = new Set(components.map((c) => c.id));
    const edges: Edge[] = components.flatMap((c) =>
      c.dependsOn
        .filter((d) => ids.has(d.to) && d.to !== c.id)
        .map((d) => ({
          id: `${c.id}-${d.id}`,
          source: c.id,
          target: d.to,
          label: d.via || undefined,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 4,
        })),
    );
    return { nodes, edges };
  }, [components]);

  return (
    <div className="h-[460px] rounded-xl border bg-muted/20" data-testid="architecture-diagram">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesConnectable={false}
        onNodeClick={(_event, node) => onSelect?.(node.id)}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
