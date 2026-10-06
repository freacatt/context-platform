import { useCallback, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  Panel,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ArrowLeft, Check, Download, Pencil, Plus, X } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { DiagramNodeData } from '@shared/types/diagram';
import { SectionSpinner } from '@/components/layout/FullPageSpinner';
import { NotFound } from '@/components/layout/NotFound';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Diagram } from '@/data/types';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { useDebouncedSave, type SaveStatus } from '@/hooks/useDebouncedSave';
import { withErrorToast } from '@/lib/errors';
import { describeConnections, exportDiagramToMarkdown } from '@/lib/export/diagram';
import { LinksButton } from '@/features/knowledge/LinksButton';
import DiagramBlockModal from './DiagramBlockModal';
import DiagramNode from './DiagramNode';

const nodeTypes = { diagramNode: DiagramNode };

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: 'All changes saved',
  pending: 'Unsaved changes…',
  saving: 'Saving…',
  error: 'Save failed — retrying on next change',
};

function TitleEditor({ diagram }: { diagram: Diagram }) {
  const rename = useMutation(api.diagrams.rename);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(diagram.title);

  const commit = async () => {
    const ok = await withErrorToast(() => rename({ id: diagram._id, title }));
    if (ok !== undefined) setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex gap-2 items-center group">
        <h3 className="text-lg font-bold text-foreground">{diagram.title}</h3>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Rename diagram"
          onClick={() => {
            setTitle(diagram.title);
            setEditing(true);
          }}
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil size={12} />
        </Button>
      </div>
    );
  }
  return (
    <div className="flex gap-2 items-center">
      <Input
        aria-label="Diagram title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="h-8 w-[200px]"
      />
      <Button size="icon" variant="secondary" aria-label="Save title" onClick={commit} className="h-8 w-8 text-green-600">
        <Check size={14} />
      </Button>
      <Button size="icon" variant="secondary" aria-label="Cancel" onClick={() => setEditing(false)} className="h-8 w-8 text-red-600">
        <X size={14} />
      </Button>
    </div>
  );
}

/**
 * The canvas owns node/edge state locally (React Flow needs that for dragging)
 * and autosaves it. It is keyed per diagram, so server echoes of our own saves
 * never reset the canvas mid-edit.
 */
function DiagramCanvas({ diagram }: { diagram: Diagram }) {
  const navigate = useNavigate();
  const wp = useWorkspacePath();
  const { getNodes, getEdges } = useReactFlow<DiagramNodeData>();
  const saveGraph = useMutation(api.diagrams.saveGraph);
  const [nodes, setNodes, onNodesChange] = useNodesState<DiagramNodeData>(diagram.nodes as Node<DiagramNodeData>[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(diagram.edges as Edge[]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [edgeToDelete, setEdgeToDelete] = useState<Edge | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);

  const { status, schedule } = useDebouncedSave(() =>
    saveGraph({ id: diagram._id, nodes: getNodes(), edges: getEdges() }),
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const edge: Edge = {
        id: `${params.source}-${params.target}-${Date.now()}`,
        source: params.source!,
        sourceHandle: params.sourceHandle,
        target: params.target!,
        targetHandle: params.targetHandle,
        type: 'default',
        data: { direction: params.sourceHandle || '' },
      };
      setEdges((eds) => addEdge(edge, eds));
      schedule();
    },
    [setEdges, schedule],
  );

  const addNode = () => {
    const node: Node<DiagramNodeData> = {
      id: `n-${Date.now()}`,
      type: 'diagramNode',
      position: { x: 250 + Math.random() * 100, y: 150 + Math.random() * 100 },
      data: { title: `Block ${getNodes().length + 1}`, description: '' },
    };
    setNodes((ns) => [...ns, node]);
    schedule();
  };

  const updateNode = (id: string, data: DiagramNodeData) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)));
    schedule();
  };

  const deleteNode = (id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    schedule();
  };

  const active = nodes.find((n) => n.id === activeId);
  const connections = active ? describeConnections(active.id, nodes, edges) : null;

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 64px)' }} className="bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={schedule}
        onNodesDelete={schedule}
        onEdgesDelete={schedule}
        onNodeClick={(_, node) => setActiveId(node.id)}
        onEdgeDoubleClick={(event, edge) => {
          event.stopPropagation();
          setEdgeToDelete(edge);
        }}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <Panel position="top-left">
          <div className="bg-background/80 backdrop-blur p-2 rounded-lg shadow border flex gap-3 items-center">
            <Button variant="ghost" size="icon" aria-label="Back" onClick={() => navigate(wp('/diagrams'))} className="h-8 w-8">
              <ArrowLeft size={16} />
            </Button>
            <TitleEditor diagram={diagram} />
            <span className="text-xs text-muted-foreground" role="status">
              {STATUS_LABEL[status]}
            </span>
          </div>
        </Panel>
        <Panel position="top-right">
          <div className="flex gap-3">
            <LinksButton app="diagrams" id={diagram._id} variant="secondary" />
            <Button variant="secondary" onClick={() => exportDiagramToMarkdown(diagram.title, getNodes(), getEdges())}>
              <Download size={16} className="mr-1" /> Export MD
            </Button>
            <Button onClick={addNode}>
              <Plus size={16} className="mr-1" /> Add Block
            </Button>
          </div>
        </Panel>
      </ReactFlow>

      {active && connections && (
        <DiagramBlockModal
          key={active.id}
          data={active.data}
          outgoing={connections.outgoing}
          incoming={connections.incoming}
          onClose={() => setActiveId(null)}
          onSave={(data) => updateNode(active.id, data)}
          onDelete={() => {
            setActiveId(null);
            setNodeToDelete(active.id);
          }}
        />
      )}

      <ConfirmDialog
        open={edgeToDelete !== null}
        onOpenChange={(open) => !open && setEdgeToDelete(null)}
        title="Delete Connection"
        description="Are you sure you want to delete this connection?"
        confirmLabel="Delete"
        onConfirm={() => {
          setEdges((es) => es.filter((e) => e.id !== edgeToDelete?.id));
          setEdgeToDelete(null);
          schedule();
        }}
      />
      <ConfirmDialog
        open={nodeToDelete !== null}
        onOpenChange={(open) => !open && setNodeToDelete(null)}
        title="Delete Block"
        description="This removes the block and all of its connections."
        confirmLabel="Delete Block"
        onConfirm={() => {
          if (nodeToDelete) deleteNode(nodeToDelete);
          setNodeToDelete(null);
        }}
      />
    </div>
  );
}

function ConfirmDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={props.onConfirm} variant="destructive">
            {props.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DiagramEditorPage() {
  const { id } = useParams<{ id: string }>();
  const wp = useWorkspacePath();
  const diagram = useQuery(api.diagrams.get, { id: id! });

  if (diagram === undefined) return <SectionSpinner />;
  if (diagram === null) return <NotFound what="Diagram" backTo={wp('/diagrams')} />;
  return (
    <ReactFlowProvider>
      <DiagramCanvas key={diagram._id} diagram={diagram} />
    </ReactFlowProvider>
  );
}
