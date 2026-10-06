import { describe, expect, it } from 'vitest';
import type { FunctionReference } from 'convex/server';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { setupBackend } from './test.helpers';

type Doc = { _id: string; title: string; spec: Record<string, unknown> };
/** The shape every spec app's functions share (see convex/lib/specDocs.ts). */
type SpecFns = {
  list: FunctionReference<'query', 'public', { workspaceId: Id<'workspaces'> }, Doc[]>;
  get: FunctionReference<'query', 'public', { id: string }, Doc | null>;
  create: FunctionReference<'mutation', 'public', { workspaceId: Id<'workspaces'>; title: string }, string>;
  rename: FunctionReference<'mutation', 'public', { id: string; title: string }, null>;
  update: FunctionReference<'mutation', 'public', { id: string; spec: unknown }, null>;
  duplicate: FunctionReference<'mutation', 'public', { id: string }, string>;
  remove: FunctionReference<'mutation', 'public', { id: string }, null>;
};

const APPS = [
  ['designSystems', 'Design system', { description: 'Calm and clear', colors: [{ name: 'brand', light: '#000' }] }],
  ['technicalPlans', 'Technical plan', { goal: 'Ship it', status: 'ready' }],
  ['decisions', 'Decision', { decision: 'Use Convex', status: 'accepted' }],
  ['glossaries', 'Glossary', { terms: [{ term: 'Workspace', definition: 'A container' }] }],
  ['researchStudies', 'Research study', { goal: 'Why churn?', insights: [{ statement: 'Setup is slow' }] }],
  ['roadmaps', 'Roadmap', { vision: 'Grow', initiatives: [{ title: 'Pricing', horizon: 'now' }] }],
] as const;

describe.each(APPS)('%s', (app, what, spec) => {
  it('creates, updates a normalized spec, renames, duplicates and deletes (with its links)', async () => {
    const { signedInAs, t } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'WS' });
    const fns = api[app] as unknown as SpecFns;
    const id = await alice.as.mutation(fns.create, { workspaceId, title: '  First  ' });
    const created = (await alice.as.query(fns.get, { id }))!;
    expect(created.title).toBe('First');

    await alice.as.mutation(fns.update, { id, spec: { ...spec, junk: 'dropped' } });
    const updated = (await alice.as.query(fns.get, { id }))!;
    const expected = Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, Array.isArray(v) ? v.map((x) => expect.objectContaining(x)) : v]));
    expect(updated.spec).toMatchObject(expected);
    expect(updated.spec).not.toHaveProperty('junk');

    await alice.as.mutation(fns.rename, { id, title: 'Renamed' });
    const copyId = await alice.as.mutation(fns.duplicate, { id });
    expect((await alice.as.query(fns.get, { id: copyId }))?.title).toBe('Renamed (Copy)');
    await expect(alice.as.mutation(fns.create, { workspaceId, title: ' ' })).rejects.toThrow('Title is required');

    const diagramId = await alice.as.mutation(api.diagrams.create, { workspaceId, title: 'D' });
    await alice.as.mutation(api.links.create, { workspaceId, from: { app, id }, to: { app: 'diagrams', id: diagramId }, kind: 'related' });
    await alice.as.mutation(fns.remove, { id });
    expect((await alice.as.query(fns.list, { workspaceId })).map((d) => d.title)).toEqual(['Renamed (Copy)']);
    expect(await t.run((ctx) => ctx.db.query('links').collect())).toEqual([]);
    expect((await alice.as.query(api.knowledge.catalog, { workspaceId })).map((c) => c.app).sort()).toEqual(['diagrams', app].sort());
  });

  it('is private to the workspace owner', async () => {
    const { signedInAs } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const bob = await signedInAs('bob@example.com');
    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'WS' });
    const fns = api[app] as unknown as SpecFns;
    const id = await alice.as.mutation(fns.create, { workspaceId, title: 'Mine' });
    expect(await bob.as.query(fns.get, { id })).toBeNull();
    expect(await bob.as.query(fns.list, { workspaceId })).toEqual([]);
    await expect(bob.as.mutation(fns.create, { workspaceId, title: 'X' })).rejects.toThrow('Workspace not found');
    await expect(bob.as.mutation(fns.update, { id, spec: {} })).rejects.toThrow(`${what} not found`);
    await expect(bob.as.mutation(fns.remove, { id })).rejects.toThrow(`${what} not found`);
  });
});

