import * as XLSX from 'xlsx';
import { Pyramid, ContextDocument, ProductDefinition, TechnicalArchitecture } from '../types';
import { generateMarkdown as generateTechnicalArchitectureMarkdown } from './technicalArchitectureService';
import { getUserPyramids } from './pyramidService';
import { getUserProductDefinitions } from './productDefinitionService';
import { getUserContextDocuments } from './contextDocumentService';
import { getUserTechnicalArchitectures } from './technicalArchitectureService';
import { getTechnicalTasks, getPipelines } from './technicalTaskService';
import { getUserUiUxArchitectures } from './uiUxArchitectureService';
import { getUserDirectories } from './directoryService';
import { getUserDiagrams } from './diagramService';
import { createWorkspace } from './workspaceService';
import { storage } from './storage';


// ==========================================
// Helper Functions
// ==========================================

const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const getSafeFilename = (title: string, suffix: string) => {
  return `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${suffix}`;
};

// ==========================================
// Pyramid Export Logic
// ==========================================

const preparePyramidData = (pyramid: Pyramid) => {
  if (!pyramid || !pyramid.blocks) return null;

  const blocksData = Object.values(pyramid.blocks).map(block => {
    const [u, v] = block.id.split('-').map(Number);
    const rank = u + 1;
    const file = String.fromCharCode(65 + v);
    const chessId = `${rank}-${file}`;

    let type = 'question';
    if (block.answer && block.question) type = 'answer-question';
    else if (block.parentIds && block.parentIds.length > 1) type = 'combined';

    const parents = block.parentIds ? block.parentIds.map(pid => {
        const [pu, pv] = pid.split('-').map(Number);
        return `${pu+1}-${String.fromCharCode(65+pv)}`;
    }).join(', ') : '';

    const childrenIds = Object.values(pyramid.blocks)
        .filter(b => b.parentIds && b.parentIds.includes(block.id))
        .map(b => {
            const [cu, cv] = b.id.split('-').map(Number);
            return `${cu+1}-${String.fromCharCode(65+cv)}`;
        })
        .join(', ');

    return {
      "Block ID": chessId,
      "Position (Row, Col)": `${rank}, ${file}`,
      "Type": type,
      "Question": block.question || block.content || '',
      "Answer": block.answer || '',
      "Parent IDs": parents,
      "Child IDs": childrenIds
    };
  });

  blocksData.sort((a, b) => a["Block ID"].localeCompare(b["Block ID"], undefined, { numeric: true, sensitivity: 'base' }));

  const header = ["Block ID", "Position", "Type", "Question", "Answer", "Parent IDs", "Child IDs"];
  const rows = blocksData.map(b => [
    b["Block ID"], 
    b["Position (Row, Col)"], 
    b["Type"], 
    b["Question"], 
    b["Answer"], 
    b["Parent IDs"], 
    b["Child IDs"]
  ]);

  return { blocksData, header, rows };
};

