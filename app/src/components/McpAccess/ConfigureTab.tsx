import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { WorkspaceMcpSettings } from '../../types';
import { updateMcpSettings } from '../../services/mcpSettingsService';

interface ConfigureTabProps {
  settings: WorkspaceMcpSettings;
  onUpdate: (settings: WorkspaceMcpSettings) => void;
}

export const ConfigureTab: React.FC<ConfigureTabProps> = ({ settings, onUpdate }) => {

  const handleUpdate = async (updates: Partial<WorkspaceMcpSettings>) => {
    const updated = { ...settings, ...updates };
    try {
      await updateMcpSettings(updated);
      onUpdate(updated);
    } catch (e) {
      toast.error("Failed to save configuration");
    }
  };

  const handleToolToggle = (tool: string, checked: boolean) => {
    const currentTools = new Set(settings.allowedTools);
    if (checked) {
      currentTools.add(tool);
    } else {
      currentTools.delete(tool);
    }
    handleUpdate({ allowedTools: Array.from(currentTools) });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Exposure</CardTitle>
          <CardDescription>Control what data the AI can access from this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Global Context</Label>
              <p className="text-sm text-muted-foreground">
                Expose the aggregated global context (Pyramid, Product Defs, etc.).
              </p>
            </div>
            <Switch 
              checked={settings.exposeGlobalContext}
              onCheckedChange={(checked) => handleUpdate({ exposeGlobalContext: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Documents & Files</Label>
              <p className="text-sm text-muted-foreground">
                Allow AI to search and read individual documents and diagrams.
              </p>
            </div>
            <Switch 
              checked={settings.exposeDocuments}
              onCheckedChange={(checked) => handleUpdate({ exposeDocuments: checked })}
            />
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label>Maximum Context Size (Characters)</Label>
            <div className="flex gap-4">
                <Input 
                    type="number" 
                    value={settings.maxContextSize} 
                    onChange={(e) => handleUpdate({ maxContextSize: parseInt(e.target.value) || 0 })}
                    className="max-w-[200px]"
                />
                <p className="text-sm text-muted-foreground self-center">
                    Limits the amount of data sent to the AI to prevent high costs.
                </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allowed Tools</CardTitle>
          <CardDescription>Select which MCP tools are enabled for this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox 
                id="tool-global" 
                checked={settings.allowedTools.includes('read_global_context')}
                onCheckedChange={(c) => handleToolToggle('read_global_context', c as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="tool-global" className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                read_global_context
              </Label>
              <p className="text-sm text-muted-foreground">
                Allows reading the full aggregated context of the workspace.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox 
                id="tool-search" 
                checked={settings.allowedTools.includes('search_resources')}
                onCheckedChange={(c) => handleToolToggle('search_resources', c as boolean)}
                disabled={!settings.exposeDocuments}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="tool-search" className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                search_resources
              </Label>
              <p className="text-sm text-muted-foreground">
                Allows searching through available documents and files.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox 
                id="tool-read" 
                checked={settings.allowedTools.includes('read_resource')}
                onCheckedChange={(c) => handleToolToggle('read_resource', c as boolean)}
                disabled={!settings.exposeDocuments}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="tool-read" className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                read_resource
              </Label>
              <p className="text-sm text-muted-foreground">
                Allows reading content of specific documents.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
