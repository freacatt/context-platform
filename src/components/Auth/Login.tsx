import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Flex, Text, Box, Card } from '@radix-ui/themes';
import { Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ maxWidth: 400, width: '100%' }}>
        <Box p="4">
            <Flex direction="column" gap="4" align="center">
                <Text size="5" weight="bold">Welcome to Pyramid Solver</Text>
                
                {error && <Text size="2" color="red">{error}</Text>}

                <Button 
                    size="3" 
                    variant="solid" 
                    onClick={handleGoogleSignIn} 
                    disabled={loading}
                    style={{ width: '100%' }}
                >
                    {loading && <Loader2 className="animate-spin mr-2" />}
                    Sign in with Google
                </Button>
            </Flex>
        </Box>
    </Card>
  );
};

export default Login;
