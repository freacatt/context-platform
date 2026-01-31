import React from 'react';
import { LoginForm } from "@/components/login-form";
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { HyperText } from "@/components/ui/hyper-text";

const LoginPage: React.FC = () => {
  const { user, loading, error } = useAuth();

  if (loading) return null; // Or a spinner
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50 dark:bg-background">
       <div className="flex justify-center mb-8">
         <HyperText
           className="text-4xl font-bold text-black dark:text-white"
           text="Context Platform"
         />
       </div>
      
      {error && (
        <p className="mb-2 bg-red-100 dark:bg-red-900/30 p-3 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          {error instanceof Error ? error.message : String(error)}
        </p>
      )}
      
      <div className="w-full max-w-sm px-4">
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;
