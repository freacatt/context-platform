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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, Plus, Trash2, Check } from 'lucide-react';
import { AgentConfig, AppAccessEntry, McpServerEntry } from '@/types/agent';
import { getModels, getApps, ProviderOption } from '@/services/agentPlatformClient';

const ALL_PERMISSIONS = ['create', 'read', 'update', 'delete', 'list'];

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
    is_orchestrator: boolean;
    app_access: { app_id: string; permissions: string[] }[];
    mcp_servers: { name: string; url: string; auth: Record<string, string> }[];
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
  const [isOrchestrator, setIsOrchestrator] = useState(false);
  const [appAccess, setAppAccess] = useState<AppAccessEntry[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServerEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [availableApps, setAvailableApps] = useState<{ id: string; label: string }[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch available models and apps
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingModels(true);

    Promise.all([getModels(), getApps()])
      .then(([models, apps]) => {
        if (!cancelled) {
          setProviders(models);
          setAvailableApps(apps);
        }
      })
      .catch((err) => console.error('Failed to fetch data:', err))
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
      setIsOrchestrator(agent.isOrchestrator);
      setAppAccess(agent.appAccess || []);
      setMcpServers(agent.mcpServers || []);
    } else {
      setName('');
      setModelMode('auto');
      setModelProvider('');
      setModelName('');
      setContext('');
      setIsOrchestrator(false);
      setAppAccess([]);
      setMcpServers([]);
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
        is_orchestrator: isOrchestrator,
        app_access: appAccess.map((a) => ({ app_id: a.appId, permissions: a.permissions })),
        mcp_servers: mcpServers.map((s) => ({ name: s.name, url: s.url, auth: s.auth })),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  // App access helpers
  const isAppEnabled = (appId: string) => appAccess.some((a) => a.appId === appId);

  const toggleApp = (appId: string) => {
    if (isAppEnabled(appId)) {
      setAppAccess(appAccess.filter((a) => a.appId !== appId));
    } else {
      setAppAccess([...appAccess, { appId, permissions: [...ALL_PERMISSIONS] }]);
    }
  };

  const togglePermission = (appId: string, perm: string) => {
    setAppAccess(appAccess.map((a) => {
      if (a.appId !== appId) return a;
      const perms = a.permissions.includes(perm)
        ? a.permissions.filter((p) => p !== perm)
        : [...a.permissions, perm];
      return { ...a, permissions: perms };
    }));
  };

  const getAppPermissions = (appId: string): string[] => {
    return appAccess.find((a) => a.appId === appId)?.permissions || [];
  };

  // MCP server helpers
  const addMcpServer = () => {
    setMcpServers([...mcpServers, { name: '', url: '', auth: {} }]);
  };

  const updateMcpServer = (index: number, field: keyof McpServerEntry, value: any) => {
    setMcpServers(mcpServers.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeMcpServer = (index: number) => {
    setMcpServers(mcpServers.filter((_, i) => i !== index));
  };

  const selectedProvider = providers.find((p) => p.value === modelProvider);
  const availableModels = selectedProvider?.models || [];
  const isGm = agent?.type === 'gm';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Agent' : 'Agent Configuration'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Configure your new AI agent.'
              : `Configure ${agent?.name || 'agent'} settings.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-2 pr-1">
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

          {/* Orchestrator Toggle (not for GM — GM is always orchestrator) */}
          {!isGm && (
            <div className="flex items-center gap-3">
              <Checkbox
                id="is-orchestrator"
                checked={isOrchestrator}
                onCheckedChange={(checked) => setIsOrchestrator(checked === true)}
              />
              <Label htmlFor="is-orchestrator" className="cursor-pointer">
                Can delegate tasks to other agents
              </Label>
            </div>
          )}

          {/* App Access */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold">App Access</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isGm
                  ? 'GM agent has access to all apps by default. Custom configuration is optional.'
                  : 'Select which apps this agent can access and configure permissions.'}
              </p>
            </div>
            {availableApps.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Loading apps...</p>
            ) : (
              <Accordion type="multiple" defaultValue={appAccess.map(a => a.appId)} className="border border-border rounded-lg overflow-hidden">
                {availableApps.map((app, idx) => {
                  const enabled = isAppEnabled(app.id);
                  const perms = getAppPermissions(app.id);
                  return (
                    <AccordionItem key={app.id} value={app.id} className={idx === availableApps.length - 1 ? 'border-b-0' : ''}>
                      <AccordionTrigger className="px-3 py-2.5 hover:no-underline hover:bg-muted/50">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <Checkbox
                            id={`app-${app.id}`}
                            checked={enabled}
                            onCheckedChange={(e) => { e && e; toggleApp(app.id); }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-sm font-medium truncate">{app.label}</span>
                          {enabled && (
                            <span className="ml-auto mr-2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              {perms.length}/{ALL_PERMISSIONS.length}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pb-3">
                        {enabled ? (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">Permissions</span>
                              <button
                                type="button"
                                className="text-[10px] text-primary hover:underline"
                                onClick={() => {
                                  const allSelected = perms.length === ALL_PERMISSIONS.length;
                                  setAppAccess(appAccess.map((a) =>
                                    a.appId === app.id ? { ...a, permissions: allSelected ? [] : [...ALL_PERMISSIONS] } : a
                                  ));
                                }}
                              >
                                {perms.length === ALL_PERMISSIONS.length ? 'Deselect all' : 'Select all'}
                              </button>
                            </div>
                            {ALL_PERMISSIONS.map((perm) => {
                              const active = perms.includes(perm);
                              return (
                                <button
                                  key={perm}
                                  type="button"
                                  onClick={() => togglePermission(app.id, perm)}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                                    active
                                      ? 'bg-primary/10 text-primary'
                                      : 'text-muted-foreground hover:bg-muted'
                                  }`}
                                >
                                  <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors ${
                                    active ? 'bg-primary border-primary' : 'border-border'
                                  }`}>
                                    {active && <Check size={10} className="text-primary-foreground" />}
                                  </div>
                                  <span className="capitalize">{perm}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic pt-1">
                            Enable this app to configure permissions.
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>

          {/* MCP Servers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">External MCP Servers</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect to external tool servers via Model Context Protocol.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addMcpServer}>
                <Plus size={14} className="mr-1" /> Add Server
              </Button>
            </div>
            {mcpServers.map((server, index) => (
              <div key={index} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Server {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeMcpServer(index)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Server name"
                    value={server.name}
                    onChange={(e) => updateMcpServer(index, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="https://mcp.example.com"
                    value={server.url}
                    onChange={(e) => updateMcpServer(index, 'url', e.target.value)}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    value={server.auth.type || 'none'}
                    onValueChange={(v) => updateMcpServer(index, 'auth', v === 'none' ? {} : { type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auth type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Auth</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                    </SelectContent>
                  </Select>
                  {server.auth.type === 'bearer' && (
                    <Input
                      type="password"
                      placeholder="Bearer token"
                      value={server.auth.token || ''}
                      onChange={(e) => updateMcpServer(index, 'auth', { ...server.auth, token: e.target.value })}
                    />
                  )}
                  {server.auth.type === 'api_key' && (
                    <Input
                      type="password"
                      placeholder="API key"
                      value={server.auth.key || ''}
                      onChange={(e) => updateMcpServer(index, 'auth', { ...server.auth, key: e.target.value })}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border pt-4">
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
