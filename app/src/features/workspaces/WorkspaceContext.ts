import { createContext, useCallback, useContext } from 'react';
import type { Workspace } from '@/data/types';

const WorkspaceContext = createContext<Workspace | null>(null);

export const WorkspaceProvider = WorkspaceContext.Provider;

/** The workspace of the current /:workspaceId route. Only valid inside WorkspaceLayout. */
export function useWorkspace(): Workspace {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error('useWorkspace must be used inside a workspace route');
  return workspace;
}

/** Builds paths inside the current workspace: wp('/pyramids') → '/<id>/pyramids'. */
export function useWorkspacePath() {
  const { _id } = useWorkspace();
  return useCallback((path: string) => `/${_id}${path.startsWith('/') ? path : `/${path}`}`, [_id]);
}
