import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import { setupBackend, type TestUser } from './test.helpers';

async function workspaceWithItems(user: TestUser) {
  const workspaceId = await user.as.mutation(api.workspaces.create, { name: 'WS' });
  const diagramId = await user.as.mutation(api.diagrams.create, { workspaceId, title: 'Flow' });
  const definitionId = await user.as.mutation(api.productDefinitions.create, { workspaceId, title: 'Shop' });
  const architectureId = await user.as.mutation(api.technicalArchitectures.create, { workspaceId, title: 'Core' });
  return { workspaceId, diagramId, definitionId, architectureId };
}

describe('links', () => {
  it('creates a link that shows as outgoing and as a backlink', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const { workspaceId, architectureId, definitionId } = await workspaceWithItems(alice);

    const linkId = await alice.as.mutation(api.links.create, {
      workspaceId,
      from: { app: 'technicalArchitectures', id: architectureId },
      to: { app: 'productDefinitions', id: definitionId },
      kind: 'implements',
    });

    const archLinks = await alice.as.query(api.links.listForItem, { workspaceId, app: 'technicalArchitectures', id: architectureId });
    expect(archLinks.outgoing).toEqual([
      { app: 'productDefinitions', id: definitionId, title: 'Shop', kind: 'implements', source: 'explicit', linkId },
    ]);
    expect(archLinks.incoming).toEqual([]);
    const pdLinks = await alice.as.query(api.links.listForItem, { workspaceId, app: 'productDefinitions', id: definitionId });
    expect(pdLinks.incoming).toMatchObject([{ app: 'technicalArchitectures', id: architectureId, title: 'Core', linkId }]);

    await alice.as.mutation(api.links.remove, { id: linkId });
    expect((await alice.as.query(api.links.listForItem, { workspaceId, app: 'productDefinitions', id: definitionId })).incoming).toEqual([]);
  });

  it('lists derived links as automatic, without a link id', async () => {
    const { signedInAs, insertLegacyTask } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const { workspaceId, architectureId } = await workspaceWithItems(alice);
    const taskId = await insertLegacyTask(workspaceId, 'Build', architectureId);
    const designSystemId = await alice.as.mutation(api.designSystems.create, { workspaceId, title: 'DS' });
    const uxId = await alice.as.mutation(api.uiUxArchitectures.create, { workspaceId, title: 'Portal' });
    await alice.as.mutation(api.uiUxArchitectures.setDesignSystem, { id: uxId, designSystemId });

    const links = await alice.as.query(api.links.listForItem, { workspaceId, app: 'technicalArchitectures', id: architectureId });
    expect(links.incoming).toEqual([
      { app: 'technicalTasks', id: taskId, title: 'Build', kind: 'depends-on', source: 'derived', linkId: null },
    ]);
    const dsLinks = await alice.as.query(api.links.listForItem, { workspaceId, app: 'designSystems', id: designSystemId });
    expect(dsLinks.incoming).toMatchObject([{ app: 'uiUxArchitectures', id: uxId, source: 'derived' }]);
  });

  it('refuses self-links, duplicates and malformed ids', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const { workspaceId, diagramId, definitionId } = await workspaceWithItems(alice);
    const from = { app: 'diagrams' as const, id: diagramId };
    const to = { app: 'productDefinitions' as const, id: definitionId };

    await expect(alice.as.mutation(api.links.create, { workspaceId, from, to: from, kind: 'related' })).rejects.toThrow('cannot link to itself');
    await alice.as.mutation(api.links.create, { workspaceId, from, to, kind: 'references' });
    await expect(alice.as.mutation(api.links.create, { workspaceId, from, to, kind: 'references' })).rejects.toThrow('already exists');
    // Same ends, another kind, is a different link.
    await alice.as.mutation(api.links.create, { workspaceId, from, to, kind: 'related' });
    // An id of another table under this app.
    await expect(
      alice.as.mutation(api.links.create, { workspaceId, from: { app: 'diagrams', id: definitionId }, to, kind: 'related' }),
    ).rejects.toThrow('Item not found');
    await expect(
      alice.as.mutation(api.links.create, { workspaceId, from: { app: 'diagrams', id: 'garbage' }, to, kind: 'related' }),
    ).rejects.toThrow('Item not found');
  });

  it('refuses links across workspaces and denies other users', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const bob = await signedInAs('bob@example.com');
    const a = await workspaceWithItems(alice);
    const b = await workspaceWithItems(bob);

    await expect(
      alice.as.mutation(api.links.create, {
        workspaceId: a.workspaceId,
        from: { app: 'diagrams', id: a.diagramId },
        to: { app: 'diagrams', id: b.diagramId },
        kind: 'related',
      }),
    ).rejects.toThrow('Item not found');

    const linkId = await alice.as.mutation(api.links.create, {
      workspaceId: a.workspaceId,
      from: { app: 'diagrams', id: a.diagramId },
      to: { app: 'productDefinitions', id: a.definitionId },
      kind: 'related',
    });
    await expect(
      bob.as.mutation(api.links.create, {
        workspaceId: a.workspaceId,
        from: { app: 'diagrams', id: a.diagramId },
        to: { app: 'productDefinitions', id: a.definitionId },
        kind: 'references',
      }),
    ).rejects.toThrow('Workspace not found');
    await expect(bob.as.mutation(api.links.remove, { id: linkId })).rejects.toThrow('Link not found');
    expect(await bob.as.query(api.links.listForItem, { workspaceId: a.workspaceId, app: 'diagrams', id: a.diagramId })).toEqual({
      outgoing: [],
      incoming: [],
    });
  });

  it('deletes links with their items and workspaces', async () => {
    const { t, signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const { workspaceId, diagramId, definitionId, architectureId } = await workspaceWithItems(alice);
    const link = (from: string, fromApp: 'diagrams' | 'productDefinitions' | 'technicalArchitectures' | 'technicalPlans', to: string, toApp: typeof fromApp) =>
      alice.as.mutation(api.links.create, { workspaceId, from: { app: fromApp, id: from }, to: { app: toApp, id: to }, kind: 'related' });
    await link(diagramId, 'diagrams', definitionId, 'productDefinitions');
    await link(architectureId, 'technicalArchitectures', diagramId, 'diagrams');
    await link(architectureId, 'technicalArchitectures', definitionId, 'productDefinitions');

    await alice.as.mutation(api.diagrams.remove, { id: diagramId });
    const remaining = await t.run((ctx) => ctx.db.query('links').collect());
    expect(remaining.map((l) => [l.fromId, l.toId])).toEqual([[architectureId, definitionId]]);

    const planId = await alice.as.mutation(api.technicalPlans.create, { workspaceId, title: 'Doomed' });
    await link(planId, 'technicalPlans', definitionId, 'productDefinitions');
    await alice.as.mutation(api.technicalPlans.remove, { id: planId });
    expect(await t.run((ctx) => ctx.db.query('links').collect())).toHaveLength(1);

    await alice.as.mutation(api.workspaces.remove, { id: workspaceId });
    expect(await t.run((ctx) => ctx.db.query('links').collect())).toEqual([]);
  });

  it('survives a backup round trip, re-linked to the imported items', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const { workspaceId, diagramId, definitionId } = await workspaceWithItems(alice);
    await alice.as.mutation(api.links.create, {
      workspaceId,
      from: { app: 'diagrams', id: diagramId },
      to: { app: 'productDefinitions', id: definitionId },
      kind: 'references',
    });
    await alice.as.mutation(api.contextPacks.create, {
      workspaceId,
      title: 'Pack',
      refs: [{ app: 'diagrams', id: diagramId }],
      linkDepth: 1,
    });

    const exported = await alice.as.query(api.workspaces.exportData, { id: workspaceId });
    const importedId = await alice.as.mutation(api.workspaces.importData, { data: exported });

    const [diagram] = await alice.as.query(api.diagrams.list, { workspaceId: importedId });
    const [definition] = await alice.as.query(api.productDefinitions.list, { workspaceId: importedId });
    const links = await alice.as.query(api.links.listForItem, { workspaceId: importedId, app: 'diagrams', id: diagram._id });
    expect(links.outgoing).toMatchObject([{ app: 'productDefinitions', id: definition._id, kind: 'references', source: 'explicit' }]);
    const [pack] = await alice.as.query(api.contextPacks.list, { workspaceId: importedId });
    expect(pack).toMatchObject({ title: 'Pack', refs: [{ app: 'diagrams', id: diagram._id }], linkDepth: 1 });
  });

  it('imports backups that have no links', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const { workspaceId } = await workspaceWithItems(alice);
    const exported = await alice.as.query(api.workspaces.exportData, { id: workspaceId });
    const { links: _links, contextPacks: _packs, ...legacy } = exported!;
    const importedId = await alice.as.mutation(api.workspaces.importData, { data: legacy });
    expect(await alice.as.query(api.diagrams.list, { workspaceId: importedId })).toHaveLength(1);
  });
});
