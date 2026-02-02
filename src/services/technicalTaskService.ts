import { db } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, writeBatch, setDoc } from 'firebase/firestore';
import { TechnicalTask, Pipeline, TechnicalTaskData, TaskType } from '../types/technicalTask';

const TASKS_COLLECTION = 'technicalTasks';
const GLOBAL_TASKS_COLLECTION = 'globalTasks';
const PIPELINES_COLLECTION = 'pipelines';

// --- Pipelines ---

export const getPipelines = async (userId: string, workspaceId?: string): Promise<Pipeline[]> => {
    if (!userId) return [];
    
    let q;
    if (workspaceId) {
        q = query(
            collection(db, PIPELINES_COLLECTION),
            where('workspaceId', '==', workspaceId),
            where('userId', '==', userId)
        );
    } else {
        q = query(
            collection(db, PIPELINES_COLLECTION),
            where('userId', '==', userId)
        );
    }

    const snapshot = await getDocs(q);
    const pipelines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pipeline));
    
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
            // Continue even if cleanup fails, maybe return full list or filtered?
            // Safer to return filtered list to UI even if DB delete failed
        }
        // Remove deleted backlogs from the returned list (keep the first one)
        const keptId = backlogs[0].id;
        const deletedIds = backlogs.slice(1).map(b => b.id);
        return pipelines.filter(p => !deletedIds.includes(p.id));
    }
    
    // Ensure at least one pipeline exists
    if (pipelines.length === 0) {
        // Only auto-create if we are not just querying by workspaceId which might be empty
        // Actually, if a workspace has no pipelines, we should create a default one for it too.
        
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
    const batch = writeBatch(db);

    // For each duplicate, move tasks to keptPipeline and delete duplicate
    for (const duplicate of duplicates) {
        // Find tasks in this duplicate pipeline
        const tasksQuery = query(
            collection(db, TASKS_COLLECTION),
            where('pipelineId', '==', duplicate.id)
        );
        const tasksSnapshot = await getDocs(tasksQuery);

        // Move tasks
        tasksSnapshot.docs.forEach(taskDoc => {
            batch.update(doc(db, TASKS_COLLECTION, taskDoc.id), {
                pipelineId: keptPipeline.id
            });
            // Also update global task if needed? 
            // Yes, strictly speaking, but batchUpdateTasks handles that usually.
            // Here we just fix the reference.
            batch.update(doc(db, GLOBAL_TASKS_COLLECTION, taskDoc.id), {
                pipelineId: keptPipeline.id
            }, { merge: true } as any); // merge true to ignore if missing
        });

        // Delete duplicate pipeline
        batch.delete(doc(db, PIPELINES_COLLECTION, duplicate.id));
    }

    await batch.commit();
};

export const batchUpdatePipelines = async (pipelines: Pipeline[]) => {
    const batch = writeBatch(db);
    pipelines.forEach(p => {
        const ref = doc(db, PIPELINES_COLLECTION, p.id);
        batch.update(ref, { order: p.order });
    });
    await batch.commit();
};

export const batchUpdateTasks = async (tasks: TechnicalTask[]) => {
    const batch = writeBatch(db);
    tasks.forEach(t => {
        const ref = doc(db, TASKS_COLLECTION, t.id);
        const globalRef = doc(db, GLOBAL_TASKS_COLLECTION, t.id);
        
        const updates = { pipelineId: t.pipelineId, order: t.order };
        batch.update(ref, updates);
        // Use set with merge to avoid failing if global task doesn't exist
        // Must include userId to satisfy security rules if creating a new document
        batch.set(globalRef, { ...updates, userId: t.userId }, { merge: true });
    });
    await batch.commit();
};

export const createPipeline = async (userId: string, title: string, order: number, workspaceId?: string): Promise<Pipeline | null> => {
    try {
        const docRef = await addDoc(collection(db, PIPELINES_COLLECTION), {
            userId,
            workspaceId: workspaceId || null,
            title,
            order
        });
        return { id: docRef.id, userId, workspaceId: workspaceId || undefined, title, order };
    } catch (e) {
        console.error("Error creating pipeline: ", e);
        return null;
    }
};

