import * as React from "react"
import {
  Pyramid,
  GitMerge,
  BookOpen,
  Server,
  CheckSquare,
  Layout,
  Workflow,
  LayoutDashboardIcon,
  SettingsIcon,
  HelpCircleIcon,
  SearchIcon,
  ArrowUpCircleIcon,
  Bot,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useGlobalContext } from "@/contexts/GlobalContext"
import { useAuth } from "@/contexts/AuthContext"
import { Badge } from "@/components/ui/badge"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboardIcon,
    },
    {
      title: "AI Assistant",
      url: "/ai-chat",
      icon: Bot,
    },
    {
      title: "Pyramid Solver",
      url: "/pyramids",
      icon: Pyramid,
    },
    {
      title: "Product Definition",
      url: "/product-definitions",
      icon: GitMerge,
    },
    {
      title: "Context & Documents",
      url: "/context-documents",
      icon: BookOpen,
    },
    {
      title: "Technical Architecture",
      url: "/technical-architectures",
      icon: Server,
    },
    {
      title: "Technical Tasks",
      url: "/technical-tasks",
      icon: CheckSquare,
    },
    {
      title: "UI/UX Architecture",
      url: "/ui-ux-architectures",
      icon: Layout,
    },
    {
      title: "Diagrams",
      url: "/diagrams",
      icon: Workflow,
    },
  ],
  navSecondary: [
    {
      title: "Global Context",
      url: "#",
      icon: BookOpen,
      isAction: true,
      actionId: "global-context"
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth();
  const { setIsContextModalOpen, selectedSources } = useGlobalContext();

  const handleAction = (actionId?: string) => {
    if (actionId === "global-context") {
      setIsContextModalOpen(true);
    }
  };

  const navSecondaryItems = React.useMemo(() => {
    return data.navSecondary.map(item => {
      if (item.actionId === "global-context" && selectedSources.length > 0) {
        return {
          ...item,
          badge: <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white border-0">{selectedSources.length}</Badge>
        }
      }
      return item
    })
  }, [selectedSources])

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
              <a href="/">
                <ArrowUpCircleIcon className="h-5 w-5" />
                <span className="text-base font-semibold">Context Platform</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={navSecondaryItems} className="mt-auto" onAction={handleAction} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} logout={logout} />
      </SidebarFooter>
    </Sidebar>
  )
}
