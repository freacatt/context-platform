import { storage } from './storage';
import { TechnicalTask, Pipeline, TechnicalTaskData, TaskType } from '../types/technicalTask';

const TASKS_COLLECTION = 'technicalTasks';
const GLOBAL_TASKS_COLLECTION = 'globalTasks';
const PIPELINES_COLLECTION = 'pipelines';

// --- Pipelines ---

export const getPipelines = async (userId: string, workspaceId?: string): Promise<Pipeline[]> => {
    if (!userId) return [];
    
    // storage.query supports multiple filters
    const pipelines = await storage.query(PIPELINES_COLLECTION, { userId, workspaceId });
    
    // Sort in memory
    pipelines.sort((a, b) => a.order - b.order);

    // Check for duplicate "Backlog" pipelines and clean them up
    const backlogs = pipelines.filter(p => p.title === 'Backlog');
    if (backlogs.length > 1) {
        console.log("Found duplicate Backlog pipelines, cleaning up...");
        try {
            await deduplicateBacklogs(backlogs);
        } catch (error) {
            console.error("Error deduplicating backlogs:", error);
        }
        // Remove deleted backlogs from the returned list (keep the first one)
        const keptId = backlogs[0].id;
        const deletedIds = backlogs.slice(1).map(b => b.id);
        return pipelines.filter(p => !deletedIds.includes(p.id));
    }
    
    // Ensure at least one pipeline exists
    if (pipelines.length === 0) {
        const defaultPipeline = await createPipeline(userId, 'Backlog', 0, workspaceId);
        if (defaultPipeline) return [defaultPipeline];
    }
    
    return pipelines;
};

// Helper function to deduplicate Backlog pipelines
const deduplicateBacklogs = async (backlogs: Pipeline[]) => {
    if (backlogs.length <= 1) return;

    const keptPipeline = backlogs[0];
    const duplicates = backlogs.slice(1);

    // For each duplicate, move tasks to keptPipeline and delete duplicate
    for (const duplicate of duplicates) {
        // Find tasks in this duplicate pipeline
        const tasks = await storage.query(TASKS_COLLECTION, { pipelineId: duplicate.id });

        // Move tasks
        const updatePromises = tasks.map(async (task) => {
            await storage.update(TASKS_COLLECTION, task.id, { pipelineId: keptPipeline.id });
            // Also update global task
            await storage.update(GLOBAL_TASKS_COLLECTION, task.id, { pipelineId: keptPipeline.id });
        });
        await Promise.all(updatePromises);

        // Delete duplicate pipeline
        await storage.delete(PIPELINES_COLLECTION, duplicate.id);
    }
};

export const batchUpdatePipelines = async (pipelines: Pipeline[]) => {
    const promises = pipelines.map(p => 
        storage.update(PIPELINES_COLLECTION, p.id, { order: p.order })
    );
    await Promise.all(promises);
};

export const batchUpdateTasks = async (tasks: TechnicalTask[]) => {
    const promises = tasks.map(async (t) => {
        const updates = { pipelineId: t.pipelineId, order: t.order };
        await storage.update(TASKS_COLLECTION, t.id, updates);
        
        // Use save (which acts as set/update) for global task to ensure it exists
        // But storage.update is partial update. storage.save is full overwrite or create.
        // If we want merge behavior, storage.update is fine if it exists.
        // Original code used set with merge: true.
        // Let's assume global task exists if local task exists.
        // Or we can try update, and if fails (not found), save.
        // For simplicity and performance in this batch op, we assume existence or use update.
        // Actually, storage.update handles local/cloud.
        await storage.update(GLOBAL_TASKS_COLLECTION, t.id, updates);
    });
    await Promise.all(promises);
};

export const createPipeline = async (userId: string, title: string, order: number, workspaceId?: string): Promise<Pipeline | null> => {
    try {
        const id = storage.createId();
        const pipelineData = {
            id,
            userId,
            workspaceId: workspaceId || null,
            title,
            order
        };
        await storage.save(PIPELINES_COLLECTION, pipelineData);
        return { ...pipelineData, workspaceId: workspaceId || undefined };
    } catch (e) {
        console.error("Error creating pipeline: ", e);
        return null;
    }
};

export const updatePipeline = async (pipelineId: string, updates: Partial<Pipeline>): Promise<void> => {
    await storage.update(PIPELINES_COLLECTION, pipelineId, updates);
};

export const deletePipeline = async (pipelineId: string): Promise<boolean> => {
    try {
        await storage.delete(PIPELINES_COLLECTION, pipelineId);
        return true;
    } catch (e) {
        console.error("Error deleting pipeline: ", e);
        return false;
    }
};

