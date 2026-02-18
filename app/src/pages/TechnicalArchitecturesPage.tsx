import React, { useEffect, useState } from 'react';
import { Search, Plus, Server, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserTechnicalArchitectures, createTechnicalArchitecture, deleteTechnicalArchitecture, renameTechnicalArchitecture } from '../services/technicalArchitectureService';
import { useNavigate } from 'react-router-dom';
import { TechnicalArchitecture } from '../types';

import { useWorkspace } from '../contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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

export const TechnicalArchitecturesPage: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [architectures, setArchitectures] = useState<TechnicalArchitecture[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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

  const fetchArchitectures = async () => {
    if (!user || !currentWorkspace) return;
    try {
      const data = await getUserTechnicalArchitectures(user.uid, currentWorkspace.id);
      setArchitectures(data);
    } catch (error) {
      console.error("Failed to load technical architectures", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchitectures();
  }, [user, currentWorkspace]);

  const handleCreate = async () => {
      if (!user || !currentWorkspace || !newTitle.trim()) return;
      setIsCreating(true);
      try {
          const id = await createTechnicalArchitecture(user.uid, newTitle, currentWorkspace.id);
          setIsCreateOpen(false);
          setNewTitle('');
          // Navigate to editor
          if (id) {
            navigate(`/technical-architecture/${id}`);
          }
      } catch (error) {
          console.error(error);
          alert("Failed to create architecture");
      } finally {
          setIsCreating(false);
      }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
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
        await deleteTechnicalArchitecture(deleteTarget.id);
        setArchitectures(prev => prev.filter(p => p.id !== deleteTarget.id));
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    } catch (error) {
        alert("Failed to delete architecture");
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
      await renameTechnicalArchitecture(renameTargetId, renameNewTitle);
      setRenameDialogOpen(false);
      fetchArchitectures();
    } catch (error) {
      alert("Failed to rename architecture");
    }
  };

  const filteredArchitectures = architectures.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full bg-background">
      <div className="container mx-auto p-4">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 mt-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Technical Architectures</h1>
            <p className="text-muted-foreground text-sm mt-1">Define and manage your system architecture standards.</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus size={16} className="mr-2" /> New Architecture
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Create New Technical Architecture</DialogTitle>
                    <DialogDescription>
                        Enter a title for your new architecture definition.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="create-arch-title">Title</Label>
                        <Input
                            id="create-arch-title"
                            placeholder="e.g. Microservices Architecture"
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
                    <Button onClick={handleCreate} disabled={!newTitle.trim() || isCreating} className="bg-purple-600 hover:bg-purple-700 text-white">
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

        {/* List Section */}
        {loading ? (
            <div className="flex justify-center py-8"><p>Loading...</p></div>
        ) : filteredArchitectures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
                <Server size={48} className="text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Architectures Yet</h3>
                <p className="text-muted-foreground mb-4">Start by creating your first architecture definition.</p>
                <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30" onClick={() => setIsCreateOpen(true)}>
                    Create New Architecture
                </Button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArchitectures.map(arch => (
                    <Card key={arch.id} className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500 flex flex-col">
                        <div className="flex-grow cursor-pointer p-0" onClick={() => navigate(`/technical-architecture/${arch.id}`)}>
                            <CardContent className="p-3">
                                <div className="flex flex-col gap-2">
                                    <h3 className="font-semibold text-lg truncate">{arch.title}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {arch.metadata?.description || "No description provided"}
                                    </p>
                                </div>
                            </CardContent>
                        </div>
                        <div className="flex justify-end p-2 gap-2 border-t mt-auto">
                             <Button size="icon" variant="ghost" onClick={(e) => handleRename(arch.id, arch.title, e)} className="h-8 w-8 cursor-pointer hover:bg-muted">
                                <Edit2 size={14} />
                            </Button>
                             <Button size="icon" variant="ghost" onClick={(e) => handleDelete(arch.id, e)} className="h-8 w-8 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
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
          title="Delete Technical Architecture"
          description="This action cannot be undone. This will permanently delete the technical architecture and all associated data."
          itemName={deleteTarget?.title || ''}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
};
