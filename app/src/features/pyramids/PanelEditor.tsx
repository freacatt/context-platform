import { Plus, X } from 'lucide-react';
import type { ModelInfo } from '@shared/ai';
import { MAX_PANELISTS } from '@shared/pyramid/config';
import type { HostConfig, PanelistConfig } from '@shared/pyramid/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModelInput } from '@/features/ai/ModelInput';

interface PanelEditorProps {
  panel: PanelistConfig[];
  onChange: (panel: PanelistConfig[]) => void;
  host: HostConfig;
  onHostChange: (host: HostConfig) => void;
  models: ModelInfo[] | undefined;
  disabled?: boolean;
}

/** Panelists (1..6 models that debate each row) and the host model that concludes it. */
export function PanelEditor({ panel, onChange, host, onHostChange, models, disabled }: PanelEditorProps) {
  const update = (i: number, patch: Partial<PanelistConfig>) => onChange(panel.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label className="font-bold">Panel</Label>
        <span className="text-xs text-muted-foreground">
          {panel.length}/{MAX_PANELISTS} panelists
        </span>
      </div>
      {panel.map((p, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_2fr_auto] gap-2 items-start">
          <ModelInput
            aria-label={`Panelist ${i + 1} model`}
            value={p.model}
            onChange={(model) => update(i, { model })}
            models={models}
            disabled={disabled}
          />
          <Input
            aria-label={`Panelist ${i + 1} name`}
            placeholder="name (optional)"
            value={p.name ?? ''}
            onChange={(e) => update(i, { name: e.target.value })}
            disabled={disabled}
          />
          <Input
            aria-label={`Panelist ${i + 1} extra prompt`}
            placeholder="extra system prompt (optional)"
            value={p.systemPrompt ?? ''}
            onChange={(e) => update(i, { systemPrompt: e.target.value })}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove panelist ${i + 1}`}
            disabled={disabled || panel.length === 1}
            onClick={() => onChange(panel.filter((_, j) => j !== i))}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || panel.length >= MAX_PANELISTS}
          onClick={() => onChange([...panel, { model: '' }])}
        >
          <Plus className="mr-2 h-4 w-4" /> Add panelist
        </Button>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pyramid-host" className="font-bold">
          Host model
        </Label>
        <ModelInput
          id="pyramid-host"
          placeholder="the model that concludes each row"
          value={host.model}
          onChange={(model) => onHostChange({ ...host, model })}
          models={models}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
