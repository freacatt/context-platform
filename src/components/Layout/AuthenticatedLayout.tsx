import React from 'react';
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import APIKeyModal from "../Navbar/APIKeyModal"
import GlobalContextManager from "../GlobalContext/GlobalContextManager"
import { WorkspaceActions } from "@/components/WorkspaceActions"

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-sidebar">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto flex items-center gap-2">
            <WorkspaceActions />
            <APIKeyModal />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
        <GlobalContextManager />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AuthenticatedLayout;
