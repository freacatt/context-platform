import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './_generated/api';
import { createFakeOpenRouter, FAKE_MODELS } from './fakeOpenRouter.helpers';
import { setupBackend } from './test.helpers';

const KEY = 'sk-or-v1-0123456789abcdef0123456789';

async function setup() {
  const fake = createFakeOpenRouter();
  vi.stubGlobal('fetch', fake.fetch);
  const backend = setupBackend();
  const alice = await backend.signedInAs('alice@example.com');
  const bob = await backend.signedInAs('bob@example.com');
  return { ...backend, fake, alice, bob };
}

beforeEach(() => {
  delete process.env.OPENROUTER_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENROUTER_API_KEY;
});

describe('AI settings', () => {
  it('stores the key but only ever returns a hint', async () => {
    const { alice, bob, t } = await setup();
    expect(await alice.as.query(api.aiSettings.get, {})).toMatchObject({ keySource: 'none', keyHint: null });
    await alice.as.mutation(api.aiSettings.setApiKey, { apiKey: `  ${KEY}  ` });

    const settings = await alice.as.query(api.aiSettings.get, {});
    expect(settings).toMatchObject({ keySource: 'user', keyHint: 'sk-or-…6789' });
    expect(JSON.stringify(settings)).not.toContain(KEY);
    expect(await t.run(async (ctx) => (await ctx.db.query('aiSettings').first())?.openRouterApiKey)).toBe(KEY);
    // Settings are per user.
    expect(await bob.as.query(api.aiSettings.get, {})).toMatchObject({ keySource: 'none' });
    expect(await t.query(api.aiSettings.get, {})).toBeNull();
  });

  it('rejects things that are not keys and removes the key', async () => {
    const { alice } = await setup();
    await expect(alice.as.mutation(api.aiSettings.setApiKey, { apiKey: 'short' })).rejects.toThrow(/does not look like/);
    await alice.as.mutation(api.aiSettings.setApiKey, { apiKey: KEY });
    await alice.as.mutation(api.aiSettings.removeApiKey, {});
    expect(await alice.as.query(api.aiSettings.get, {})).toMatchObject({ keySource: 'none' });
  });

  it('falls back to the deployment key', async () => {
    const { alice } = await setup();
    process.env.OPENROUTER_API_KEY = 'sk-or-deployment-key-0123456789';
    expect(await alice.as.query(api.aiSettings.get, {})).toMatchObject({ keySource: 'deployment', keyHint: null });
  });

  it('validates default panels and clears defaults with null', async () => {
    const { alice } = await setup();
    await expect(
      alice.as.mutation(api.aiSettings.updateDefaults, { defaultPanel: [{ model: 'a/one' }, { model: 'a/one' }] }),
    ).rejects.toThrow(/names must be unique/);
    await alice.as.mutation(api.aiSettings.updateDefaults, { defaultModel: 'b/two', defaultHost: { model: 'c/host' } });
    expect(await alice.as.query(api.aiSettings.get, {})).toMatchObject({ defaultModel: 'b/two', defaultHost: { model: 'c/host' } });
    await alice.as.mutation(api.aiSettings.updateDefaults, { defaultModel: null });
    expect(await alice.as.query(api.aiSettings.get, {})).toMatchObject({ defaultModel: null, defaultHost: { model: 'c/host' } });
  });

  it('signed-out users cannot change settings', async () => {
    const { t } = await setup();
    await expect(t.mutation(api.aiSettings.setApiKey, { apiKey: KEY })).rejects.toThrow(/Not signed in/);
  });
});

describe('AI actions', () => {
  it('complete uses the user’s key and default model', async () => {
    const { alice, fake } = await setup();
    await alice.as.mutation(api.aiSettings.setApiKey, { apiKey: KEY });
    await alice.as.mutation(api.aiSettings.updateDefaults, { defaultModel: 'b/two' });
    const out = await alice.as.action(api.ai.complete, { messages: [{ role: 'user', content: 'Hello' }] });
    expect(out).toMatchObject({ model: 'b/two', promptTokens: 100, completionTokens: 50, cost: '0.001' });
    const [req] = fake.chats();
    expect(req.authorization).toBe(`Bearer ${KEY}`);
    expect(req.body?.model).toBe('b/two');
  });

  it('complete without a key explains where to add one', async () => {
    const { alice } = await setup();
    await expect(alice.as.action(api.ai.complete, { messages: [{ role: 'user', content: 'Hi' }] })).rejects.toThrow(
      /Add one in Settings/,
    );
  });

  it('lists models from the cache after the first fetch', async () => {
    const { alice, fake } = await setup();
    expect(await alice.as.action(api.ai.listModels, {})).toEqual(FAKE_MODELS);
    await alice.as.action(api.ai.listModels, {});
    expect(fake.requests.filter((r) => r.path === '/models')).toHaveLength(1);
  });

  it('reports usage and limits of the key without spending; credits only when the key may read them', async () => {
    const { alice, fake } = await setup();
    expect(await alice.as.action(api.ai.accountStatus, {})).toBeNull();
    await alice.as.mutation(api.aiSettings.setApiKey, { apiKey: KEY });
    expect(await alice.as.action(api.ai.accountStatus, {})).toEqual({
      source: 'user',
      label: 'test key',
      isFreeTier: false,
      usage: { total: '0.5', daily: '0.1', weekly: '0.25', monthly: '0.4' },
      limit: '10',
      limitRemaining: '9.5',
      limitReset: 'monthly',
      credits: null,
    });
    expect(fake.requests.filter((r) => r.path === '/key').every((r) => r.authorization === `Bearer ${KEY}`)).toBe(true);
    expect(fake.chats()).toHaveLength(0);
  });

  it('reads account credits with a management key', async () => {
    vi.stubGlobal('fetch', createFakeOpenRouter({ credits: true }).fetch);
    const backend = setupBackend();
    const carol = await backend.signedInAs('carol@example.com');
    await carol.as.mutation(api.aiSettings.setApiKey, { apiKey: KEY });
    const status = await carol.as.action(api.ai.accountStatus, {});
    expect(status?.credits).toEqual({ total: '20', used: '7.25', remaining: '12.75' });
  });

  it('uses the deployment key when the user has none', async () => {
    const { alice } = await setup();
    process.env.OPENROUTER_API_KEY = 'sk-or-deployment-key-0123456789';
    expect((await alice.as.action(api.ai.accountStatus, {}))?.source).toBe('deployment');
  });
});

describe('pyramid presets', () => {
  it('saves by name (replacing), lists per user, and only the owner deletes', async () => {
    const { alice, bob } = await setup();
    const preset = { name: 'trio', panel: [{ model: 'a/one' }], host: { model: 'c/host' }, critiqueRound: false };
    const id = await alice.as.mutation(api.pyramidPresets.save, preset);
    expect(await alice.as.mutation(api.pyramidPresets.save, { ...preset, critiqueRound: true })).toBe(id);
    expect(await alice.as.query(api.pyramidPresets.list, {})).toMatchObject([{ name: 'trio', critiqueRound: true }]);
    expect(await bob.as.query(api.pyramidPresets.list, {})).toEqual([]);
    await expect(bob.as.mutation(api.pyramidPresets.remove, { id })).rejects.toThrow(/not found/);
    await alice.as.mutation(api.pyramidPresets.remove, { id });
    expect(await alice.as.query(api.pyramidPresets.list, {})).toEqual([]);
  });
});
