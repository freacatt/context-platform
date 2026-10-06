import { Loader2 } from 'lucide-react';

export function FullPageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center" role="status" aria-label="Loading">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function SectionSpinner() {
  return (
    <div className="flex justify-center py-12" role="status" aria-label="Loading">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
