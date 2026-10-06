import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { createFakeOpenRouter } from './fakeOpenRouter.helpers';
import { setupBackend } from './test.helpers';
import type { FakeModelOptions } from '../shared/pyramid/fakeModel';
import { parseMoney } from '../shared/pyramid/money';
import type { PyramidConfig } from '../shared/pyramid/types';

const KEY = 'sk-or-v1-0123456789abcdef0123456789';

async function setup(fakeOptions: FakeModelOptions = {}) {
  const fake = createFakeOpenRouter(fakeOptions);
  vi.stubGlobal('fetch', fake.fetch);
  const backend = setupBackend();
  const alice = await backend.signedInAs('alice@example.com');
  const bob = await backend.signedInAs('bob@example.com');
  const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'WS' });
  await alice.as.mutation(api.aiSettings.setApiKey, { apiKey: KEY });

  // Advance the clock a second per tick: steps (and retry back-offs) run, while the 12-minute
  // watchdog only fires if a runner really stalls.
  const finish = () => backend.t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(1000));
  const get = async (id: Id<'pyramids'>) => (await alice.as.query(api.pyramids.get, { id }))!;

  /** A pyramid with a complete setup on a board of `size`. */
  async function draft(overrides: Partial<PyramidConfig> = {}) {
    const id = await alice.as.mutation(api.pyramids.create, { workspaceId, title: 'Market', question: 'Which market should we enter next?' });
    const { config } = await get(id);
    await alice.as.mutation(api.pyramids.updateConfig, {
      id,
      config: { ...config, boardSize: 2, panel: [{ model: 'a/one' }], host: { model: 'c/host' }, ...overrides } as typeof config,
    });
    return id;
  }

  /** Estimates and starts; runs every scheduled step to the next stop. */
  async function start(id: Id<'pyramids'>, budgetCap?: string) {
    await alice.as.action(api.pyramids.estimate, { id });
    await alice.as.mutation(api.pyramids.confirm, { id, budgetCap });
    await finish();
  }

  return { ...backend, fake, alice, bob, workspaceId, finish, get, draft, start };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('pyramid setup', () => {
  it('creates a draft with the user’s default panel and host', async () => {
    const { alice, workspaceId, get } = await setup();
    await alice.as.mutation(api.aiSettings.updateDefaults, { defaultPanel: [{ model: 'a/one', name: 'Skeptic' }], defaultHost: { model: 'c/host' } });
    const id = await alice.as.mutation(api.pyramids.create, { workspaceId, title: 'P', question: 'Why is churn rising?' });
    const pyramid = await get(id);
    expect(pyramid).toMatchObject({ status: 'draft', currentRow: 0, spent: '0' });
    expect(pyramid.config).toMatchObject({ question: 'Why is churn rising?', panel: [{ model: 'a/one', name: 'Skeptic' }], host: { model: 'c/host' } });
    expect(await alice.as.query(api.pyramids.list, { workspaceId })).toHaveLength(1);
  });

  it('another user can neither read nor change it', async () => {
    const { alice, bob, workspaceId, draft } = await setup();
    const id = await draft();
    expect(await bob.as.query(api.pyramids.get, { id })).toBeNull();
    expect(await bob.as.query(api.pyramids.cells, { id })).toEqual([]);
    expect(await bob.as.query(api.pyramids.report, { id, format: 'md' })).toBeNull();
    expect(await bob.as.query(api.pyramids.list, { workspaceId })).toEqual([]);
    await expect(bob.as.mutation(api.pyramids.rename, { id, title: 'x' })).rejects.toThrow(/not found/);
    await expect(bob.as.action(api.pyramids.estimate, { id })).rejects.toThrow(/not found/);
    await expect(bob.as.mutation(api.pyramids.cancel, { id })).rejects.toThrow(/not found/);
    expect((await alice.as.query(api.pyramids.get, { id }))?.title).toBe('Market');
  });

  it('rejects context documents from another workspace', async () => {
    const { alice, t, draft, get } = await setup();
    const id = await draft();
    const otherWs = await alice.as.mutation(api.workspaces.create, { name: 'Other' });
    const docId = await t.run((ctx) =>
      ctx.db.insert('contextDocuments', { workspaceId: otherWs, title: 'D', type: 'text', content: 'secret', updatedAt: 0 }),
    );
    const { config } = await get(id);
    await expect(alice.as.mutation(api.pyramids.updateConfig, { id, config: { ...config, contextDocumentIds: [docId] } })).rejects.toThrow(
      /Context item not found/,
    );
  });

  it('estimating validates the setup and needs an API key', async () => {
    const { alice, draft } = await setup();
    const short = await draft({ question: 'Too short' });
    await expect(alice.as.action(api.pyramids.estimate, { id: short })).rejects.toThrow(/at least 10 characters/);
    const unknown = await draft({ host: { model: 'x/unknown' } });
    await expect(alice.as.action(api.pyramids.estimate, { id: unknown })).rejects.toThrow(/not in the OpenRouter model list/);
    await alice.as.mutation(api.aiSettings.removeApiKey, {});
    await expect(alice.as.action(api.pyramids.estimate, { id: await draft() })).rejects.toThrow(/No OpenRouter API key/);
  });

  it('a setup change discards the estimate; starting needs an estimate', async () => {
    const { alice, draft, get } = await setup();
    const id = await draft();
    const est = await alice.as.action(api.pyramids.estimate, { id });
    expect(parseMoney(est.low) < parseMoney(est.high)).toBe(true);
    expect((await get(id)).status).toBe('estimated');
    const { config } = await get(id);
    await alice.as.mutation(api.pyramids.updateConfig, { id, config: { ...config, boardSize: 3 } });
    const changed = await get(id);
    expect(changed.status).toBe('draft');
    expect(changed.estimate).toBeUndefined();
    await expect(alice.as.mutation(api.pyramids.confirm, { id })).rejects.toThrow(/Estimate the cost/);
  });
});