// ... existing task functions ...
export const getTechnicalTasks = async (userId: string, workspaceId?: string): Promise<TechnicalTask[]> => {
    if (!userId) return [];
    
    // storage.query supports filters
    const tasks = await storage.query(TASKS_COLLECTION, { userId, workspaceId });
    return tasks as TechnicalTask[];
};

export const getTechnicalTask = async (taskId: string): Promise<TechnicalTask | null> => {
    try {
        const data = await storage.get(TASKS_COLLECTION, taskId);
        return data as TechnicalTask | null;
    } catch (e) {
        console.error("Error getting technical task:", e);
        return null;
    }
};

export const createTechnicalTask = async (
    userId: string, 
    pipelineId: string, 
    title: string, 
    type: TaskType, 
    technicalArchitectureId: string, 
    data?: TechnicalTaskData, 
    workspaceId?: string
): Promise<TechnicalTask | null> => {
    try {
        const defaultData: any = {
            task_metadata: {
                task_id: "",
                task_type: type,
                parent_architecture_ref: technicalArchitectureId,
                created_at: new Date().toISOString(),
                priority: 'MEDIUM',
                status: 'PENDING',
                assigned_to: userId,
                estimated_hours: 0
            },
            description: { main: { title }, advanced: {} },
            components: { main: {}, advanced: {} },
            architecture: { main: {}, advanced: {} },
            dependencies: { main: {}, advanced: {} },
            unit_tests: { main: {}, advanced: {} },
            validation_checklist: { main: {}, advanced: {} },
            preservation_rules: { main: {}, advanced: {} }
        };

        const id = storage.createId();
        const newTask: any = {
            id,
            userId,
            pipelineId,
            title,
            type,
            technicalArchitectureId,
            workspaceId: workspaceId || null,
            data: data || defaultData, 
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            order: 0
        };

        await storage.save(TASKS_COLLECTION, newTask);
        await storage.save(GLOBAL_TASKS_COLLECTION, newTask);

        return newTask;
    } catch (e) {
        console.error("Error creating technical task: ", e);
        return null;
    }
};

export const updateTechnicalTask = async (taskId: string, updates: Partial<TechnicalTask>): Promise<void> => {
    try {
        const updateData = { ...updates, updatedAt: new Date().toISOString() };
        
        await storage.update(TASKS_COLLECTION, taskId, updateData);
        await storage.update(GLOBAL_TASKS_COLLECTION, taskId, updateData);
    } catch (e) {
        console.error("Error updating technical task: ", e);
        throw e;
    }
};

export const deleteTechnicalTask = async (taskId: string): Promise<boolean> => {
    try {
        await storage.delete(TASKS_COLLECTION, taskId);
        await storage.delete(GLOBAL_TASKS_COLLECTION, taskId);
        return true;
    } catch (e) {
        console.error("Error deleting technical task: ", e);
        return false;
    }
};

export const generateMarkdown = (task: TechnicalTask): string => {
    const data = task.data;
    const meta = data.task_metadata;
    const desc = data.description?.main || {};
    
    let md = `# ${desc.title || task.title}\n\n`;
    
    // Metadata
    md += `## Metadata\n`;
    md += `- **ID:** ${meta.task_id || task.id}\n`;
    md += `- **Type:** ${meta.task_type}\n`;
    md += `- **Priority:** ${meta.priority}\n`;
    md += `- **Status:** ${meta.status}\n`;
    md += `- **Created:** ${new Date(meta.created_at).toLocaleString()}\n`;
    md += `- **Estimated Hours:** ${meta.estimated_hours}\n\n`;

    // Description
    md += `## Description\n`;
    if (desc.summary) md += `### Summary\n${desc.summary}\n\n`;
    if (desc.bug_report) md += `### Bug Report\n${desc.bug_report}\n\n`;
    if (desc.impact) md += `### Impact\n${desc.impact}\n\n`;
    
    if (desc.steps_to_reproduce && desc.steps_to_reproduce.length > 0) {
        md += `### Steps to Reproduce\n`;
        desc.steps_to_reproduce.forEach((step: string, i: number) => {
            md += `${i + 1}. ${step}\n`;
        });
        md += `\n`;
    }
    
    if (desc.acceptance_criteria && desc.acceptance_criteria.length > 0) {
        md += `### Acceptance Criteria\n`;
        desc.acceptance_criteria.forEach((criteria: string, i: number) => {
            md += `- [ ] ${criteria}\n`;
        });
        md += `\n`;
    }

    return md;
};
