import { useState } from 'react';
import { PaintBucket, Trash2 } from 'lucide-react';
import type { DiagramNodeData } from '@shared/types/diagram';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Connection } from '@/lib/export/diagram';

interface DiagramBlockModalProps {
  data: DiagramNodeData;
  outgoing: Connection[];
  incoming: Connection[];
  onClose: () => void;
  onSave: (next: DiagramNodeData) => void;
  onDelete: () => void;
}

function ConnectionList({ label, items }: { label: string; items: Connection[] }) {
  return (
    <div className="flex-1">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="flex flex-col gap-2 mt-2">
        {items.length === 0 ? (
          <span className="text-muted-foreground text-sm">None</span>
        ) : (
          items.map((c) => (
            <Card key={c.id} className="p-2 bg-muted/50 flex justify-between items-center">
              <span className="text-sm">{c.title}</span>
              {c.direction && (
                <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                  {c.direction}
                </Badge>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/** Edits one block. Mounted per block, so it starts from that block's data. */
export default function DiagramBlockModal({ data, outgoing, incoming, onClose, onSave, onDelete }: DiagramBlockModalProps) {
  const [title, setTitle] = useState(data.title);
  const [description, setDescription] = useState(data.description);
  const [borderColor, setBorderColor] = useState(data.borderColor || '#1f2937');

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Block</DialogTitle>
          <DialogDescription>Update the block title, description and color.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="block-title" className="font-bold">
              Title
            </Label>
            <Input id="block-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Block title" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="block-description" className="font-bold">
              Description
            </Label>
            <Textarea
              id="block-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this block represents..."
              rows={4}
              className="min-h-[120px] resize-y"
            />
          </div>
          <div className="grid gap-2">
            <Label className="font-bold">Navigation Map</Label>
            <div className="flex gap-3">
              <ConnectionList label="Outgoing" items={outgoing} />
              <ConnectionList label="Incoming" items={incoming} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="block-color" className="font-bold">
              Border Color
            </Label>
            <div className="flex gap-2 items-center">
              <input
                id="block-color"
                type="color"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                className="h-9 w-16 p-1 rounded-md border border-input bg-background cursor-pointer"
              />
              <PaintBucket size={16} className="text-muted-foreground" />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 size={16} className="mr-1" /> Delete Block
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onSave({ title: title.trim() || 'Untitled', description, borderColor });
                onClose();
              }}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
