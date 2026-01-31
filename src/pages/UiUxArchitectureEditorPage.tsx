import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UiUxArchitectureEditor } from '../components/UiUxArchitecture/UiUxArchitectureEditor';
import { getUiUxArchitecture } from '../services/uiUxArchitectureService';
import { UiUxArchitecture } from '../types/uiUxArchitecture';

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
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
  }

  if (!architecture) {
    return (
        <div className="flex items-center justify-center h-screen bg-background">
          <p className="text-foreground">Architecture not found.</p>
        </div>
    );
  }

  return (
      <UiUxArchitectureEditor architecture={architecture} />
  );
};
