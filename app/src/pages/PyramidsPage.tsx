import React, { useEffect, useState } from 'react';
import { Search, Plus, ListFilter } from 'lucide-react';
import PyramidList from '../components/Dashboard/PyramidList';
import CreatePyramidModal from '../components/Dashboard/CreatePyramidModal';
import { getUserPyramids, deletePyramid, duplicatePyramid, renamePyramid } from '../services/pyramidService';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Pyramid } from '../types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

const PyramidsPage: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [pyramids, setPyramids] = useState<Pyramid[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recent'); // 'recent', 'modified', 'title'

  // Rename State
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameNewTitle, setRenameNewTitle] = useState("");

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, title: string } | null>(null);

  const fetchPyramids = async () => {
    if (!user) return;
    try {
      const data = await getUserPyramids(user.uid, currentWorkspace?.id);
      setPyramids(data);
    } catch (error) {
      console.error("Failed to load pyramids", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPyramids();
  }, [user, currentWorkspace]);

  const handleDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePyramid(deleteTarget.id);
      setPyramids(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete pyramid", error);
      alert("Failed to delete pyramid");
    }
  };

  const filteredPyramids = pyramids
    .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      
      const dateA = a.lastModified instanceof Date ? a.lastModified : new Date(a.lastModified || 0);
      const dateB = b.lastModified instanceof Date ? b.lastModified : new Date(b.lastModified || 0);
      
      return dateB.getTime() - dateA.getTime();
    });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 mt-6">
          <h1 className="text-2xl font-bold text-foreground">My Pyramids</h1>
          <CreatePyramidModal onCreated={fetchPyramids} />
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-grow relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search pyramids..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="w-full sm:w-[200px]">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                    <ListFilter size={16} />
                    <SelectValue placeholder="Sort by" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Modified</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List Section */}
        {loading ? (
            <p>Loading...</p>
        ) : filteredPyramids.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card rounded-lg border border-dashed border-border">
                <h3 className="text-lg font-bold mb-2">No pyramids found</h3>
                <p className="text-sm">Create your first pyramid to get started!</p>
            </div>
        ) : (
            <PyramidList 
                pyramids={filteredPyramids} 
                onDelete={handleDelete} 
            />
        )}
      </div>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Rename Pyramid</DialogTitle>
            <DialogDescription>
              Enter a new name for your pyramid.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
             <Input
                placeholder="New title"
                value={renameNewTitle}
                onChange={(e) => setRenameNewTitle(e.target.value)}
              />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={async () => {
                if(renameTargetId && renameNewTitle.trim()) {
                    await renamePyramid(renameTargetId, renameNewTitle);
                    setRenameDialogOpen(false);
                    fetchPyramids();
                }
            }}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog 
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Pyramid"
        description="This action cannot be undone. This will permanently delete the pyramid and all associated data."
        itemName={deleteTarget?.title || ''}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default PyramidsPage;
