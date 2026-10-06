import { ConvexError } from 'convex/values';
import { toast } from 'sonner';

/** A user-facing message for an error thrown by a Convex function or the network. */
export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ConvexError) {
    return typeof error.data === 'string' ? error.data : fallback;
  }
  return fallback;
}

/** Runs an async action and reports failure as a toast. Returns undefined on failure. */
export async function withErrorToast<T>(action: () => Promise<T>, fallback?: string): Promise<T | undefined> {
  try {
    return await action();
  } catch (error) {
    toast.error(errorMessage(error, fallback));
    return undefined;
  }
}
