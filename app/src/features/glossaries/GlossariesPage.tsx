import type { GlossarySpec } from '@shared/specs/glossary';
import { SpecListPage } from '@/features/specs/SpecListPage';
import { plural } from '@/lib/plural';

export default function GlossariesPage() {
  return (
    <SpecListPage<GlossarySpec>
      app="glossaries"
      noun="glossary"
      placeholder="e.g., Domain language"
      cardBody={(d) => <p className="mt-2 text-xs text-muted-foreground">{plural(d.spec.terms.length, 'term')}</p>}
    />
  );
}
