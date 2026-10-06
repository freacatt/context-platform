import { strToU8, zipSync } from 'fflate';
import { buildSingleMarkdown, buildZipEntries, estimateTokens, type KnowledgeBundle } from '@shared/knowledge/bundle';
import { downloadBlob, safeFilename } from '@/lib/download';

export type KnowledgeFormat = 'single' | 'zip';

export interface KnowledgeOutput {
  filename: string;
  /** Text files of the export (one for single, many for zip). */
  files: Record<string, string>;
  /** Characters across all files. */
  chars: number;
  tokens: number;
}

/** The files of a knowledge export, before packaging. Pure, so the page can preview size. */
export function buildKnowledgeOutput(bundle: KnowledgeBundle, format: KnowledgeFormat): KnowledgeOutput {
  const files =
    format === 'single'
      ? { [safeFilename(bundle.workspaceName, 'knowledge.md')]: buildSingleMarkdown(bundle) }
      : buildZipEntries(bundle);
  const text = Object.values(files).join('');
  return {
    filename: safeFilename(bundle.workspaceName, format === 'single' ? 'knowledge.md' : 'knowledge.zip'),
    files,
    chars: text.length,
    tokens: estimateTokens(text),
  };
}

export function downloadKnowledgeOutput(output: KnowledgeOutput) {
  const entries = Object.entries(output.files);
  if (output.filename.endsWith('.md')) {
    downloadBlob(new Blob([entries[0][1]], { type: 'text/markdown' }), output.filename);
    return;
  }
  const zip = zipSync(Object.fromEntries(entries.map(([path, text]) => [path, strToU8(text)])));
  downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), output.filename);
}

/** "12.3 kB" style sizes. */
export function formatSize(chars: number): string {
  if (chars < 1000) return `${chars} B`;
  if (chars < 1_000_000) return `${(chars / 1000).toFixed(1)} kB`;
  return `${(chars / 1_000_000).toFixed(1)} MB`;
}
