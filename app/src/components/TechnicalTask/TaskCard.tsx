import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';
import { TechnicalTask } from '../../types/technicalTask';
import { useNavigate } from 'react-router-dom';
import { useWorkspacePath } from '@/hooks/useWorkspacePath';
import { cn } from "@/lib/utils";

interface TaskCardProps {
    task: TechnicalTask;
    onDelete: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onDelete }) => {
    const navigate = useNavigate();
    const wp = useWorkspacePath();

    const handleClick = () => {
        navigate(wp(`/technical-task/${task.id}`));
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this task?")) {
            onDelete(task.id);
        }
    };

    const getPriorityVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (priority) {
            case 'CRITICAL': return 'destructive';
            case 'HIGH': return 'default'; // Use default (usually black/white) for high
            case 'MEDIUM': return 'secondary';
            case 'LOW': return 'outline';
            default: return 'outline';
        }
    };

    // Helper for badge colors if standard variants aren't enough, 
    // but sticking to semantic variants is better for theming.
    // If specific colors are needed, we can add classes.
    const getPriorityClass = (priority: string) => {
         switch (priority) {
            case 'HIGH': return "bg-orange-500 hover:bg-orange-600 border-transparent text-white"; 
            case 'MEDIUM': return "bg-blue-500 hover:bg-blue-600 border-transparent text-white";
            case 'LOW': return "bg-green-500 hover:bg-green-600 border-transparent text-white";
            default: return "";
        }
    };

    const getTypeVariant = (type: string): "default" | "secondary" | "outline" => {
        return type === 'NEW_TASK' ? 'default' : 'secondary';
    };

    return (
        <Card className="group cursor-pointer shadow-md hover:shadow-lg transition-shadow mb-2 rounded-xl border-border bg-card" onClick={handleClick}>
            <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                        <Badge variant={getTypeVariant(task.type)} className="rounded-full">
                            {task.type.replace('_', ' ')}
                        </Badge>
                        <Badge 
                            variant={task.data.task_metadata.priority === 'CRITICAL' ? 'destructive' : 'outline'}
                            className={cn(task.data.task_metadata.priority !== 'CRITICAL' && getPriorityClass(task.data.task_metadata.priority))}
                        >
                            {task.data.task_metadata.priority}
                        </Badge>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleDelete}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 size={14} />
                    </Button>
                </div>
                <h3 className="font-semibold text-lg leading-tight text-foreground">
                    {task.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                    {task.data.description.main.summary || task.data.description.main.bug_report || "No description"}
                </p>
                <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">{task.data.task_metadata.task_id}</span>
                </div>
            </CardContent>
        </Card>
    );
};
