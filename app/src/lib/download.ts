/** Triggers a browser download of a blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Triggers a browser download of text content. */
export function downloadFile(content: string, filename: string, type: string) {
  downloadBlob(new Blob([content], { type }), filename);
}

/** "My Project!" + "export.md" → "my_project__export.md" */
export const safeFilename = (title: string, suffix: string) =>
  `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${suffix}`;
