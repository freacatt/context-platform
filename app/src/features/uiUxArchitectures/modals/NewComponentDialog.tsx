import { useState } from 'react';
import { useMutation } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { LinesField, TextAreaField, TextField } from '@/components/form/fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { withErrorToast } from '@/lib/errors';

interface Props {
  designSystemId: Id<'designSystems'>;
  designSystemTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = { name: '', category: '', purpose: '', variants: [] as string[], states: [] as string[] };

/** Creates a component in the architecture's design system; pages can use it right away. */
export function NewComponentDialog({ designSystemId, designSystemTitle, open, onOpenChange }: Props) {
  const addComponent = useMutation(api.designSystems.addComponent);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof EMPTY>) => setDraft((d) => ({ ...d, ...patch }));

  const close = (next: boolean) => {
    if (!next) setDraft(EMPTY);
    onOpenChange(next);
  };

  const create = async () => {
    setBusy(true);
    const id = await withErrorToast(
      () =>
        addComponent({
          id: designSystemId,
          component: { ...draft, variants: draft.variants.filter((v) => v.trim()), states: draft.states.filter((s) => s.trim()) },
        }),
      'Could not create the component',
    );
    setBusy(false);
    if (id) {
      toast.success(`${draft.name.trim()} added to ${designSystemTitle}`);
      close(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New component</DialogTitle>
          <DialogDescription>Added to the {designSystemTitle} design system. Props, do/don't and accessibility can be filled in there.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Component name" value={draft.name} onChange={(name) => set({ name })} placeholder="Product card" />
            <TextField label="Category" value={draft.category} onChange={(category) => set({ category })} placeholder="Layout" />
          </div>
          <TextAreaField label="Purpose" rows={2} value={draft.purpose} onChange={(purpose) => set({ purpose })} placeholder="When to use it" />
          <div className="grid gap-4 sm:grid-cols-2">
            <LinesField label="Variants" rows={3} value={draft.variants} onChange={(variants) => set({ variants })} />
            <LinesField label="States" rows={3} value={draft.states} onChange={(states) => set({ states })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button disabled={busy || !draft.name.trim()} onClick={create}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create component
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
