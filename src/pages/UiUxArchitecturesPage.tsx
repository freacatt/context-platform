import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UiUxArchitecture } from '../types/uiUxArchitecture';
import { createUiUxArchitecture, getUserUiUxArchitectures, deleteUiUxArchitecture } from '../services/uiUxArchitectureService';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">UI/UX Architectures</h1>
          <Button onClick={handleCreate} className="cursor-pointer">
            <Plus size={16} className="mr-2" />
            New Architecture
          </Button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {architectures.map((arch) => (
              <Card 
                key={arch.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/ui-ux-architecture/${arch.id}`)}
              >
                <CardContent className="p-4 flex flex-col gap-2 h-full">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{arch.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Updated: {new Date(arch.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer"
                      onClick={(e) => handleDelete(e, arch.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <FileText size={14} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      v{arch.ui_ux_architecture_metadata.version}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  );
};
