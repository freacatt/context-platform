import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import { createDefaultTechnicalArchitecture } from '../shared/technicalArchitecture';
import { createDefaultUiUxArchitecture } from '../shared/uiUxArchitecture';
import { setupBackend } from './test.helpers';

async function setup() {
  const backend = setupBackend();
  const alice = await backend.signedInAs('alice@example.com');
  const workspaceId = await alice.as.mutation(api.workspaces.create, { name: 'WS' });
  return { ...backend, alice, workspaceId };
}

describe('technical architectures', () => {
  it('creates an empty architecture and saves a normalized spec', async () => {
    const { alice, workspaceId } = await setup();
    const id = await alice.as.mutation(api.technicalArchitectures.create, { workspaceId, title: 'Arch' });
    expect((await alice.as.query(api.technicalArchitectures.get, { id }))?.spec).toMatchObject({ summary: '', components: [], stack: [] });

    await alice.as.mutation(api.technicalArchitectures.update, {
      id,
      spec: { style: 'serverless', components: [{ id: 'api', name: 'API', kind: 'function', dependsOn: [{ to: 'db' }] }, { id: 'db', name: 'DB', kind: 'database' }], junk: 1 },
    });
    const { spec } = (await alice.as.query(api.technicalArchitectures.get, { id }))!;
    expect(spec.style).toBe('serverless');
    expect(spec.components[0]).toMatchObject({ name: 'API', kind: 'function', dependsOn: [{ to: 'db', via: '' }] });
    expect(spec).not.toHaveProperty('junk');
  });

  it('reads a previous-version architecture as a spec and drops its sections on save', async () => {
    const { alice, t, workspaceId } = await setup();
    const id = await t.run((ctx) =>
      ctx.db.insert('technicalArchitectures', {
        workspaceId,
        title: 'Old',
        updatedAt: 0,
        ...createDefaultTechnicalArchitecture(new Date(0)),
        metadata: { document_id: 'x', last_updated: '', description: 'Legacy backend' },
      }),
    );
    const arch = (await alice.as.query(api.technicalArchitectures.get, { id }))!;
    expect(arch.spec.summary).toBe('Legacy backend');
    expect(arch).not.toHaveProperty('metadata');

    await alice.as.mutation(api.technicalArchitectures.update, { id, spec: arch.spec });
    const stored = (await t.run((ctx) => ctx.db.get(id)))!;
    expect(stored.metadata).toBeUndefined();
    expect(stored.system_architecture).toBeUndefined();
    expect(stored.spec.summary).toBe('Legacy backend');
  });

  it('renames, duplicates, deletes and is private to the workspace owner', async () => {
    const { alice, workspaceId, signedInAs } = await setup();
    const bob = await signedInAs('bob@example.com');
    const id = await alice.as.mutation(api.technicalArchitectures.create, { workspaceId, title: 'Arch' });
    await alice.as.mutation(api.technicalArchitectures.rename, { id, title: 'Core' });
    const copy = await alice.as.mutation(api.technicalArchitectures.duplicate, { id });
    expect((await alice.as.query(api.technicalArchitectures.get, { id: copy }))?.title).toBe('Core (Copy)');
    expect(await bob.as.query(api.technicalArchitectures.get, { id })).toBeNull();
    await expect(bob.as.mutation(api.technicalArchitectures.update, { id, spec: {} })).rejects.toThrow('Technical architecture not found');
    await alice.as.mutation(api.technicalArchitectures.remove, { id });
    expect((await alice.as.query(api.technicalArchitectures.list, { workspaceId })).map((a) => a.title)).toEqual(['Core (Copy)']);
  });
});

