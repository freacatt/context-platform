import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Shown when a document id in the URL does not exist or belongs to someone else. */
export function NotFound({ what, backTo }: { what: string; backTo: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
      <h2 className="text-lg font-semibold">{what} not found</h2>
      <p className="text-sm">It may have been deleted.</p>
      <Button asChild variant="outline">
        <Link to={backTo}>Go back</Link>
      </Button>
    </div>
  );
}
