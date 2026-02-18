import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Copy, Key, Plus, Trash2, AlertTriangle, Terminal } from "lucide-react";
import { toast } from "sonner";
import { WorkspaceMcpSettings, McpAccessKey } from '../../types';
import { createAccessKey, revokeAccessKey, updateMcpSettings } from '../../services/mcpSettingsService';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface ConnectTabProps {
  settings: WorkspaceMcpSettings;
  onUpdate: (settings: WorkspaceMcpSettings) => void;
}

export const ConnectTab: React.FC<ConnectTabProps> = ({ settings, onUpdate }) => {
  const { currentWorkspace } = useWorkspace();
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);

  // TODO: Get from env or config
  const GATEWAY_URL = "http://localhost:3000/mcp"; 

  const handleToggleEnabled = async (enabled: boolean) => {
    const updated = { ...settings, enabled };
    try {
      await updateMcpSettings(updated);
      onUpdate(updated);
      toast.success(enabled ? "MCP Access Enabled" : "MCP Access Disabled");
    } catch (e) {
      toast.error("Failed to update settings");
    }
  };

  const handleGenerateKey = async () => {
    if (!currentWorkspace) return;
    setIsGenerating(true);
    try {
      const result = await createAccessKey(currentWorkspace.id, "New Key"); // simplified label
      if (result) {
        onUpdate({
            ...settings,
            accessKeys: [...settings.accessKeys, result.key]
        });
        setNewKeySecret(result.secret);
      }
    } catch (e) {
      toast.error("Failed to generate key");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!currentWorkspace) return;
    if (!confirm("Are you sure you want to revoke this key? Any client using it will lose access immediately.")) return;

    try {
      await revokeAccessKey(currentWorkspace.id, keyId);
      onUpdate({
        ...settings,
        accessKeys: settings.accessKeys.filter(k => k.id !== keyId)
      });
      toast.success("Key revoked");
    } catch (e) {
      toast.error("Failed to revoke key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const genericConfig = {
    "mcpServers": {
      "pyramid-solver": {
        "command": "npx",
        "args": [
          "tsx",
          "/home/pouria/projects/pyramid-solver/mcp-gateway/src/sse-bridge.ts",
          GATEWAY_URL,
          "--headers",
          `{"x-mcp-key": "${newKeySecret || 'YOUR_KEY_HERE'}", "x-workspace-id": "${currentWorkspace?.id}"}`
        ]
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>Control external access to this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base">Enable MCP Access</Label>
            <p className="text-sm text-muted-foreground">
              Allow external AI agents to connect via Model Context Protocol.
            </p>
          </div>
          <Switch 
            checked={settings.enabled} 
            onCheckedChange={handleToggleEnabled} 
          />
        </CardContent>
      </Card>

      {settings.enabled && (
        <>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Gateway URL</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <code className="bg-muted p-2 rounded text-sm flex-1 truncate">{GATEWAY_URL}</code>
                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(GATEWAY_URL)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Workspace ID</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <code className="bg-muted p-2 rounded text-sm flex-1 truncate">{currentWorkspace?.id}</code>
                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(currentWorkspace?.id || "")}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Access Keys</CardTitle>
                    <CardDescription>Manage keys used to authenticate AI clients.</CardDescription>
                </CardHeader>
                <CardContent>
                    {newKeySecret && (
                        <Alert className="mb-6 border-green-500 bg-green-500/10 text-green-700 dark:text-green-400">
                            <Key className="h-4 w-4" />
                            <AlertTitle>New Key Generated</AlertTitle>
                            <AlertDescription>
                                <p className="mb-2">This is the only time you will see this key. Copy it now!</p>
                                <div className="flex items-center gap-2 bg-background/50 p-2 rounded border border-green-500/20">
                                    <code className="flex-1 font-mono text-sm break-all">{newKeySecret}</code>
                                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(newKeySecret)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Prefix</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {settings.accessKeys.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                        No active keys. Generate one to connect.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                settings.accessKeys.map((key) => (
                                    <TableRow key={key.id}>
                                        <TableCell className="font-mono">{key.keyPrefix}</TableCell>
                                        <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRevokeKey(key.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleGenerateKey} disabled={isGenerating}>
                        <Plus className="mr-2 h-4 w-4" /> Generate New Key
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Quick Connect</CardTitle>
                    <CardDescription>Use this configuration for any MCP-compatible AI Client (Cursor, Windsurf, Claude Desktop, etc.).</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-muted p-4 rounded-lg relative group">
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                            {JSON.stringify(genericConfig, null, 2)}
                        </pre>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(JSON.stringify(genericConfig, null, 2))}
                        >
                            <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </>
      )}
    </div>
  );
};
