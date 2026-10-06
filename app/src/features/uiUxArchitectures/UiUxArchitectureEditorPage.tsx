import { useQuery } from 'convex/react';
import { useParams } from 'react-router-dom';
import { api } from '../../../convex/_generated/api';
import { SectionSpinner } from '@/components/layout/FullPageSpinner';
import { NotFound } from '@/components/layout/NotFound';
import type { UiUxArchitecture } from '@/data/types';
import { useWorkspacePath } from '@/features/workspaces/WorkspaceContext';
import { UiUxArchitectureEditor } from './UiUxArchitectureEditor';

export default function UiUxArchitectureEditorPage() {
  const { id } = useParams<{ id: string }>();
  const wp = useWorkspacePath();
  const architecture = useQuery(api.uiUxArchitectures.get, { id: id! }) as UiUxArchitecture | null | undefined;

  if (architecture === undefined) return <SectionSpinner />;
  if (architecture === null) return <NotFound what="UI/UX architecture" backTo={wp('/ui-ux-architectures')} />;
  // Keyed per document: the editor keeps a local draft and must not be reset by its own saves.
  return <UiUxArchitectureEditor key={architecture._id} architecture={architecture} />;
}
