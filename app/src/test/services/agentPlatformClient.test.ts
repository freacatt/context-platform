import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firebase auth before importing the module
vi.mock('../../services/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-firebase-token'),
    },
  },
}));

import {
  setupWorkspace,
  getWorkspace,
  getAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  chat,
  getApps,
  AgentPlatformError,
} from '../../services/agentPlatformClient';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const AGENT_SERVER_URL = 'http://localhost:8000';

function mockFetchOk(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status,
    json: () => Promise.resolve(body),
  });
}

function mockFetch204() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 204,
    json: () => Promise.resolve(undefined),
  });
}

function mockFetchError(status: number, error: { code: string; message: string }) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  });
}

const SAMPLE_AGENT_API = {
  id: 'agent-1',
  workspace_id: 'ws-1',
  user_id: 'uid-1',
  name: 'Test Agent',
  type: 'gm',
  model_mode: 'auto',
  model_provider: null,
  model_name: null,
  skills: [],
  context: 'Test context',
  is_default: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-02',
};

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('agentPlatformClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ---- setupWorkspace --------------------------------------------------

  describe('setupWorkspace', () => {
    it('sends POST with workspace_id and name', async () => {
      const body = { workspace_id: 'ws-1', gm_agent_id: 'agent-1' };
      global.fetch = mockFetchOk(body);

      const result = await setupWorkspace('ws-1', 'My Workspace');

      expect(result).toEqual(body);
      expect(global.fetch).toHaveBeenCalledOnce();

      const [url, opts] = (global.fetch as any).mock.calls[0];
      expect(url).toBe(`${AGENT_SERVER_URL}/workspaces/setup`);
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body)).toEqual({ workspace_id: 'ws-1', name: 'My Workspace' });
    });
  });

  // ---- getWorkspace ----------------------------------------------------

  describe('getWorkspace', () => {
    it('fetches workspace by id', async () => {
      const body = {
        id: 'ws-1',
        name: 'WS',
        gm_agent_id: 'a1',
        ai_recommendation_agent_id: null,
        ai_chat_agent_id: null,
      };
      global.fetch = mockFetchOk(body);

      const result = await getWorkspace('ws-1');

      expect(result).toEqual(body);
      const [url] = (global.fetch as any).mock.calls[0];
      expect(url).toBe(`${AGENT_SERVER_URL}/workspaces/ws-1`);
    });
  });

  // ---- getAgents -------------------------------------------------------

  describe('getAgents', () => {
    it('returns mapped agent configs', async () => {
      global.fetch = mockFetchOk([SAMPLE_AGENT_API]);

      const agents = await getAgents('ws-1');

      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('agent-1');
      expect(agents[0].workspaceId).toBe('ws-1');
      expect(agents[0].modelMode).toBe('auto');
      expect(agents[0].isDefault).toBe(true);
    });
  });

  // ---- getAgent --------------------------------------------------------

  describe('getAgent', () => {
    it('returns single mapped agent', async () => {
      global.fetch = mockFetchOk(SAMPLE_AGENT_API);

      const agent = await getAgent('agent-1');

      expect(agent.name).toBe('Test Agent');
      expect(agent.type).toBe('gm');
    });
  });

  // ---- createAgent -----------------------------------------------------

  describe('createAgent', () => {
    it('sends POST and returns mapped agent', async () => {
      const created = { ...SAMPLE_AGENT_API, id: 'agent-2', name: 'New Agent', is_default: false, type: 'custom' };
      global.fetch = mockFetchOk(created);

      const agent = await createAgent({
        workspace_id: 'ws-1',
        name: 'New Agent',
        model_mode: 'auto',
        context: '',
      });

      expect(agent.id).toBe('agent-2');
      expect(agent.name).toBe('New Agent');
      expect(agent.isDefault).toBe(false);

      const [, opts] = (global.fetch as any).mock.calls[0];
      expect(opts.method).toBe('POST');
    });
  });

  // ---- updateAgent -----------------------------------------------------

  describe('updateAgent', () => {
    it('sends PUT and returns updated agent', async () => {
      const updated = { ...SAMPLE_AGENT_API, name: 'Updated' };
      global.fetch = mockFetchOk(updated);

      const agent = await updateAgent('agent-1', { name: 'Updated' });

      expect(agent.name).toBe('Updated');
      const [url, opts] = (global.fetch as any).mock.calls[0];
      expect(url).toBe(`${AGENT_SERVER_URL}/agents/agent-1`);
      expect(opts.method).toBe('PUT');
    });
  });

  // ---- deleteAgent -----------------------------------------------------

  describe('deleteAgent', () => {
    it('sends DELETE request', async () => {
      global.fetch = mockFetch204();

      await deleteAgent('agent-1');

      const [url, opts] = (global.fetch as any).mock.calls[0];
      expect(url).toBe(`${AGENT_SERVER_URL}/agents/agent-1`);
      expect(opts.method).toBe('DELETE');
    });
  });

  // ---- chat ------------------------------------------------------------

  describe('chat', () => {
    it('sends chat request and returns response', async () => {
      const body = { response: 'Hello!', agent_id: 'agent-1', model: 'claude-3-5-sonnet' };
      global.fetch = mockFetchOk(body);

      const result = await chat('ws-1', 'agent-1', 'Hi');

      expect(result.response).toBe('Hello!');
      expect(result.agent_id).toBe('agent-1');

      const [, opts] = (global.fetch as any).mock.calls[0];
      const parsed = JSON.parse(opts.body);
      expect(parsed.workspace_id).toBe('ws-1');
      expect(parsed.agent_id).toBe('agent-1');
      expect(parsed.message).toBe('Hi');
    });

    it('sends history and context when provided', async () => {
      const body = { response: 'Context reply', agent_id: 'a1', model: 'gpt-4o' };
      global.fetch = mockFetchOk(body);

      await chat(
        'ws-1',
        'a1',
        'Question',
        [{ role: 'user', content: 'Prev' }],
        'Some context'
      );

      const [, opts] = (global.fetch as any).mock.calls[0];
      const parsed = JSON.parse(opts.body);
      expect(parsed.history).toEqual([{ role: 'user', content: 'Prev' }]);
      expect(parsed.context).toBe('Some context');
    });
  });

  // ---- getApps ---------------------------------------------------------

  describe('getApps', () => {
    it('returns apps list', async () => {
      const apps = [{ id: 'pyramid', label: 'Pyramid Solver' }];
      global.fetch = mockFetchOk(apps);

      const result = await getApps();
      expect(result).toEqual(apps);
    });
  });

  // ---- Error handling --------------------------------------------------

  describe('error handling', () => {
    it('throws AgentPlatformError on error response', async () => {
      global.fetch = mockFetchError(403, {
        code: 'FORBIDDEN',
        message: 'Access denied',
      });

      await expect(getAgents('ws-1')).rejects.toThrow(AgentPlatformError);

      try {
        await getAgents('ws-1');
      } catch (err) {
        expect(err).toBeInstanceOf(AgentPlatformError);
        expect((err as AgentPlatformError).code).toBe('FORBIDDEN');
        expect((err as AgentPlatformError).statusCode).toBe(403);
      }
    });

    it('includes auth token in all requests', async () => {
      global.fetch = mockFetchOk([]);

      await getAgents('ws-1');

      const [, opts] = (global.fetch as any).mock.calls[0];
      const headers = opts.headers;
      expect(headers.get('Authorization')).toBe('Bearer mock-firebase-token');
    });
  });
});
