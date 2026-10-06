import { describe, expect, it } from 'vitest';
import { describeConnections, diagramToMarkdown, type GraphEdge, type GraphNode } from './diagram';

const nodes: GraphNode[] = [
  { id: 'a', data: { title: 'Login', description: 'Sign-in form' } },
  { id: 'b', data: { title: '  ', description: '' } },
];
const edges: GraphEdge[] = [{ id: 'e1', source: 'a', target: 'b', sourceHandle: 'right' }];

describe('diagram connections', () => {
  it('labels both ends and falls back for untitled blocks', () => {
    expect(describeConnections('a', nodes, edges)).toEqual({
      outgoing: [{ id: 'e1', title: 'Untitled Block', direction: 'right' }],
      incoming: [],
    });
    expect(describeConnections('b', nodes, edges).incoming).toEqual([{ id: 'e1', title: 'Login', direction: 'right' }]);
  });

  it('prefers an explicit edge direction over the handle id', () => {
    const [conn] = describeConnections('a', nodes, [{ ...edges[0], data: { direction: 'down' } }]).outgoing;
    expect(conn.direction).toBe('down');
  });
});

describe('diagramToMarkdown', () => {
  it('lists blocks with descriptions and connections', () => {
    const md = diagramToMarkdown('Flow', nodes, edges);
    expect(md).toContain('# Flow');
    expect(md).toContain('### Login\n\n**Description:**\nSign-in form');
    expect(md).toContain('- To **Untitled Block** (right)');
    expect(md).toContain('(No description)');
  });
});
