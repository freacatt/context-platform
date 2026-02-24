import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Returns a function that constructs workspace-scoped paths.
 * Uses workspaceId from the URL params (always available under /:workspaceId/*).
 *
 * Usage:
 *   const wp = useWorkspacePath();
 *   navigate(wp('/pyramids'));          // -> "/<workspaceId>/pyramids"
 *   <Link to={wp(`/pyramid/${id}`)} /> // -> "/<workspaceId>/pyramid/<id>"
 */
export function useWorkspacePath() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  return useCallback(
    (path: string) => {
      if (!workspaceId) return path;
      const normalized = path.startsWith('/') ? path : `/${path}`;
      return `/${workspaceId}${normalized}`;
    },
    [workspaceId]
  );
}
