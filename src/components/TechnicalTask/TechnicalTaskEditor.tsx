import React, { useState } from 'react';
import { TechnicalTask, TaskPriority, TaskType } from '../../types/technicalTask';
import { updateTechnicalTask, generateMarkdown } from '../../services/technicalTaskService';
import { Download, Save, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalContext } from '../../contexts/GlobalContext';
import { generateTechnicalTaskSuggestion } from '../../services/anthropic';
import { AiRecommendationButton } from '../Common/AiRecommendationButton';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';

interface EditorProps {
    task: TechnicalTask;
    onSave?: () => void;
}

// Helper components defined OUTSIDE to prevent re-mounting and focus loss
interface RenderFieldProps {
    task: TechnicalTask;
    onUpdate: (path: string[], value: any) => void;
    label: string;
    field: keyof TechnicalTask;
    placeholder?: string;
    multiline?: boolean;
    aiContext?: string;
}

const RenderField: React.FC<RenderFieldProps> = ({ task, onUpdate, label, field, placeholder, multiline, aiContext }) => {
    const { apiKey } = useAuth();
    const { selectedContextIds } = useGlobalContext();

    const handleAiSuggestion = async (context: string) => {
        const prompt = `
            Task Title: ${task.title}
            Task Description: ${task.description}
            Field to Generate: ${label}
            Current Value: ${task[field] || ''}
            
            Please suggest content for the '${label}' field of this technical task.
        `;
        return await generateTechnicalTaskSuggestion(apiKey || '', prompt, context);
    };

    return (
        <div className="flex flex-col gap-2 mb-4">
            <div className="flex justify-between items-center">
                <Label className="font-semibold">{label}</Label>
                {aiContext && (
                    <AiRecommendationButton
                        onGenerate={handleAiSuggestion}
                        onApply={(text) => onUpdate([field as string], text)}
                        contextIds={selectedContextIds}
                        label="Suggest"
                        size="sm"
                        icon={<Sparkles size={12} />}
                    />
                )}
            </div>
            {multiline ? (
                <Textarea
                    placeholder={placeholder}
                    value={(task[field] as string) || ''}
                    onChange={(e) => onUpdate([field as string], e.target.value)}
                    className="min-h-[100px]"
                />
            ) : (
                <Input
                    placeholder={placeholder}
                    value={(task[field] as string) || ''}
                    onChange={(e) => onUpdate([field as string], e.target.value)}
                />
            )}
        </div>
    );
};

const TechnicalTaskEditor: React.FC<EditorProps> = ({ task: initialTask, onSave }) => {
    const [task, setTask] = useState<TechnicalTask>(initialTask);
    const [isSaving, setIsSaving] = useState(false);

    const handleUpdate = (path: string[], value: any) => {
        setTask(prev => {
            const newTask = { ...prev };
            let current: any = newTask;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
            }
            current[path[path.length - 1]] = value;
            return newTask;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateTechnicalTask(task.id, task);
            if (onSave) onSave();
        } catch (error) {
            console.error("Failed to save task", error);
            alert("Failed to save task");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = () => {
        const md = generateMarkdown(task);
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${task.title.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold">{task.title || 'Untitled Task'}</h2>
                    <div className="flex gap-2 mt-2">
                         <Badge variant={
                            task.priority === 'high' ? 'destructive' : 
                            task.priority === 'medium' ? 'default' : 'secondary'
                        }>
                            {task.priority}
                        </Badge>
                        <Badge variant="outline">{task.type}</Badge>
                        <Badge variant="secondary">{task.status}</Badge>
                    </div>
                </div>
                <div className="flex gap-2">
                     <Button variant="outline" onClick={handleDownload} className="cursor-pointer">
                        <Download size={16} className="mr-2" /> Export MD
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="cursor-pointer">
                        <Save size={16} className="mr-2" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="details" className="w-full flex-grow flex flex-col">
                <TabsList className="w-full justify-start">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="implementation">Implementation</TabsTrigger>
                    <TabsTrigger value="qa">QA & Testing</TabsTrigger>
                    <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                </TabsList>

                <div className="flex-grow overflow-auto mt-4 p-1">
                    <TabsContent value="details" className="space-y-4 m-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Core Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="flex flex-col gap-2">
                                        <Label>Priority</Label>
                                        <Select 
                                            value={task.priority} 
                                            onValueChange={(val) => handleUpdate(['priority'], val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select priority" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="critical">Critical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label>Type</Label>
                                        <Select 
                                            value={task.type} 
                                            onValueChange={(val) => handleUpdate(['type'], val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="feature">Feature</SelectItem>
                                                <SelectItem value="bug">Bug</SelectItem>
                                                <SelectItem value="refactor">Refactor</SelectItem>
                                                <SelectItem value="infrastructure">Infrastructure</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <RenderField 
                                    task={task} 
                                    onUpdate={handleUpdate} 
                                    label="Title" 
                                    field="title" 
                                    placeholder="Task title" 
                                />

                                <RenderField 
                                    task={task} 
                                    onUpdate={handleUpdate} 
                                    label="Description" 
                                    field="description" 
                                    multiline 
                                    aiContext="description"
                                    placeholder="High-level description of the task..."
                                />

                                <RenderField 
                                    task={task} 
                                    onUpdate={handleUpdate} 
                                    label="Acceptance Criteria" 
                                    field="acceptanceCriteria" 
                                    multiline 
                                    aiContext="acceptanceCriteria"
                                    placeholder="- [ ] Criterion 1..."
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="implementation" className="space-y-4 m-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Technical Implementation</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <RenderField 
                                    task={task} 
                                    onUpdate={handleUpdate} 
                                    label="Technical Approach" 
                                    field="technicalApproach" 
                                    multiline 
                                    aiContext="technicalApproach"
                                    placeholder="Describe the technical solution..."
                                />
                                
                                <RenderField 
                                    task={task} 
                                    onUpdate={handleUpdate} 
                                    label="Files to Modify" 
                                    field="filesToModify" 
                                    multiline 
                                    aiContext="filesToModify"
                                    placeholder="src/components/..."
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="qa" className="space-y-4 m-0">
                         <Card>
                            <CardHeader>
                                <CardTitle>Quality Assurance</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <RenderField 
                                    task={task} 
                                    onUpdate={handleUpdate} 
                                    label="Testing Strategy" 
                                    field="testingStrategy" 
                                    multiline 
                                    aiContext="testingStrategy"
                                    placeholder="Unit tests, integration tests..."
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="dependencies" className="space-y-4 m-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Dependencies & Risks</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <RenderField 
                                    task={task} 
                                    onUpdate={handleUpdate} 
                                    label="Dependencies" 
                                    field="dependencies" 
                                    multiline 
                                    aiContext="dependencies"
                                    placeholder="Other tasks, libraries, etc."
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default TechnicalTaskEditor;