describe('running a pyramid', () => {
  it('a 2×2 board with auto-approve completes with a final answer and a critical path of 3', async () => {
    const { alice, fake, draft, start, get } = await setup();
    const id = await draft({ autoApprove: true });
    await start(id);

    const pyramid = await get(id);
    expect(pyramid).toMatchObject({ status: 'completed', currentRow: 2 });
    expect(fake.chats()).toHaveLength(4); // (panel + host) × 2 rows
    expect(fake.chats().every((r) => r.authorization === `Bearer ${KEY}`)).toBe(true);
    expect(pyramid.spent).toBe('0.004');
    expect(pyramid.budgetCap).toBe(pyramid.estimate!.high);

    const cells = await alice.as.query(api.pyramids.cells, { id });
    expect(cells.map((c) => c.label).sort()).toEqual(['A2', 'B1', 'B2']);
    const md = (await alice.as.query(api.pyramids.report, { id, format: 'md' }))!;
    expect(md).toContain('Conclusion for B2.');
    expect(md.match(/^\d\. \*\*/gm)).toHaveLength(3);
    const transcripts = (await alice.as.query(api.pyramids.report, { id, format: 'transcripts' }))!;
    expect(transcripts.match(/^## Call /gm)).toHaveLength(4);
  });

  it('details total the run; discussion shows what every panelist and the host said about a cell', async () => {
    const { alice, bob, draft, start } = await setup();
    const id = await draft({ autoApprove: true, panel: [{ model: 'a/one', name: 'Skeptic' }, { model: 'b/two' }] });
    await start(id);

    const details = (await alice.as.query(api.pyramids.details, { id }))!;
    expect(details).toMatchObject({ totalCalls: 6, failedCalls: 0, totalCost: '0.006' });
    expect(details.roles).toEqual({ panel: { calls: 4, cost: '0.004' }, host: { calls: 2, cost: '0.002' } });
    expect(details.models.map((m) => [m.model, m.calls])).toEqual([['a/one', 2], ['b/two', 2], ['c/host', 2]]);

    const talk = (await alice.as.query(api.pyramids.discussion, { id, label: 'B2' }))!;
    expect(talk.map((t) => [t.role, t.panelist])).toEqual([
      ['panel', 'Skeptic'],
      ['panel', 'b/two'],
      ['host', null],
    ]);
    expect(talk[0].statement).toMatchObject({ answer: 'a/one answers B2.', combinedQuestion: 'Combined question for B2?' });
    expect(talk[2].statement).toMatchObject({ conclusion: 'Conclusion for B2.', confidence: 0.8, primaryParent: 'A2' });

    expect(await alice.as.query(api.pyramids.discussion, { id, label: 'Z9' })).toBeNull();
    expect(await bob.as.query(api.pyramids.discussion, { id, label: 'B2' })).toBeNull();
    expect(await bob.as.query(api.pyramids.details, { id })).toBeNull();
  });

  it('stops at a checkpoint; an edited next question reaches the next row’s prompt', async () => {
    const { alice, fake, draft, start, get, finish } = await setup();
    const id = await draft();
    await start(id);
    expect(await get(id)).toMatchObject({ status: 'awaiting_approval', currentRow: 1 });
    expect(fake.calls.filter((c) => c.labels.includes('B2'))).toHaveLength(0); // no row-2 call yet

    expect(await alice.as.query(api.pyramids.rowSummary, { id, row: 1 })).toEqual({ cost: '0.002', calls: 2, failedPanelists: [] });
    await expect(alice.as.mutation(api.pyramids.approveRow, { id, row: 1, edits: { C1: 'x' } })).rejects.toThrow(/not a cell of row 1/);
    await alice.as.mutation(api.pyramids.approveRow, { id, row: 1, edits: { b1: 'Is Brazil big enough?' } });
    await finish();

    expect((await get(id)).status).toBe('completed');
    const row2 = fake.calls.filter((c) => c.labels.includes('B2'));
    expect(row2.length).toBeGreaterThan(0);
    expect(row2.every((c) => c.prompt.includes('Is Brazil big enough?'))).toBe(true);
    const b1 = (await alice.as.query(api.pyramids.cells, { id })).find((c) => c.label === 'B1')!;
    expect(b1).toMatchObject({ edited: true, originalNextQuestion: 'Next question from B1?', cell: { nextQuestion: 'Is Brazil big enough?' } });
  });

  it('pauses at a checkpoint when the remaining rows would pass the cap, without further calls', async () => {
    const { alice, fake, draft, start, get, finish } = await setup();
    const id = await draft({ autoApprove: true });
    await start(id, '0.0025');
    expect(await get(id)).toMatchObject({ status: 'paused_budget', currentRow: 1, spent: '0.002' });
    expect(fake.chats()).toHaveLength(2);

    await expect(alice.as.mutation(api.pyramids.raiseBudget, { id, budgetCap: '0.001' })).rejects.toThrow(/below what was already spent/);
    await alice.as.mutation(api.pyramids.raiseBudget, { id, budgetCap: '1' });
    await finish();
    expect((await get(id)).status).toBe('completed');
  });

  it('hard-stops mid-row once spent reaches the cap', async () => {
    const { draft, start, get, fake } = await setup();
    const id = await draft({ autoApprove: true });
    await start(id, '0.0001');
    expect(await get(id)).toMatchObject({ status: 'paused_budget', currentRow: 0 });
    expect(fake.chats()).toHaveLength(1); // the panelist ran; the host never started
  });

  it('a host that never returns valid JSON fails the row; resume retries it without re-billing earlier rows', async () => {
    let broken = true;
    const { alice, draft, start, get, finish, fake } = await setup({ override: (i) => (broken && i.role === 'host' && i.labels.includes('B2') ? 'no json' : undefined) });
    const id = await draft({ autoApprove: true });
    await start(id);
    const failed = await get(id);
    expect(failed).toMatchObject({ status: 'failed', currentRow: 1 });
    expect(failed.error).toMatch(/no JSON object found/);
    const before = fake.chats().length;

    broken = false;
    await alice.as.mutation(api.pyramids.resume, { id });
    await finish();
    expect((await get(id)).status).toBe('completed');
    expect(fake.chats().slice(before).every((r) => JSON.stringify(r.body).includes('B2'))).toBe(true);
  });

  it('writes a brief from context documents once, and the rows use it', async () => {
    const { alice, t, workspaceId, draft, start, get, fake } = await setup();
    const docId = await t.run((ctx) =>
      ctx.db.insert('contextDocuments', { workspaceId, title: 'Notes', type: 'text', content: 'Competitors lowered prices', updatedAt: 0 }),
    );
    const id = await draft({ autoApprove: true });
    const { config } = await get(id);
    await alice.as.mutation(api.pyramids.updateConfig, { id, config: { ...config, contextDocumentIds: [docId] } });
    await start(id);

    expect(await get(id)).toMatchObject({ status: 'completed', brief: 'Brief: the key facts.' });
    const brief = fake.calls.filter((c) => c.role === 'brief');
    expect(brief).toHaveLength(1);
    expect(brief[0].prompt).toContain('Competitors lowered prices');
    expect(fake.calls.filter((c) => c.role !== 'brief').every((c) => c.prompt.includes('# Context brief'))).toBe(true);
  });

  it('the watchdog fails a run whose runner stopped writing; a stale run can be resumed', async () => {
    const { alice, t, draft, start, get } = await setup();
    const id = await draft();
    await start(id);
    await alice.as.mutation(api.pyramids.approveRow, { id, row: 1 });
    const { executionId } = await get(id);
    await expect(alice.as.mutation(api.pyramids.resume, { id })).rejects.toThrow(/already running/);

    await t.run((ctx) => ctx.db.patch(id, { updatedAt: Date.now() - 11 * 60 * 1000 }));
    await t.mutation(internal.pyramidRunner.watchdog, { id, executionId: executionId! });
    expect(await get(id)).toMatchObject({ status: 'failed', error: expect.stringMatching(/stopped responding during row 2/) });
  });

  it('cancel stops the run; delete removes its cells and calls', async () => {
    const { alice, t, draft, start, get } = await setup();
    const id = await draft();
    await start(id);
    await alice.as.mutation(api.pyramids.cancel, { id });
    expect((await get(id)).status).toBe('cancelled');
    await expect(alice.as.mutation(api.pyramids.approveRow, { id, row: 1 })).rejects.toThrow(/not awaiting approval/);

    await alice.as.mutation(api.pyramids.remove, { id });
    const leftovers = await t.run(async (ctx) => [
      ...(await ctx.db.query('pyramidCells').collect()),
      ...(await ctx.db.query('pyramidCalls').collect()),
    ]);
    expect(leftovers).toEqual([]);
  });
});

describe('pyramid context sources', () => {
  it('reads items of any app, context packs (with their links) and uploaded files into the brief', async () => {
    const { alice, workspaceId, draft, start, get, fake } = await setup();
    const archId = await alice.as.mutation(api.technicalArchitectures.create, { workspaceId, title: 'Core Platform' });
    const diagramId = await alice.as.mutation(api.diagrams.create, { workspaceId, title: 'Checkout Flow' });
    await alice.as.mutation(api.diagrams.saveGraph, {
      id: diagramId,
      nodes: [{ id: 'n', position: { x: 0, y: 0 }, data: { title: 'Payment step', description: 'Stripe' } }],
      edges: [],
    });
    const definitionId = await alice.as.mutation(api.productDefinitions.create, { workspaceId, title: 'Shop' });
    await alice.as.mutation(api.links.create, {
      workspaceId,
      from: { app: 'diagrams', id: diagramId },
      to: { app: 'productDefinitions', id: definitionId },
      kind: 'references',
    });
    const packId = await alice.as.mutation(api.contextPacks.create, {
      workspaceId,
      title: 'Checkout',
      refs: [{ app: 'diagrams', id: diagramId }],
      linkDepth: 1,
    });
    const id = await draft({ autoApprove: true });
    const fileId = await alice.as.mutation(api.pyramidFiles.add, { pyramidId: id, title: 'notes.md', content: '# Notes\nMargins are thin' });
    const { config } = await get(id);
    await alice.as.mutation(api.pyramids.updateConfig, {
      id,
      config: {
        ...config,
        contextRefs: [
          { kind: 'item', app: 'technicalArchitectures', id: archId },
          { kind: 'pack', id: packId },
          { kind: 'file', id: fileId },
        ],
      },
    });

    const summary = await alice.as.query(api.pyramids.contextSummary, { id });
    expect(summary?.sources.map((s) => `${s.label}: ${s.title}`)).toEqual([
      'Uploaded file: notes.md',
      'Technical Architectures: Core Platform',
      'Diagrams: Checkout Flow',
      'Product Definitions: Shop',
    ]);

    await start(id);
    expect((await get(id)).status).toBe('completed');
    const [brief] = fake.calls.filter((c) => c.role === 'brief');
    expect(brief.prompt).toContain('Margins are thin');
    expect(brief.prompt).toContain('Payment step');
    expect(brief.prompt).toContain('# Core Platform');
    expect(brief.prompt).toContain('# Shop');
    const details = await alice.as.query(api.pyramids.details, { id });
    expect(details?.contextSources).toHaveLength(4);
  });

  it('expands item sources along links when asked', async () => {
    const { alice, workspaceId, draft, get } = await setup();
    const archId = await alice.as.mutation(api.technicalArchitectures.create, { workspaceId, title: 'Core' });
    const definitionId = await alice.as.mutation(api.productDefinitions.create, { workspaceId, title: 'Shop' });
    await alice.as.mutation(api.links.create, {
      workspaceId,
      from: { app: 'technicalArchitectures', id: archId },
      to: { app: 'productDefinitions', id: definitionId },
      kind: 'implements',
    });
    const id = await draft();
    const { config } = await get(id);
    const refs = [{ kind: 'item' as const, app: 'technicalArchitectures' as const, id: archId }];
    await alice.as.mutation(api.pyramids.updateConfig, { id, config: { ...config, contextRefs: refs } });
    expect((await alice.as.query(api.pyramids.contextSummary, { id }))?.sources).toHaveLength(1);
    await alice.as.mutation(api.pyramids.updateConfig, { id, config: { ...config, contextRefs: refs, contextLinkDepth: 1 } });
    expect((await alice.as.query(api.pyramids.contextSummary, { id }))?.sources.map((s) => s.title)).toEqual(['Core', 'Shop']);
  });

  it('folds legacy context document ids into context refs on save', async () => {
    const { alice, workspaceId, draft, get } = await setup();
    const docId = await alice.as.mutation(api.contextDocuments.create, { workspaceId, title: 'Notes' });
    const id = await draft();
    const { config } = await get(id);
    await alice.as.mutation(api.pyramids.updateConfig, { id, config: { ...config, contextDocumentIds: [docId] } });
    expect((await get(id)).config).toMatchObject({ contextDocumentIds: [], contextRefs: [{ kind: 'item', app: 'contextDocuments', id: docId }] });
  });

  it('refuses sources from elsewhere: another workspace’s items and packs, another pyramid’s files', async () => {
    const { alice, bob, workspaceId, draft, get } = await setup();
    const bobWorkspace = await bob.as.mutation(api.workspaces.create, { name: 'Bob' });
    const bobDiagram = await bob.as.mutation(api.diagrams.create, { workspaceId: bobWorkspace, title: 'Secret' });
    const bobPack = await bob.as.mutation(api.contextPacks.create, { workspaceId: bobWorkspace, title: 'P', refs: [], linkDepth: 0 });
    const id = await draft();
    const other = await draft();
    const otherFile = await alice.as.mutation(api.pyramidFiles.add, { pyramidId: other, title: 'x.md', content: 'x' });
    const { config } = await get(id);
    const save = (contextRefs: PyramidConfig['contextRefs']) => alice.as.mutation(api.pyramids.updateConfig, { id, config: { ...config, contextRefs } });
    await expect(save([{ kind: 'item', app: 'diagrams', id: bobDiagram }])).rejects.toThrow('Context item not found');
    await expect(save([{ kind: 'pack', id: bobPack }])).rejects.toThrow('Context pack not found');
    await expect(save([{ kind: 'file', id: otherFile }])).rejects.toThrow('Context file not found');
    await expect(save([{ kind: 'file', id: 'garbage' }])).rejects.toThrow('Context file not found');
    void workspaceId;
  });

  it('manages files: private, only before the run, size-limited; deleted and copied with the pyramid', async () => {
    const { alice, bob, t, draft, start, get } = await setup();
    const id = await draft();
    const fileId = await alice.as.mutation(api.pyramidFiles.add, { pyramidId: id, title: 'a.md', content: 'Alpha' });
    expect(await alice.as.query(api.pyramidFiles.list, { pyramidId: id })).toMatchObject([{ _id: fileId, title: 'a.md', chars: 5 }]);
    expect(await bob.as.query(api.pyramidFiles.list, { pyramidId: id })).toEqual([]);
    await expect(bob.as.mutation(api.pyramidFiles.add, { pyramidId: id, title: 'b.md', content: 'b' })).rejects.toThrow('Pyramid not found');
    await expect(bob.as.mutation(api.pyramidFiles.remove, { id: fileId })).rejects.toThrow('File not found');
    await expect(
      alice.as.mutation(api.pyramidFiles.add, { pyramidId: id, title: 'big.md', content: 'x'.repeat(500_001) }),
    ).rejects.toThrow('larger than');

    const { config } = await get(id);
    await alice.as.mutation(api.pyramids.updateConfig, { id, config: { ...config, contextRefs: [{ kind: 'file', id: fileId }] } });
    const copyId = await alice.as.mutation(api.pyramids.duplicate, { id });
    const [copiedFile] = await alice.as.query(api.pyramidFiles.list, { pyramidId: copyId });
    expect(copiedFile._id).not.toBe(fileId);
    expect((await get(copyId)).config.contextRefs).toEqual([{ kind: 'file', id: copiedFile._id }]);

    await start(id);
    await expect(alice.as.mutation(api.pyramidFiles.add, { pyramidId: id, title: 'c.md', content: 'c' })).rejects.toThrow('before the run starts');
    await alice.as.mutation(api.pyramids.remove, { id });
    expect((await t.run((ctx) => ctx.db.query('pyramidFiles').collect())).map((f) => f.pyramidId)).toEqual([copyId]);
  });

  it('refuses to estimate a context larger than the limit', async () => {
    const { alice, draft, get } = await setup();
    const id = await draft();
    const refs = [];
    for (let i = 0; i < 2; i++) {
      refs.push({ kind: 'file' as const, id: await alice.as.mutation(api.pyramidFiles.add, { pyramidId: id, title: `${i}.md`, content: 'x'.repeat(400_000) }) });
    }
    const { config } = await get(id);
    await alice.as.mutation(api.pyramids.updateConfig, { id, config: { ...config, contextRefs: refs } });
    await expect(alice.as.action(api.pyramids.estimate, { id })).rejects.toThrow('The context is too large');
  });

  it('survives a backup round trip with items, packs and files re-linked', async () => {
    const { alice, workspaceId, draft, get } = await setup();
    const diagramId = await alice.as.mutation(api.diagrams.create, { workspaceId, title: 'Flow' });
    const packId = await alice.as.mutation(api.contextPacks.create, { workspaceId, title: 'P', refs: [{ app: 'diagrams', id: diagramId }], linkDepth: 0 });
    const id = await draft();
    const fileId = await alice.as.mutation(api.pyramidFiles.add, { pyramidId: id, title: 'a.md', content: 'Alpha' });
    const { config } = await get(id);
    await alice.as.mutation(api.pyramids.updateConfig, {
      id,
      config: { ...config, contextRefs: [{ kind: 'item', app: 'diagrams', id: diagramId }, { kind: 'pack', id: packId }, { kind: 'file', id: fileId }] },
    });

    const exported = await alice.as.query(api.workspaces.exportData, { id: workspaceId });
    const importedId = await alice.as.mutation(api.workspaces.importData, { data: exported });
    const [pyramid] = await alice.as.query(api.pyramids.list, { workspaceId: importedId });
    const [diagram] = await alice.as.query(api.diagrams.list, { workspaceId: importedId });
    const [pack] = await alice.as.query(api.contextPacks.list, { workspaceId: importedId });
    const [file] = await alice.as.query(api.pyramidFiles.list, { pyramidId: pyramid._id });
    expect(pyramid.config.contextRefs).toEqual([
      { kind: 'item', app: 'diagrams', id: diagram._id },
      { kind: 'pack', id: pack._id },
      { kind: 'file', id: file._id },
    ]);
    expect(pack.refs).toEqual([{ app: 'diagrams', id: diagram._id }]);
  });
});
