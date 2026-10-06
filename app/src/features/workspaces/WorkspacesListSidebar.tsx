import { Link } from 'react-router-dom';
import { ArrowUpCircleIcon, Folder } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { NavMain } from '@/components/layout/NavMain';
import { NavUser } from '@/components/layout/NavUser';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function WorkspacesListSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link to="/workspaces">
                <ArrowUpCircleIcon className="h-5 w-5" />
                <span className="truncate font-semibold">Context Platform</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={[{ title: 'Workspaces', url: '/workspaces', icon: Folder }]} />
      </SidebarContent>
      <SidebarFooter>
        <ModeToggle />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
