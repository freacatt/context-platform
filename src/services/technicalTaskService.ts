import { db } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, writeBatch, setDoc } from 'firebase/firestore';
import { TechnicalTask, Pipeline, TechnicalTaskData, TaskType } from '../types/technicalTask';

const TASKS_COLLECTION = 'technicalTasks';
const GLOBAL_TASKS_COLLECTION = 'globalTasks';
const PIPELINES_COLLECTION = 'pipelines';

// --- Pipelines ---

export const getPipelines = async (userId: string): Promise<Pipeline[]> => {
    if (!userId) return [];
    // Remove orderBy to avoid composite index requirement
    const q = query(
        collection(db, PIPELINES_COLLECTION),
        where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const pipelines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pipeline));
    
    // Sort in memory
    pipelines.sort((a, b) => a.order - b.order);
    
    // Ensure at least one pipeline exists
    if (pipelines.length === 0) {
        // Double check to prevent race condition in strict mode
        const qCheck = query(
            collection(db, PIPELINES_COLLECTION),
            where('userId', '==', userId)
        );
        const snapshotCheck = await getDocs(qCheck);
        if (snapshotCheck.empty) {
            const defaultPipeline = await createPipeline(userId, 'Backlog', 0);
            if (defaultPipeline) return [defaultPipeline];
        } else {
            const existing = snapshotCheck.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pipeline));
            existing.sort((a, b) => a.order - b.order);
            return existing;
        }
    }
    
    return pipelines;
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
        // We assume global task exists if technical task exists
        batch.update(globalRef, updates);
    });
    await batch.commit();
};

export const createPipeline = async (userId: string, title: string, order: number): Promise<Pipeline | null> => {
    try {
        const docRef = await addDoc(collection(db, PIPELINES_COLLECTION), {
            userId,
            title,
            order
        });
        return { id: docRef.id, userId, title, order };
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

// --- Tasks ---

export const getTechnicalTask = async (taskId: string): Promise<TechnicalTask | null> => {
    try {
        const docRef = doc(db, TASKS_COLLECTION, taskId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
            } as TechnicalTask;
        }
        return null;
    } catch (e: any) {
        if (e?.code !== 'permission-denied') {
            console.error("Error fetching technical task: ", e);
        }
        return null;
    }
};

export const getTechnicalTasks = async (userId: string): Promise<TechnicalTask[]> => {
    if (!userId) return [];
    try {
        const q = query(collection(db, TASKS_COLLECTION), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
            } as TechnicalTask;
        });
    } catch (e: any) {
        if (e?.code !== 'permission-denied') {
            console.error("Error fetching technical tasks: ", e);
        }
        return [];
    }
};

export const createTechnicalTask = async (
    userId: string, 
    pipelineId: string, 
    title: string, 
    type: TaskType, 
    technicalArchitectureId: string,
    initialData?: Partial<TechnicalTaskData>
): Promise<TechnicalTask | null> => {
    
    const defaultData: TechnicalTaskData = {
        task_metadata: {
            task_id: `task_${Date.now()}`,
            task_type: type,
            parent_architecture_ref: technicalArchitectureId,
            created_at: new Date().toISOString(),
            priority: 'MEDIUM',
            status: 'PENDING',
            assigned_to: 'AI_AGENT',
            estimated_hours: 0
        },
        description: { main: { title }, advanced: {} },
        components: { main: {}, advanced: {} },
        architecture: { main: {}, advanced: {} },
        dependencies: { main: {}, advanced: {} },
        unit_tests: { main: { test_framework: 'Jest', coverage_target: '90%', critical_tests: [] }, advanced: {} },
        validation_checklist: { main: {}, advanced: { code_quality: [], documentation: [] } },
        preservation_rules: { main: { existing_functionality_to_preserve: [], non_breaking_requirements: {} as any }, advanced: { integration_safety: {}, rollback_plan: '' } }
    };

    // Merge initialData if provided (deep merge might be better but shallow for top sections is ok for now)
    const data = { ...defaultData, ...initialData };

    const newTask: Omit<TechnicalTask, 'id'> = {
        userId,
        pipelineId,
        title,
        type,
        technicalArchitectureId,
        data,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: 0 // Should be calculated to be at top/bottom
    };

    try {
        const docRef = await addDoc(collection(db, TASKS_COLLECTION), newTask);
        
        // Sync to Global Tasks
        // We include the ID in the document for easier RAG retrieval if needed
        await setDoc(doc(db, GLOBAL_TASKS_COLLECTION, docRef.id), {
            ...newTask,
            id: docRef.id
        });

        return { id: docRef.id, ...newTask };
    } catch (e) {
        console.error("Error creating technical task: ", e);
        return null;
    }
};

export const updateTechnicalTask = async (taskId: string, updates: Partial<TechnicalTask>): Promise<void> => {
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    const globalDocRef = doc(db, GLOBAL_TASKS_COLLECTION, taskId);
    
    const updateData = { ...updates, updatedAt: new Date() };

    await updateDoc(docRef, updateData);
    // Sync to Global Tasks
    await updateDoc(globalDocRef, updateData).catch(err => {
        console.warn(`Failed to update global task ${taskId}, it might not exist yet.`, err);
        // If it doesn't exist, we might want to create it, but updateDoc fails if not exists.
        // For now, logging is enough, or we could use setDoc with merge: true if we were sure.
    });
};

export const deleteTechnicalTask = async (taskId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
        await deleteDoc(doc(db, GLOBAL_TASKS_COLLECTION, taskId)).catch(err => {
            console.warn(`Failed to delete global task ${taskId}`, err);
        });
        return true;
    } catch (e) {
        console.error("Error deleting technical task: ", e);
        return false;
    }
};

// --- Export to Markdown ---

export const generateMarkdown = (task: TechnicalTask): string => {
    const { data } = task;
    const md: string[] = [];

    md.push(`# ${data.description.main.title || task.title}`);
    md.push(`**ID:** ${data.task_metadata.task_id} | **Type:** ${data.task_metadata.task_type} | **Priority:** ${data.task_metadata.priority}`);
    md.push(`\n## Description`);
    if (data.description.main.summary) md.push(data.description.main.summary);
    if (data.description.main.bug_report) md.push(`**Bug Report:** ${data.description.main.bug_report}`);
    if (data.description.main.acceptance_criteria?.length) {
        md.push(`\n### Acceptance Criteria`);
        data.description.main.acceptance_criteria.forEach(ac => md.push(`- ${ac}`));
    }

    md.push(`\n## Components`);
    if (data.components.main.files_to_create?.length) {
        md.push(`\n### Files to Create`);
        data.components.main.files_to_create.forEach(f => md.push(`- **${f.file_path}** (${f.file_type}): ${f.purpose}`));
    }
    if (data.components.main.files_to_modify?.length) {
        md.push(`\n### Files to Modify`);
        data.components.main.files_to_modify.forEach(f => md.push(`- **${f.file_path}**: ${f.reason}`));
    }

    md.push(`\n## Architecture`);
    if (data.architecture.main.design_pattern) md.push(`**Design Pattern:** ${data.architecture.main.design_pattern}`);
    if (data.architecture.main.data_flow?.length) {
        md.push(`\n### Data Flow`);
        data.architecture.main.data_flow.forEach((step, i) => md.push(`${i + 1}. ${step}`));
    }

    md.push(`\n## Unit Tests`);
    if (data.unit_tests.main.critical_tests?.length) {
        md.push(`\n### Critical Tests`);
        data.unit_tests.main.critical_tests.forEach(t => md.push(`- [ ] ${t}`));
    }

    // Add more sections as needed...
    
    return md.join('\n');
};
