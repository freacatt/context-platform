import React, { useEffect, useState } from 'react';
import { Plus, Trash2, FileText, Edit2, Folder, ChevronDown, MoreVertical, Search } from 'lucide-react';
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useAuth } from '../contexts/AuthContext';
import { getUserContextDocuments, createContextDocument, deleteContextDocument, renameContextDocument, assignContextDocumentToDirectory } from '../services/contextDocumentService';
import { getUserDirectories, createDirectory, renameDirectory, deleteDirectory } from '../services/directoryService';
import { Link, useNavigate } from 'react-router-dom';
import { ContextDocument } from '../types';

import { useWorkspace } from '../contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from "@/components/ui/label";

const ContextDocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ContextDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [directories, setDirectories] = useState<{ id: string; title: string }[]>([]);
  
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isCreateDirOpen, setIsCreateDirOpen] = useState<boolean>(false);
  const [newDirTitle, setNewDirTitle] = useState<string>('');
  const [isCreatingDir, setIsCreatingDir] = useState<boolean>(false);

  // Rename State
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameNewTitle, setRenameNewTitle] = useState("");

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, title: string, type: 'document' | 'directory' } | null>(null);

  const fetchDocuments = async () => {
    if (!user || !currentWorkspace) return;
    try {
      const data = await getUserContextDocuments(user.uid, currentWorkspace.id);
      setDocuments(data);
    } catch (error) {
      console.error("Failed to load documents", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDirectories = async () => {
    if (!user || !currentWorkspace) return;
    try {
      const data = await getUserDirectories(user.uid, currentWorkspace.id);
      setDirectories(data.map(d => ({ id: d.id, title: d.title })));
    } catch (error) {
      console.error("Failed to load directories", error);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user, currentWorkspace]);

  useEffect(() => {
    fetchDirectories();
  }, [user, currentWorkspace]);

  const handleCreate = async () => {
      if (!user || !currentWorkspace || !newTitle.trim()) return;
      setIsCreating(true);
      try {
          const id = await createContextDocument(user.uid, newTitle, 'text', currentWorkspace.id);
          setIsCreateOpen(false);
          setNewTitle('');
          if (id) {
              navigate(`/context-document/${id}`);
          }
      } catch (error) {
          console.error(error);
          alert("Failed to create document");
      } finally {
          setIsCreating(false);
      }
  };

  const handleCreateDirectory = async () => {
    if (!user || !currentWorkspace || !newDirTitle.trim()) return;
    setIsCreatingDir(true);
    try {
      await createDirectory(user.uid, newDirTitle, currentWorkspace.id);
      setIsCreateDirOpen(false);
      setNewDirTitle('');
      fetchDirectories();
    } catch (error) {
      console.error(error);
      alert("Failed to create directory");
    } finally {
      setIsCreatingDir(false);
    }
  };

  const handleDelete = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({ id, title, type: 'document' });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
        if (deleteTarget.type === 'directory') {
            await deleteDirectory(deleteTarget.id);
            fetchDirectories();
        } else {
            await deleteContextDocument(deleteTarget.id);
            setDocuments(prev => prev.filter(d => d.id !== deleteTarget.id));
        }
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    } catch (error) {
        console.error("Failed to delete item", error);
        alert("Failed to delete item");
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
      await renameContextDocument(renameTargetId, renameNewTitle);
      setRenameDialogOpen(false);
      fetchDocuments();
    } catch (error) {
      alert("Failed to rename document");
    }
  };

  const assignDirectory = async (docId: string, dirId: string | null) => {
    try {
      await assignContextDocumentToDirectory(docId, dirId);
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, directoryId: dirId } : d));
    } catch (error) {
      alert('Failed to assign directory');
    }
  };

  const [renameDirDialogOpen, setRenameDirDialogOpen] = useState(false);
  const [renameDirTargetId, setRenameDirTargetId] = useState<string | null>(null);
  const [renameDirNewTitle, setRenameDirNewTitle] = useState("");

  const handleRenameDirectory = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameDirTargetId(id);
    setRenameDirNewTitle(currentTitle || "");
    setRenameDirDialogOpen(true);
  };

  const confirmRenameDirectory = async () => {
    if (!renameDirTargetId || !renameDirNewTitle.trim()) return;
    try {
      console.log('Attempting to rename directory:', renameDirTargetId, renameDirNewTitle);
      await renameDirectory(renameDirTargetId, renameDirNewTitle);
      setRenameDirDialogOpen(false);
      fetchDirectories();
    } catch (error: any) {
      console.error('Failed to rename directory:', error);
      alert(`Failed to rename directory: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteDirectory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const dir = directories.find(d => d.id === id);
    if (dir) {
        setDeleteTarget({ id: dir.id, title: dir.title, type: 'directory' });
        setDeleteDialogOpen(true);
    }
  };

  const filteredDocuments = documents.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex-grow bg-background">
      <div className="container mx-auto p-4">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 mt-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Context & Documents</h1>
            <p className="text-muted-foreground text-sm mt-1">Create knowledge base documents to use as context for your products.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="cursor-pointer bg-amber-500 hover:bg-amber-600 text-white">
                    <Plus size={16} className="mr-2" /> New Document
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle>Create New Context Document</DialogTitle>
                  <DialogDescription>
                    Enter a title for your new document.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Market Research 2024"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleCreate} disabled={isCreating}>
                        {isCreating ? 'Creating...' : 'Create Document'}
                    </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateDirOpen} onOpenChange={setIsCreateDirOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="cursor-pointer bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Folder size={16} className="mr-2" /> New Directory
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle>Create Directory</DialogTitle>
                  <DialogDescription>
                    Enter a name for the directory.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="dirname">Name</Label>
                    <Input
                      id="dirname"
                      placeholder="e.g. Research"
                      value={newDirTitle}
                      onChange={(e) => setNewDirTitle(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleCreateDirectory} disabled={isCreatingDir}>
                      {isCreatingDir ? 'Creating...' : 'Create Directory'}
                    </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
             <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                />
            </div>
        </div>

        {/* Directories */}
        <div className="mb-4">
          <div className="flex gap-2 flex-wrap">
            {directories.map(dir => (
              <div key={dir.id} className="relative group">
                  <div className="flex items-center bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-md transition-colors border border-indigo-200 dark:border-indigo-800 pr-1">
                    <Button 
                      variant="ghost" 
                      className="cursor-pointer hover:bg-transparent px-3 text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 h-9"
                      onClick={() => navigate(`/directory/${dir.id}`)}
                    >
                      <Folder size={14} className="mr-2" /> {dir.title}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 cursor-pointer">
                                <MoreVertical size={12} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={(e) => handleRenameDirectory(dir.id, dir.title, e)}>
                                <Edit2 size={14} className="mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={(e) => handleDeleteDirectory(dir.id, e)}>
                                <Trash2 size={14} className="mr-2" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
              </div>
            ))}
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map(doc => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow flex flex-col">
                    <Link to={`/context-document/${doc.id}`} className="block flex-grow">
                        <CardContent className="p-3 pb-0 flex flex-col h-full justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText size={20} className="text-amber-500" />
                                    <h3 className="font-semibold text-lg">{doc.title}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {(() => {
                                        if (!doc.content) return 'No content yet.';
                                        try {
                                            const parsed = JSON.parse(doc.content);
                                            if (parsed && parsed.root) {
                                                return 'Rich Text Document';
                                            }
                                        } catch (e) {
                                            // Not JSON
                                        }
                                        return doc.content.substring(0, 100) + '...';
                                    })()}
                                </p>
                            </div>
                        </CardContent>
                    </Link>
                    <div className="flex justify-between items-center p-3 pt-0 border-t mt-2 pt-2">
                         <span className="text-xs text-muted-foreground">
                            Last modified: {(() => {
                                if (!doc.lastModified) return '';
                                const date = doc.lastModified instanceof Date ? doc.lastModified : new Date(doc.lastModified);
                                return date.toLocaleDateString();
                            })()}
                        </span>
                        <div className="flex gap-1 items-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 cursor-pointer text-muted-foreground">
                                  <Folder size={14} className="mr-2" />
                                  {(doc.directoryId && directories.find(d => d.id === doc.directoryId)?.title) || 'No Directory'}
                                  <ChevronDown size={14} className="ml-2" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => assignDirectory(doc.id, null)}>
                                  No Directory
                                </DropdownMenuItem>
                                {directories.map(dir => (
                                  <DropdownMenuItem key={dir.id} onClick={() => assignDirectory(doc.id, dir.id)}>
                                    {dir.title}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => handleRename(doc.id, doc.title, e)}
                                className="h-8 w-8 cursor-pointer hover:bg-muted"
                            >
                                <Edit2 size={16} />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => handleDelete(doc.id, doc.title, e)}
                                className="h-8 w-8 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}
            
            {filteredDocuments.length === 0 && (
                <div className="col-span-full py-12 text-center">
                    <p className="text-muted-foreground">No documents found. Create one to get started!</p>
                </div>
            )}
        </div>

        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Rename Document</DialogTitle>
              <DialogDescription>
                Enter a new title for this document.
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

        <Dialog open={renameDirDialogOpen} onOpenChange={setRenameDirDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Rename Directory</DialogTitle>
              <DialogDescription>
                Enter a new name for this directory.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="rename-dir">Name</Label>
                <Input
                  id="rename-dir"
                  value={renameDirNewTitle}
                  onChange={(e) => setRenameDirNewTitle(e.target.value)}
                  placeholder="Enter new name"
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button onClick={confirmRenameDirectory}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog 
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title={deleteTarget?.type === 'directory' ? "Delete Directory" : "Delete Document"}
          description={deleteTarget?.type === 'directory' 
              ? "Are you sure you want to delete this directory? All documents inside will be moved to 'No Directory'."
              : "This action cannot be undone. This will permanently delete the document."
          }
          itemName={deleteTarget?.title || ''}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
};

export default ContextDocumentsPage;
