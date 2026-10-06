import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

/** The signed-in user's display info (undefined while loading). */
export function useViewer() {
  const viewer = useQuery(api.users.viewer);
  if (viewer === undefined) return undefined;
  return {
    name: viewer?.name ?? viewer?.email?.split('@')[0] ?? 'User',
    email: viewer?.email ?? '',
  };
}
