import type { DiagramNodeData } from '../../types/diagram';

/** The parts of React Flow nodes/edges the export needs. */
export interface GraphNode {
  id: string;
  data: Partial<DiagramNodeData>;
}
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  data?: { direction?: string };
}

export interface Connection {
  id: string;
  title: string;
  direction: string;
}

const titleOf = (nodes: GraphNode[], id: string, fallback: string) => {
  const title = nodes.find((n) => n.id === id)?.data.title?.trim();
  return title || fallback;
};

const directionOf = (edge: GraphEdge) => edge.data?.direction || edge.sourceHandle || '';

/** Edges leaving and entering a node, labelled with the block on the other end. */
export function describeConnections(nodeId: string, nodes: GraphNode[], edges: GraphEdge[]) {
  return {
    outgoing: edges
      .filter((e) => e.source === nodeId)
      .map((e): Connection => ({ id: e.id, title: titleOf(nodes, e.target, 'Untitled Block'), direction: directionOf(e) })),
    incoming: edges
      .filter((e) => e.target === nodeId)
      .map((e): Connection => ({ id: e.id, title: titleOf(nodes, e.source, 'Untitled Block'), direction: directionOf(e) })),
  };
}

export function diagramToMarkdown(title: string, nodes: GraphNode[], edges: GraphEdge[]): string {
  const lines = [`# ${title || 'Untitled Diagram'}`, '', '## Blocks', ''];
  for (const node of nodes) {
    lines.push(`### ${node.data.title || 'Untitled Block'}`, '', '**Description:**', node.data.description || '(No description)', '');
    const { incoming, outgoing } = describeConnections(node.id, nodes, edges);
    if (incoming.length || outgoing.length) {
      lines.push('**Connections:**');
      if (incoming.length) lines.push('*Incoming:*', ...incoming.map((c) => `- From **${c.title}** (${c.direction || 'connection'})`));
      if (outgoing.length) lines.push('*Outgoing:*', ...outgoing.map((c) => `- To **${c.title}** (${c.direction || 'connection'})`));
      lines.push('');
    }
    lines.push('---', '');
  }
  return lines.join('\n');
}
