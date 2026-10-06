import * as XLSX from 'xlsx';
import type { ContextDocument } from '@/data/types';
import { downloadFile, safeFilename } from '@/lib/download';
import { extractPlainText } from '@/lib/richText';

const created = (doc: ContextDocument) => new Date(doc._creationTime).toLocaleString();

export function contextDocumentToMarkdown(doc: ContextDocument): string {
  return `# ${doc.title}\n\n- **Type**: ${doc.type}\n- **Created**: ${created(doc)}\n\n---\n\n${extractPlainText(doc.content)}\n`;
}

export function exportContextDocumentToMarkdown(doc: ContextDocument) {
  downloadFile(contextDocumentToMarkdown(doc), safeFilename(doc.title, 'context.md'), 'text/markdown');
}

export function exportContextDocumentToExcel(doc: ContextDocument) {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Title', doc.title],
    ['Type', doc.type],
    ['Created At', created(doc)],
    [],
    ['Content'],
    [extractPlainText(doc.content)],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Context Document');
  XLSX.writeFile(workbook, safeFilename(doc.title, 'context.xlsx'));
}
