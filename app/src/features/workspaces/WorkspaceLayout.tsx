import { Suspense } from 'react';
import { useQuery } from 'convex/react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { api } from '../../../convex/_generated/api';
import { AppShell } from '@/components/layout/AppShell';
import { OpenRouterStatus } from '@/features/ai/OpenRouterStatus';
import { FullPageSpinner, SectionSpinner } from '@/components/layout/FullPageSpinner';
import { WorkspaceProvider } from './WorkspaceContext';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { ExportWorkspaceButton } from './WorkspaceTransfer';

/**
 * Route element for /:workspaceId/*. Resolves the workspace from the URL (the
 * single source of truth for "current workspace") and redirects if it is not
 * one of the user's workspaces.
 */
export function WorkspaceLayout() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const workspaces = useQuery(api.workspaces.list);

  if (workspaces === undefined) return <FullPageSpinner />;
  const workspace = workspaces.find((w) => w._id === workspaceId);
  if (!workspace) return <Navigate to="/workspaces" replace />;

  return (
    <WorkspaceProvider value={workspace}>
      <AppShell sidebar={<WorkspaceSidebar />} actions={
          <>
            <OpenRouterStatus />
            <ExportWorkspaceButton />
          </>
        }>
        {/* Keeps the shell on screen while a screen's code chunk loads. */}
        <Suspense fallback={<SectionSpinner />}>
          <Outlet />
        </Suspense>
      </AppShell>
    </WorkspaceProvider>
  );
}
