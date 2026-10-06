import { useId } from 'react';
import type { ModelInfo } from '@shared/ai';
import { Input } from '@/components/ui/input';
import { perMillion } from './useModels';

interface ModelInputProps {
  value: string;
  onChange: (model: string) => void;
  /** The catalog for autocompletion; free text is always allowed. */
  models: ModelInfo[] | undefined;
  placeholder?: string;
  id?: string;
  'aria-label'?: string;
  disabled?: boolean;
}

/** A model id field with autocompletion from the OpenRouter catalog and its price. */
export function ModelInput({ value, onChange, models, placeholder = 'model id, e.g. openai/gpt-4o-mini', ...rest }: ModelInputProps) {
  const listId = useId();
  const info = models?.find((m) => m.id === value.trim());
  const unknown = !!models && value.trim() !== '' && !info;
  return (
    <div className="grid gap-1">
      <Input list={listId} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} {...rest} />
      <datalist id={listId}>
        {models?.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </datalist>
      {info && (
        <span className="text-[11px] text-muted-foreground">
          {info.name} · {perMillion(info.promptPrice)} in / {perMillion(info.completionPrice)} out per 1M tokens
        </span>
      )}
      {unknown && <span className="text-[11px] text-amber-600 dark:text-amber-400">Not in the OpenRouter catalog</span>}
    </div>
  );
}
