import type { ResearchSpec } from '@shared/specs/research';
import { SpecListPage } from '@/features/specs/SpecListPage';
import { plural } from '@/lib/plural';

export default function ResearchStudiesPage() {
  return (
    <SpecListPage<ResearchSpec>
      app="researchStudies"
      noun="study"
      placeholder="e.g., Onboarding interviews"
      cardBody={(d) => (
        <p className="mt-2 text-xs text-muted-foreground">
          {plural(d.spec.sources.length, 'source')} · {plural(d.spec.insights.length, 'insight')}
        </p>
      )}
    />
  );
}
