import { diagramToMarkdown, type GraphEdge, type GraphNode } from '@shared/knowledge/markdown/diagram';
import { downloadFile, safeFilename } from '@/lib/download';

export { describeConnections, diagramToMarkdown } from '@shared/knowledge/markdown/diagram';
export type { Connection, GraphEdge, GraphNode } from '@shared/knowledge/markdown/diagram';

export function exportDiagramToMarkdown(title: string, nodes: GraphNode[], edges: GraphEdge[]) {
  downloadFile(diagramToMarkdown(title, nodes, edges), safeFilename(title || 'diagram', 'diagram.md'), 'text/markdown');
}
