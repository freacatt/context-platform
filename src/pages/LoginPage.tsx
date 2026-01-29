import React from 'react';
import { Flex, Text } from '@radix-ui/themes';
import { LoginForm } from "@/components/login-form";
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { HyperText } from "@/components/ui/hyper-text";

const LoginPage: React.FC = () => {
  const { user, loading, error } = useAuth();

  if (loading) return null; // Or a spinner
  if (user) return <Navigate to="/dashboard" />;

  return (
    <Flex direction="column" align="center" justify="center" style={{ height: '100vh' }} gap="4" className="bg-slate-50">
       <div className="flex justify-center mb-8">
         <HyperText
           className="text-4xl font-bold text-black dark:text-white"
           text="Context Platform"
         />
       </div>
      
      {error && (
        <Text color="red" size="2" className="mb-2 bg-red-100 p-3 rounded border border-red-200">
          {error instanceof Error ? error.message : String(error)}
        </Text>
      )}
      
      <div className="w-full max-w-sm px-4">
        <LoginForm />
      </div>
    </Flex>
  );
};

export default LoginPage;
