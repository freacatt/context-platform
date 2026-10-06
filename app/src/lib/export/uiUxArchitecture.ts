import { uiUxArchitectureToMarkdown } from '@shared/knowledge/markdown/uiUxArchitecture';
import type { UiUxArchitecture } from '@/data/types';
import { downloadFile, safeFilename } from '@/lib/download';

export { uiUxArchitectureToMarkdown };

export function exportUiUxArchitectureToMarkdown(arch: UiUxArchitecture) {
  downloadFile(uiUxArchitectureToMarkdown(arch), safeFilename(arch.title, 'architecture.md'), 'text/markdown');
}
