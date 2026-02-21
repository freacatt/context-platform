import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAlert } from '../contexts/AlertContext';
import { AgentConfig } from '../types/agent';
import {
  getAgents,
  createAgent as apiCreateAgent,
  updateAgent as apiUpdateAgent,
  deleteAgent as apiDeleteAgent,
} from '../services/agentPlatformClient';
import { updateWorkspaceAgentSettings } from '../services/workspaceService';
import { AgentConfigModal } from '../components/AgentSettings/AgentConfigModal';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Loader2, Plus, Bot, Settings, Trash2, Shield } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

const AiSettingsPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const { currentWorkspace, setCurrentWorkspace, workspaces, refreshWorkspaces } = useWorkspace();
  const { showAlert } = useAlert();

  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Agent assignments
  const [recommendationAgentId, setRecommendationAgentId] = useState('');
  const [chatAgentId, setChatAgentId] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'create'>('edit');
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgentConfig | null>(null);

  // Set current workspace from URL param
  useEffect(() => {
    if (workspaceId && workspaces.length > 0) {
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (workspace && (!currentWorkspace || currentWorkspace.id !== workspaceId)) {
        setCurrentWorkspace(workspace);
      }
    }
  }, [workspaceId, workspaces, currentWorkspace, setCurrentWorkspace]);

  // Load agents
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    loadAgents();
  }, [currentWorkspace?.id]);

  // Initialize assignments from workspace
  useEffect(() => {
    if (currentWorkspace) {
      setRecommendationAgentId(currentWorkspace.aiRecommendationAgentId || currentWorkspace.gmAgentId || '');
      setChatAgentId(currentWorkspace.aiChatAgentId || currentWorkspace.gmAgentId || '');
    }
  }, [currentWorkspace]);

  const loadAgents = async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    try {
      const result = await getAgents(currentWorkspace.id);
      setAgents(result);
    } catch (error: any) {
      showAlert({ type: 'error', title: 'Error', message: error?.message || 'Failed to load agents' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAssignments = async () => {
    if (!currentWorkspace?.id) return;
    setSavingAssignments(true);
    try {
      await updateWorkspaceAgentSettings(currentWorkspace.id, {
        aiRecommendationAgentId: recommendationAgentId,
        aiChatAgentId: chatAgentId,
      });
      await refreshWorkspaces();
      showAlert({ type: 'success', title: 'Saved', message: 'Agent assignments updated.' });
    } catch (error: any) {
      showAlert({ type: 'error', title: 'Error', message: error?.message || 'Failed to save assignments' });
    } finally {
      setSavingAssignments(false);
    }
  };

  const handleEditAgent = (agent: AgentConfig) => {
    setSelectedAgent(agent);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleCreateAgent = () => {
    setSelectedAgent(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleModalSave = async (data: {
    name: string;
    model_mode: string;
    model_provider?: string;
    model_name?: string;
    context: string;
  }) => {
    try {
      if (modalMode === 'create' && currentWorkspace?.id) {
        await apiCreateAgent({
          workspace_id: currentWorkspace.id,
          name: data.name,
          model_mode: data.model_mode,
          model_provider: data.model_provider,
          model_name: data.model_name,
          context: data.context,
        });
        showAlert({ type: 'success', title: 'Created', message: `Agent "${data.name}" created.` });
      } else if (selectedAgent) {
        await apiUpdateAgent(selectedAgent.id, {
          name: data.name,
          model_mode: data.model_mode,
          model_provider: data.model_provider,
          model_name: data.model_name,
          context: data.context,
        });
        showAlert({ type: 'success', title: 'Updated', message: `Agent "${data.name}" updated.` });
      }
      await loadAgents();
    } catch (error: any) {
      showAlert({ type: 'error', title: 'Error', message: error?.message || 'Failed to save agent' });
      throw error; // re-throw so modal stays open
    }
  };

  const handleDeleteAgent = (agent: AgentConfig) => {
    setDeleteTarget(agent);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDeleteAgent(deleteTarget.id);
      showAlert({ type: 'success', title: 'Deleted', message: `Agent "${deleteTarget.name}" deleted.` });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await loadAgents();
    } catch (error: any) {
      showAlert({ type: 'error', title: 'Error', message: error?.message || 'Failed to delete agent' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 pt-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-violet-600" />
          AI Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure AI agents and assign them to workspace features.
        </p>
      </div>

      {/* Agent Assignments */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Agent Assignments</CardTitle>
          <CardDescription>Choose which agent handles each AI feature in this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Field AI Recommendations</Label>
              <Select value={recommendationAgentId} onValueChange={setRecommendationAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} {a.isDefault ? '(Default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Chat Assistant</Label>
              <Select value={chatAgentId} onValueChange={setChatAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} {a.isDefault ? '(Default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveAssignments} disabled={savingAssignments}>
              {savingAssignments && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Assignments
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agents List */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Agents</h2>
        <Button onClick={handleCreateAgent}>
          <Plus className="mr-2 h-4 w-4" /> New Agent
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {agents.map((agent) => (
          <Card
            key={agent.id}
            className="cursor-pointer hover:border-primary transition-colors group relative"
            onClick={() => handleEditAgent(agent)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {agent.isDefault ? (
                    <Shield className="h-4 w-4 text-violet-600" />
                  ) : (
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  )}
                  {agent.name}
                </CardTitle>
                {!agent.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAgent(agent);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded-full bg-muted font-medium">
                  {agent.type === 'gm' ? 'General Manager' : 'Custom'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-muted">
                  Model: {agent.modelMode === 'auto' ? 'Auto' : agent.modelName || 'Manual'}
                </span>
              </div>
              {agent.context && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  {agent.context}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No agents configured. Set up a workspace first to get the default agent.</p>
        </div>
      )}

      {/* Agent Config Modal */}
      <AgentConfigModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        agent={selectedAgent}
        onSave={handleModalSave}
        mode={modalMode}
      />

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Agent"
        description="This action cannot be undone. This will permanently delete this agent."
        itemName={deleteTarget?.name || ''}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AiSettingsPage;
