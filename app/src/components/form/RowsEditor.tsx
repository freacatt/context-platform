import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface RowColumn<T> {
  key: keyof T & string;
  label: string;
  placeholder?: string;
  /** Custom cell (e.g. a color picker); defaults to a text input. */
  render?: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  className?: string;
}

interface Props<T extends { id: string }> {
  label: string;
  noun: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  columns: RowColumn<T>[];
  /** Live preview of a row (swatch, type sample, spacing bar). */
  preview?: (item: T) => ReactNode;
}

/** A compact table of rows of short fields (tokens, props). */
export function RowsEditor<T extends { id: string }>({ label, noun, items, onChange, create, columns, preview }: Props<T>) {
  const update = (index: number, patch: Partial<T>) => onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <section className="space-y-2" aria-label={label}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, create()])}>
          <Plus className="mr-1.5 h-4 w-4" /> Add {noun}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {noun}s yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                {preview && <th className="w-24 px-2 py-1.5 font-medium">Preview</th>}
                {columns.map((c) => (
                  <th key={c.key} className={`px-2 py-1.5 font-medium ${c.className ?? ''}`}>
                    {c.label}
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className="border-t align-middle">
                  {preview && <td className="px-2 py-1.5">{preview(item)}</td>}
                  {columns.map((c) => (
                    <td key={c.key} className={`px-1 py-1 ${c.className ?? ''}`}>
                      {c.render ? (
                        c.render(item, (patch) => update(i, patch))
                      ) : (
                        <Input
                          aria-label={`${noun} ${i + 1} ${c.label}`}
                          className="h-8"
                          value={String(item[c.key] ?? '')}
                          placeholder={c.placeholder}
                          onChange={(e) => update(i, { [c.key]: e.target.value } as Partial<T>)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-1">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remove ${noun} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