describe('UI/UX architectures', () => {
  it('creates with defaults, updates sections, renames and deletes', async () => {
    const { alice, workspaceId } = await setup();
    const id = await alice.as.mutation(api.uiUxArchitectures.create, { workspaceId, title: 'UX' });
    const created = (await alice.as.query(api.uiUxArchitectures.get, { id }))!;
    expect(created.pages).toEqual([]);
    expect(created.theme_specification).toBeUndefined();
    expect(created.ux_patterns).toEqual(createDefaultUiUxArchitecture().ux_patterns);

    const page = { page_id: 'home', main: { route: '/', title: 'Home' }, advanced: {} };
    await alice.as.mutation(api.uiUxArchitectures.updateSections, { id, sections: { pages: [page] } });
    await alice.as.mutation(api.uiUxArchitectures.rename, { id, title: 'Renamed' });
    const updated = (await alice.as.query(api.uiUxArchitectures.get, { id }))!;
    expect(updated.pages).toEqual([page]);
    expect(updated.title).toBe('Renamed');

    await alice.as.mutation(api.uiUxArchitectures.remove, { id });
    expect(await alice.as.query(api.uiUxArchitectures.list, { workspaceId })).toEqual([]);
  });

  it('is built with a design system of the same workspace, cleared when that system is deleted', async () => {
    const { alice, signedInAs, workspaceId } = await setup();
    const bob = await signedInAs('bob@example.com');
    const bobWorkspace = await bob.as.mutation(api.workspaces.create, { name: 'Bob' });
    const bobSystem = await bob.as.mutation(api.designSystems.create, { workspaceId: bobWorkspace, title: 'Theirs' });
    const id = await alice.as.mutation(api.uiUxArchitectures.create, { workspaceId, title: 'UX' });
    const designSystemId = await alice.as.mutation(api.designSystems.create, { workspaceId, title: 'Ours' });

    await expect(alice.as.mutation(api.uiUxArchitectures.setDesignSystem, { id, designSystemId: bobSystem })).rejects.toThrow('Design system not found');
    await alice.as.mutation(api.uiUxArchitectures.setDesignSystem, { id, designSystemId });
    expect((await alice.as.query(api.uiUxArchitectures.get, { id }))?.designSystemId).toBe(designSystemId);

    await alice.as.mutation(api.designSystems.remove, { id: designSystemId });
    expect((await alice.as.query(api.uiUxArchitectures.get, { id }))?.designSystemId).toBeUndefined();
  });

  it('moves a previous-version theme and components into a new design system', async () => {
    const { alice, t, workspaceId } = await setup();
    const id = await t.run((ctx) =>
      ctx.db.insert('uiUxArchitectures', {
        workspaceId,
        title: 'Portal',
        updatedAt: 0,
        ...createDefaultUiUxArchitecture(),
        theme_specification: { main: { colors: { primary: '#f00' } }, advanced: {} },
        base_components: [{ component_id: 'comp_1', type: 'atom', main: { name: 'Button', category: 'Inputs', required_props: [] }, advanced: { props: {} } }],
      }),
    );
    const designSystemId = await alice.as.mutation(api.uiUxArchitectures.extractDesignSystem, { id });
    const architecture = (await alice.as.query(api.uiUxArchitectures.get, { id }))!;
    expect(architecture).toMatchObject({ designSystemId });
    expect(architecture.theme_specification).toBeUndefined();
    expect(architecture.base_components).toBeUndefined();
    const system = (await alice.as.query(api.designSystems.get, { id: designSystemId }))!;
    expect(system.title).toBe('Portal design system');
    expect(system.spec.colors).toMatchObject([{ name: 'primary', light: '#f00' }]);
    expect(system.spec.components).toMatchObject([{ id: 'comp_1', name: 'Button' }]);
    await expect(alice.as.mutation(api.uiUxArchitectures.extractDesignSystem, { id })).rejects.toThrow('no theme or components');
  });
});

describe('design system components from UI/UX', () => {
  it('adds a component to the design system, keeping its other edits; stays private', async () => {
    const { alice, signedInAs, workspaceId } = await setup();
    const bob = await signedInAs('bob@example.com');
    const id = await alice.as.mutation(api.designSystems.create, { workspaceId, title: 'DS' });
    await alice.as.mutation(api.designSystems.update, { id, spec: { description: 'Calm', components: [{ id: 'btn', name: 'Button' }] } });

    const componentId = await alice.as.mutation(api.designSystems.addComponent, {
      id,
      component: { name: ' Card ', category: 'Layout', variants: ['elevated', 'flat'] },
    });
    const { spec } = (await alice.as.query(api.designSystems.get, { id }))!;
    expect(spec.description).toBe('Calm');
    expect(spec.components.map((c) => c.name)).toEqual(['Button', 'Card']);
    expect(spec.components[1]).toMatchObject({ id: componentId, category: 'Layout', variants: ['elevated', 'flat'] });

    await expect(alice.as.mutation(api.designSystems.addComponent, { id, component: { name: ' ' } })).rejects.toThrow('Component name is required');
    await expect(bob.as.mutation(api.designSystems.addComponent, { id, component: { name: 'X' } })).rejects.toThrow('Design system not found');
  });
});
