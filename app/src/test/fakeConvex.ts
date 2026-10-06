/**
 * In-memory stand-in for `convex/react` used by smoke tests. Queries resolve
 * from fixture handlers keyed by function name ("pyramids:list"); mutations
 * and actions are recorded spies. A query without a handler throws, so a page that
 * starts using a new query fails loudly instead of spinning forever.
 */
import { vi, type Mock } from 'vitest';
import { getFunctionName } from 'convex/server';

type QueryHandler = (args: Record<string, unknown>) => unknown;
type Spy = Mock<(...args: unknown[]) => unknown>;

export const fake = {
  auth: { isLoading: false, isAuthenticated: true },
  queries: {} as Record<string, QueryHandler>,
  mutations: {} as Record<string, Spy>,
  actions: {} as Record<string, Spy>,
  signIn: vi.fn() as Spy,
  signOut: vi.fn() as Spy,
};

export function resetFake() {
  fake.auth = { isLoading: false, isAuthenticated: true };
  fake.queries = {};
  fake.mutations = {};
  fake.actions = {};
  fake.signIn = vi.fn().mockResolvedValue(undefined) as Spy;
  fake.signOut = vi.fn().mockResolvedValue(undefined) as Spy;
}

export function mutationSpy(name: string) {
  return (fake.mutations[name] ??= vi.fn().mockResolvedValue(`new-${name.replace(/\W/g, '-')}`) as Spy);
}

/** Actions resolve to undefined unless a test sets `fake.actions[name]`. */
export function actionSpy(name: string) {
  return (fake.actions[name] ??= vi.fn().mockResolvedValue(undefined) as Spy);
}

function runQuery(ref: unknown, args: unknown) {
  if (args === 'skip') return undefined;
  const name = getFunctionName(ref as never);
  const handler = fake.queries[name];
  if (!handler) throw new Error(`fakeConvex: no handler for query "${name}"`);
  return handler((args ?? {}) as Record<string, unknown>);
}

export const convexReactMock = {
  useQuery: (ref: unknown, args?: unknown) => runQuery(ref, args),
  useMutation: (ref: unknown) => {
    const spy = mutationSpy(getFunctionName(ref as never));
    const call = (args: unknown) => spy(args);
    return Object.assign(call, { withOptimisticUpdate: () => call });
  },
  useAction: (ref: unknown) => {
    const spy = actionSpy(getFunctionName(ref as never));
    return (args: unknown) => spy(args);
  },
  useConvex: () => ({ query: async (ref: unknown, args: unknown) => runQuery(ref, args) }),
  useConvexAuth: () => fake.auth,
};

export const convexAuthMock = {
  useAuthActions: () => ({ signIn: fake.signIn, signOut: fake.signOut }),
};
