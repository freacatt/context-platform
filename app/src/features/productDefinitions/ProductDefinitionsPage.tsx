import type { ProductSpec } from '@shared/specs/productSpec';
import { SpecListPage } from '@/features/specs/SpecListPage';
import { plural } from '@/lib/plural';

export default function ProductDefinitionsPage() {
  return (
    <SpecListPage<ProductSpec>
      app="productDefinitions"
      noun="definition"
      placeholder="e.g., Mobile app"
      cardBody={(d) => (
        <div className="mt-2 space-y-1">
          {d.spec.vision.trim() && <p className="line-clamp-2 text-sm text-muted-foreground">{d.spec.vision}</p>}
          <p className="text-xs text-muted-foreground">
            {plural(d.spec.personas.length, 'persona')} · {plural(d.spec.features.length, 'feature')}
          </p>
        </div>
      )}
    />
  );
}
