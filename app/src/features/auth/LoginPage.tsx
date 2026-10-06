import { useConvexAuth } from 'convex/react';
import { Navigate } from 'react-router-dom';
import { HyperText } from '@/components/ui/hyper-text';
import { FullPageSpinner } from '@/components/layout/FullPageSpinner';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/workspaces" replace />;

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50 dark:bg-background">
      <div className="flex justify-center mb-8">
        <HyperText className="text-4xl font-bold text-black dark:text-white" text="Context Platform" />
      </div>
      <div className="w-full max-w-sm px-4">
        <LoginForm />
      </div>
    </div>
  );
}
