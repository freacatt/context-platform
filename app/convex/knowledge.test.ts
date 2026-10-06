import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import { setupBackend } from './test.helpers';

describe('knowledge', () => {
  async function setup() {
    const { signedInAs, insertLegacyTask } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const bob = await signedInAs('bob@example.com');
    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'Acme' });
    const definitionId = await alice.as.mutation(api.productDefinitions.create, { workspaceId, title: 'Shop' });
    const architectureId = await alice.as.mutation(api.technicalArchitectures.create, { workspaceId, title: 'Core' });
    // A task of the retired Technical Tasks app is still a knowledge item until converted.
    const taskId = await insertLegacyTask(workspaceId, 'Build', architectureId);
    await alice.as.mutation(api.links.create, {
      workspaceId,
      from: { app: 'technicalArchitectures', id: architectureId },
      to: { app: 'productDefinitions', id: definitionId },
      kind: 'implements',
    });
    return { alice, bob, workspaceId, definitionId, architectureId, taskId };
  }

  it('lists every item in the catalog', async () => {
    const { alice, workspaceId, definitionId } = await setup();
    const catalog = await alice.as.query(api.knowledge.catalog, { workspaceId });
    expect(catalog.map((c) => `${c.app}:${c.title}`).sort()).toEqual([
      'productDefinitions:Shop',
      'technicalArchitectures:Core',
      'technicalTasks:Build',
    ]);
    expect(catalog.find((c) => c.app === 'productDefinitions')?.id).toBe(definitionId);
  });

  it('expands a selection along links up to the depth', async () => {
    const { alice, workspaceId, taskId } = await setup();
    const collect = (linkDepth: number) =>
      alice.as.query(api.knowledge.collect, { workspaceId, refs: [{ app: 'technicalTasks', id: taskId }], linkDepth });

    expect((await collect(0))?.items.map((i) => i.title)).toEqual(['Build']);
    const depth1 = await collect(1);
    expect(depth1?.items.map((i) => i.title)).toEqual(['Build', 'Core']);
    expect(depth1?.edges).toEqual([
      expect.objectContaining({ kind: 'depends-on', source: 'derived' }),
    ]);
    const all = await collect(-1);
    expect(all?.workspaceName).toBe('Acme');
    expect(all?.items.map((i) => i.title)).toEqual(['Build', 'Core', 'Shop']);
    expect(all?.edges.map((e) => e.kind).sort()).toEqual(['depends-on', 'implements']);
    const task = all?.items[0];
    expect(task?.meta).toMatchObject({ type: 'NEW_TASK', pipeline: 'Backlog' });
    expect(task?.markdown).toContain('# Build');
  });

  it('serializes pyramids and context documents with their extra data', async () => {
    const { alice, workspaceId } = await setup();
    const directoryId = await alice.as.mutation(api.directories.create, { workspaceId, title: 'Research' });
    const documentId = await alice.as.mutation(api.contextDocuments.create, { workspaceId, title: 'Notes', directoryId });
    const pyramidId = await alice.as.mutation(api.pyramids.create, { workspaceId, title: 'Market', question: 'Which market should we enter next?' });
    const pyramid = await alice.as.query(api.pyramids.get, { id: pyramidId });
    await alice.as.mutation(api.pyramids.updateConfig, {
      id: pyramidId,
      config: { ...pyramid!.config, contextDocumentIds: [documentId] },
    });

    const result = await alice.as.query(api.knowledge.collect, {
      workspaceId,
      refs: [{ app: 'pyramids', id: pyramidId }],
      linkDepth: 1,
    });
    expect(result?.items.map((i) => i.title)).toEqual(['Market', 'Notes']);
    expect(result?.items[0].markdown).toContain('**Question:** Which market should we enter next?');
    expect(result?.items[1].meta).toMatchObject({ folder: 'Research' });
    expect(result?.edges).toMatchObject([{ kind: 'references', source: 'derived' }]);
  });

  it('skips unknown and foreign refs, and returns nothing to other users', async () => {
    const { alice, bob, workspaceId, definitionId } = await setup();
    const bobWorkspace = await bob.as.mutation(api.workspaces.create, { name: 'Bob' });
    const bobDiagram = await bob.as.mutation(api.diagrams.create, { workspaceId: bobWorkspace, title: 'Secret' });

    const result = await alice.as.query(api.knowledge.collect, {
      workspaceId,
      refs: [
        { app: 'diagrams', id: bobDiagram },
        { app: 'diagrams', id: 'garbage' },
        { app: 'productDefinitions', id: definitionId },
      ],
      linkDepth: 0,
    });
    expect(result?.items.map((i) => i.title)).toEqual(['Shop']);

    expect(await bob.as.query(api.knowledge.collect, { workspaceId, refs: [{ app: 'productDefinitions', id: definitionId }], linkDepth: -1 })).toBeNull();
    expect(await bob.as.query(api.knowledge.catalog, { workspaceId })).toEqual([]);
  });
});
