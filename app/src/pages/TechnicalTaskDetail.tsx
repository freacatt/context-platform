import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspacePath } from '@/hooks/useWorkspacePath';
import { useAuth } from '../contexts/AuthContext';
import { getTechnicalTask } from '../services/technicalTaskService';
import { TechnicalTask } from '../types/technicalTask';
import TechnicalTaskEditor from '../components/TechnicalTask/TechnicalTaskEditor';

export const TechnicalTaskDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const wp = useWorkspacePath();
    const [task, setTask] = useState<TechnicalTask | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && id) {
            loadTask();
        }
    }, [user, id]);

    const loadTask = async () => {
        if (!user || !id) return;
        setLoading(true);
        try {
            const found = await getTechnicalTask(id);
            if (found) {
                setTask(found);
            } else {
                navigate(wp('/technical-tasks'));
            }
        } catch (error) {
            console.error("Failed to load task", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
         return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!task) return null;

    return (
        <div className="h-full bg-background">
            <TechnicalTaskEditor task={task} />
        </div>
    );
};
