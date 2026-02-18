import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Notebook, X } from 'lucide-react';
import ContextSelectorModal from '../GlobalContext/ContextSelectorModal';
import { ContextSource } from '../../types';

interface ContextAttachmentsFieldProps {
  label?: string;
  value: ContextSource[];
  onChange: (sources: ContextSource[]) => void;
  triggerSize?: 'sm' | 'default';
}

const ContextAttachmentsField: React.FC<ContextAttachmentsFieldProps> = ({
  label = 'Attachments',
  value,
  onChange,
  triggerSize = 'sm',
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm">{label}</span>
        <span className="text-xs text-muted-foreground">
          {value.length === 0 ? 'None' : `${value.length} attached`}
        </span>
      </div>
      <div className="flex gap-2 mt-1 items-center">
        <Button
          variant="secondary"
          size={triggerSize}
          className="cursor-pointer"
          onClick={() => setOpen(true)}
        >
          <Notebook size={14} className="mr-1" /> Attach context
        </Button>
        <div className="flex gap-1 flex-wrap">
          {value.map((s) => (
            <Badge key={`${s.type}-${s.id}`} variant="secondary" className="flex items-center gap-1 pr-1">
              <span className="truncate max-w-[160px]">
                {s.title || s.id}
              </span>
              <button
                type="button"
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-background/40"
                onClick={() =>
                  onChange(
                    value.filter(
                      (item) => !(item.type === s.type && item.id === s.id),
                    ),
                  )
                }
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
        </div>
      </div>
      <ContextSelectorModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSave={(sources) => onChange(sources)}
        initialSelectedSources={value}
        currentDefinitionId={null}
      />
    </div>
  );
};

export default ContextAttachmentsField;
