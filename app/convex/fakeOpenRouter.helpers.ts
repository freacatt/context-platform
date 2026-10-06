/**
 * A fake OpenRouter for backend tests: install it with `vi.stubGlobal('fetch', fake.fetch)`.
 * Chat completions are answered by the shared fake model (valid JSON per row); the catalog
 * and key endpoints return fixed data. Requests are recorded for assertions.
 */
import type { ModelInfo } from '../shared/ai';
import { createFakeModel, type FakeModelOptions } from '../shared/pyramid/fakeModel';

export const FAKE_MODELS: ModelInfo[] = [
  { id: 'a/one', name: 'One', contextLength: 128000, promptPrice: '0.00001', completionPrice: '0.00002' },
  { id: 'b/two', name: 'Two', contextLength: 128000, promptPrice: '0.00001', completionPrice: '0.00002' },
  { id: 'c/host', name: 'Host', contextLength: 128000, promptPrice: '0.00001', completionPrice: '0.00002' },
];

export interface RecordedRequest {
  path: string;
  authorization: string | null;
  body: { model?: string; messages?: { role: string; content: string }[] } | null;
}

/** `credits: true` answers /credits like a management key would; otherwise it is forbidden. */
export function createFakeOpenRouter(options: FakeModelOptions & { credits?: boolean } = {}) {
  const model = createFakeModel(options);
  const requests: RecordedRequest[] = [];
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const path = url.pathname.replace('/api/v1', '');
    const headers = new Headers(init?.headers);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    requests.push({ path, authorization: headers.get('Authorization'), body });

    if (path === '/models') {
      return json(200, {
        data: FAKE_MODELS.map((m) => ({
          id: m.id,
          name: m.name,
          context_length: m.contextLength,
          pricing: { prompt: m.promptPrice, completion: m.completionPrice },
        })),
      });
    }
    if (path === '/key') {
      return json(200, {
        data: {
          label: 'test key',
          usage: 0.5,
          usage_daily: 0.1,
          usage_weekly: 0.25,
          usage_monthly: 0.4,
          limit: 10,
          limit_remaining: 9.5,
          limit_reset: 'monthly',
          is_free_tier: false,
        },
      });
    }
    if (path === '/credits') {
      return options.credits
        ? json(200, { data: { total_credits: 20, total_usage: 7.25 } })
        : json(403, { error: { message: 'Only management keys can perform this operation' } });
    }
    if (path === '/chat/completions') {
      try {
        const out = await model.complete({ model: body.model, messages: body.messages });
        return json(200, {
          model: body.model,
          choices: [{ message: { role: 'assistant', content: out.text } }],
          usage: { prompt_tokens: out.promptTokens, completion_tokens: out.completionTokens, cost: Number(out.cost) },
        });
      } catch (error) {
        return json(503, { error: { message: error instanceof Error ? error.message : 'failed' } });
      }
    }
    return json(404, { error: { message: `no route ${path}` } });
  };

  return { fetch, requests, calls: model.calls, chats: () => requests.filter((r) => r.path === '/chat/completions') };
}
