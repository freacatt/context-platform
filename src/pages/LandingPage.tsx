import React from 'react';
import { Flex, Heading, Text } from '@radix-ui/themes';
import Login from '../components/Auth/Login';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const { user, loading, error } = useAuth();

  if (loading) return null; // Or a spinner
  if (user) return <Navigate to="/dashboard" />;

  return (
    <Flex direction="column" align="center" justify="center" style={{ height: '100vh' }} gap="4" className="bg-background">
      <Heading size="9" className="text-foreground">Pyramid Solver</Heading>
      <Text size="4" color="gray" className="mb-8 max-w-md text-center">
      </Text>
      
      {error && (
        <Text color="red" size="2" className="mb-2 bg-red-100 p-3 rounded border border-red-200">
          {error instanceof Error ? error.message : String(error)}
        </Text>
      )}
      
      <Login />
    </Flex>
  );
};

export default LandingPage;
