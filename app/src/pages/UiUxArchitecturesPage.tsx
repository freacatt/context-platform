import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText, Search, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UiUxArchitecture } from '../types/uiUxArchitecture';
import { createUiUxArchitecture, getUserUiUxArchitectures, deleteUiUxArchitecture, updateUiUxArchitecture } from '../services/uiUxArchitectureService';

import { useWorkspace } from '../contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export const UiUxArchitecturesPage: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [architectures, setArchitectures] = useState<UiUxArchitecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Rename State
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameNewTitle, setRenameNewTitle] = useState("");

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, title: string } | null>(null);

  useEffect(() => {
    fetchArchitectures();
  }, [user, currentWorkspace]);

  const fetchArchitectures = async () => {
    if (!user || !currentWorkspace) return;
    try {
      const data = await getUserUiUxArchitectures(user.uid, currentWorkspace.id);
      setArchitectures(data);
    } catch (error) {
      console.error("Failed to load UI/UX architectures", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !currentWorkspace || !newTitle.trim()) return;
    setIsCreating(true);
    try {
      const id = await createUiUxArchitecture(user.uid, newTitle, currentWorkspace.id);
      if (id) {
        setIsCreateOpen(false);
        setNewTitle('');
        navigate(`/ui-ux-architecture/${id}`);
      }
    } catch (error) {
        console.error(error);
        alert("Failed to create architecture");
    } finally {
        setIsCreating(false);
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
      await updateUiUxArchitecture(renameTargetId, { title: renameNewTitle });
      setArchitectures(prev => prev.map(a => a.id === renameTargetId ? { ...a, title: renameNewTitle } : a));
      setRenameDialogOpen(false);
      setRenameTargetId(null);
    } catch (error) {
      alert("Failed to rename architecture");
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const arch = architectures.find(a => a.id === id);
    if (arch) {
        setDeleteTarget({ id: arch.id, title: arch.title });
        setDeleteDialogOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
        await deleteUiUxArchitecture(deleteTarget.id);
        setArchitectures(prev => prev.filter(a => a.id !== deleteTarget.id));
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    } catch (error) {
        alert("Failed to delete architecture");
    }
  };

  const filteredArchitectures = architectures.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6 mt-6">
          <h1 className="text-2xl font-bold">UI/UX Architectures</h1>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button className="cursor-pointer">
                    <Plus size={16} className="mr-2" />
                    New Architecture
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Create New UI/UX Architecture</DialogTitle>
                    <DialogDescription>
                        Enter a title for your new architecture definition.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="create-arch-title">Title</Label>
                        <Input
                            id="create-arch-title"
                            placeholder="e.g. Modern Dashboard Design"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button onClick={handleCreate} disabled={!newTitle.trim() || isCreating}>
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
              placeholder="Search architectures..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredArchitectures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
                <FileText size={48} className="text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Architectures Found</h3>
                <p className="text-muted-foreground mb-4">
                    {searchTerm ? "Try adjusting your search terms." : "Start by creating your first UI/UX architecture."}
                </p>
                {!searchTerm && (
                    <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
                        Create New Architecture
                    </Button>
                )}
            </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredArchitectures.map((arch) => (
              <Card 
                key={arch.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors flex flex-col"
                onClick={() => navigate(`/ui-ux-architecture/${arch.id}`)}
              >
                <CardContent className="p-4 flex flex-col gap-2 h-full">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{arch.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Updated: {new Date(arch.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-4 justify-between">
                    <div className="flex items-center gap-2">
                        <FileText size={14} className="text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                        v{arch.ui_ux_architecture_metadata.version}
                        </span>
                    </div>
                    <div className="flex gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 hover:bg-muted"
                            onClick={(e) => handleRename(arch.id, arch.title, e)}
                        >
                            <Edit2 size={14} />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer"
                            onClick={(e) => handleDelete(e, arch.id)}
                        >
                            <Trash2 size={14} />
                        </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Rename Architecture</DialogTitle>
              <DialogDescription>
                Enter a new title for this architecture.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="rename-arch-title">Title</Label>
                <Input
                  id="rename-arch-title"
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
            title="Delete UI/UX Architecture"
            description="This action cannot be undone. This will permanently delete the architecture and all associated data."
            itemName={deleteTarget?.title || ''}
            onConfirm={confirmDelete}
        />
      </div>
  );
};
