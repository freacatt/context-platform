import type { KeyboardEvent, ReactNode } from 'react';
import { ArrowRight, Clock, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface CollectionCardProps {
  title: string;
  timestamp: number;
  timestampLabel?: string;
  onOpen: () => void;
  /** DropdownMenuItems for the card's actions menu. */
  menu: ReactNode;
  /** Optional body under the title (preview text, badges); stop click propagation on controls. */
  children?: ReactNode;
  /** The app's icon, shown in a tile tinted with the app's colour. */
  icon?: LucideIcon;
  /** Tint of the icon tile, e.g. "bg-indigo-500/10 text-indigo-600". */
  iconClassName?: string;
}

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** One item of a collection: the same card on every feature page. */
export function CollectionCard({
  title,
  timestamp,
  timestampLabel = 'Updated',
  onOpen,
  menu,
  children,
  icon: Icon,
  iconClassName = 'bg-muted text-muted-foreground',
}: CollectionCardProps) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      data-testid="collection-item"
      role="link"
      tabIndex={0}
      aria-label={`Open ${title}`}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className="group relative flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground shadow-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}>
            <Icon size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="font-semibold leading-snug text-foreground line-clamp-2 break-words" title={title}>
            {title}
          </h3>
        </div>
        <div className="-mr-2 -mt-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground opacity-70 group-hover:opacity-100 data-[state=open]:opacity-100"
                aria-label={`Actions for ${title}`}
              >
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {children && <div className="flex flex-col gap-2">{children}</div>}

      <div className="mt-auto flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock size={12} />
          {timestampLabel} {formatDate(timestamp)}
        </span>
        <span className="flex items-center gap-1 font-medium text-foreground/70 transition-colors group-hover:text-foreground">
          Open
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  );
}