export const exportPyramidToExcel = (pyramid: Pyramid) => {
  const data = preparePyramidData(pyramid);
  if (!data) return;

  const { header, rows } = data;
  const workbook = XLSX.utils.book_new();

  const dataWithMetadata = [
    [`Pyramid Title: ${pyramid.title}`],
    [`Context: ${pyramid.context || "N/A"}`],
    [],
    header,
    ...rows
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(dataWithMetadata);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pyramid Data");
  XLSX.writeFile(workbook, getSafeFilename(pyramid.title, 'export.xlsx'));
};

// Alias for backward compatibility
export const exportToExcel = exportPyramidToExcel;

export const exportPyramidToMarkdown = (pyramid: Pyramid) => {
  const data = preparePyramidData(pyramid);
  if (!data) return;

  let md = `# ${pyramid.title}\n\n`;
  md += `**Context**: ${pyramid.context || "N/A"}\n\n`;
  md += `## Blocks\n\n`;
  
  // Create Markdown Table
  md += `| ${data.header.join(' | ')} |\n`;
  md += `| ${data.header.map(() => '---').join(' | ')} |\n`;
  
  data.rows.forEach(row => {
    // Escape pipes in content
    const safeRow = row.map(cell => String(cell).replace(/\|/g, '\\|').replace(/\n/g, '<br>'));
    md += `| ${safeRow.join(' | ')} |\n`;
  });

  downloadFile(md, getSafeFilename(pyramid.title, 'export.md'), 'text/markdown');
};

// ==========================================
// Context Document Export Logic
// ==========================================

export const exportContextToExcel = (doc: ContextDocument) => {
  const workbook = XLSX.utils.book_new();
  const data = [
    ["Title", doc.title],
    ["Type", doc.type],
    ["Created At", doc.createdAt ? doc.createdAt.toLocaleString() : ''],
    [],
    ["Content"],
    [doc.content]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Context Document");
  XLSX.writeFile(workbook, getSafeFilename(doc.title, 'context.xlsx'));
};

export const exportContextToMarkdown = (doc: ContextDocument) => {
  let md = `# ${doc.title}\n\n`;
  md += `- **Type**: ${doc.type}\n`;
  md += `- **Created**: ${doc.createdAt ? doc.createdAt.toLocaleString() : ''}\n\n`;
  md += `---\n\n`;
  md += `${doc.content}\n`;

  downloadFile(md, getSafeFilename(doc.title, 'context.md'), 'text/markdown');
};

// ==========================================
// Product Definition Export Logic
// ==========================================

const prepareProductDefinitionData = (def: ProductDefinition) => {
  if (!def || !def.data) return null;

  // Flatten the tree for table representation
  const rows: any[] = [];
  const traverse = (nodeId: string, depth = 0) => {
    const node = def.data[nodeId];
    if (!node) return;

    rows.push({
      "ID": node.id,
      "Label": '  '.repeat(depth) + node.label,
      "Question": node.question || '',
      "Description": node.description || ''
    });

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(childId => traverse(childId, depth + 1));
    }
  };

  if (def.data.root) {
    traverse('root');
  } else {
    // Fallback if no root, just list all
    Object.values(def.data).forEach(node => {
      rows.push({
        "ID": node.id,
        "Label": node.label,
        "Question": node.question || '',
        "Description": node.description || ''
      });
    });
  }

  return rows;
};

export const exportProductDefinitionToExcel = (def: ProductDefinition) => {
  console.log("Exporting Product Definition:", def);

  const rows = prepareProductDefinitionData(def);
  if (!rows) {
    console.error("Failed to prepare data for export. 'data' property might be missing in definition.");
    return;
  }

  const workbook = XLSX.utils.book_new();
  
  const title = def.title || "Untitled Product Definition";
  const header = ["ID", "Label", "Question", "Description"];
  const data = [
    [`Product Definition: ${title}`],
    [],
    header,
    ...rows.map(r => [r.ID, r.Label, r.Question, r.Description])
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Product Definition");
  XLSX.writeFile(workbook, getSafeFilename(title, 'product_def.xlsx'));
};

export const exportProductDefinitionToMarkdown = (def: ProductDefinition) => {
  if (!def || !def.data) return;

  let md = `# ${def.title}\n\n`;

  const traverse = (nodeId: string, depth = 0) => {
    const node = def.data[nodeId];
    if (!node) return;

    const indent = '#'.repeat(Math.min(depth + 2, 6)); // Ensure valid header level
    md += `${indent} ${node.label}\n\n`;
    
    if (node.question) md += `**Question**: ${node.question}\n\n`;
    if (node.description) md += `${node.description}\n\n`;

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(childId => traverse(childId, depth + 1));
    }
  };

  if (def.data.root) {
    traverse('root');
  }

  downloadFile(md, getSafeFilename(def.title, 'product_def.md'), 'text/markdown');
};

// ==========================================
// Technical Architecture Export Logic
// ==========================================

export const exportTechnicalArchitectureToMarkdown = (arch: TechnicalArchitecture) => {
  let md = `# ${arch.title}\n\n`;
  if (arch.metadata?.description) {
    md += `> ${arch.metadata.description}\n\n`;
  }

  // System Architecture
  md += `## System Architecture\n\n`;
  md += `**Type**: ${arch.system_architecture.main.architecture_type}\n\n`;
  md += `**Data Flow**: ${arch.system_architecture.main.data_flow}\n\n`;
  
  md += `### Layers\n`;
  arch.system_architecture.main.layers.forEach(layer => {
    md += `- ${layer}\n`;
  });
  md += `\n`;

  md += `### Core Principles\n`;
  arch.system_architecture.main.core_principles.forEach(principle => {
    md += `- ${principle}\n`;
  });
  md += `\n`;

  // Technology Stack
  md += `## Technology Stack\n\n`;
  
  md += `### Frontend\n`;
  md += `- **Framework**: ${arch.technology_stack.main.frontend.framework}\n`;
  md += `- **Language**: ${arch.technology_stack.main.frontend.language}\n`;
  md += `- **State Management**: ${arch.technology_stack.main.frontend.state}\n`;
  md += `- **Styling**: ${arch.technology_stack.main.frontend.styling}\n`;
  md += `\n`;

  md += `### Backend\n`;
  md += `- **Language**: ${arch.technology_stack.main.backend.language}\n`;
  md += `- **Framework**: ${arch.technology_stack.main.backend.framework}\n`;
  md += `- **Database**: ${arch.technology_stack.main.backend.database}\n`;
  md += `- **ORM**: ${arch.technology_stack.main.backend.orm}\n`;
  md += `\n`;

  // Code Organization
  md += `## Code Organization\n\n`;
  md += `### Directory Structure\n`;
  Object.entries(arch.code_organization.main.directory_structure).forEach(([key, value]) => {
    md += `- **${key}**: ${value}\n`;
  });
  md += `\n`;

  md += `### Naming Conventions\n`;
  Object.entries(arch.code_organization.main.naming_conventions).forEach(([key, value]) => {
    md += `- **${key}**: ${value}\n`;
  });
  md += `\n`;

  // API Standards
  md += `## API Standards\n\n`;
  md += `- **URL Format**: ${arch.api_standards.main.url_format}\n`;
  
  md += `### HTTP Methods\n`;
  Object.entries(arch.api_standards.main.http_methods).forEach(([key, value]) => {
    md += `- **${key}**: ${value}\n`;
  });
  md += `\n`;

  md += `### Status Codes\n`;
  Object.entries(arch.api_standards.main.status_codes).forEach(([key, value]) => {
    md += `- **${key}**: ${value}\n`;
  });
  md += `\n`;

  // Security Standards
  md += `## Security Standards\n\n`;
  md += `### Authentication\n`;
  Object.entries(arch.security_standards.main.authentication).forEach(([key, value]) => {
    md += `- **${key}**: ${value}\n`;
  });
  md += `\n`;

  md += `### Data Protection\n`;
  Object.entries(arch.security_standards.main.data_protection).forEach(([key, value]) => {
    md += `- **${key}**: ${Array.isArray(value) ? value.join(', ') : value}\n`;
  });
  md += `\n`;

  // Testing Standards
  md += `## Testing Standards\n\n`;
  md += `### Test Pyramid\n`;
  Object.entries(arch.testing_standards.main.test_pyramid).forEach(([key, value]) => {
    md += `- **${key}**: ${value}\n`;
  });
  md += `\n`;

  md += `### Coverage Goals\n`;
  Object.entries(arch.testing_standards.main.coverage_requirements).forEach(([key, value]) => {
    md += `- **${key}**: ${value}\n`;
  });
  md += `\n`;

  md += `### Frameworks\n`;
  Object.entries(arch.testing_standards.main.frameworks).forEach(([key, value]) => {
    md += `- **${key}**: ${value}\n`;
  });
  md += `\n`;

  // Deployment & CI/CD
  md += `## Deployment & CI/CD\n\n`;
  md += `### Environments\n`;
  Object.entries(arch.deployment_cicd.main.environments).forEach(([key, value]) => {
    md += `- **${key}**: ${value}\n`;
  });
  md += `\n`;

  md += `### CI Pipeline\n`;
  arch.deployment_cicd.main.ci_pipeline.forEach(step => {
    md += `- ${step}\n`;
  });
  md += `\n`;

  // AI Instructions
  md += `## AI Instructions\n\n`;
  md += `### Context Awareness\n`;
  arch.ai_development_instructions.main.context_awareness.forEach(item => {
    md += `- ${item}\n`;
  });
  md += `\n`;

  md += `### Code Generation Rules\n`;
  arch.ai_development_instructions.main.code_generation.forEach(item => {
    md += `- ${item}\n`;
  });
  md += `\n`;

  downloadFile(md, getSafeFilename(arch.title, 'architecture.md'), 'text/markdown');
};

export const exportWorkspaceToJson = async (
  userId: string,
  workspaceId: string,
  userInfo?: { displayName?: string | null; email?: string | null }
) => {
  if (!userId || !workspaceId) return;

  const [
    pyramids,
    productDefinitions,
    contextDocuments,
    directories,
    technicalArchitectures,
    technicalTasks,
    pipelines,
    uiUxArchitectures,
    diagrams
  ] = await Promise.all([
    getUserPyramids(userId, workspaceId),
    getUserProductDefinitions(userId, workspaceId),
    getUserContextDocuments(userId, workspaceId),
    getUserDirectories(userId, workspaceId),
    getUserTechnicalArchitectures(userId, workspaceId),
    getTechnicalTasks(userId, workspaceId),
    getPipelines(userId, workspaceId),
    getUserUiUxArchitectures(userId, workspaceId),
    getUserDiagrams(userId, workspaceId)
  ]);

  const payload = {
    meta: {
      exportedAt: new Date().toISOString(),
      userId,
      workspaceId,
      user: {
        displayName: userInfo?.displayName || null,
        email: userInfo?.email || null
      }
    },
    pyramids,
    productDefinitions,
    contextDocuments,
    directories,
    technicalArchitectures,
    technicalTasks: {
      pipelines,
      tasks: technicalTasks
    },
    uiUxArchitectures,
    diagrams
  };

  const filenameBase =
    userInfo?.displayName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() ||
    'workspace';

  downloadFile(
    JSON.stringify(payload, null, 2),
    `${filenameBase}_workspace.json`,
    'application/json'
  );
};

export const importWorkspaceFromJson = async (
  file: File,
  userId: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const timestamp = new Date().toISOString();
        
        // 1. Create new workspace
        const workspaceName = `Imported: ${json.meta?.user?.displayName || 'Workspace'} (${new Date().toLocaleDateString()})`;
        const newWorkspaceId = await createWorkspace(userId, workspaceName);

        // ID Mappings (Old ID -> New ID)
        const idMap = new Map<string, string>();

        // Helper to process collections
        const processCollection = async (items: any[], collectionName: string, idField = 'id') => {
            if (!items || !Array.isArray(items)) return;
            
            for (const item of items) {
                const oldId = item[idField];
                // Remove ID to let us generate new one
                const { [idField]: _, ...data } = item;
                
                // Update basic fields
                data.userId = userId;
                data.workspaceId = newWorkspaceId;
                data.createdAt = timestamp;
                data.lastModified = timestamp;

                // Add to Storage
                const newId = storage.createId();
                const newData = { ...data, id: newId };
                await storage.save(collectionName, newData);
                
                if (oldId) {
                    idMap.set(oldId, newId);
                }
            }
        };

        // 2. Import Directories (Dependencies for Documents)
        await processCollection(json.directories, 'directories');

        // 3. Import Context Documents (Update directoryId)
        if (json.contextDocuments) {
            for (const doc of json.contextDocuments) {
                const oldId = doc.id;
                const { id, ...data } = doc;
                data.userId = userId;
                data.workspaceId = newWorkspaceId;
                data.createdAt = timestamp;
                data.lastModified = timestamp;

                if (data.directoryId && idMap.has(data.directoryId)) {
                    data.directoryId = idMap.get(data.directoryId);
                } else {
                    data.directoryId = null; // or keep as is if not found (likely undefined)
                }

                const newId = storage.createId();
                const newData = { ...data, id: newId };
                await storage.save('contextDocuments', newData);
                idMap.set(oldId, newId);
            }
        }

        // 4. Import Pyramids
        await processCollection(json.pyramids, 'pyramids');

        // 5. Import Product Definitions (Update linkedPyramidId)
        if (json.productDefinitions) {
            for (const def of json.productDefinitions) {
                const oldId = def.id;
                const { id, ...data } = def;
                data.userId = userId;
                data.workspaceId = newWorkspaceId;
                data.createdAt = timestamp;
                data.lastModified = timestamp;

                if (data.linkedPyramidId && idMap.has(data.linkedPyramidId)) {
                    data.linkedPyramidId = idMap.get(data.linkedPyramidId);
                }

                const newId = storage.createId();
                const newData = { ...data, id: newId };
                await storage.save('productDefinitions', newData);
                idMap.set(oldId, newId);
            }
        }

        // 6. Import Others
        await processCollection(json.technicalArchitectures, 'technicalArchitectures');
        await processCollection(json.uiUxArchitectures, 'uiUxArchitectures');
        
        // Handle Diagrams specially to remap context sources
        if (json.diagrams) {
            for (const diag of json.diagrams) {
                 const oldId = diag.id;
                 const { id, ...data } = diag;
                 data.userId = userId;
                 data.workspaceId = newWorkspaceId;
                 data.createdAt = timestamp;
                 data.lastModified = timestamp;

                 // Remap context sources in nodes
                 if (data.nodes && Array.isArray(data.nodes)) {
                     data.nodes = data.nodes.map((node: any) => {
                         if (node.data && node.data.contextSources && Array.isArray(node.data.contextSources)) {
                             node.data.contextSources = node.data.contextSources.map((source: any) => {
                                 if (idMap.has(source.id)) {
                                     return { ...source, id: idMap.get(source.id) };
                                 }
                                 return source;
                             });
                         }
                         return node;
                     });
                 }

                 const newId = storage.createId();
                 const newData = { ...data, id: newId };
                 await storage.save('diagrams', newData);
                 idMap.set(oldId, newId);
            }
        }
        
        // Technical Tasks & Pipelines
        if (json.technicalTasks) {
             await processCollection(json.technicalTasks.pipelines, 'pipelines');
             
             // Import tasks with ID remapping
             if (json.technicalTasks.tasks) {
                 for (const task of json.technicalTasks.tasks) {
                     const oldId = task.id;
                     const { id, ...data } = task;
                     data.userId = userId;
                     data.workspaceId = newWorkspaceId;
                     data.createdAt = timestamp;
                     data.updatedAt = timestamp;

                     // Remap pipelineId
                     if (data.pipelineId && idMap.has(data.pipelineId)) {
                         data.pipelineId = idMap.get(data.pipelineId);
                     }
                     
                     // Remap technicalArchitectureId
                     if (data.technicalArchitectureId && idMap.has(data.technicalArchitectureId)) {
                         data.technicalArchitectureId = idMap.get(data.technicalArchitectureId);
                     }

                     // Remap data.task_metadata.parent_architecture_ref
                     if (data.data?.task_metadata?.parent_architecture_ref && idMap.has(data.data.task_metadata.parent_architecture_ref)) {
                         data.data.task_metadata.parent_architecture_ref = idMap.get(data.data.task_metadata.parent_architecture_ref);
                     }

                     const newId = storage.createId();
                     const newData = { ...data, id: newId };
                     await storage.save('technicalTasks', newData);
                     idMap.set(oldId, newId);
                 }
             }
        }

        resolve(newWorkspaceId || '');

      } catch (error) {
        console.error("Import failed:", error);
        reject(error);
      }
    };
    reader.readAsText(file);
  });
};
