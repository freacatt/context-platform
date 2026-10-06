import type { ReactNode } from 'react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

/** Sidebar + sticky header + content area shared by every signed-in screen. */
export function AppShell({ sidebar, actions, children }: { sidebar: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <SidebarProvider>
      {sidebar}
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>
        {/* SidebarInset is the page's <main> landmark. */}
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
