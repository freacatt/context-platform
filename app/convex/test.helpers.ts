/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import schema from './schema';
import type { Id } from './_generated/dataModel';
import { createDefaultTaskData } from '../shared/technicalTask';

const modules = import.meta.glob('./**/!(*.*.*)*.*s');

export function setupBackend() {
  const t = convexTest(schema, modules);

  /** Creates a user and returns a client authenticated as that user. */
  async function signedInAs(email: string) {
    const userId = await t.run((ctx) => ctx.db.insert('users', { email }));
    // Convex Auth identifies users by "<userId>|<sessionId>" in the token subject.
    return { userId, as: t.withIdentity({ subject: `${userId}|test-session` }) };
  }

  /** A task of the retired Technical Tasks app (only data from before it was retired has these). */
  async function insertLegacyTask(workspaceId: Id<'workspaces'>, title: string, technicalArchitectureId?: Id<'technicalArchitectures'>) {
    return t.run(async (ctx) => {
      const pipelineId = await ctx.db.insert('pipelines', { workspaceId, title: 'Backlog', order: 0 });
      return ctx.db.insert('technicalTasks', {
        workspaceId,
        title,
        updatedAt: Date.now(),
        pipelineId,
        type: 'NEW_TASK',
        order: 0,
        technicalArchitectureId,
        data: createDefaultTaskData({ title, type: 'NEW_TASK', architectureRef: technicalArchitectureId ?? '', now: new Date(0) }),
      });
    });
  }

  return { t, signedInAs, insertLegacyTask };
}

export type TestUser = Awaited<ReturnType<ReturnType<typeof setupBackend>['signedInAs']>>;
export type WorkspaceId = Id<'workspaces'>;
