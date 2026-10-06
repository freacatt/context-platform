import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Connection, 
  NodeTypes,
  Panel,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Plus, Save, Download, ArrowLeft, Pencil, Check, X, Palette, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { Page } from '@shared/types/uiUxArchitecture';
import { hasLegacyDesign } from '@shared/specs/designSystem';
import type { UiUxArchitecture } from '@/data/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { withErrorToast } from '@/lib/errors';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { exportUiUxArchitectureToMarkdown } from '@/lib/export/uiUxArchitecture';
import { LinksButton } from '@/features/knowledge/LinksButton';

import PageNode from './nodes/PageNode';

import { NewComponentDialog } from './modals/NewComponentDialog';
import { PageModal } from './modals/PageModal';

const NO_DESIGN_SYSTEM = '__none__';

/**
 * The design system the screens are built with: picker, plus a one-click move of a
 * previous-version theme and components into a new design system.
 */
function DesignSystemControl({ architecture, designSystemId, componentCount, onChange }: {
  architecture: UiUxArchitecture;
  designSystemId: Id<'designSystems'> | undefined;
  componentCount: number | undefined;
  onChange: (id: Id<'designSystems'> | undefined) => void;
}) {
  const wp = useWorkspacePath();
  const systems = useQuery(api.designSystems.list, { workspaceId: architecture.workspaceId });
  const setDesignSystem = useMutation(api.uiUxArchitectures.setDesignSystem);
  const extract = useMutation(api.uiUxArchitectures.extractDesignSystem);
  const [moving, setMoving] = useState(false);
  const [legacy, setLegacy] = useState(() => hasLegacyDesign(architecture.theme_specification, architecture.base_components));

  const choose = async (value: string) => {
    const next = value === NO_DESIGN_SYSTEM ? undefined : (value as Id<'designSystems'>);
    const ok = await withErrorToast(() => setDesignSystem({ id: architecture._id, designSystemId: next ?? null }), 'Could not set the design system');
    if (ok !== undefined) onChange(next);
  };

  const move = async () => {
    setMoving(true);
    const id = await withErrorToast(() => extract({ id: architecture._id }), 'Could not move the theme');
    setMoving(false);
    if (id) {
      onChange(id);
      setLegacy(false);
      toast.success('Theme and components moved to a new design system');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Palette size={16} className="text-muted-foreground" />
      <Select value={designSystemId ?? NO_DESIGN_SYSTEM} onValueChange={choose}>
        <SelectTrigger aria-label="Design system" className="h-8 w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_DESIGN_SYSTEM}>No design system</SelectItem>
          {(systems ?? []).map((ds) => (
            <SelectItem key={ds._id} value={ds._id}>
              {ds.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {designSystemId && (
        <Link to={wp(`/design-system/${designSystemId}`)} className="text-xs underline text-muted-foreground">
          {componentCount === undefined ? 'Open' : `${componentCount} ${componentCount === 1 ? 'component' : 'components'} · Open`}
        </Link>
      )}
      {legacy && (
        <Button size="sm" variant="secondary" disabled={moving} onClick={move}>
          {moving && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          Move theme & components to a design system
        </Button>
      )}
    </div>
  );
}

interface UiUxArchitectureEditorProps {
  architecture: UiUxArchitecture;
}

const UiUxArchitectureEditorContent: React.FC<UiUxArchitectureEditorProps> = ({ architecture: initialArch }) => {
  const navigate = useNavigate();
  const wp = useWorkspacePath();
  const [architecture, setArchitecture] = useState<UiUxArchitecture>(initialArch);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const updateSections = useMutation(api.uiUxArchitectures.updateSections);
  const rename = useMutation(api.uiUxArchitectures.rename);
  const [edgeToDelete, setEdgeToDelete] = useState<Edge | null>(null);
  const architectureRef = React.useRef(architecture);
  const savedTitleRef = React.useRef(initialArch.title);
  React.useLayoutEffect(() => {
    architectureRef.current = architecture;
  });

  const [designSystemId, setDesignSystemId] = useState(initialArch.designSystemId);
  const designSystem = useQuery(api.designSystems.get, designSystemId ? { id: designSystemId } : 'skip');
  /** Components pages can use: the design system's, and legacy ones until they are moved. */
  const availableComponents = useMemo(
    () => [
      ...(designSystem?.spec.components ?? []).map((c) => ({ id: c.id, name: c.name || 'Untitled component' })),
      ...(architecture.base_components ?? []).map((c) => ({ id: c.component_id, name: c.main?.name || c.component_id })),
    ],
    [designSystem, architecture.base_components],
  );

  // Every edit updates local state; this persists it shortly after the user pauses.
  const { status, schedule, flush } = useDebouncedSave(async () => {
    const arch = architectureRef.current;
    await updateSections({
      id: arch._id,
      sections: {
        ui_ux_architecture_metadata: arch.ui_ux_architecture_metadata,
        pages: arch.pages,
        ux_patterns: arch.ux_patterns,
      },
    });
    if (arch.title.trim() && arch.title !== savedTitleRef.current) {
      await rename({ id: arch._id, title: arch.title });
      savedTitleRef.current = arch.title;
    }
  }, 1500);
  const saving = status === 'saving';

  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    schedule();
  }, [architecture, schedule]);

  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(initialArch.title);

  const handleTitleSave = async () => {
    const newArch = { ...architecture, title: tempTitle };
    setArchitecture(newArch);
    setEditingTitle(false);
  };

  // Modal states
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [componentDialogOpen, setComponentDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);

  const nodeTypes = useMemo<NodeTypes>(() => ({
    pageNode: PageNode,
  }), []);

  // Initialize Nodes and Edges from Architecture Data
  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Page nodes
    architecture.pages.forEach((page, index) => {
      newNodes.push({
        id: page.page_id,
        type: 'pageNode',
        position: page.advanced.editor_metadata || { x: 50 + (index * 300), y: 600 },
        data: {
          page: page,
          onEdit: () => {
            setSelectedPage(page);
            setPageModalOpen(true);
          }
        }
      });

      // Edges from page navigation
      page.main.navigation.forEach((nav, i) => {
        if (nav.to_page_id) {
            newEdges.push({
                id: `e-${page.page_id}-${nav.to_page_id}-${i}`,
                source: page.page_id,
                target: nav.to_page_id,
                sourceHandle: nav.source_handle || null,
                targetHandle: nav.target_handle || null,
                label: nav.user_action || 'navigates',
                animated: true,
            });
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [architecture, setNodes, setEdges]);

  const onConnect = useCallback(async (params: Connection) => {
    
    // Update Architecture Data
    if (params.source && params.target) {
        const newArch = { ...architecture };
        const newPages = [...newArch.pages];
        const sourcePageIndex = newPages.findIndex(p => p.page_id === params.source);
        let changed = false;

        if (sourcePageIndex !== -1) {
            // Check if connection already exists between these two pages (regardless of handles)
            const exists = newPages[sourcePageIndex].main.navigation.some(n => 
              n.to_page_id === params.target
            );
            
            if (!exists) {
                newPages[sourcePageIndex] = {
                    ...newPages[sourcePageIndex],
                    main: {
                        ...newPages[sourcePageIndex].main,
                        navigation: [
                            ...newPages[sourcePageIndex].main.navigation,
                            {
                                to_page_id: params.target!,
                                trigger_element: 'Manual Connection',
                                trigger_type: 'click',
                                condition_description: '',
                                user_action: 'Navigate',
                                source_handle: params.sourceHandle,
                                target_handle: params.targetHandle
                            }
                        ]
                    }
                };
                
                // Only add visual edge if we updated the data
                setEdges((eds) => addEdge({ ...params, label: 'Navigate', animated: true }, eds));
                changed = true;
            } else {
                // Optional: You could update the existing connection's handles here if desired
                // For now, we just ignore the new connection attempt to enforce "one connection"
                console.log("Connection already exists between these pages");
            }
        }
        
        if (changed) {
            newArch.pages = newPages;
            setArchitecture(newArch);
        }
    }
  }, [architecture, setEdges]);

  const onEdgesDelete = useCallback(async (deletedEdges: Edge[]) => {
    const newArch = { ...architecture };
    const newPages = [...newArch.pages];
    let changed = false;

    deletedEdges.forEach(edge => {
        const sourcePageIndex = newPages.findIndex(p => p.page_id === edge.source);
        if (sourcePageIndex !== -1) {
            const originalNav = newPages[sourcePageIndex].main.navigation;
            const newNav = originalNav.filter(n => 
                !(n.to_page_id === edge.target && 
                  (n.source_handle === edge.sourceHandle || (!n.source_handle && !edge.sourceHandle)) &&
                  (n.target_handle === edge.targetHandle || (!n.target_handle && !edge.targetHandle)))
            );
            
            if (originalNav.length !== newNav.length) {
                newPages[sourcePageIndex] = {
                    ...newPages[sourcePageIndex],
                    main: {
                        ...newPages[sourcePageIndex].main,
                        navigation: newNav
                    }
                };
                changed = true;
            }
        }
    });

    if (changed) {
        newArch.pages = newPages;
        setArchitecture(newArch);
    }
  }, [architecture]);

  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setEdgeToDelete(edge);
  }, []);

  // Handle Drag Stop to save positions
  const onNodeDragStop = useCallback(async (_event: React.MouseEvent, node: Node) => {
    const newArch = { ...architecture };
    let changed = false;

    const pageIndex = newArch.pages.findIndex(p => p.page_id === node.id);
    if (pageIndex !== -1) {
        const newPages = [...newArch.pages];
        newPages[pageIndex] = {
            ...newPages[pageIndex],
            advanced: {
                ...newPages[pageIndex].advanced,
                editor_metadata: { x: node.position.x, y: node.position.y }
            }
        };
        newArch.pages = newPages;
        changed = true;
    }

    if (changed) {
        setArchitecture(newArch);
    }
  }, [architecture]);

  const handleSave = () => void flush();

  const handleExport = () => exportUiUxArchitectureToMarkdown(architecture);

  const createNewPage = async () => {
    const newPage: Page = {
        page_id: `page_${crypto.randomUUID().slice(0, 8)}`,
        main: {
            route: '/new-page',
            title: 'New Page',
            layout: 'Default',
            requires_auth: false,
            redirect_if_authenticated: '',
            redirect_if_not_authenticated: '',
            components: [],
            navigation: []
        },
        advanced: {
            meta_title: '',
            meta_description: '',
            data_fetching: { endpoint: '', method: 'GET', cache_ttl: '0' },
            editor_metadata: { x: 100, y: 400 }
        }
    };
    
    const newArch = {
        ...architecture,
        pages: [...architecture.pages, newPage]
    };
    
    setArchitecture(newArch);
    setSelectedPage(newPage);
    setPageModalOpen(true);
  };

  const handlePageSave = async (newPage: Page) => {
    const newArch = {
        ...architecture,
        pages: architecture.pages.map(p => p.page_id === newPage.page_id ? newPage : p)
    };
    
    setArchitecture(newArch);
    setPageModalOpen(false);
    setSelectedPage(null);
  };

  const handlePageDelete = async () => {
    if (selectedPage) {
        const newArch = {
            ...architecture,
            pages: architecture.pages.filter(p => p.page_id !== selectedPage.page_id)
        };
        
        setArchitecture(newArch);
        setPageModalOpen(false);
        setSelectedPage(null);
    }
  };

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 64px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          
          <Panel position="top-left">
            <div className="flex gap-3 items-center bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border shadow-sm">
                <Button variant="ghost" onClick={() => navigate(wp('/ui-ux-architectures'))}>
                    <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
                
                {editingTitle ? (
                  <div className="flex gap-2 items-center">
                    <Input 
                      value={tempTitle} 
                      onChange={e => setTempTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
                      className="h-8"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleTitleSave}>
                      <Check size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => { setTempTitle(architecture.title); setEditingTitle(false); }}>
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center group cursor-pointer" onClick={() => { setTempTitle(architecture.title); setEditingTitle(true); }}>
                    <h2 className="text-lg font-bold">{architecture.title}</h2>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil size={12} />
                    </Button>
                  </div>
                )}
            </div>
          </Panel>

          <Panel position="bottom-center">
            <div className="bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border shadow-sm">
              <DesignSystemControl
                architecture={initialArch}
                designSystemId={designSystemId}
                componentCount={designSystem?.spec.components.length}
                onChange={setDesignSystemId}
              />
            </div>
          </Panel>

          <Panel position="top-right">
            <div className="flex gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border shadow-sm">
                <Button
                  onClick={() => setComponentDialogOpen(true)}
                  disabled={!designSystem}
                  title={designSystem ? `Add a component to ${designSystem.title}` : 'Choose a design system first'}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Plus size={16} className="mr-2" /> New Component
                </Button>
                <Button onClick={createNewPage} className="bg-green-600 hover:bg-green-700">
                    <Plus size={16} className="mr-2" /> New Page
                </Button>
                <LinksButton app="uiUxArchitectures" id={architecture._id} />
                <Button onClick={handleExport} variant="outline">
                    <Download size={16} className="mr-2" /> Export MD
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                    <Save size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save'}
                </Button>
            </div>
          </Panel>
        </ReactFlow>

        {designSystem && (
          <NewComponentDialog
            designSystemId={designSystem._id}
            designSystemTitle={designSystem.title}
            open={componentDialogOpen}
            onOpenChange={setComponentDialogOpen}
          />
        )}

        {pageModalOpen && selectedPage && (
            <PageModal
                key={selectedPage.page_id}
                open={pageModalOpen}
                onOpenChange={setPageModalOpen}
                page={selectedPage}
                availableComponents={availableComponents}
                onSave={handlePageSave}
                onDelete={handlePageDelete}
            />
        )}

        <Dialog open={!!edgeToDelete} onOpenChange={(open) => !open && setEdgeToDelete(null)}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Remove Connection</DialogTitle>
                    <DialogDescription>
                        Do you want to remove this connection?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button variant="destructive" onClick={() => {
                        if (edgeToDelete) {
                            setEdges((edges) => edges.filter((e) => e.id !== edgeToDelete.id));
                            onEdgesDelete([edgeToDelete]);
                            setEdgeToDelete(null);
                        }
                    }}>
                        Remove
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
};

export const UiUxArchitectureEditor = (props: UiUxArchitectureEditorProps) => (
  <ReactFlowProvider>
    <UiUxArchitectureEditorContent {...props} />
  </ReactFlowProvider>
);
