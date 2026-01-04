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
import { Button, Flex, Heading, Text, Box, TextField, IconButton, Dialog } from '@radix-ui/themes';
import { Plus, Save, Download, ArrowLeft, Pencil, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import { UiUxArchitecture, Page, BaseComponent, ThemeSpecification } from '../../types/uiUxArchitecture';
import { updateUiUxArchitecture, generateUiUxMarkdown } from '../../services/uiUxArchitectureService';

import ThemeNode from './nodes/ThemeNode';
import ComponentNode from './nodes/ComponentNode';
import PageNode from './nodes/PageNode';

import { ThemeModal } from './modals/ThemeModal';
import { ComponentModal } from './modals/ComponentModal';
import { PageModal } from './modals/PageModal';

interface UiUxArchitectureEditorProps {
  architecture: UiUxArchitecture;
}

const UiUxArchitectureEditorContent: React.FC<UiUxArchitectureEditorProps> = ({ architecture: initialArch }) => {
  const navigate = useNavigate();
  const [architecture, setArchitecture] = useState<UiUxArchitecture>(initialArch);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [saving, setSaving] = useState(false);
  const [edgeToDelete, setEdgeToDelete] = useState<Edge | null>(null);
  const hasUnsavedChanges = React.useRef(false);
  const isFirstRender = React.useRef(true);
  const isSavingRef = React.useRef(false);
  const architectureRef = React.useRef(architecture);

  // Auto-save timer
  // Auto-save with debounce
  useEffect(() => {
    architectureRef.current = architecture;
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    } else {
        hasUnsavedChanges.current = true;
    }

    const timer = setTimeout(async () => {
        if (isSavingRef.current || !hasUnsavedChanges.current) return;

        isSavingRef.current = true;
        setSaving(true);
        try {
            await updateUiUxArchitecture(architecture.id, architecture);
            hasUnsavedChanges.current = false;
        } catch (error) {
            console.error("Auto-save failed", error);
        } finally {
            setSaving(false);
            isSavingRef.current = false;
        }
    }, 2000);

    return () => clearTimeout(timer);
  }, [architecture]);

  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(initialArch.title);

  const handleTitleSave = async () => {
    const newArch = { ...architecture, title: tempTitle };
    setArchitecture(newArch);
    setEditingTitle(false);
  };

  // Modal states
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [componentModalOpen, setComponentModalOpen] = useState(false);
  const [pageModalOpen, setPageModalOpen] = useState(false);

  const [selectedComponent, setSelectedComponent] = useState<BaseComponent | null>(null);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);

  const nodeTypes = useMemo<NodeTypes>(() => ({
    themeNode: ThemeNode,
    componentNode: ComponentNode,
    pageNode: PageNode,
  }), []);

  // Initialize Nodes and Edges from Architecture Data
  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // 1. Theme Node
    newNodes.push({
      id: 'theme',
      type: 'themeNode',
      position: architecture.theme_specification.advanced.editor_metadata || { x: 50, y: 50 },
      data: { 
        theme: architecture.theme_specification,
        onEdit: () => setThemeModalOpen(true)
      },
    });

    // 2. Component Nodes
    architecture.base_components.forEach((comp, index) => {
      newNodes.push({
        id: comp.component_id,
        type: 'componentNode',
        position: comp.advanced.editor_metadata || { x: 50 + (index * 250), y: 300 },
        data: {
          component: comp,
          onEdit: () => {
            setSelectedComponent(comp);
            setComponentModalOpen(true);
          }
        }
      });
    });

    // 3. Page Nodes
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

      // 4. Edges from Page Navigation
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
        let newArch = { ...architecture };
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
    let newArch = { ...architecture };
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
  const onNodeDragStop = useCallback(async (event: React.MouseEvent, node: Node) => {
    let newArch = { ...architecture };
    let changed = false;

    if (node.id === 'theme') {
        const newTheme = { ...newArch.theme_specification };
        newTheme.advanced = { ...newTheme.advanced, editor_metadata: { x: node.position.x, y: node.position.y } };
        newArch.theme_specification = newTheme;
        changed = true;
    } else {
        // Check if it's a component
        const compIndex = newArch.base_components.findIndex(c => c.component_id === node.id);
        if (compIndex !== -1) {
            const newComps = [...newArch.base_components];
            newComps[compIndex] = {
                ...newComps[compIndex],
                advanced: {
                    ...newComps[compIndex].advanced,
                    editor_metadata: { x: node.position.x, y: node.position.y }
                }
            };
            newArch.base_components = newComps;
            changed = true;
        } else {
            // Check if it's a page
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
        }
    }

    if (changed) {
        setArchitecture(newArch);
    }
  }, [architecture]);

  const handleSave = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaving(true);
    try {
        await updateUiUxArchitecture(architecture.id, architecture);
        hasUnsavedChanges.current = false;
    } finally {
        setSaving(false);
        isSavingRef.current = false;
    }
  };

  const handleExport = () => {
    const md = generateUiUxMarkdown(architecture);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${architecture.title.replace(/\s+/g, '_')}_Architecture.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const createNewComponent = async () => {
    const newComp: BaseComponent = {
        component_id: `comp_${uuidv4().slice(0, 8)}`,
        type: 'atom',
        main: { name: 'New Component', category: 'General', required_props: [] },
        advanced: { file_path: '', props: {}, editor_metadata: { x: 100, y: 100 } }
    };
    
    const newArch = {
        ...architecture,
        base_components: [...architecture.base_components, newComp]
    };
    
    setArchitecture(newArch);
    setSelectedComponent(newComp);
    setComponentModalOpen(true);
  };

  const createNewPage = async () => {
    const newPage: Page = {
        page_id: `page_${uuidv4().slice(0, 8)}`,
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

  const handleThemeSave = async (newTheme: ThemeSpecification) => {
    const newArch = { ...architecture, theme_specification: newTheme };
    setArchitecture(newArch);
    setThemeModalOpen(false);
  };

  const handleComponentSave = async (newComp: BaseComponent) => {
    const newArch = {
        ...architecture,
        base_components: architecture.base_components.map(c => c.component_id === newComp.component_id ? newComp : c)
    };
    
    setArchitecture(newArch);
    setComponentModalOpen(false);
    setSelectedComponent(null);
  };

  const handleComponentDelete = async () => {
    if (selectedComponent) {
        const newArch = {
            ...architecture,
            base_components: architecture.base_components.filter(c => c.component_id !== selectedComponent.component_id)
        };
        
        setArchitecture(newArch);
        setComponentModalOpen(false);
        setSelectedComponent(null);
    }
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
            <Flex gap="3" align="center">
                <Button variant="soft" onClick={() => navigate('/ui-ux-architectures')}>
                    <ArrowLeft size={16} /> Back
                </Button>
                
                {editingTitle ? (
                  <Flex gap="2" align="center">
                    <TextField.Root 
                      value={tempTitle} 
                      onChange={e => setTempTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
                      style={{ height: 32 }}
                    />
                    <IconButton size="1" color="green" variant="soft" onClick={handleTitleSave}>
                      <Check size={14} />
                    </IconButton>
                    <IconButton size="1" color="red" variant="soft" onClick={() => { setTempTitle(architecture.title); setEditingTitle(false); }}>
                      <X size={14} />
                    </IconButton>
                  </Flex>
                ) : (
                  <Flex gap="2" align="center" className="group">
                    <Heading size="4">{architecture.title}</Heading>
                    <IconButton 
                      size="1" 
                      variant="ghost" 
                      color="gray" 
                      onClick={() => { setTempTitle(architecture.title); setEditingTitle(true); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil size={12} />
                    </IconButton>
                  </Flex>
                )}
            </Flex>
          </Panel>

          <Panel position="top-right">
            <Flex gap="2">
                <Button onClick={createNewComponent} color="orange">
                    <Plus size={16} /> New Component
                </Button>
                <Button onClick={createNewPage} color="green">
                    <Plus size={16} /> New Page
                </Button>
                <Button onClick={handleExport} variant="soft">
                    <Download size={16} /> Export MD
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                    <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                </Button>
            </Flex>
          </Panel>
        </ReactFlow>

        {themeModalOpen && (
            <ThemeModal 
                open={themeModalOpen} 
                onOpenChange={setThemeModalOpen}
                theme={architecture.theme_specification}
                onSave={handleThemeSave}
            />
        )}

        {componentModalOpen && selectedComponent && (
            <ComponentModal
                open={componentModalOpen}
                onOpenChange={setComponentModalOpen}
                component={selectedComponent}
                onSave={handleComponentSave}
                onDelete={handleComponentDelete}
            />
        )}

        {pageModalOpen && selectedPage && (
            <PageModal
                open={pageModalOpen}
                onOpenChange={setPageModalOpen}
                page={selectedPage}
                availableComponents={architecture.base_components}
                onSave={handlePageSave}
                onDelete={handlePageDelete}
            />
        )}

        <Dialog.Root open={!!edgeToDelete} onOpenChange={(open) => !open && setEdgeToDelete(null)}>
            <Dialog.Content style={{ maxWidth: 450 }}>
                <Dialog.Title>Remove Connection</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    Do you want to remove this connection?
                </Dialog.Description>
                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">Cancel</Button>
                    </Dialog.Close>
                    <Button color="red" onClick={() => {
                        if (edgeToDelete) {
                            setEdges((edges) => edges.filter((e) => e.id !== edgeToDelete.id));
                            onEdgesDelete([edgeToDelete]);
                            setEdgeToDelete(null);
                        }
                    }}>
                        Remove
                    </Button>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    </div>
  );
};

export const UiUxArchitectureEditor = (props: UiUxArchitectureEditorProps) => (
  <ReactFlowProvider>
    <UiUxArchitectureEditorContent {...props} />
  </ReactFlowProvider>
);
