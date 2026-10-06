import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import { setupBackend } from './test.helpers';

async function setup() {
  const backend = setupBackend();
  const alice = await backend.signedInAs('alice@example.com');
  const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'WS' });
  return { ...backend, alice, workspaceId };
}

describe('context documents and directories', () => {
  it('creates a text document with empty content at the root', async () => {
    const { alice, workspaceId } = await setup();
    const id = await alice.as.mutation(api.contextDocuments.create, { workspaceId, title: 'Notes' });
    const doc = await alice.as.query(api.contextDocuments.get, { id });
    expect(doc).toMatchObject({ title: 'Notes', type: 'text', content: '' });
    expect(doc?.directoryId).toBeUndefined();
  });

  it('updates title and content', async () => {
    const { alice, workspaceId } = await setup();
    const id = await alice.as.mutation(api.contextDocuments.create, { workspaceId, title: 'Notes' });
    await alice.as.mutation(api.contextDocuments.update, { id, title: 'Spec', content: '# Hello' });
    expect(await alice.as.query(api.contextDocuments.get, { id })).toMatchObject({ title: 'Spec', content: '# Hello' });
  });

  it('moves documents into and out of directories', async () => {
    const { alice, workspaceId } = await setup();
    const directoryId = await alice.as.mutation(api.directories.create, { workspaceId, title: 'Research' });
    const id = await alice.as.mutation(api.contextDocuments.create, { workspaceId, title: 'Doc' });

    await alice.as.mutation(api.contextDocuments.moveToDirectory, { id, directoryId });
    expect(await alice.as.query(api.contextDocuments.listInDirectory, { directoryId })).toHaveLength(1);

    await alice.as.mutation(api.contextDocuments.moveToDirectory, { id, directoryId: null });
    expect(await alice.as.query(api.contextDocuments.listInDirectory, { directoryId })).toEqual([]);
  });

  it('moves a deleted directory’s documents back to the root instead of deleting them', async () => {
    const { alice, workspaceId } = await setup();
    const directoryId = await alice.as.mutation(api.directories.create, { workspaceId, title: 'Old' });
    const id = await alice.as.mutation(api.contextDocuments.create, { workspaceId, title: 'Keep me', directoryId });

    await alice.as.mutation(api.directories.remove, { id: directoryId });

    expect(await alice.as.query(api.directories.list, { workspaceId })).toEqual([]);
    const doc = await alice.as.query(api.contextDocuments.get, { id });
    expect(doc?.title).toBe('Keep me');
    expect(doc?.directoryId).toBeUndefined();
  });

  it('refuses directories from another workspace', async () => {
    const { alice, workspaceId } = await setup();
    const otherWorkspace = await alice.as.mutation(api.workspaces.create, { name: 'Other' });
    const foreignDirectory = await alice.as.mutation(api.directories.create, { workspaceId: otherWorkspace, title: 'X' });
    const id = await alice.as.mutation(api.contextDocuments.create, { workspaceId, title: 'Doc' });

    await expect(
      alice.as.mutation(api.contextDocuments.moveToDirectory, { id, directoryId: foreignDirectory }),
    ).rejects.toThrow('Directory not found');
    await expect(
      alice.as.mutation(api.contextDocuments.create, { workspaceId, title: 'Doc', directoryId: foreignDirectory }),
    ).rejects.toThrow('Directory not found');
  });

  it('lists directories alphabetically and renames them', async () => {
    const { alice, workspaceId } = await setup();
    const b = await alice.as.mutation(api.directories.create, { workspaceId, title: 'Beta' });
    await alice.as.mutation(api.directories.create, { workspaceId, title: 'Alpha' });
    await alice.as.mutation(api.directories.rename, { id: b, title: 'Gamma' });
    const titles = (await alice.as.query(api.directories.list, { workspaceId })).map((d) => d.title);
    expect(titles).toEqual(['Alpha', 'Gamma']);
  });

  it('keeps documents and directories private', async () => {
    const { alice, workspaceId, signedInAs } = await setup();
    const bob = await signedInAs('bob@example.com');
    const directoryId = await alice.as.mutation(api.directories.create, { workspaceId, title: 'Dir' });
    const id = await alice.as.mutation(api.contextDocuments.create, { workspaceId, title: 'Doc', directoryId });

    expect(await bob.as.query(api.contextDocuments.get, { id })).toBeNull();
    expect(await bob.as.query(api.contextDocuments.listInDirectory, { directoryId })).toEqual([]);
    await expect(bob.as.mutation(api.contextDocuments.update, { id, content: 'x' })).rejects.toThrow(
      'Document not found',
    );
    await expect(bob.as.mutation(api.directories.remove, { id: directoryId })).rejects.toThrow('Directory not found');
  });
});
