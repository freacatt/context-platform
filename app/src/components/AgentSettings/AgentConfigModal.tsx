import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { AgentConfig } from '@/types/agent';
import { getModels, ProviderOption } from '@/services/agentPlatformClient';

interface AgentConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentConfig | null;
  onSave: (data: {
    name: string;
    model_mode: string;
    model_provider?: string;
    model_name?: string;
    context: string;
  }) => Promise<void>;
  mode: 'edit' | 'create';
}

export const AgentConfigModal: React.FC<AgentConfigModalProps> = ({
  open,
  onOpenChange,
  agent,
  onSave,
  mode,
}) => {
  const [name, setName] = useState('');
  const [modelMode, setModelMode] = useState<'auto' | 'manual'>('auto');
  const [modelProvider, setModelProvider] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [context, setContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch available models from agent-platform
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingModels(true);
    getModels()
      .then((data) => { if (!cancelled) setProviders(data); })
      .catch((err) => console.error('Failed to fetch models:', err))
      .finally(() => { if (!cancelled) setLoadingModels(false); });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (agent && mode === 'edit') {
      setName(agent.name);
      setModelMode(agent.modelMode);
      setModelProvider(agent.modelProvider || '');
      setModelName(agent.modelName || '');
      setContext(agent.context);
    } else {
      setName('');
      setModelMode('auto');
      setModelProvider('');
      setModelName('');
      setContext('');
    }
  }, [agent, mode, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        model_mode: modelMode,
        model_provider: modelMode === 'manual' ? modelProvider : undefined,
        model_name: modelMode === 'manual' ? modelName : undefined,
        context,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedProvider = providers.find((p) => p.value === modelProvider);
  const availableModels = selectedProvider?.models || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Agent' : 'Agent Configuration'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Configure your new AI agent.'
              : `Configure ${agent?.name || 'agent'} settings.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="agent-name">Name</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Agent name"
              disabled={agent?.isDefault && mode === 'edit'}
            />
          </div>

          {/* Model Mode */}
          <div className="space-y-2">
            <Label>Model Selection</Label>
            <Select value={modelMode} onValueChange={(v) => setModelMode(v as 'auto' | 'manual')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (server default)</SelectItem>
                <SelectItem value="manual">Manual (choose model)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Manual model selection */}
          {modelMode === 'manual' && (
            <>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={modelProvider} onValueChange={(v) => { setModelProvider(v); setModelName(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingModels ? "Loading..." : "Select provider"} />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {modelProvider && (
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={modelName} onValueChange={setModelName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Agent Context */}
          <div className="space-y-2">
            <Label htmlFor="agent-context">Agent Instructions</Label>
            <Textarea
              id="agent-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="System prompt / instructions for this agent..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This text is sent as a system prompt to the AI model on every message.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
