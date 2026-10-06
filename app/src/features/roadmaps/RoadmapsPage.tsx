import type { RoadmapSpec } from '@shared/specs/roadmap';
import { SpecListPage } from '@/features/specs/SpecListPage';
import { plural } from '@/lib/plural';

export default function RoadmapsPage() {
  return (
    <SpecListPage<RoadmapSpec>
      app="roadmaps"
      noun="roadmap"
      placeholder="e.g., 2027 roadmap"
      cardBody={(d) => (
        <p className="mt-2 text-xs text-muted-foreground">
          {plural(d.spec.goals.length, 'goal')} · {plural(d.spec.initiatives.length, 'initiative')}
        </p>
      )}
    />
  );
}
