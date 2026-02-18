import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, addEdge, Connection, Edge, Node, NodeMouseHandler, OnConnect, OnEdgesChange, OnNodesChange, Panel, ReactFlowProvider, useEdgesState, useNodesState, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import { useParams, useNavigate } from 'react-router-dom';
import { getDiagram, updateDiagram } from '../services/diagramService';
import DiagramNode from '../components/Diagram/DiagramNode';
import DiagramBlockModal from '../components/Diagram/DiagramBlockModal';
import { Diagram, DiagramNodeData } from '../types';
import { Plus, Pencil, Check, X, Save, Download, ArrowLeft } from 'lucide-react';
import { fetchContextData } from '../services/contextAdapter';
import { useWorkspace } from '../contexts/WorkspaceContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

const defaultNodeData: DiagramNodeData = {
  title: 'Block',
  description: '',
  contextSources: []
};

const DiagramEditorContent: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentWorkspace } = useWorkspace();
  const { getNodes, getEdges } = useReactFlow();
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<DiagramNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<any>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [activeNode, setActiveNode] = useState<Node<DiagramNodeData> | null>(null);

  const [deleteEdgeConfirmOpen, setDeleteEdgeConfirmOpen] = useState(false);
  const [edgeToDelete, setEdgeToDelete] = useState<Edge | null>(null);

  const [deleteNodeConfirmOpen, setDeleteNodeConfirmOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<Node | null>(null);

  const changesCountRef = React.useRef(0);
  const [unsavedChanges, setUnsavedChanges] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const d = await getDiagram(id);
      if (d) {
        setDiagram(d);
        setTempTitle(d.title);
        setNodes((d.nodes as any[]) || []);
        setEdges((d.edges as any[]) || []);
      }
    };
    load();
  }, [id, setNodes, setEdges]);

  const save = useCallback(async (nextNodes: any[], nextEdges: any[]) => {
    if (!id) return;
    setIsSaving(true);
    await updateDiagram(id, { nodes: nextNodes, edges: nextEdges });
    setIsSaving(false);
    changesCountRef.current = 0;
    setUnsavedChanges(0);
  }, [id]);

  const registerChange = useCallback((nodesToSave?: Node[], edgesToSave?: Edge[]) => {
    changesCountRef.current += 1;
    setUnsavedChanges(changesCountRef.current);
    
    if (changesCountRef.current >= 10) {
      const n = nodesToSave || getNodes();
      const e = edgesToSave || getEdges();
      save(n, e);
    }
  }, [save, getNodes, getEdges]);

  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const handleEdgesChange: OnEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
  }, [onEdgesChange]);

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node, updatedNodes?: Node[]) => {
    // Save the state after drag. Use updatedNodes if provided (v11+), otherwise fallback to current nodes state.
    const currentNodes = updatedNodes || getNodes();
    registerChange(currentNodes, getEdges());
  }, [registerChange, getNodes, getEdges]);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    registerChange(currentNodes.filter(n => !deleted.find(d => d.id === n.id)), currentEdges);
  }, [registerChange, getNodes, getEdges]);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    registerChange(currentNodes, currentEdges.filter(e => !deleted.find(d => d.id === e.id)));
  }, [registerChange, getNodes, getEdges]);

  const onConnect: OnConnect = useCallback((params: Connection) => {
    const direction = params.sourceHandle || '';
    const newEdge: Edge<any> = {
      id: `${params.source}-${params.target}-${Date.now()}`,
      source: params.source!,
      sourceHandle: params.sourceHandle,
      target: params.target!,
      targetHandle: params.targetHandle,
      type: 'default',
      data: { direction }
    };
    setEdges((eds) => {
      const next = addEdge(newEdge, eds);
      registerChange(getNodes(), next);
      return next;
    });
  }, [registerChange, getNodes, setEdges]);

  const handleEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setEdgeToDelete(edge);
    setDeleteEdgeConfirmOpen(true);
  }, []);

  const confirmDeleteEdge = useCallback(() => {
    if (!edgeToDelete) return;
    setEdges((eds) => {
      const next = eds.filter(e => e.id !== edgeToDelete.id);
      registerChange(getNodes(), next);
      return next;
    });
    setDeleteEdgeConfirmOpen(false);
    setEdgeToDelete(null);
  }, [edgeToDelete, getNodes, registerChange, setEdges]);

  const handleDeleteNode = useCallback(() => {
    if (!activeNode) return;
    setNodeToDelete(activeNode);
    setModalOpen(false); // Close the edit modal
    setDeleteNodeConfirmOpen(true);
  }, [activeNode]);

  const confirmDeleteNode = useCallback(() => {
    if (!nodeToDelete) return;
    
    // Remove the node and any connected edges
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    
    const nextNodes = currentNodes.filter(n => n.id !== nodeToDelete.id);
    const nextEdges = currentEdges.filter(e => e.source !== nodeToDelete.id && e.target !== nodeToDelete.id);
    
    setNodes(nextNodes);
    setEdges(nextEdges);
    registerChange(nextNodes, nextEdges);
    
    setDeleteNodeConfirmOpen(false);
    setNodeToDelete(null);
    setActiveNode(null);
  }, [nodeToDelete, getNodes, getEdges, registerChange, setNodes, setEdges]);

  const handleAddNode = useCallback(() => {
    const currentNodes = getNodes();
    const nid = `n-${Date.now()}`;
    const x = 250 + Math.random() * 100;
    const y = 150 + Math.random() * 100;
    const newNode: Node<DiagramNodeData> = {
      id: nid,
      type: 'diagramNode',
      position: { x, y },
      data: { ...defaultNodeData, title: `Block ${currentNodes.length + 1}` }
    };
    setNodes((ns) => {
      const next = [...ns, newNode];
      registerChange(next as any[], getEdges() as any[]);
      return next;
    });
  }, [getNodes, getEdges, setNodes, registerChange]);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setActiveNode(node as Node<DiagramNodeData>);
    setModalOpen(true);
  }, []);

  const outgoingForActive = useMemo(() => {
    if (!activeNode) return [];
    return edges
      .filter(e => e.source === activeNode.id)
      .map(e => {
        const targetNode = nodes.find(n => n.id === e.target);
        return {
          id: e.id,
          title: targetNode?.data?.title || targetNode?.id || e.target,
          direction: (e.data as any)?.direction || e.sourceHandle || ''
        };
      });
  }, [activeNode, edges, nodes]);

  const incomingForActive = useMemo(() => {
    if (!activeNode) return [];
    return edges
      .filter(e => e.target === activeNode.id)
      .map(e => {
        const sourceNode = nodes.find(n => n.id === e.source);
        // Ensure we prefer the title, fallback to "Untitled Block" if node exists but title is empty, or ID if truly unknown
        const displayTitle = sourceNode?.data?.title && sourceNode.data.title.trim() !== '' 
          ? sourceNode.data.title 
          : (sourceNode ? 'Untitled Block' : e.source);
          
        return {
          id: e.id,
          title: displayTitle,
          direction: (e.data as any)?.direction || e.sourceHandle || ''
        };
      });
  }, [activeNode, edges, nodes]);

  const handleSaveNode = (next: { title: string; description: string; borderColor?: string; contextSources?: any[] }) => {
    if (!activeNode) return;
    setNodes((ns) => {
      const nextNodes = ns.map(n => {
        if (n.id !== activeNode.id) return n;
        return {
          ...n,
          data: {
            ...(n.data as any),
            title: next.title,
            description: next.description,
            contextSources: next.contextSources,
            borderColor: next.borderColor
          }
        };
      });
      registerChange(nextNodes, getEdges());
      return nextNodes;
    });
  };

  const handleTitleSave = useCallback(async () => {
    if (!diagram || !id) return;
    const newDiagram = { ...diagram, title: tempTitle };
    setDiagram(newDiagram);
    await updateDiagram(id, { title: tempTitle });
    setEditingTitle(false);
  }, [diagram, id, tempTitle]);

  const handleExportMarkdown = async () => {
    if (!diagram) return;
    setIsExporting(true);
    
    try {
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      
      let md = `# ${diagram.title || 'Untitled Diagram'}\n\n`;
      md += `**ID:** ${diagram.id}\n`;
      md += `**Date:** ${new Date().toLocaleString()}\n\n`;
      
      md += `## Blocks\n\n`;
      
      for (const node of currentNodes) {
        const data = node.data as DiagramNodeData;
        md += `### ${data.title || 'Untitled Block'}\n\n`;
        md += `**Description:**\n${data.description || '(No description)'}\n\n`;
        
        if (data.borderColor) {
          md += `**Border Color:** ${data.borderColor}\n\n`;
        }
        
        // Connections
        const outgoing = currentEdges
          .filter(e => e.source === node.id)
          .map(e => {
            const target = currentNodes.find(n => n.id === e.target);
            const targetTitle = target?.data?.title || 'Unknown Block';
            const dir = (e.data as any)?.direction || e.sourceHandle || 'connection';
            return `- To **${targetTitle}** (${dir})`;
          });
          
        const incoming = currentEdges
          .filter(e => e.target === node.id)
          .map(e => {
            const source = currentNodes.find(n => n.id === e.source);
            const sourceTitle = source?.data?.title || 'Unknown Block';
             const dir = (e.data as any)?.direction || e.sourceHandle || 'connection';
            return `- From **${sourceTitle}** (${dir})`;
          });

        if (outgoing.length > 0 || incoming.length > 0) {
            md += `**Connections:**\n`;
            if (incoming.length > 0) {
                md += `*Incoming:*\n${incoming.join('\n')}\n`;
            }
             if (outgoing.length > 0) {
                md += `*Outgoing:*\n${outgoing.join('\n')}\n`;
            }
            md += `\n`;
        }
        
        // Attachments
        if (data.contextSources && data.contextSources.length > 0) {
          md += `**Attachments:**\n\n`;
          for (const source of data.contextSources) {
            md += `#### Attachment: ${source.title || source.type}\n`;
            md += `*Type: ${source.type}*\n`;
            try {
               const result = await fetchContextData(source);
               if (result.data) {
                   md += "```json\n";
                   md += JSON.stringify(result.data, null, 2);
                   md += "\n```\n\n";
               } else {
                   md += `(No data found or empty)\n\n`;
               }
            } catch (err) {
                md += `(Error loading data: ${err})\n\n`;
            }
          }
        }
        
        md += `---\n\n`;
      }
      
      // Trigger download
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(diagram.title || 'diagram').replace(/\s+/g, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export diagram");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 64px)' }} className="bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />

        <Panel position="top-left">
          <div className="bg-background/80 backdrop-blur p-2 rounded-lg shadow border flex gap-3 items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate('/diagrams')} className="h-8 w-8">
              <ArrowLeft size={16} />
            </Button>
            {editingTitle ? (
              <div className="flex gap-2 items-center">
                <Input
                  value={tempTitle}
                  onChange={e => setTempTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
                  className="h-8 w-[200px]"
                />
                <Button size="icon" variant="secondary" onClick={handleTitleSave} className="h-8 w-8 text-green-600">
                  <Check size={14} />
                </Button>
                <Button size="icon" variant="secondary" onClick={() => { setTempTitle(diagram?.title || 'Diagram'); setEditingTitle(false); }} className="h-8 w-8 text-red-600">
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 items-center group">
                <h3 className="text-lg font-bold text-foreground">{diagram?.title || 'Diagram'}</h3>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => setEditingTitle(true)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil size={12} />
                </Button>
              </div>
            )}
          </div>
        </Panel>

        <Panel position="top-right">
          <div className="flex gap-3">
            <Button
              onClick={handleExportMarkdown}
              variant="secondary"
              disabled={isExporting}
              className="cursor-pointer bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
            >
              <Download size={16} className="mr-1" />
              {isExporting ? 'Exporting...' : 'Export MD'}
            </Button>
            <Button 
              onClick={() => save(getNodes(), getEdges())} 
              variant="secondary"
              disabled={isSaving}
              className="cursor-pointer bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
            >
              <Save size={16} className="mr-1" /> 
              {isSaving ? 'Saving...' : 'Save Diagram'}
              {unsavedChanges > 0 && <span className="ml-2 text-xs opacity-70">({unsavedChanges})</span>}
            </Button>
            <Button onClick={handleAddNode} className="cursor-pointer">
              <Plus size={16} className="mr-1" /> Add Block
            </Button>
          </div>
        </Panel>
      </ReactFlow>

      {activeNode && (
        <DiagramBlockModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={(activeNode.data as any)?.title || 'Block'}
          diagramTitle={diagram?.title || 'Diagram'}
          description={(activeNode.data as any)?.description || ''}
          borderColor={(activeNode.data as any)?.borderColor}
          contextSources={(activeNode.data as any)?.contextSources}
          outgoing={outgoingForActive}
          incoming={incomingForActive}
          onSave={handleSaveNode}
          onDelete={handleDeleteNode}
        />
      )}

      <Dialog open={deleteEdgeConfirmOpen} onOpenChange={setDeleteEdgeConfirmOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Delete Connection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this connection?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={confirmDeleteEdge} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteNodeConfirmOpen} onOpenChange={setDeleteNodeConfirmOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Delete Block</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this block? This action cannot be undone and will remove all connections to this block.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={confirmDeleteNode} variant="destructive">
              Delete Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const DiagramEditorPage: React.FC = () => (
  <ReactFlowProvider>
    <DiagramEditorContent />
  </ReactFlowProvider>
);

export default DiagramEditorPage;