describe('legacy technical tasks', () => {
  it('convert into plans; links, packs and pyramid context follow; tasks and pipelines are deleted', async () => {
    const { signedInAs, insertLegacyTask, t } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const bob = await signedInAs('bob@example.com');
    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'WS' });
    const architectureId = await alice.as.mutation(api.technicalArchitectures.create, { workspaceId, title: 'Core' });
    const diagramId = await alice.as.mutation(api.diagrams.create, { workspaceId, title: 'Flow' });
    const taskId = await insertLegacyTask(workspaceId, 'Build login', architectureId);
    await alice.as.mutation(api.links.create, { workspaceId, from: { app: 'diagrams', id: diagramId }, to: { app: 'technicalTasks', id: taskId }, kind: 'references' });
    await alice.as.mutation(api.contextPacks.create, { workspaceId, title: 'P', refs: [{ app: 'technicalTasks', id: taskId }], linkDepth: 0 });
    const pyramidId = await alice.as.mutation(api.pyramids.create, { workspaceId, title: 'Q', question: 'Which login flow is best?' });
    const pyramid = await alice.as.query(api.pyramids.get, { id: pyramidId });
    await alice.as.mutation(api.pyramids.updateConfig, { id: pyramidId, config: { ...pyramid!.config, contextRefs: [{ kind: 'item', app: 'technicalTasks', id: taskId }] } });

    expect(await alice.as.query(api.technicalPlans.legacyTaskCount, { workspaceId })).toBe(1);
    expect(await bob.as.query(api.technicalPlans.legacyTaskCount, { workspaceId })).toBe(0);
    await expect(bob.as.mutation(api.technicalPlans.convertLegacyTasks, { workspaceId })).rejects.toThrow('Workspace not found');

    expect(await alice.as.mutation(api.technicalPlans.convertLegacyTasks, { workspaceId })).toEqual({ converted: 1 });
    const [plan] = await alice.as.query(api.technicalPlans.list, { workspaceId });
    expect(plan).toMatchObject({ title: 'Build login', spec: { status: 'ready', goal: 'Build login' } });
    const links = await alice.as.query(api.links.listForItem, { workspaceId, app: 'technicalPlans', id: plan._id });
    expect(links.outgoing).toMatchObject([{ app: 'technicalArchitectures', id: architectureId, kind: 'depends-on', source: 'explicit' }]);
    expect(links.incoming).toMatchObject([
      { app: 'diagrams', id: diagramId, kind: 'references', source: 'explicit' },
      // The pyramid reads the plan as context now.
      { app: 'pyramids', id: pyramidId, kind: 'references', source: 'derived' },
    ]);
    const [pack] = await alice.as.query(api.contextPacks.list, { workspaceId });
    expect(pack.refs).toEqual([{ app: 'technicalPlans', id: plan._id }]);
    expect((await alice.as.query(api.pyramids.get, { id: pyramidId }))?.config.contextRefs).toEqual([{ kind: 'item', app: 'technicalPlans', id: plan._id }]);
    expect(await t.run(async (ctx) => [...(await ctx.db.query('technicalTasks').collect()), ...(await ctx.db.query('pipelines').collect())])).toEqual([]);
    expect(await alice.as.query(api.technicalPlans.legacyTaskCount, { workspaceId })).toBe(0);
  });
});

describe('decisions from pyramids', () => {
  it('records the final answer as a proposed decision linked to the pyramid', async () => {
    const { signedInAs, t } = setupBackend();
    const alice = await signedInAs('alice@example.com');
    const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'WS' });
    const pyramidId = await alice.as.mutation(api.pyramids.create, { workspaceId, title: 'Market', question: 'Which market should we enter next?' });
    await expect(alice.as.mutation(api.decisions.createFromPyramid, { pyramidId })).rejects.toThrow('no final answer');

    const pyramid = (await alice.as.query(api.pyramids.get, { id: pyramidId }))!;
    const final = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6', 'G7', 'H8'][pyramid.config.boardSize - 1];
    await t.run((ctx) =>
      ctx.db.insert('pyramidCells', {
        workspaceId,
        pyramidId,
        label: final,
        row: 2 * pyramid.config.boardSize - 2,
        cell: { label: final, combinedQuestion: 'q', conclusion: 'Enter Germany first', dissent: ['Logistics cost'], confidence: 0.7, nextQuestion: null, summary: 's', primaryParent: null },
      }),
    );
    const id = await alice.as.mutation(api.decisions.createFromPyramid, { pyramidId });
    const decision = (await alice.as.query(api.decisions.get, { id }))!;
    expect(decision.title).toBe('Market');
    expect(decision.spec).toMatchObject({ status: 'proposed', decision: 'Enter Germany first', context: 'Which market should we enter next?' });
    expect(decision.spec.consequences).toContain('- Logistics cost');
    const links = await alice.as.query(api.links.listForItem, { workspaceId, app: 'decisions', id });
    expect(links.outgoing).toMatchObject([{ app: 'pyramids', id: pyramidId, kind: 'derived-from' }]);
  });
});
