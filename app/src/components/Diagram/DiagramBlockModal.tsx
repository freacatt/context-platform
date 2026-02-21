import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sparkles, Notebook, PaintBucket, Trash2 } from 'lucide-react';
import { AiRecommendationButton } from '../Common/AiRecommendationButton';
import { recommend } from '@/services/agentPlatformClient';
import { ContextSource } from '../../types';
import ContextSelectorModal from '../GlobalContext/ContextSelectorModal';

interface EdgeInfo {
  id: string;
  title: string;
  direction?: string;
}

interface DiagramBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  diagramTitle: string;
  description: string;
  borderColor?: string;
  contextSources?: ContextSource[];
  outgoing: EdgeInfo[];
  incoming: EdgeInfo[];
  onSave: (next: { title: string; description: string; borderColor?: string; contextSources?: ContextSource[] }) => void;
  onDelete: () => void;
}

const DiagramBlockModal: React.FC<DiagramBlockModalProps> = ({
  isOpen,
  onClose,
  title,
  diagramTitle,
  description,
  borderColor,
  contextSources = [],
  outgoing,
  incoming,
  onSave,
  onDelete
}) => {
  const [localTitle, setLocalTitle] = useState(title);
  const [localDescription, setLocalDescription] = useState(description || '');
  const [localBorderColor, setLocalBorderColor] = useState(borderColor || '#1f2937');
  const [attachedSources, setAttachedSources] = useState<ContextSource[]>(contextSources || []);
  const [contextModalOpen, setContextModalOpen] = useState(false);

  useEffect(() => {
    setLocalTitle(title);
    setLocalDescription(description || '');
    setLocalBorderColor(borderColor || '#1f2937');
    setAttachedSources(contextSources || []);
  }, [title, description, borderColor, contextSources, isOpen]);

  const buildContextSummary = () => {
    const sources = attachedSources || [];
    if (!sources.length) return "No explicit attachments.";
    return sources
      .map((s) => `- [${s.type}] ${s.title || s.id}`)
      .join("\n");
  };

  const buildConnectionsSummary = () => {
    const outgoingLines = outgoing.map(
      (e) => `OUTGOING: ${e.title}${e.direction ? ` (${e.direction})` : ""}`,
    );
    const incomingLines = incoming.map(
      (e) => `INCOMING: ${e.title}${e.direction ? ` (${e.direction})` : ""}`,
    );
    return [...outgoingLines, ...incomingLines].join("\n") || "No explicit connections.";
  };

  const buildRecommendVariables = (globalContext: string): Record<string, string> => ({
    diagram_title: diagramTitle,
    block_title: localTitle || title,
    global_context: globalContext || "N/A",
    context_summary: buildContextSummary(),
    connections_summary: buildConnectionsSummary(),
    current_description: localDescription || "(none)",
  });

  const handleSave = () => {
    onSave({
      title: localTitle.trim() || 'Untitled',
      description: localDescription,
      borderColor: localBorderColor,
      contextSources: attachedSources
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Block</DialogTitle>
          <DialogDescription>
            Update the block title, description, connections, and attachments.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title" className="font-bold">Title</Label>
            <Input
              id="title"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              placeholder="Block title"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="description" className="font-bold">Description</Label>
              <AiRecommendationButton
                size="sm"
                variant="ghost"
                color="purple"
                label="AI Suggest"
                loadingLabel="Generating..."
                icon={<Sparkles size={14} className="mr-1" />}
                onGenerate={async ({ workspaceId, agentId, globalContext }) => {
                  if (!workspaceId || !agentId) {
                    throw new Error("Workspace and agent are required for AI suggestions");
                  }
                  const result = await recommend(workspaceId, agentId, "diagram_block_description", buildRecommendVariables(globalContext));
                  return result.response;
                }}
                onSuccess={(text) => setLocalDescription(text)}
                onError={() => {}}
              />
            </div>
            <Textarea
              id="description"
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Describe what this block represents..."
              rows={4}
              className="min-h-[120px] resize-y"
            />
          </div>

          <div className="grid gap-2">
            <Label className="font-bold">Navigation Map</Label>
            <div className="flex gap-3 mt-2">
              <div className="flex-1">
                <span className="text-muted-foreground text-sm">Outgoing</span>
                <div className="flex flex-col gap-2 mt-2">
                  {outgoing.length === 0 ? (
                    <span className="text-muted-foreground text-sm">None</span>
                  ) : outgoing.map(e => (
                    <Card key={e.id} className="p-2 bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{e.title}</span>
                        {e.direction && (
                          <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300">{e.direction}</Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <span className="text-muted-foreground text-sm">Incoming</span>
                <div className="flex flex-col gap-2 mt-2">
                  {incoming.length === 0 ? (
                    <span className="text-muted-foreground text-sm">None</span>
                  ) : incoming.map(e => (
                    <Card key={e.id} className="p-2 bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{e.title}</span>
                        {e.direction && (
                          <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300">{e.direction}</Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="font-bold">Attachments</Label>
            <div className="flex gap-2 mt-2 items-center">
              <Button variant="secondary" size="sm" className="cursor-pointer" onClick={() => setContextModalOpen(true)}>
                <Notebook size={14} className="mr-1" /> Attach context
              </Button>
              <div className="flex gap-1 flex-wrap">
                {attachedSources.map(s => (
                  <Badge key={`${s.type}-${s.id}`} variant="secondary">{s.title || s.id}</Badge>
                ))}
              </div>
            </div>
            <ContextSelectorModal
              isOpen={contextModalOpen}
              onClose={() => setContextModalOpen(false)}
              onSave={(sources) => setAttachedSources(sources)}
              initialSelectedSources={attachedSources}
              currentDefinitionId={null}
            />
          </div>

          <div className="grid gap-2">
            <Label className="font-bold">Border Color</Label>
            <div className="flex gap-2 items-center mt-2">
              <input
                type="color"
                value={localBorderColor}
                onChange={(e) => setLocalBorderColor(e.target.value)}
                className="h-9 w-16 p-1 rounded-md border border-input bg-background cursor-pointer"
              />
              <PaintBucket size={16} className="text-muted-foreground" />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
          <Button 
            variant="destructive"
            onClick={onDelete}
            className="cursor-pointer"
          >
            <Trash2 size={16} className="mr-1" />
            Delete Block
          </Button>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleSave} className="cursor-pointer">Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DiagramBlockModal;
