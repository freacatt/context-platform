import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UiUxArchitectureEditor } from '../components/UiUxArchitecture/UiUxArchitectureEditor';
import { getUiUxArchitecture } from '../services/uiUxArchitectureService';
import { UiUxArchitecture } from '../types/uiUxArchitecture';
import { Flex, Text, Spinner } from '@radix-ui/themes';

export const UiUxArchitectureEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [architecture, setArchitecture] = useState<UiUxArchitecture | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArchitecture = async () => {
      if (!id) return;
      try {
        const data = await getUiUxArchitecture(id);
        setArchitecture(data);
      } catch (error) {
        console.error("Failed to load architecture", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArchitecture();
  }, [id]);

  if (loading) {
    return (
        <Flex align="center" justify="center" style={{ height: '100vh' }}>
          <Spinner size="3" />
        </Flex>
    );
  }

  if (!architecture) {
    return (
        <Flex align="center" justify="center" style={{ height: '100vh' }}>
          <Text>Architecture not found.</Text>
        </Flex>
    );
  }

  return (
      <UiUxArchitectureEditor architecture={architecture} />
  );
};
