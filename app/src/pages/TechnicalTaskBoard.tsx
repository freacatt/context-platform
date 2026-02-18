import React, { useEffect, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Trash2, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
    getPipelines, 
    getTechnicalTasks, 
    createTechnicalTask, 
    createPipeline, 
    deletePipeline, 
    updatePipeline,
    deleteTechnicalTask,
    batchUpdatePipelines,
    batchUpdateTasks
} from '../services/technicalTaskService';
import { getUserTechnicalArchitectures } from '../services/technicalArchitectureService';
import { Pipeline, TechnicalTask, TaskType } from '../types/technicalTask';
import { TechnicalArchitecture } from '../types';
import { TaskCard } from '../components/TechnicalTask/TaskCard';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import { useWorkspace } from '../contexts/WorkspaceContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

export const TechnicalTaskBoard: React.FC = () => {
    const { user } = useAuth();
    const { currentWorkspace } = useWorkspace();
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [tasks, setTasks] = useState<TechnicalTask[]>([]);
    const [architectures, setArchitectures] = useState<TechnicalArchitecture[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Create Task Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskType, setNewTaskType] = useState<TaskType>('NEW_TASK');
    const [selectedArch, setSelectedArch] = useState<string>('');

    // Create Pipeline Modal
    const [isPipelineOpen, setIsPipelineOpen] = useState(false);
    const [newPipelineTitle, setNewPipelineTitle] = useState('');

    // Rename Pipeline State
    const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
    const [renameTitle, setRenameTitle] = useState('');

    // Delete State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, title: string, type: 'pipeline' | 'task' } | null>(null);

    useEffect(() => {
        if (user && currentWorkspace) {
            fetchData();
        }
    }, [user, currentWorkspace]);

    const fetchData = async () => {
        if (!user || !currentWorkspace) return;
        setLoading(true);
        try {
            const [fetchedPipelines, fetchedTasks, fetchedArchs] = await Promise.all([
                getPipelines(user.uid, currentWorkspace.id),
                getTechnicalTasks(user.uid, currentWorkspace.id),
                getUserTechnicalArchitectures(user.uid, currentWorkspace.id)
            ]);
            setPipelines(fetchedPipelines);
            setTasks(fetchedTasks);
            setArchitectures(fetchedArchs);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async () => {
        if (!user || !currentWorkspace || !newTaskTitle || !selectedArch) return;
        // Default to first pipeline
        const pipelineId = pipelines[0]?.id;
        if (!pipelineId) return;

        const task = await createTechnicalTask(user.uid, pipelineId, newTaskTitle, newTaskType, selectedArch, undefined, currentWorkspace.id);
        if (task) {
            setTasks([...tasks, task]);
            setIsCreateOpen(false);
            setNewTaskTitle('');
            setSelectedArch('');
        }
    };

    const handleCreatePipeline = async () => {
        if (!user || !currentWorkspace || !newPipelineTitle) return;
        const order = pipelines.length;
        const pipeline = await createPipeline(user.uid, newPipelineTitle, order, currentWorkspace.id);
        if (pipeline) {
            setPipelines([...pipelines, pipeline]);
            setIsPipelineOpen(false);
            setNewPipelineTitle('');
        }
    };

    const handleDeletePipeline = (pipelineId: string) => {
        const pipeline = pipelines.find(p => p.id === pipelineId);
        if (!pipeline) return;

        setDeleteTarget({ id: pipeline.id, title: pipeline.title, type: 'pipeline' });
        setDeleteDialogOpen(true);
    };

    const handleRenamePipeline = async () => {
        if (!editingPipeline || !renameTitle) return;
        
        await updatePipeline(editingPipeline.id, { title: renameTitle });
        setPipelines(pipelines.map(p => p.id === editingPipeline.id ? { ...p, title: renameTitle } : p));
        setEditingPipeline(null);
        setRenameTitle('');
    };

    const handleDeleteTask = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            setDeleteTarget({ id: task.id, title: task.title, type: 'task' });
            setDeleteDialogOpen(true);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.type === 'pipeline') {
                const success = await deletePipeline(deleteTarget.id);
                if (success) {
                    setPipelines(pipelines.filter(p => p.id !== deleteTarget.id));
                }
            } else {
                const success = await deleteTechnicalTask(deleteTarget.id);
                if (success) {
                    setTasks(tasks.filter(t => t.id !== deleteTarget.id));
                } else {
                    console.error("Failed to delete task. Please try again.");
                }
            }
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
        } catch (error) {
            console.error(`Failed to delete ${deleteTarget.type}`);
        }
    };

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId, type } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // Reordering Pipelines
        if (type === 'pipeline') {
            const newPipelines = Array.from(pipelines);
            const [removed] = newPipelines.splice(source.index, 1);
            newPipelines.splice(destination.index, 0, removed);

            const updatedPipelines = newPipelines.map((p, index) => ({ ...p, order: index }));
            setPipelines(updatedPipelines);
            batchUpdatePipelines(updatedPipelines);
            return;
        }

        // Reordering Tasks
        if (type === 'task') {
            const startPipelineId = source.droppableId;
            const finishPipelineId = destination.droppableId;

            // Helper to sort tasks
            const getSortedTasks = (pid: string) => 
                tasks.filter(t => t.pipelineId === pid).sort((a, b) => (a.order || 0) - (b.order || 0));

            if (startPipelineId === finishPipelineId) {
                const pipelineTasks = getSortedTasks(startPipelineId);
                const [movedTask] = pipelineTasks.splice(source.index, 1);
                pipelineTasks.splice(destination.index, 0, movedTask);

                const updatedPipelineTasks = pipelineTasks.map((t, index) => ({ ...t, order: index }));
                
                const otherTasks = tasks.filter(t => t.pipelineId !== startPipelineId);
                setTasks([...otherTasks, ...updatedPipelineTasks]);
                batchUpdateTasks(updatedPipelineTasks).catch(err => {
                    console.error("Failed to save task order:", err);
                    alert("Failed to save changes. Please refresh.");
                });
            } else {
                const startTasks = getSortedTasks(startPipelineId);
                const finishTasks = getSortedTasks(finishPipelineId);

                const [movedTask] = startTasks.splice(source.index, 1);
                movedTask.pipelineId = finishPipelineId;
                
                finishTasks.splice(destination.index, 0, movedTask);

                const updatedStartTasks = startTasks.map((t, index) => ({...t, order: index}));
                const updatedFinishTasks = finishTasks.map((t, index) => ({...t, order: index}));

                const otherTasks = tasks.filter(t => t.pipelineId !== startPipelineId && t.pipelineId !== finishPipelineId);
                setTasks([...otherTasks, ...updatedStartTasks, ...updatedFinishTasks]);
                batchUpdateTasks([...updatedStartTasks, ...updatedFinishTasks]).catch(err => {
                    console.error("Failed to save task order:", err);
                    alert("Failed to save changes. Please refresh.");
                });
            }
        }
    };

    return (
        <div className="h-full flex flex-col bg-muted/40">
            {/* Header */}
            <div className="p-4 border-b bg-background">
                <div className="max-w-[1800px] mx-auto w-full">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Technical Tasks</h1>
                            <p className="text-sm text-muted-foreground">Manage your technical implementation tasks in technical task page</p>
                        </div>
                        <div className="flex gap-3">
                            <Dialog open={isPipelineOpen} onOpenChange={setIsPipelineOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <Plus size={16} className="mr-2" /> New Pipeline
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Add Pipeline</DialogTitle>
                                        <DialogDescription>
                                            Create a new column for your task board.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="pipeline-title">Title</Label>
                                            <Input
                                                id="pipeline-title"
                                                value={newPipelineTitle}
                                                onChange={(e) => setNewPipelineTitle(e.target.value)}
                                                placeholder="e.g. In Review"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">Cancel</Button>
                                        </DialogClose>
                                        <Button onClick={handleCreatePipeline}>Create</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus size={16} className="mr-2" /> New Task
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[450px]">
                                    <DialogHeader>
                                        <DialogTitle>Create New Technical Task</DialogTitle>
                                        <DialogDescription>
                                            Fill in the details below to create a new technical task.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="task-title">Task Title</Label>
                                            <Input
                                                id="task-title"
                                                value={newTaskTitle}
                                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                                placeholder="Enter task title"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Type</Label>
                                            <Select value={newTaskType} onValueChange={(v) => setNewTaskType(v as TaskType)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="NEW_TASK">New Task</SelectItem>
                                                    <SelectItem value="FIX_TASK">Fix Task</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Technical Architecture</Label>
                                            <Select value={selectedArch} onValueChange={setSelectedArch}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Architecture..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {architectures.map(arch => (
                                                        <SelectItem key={arch.id} value={arch.id}>{arch.title}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">Cancel</Button>
                                        </DialogClose>
                                        <Button onClick={handleCreateTask} disabled={!newTaskTitle || !selectedArch}>Create Task</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </div>

            {/* Board Area */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-x-auto p-4">
                    <div className="max-w-[1800px] mx-auto h-full">
                        <Droppable droppableId="board" type="pipeline" direction="horizontal">
                            {(provided) => (
                                <div 
                                    className="flex gap-4 h-full min-w-max items-start"
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                >
                                    {pipelines.map((pipeline, index) => (
                                        <Draggable key={pipeline.id} draggableId={pipeline.id} index={index}>
                                            {(provided) => (
                                                <div 
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className="w-80 flex flex-col bg-muted/50 rounded-lg h-full max-h-full shadow-sm border border-border"
                                                    style={{ ...provided.draggableProps.style }}
                                                >
                                                    <div 
                                                        {...provided.dragHandleProps}
                                                        className="p-3 bg-muted rounded-t-lg cursor-grab active:cursor-grabbing border-b border-border flex justify-between items-center"
                                                    >
                                                        <span className="font-semibold text-sm">{pipeline.title}</span>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6">
                                                                    <MoreHorizontal size={14} />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                <DropdownMenuItem onClick={() => {
                                                                    setEditingPipeline(pipeline);
                                                                    setRenameTitle(pipeline.title);
                                                                }}>
                                                                    <Pencil size={14} className="mr-2"/> Rename
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeletePipeline(pipeline.id)}>
                                                                    <Trash2 size={14} className="mr-2"/> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    <Droppable droppableId={pipeline.id} type="task">
                                                        {(provided) => (
                                                            <div 
                                                                className="p-2 flex-1 overflow-y-auto"
                                                                ref={provided.innerRef}
                                                                {...provided.droppableProps}
                                                            >
                                                                {tasks
                                                                    .filter(t => t.pipelineId === pipeline.id)
                                                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                                                    .map((task, index) => (
                                                                        <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                            {(provided) => (
                                                                                <div
                                                                                    ref={provided.innerRef}
                                                                                    {...provided.draggableProps}
                                                                                    {...provided.dragHandleProps}
                                                                                    style={{ ...provided.draggableProps.style, marginBottom: '8px' }}
                                                                                >
                                                                                    <TaskCard task={task} onDelete={handleDeleteTask} />
                                                                                </div>
                                                                            )}
                                                                        </Draggable>
                                                                    ))
                                                                }
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </div>
            </DragDropContext>

            {/* Rename Pipeline Dialog */}
            <Dialog open={!!editingPipeline} onOpenChange={(open) => !open && setEditingPipeline(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Rename Pipeline</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input
                            value={renameTitle}
                            onChange={(e) => setRenameTitle(e.target.value)}
                            placeholder="Pipeline Title"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingPipeline(null)}>Cancel</Button>
                        <Button onClick={handleRenamePipeline}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteConfirmDialog 
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title={deleteTarget?.type === 'pipeline' ? "Delete Pipeline" : "Delete Task"}
                description={deleteTarget?.type === 'pipeline'
                    ? "Are you sure you want to delete this pipeline?"
                    : "This action cannot be undone. This will permanently delete the task."
                }
                itemName={deleteTarget?.title || ''}
                onConfirm={confirmDelete}
            />
        </div>
    );
};
