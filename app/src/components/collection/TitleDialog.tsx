import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel: string;
  /** Extra form fields rendered under the title input. */
  children?: ReactNode;
  className?: string;
  /** Return false to keep the dialog open (e.g. after a failed save). */
  onSubmit: (value: string) => Promise<boolean | void>;
}

/** A dialog with one required text field, used for every create and rename. */
export function TitleDialog({
  open,
  onOpenChange,
  title,
  description,
  label = 'Title',
  placeholder,
  initialValue = '',
  submitLabel,
  children,
  className = 'sm:max-w-[450px]',
  onSubmit,
}: TitleDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    try {
      const keepOpen = (await onSubmit(value.trim())) === false;
      if (!keepOpen) onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Radix warns unless a dialog without a description opts out explicitly. */}
      <DialogContent className={className} {...(!description && { 'aria-describedby': undefined })}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title-dialog-input">{label}</Label>
              <Input
                id="title-dialog-input"
                autoFocus
                placeholder={placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            {children}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!value.trim() || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
