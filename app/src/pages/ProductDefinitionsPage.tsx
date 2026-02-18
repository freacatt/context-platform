import React, { useEffect, useState } from 'react';
import { Search, Plus, GitMerge, Trash2, Edit2, FileText, Sparkles, SquareDashed } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getUserProductDefinitions, createProductDefinition, deleteProductDefinition, renameProductDefinition } from '../services/productDefinitionService';
import { useNavigate } from 'react-router-dom';
import { ProductDefinition } from '../types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { PRODUCT_DEFINITION_TEMPLATES, DEFAULT_PRODUCT_DEFINITION_TEMPLATE_ID, SHAPE_UP_METHOD_TEMPLATE_ID } from '../services/productDefinitionTemplates';

const ProductDefinitionsPage: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [definitions, setDefinitions] = useState<ProductDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_PRODUCT_DEFINITION_TEMPLATE_ID);

  const groupedTemplates = PRODUCT_DEFINITION_TEMPLATES.reduce<Record<string, typeof PRODUCT_DEFINITION_TEMPLATES>>((acc, tpl) => {
    if (!acc[tpl.category]) acc[tpl.category] = [];
    acc[tpl.category].push(tpl);
    return acc;
  }, {});

  const renderTemplateLogo = (templateId: string) => {
    if (templateId === SHAPE_UP_METHOD_TEMPLATE_ID) {
      return (
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
          SU
        </div>
      );
    }

    if (templateId === DEFAULT_PRODUCT_DEFINITION_TEMPLATE_ID) {
      return (
        <div className="h-10 w-10 rounded-xl bg-sky-600/10 flex items-center justify-center text-sky-700">
          <FileText size={18} />
        </div>
      );
    }

    return (
      <div className="h-10 w-10 rounded-xl border border-dashed border-slate-400 flex items-center justify-center text-slate-500">
        <SquareDashed size={18} />
      </div>
    );
  };

  // Rename State
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameNewTitle, setRenameNewTitle] = useState("");

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{id: string, title: string} | null>(null);


  const fetchDefinitions = async () => {
    if (!user) return;
    try {
      const data = await getUserProductDefinitions(user.uid, currentWorkspace?.id);
      setDefinitions(data);
    } catch (error) {
      console.error("Failed to load product definitions", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefinitions();
  }, [user, currentWorkspace]);

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return;
    setIsCreating(true);
    try {
      const id = await createProductDefinition(
        user.uid,
        newTitle,
        currentWorkspace?.id,
        selectedTemplateId,
      );
      setIsCreateOpen(false);
      setNewTitle('');
      setSelectedTemplateId(DEFAULT_PRODUCT_DEFINITION_TEMPLATE_ID);
      navigate(`/product-definition/${id}`);
    } catch (error) {
      console.error(error);
      alert("Failed to create definition");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({ id, title });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
        await deleteProductDefinition(deleteTarget.id);
        setDefinitions(prev => prev.filter(p => p.id !== deleteTarget.id));
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    } catch (error) {
        console.error("Failed to delete definition", error);
        alert("Failed to delete definition");
    }
  };

  const handleRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameTargetId(id);
    setRenameNewTitle(currentTitle);
    setRenameDialogOpen(true);
  };

  const confirmRename = async () => {
    if (!renameTargetId || !renameNewTitle.trim()) return;
    try {
      await renameProductDefinition(renameTargetId, renameNewTitle);
      setRenameDialogOpen(false);
      fetchDefinitions();
    } catch (error) {
      alert("Failed to rename definition");
    }
  };

  const filteredDefinitions = definitions.filter(d =>  
    d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full bg-background">
      <div className="container mx-auto p-4">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 mt-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Product Definitions</h1>
            <p className="text-muted-foreground text-sm mt-1">Shape Up your product ideas with structured definitions.</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button className="cursor-pointer bg-teal-600 hover:bg-teal-700 text-white">
                    <Plus size={16} className="mr-2" /> New Definition
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Create New Product Definition</DialogTitle>
                    <DialogDescription>
                        Name your workspace and choose a starting template.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="create-title">Title</Label>
                    <Input
                      id="create-title"
                      placeholder="e.g. Mobile App Redesign"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Template</span>
                        <span className="text-xs text-muted-foreground">
                          Pick a structure to start from. You can always change content later.
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Sparkles size={14} className="text-amber-500" />
                        <span>Recommended: Classic or Shape Up</span>
                      </div>
                    </div>

                    <ScrollArea className="max-h-[360px] rounded-xl border border-border/40 bg-background/40 p-3">
                      <div className="flex flex-col gap-4">
                        {Object.entries(groupedTemplates).map(([category, templates]) => (
                          <div key={category} className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {category}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {templates.map((tpl) => {
                                const isSelected = tpl.id === selectedTemplateId;
                                return (
                                  <button
                                    type="button"
                                    key={tpl.id}
                                    onClick={() => setSelectedTemplateId(tpl.id)}
                                    className={`text-left rounded-2xl border transition-all hover:border-teal-500 hover:shadow-md bg-background/80 backdrop-blur-lg w-full ${
                                      isSelected ? 'border-teal-600 ring-2 ring-teal-500/40' : 'border-border'
                                    }`}
                                  >
                                    <div className="px-4 py-4 flex flex-col gap-3 h-full min-h-[150px]">
                                      <div className="flex items-start gap-3">
                                        {renderTemplateLogo(tpl.id)}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm truncate">{tpl.name}</span>
                                            {tpl.id === DEFAULT_PRODUCT_DEFINITION_TEMPLATE_ID && (
                                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 uppercase tracking-wide">
                                                Default
                                              </Badge>
                                            )}
                                            {tpl.id === SHAPE_UP_METHOD_TEMPLATE_ID && (
                                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 uppercase tracking-wide">
                                                Shape Up
                                              </Badge>
                                            )}
                                          </div>
                                          {tpl.tagline && (
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                              {tpl.tagline}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-xs text-slate-500 line-clamp-3">
                                        {tpl.description}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button onClick={handleCreate} disabled={!newTitle.trim() || isCreating} className="bg-teal-600 hover:bg-teal-700 text-white">
                        {isCreating ? 'Creating...' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Bar */}
        <div className="flex gap-4 mb-6">
          <div className="flex-grow max-w-md relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search definitions..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* List Section */}
        {loading ? (
            <div className="flex justify-center py-8"><p>Loading...</p></div>
        ) : filteredDefinitions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
                <GitMerge size={48} className="text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Product Definitions Yet</h3>
                <p className="text-muted-foreground mb-4">Start by creating your first definition.</p>
                <Button variant="outline" className="border-teal-600 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30" onClick={() => setIsCreateOpen(true)}>
                    Create New Definition
                </Button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDefinitions.map(def => (
                    <Card key={def.id} className="hover:shadow-md transition-shadow border-l-4 border-l-teal-500 flex flex-col">
                        <div className="flex-grow cursor-pointer p-0" onClick={() => navigate(`/product-definition/${def.id}`)}>
                            <CardContent className="p-3">
                                <div className="flex flex-col gap-2">
                                    <h3 className="font-semibold text-lg truncate">{def.title}</h3>
                                    <span className="text-xs text-muted-foreground">
                                        Created: {(() => {
                                            if (!def.createdAt) return 'Just now';
                                            const date = def.createdAt instanceof Date ? def.createdAt : new Date(def.createdAt);
                                            return date.toLocaleDateString();
                                        })()}
                                    </span>
                                    <div className="flex gap-2 mt-2">
                                        {def.linkedPyramidId && <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300">Linked Pyramid</Badge>}
                                    </div>
                                </div>
                            </CardContent>
                        </div>
                        <div className="flex justify-end p-2 gap-2 border-t mt-auto">
                             <Button size="icon" variant="ghost" onClick={(e) => handleRename(def.id, def.title, e)} className="h-8 w-8 cursor-pointer hover:bg-muted">
                                <Edit2 size={14} />
                            </Button>
                             <Button size="icon" variant="ghost" onClick={(e) => handleDelete(def.id, def.title, e)} className="h-8 w-8 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                                <Trash2 size={14} />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        )}

        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Rename Product Definition</DialogTitle>
              <DialogDescription>
                Enter a new title for this definition.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="rename-title">Title</Label>
                <Input
                  id="rename-title"
                  value={renameNewTitle}
                  onChange={(e) => setRenameNewTitle(e.target.value)}
                  placeholder="Enter new title"
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button onClick={confirmRename}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog 
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Product Definition"
          description="This action cannot be undone. This will permanently delete the product definition and all associated data."
          itemName={deleteTarget?.title || ''}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
};

export default ProductDefinitionsPage;