export const updatePipeline = async (pipelineId: string, updates: Partial<Pipeline>): Promise<void> => {
    const docRef = doc(db, PIPELINES_COLLECTION, pipelineId);
    await updateDoc(docRef, updates);
};

export const deletePipeline = async (pipelineId: string): Promise<boolean> => {
    // Check if it's the last one? Ideally UI handles this logic or we check count here.
    // For now, just delete.
    try {
        await deleteDoc(doc(db, PIPELINES_COLLECTION, pipelineId));
        return true;
    } catch (e) {
        console.error("Error deleting pipeline: ", e);
        return false;
    }
};

// ... existing task functions ...
export const getTechnicalTasks = async (userId: string, workspaceId?: string): Promise<TechnicalTask[]> => {
    if (!userId) return [];
    
    let q;
    if (workspaceId) {
        q = query(
            collection(db, TASKS_COLLECTION),
            where('workspaceId', '==', workspaceId),
            where('userId', '==', userId)
        );
    } else {
        q = query(
            collection(db, TASKS_COLLECTION),
            where('userId', '==', userId)
        );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TechnicalTask));
};

export const getTechnicalTask = async (taskId: string): Promise<TechnicalTask | null> => {
    try {
        const docRef = doc(db, TASKS_COLLECTION, taskId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as TechnicalTask;
        }
        return null;
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

        const newTask: any = {
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

        const docRef = await addDoc(collection(db, TASKS_COLLECTION), newTask);
        const task = { id: docRef.id, ...newTask };

        await setDoc(doc(db, GLOBAL_TASKS_COLLECTION, docRef.id), task);

        return task;
    } catch (e) {
        console.error("Error creating technical task: ", e);
        return null;
    }
};

export const updateTechnicalTask = async (taskId: string, updates: Partial<TechnicalTask>): Promise<void> => {
    try {
        const docRef = doc(db, TASKS_COLLECTION, taskId);
        const globalRef = doc(db, GLOBAL_TASKS_COLLECTION, taskId);
        
        const updateData = { ...updates, updatedAt: new Date().toISOString() };
        
        await updateDoc(docRef, updateData);
        await setDoc(globalRef, updateData, { merge: true });
    } catch (e) {
        console.error("Error updating technical task: ", e);
        throw e;
    }
};

export const deleteTechnicalTask = async (taskId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
        await deleteDoc(doc(db, GLOBAL_TASKS_COLLECTION, taskId));
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
        desc.acceptance_criteria.forEach((criteria: string) => {
            md += `- [ ] ${criteria}\n`;
        });
        md += `\n`;
    }

    // Components
    const comps = data.components?.main || {};
    if (comps.files_to_create && comps.files_to_create.length > 0) {
        md += `## Files to Create\n`;
        comps.files_to_create.forEach((file: any) => {
            md += `### ${file.file_path}\n`;
            md += `- **Type:** ${file.file_type}\n`;
            md += `- **Purpose:** ${file.purpose}\n\n`;
        });
    }

    if (comps.files_to_modify && comps.files_to_modify.length > 0) {
        md += `## Files to Modify\n`;
        comps.files_to_modify.forEach((file: any) => {
            md += `### ${file.file_path}\n`;
            md += `- **Reason:** ${file.reason}\n`;
            md += `- **Lines:** ${file.lines_affected}\n`;
            md += `- **Current Issue:** ${file.current_issue}\n`;
            md += `- **Proposed Fix:** ${file.proposed_fix}\n\n`;
        });
    }

    // Validation Checklist
    const validation = data.validation_checklist?.main || {};
    if (validation.checklist_items && validation.checklist_items.length > 0) {
        md += `## Validation Checklist\n`;
        validation.checklist_items.forEach((item: string) => {
            md += `- [ ] ${item}\n`;
        });
        md += `\n`;
    }

    return md;
};
