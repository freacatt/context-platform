import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Background of the icon tile, e.g. "bg-indigo-600". */
  iconClassName?: string;
  /** Buttons on the right. */
  actions?: ReactNode;
  /** Above the title, e.g. a back button. */
  back?: ReactNode;
}

/** The header every feature page uses: app icon tile, title, description, actions. */
export function PageHeader({ title, description, icon: Icon, iconClassName = 'bg-primary', actions, back }: PageHeaderProps) {
  return (
    <div className="mb-8 mt-6">
      {back && <div className="mb-4 -ml-2">{back}</div>}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-white ${iconClassName}`}>
              <Icon size={20} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{title}</h1>
            {description && <p className="text-muted-foreground text-sm mt-1 max-w-2xl">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
