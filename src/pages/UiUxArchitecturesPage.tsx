import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Heading, Flex, Button, Card, Text, Grid, Box } from '@radix-ui/themes';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UiUxArchitecture } from '../types/uiUxArchitecture';
import { createUiUxArchitecture, getUserUiUxArchitectures, deleteUiUxArchitecture } from '../services/uiUxArchitectureService';

export const UiUxArchitecturesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [architectures, setArchitectures] = useState<UiUxArchitecture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchitectures();
  }, [user]);

  const fetchArchitectures = async () => {
    if (!user) return;
    try {
      const data = await getUserUiUxArchitectures(user.uid);
      setArchitectures(data);
    } catch (error) {
      console.error("Failed to load UI/UX architectures", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    const id = await createUiUxArchitecture(user.uid);
    if (id) {
      navigate(`/ui-ux-architecture/${id}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this architecture?')) {
      await deleteUiUxArchitecture(id);
      fetchArchitectures();
    }
  };

  return (
      <Container size="4" p="4">
        <Flex justify="between" align="center" mb="6">
          <Heading size="6">UI/UX Architectures</Heading>
          <Button onClick={handleCreate}>
            <Plus size={16} />
            New Architecture
          </Button>
        </Flex>

        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4">
            {architectures.map((arch) => (
              <Card 
                key={arch.id} 
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => navigate(`/ui-ux-architecture/${arch.id}`)}
              >
                <Flex direction="column" gap="2" height="100%">
                  <Flex justify="between" align="start">
                    <Box>
                      <Heading size="4" mb="1">{arch.title}</Heading>
                      <Text size="2" color="gray">
                        Updated: {new Date(arch.updatedAt).toLocaleDateString()}
                      </Text>
                    </Box>
                    <Button 
                      variant="ghost" 
                      color="red" 
                      onClick={(e) => handleDelete(e, arch.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </Flex>
                  <Flex align="center" gap="2" mt="auto">
                    <FileText size={14} className="text-gray-500" />
                    <Text size="2" color="gray">
                      v{arch.ui_ux_architecture_metadata.version}
                    </Text>
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Grid>
        )}
      </Container>
  );
};
