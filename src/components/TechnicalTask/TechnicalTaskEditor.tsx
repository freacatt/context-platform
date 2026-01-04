import React, { useState } from 'react';
import { Box, Flex, Heading, Text, Tabs, TextField, TextArea, Button, Badge, Card, Select } from '@radix-ui/themes';
import { TechnicalTask, TaskPriority, TaskType } from '../../types/technicalTask';
import { updateTechnicalTask, generateMarkdown } from '../../services/technicalTaskService';
import { Download, Save, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalContext } from '../../contexts/GlobalContext';
import { generateTechnicalTaskSuggestion } from '../../services/anthropic';
import { AiRecommendationButton } from '../Common/AiRecommendationButton';

interface EditorProps {
    task: TechnicalTask;
    onSave?: () => void;
}

// Helper components defined OUTSIDE to prevent re-mounting and focus loss
interface RenderFieldProps {
    task: TechnicalTask;
    onUpdate: (path: string[], value: any) => void;
    label: string;
    description?: string;
    path: string[];
    multiline?: boolean;
    placeholder?: string;
    apiKey: string;
    globalContext: string;
}

const RenderField: React.FC<RenderFieldProps> = ({ task, onUpdate, label, description, path, multiline = false, placeholder = "AI Recommendation...", apiKey, globalContext }) => {
    // Resolve value
    let value: any = task.data;
    for (const p of path) {
        value = value?.[p];
    }
    value = value || "";

    return (
        <Box mb="4">
            <Flex justify="between" align="center" mb="1">
                <Text size="2" weight="bold" as="div">{label}</Text>
                <AiRecommendationButton
                    onGenerate={(apiKey, globalContext) => generateTechnicalTaskSuggestion(
                        apiKey,
                        task.title,
                        task.type,
                        label,
                        description || label,
                        JSON.stringify(task.data, null, 2),
                        globalContext
                    )}
                    onSuccess={(suggestion) => onUpdate(path, suggestion)}
                    label="AI Suggest"
                    size="1"
                    variant="soft"
                    icon={<Sparkles size={12} style={{marginRight: 4}} />}
                />
            </Flex>
            {description && (
                <Text size="1" color="gray" mb="2" as="div">{description}</Text>
            )}
            <TextArea 
                value={value} 
                onChange={e => onUpdate(path, e.target.value)} 
                placeholder={placeholder}
                rows={multiline ? 4 : 2}
                style={{ resize: 'vertical' }}
            />
        </Box>
    );
};

interface RenderFlexibleFieldProps {
    task: TechnicalTask;
    onUpdate: (path: string[], value: any) => void;
    label: string;
    description?: string;
    path: string[];
    rows?: number;
    apiKey: string;
    globalContext: string;
}

const RenderFlexibleField: React.FC<RenderFlexibleFieldProps> = ({ task, onUpdate, label, description, path, rows = 6, apiKey, globalContext }) => {
    let value: any = task.data;
    for (const p of path) {
        value = value?.[p];
    }

    // Display string if string, else JSON
    const displayValue = typeof value === 'string' ? value : JSON.stringify(value || [], null, 2);

    return (
            <Box mb="4">
            <Flex justify="between" align="center" mb="1">
                <Text size="2" weight="bold" as="div">{label}</Text>
                <AiRecommendationButton
                    onGenerate={(apiKey, globalContext) => generateTechnicalTaskSuggestion(
                        apiKey,
                        task.title,
                        task.type,
                        label,
                        description || label,
                        JSON.stringify(task.data, null, 2),
                        globalContext
                    )}
                    onSuccess={(suggestion) => onUpdate(path, suggestion)}
                    label="AI Suggest"
                    size="1"
                    variant="soft"
                    icon={<Sparkles size={12} style={{marginRight: 4}} />}
                />
            </Flex>
            {description && (
                <Text size="1" color="gray" mb="2" as="div">{description}</Text>
            )}
            <TextArea 
                value={displayValue}
                onChange={e => {
                    onUpdate(path, e.target.value);
                }}
                rows={rows}
                className="font-mono text-xs"
                placeholder="Enter details..."
            />
        </Box>
    );
};

