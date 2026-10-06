import type { DesignSystemSpec } from '@shared/specs/designSystem';
import { SpecListPage } from '@/features/specs/SpecListPage';
import { plural } from '@/lib/plural';

export default function DesignSystemsPage() {
  return (
    <SpecListPage<DesignSystemSpec>
      app="designSystems"
      noun="design system"
      placeholder="e.g., Acme UI"
      cardBody={(d) => (
        <div className="mt-3 flex flex-wrap gap-1" aria-hidden>
          {d.spec.colors.slice(0, 8).map((c) => (
            <span key={c.id} className="size-5 rounded border" style={{ background: c.light }} title={c.name} />
          ))}
          <span className="ml-1 self-center text-xs text-muted-foreground">{plural(d.spec.components.length, 'component')}</span>
        </div>
      )}
    />
  );
}
