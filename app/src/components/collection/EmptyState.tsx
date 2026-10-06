import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Shown instead of the card grid when a collection (or a search) is empty. */
export function EmptyState({ icon: Icon, title, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card rounded-lg border border-dashed border-border">
      {Icon && <Icon size={48} className="mb-4" />}
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      {actionLabel && onAction && (
        <Button variant="outline" className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
