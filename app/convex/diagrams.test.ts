import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import { setupBackend } from './test.helpers';

describe('diagrams', () => {
  it('creates an empty diagram and saves its graph', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'WS' });
    const id = await alice.as.mutation(api.diagrams.create, { workspaceId, title: 'Flow' });
    expect(await alice.as.query(api.diagrams.get, { id })).toMatchObject({ nodes: [], edges: [] });

    const nodes = [{ id: 'n1', position: { x: 0, y: 0 }, data: { title: 'Start', description: '' } }];
    const edges = [{ id: 'e1', source: 'n1', target: 'n1' }];
    await alice.as.mutation(api.diagrams.saveGraph, { id, nodes, edges });

    expect(await alice.as.query(api.diagrams.get, { id })).toMatchObject({ nodes, edges });
  });

  it('renames, deletes and stays private', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const bob = await signedInAs('bob@example.com');
    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'WS' });
    const id = await alice.as.mutation(api.diagrams.create, { workspaceId, title: 'Flow' });

    await alice.as.mutation(api.diagrams.rename, { id, title: 'Renamed' });
    expect((await alice.as.query(api.diagrams.get, { id }))?.title).toBe('Renamed');
    await expect(bob.as.mutation(api.diagrams.saveGraph, { id, nodes: [], edges: [] })).rejects.toThrow(
      'Diagram not found',
    );

    await alice.as.mutation(api.diagrams.remove, { id });
    expect(await alice.as.query(api.diagrams.list, { workspaceId })).toEqual([]);
  });
});
