import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import { setupBackend } from './test.helpers';

describe('workspaces', () => {
  it('creates an empty workspace', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');

    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: '  Acme  ' });

    const workspace = await alice.as.query(api.workspaces.get, { id: workspaceId });
    expect(workspace?.name).toBe('Acme');
    expect(await alice.as.query(api.knowledge.catalog, { workspaceId })).toEqual([]);
  });

  it('rejects blank names', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    await expect(alice.as.mutation(api.workspaces.create, { name: '   ' })).rejects.toThrow('Name is required');
  });

  it('lists only the signed-in user’s workspaces', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const bob = await signedInAs('bob@example.com');
    await alice.as.mutation(api.workspaces.create, { name: 'Alice WS' });
    await bob.as.mutation(api.workspaces.create, { name: 'Bob WS' });

    const names = (await alice.as.query(api.workspaces.list, {})).map((w) => w.name);
    expect(names).toEqual(['Alice WS']);
  });

  it('returns nothing to signed-out users and refuses their writes', async () => {
    const { t } = setupBackend();
    expect(await t.query(api.workspaces.list, {})).toEqual([]);
    await expect(t.mutation(api.workspaces.create, { name: 'X' })).rejects.toThrow('Not signed in');
  });

  it('hides other users’ workspaces and blocks changes to them', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const bob = await signedInAs('bob@example.com');
    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'Private' });

    expect(await bob.as.query(api.workspaces.get, { id: workspaceId })).toBeNull();
    await expect(bob.as.mutation(api.workspaces.rename, { id: workspaceId, name: 'Hacked' })).rejects.toThrow(
      'Workspace not found',
    );
    await expect(bob.as.mutation(api.workspaces.remove, { id: workspaceId })).rejects.toThrow('Workspace not found');
  });

  it('renames a workspace', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const id = await alice.as.mutation(api.workspaces.create, { name: 'Old' });
    await alice.as.mutation(api.workspaces.rename, { id, name: 'New' });
    expect((await alice.as.query(api.workspaces.get, { id }))?.name).toBe('New');
  });

  it('deletes a workspace together with everything in it', async () => {
    const { t, signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'Doomed' });
    await alice.as.mutation(api.pyramids.create, { workspaceId, title: 'P' });
    const directoryId = await alice.as.mutation(api.directories.create, { workspaceId, title: 'D' });
    await alice.as.mutation(api.contextDocuments.create, { workspaceId, title: 'Doc', directoryId });

    await alice.as.mutation(api.workspaces.remove, { id: workspaceId });

    const leftovers = await t.run(async (ctx) => ({
      workspaces: await ctx.db.query('workspaces').collect(),
      pyramids: await ctx.db.query('pyramids').collect(),
      directories: await ctx.db.query('directories').collect(),
      documents: await ctx.db.query('contextDocuments').collect(),
    }));
    expect(leftovers).toEqual({ workspaces: [], pyramids: [], directories: [], documents: [] });
  });

  it('round-trips a workspace through export and import, re-linking references', async () => {
    const { signedInAs, insertLegacyTask } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'Source' });
    const directoryId = await alice.as.mutation(api.directories.create, { workspaceId, title: 'Specs' });
    await alice.as.mutation(api.contextDocuments.create, { workspaceId, title: 'Spec', directoryId });
    const architectureId = await alice.as.mutation(api.technicalArchitectures.create, { workspaceId, title: 'Arch' });
    await insertLegacyTask(workspaceId, 'Build it', architectureId);
    const designSystemId = await alice.as.mutation(api.designSystems.create, { workspaceId, title: 'DS' });
    const uxId = await alice.as.mutation(api.uiUxArchitectures.create, { workspaceId, title: 'Portal' });
    await alice.as.mutation(api.uiUxArchitectures.setDesignSystem, { id: uxId, designSystemId });
    for (const app of ['decisions', 'glossaries', 'researchStudies', 'roadmaps', 'technicalPlans'] as const) {
      await alice.as.mutation(api[app].create, { workspaceId, title: `My ${app}` });
    }
    const productId = await alice.as.mutation(api.productDefinitions.create, { workspaceId, title: 'Shop' });
    await alice.as.mutation(api.productDefinitions.update, { id: productId, spec: { vision: 'Sell tea' } });

    const exported = await alice.as.query(api.workspaces.exportData, { id: workspaceId });
    const importedId = await alice.as.mutation(api.workspaces.importData, { data: exported });

    expect(importedId).not.toBe(workspaceId);
    expect((await alice.as.query(api.workspaces.get, { id: importedId }))?.name).toBe('Source');
    const [dir] = await alice.as.query(api.directories.list, { workspaceId: importedId });
    const [doc] = await alice.as.query(api.contextDocuments.list, { workspaceId: importedId });
    expect(doc.directoryId).toBe(dir._id);
    const [arch] = await alice.as.query(api.technicalArchitectures.list, { workspaceId: importedId });
    // The legacy task came back as a technical plan that depends on the architecture.
    const plans = await alice.as.query(api.technicalPlans.list, { workspaceId: importedId });
    expect(plans.map((p) => p.title).sort()).toEqual(['Build it', 'My technicalPlans']);
    const fromTask = plans.find((p) => p.title === 'Build it')!;
    const links = await alice.as.query(api.links.listForItem, { workspaceId: importedId, app: 'technicalPlans', id: fromTask._id });
    expect(links.outgoing).toMatchObject([{ app: 'technicalArchitectures', id: arch._id, kind: 'depends-on' }]);
    const [ds] = await alice.as.query(api.designSystems.list, { workspaceId: importedId });
    const [ux] = await alice.as.query(api.uiUxArchitectures.list, { workspaceId: importedId });
    expect(ux.designSystemId).toBe(ds._id);
    expect(ds.spec.colors.length).toBeGreaterThan(0);
    for (const app of ['decisions', 'glossaries', 'researchStudies', 'roadmaps'] as const) {
      expect((await alice.as.query(api[app].list, { workspaceId: importedId })).map((d) => d.title)).toEqual([`My ${app}`]);
    }
    const [product] = await alice.as.query(api.productDefinitions.list, { workspaceId: importedId });
    expect(product.spec.vision).toBe('Sell tea');
  });

  it('rejects files that are not workspace exports', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    await expect(alice.as.mutation(api.workspaces.importData, { data: 'nope' })).rejects.toThrow(
      'Not a workspace export',
    );
  });

  it('does not export other users’ workspaces', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const bob = await signedInAs('bob@example.com');
    const id = await alice.as.mutation(api.workspaces.create, { name: 'Secret' });
    expect(await bob.as.query(api.workspaces.exportData, { id })).toBeNull();
  });
});
