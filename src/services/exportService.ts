import * as XLSX from 'xlsx';
import { Pyramid, ContextDocument, ProductDefinition } from '../types';

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
