/**
 * Form fields of the spec editors. Every field is controlled by its parent (the editor's local
 * draft) and labelled, so tests and screen readers find it by its label.
 */
import { useId, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: string;
  hint?: string;
  className?: string;
}

function Labelled({ id, label, hint, className, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id} className="font-semibold">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextField({ label, hint, className, value, onChange, placeholder, type = 'text' }: FieldProps & { value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  const id = useId();
  return (
    <Labelled id={id} label={label} hint={hint} className={className}>
      <Input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Labelled>
  );
}

export function TextAreaField({ label, hint, className, value, onChange, placeholder, rows = 4 }: FieldProps & { value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  const id = useId();
  return (
    <Labelled id={id} label={label} hint={hint} className={className}>
      <Textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Labelled>
  );
}

/** A list of short strings, edited one per line. */
export function LinesField({ label, hint, className, value, onChange, placeholder, rows = 4 }: FieldProps & { value: string[]; onChange: (value: string[]) => void; placeholder?: string; rows?: number }) {
  const id = useId();
  return (
    <Labelled id={id} label={label} hint={hint ?? 'One per line'} className={className}>
      <Textarea id={id} rows={rows} value={value.join('\n')} placeholder={placeholder} onChange={(e) => onChange(e.target.value === '' ? [] : e.target.value.split('\n'))} />
    </Labelled>
  );
}

export function SelectField<T extends string>({
  label,
  hint,
  className,
  value,
  onChange,
  options,
}: FieldProps & { value: T; onChange: (value: T) => void; options: readonly { value: T; label: string }[] }) {
  const id = useId();
  return (
    <Labelled id={id} label={label} hint={hint} className={className}>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger id={id} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Labelled>
  );
}

interface EntryListProps<T extends { id: string }> {
  /** Heading of the list, also used in button labels ("Add persona"). */
  label: string;
  noun: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  /** Title of an entry's card (e.g. its name). */
  title: (item: T, index: number) => string;
  render: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  empty?: string;
  className?: string;
  /** DOM id of an entry's card (to scroll to it). */
  anchorId?: (item: T) => string;
  /** Hide the "Add" button (when the page adds entries elsewhere). */
  hideAdd?: boolean;
}

/** A list of structured entries as cards, with add, remove and reorder. */
export function EntryList<T extends { id: string }>({ label, noun, items, onChange, create, title, render, empty, className, anchorId, hideAdd }: EntryListProps<T>) {
  const update = (index: number, patch: Partial<T>) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const move = (index: number, by: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    onChange(next);
  };
  return (
    <section className={cn('space-y-3', className)} aria-label={label}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        {!hideAdd && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, create()])}>
            <Plus className="mr-1.5 h-4 w-4" /> Add {noun}
          </Button>
        )}
      </div>
      {items.length === 0 && <p className="text-sm text-muted-foreground">{empty ?? `No ${noun}s yet.`}</p>}
      {items.map((item, i) => {
        const name = title(item, i) || `Untitled ${noun}`;
        return (
          <Card key={item.id} id={anchorId?.(item)} data-testid={`entry-${noun}`} className="scroll-mt-28">
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center gap-1">
                <p className="flex-1 truncate text-sm font-medium text-muted-foreground">{name}</p>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Move ${name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Move ${name} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Remove ${name}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {render(item, (patch) => update(i, patch))}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
