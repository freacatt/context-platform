import React, { useEffect, useState } from 'react';
import { Search, Plus, MoreVertical, Trash2, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Diagram } from '../types';
import { getUserDiagrams, createDiagram, deleteDiagram } from '../services/diagramService';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DiagramsPage: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Create Modal State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const navigate = useNavigate();

  const fetchDiagrams = async () => {
    if (!user) return;
    try {
      const data = await getUserDiagrams(user.uid, currentWorkspace?.id);
      setDiagrams(data);
    } catch (error) {
      console.error("Failed to load diagrams", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagrams();
  }, [user, currentWorkspace]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this diagram?")) return;
    try {
      await deleteDiagram(id);
      setDiagrams(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      alert("Failed to delete diagram");
    }
  };

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return;
    setIsCreating(true);
    try {
      const id = await createDiagram(user.uid, newTitle, currentWorkspace?.id);
      if (id) {
        setCreateDialogOpen(false);
        setNewTitle("");
        navigate(`/diagram/${id}`);
      }
    } catch (error) {
      console.error("Failed to create diagram", error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredDiagrams = diagrams
    .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
        const dateA = a.lastModified instanceof Date ? a.lastModified : new Date(a.lastModified || 0);
        const dateB = b.lastModified instanceof Date ? b.lastModified : new Date(b.lastModified || 0);
        return dateB.getTime() - dateA.getTime();
    });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 mt-6">
          <h1 className="text-2xl font-bold text-foreground">My Diagrams</h1>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="cursor-pointer">
                <Plus size={16} className="mr-2" /> New Diagram
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Create New Diagram</DialogTitle>
                <DialogDescription>
                  Start a new visual diagram.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="diagram-title">Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="diagram-title"
                    placeholder="e.g., System Flow"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="cursor-pointer">
                    Cancel
                  </Button>
                </DialogClose>
                <Button onClick={handleCreate} disabled={!newTitle.trim() || isCreating} className="cursor-pointer">
                  {isCreating ? 'Creating...' : 'Create Diagram'}
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
              placeholder="Search diagrams..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* List Section */}
        {loading ? (
            <p>Loading...</p>
        ) : filteredDiagrams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card rounded-lg border border-dashed border-border">
                <h3 className="text-lg font-bold mb-2">No diagrams found</h3>
                <p className="text-sm">Create your first diagram to get started!</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredDiagrams.map(diagram => (
                    <Card key={diagram.id} className="cursor-pointer relative group h-full flex flex-col hover:shadow-md transition-all" onClick={() => navigate(`/diagram/${diagram.id}`)}>
                        <CardContent className="p-4 flex flex-col gap-3 h-full">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h3 className="font-bold text-lg mb-1 truncate text-foreground">
                                        {diagram.title}
                                    </h3>
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} className="text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                            {diagram.lastModified ? new Date(diagram.lastModified).toLocaleDateString() : 'Just now'}
                                        </span>
                                    </div>
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                                <MoreVertical size={16} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleDelete(diagram.id)} className="text-red-600 focus:text-red-600 cursor-pointer">
                                                <Trash2 size={14} className="mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <div className="flex justify-end items-center mt-auto pt-2">
                                <Button variant="ghost" size="sm" className="cursor-pointer">
                                    Open <ArrowRight size={14} className="ml-2" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default DiagramsPage;
