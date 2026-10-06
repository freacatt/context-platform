export interface ExportOption {
  label: string;
  /** File name suffix, e.g. "plan.md". */
  suffix: string;
  type: string;
  content: () => string;
}

/** Markdown export option. */
export const markdownExport = (suffix: string, content: () => string): ExportOption => ({ label: 'Markdown (.md)', suffix, type: 'text/markdown', content });
