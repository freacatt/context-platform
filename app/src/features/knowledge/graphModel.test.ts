import { describe, expect, it } from 'vitest';
import { buildGraph, matchesQuery, nodeRadius, type GraphInput } from './graphModel';

const input: GraphInput = {
  nodes: [
    { app: 'diagrams', id: 'd', title: 'Flow' },
    { app: 'productDefinitions', id: 'p', title: 'Shop' },
    { app: 'technicalPlans', id: 't', title: 'Checkout' },
    { app: 'glossaries', id: 'g', title: 'Terms' },
  ],
  edges: [
    { from: 'technicalPlans:t', to: 'productDefinitions:p', kind: 'implements', source: 'explicit' },
    { from: 'productDefinitions:p', to: 'technicalPlans:t', kind: 'references', source: 'derived' },
    { from: 'diagrams:d', to: 'productDefinitions:p', kind: 'references', source: 'derived' },
  ],
};

describe('knowledge graph model', () => {
  it('merges relations between the same pair into one line, counts degrees and neighbours', () => {
    const graph = buildGraph(input);
    expect(graph.edges).toHaveLength(2);
    const planShop = graph.edges.find((e) => e.id.includes('technicalPlans'))!;
    expect(planShop).toMatchObject({ kinds: ['implements', 'references'], derived: false });
    expect(graph.edges.find((e) => e.id.includes('diagrams'))!.derived).toBe(true);
    expect(Object.fromEntries(graph.nodes.map((n) => [n.title, n.degree]))).toEqual({ Flow: 1, Shop: 2, Checkout: 1, Terms: 0 });
    expect([...graph.neighbours.get('productDefinitions:p')!].sort()).toEqual(['diagrams:d', 'technicalPlans:t']);
  });

  it('hides apps (and their lines) and orphans on request', () => {
    const graph = buildGraph(input, { hiddenApps: new Set(['diagrams']), showOrphans: false });
    expect(graph.nodes.map((n) => n.title).sort()).toEqual(['Checkout', 'Shop']);
    expect(graph.edges).toHaveLength(1);
  });

  it('sizes and matches nodes', () => {
    expect(nodeRadius(0)).toBe(6);
    expect(nodeRadius(4)).toBe(14);
    expect(nodeRadius(10_000)).toBe(22);
    expect(matchesQuery('Checkout v2', 'check')).toBe(true);
    expect(matchesQuery('Checkout v2', '  ')).toBe(false);
  });
});
