import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Loader2, Plus, Trash2, FolderOpen, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const WorkspacesPage = () => {
    const { workspaces, createNewWorkspace, removeWorkspace, renameWorkspace, loading, setCurrentWorkspace } = useWorkspace();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Rename state
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [workspaceToRename, setWorkspaceToRename] = useState<any>(null);
    const [renameName, setRenameName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

    // Delete state
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [workspaceToDelete, setWorkspaceToDelete] = useState<any>(null);
    const [deleteName, setDeleteName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleCreate = async () => {
        if (!newWorkspaceName.trim()) return;
        setIsCreating(true);
        try {
            await createNewWorkspace(newWorkspaceName);
            setIsCreateOpen(false);
            setNewWorkspaceName('');
            toast.success("Workspace created");
        } catch (error) {
            toast.error("Failed to create workspace");
        } finally {
            setIsCreating(false);
        }
    };

    const openRenameDialog = (e: React.MouseEvent, workspace: any) => {
        e.stopPropagation();
        setWorkspaceToRename(workspace);
        setRenameName(workspace.name);
        setIsRenameOpen(true);
    };

    const handleRename = async () => {
        if (!renameName.trim() || !workspaceToRename) return;
        setIsRenaming(true);
        try {
            await renameWorkspace(workspaceToRename.id, renameName);
            setIsRenameOpen(false);
            setWorkspaceToRename(null);
            setRenameName('');
            toast.success("Workspace renamed");
        } catch (error) {
            toast.error("Failed to rename workspace");
        } finally {
            setIsRenaming(false);
        }
    };

    const openDeleteDialog = (e: React.MouseEvent, workspace: any) => {
        e.stopPropagation();
        setWorkspaceToDelete(workspace);
        setDeleteName('');
        setIsDeleteOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!workspaceToDelete) return;

        if (deleteName !== workspaceToDelete.name) {
            toast.error("Workspace name does not match");
            return;
        }

        if (!user) return;

        setIsDeleting(true);
        try {
            await removeWorkspace(workspaceToDelete.id);
            toast.success("Workspace deleted");
            setIsDeleteOpen(false);
            setWorkspaceToDelete(null);
            setDeleteName('');
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("Failed to delete workspace");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSelect = (workspace: any) => {
        setCurrentWorkspace(workspace);
        navigate(`/workspace/${workspace.id}/dashboard`);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
                    <p className="text-muted-foreground mt-2">Manage your workspaces and projects.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> New Workspace</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Workspace</DialogTitle>
                            <DialogDescription>
                                Create a new workspace to organize your projects.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input 
                                    id="name" 
                                    value={newWorkspaceName} 
                                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                                    placeholder="My Awesome Workspace" 
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={isCreating}>
                                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {workspaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border rounded-lg border-dashed bg-muted/50">
                    <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Workspaces Found</h3>
                    <p className="text-muted-foreground mb-6 text-center max-w-sm">
                        You don't have any workspaces yet. Create one to start organizing your projects.
                    </p>
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Create First Workspace
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {workspaces.map((workspace) => (
                        <Card 
                            key={workspace.id} 
                            className="cursor-pointer hover:border-primary transition-colors relative group"
                            onClick={() => handleSelect(workspace)}
                        >
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span className="flex items-center gap-2">
                                        <FolderOpen className="h-5 w-5 text-primary" />
                                        {workspace.name}
                                    </span>
                                </CardTitle>
                                <CardDescription>
                                    Created {workspace.createdAt?.toLocaleDateString()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Select to view dashboard
                                </p>
                            </CardContent>
                            <CardFooter className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-muted-foreground hover:text-primary"
                                    onClick={(e) => openRenameDialog(e, workspace)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                 <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => openDeleteDialog(e, workspace)}
                                 >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Workspace</DialogTitle>
                        <DialogDescription>
                            Enter a new name for your workspace.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="rename-name">Name</Label>
                            <Input 
                                id="rename-name" 
                                value={renameName} 
                                onChange={(e) => setRenameName(e.target.value)}
                                placeholder="Workspace Name" 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenameOpen(false)}>Cancel</Button>
                        <Button onClick={handleRename} disabled={isRenaming}>
                            {isRenaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Workspace</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. Please type <strong>{workspaceToDelete?.name}</strong> to confirm.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="delete-name">Workspace Name</Label>
                            <Input 
                                id="delete-name" 
                                value={deleteName} 
                                onChange={(e) => setDeleteName(e.target.value)}
                                placeholder={workspaceToDelete?.name}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting || deleteName !== workspaceToDelete?.name}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WorkspacesPage;
