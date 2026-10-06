import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import { setupBackend } from './test.helpers';

async function setup() {
  const backend = setupBackend();
  const alice = await backend.signedInAs('alice@example.com');
  const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'WS' });
  return { ...backend, alice, workspaceId };
}

describe('productDefinitions', () => {
  it('creates an empty product spec and saves a normalized one', async () => {
    const { alice, workspaceId } = await setup();
    const id = await alice.as.mutation(api.productDefinitions.create, { workspaceId, title: 'Shop' });
    expect((await alice.as.query(api.productDefinitions.get, { id }))?.spec).toMatchObject({ vision: '', personas: [], features: [] });

    await alice.as.mutation(api.productDefinitions.update, {
      id,
      spec: { vision: 'Sell tea', features: [{ name: 'Cart', priority: 'nonsense' }], junk: 1 },
    });
    const { spec } = (await alice.as.query(api.productDefinitions.get, { id }))!;
    expect(spec.vision).toBe('Sell tea');
    expect(spec.features).toMatchObject([{ id: 'feature-1', name: 'Cart', priority: 'should', status: 'idea' }]);
    expect(spec).not.toHaveProperty('junk');
  });

  it('reads a previous-version (mind map) document as a spec, and drops the old data on save', async () => {
    const { alice, t, workspaceId } = await setup();
    const id = await t.run((ctx) =>
      ctx.db.insert('productDefinitions', {
        workspaceId,
        title: 'Old',
        updatedAt: 0,
        data: {
          root: { id: 'root', label: 'Product Definition', children: ['1-1'] },
          '1-1': { id: '1-1', label: 'Product Summary', description: 'A tool for structured thinking', parent: 'root' },
        },
      }),
    );
    const definition = await alice.as.query(api.productDefinitions.get, { id });
    expect(definition?.spec.vision).toBe('A tool for structured thinking');
    expect(definition?.spec.notes).toContain('### Product Summary');
    expect(definition).not.toHaveProperty('data');

    await alice.as.mutation(api.productDefinitions.update, { id, spec: definition!.spec });
    const stored = await t.run((ctx) => ctx.db.get(id));
    expect(stored?.data).toBeUndefined();
    expect(stored?.spec.vision).toBe('A tool for structured thinking');
  });

  it('renames, duplicates, deletes, and stays private', async () => {
    const { alice, workspaceId, signedInAs } = await setup();
    const bob = await signedInAs('bob@example.com');
    const id = await alice.as.mutation(api.productDefinitions.create, { workspaceId, title: 'PD' });

    await alice.as.mutation(api.productDefinitions.rename, { id, title: 'Renamed' });
    expect((await alice.as.query(api.productDefinitions.get, { id }))?.title).toBe('Renamed');
    const copy = await alice.as.mutation(api.productDefinitions.duplicate, { id });
    expect((await alice.as.query(api.productDefinitions.get, { id: copy }))?.title).toBe('Renamed (Copy)');
    expect(await bob.as.query(api.productDefinitions.get, { id })).toBeNull();
    await expect(bob.as.mutation(api.productDefinitions.update, { id, spec: {} })).rejects.toThrow('Product definition not found');

    await alice.as.mutation(api.productDefinitions.remove, { id });
    expect((await alice.as.query(api.productDefinitions.list, { workspaceId })).map((d) => d.title)).toEqual(['Renamed (Copy)']);
  });
});