export const TechnicalTaskEditor: React.FC<EditorProps> = ({ task, onSave }) => {
    const { apiKey } = useAuth();
    const { aggregatedContext } = useGlobalContext();
    const [currentTask, setCurrentTask] = useState<TechnicalTask>(task);
    const [isSaving, setIsSaving] = useState(false);

    const handleUpdate = async (path: string[], value: any) => {
        const newTask = JSON.parse(JSON.stringify(currentTask)); // Deep clone
        let current = newTask.data;
        
        for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) current[path[i]] = {};
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;

        setCurrentTask(newTask);
    };

    const saveChanges = async () => {
        setIsSaving(true);
        try {
            // Ensure data syncs
            const updatedData = { ...currentTask.data };
            updatedData.description.main.title = currentTask.title;
            // task_type is now fixed, but we sync it just in case
            updatedData.task_metadata.task_type = currentTask.type;
            updatedData.task_metadata.priority = currentTask.data.task_metadata.priority;

            await updateTechnicalTask(currentTask.id, { 
                title: currentTask.title,
                type: currentTask.type,
                data: updatedData
            });
            if (onSave) onSave();
        } catch (error) {
            console.error("Failed to save", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = () => {
        const md = generateMarkdown(currentTask);
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentTask.data.task_metadata.task_id || 'task'}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const isNewTask = currentTask.type === 'NEW_TASK';

    return (
        <Flex direction="column" className="h-full">
            {/* Toolbar */}
            <Flex justify="between" align="center" className="p-4 border-b bg-white sticky top-0 z-10">
                <Flex align="center" gap="3" className="flex-1 mr-4">
                    <Box className="flex-1">
                        <Flex justify="between" align="center" mb="1">
                            <Text size="1" color="gray" weight="bold">Task Title</Text>
                            <AiRecommendationButton
                                onGenerate={(apiKey, globalContext) => generateTechnicalTaskSuggestion(
                                    apiKey,
                                    currentTask.title,
                                    currentTask.type,
                                    "Task Title",
                                    "A concise and descriptive title for this technical task",
                                    JSON.stringify(currentTask.data, null, 2),
                                    globalContext
                                )}
                                onSuccess={(suggestion) => setCurrentTask({ ...currentTask, title: suggestion })}
                                label="AI Suggest"
                                size="1"
                                variant="ghost"
                            />
                        </Flex>
                        <TextArea 
                            value={currentTask.title} 
                            onChange={e => setCurrentTask({ ...currentTask, title: e.target.value })}
                            placeholder="Task Title"
                            size="2"
                            rows={1}
                            style={{ resize: 'vertical', fontWeight: 'bold' }}
                        />
                    </Box>
                    <Select.Root 
                        value={currentTask.data.task_metadata.priority} 
                        onValueChange={v => handleUpdate(['task_metadata', 'priority'], v)}
                    >
                        <Select.Trigger placeholder="Priority" />
                        <Select.Content>
                            <Select.Item value="LOW">Low</Select.Item>
                            <Select.Item value="MEDIUM">Medium</Select.Item>
                            <Select.Item value="HIGH">High</Select.Item>
                            <Select.Item value="CRITICAL">Critical</Select.Item>
                        </Select.Content>
                    </Select.Root>
                    <Badge size="2" color={isNewTask ? 'blue' : 'amber'} variant="soft">
                        {isNewTask ? 'New Task' : 'Fix Task'}
                    </Badge>
                </Flex>
                <Flex gap="3">
                    <Button variant="outline" onClick={handleExport}>
                        <Download size={16} /> Export .md
                    </Button>
                    <Button onClick={saveChanges} disabled={isSaving}>
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </Flex>
            </Flex>

            {/* Content */}
            <Box className="flex-1 overflow-auto p-4 bg-gray-50">
                <Box className="container mx-auto max-w-4xl">
                    <Tabs.Root defaultValue="description">
                        <Tabs.List>
                            <Tabs.Trigger value="description">Description</Tabs.Trigger>
                            <Tabs.Trigger value="components">Components</Tabs.Trigger>
                            <Tabs.Trigger value="architecture">Architecture</Tabs.Trigger>
                            <Tabs.Trigger value="dependencies">Dependencies</Tabs.Trigger>
                            <Tabs.Trigger value="tests">Unit Tests</Tabs.Trigger>
                            <Tabs.Trigger value="validation">Validation</Tabs.Trigger>
                            <Tabs.Trigger value="preservation">Preservation</Tabs.Trigger>
                        </Tabs.List>

                        <Box pt="4">
                            <Tabs.Content value="description">
                                <Card>
                                    <Heading size="3" mb="4">Main Description</Heading>
                                    {isNewTask ? (
                                        <>
                                            <RenderField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Summary" description="A brief overview of the new functionality." path={['description', 'main', 'summary']} multiline />
                                            <RenderField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Detailed Requirements" description="In-depth functional and non-functional requirements." path={['description', 'advanced', 'detailed_requirements']} multiline />
                                        </>
                                    ) : (
                                        <>
                                            <RenderField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Bug Report" description="Detailed description of the bug, including steps to reproduce." path={['description', 'main', 'bug_report']} multiline />
                                            <RenderField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Actual Behavior" description="What is currently happening." path={['description', 'main', 'actual_behavior']} multiline />
                                            <RenderField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Expected Behavior" description="What should happen instead." path={['description', 'main', 'expected_behavior']} multiline />
                                            <RenderField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Root Cause Analysis" description="Analysis of why the bug occurred." path={['description', 'advanced', 'root_cause_analysis']} multiline />
                                        </>
                                    )}
                                    <RenderField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Impact" description="The effect of this task/bug on the overall system or users." path={['description', 'main', 'impact']} />
                                </Card>
                            </Tabs.Content>

                            <Tabs.Content value="components">
                                    <Card>
                                    <Heading size="3" mb="4">Files & Components</Heading>
                                    <Text size="2" color="gray" mb="4">
                                        Define the code changes required.
                                    </Text>
                                    {isNewTask ? (
                                        <>
                                            <RenderFlexibleField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Files to Create" description="List of new files to be added to the codebase." path={['components', 'main', 'files_to_create']} rows={10} />
                                            <RenderFlexibleField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="New Components" description="Details of new components to be implemented." path={['components', 'advanced', 'new_components_if_needed']} rows={6} />
                                        </>
                                    ) : (
                                        <>
                                            <RenderFlexibleField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Files to Modify" description="List of existing files that need changes." path={['components', 'main', 'files_to_modify']} rows={10} />
                                            <RenderFlexibleField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Functions to Fix" description="Specific functions that require fixes." path={['components', 'main', 'functions_to_fix']} rows={6} />
                                        </>
                                    )}
                                    </Card>
                            </Tabs.Content>

                            <Tabs.Content value="architecture">
                                <Card>
                                    <Heading size="3" mb="4">Architecture</Heading>
                                    <RenderField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Design Pattern" description="The architectural pattern to be applied." path={['architecture', 'main', 'design_pattern']} />
                                    <RenderField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Layer" description="The application layer affected." path={['architecture', 'main', 'layer']} />
                                    
                                    <Heading size="3" mb="4" mt="6">Advanced</Heading>
                                    <RenderField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Scalability Considerations" description="How this change affects system scalability." path={['architecture', 'advanced', 'scalability_considerations']} multiline />
                                    <RenderField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Performance Impact" description="Potential impact on system performance." path={['architecture', 'advanced', 'performance_impact']} />
                                </Card>
                            </Tabs.Content>

                                <Tabs.Content value="dependencies">
                                <Card>
                                    <Heading size="3" mb="4">Dependencies</Heading>
                                    <RenderFlexibleField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="External Libraries" description="New dependencies or libraries required." path={['dependencies', 'main', 'external_libraries']} rows={8} />
                                </Card>
                            </Tabs.Content>

                            <Tabs.Content value="tests">
                                <Card>
                                    <Heading size="3" mb="4">Unit Tests</Heading>
                                    <RenderField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Test Framework" description="The testing framework to be used." path={['unit_tests', 'main', 'test_framework']} />
                                    <RenderField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Coverage Target" description="The target code coverage percentage." path={['unit_tests', 'main', 'coverage_target']} />
                                    <RenderFlexibleField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Critical Tests" description="Key test cases that must pass." path={['unit_tests', 'main', 'critical_tests']} rows={6} />
                                </Card>
                            </Tabs.Content>

                            <Tabs.Content value="validation">
                                <Card>
                                    <Heading size="3" mb="4">Validation Checklist</Heading>
                                    <RenderFlexibleField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Code Quality Checks" description="Checklist for code review and quality assurance." path={['validation_checklist', 'advanced', 'code_quality']} rows={8} />
                                </Card>
                            </Tabs.Content>

                                <Tabs.Content value="preservation">
                                <Card>
                                    <Heading size="3" mb="4">Preservation Rules</Heading>
                                    <RenderFlexibleField task={currentTask} onUpdate={handleUpdate} apiKey={apiKey} globalContext={aggregatedContext} label="Existing Functionality to Preserve" description="Features that must remain unchanged." path={['preservation_rules', 'main', 'existing_functionality_to_preserve']} rows={10} />
                                </Card>
                            </Tabs.Content>
                        </Box>
                    </Tabs.Root>
                </Box>
            </Box>
        </Flex>
    );
};
