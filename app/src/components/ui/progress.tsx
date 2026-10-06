import * as React from 'react';

import { cn } from '@/lib/utils';

/** A determinate progress bar (0..100). */
const Progress = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value?: number }>(
  ({ className, value = 0, ...props }, ref) => {
    const clamped = Math.min(100, Math.max(0, value));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', className)}
        {...props}
      >
        <div className="h-full bg-primary transition-all" style={{ width: `${clamped}%` }} />
      </div>
    );
  },
);
Progress.displayName = 'Progress';

export { Progress };
