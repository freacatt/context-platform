import { ARCHITECTURE_STYLES, type TechnicalArchitectureSpec } from '@shared/specs/technicalArchitecture';
import { Badge } from '@/components/ui/badge';
import { SpecListPage } from '@/features/specs/SpecListPage';
import { plural } from '@/lib/plural';

export default function TechnicalArchitecturesPage() {
  return (
    <SpecListPage<TechnicalArchitectureSpec>
      app="technicalArchitectures"
      noun="architecture"
      placeholder="e.g., Platform backend"
      cardBody={(d) => (
        <div className="mt-3 space-y-2">
          {d.spec.summary.trim() && <p className="line-clamp-2 text-sm text-muted-foreground">{d.spec.summary}</p>}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {d.spec.style && <Badge variant="secondary">{ARCHITECTURE_STYLES.labels[d.spec.style]}</Badge>}
            <span>
              {plural(d.spec.components.length, 'component')} · {plural(d.spec.stack.length, 'technology', 'technologies')}
            </span>
          </div>
        </div>
      )}
    />
  );
}
