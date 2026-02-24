import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspacePath } from '@/hooks/useWorkspacePath';
import { useAuth } from '../contexts/AuthContext';
import { getTechnicalArchitecture, updateTechnicalArchitecture } from '../services/technicalArchitectureService';
import { TechnicalArchitecture } from '../types';
import { TechnicalArchitectureEditor } from '../components/TechnicalArchitecture/TechnicalArchitectureEditor';

export const TechnicalArchitectureEditorPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const wp = useWorkspacePath();
    const [architecture, setArchitecture] = useState<TechnicalArchitecture | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && id) {
            loadArchitecture();
        }
    }, [user, id]);

    const loadArchitecture = async () => {
        if (!id) return;
        setLoading(true);
        const data = await getTechnicalArchitecture(id);
        if (data) {
            setArchitecture(data);
        } else {
            navigate(wp('/technical-architectures'));
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!architecture) return null;

    return (
        <TechnicalArchitectureEditor 
            architecture={architecture}
            onSave={() => {
                // Optional: show toast notification
            }}
        />
    );
};
