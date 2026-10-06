/**
 * Smoke tests: every route renders through the real router, layouts and
 * feature components against an in-memory Convex fake, and the main flows
 * call the right backend functions.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '@/App';
import { WORKSPACE_APPS } from '@/features/workspaces/apps';
import { actionSpy, fake, mutationSpy, resetFake } from '../fakeConvex';
import { installFixtures } from '../fixtures';

vi.mock('convex/react', async () => (await import('../fakeConvex')).convexReactMock);
vi.mock('@convex-dev/auth/react', async () => (await import('../fakeConvex')).convexAuthMock);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  resetFake();
  installFixtures();
});

describe('authentication', () => {
  it('sends signed-out users to the login page', async () => {
    fake.auth = { isLoading: false, isAuthenticated: false };
    renderAt('/ws1/pyramids');
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });

  it('signs up with email and password', async () => {
    fake.auth = { isLoading: false, isAuthenticated: false };
    const user = userEvent.setup();
    renderAt('/login');

    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(fake.signIn).toHaveBeenCalledTimes(1);
    const [provider, form] = fake.signIn.mock.calls[0] as [string, FormData];
    expect(provider).toBe('password');
    expect(Object.fromEntries(form)).toEqual({ email: 'ada@example.com', password: 'correct-horse', flow: 'signUp' });
  });

  it('shows a readable error when login fails', async () => {
    fake.auth = { isLoading: false, isAuthenticated: false };
    fake.signIn.mockRejectedValue(new Error('InvalidSecret'));
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  it('sends signed-in users away from the login page', async () => {
    renderAt('/login');
    expect(await screen.findByRole('heading', { name: 'Workspaces' })).toBeInTheDocument();
  });
});

describe('workspaces', () => {
  it('lists workspaces and creates one, then opens it', async () => {
    const user = userEvent.setup();
    renderAt('/workspaces');
    expect(screen.getAllByTestId('collection-item')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'New Workspace' }));
    await user.type(screen.getByLabelText('Title'), 'Launch');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(mutationSpy('workspaces:create')).toHaveBeenCalledWith({ name: 'Launch' });
  });

  it('filters by search', async () => {
    const user = userEvent.setup();
    renderAt('/workspaces');
    await user.type(screen.getByLabelText('Search workspaces'), 'side');
    expect(screen.getAllByTestId('collection-item')).toHaveLength(1);
    expect(screen.getByText('Side Project')).toBeInTheDocument();
  });

  it('only deletes after the name is typed', async () => {
    const user = userEvent.setup();
    renderAt('/workspaces');
    await user.click(screen.getByRole('button', { name: 'Actions for Acme' }));
    await user.click(await screen.findByRole('menuitem', { name: /Delete/ }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Delete' });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/to confirm/), 'Acme');
    await user.click(confirm);
    expect(mutationSpy('workspaces:remove')).toHaveBeenCalledWith({ id: 'ws1' });
  });

  it('redirects unknown workspaces to the list', async () => {
    renderAt('/nope/dashboard');
    expect(await screen.findByRole('heading', { name: 'Workspaces' })).toBeInTheDocument();
  });

  it('shows every app on the dashboard', async () => {
    renderAt('/ws1');
    expect(await screen.findByRole('heading', { name: 'Acme' })).toBeInTheDocument();
    for (const app of WORKSPACE_APPS.map((a) => a.title)) {
      expect(screen.getAllByText(app).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText('Technical Tasks')).not.toBeInTheDocument();
  });
});

describe('workspace apps render', () => {
  it.each(WORKSPACE_APPS.map((app) => [app.path, app.title]))('%s uses the shared page header "%s"', async (path, title) => {
    renderAt(`/ws1${path}`);
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it.each([
    ['/ws1/pyramids', 'Pyramid Solver', 'Churn Analysis'],
    ['/ws1/diagrams', 'Diagrams', 'Signup Flow'],
    ['/ws1/product-definitions', 'Product Definition', 'Mobile Redesign'],
    ['/ws1/technical-architectures', 'Technical Architecture', 'Platform Backend'],
    ['/ws1/ui-ux-architectures', 'UI/UX Architecture', 'Customer Portal'],
  ])('%s lists its documents', async (path, heading, item) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByText(item)).toBeInTheDocument();
  });

  it('pyramid editor shows the board and approves a checkpoint with an edited next question', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/pyramid/p1');
    expect(await screen.findByRole('heading', { name: 'Churn Analysis' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Block [A-H]\d / })).toHaveLength(4);
    expect(screen.getByText('Checkpoint · Row 1')).toBeInTheDocument();

    const next = screen.getByLabelText('Next question', { selector: '#next-B1' });
    await user.clear(next);
    await user.type(next, 'Which plans churn most?');
    await user.click(screen.getByRole('button', { name: 'Approve with 1 edit' }));
    expect(mutationSpy('pyramids:approveRow')).toHaveBeenCalledWith({ id: 'p1', row: 1, edits: { B1: 'Which plans churn most?' } });
  });

  it('a block opens its record from the board', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/pyramid/p1');
    await user.click(await screen.findByRole('button', { name: 'Block A2 (edge)' }));
    expect(await screen.findByRole('heading', { name: /Block A2/ })).toBeInTheDocument();
    expect(screen.getAllByText('Conclusion A2').length).toBeGreaterThan(0);
  });

  it('run details open to the models and cost of the run', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/pyramid/p1');
    await user.click(await screen.findByRole('button', { name: /Run details/ }));
    expect(await screen.findByText('Blind round: 1 call · $0.0010')).toBeInTheDocument();
    expect(screen.getAllByText('c/host').length).toBeGreaterThan(0);
    expect(screen.getByText('42s')).toBeInTheDocument();
  });

  it('a block shows the panel discussion behind its conclusion', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/pyramid/p1');
    await user.click(await screen.findByRole('button', { name: 'Block A2 (edge)' }));
    await user.click(await screen.findByRole('tab', { name: 'Discussion' }));
    expect(await screen.findByText('Skeptic says A2')).toBeInTheDocument();
    expect(screen.getByText('Host concludes A2')).toBeInTheDocument();
    expect(screen.getByText('Blind round')).toBeInTheDocument();
  });

  it('a draft pyramid shows its setup and estimates the cost', async () => {
    const user = userEvent.setup();
    actionSpy('pyramids:estimate').mockResolvedValue({ low: '0.01', expected: '0.02', high: '0.04', calls: {}, perModel: {} });
    renderAt('/ws1/pyramid/p2');
    expect(await screen.findByLabelText('Root question')).toHaveValue('How should we price the Pro plan?');
    expect(screen.getByText('Connect OpenRouter first')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Estimate cost' }));
    expect(actionSpy('pyramids:estimate')).toHaveBeenCalledWith({ id: 'p2' });
  });

  it('a draft pyramid takes context from any app, packs and uploaded Markdown', async () => {
    const user = userEvent.setup();
    mutationSpy('pyramidFiles:add').mockResolvedValue('file1');
    renderAt('/ws1/pyramid/p2');
    const sources = await screen.findByTestId('context-sources');

    await user.click(within(sources).getByRole('button', { name: /Add from workspace/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('option', { name: 'Signup Flow' }));
    await user.click(within(dialog).getByRole('option', { name: 'Platform Backend' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add 2 items' }));
    expect(within(sources).getByText('Signup Flow')).toBeInTheDocument();

    await user.upload(screen.getByTestId('context-upload'), new File(['# Notes'], 'notes.md', { type: 'text/markdown' }));
    await waitFor(() => expect(mutationSpy('pyramidFiles:add')).toHaveBeenCalledWith({ pyramidId: 'p2', title: 'notes.md', content: '# Notes' }));

    await user.click(within(sources).getByRole('radio', { name: 'Context links: 1 hop' }));
    await waitFor(
      () =>
        expect(mutationSpy('pyramids:updateConfig')).toHaveBeenLastCalledWith({
          id: 'p2',
          config: expect.objectContaining({
            contextDocumentIds: [],
            contextLinkDepth: 1,
            contextRefs: [
              { kind: 'item', app: 'diagrams', id: 'dg1' },
              { kind: 'item', app: 'technicalArchitectures', id: 'ta1' },
              { kind: 'file', id: 'file1' },
            ],
          }),
        }),
      { timeout: 3000 },
    );
  });

  it('product definition editor edits vision, personas and features, and autosaves the spec', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/product-definition/pd1');
    expect(await screen.findByLabelText('Title')).toHaveValue('Mobile Redesign');
    expect(screen.getByLabelText('Vision')).toHaveValue('A workbench for structured thinking');
    await user.type(screen.getByLabelText('Vision'), '!');

    await user.click(screen.getByRole('tab', { name: 'Users' }));
    expect(screen.getByLabelText('Persona name')).toHaveValue('Team lead');
    await user.click(screen.getByRole('button', { name: 'Add persona' }));
    expect(screen.getAllByTestId('entry-persona')).toHaveLength(2);

    await user.click(screen.getByRole('tab', { name: 'Features' }));
    expect(screen.getByLabelText('Feature name')).toHaveValue('Offline mode');
    expect(screen.getByRole('checkbox', { name: 'Team lead' })).toBeChecked();

    await waitFor(
      () => {
        const calls = mutationSpy('productDefinitions:update').mock.calls as [{ id: string; spec: { vision: string; personas: unknown[] } }][];
        expect(calls.at(-1)?.[0]).toMatchObject({ id: 'pd1', spec: { vision: 'A workbench for structured thinking!' } });
        expect(calls.at(-1)?.[0].spec.personas).toHaveLength(2);
      },
      { timeout: 3000 },
    );
  });

  it('technical plan editor tracks steps, and links inputs', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/technical-plan/tp1');
    expect(await screen.findByLabelText('Goal')).toHaveValue('One-click checkout');
    expect(screen.getByText('· 1/2 steps done')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Approach & phases' }));
    await user.click(screen.getByRole('checkbox', { name: 'Step 2 done' }));
    expect(screen.getByText('· 2/2 steps done')).toBeInTheDocument();
    await waitFor(
      () => {
        const calls = mutationSpy('technicalPlans:update').mock.calls as [{ spec: { phases: { steps: { done: boolean }[] }[] } }][];
        expect(calls.at(-1)?.[0].spec.phases[0].steps.map((st) => st.done)).toEqual([true, true]);
      },
      { timeout: 3000 },
    );

    await user.click(screen.getByRole('tab', { name: 'Inputs' }));
    expect(screen.getByRole('link', { name: 'Mobile Redesign' })).toHaveAttribute('href', '/ws1/product-definition/pd1');
    await user.click(screen.getByRole('button', { name: 'Add input' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('option', { name: 'Platform Backend' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add 1 item' }));
    await waitFor(() =>
      expect(mutationSpy('links:create')).toHaveBeenCalledWith({
        workspaceId: 'ws1',
        from: { app: 'technicalPlans', id: 'tp1' },
        to: { app: 'technicalArchitectures', id: 'ta1' },
        kind: 'depends-on',
      }),
    );
  });

  it('technical plans list offers to convert legacy tasks', async () => {
    const user = userEvent.setup();
    fake.queries['technicalPlans:legacyTaskCount'] = () => 3;
    mutationSpy('technicalPlans:convertLegacyTasks').mockResolvedValue({ converted: 3 });
    renderAt('/ws1/technical-plans');
    expect(await screen.findByText('3 tasks from Technical Tasks')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Convert to plans' }));
    expect(mutationSpy('technicalPlans:convertLegacyTasks')).toHaveBeenCalledWith({ workspaceId: 'ws1' });
  });

  it('design system editor shows tokens and components, and exports design tokens', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:x');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    renderAt('/ws1/design-system/ds1');
    expect(await screen.findByLabelText('Title')).toHaveValue('Acme UI');
    await user.click(screen.getByRole('tab', { name: 'Colors' }));
    expect(screen.getByLabelText('primary light')).toHaveValue('#2563eb');
    await user.click(screen.getByRole('button', { name: 'Add color' }));
    await user.click(screen.getByRole('tab', { name: 'Components' }));
    await user.click(screen.getByRole('button', { name: 'Add component' }));
    expect(screen.getAllByTestId('entry-component')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /^Export$/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Design tokens (.json)' }));
    const blob = (createObjectURL.mock.calls as unknown as [Blob][])[0][0];
    expect(blob.type).toBe('application/json');
  });

  it.each([
    ['/ws1/decision/dc1', 'Use Convex', 'Decision', 'Convex is the only backend'],
    ['/ws1/research-study/rs1', 'Onboarding interviews', 'Insight', 'Setup is too slow'],
  ])('%s editor loads its content', async (path, title, field, value) => {
    renderAt(path);
    expect(await screen.findByLabelText('Title')).toHaveValue(title);
    expect(screen.getByLabelText(field)).toHaveValue(value);
  });

  it('glossary editor filters terms', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/glossary/gl1');
    expect(await screen.findAllByTestId('glossary-term')).toHaveLength(2);
    await user.type(screen.getByLabelText('Search terms'), 'pyr');
    expect(screen.getAllByTestId('glossary-term')).toHaveLength(1);
  });

  it('roadmap editor shows initiatives by horizon and adds one', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/roadmap/rm1');
    const now = await screen.findByRole('region', { name: 'Now' });
    expect(within(now).getAllByTestId('initiative')).toHaveLength(1);
    expect(within(screen.getByRole('region', { name: 'Later' })).getAllByTestId('initiative')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Add initiative to Next' }));
    expect(within(screen.getByRole('region', { name: 'Next' })).getAllByTestId('initiative')).toHaveLength(1);
  });

  it('knowledge graph shows every item, details on click, and opens an item', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/knowledge-graph');
    expect(await screen.findByRole('heading', { level: 1, name: 'Knowledge graph' })).toBeInTheDocument();
    expect(await screen.findByText('Checkout v2')).toBeInTheDocument();
    expect(screen.getAllByTestId('graph-node')).toHaveLength(3);
    expect(screen.getByText('3 items · 1 connection · drag to rearrange, hover to focus, double-click to open')).toBeInTheDocument();

    // A plain click: user-event's mousedown has no `view` in jsdom, which React Flow's drag handler reads.
    fireEvent.click(screen.getByText('Mobile Redesign'));
    const details = await screen.findByTestId('graph-details');
    expect(within(details).getByText('Product Definitions · 1 connection')).toBeInTheDocument();
    expect(within(details).getByText('Checkout v2')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Show unlinked items' }));
    expect(screen.getAllByTestId('graph-node')).toHaveLength(2);

    await user.click(within(details).getByRole('button', { name: /Open/ }));
    expect(await screen.findByLabelText('Title')).toHaveValue('Mobile Redesign');
  });

  it('old Technical Tasks links open Technical Plans', async () => {
    renderAt('/ws1/technical-tasks');
    expect(await screen.findByRole('heading', { level: 1, name: 'Technical Plans' })).toBeInTheDocument();
  });

  it('context documents page shows directories and documents, and creates a document', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/context-documents');
    const directories = await screen.findByRole('navigation', { name: 'Directories' });
    expect(within(directories).getByRole('button', { name: 'Research' })).toBeInTheDocument();
    expect(screen.getAllByTestId('collection-item')).toHaveLength(2);
    expect(screen.getByText('Competitors lowered prices')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New Document' }));
    await user.type(screen.getByLabelText('Title'), 'Interview notes');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(mutationSpy('contextDocuments:create')).toHaveBeenCalledWith({ workspaceId: 'ws1', title: 'Interview notes' });
  });

  it('directory page lists only its documents', async () => {
    renderAt('/ws1/directory/dir1');
    expect(await screen.findByRole('heading', { name: 'Research' })).toBeInTheDocument();
    expect(screen.getAllByTestId('collection-item')).toHaveLength(1);
  });

  it('document editor loads the document', async () => {
    renderAt('/ws1/context-document/doc1');
    expect(await screen.findByLabelText('Document title')).toHaveValue('Market Notes');
  });

  it('diagram editor loads its blocks', async () => {
    renderAt('/ws1/diagram/dg1');
    expect(await screen.findByRole('heading', { name: 'Signup Flow' })).toBeInTheDocument();
    expect(await screen.findByText('Landing')).toBeInTheDocument();
  });

  it('technical architecture editor navigates sections, edits components and exports AGENTS.md', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:x');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    renderAt('/ws1/technical-architecture/ta1');
    expect(await screen.findByLabelText('Title')).toHaveValue('Platform Backend');
    expect(screen.getByLabelText('Summary')).toHaveValue('A browser app talks to one API; the API owns the database; slow work runs in a worker.');
    expect(screen.queryByText('Start from a template')).not.toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Sections' });
    await user.click(within(nav).getByRole('button', { name: /Components/ }));
    expect(screen.getByTestId('architecture-diagram')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'List view' }));
    expect(screen.getAllByTestId('entry-component')).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: 'Add component' }));
    expect(screen.getAllByTestId('entry-component')).toHaveLength(7);

    await user.click(within(nav).getByRole('button', { name: /Rules for changes/ }));
    expect(screen.getByLabelText('Never')).toHaveValue('Query the database from the web app\nCommit secrets');
    await waitFor(
      () => {
        const calls = mutationSpy('technicalArchitectures:update').mock.calls as [{ spec: { components: unknown[] } }][];
        expect(calls.at(-1)?.[0].spec.components).toHaveLength(7);
      },
      { timeout: 3000 },
    );

    await user.click(screen.getByRole('button', { name: /^Export$/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'AGENTS.md (for coding agents)' }));
    expect((createObjectURL.mock.calls as unknown as [Blob][])[0][0].type).toBe('text/markdown');
  });

  it('a blank technical architecture offers templates', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/technical-architecture/ta2');
    expect(await screen.findByText('Start from a template')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Event-driven services/ }));
    expect(screen.queryByText('Start from a template')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Summary')).toHaveValue('Independent services own their data and publish domain events; others react asynchronously.');
  });

  it('UI/UX architecture editor renders its canvas and picks a design system', async () => {
    renderAt('/ws1/ui-ux-architecture/ux1');
    expect(await screen.findByRole('heading', { name: 'Customer Portal' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Design system' })).toHaveTextContent('No design system');
    expect(screen.getByRole('button', { name: /New Component/ })).toBeDisabled();
  });

  it('UI/UX architecture editor creates a component in its design system', async () => {
    const user = userEvent.setup();
    mutationSpy('designSystems:addComponent').mockResolvedValue('c1');
    const original = fake.queries['uiUxArchitectures:get'];
    fake.queries['uiUxArchitectures:get'] = (args) => ({ ...(original(args) as object), designSystemId: 'ds1' });
    renderAt('/ws1/ui-ux-architecture/ux1');
    expect(await screen.findByRole('combobox', { name: 'Design system' })).toHaveTextContent('Acme UI');

    await user.click(screen.getByRole('button', { name: /New Component/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Component name'), 'Product card');
    await user.type(within(dialog).getByLabelText('Variants'), 'compact{enter}wide');
    await user.click(within(dialog).getByRole('button', { name: 'Create component' }));
    expect(mutationSpy('designSystems:addComponent')).toHaveBeenCalledWith({
      id: 'ds1',
      component: { name: 'Product card', category: '', purpose: '', variants: ['compact', 'wide'], states: [] },
    });
  });

  it.each([
    ['/ws1/pyramid/missing', 'Pyramid not found'],
    ['/ws1/diagram/missing', 'Diagram not found'],
    ['/ws1/technical-plan/missing', 'Technical plan not found'],
    ['/ws1/design-system/missing', 'Design system not found'],
  ])('%s shows a not-found state', async (path, message) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { name: message })).toBeInTheDocument();
  });
});

describe('OpenRouter in the header', () => {
  it('asks to connect without a key', async () => {
    renderAt('/ws1/dashboard');
    expect(await screen.findByRole('link', { name: /Connect OpenRouter/ })).toHaveAttribute('href', '/ws1/settings');
  });

  it('shows what is left on the key and the usage details', async () => {
    const user = userEvent.setup();
    fake.queries['aiSettings:get'] = () => ({ keySource: 'user', keyHint: 'sk-or-…abcd', defaultModel: null, defaultPanel: null, defaultHost: null });
    actionSpy('ai:accountStatus').mockResolvedValue({
      source: 'user',
      label: 'my key',
      isFreeTier: false,
      usage: { total: '3.5', daily: '0.25', weekly: '1', monthly: '3' },
      limit: '10',
      limitRemaining: '6.5',
      limitReset: 'monthly',
      credits: null,
    });
    renderAt('/ws1/dashboard');
    const pill = await screen.findByRole('button', { name: 'OpenRouter usage' });
    expect(await within(pill).findByText('$6.50')).toBeInTheDocument();
    await user.click(pill);
    expect(await screen.findByText('$3.50 of $10.00 used')).toBeInTheDocument();
    expect(screen.getByText('resets monthly')).toBeInTheDocument();
    expect(screen.getByText('$0.25')).toBeInTheDocument();
  });
});

describe('settings', () => {
  it('opens from the sidebar and saves an OpenRouter key', async () => {
    const user = userEvent.setup();
    actionSpy('ai:listModels').mockResolvedValue([]);
    renderAt('/ws1/dashboard');
    await user.click(await screen.findByRole('link', { name: /^Settings/ }));
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('OpenRouter API key'), 'sk-or-v1-abc');
    await user.click(screen.getByRole('button', { name: 'Save key' }));
    expect(mutationSpy('aiSettings:setApiKey')).toHaveBeenCalledWith({ apiKey: 'sk-or-v1-abc' });
  });
});

describe('sidebar', () => {
  it('lists each app with its documents as sub-items', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/dashboard');
    await user.click(await screen.findByRole('button', { name: 'Toggle Pyramid Solver' }));
    expect(await screen.findByRole('link', { name: 'Churn Analysis' })).toHaveAttribute('href', '/ws1/pyramid/p1');
    expect(screen.getByRole('link', { name: 'Back to Workspaces' })).toHaveAttribute('href', '/workspaces');
  });
});

describe('knowledge export', () => {
  it('renames the header backup button to Export workspace', async () => {
    renderAt('/ws1/dashboard');
    expect(await screen.findByRole('button', { name: 'Export workspace' })).toBeInTheDocument();
  });

  it('opens from the sidebar above Settings and downloads a zip of the selection', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:x');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    renderAt('/ws1/dashboard');

    const exportLink = await screen.findByRole('link', { name: /^Export knowledge/ });
    const settingsLink = screen.getByRole('link', { name: /^Settings/ });
    expect(exportLink.compareDocumentPosition(settingsLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(exportLink);

    expect(await screen.findByRole('heading', { level: 1, name: 'Export knowledge' })).toBeInTheDocument();
    const download = screen.getByRole('button', { name: /Download/ });
    expect(download).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: 'Select all Diagrams' }));
    await user.click(screen.getByRole('checkbox', { name: 'Platform Backend' }));
    const summary = screen.getByTestId('knowledge-summary');
    expect(within(summary).getAllByText('2')).not.toHaveLength(0);

    await user.click(download);
    const blob = (createObjectURL.mock.calls as unknown as [Blob][])[0][0];
    expect(blob.type).toBe('application/zip');
  });

  it('saves the selection as a context pack and loads a pack', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/export-knowledge');
    await user.click(await screen.findByRole('checkbox', { name: 'Market Notes' }));
    await user.click(screen.getByRole('radio', { name: 'Links: All' }));
    await user.click(screen.getByRole('button', { name: /Save as pack/ }));
    await user.type(screen.getByLabelText('Name'), 'Research');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mutationSpy('contextPacks:create')).toHaveBeenCalledWith({
      workspaceId: 'ws1',
      title: 'Research',
      refs: [{ app: 'contextDocuments', id: 'doc1' }],
      linkDepth: -1,
    });

    await user.click(screen.getByRole('combobox', { name: 'Load a context pack' }));
    await user.click(await screen.findByRole('option', { name: 'Signup context' }));
    expect(screen.getByRole('checkbox', { name: 'Signup Flow' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Market Notes' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Links: 1 hop' })).toBeChecked();
    expect(screen.getByRole('button', { name: /Update “Signup context”/ })).toBeInTheDocument();
  });
});

describe('links panel', () => {
  it('shows an item’s links and adds one', async () => {
    const user = userEvent.setup();
    renderAt('/ws1/diagram/dg1');
    await user.click(await screen.findByRole('button', { name: 'Links' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('link', { name: 'Mobile Redesign' })).toHaveAttribute('href', '/ws1/product-definition/pd1');

    await user.click(within(dialog).getByRole('option', { name: 'Market Notes' }));
    expect(mutationSpy('links:create')).toHaveBeenCalledWith({
      workspaceId: 'ws1',
      from: { app: 'diagrams', id: 'dg1' },
      to: { app: 'contextDocuments', id: 'doc1' },
      kind: 'references',
    });

    await user.click(within(dialog).getByRole('button', { name: 'Remove link to Mobile Redesign' }));
    expect(mutationSpy('links:remove')).toHaveBeenCalledWith({ id: 'l1' });
  });
});
