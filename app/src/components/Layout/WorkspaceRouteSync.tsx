import { useEffect } from 'react';
import { useParams, Outlet, Navigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function WorkspaceRouteSync() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace();

  useEffect(() => {
    if (!workspaceId || workspaces.length === 0) return;
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace && currentWorkspace?.id !== workspaceId) {
      setCurrentWorkspace(workspace);
    }
  }, [workspaceId, workspaces, currentWorkspace, setCurrentWorkspace]);

  // Redirect if workspace not found after workspaces have loaded
  if (workspaceId && workspaces.length > 0) {
    const exists = workspaces.some(w => w.id === workspaceId);
    if (!exists) {
      return <Navigate to="/workspaces" replace />;
    }
  }

  return <Outlet />;
}
