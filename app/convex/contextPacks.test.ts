import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import { setupBackend } from './test.helpers';

describe('context packs', () => {
  it('saves, updates, renames and deletes a pack', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'WS' });
    const diagramId = await alice.as.mutation(api.diagrams.create, { workspaceId, title: 'Flow' });

    const id = await alice.as.mutation(api.contextPacks.create, {
      workspaceId,
      title: '  Checkout context ',
      refs: [{ app: 'diagrams', id: diagramId }],
      linkDepth: 1,
    });
    expect(await alice.as.query(api.contextPacks.list, { workspaceId })).toMatchObject([
      { _id: id, title: 'Checkout context', refs: [{ app: 'diagrams', id: diagramId }], linkDepth: 1 },
    ]);

    await alice.as.mutation(api.contextPacks.update, { id, refs: [], linkDepth: -1 });
    await alice.as.mutation(api.contextPacks.update, { id, title: 'Renamed', linkDepth: 2.7 });
    expect(await alice.as.query(api.contextPacks.list, { workspaceId })).toMatchObject([{ title: 'Renamed', refs: [], linkDepth: 2 }]);

    await alice.as.mutation(api.contextPacks.remove, { id });
    expect(await alice.as.query(api.contextPacks.list, { workspaceId })).toEqual([]);
  });

  it('requires a title', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'WS' });
    await expect(alice.as.mutation(api.contextPacks.create, { workspaceId, title: ' ', refs: [], linkDepth: 0 })).rejects.toThrow(
      'Title is required',
    );
  });

  it('is private to the workspace owner', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const bob = await signedInAs('bob@example.com');
    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'WS' });
    const id = await alice.as.mutation(api.contextPacks.create, { workspaceId, title: 'P', refs: [], linkDepth: 0 });

    expect(await bob.as.query(api.contextPacks.list, { workspaceId })).toEqual([]);
    await expect(bob.as.mutation(api.contextPacks.create, { workspaceId, title: 'X', refs: [], linkDepth: 0 })).rejects.toThrow(
      'Workspace not found',
    );
    await expect(bob.as.mutation(api.contextPacks.update, { id, title: 'X' })).rejects.toThrow('Context pack not found');
    await expect(bob.as.mutation(api.contextPacks.remove, { id })).rejects.toThrow('Context pack not found');
  });
});
