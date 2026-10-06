import { useConvexAuth } from 'convex/react';
import { Navigate, Outlet } from 'react-router-dom';
import { FullPageSpinner } from '@/components/layout/FullPageSpinner';

/** Renders child routes only for signed-in users; everyone else goes to /login. */
export function RequireAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
