import * as React from "react"
import { Link } from "react-router-dom"
import {
  Folder,
  ArrowUpCircleIcon,
  Database
} from "lucide-react"

import { NavMain, NavItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { ModeToggle } from "@/components/mode-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { StorageSettingsDialog } from "@/components/storage-settings-dialog"

export function WorkspacesListSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth();
  
  const navItems: NavItem[] = [
    { title: "Workspaces", url: "/workspaces", icon: Folder },
  ];

  const userData = {
    name: user?.displayName || "User",
    email: user?.email || "user@example.com",
    avatar: user?.photoURL || "",
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:!p-1.5"
                >
                <Link to="/workspaces">
                    <ArrowUpCircleIcon className="h-5 w-5" />
                    <span className="truncate font-semibold">Context Platform</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <ModeToggle />
        <SidebarMenu>
          <SidebarMenuItem>
             <StorageSettingsDialog 
               trigger={
                 <SidebarMenuButton size="lg" tooltip="Data Settings">
                   <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                     <Database className="size-4" />
                   </div>
                   <div className="grid flex-1 text-left text-sm leading-tight">
                     <span className="truncate font-semibold">Data Settings</span>
                     <span className="truncate text-xs text-muted-foreground">Storage & Export</span>
                   </div>
                 </SidebarMenuButton>
               } 
             />
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser user={userData} logout={logout} />
      </SidebarFooter>
    </Sidebar>
  )
}
