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
  Bot,
  Folder,
  FileText,
  ListTodo,
  ArrowUpCircleIcon
} from "lucide-react"

import { NavMain, NavItem } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
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
import { useGlobalContext } from "@/contexts/GlobalContext"
import { useAuth } from "@/contexts/AuthContext"
import { Badge } from "@/components/ui/badge"

// Services
import { getUserPyramids } from "@/services/pyramidService"
import { getUserProductDefinitions } from "@/services/productDefinitionService"
import { getUserContextDocuments } from "@/services/contextDocumentService"
import { getUserDirectories } from "@/services/directoryService"
import { getUserTechnicalArchitectures } from "@/services/technicalArchitectureService"
import { getUserUiUxArchitectures } from "@/services/uiUxArchitectureService"
import { getUserDiagrams } from "@/services/diagramService"
import { getPipelines } from "@/services/technicalTaskService"

// Types
import { ContextDocument, Directory } from "@/types"

const staticNavSecondary = [
  {
    title: "Global Context",
    url: "#",
    icon: BookOpen,
    isAction: true,
    actionId: "global-context"
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth();
  const { setIsContextModalOpen, selectedSources } = useGlobalContext();
  
  // State for dynamic nav items
  const [navItems, setNavItems] = React.useState<NavItem[]>([
    { title: "Dashboard", url: "/", icon: LayoutDashboardIcon },
    { title: "AI Assistant", url: "/ai-chat", icon: Bot },
    { title: "Pyramid Solver", url: "/pyramids", icon: Pyramid },
    { title: "Product Definition", url: "/product-definitions", icon: GitMerge },
    { title: "Context & Documents", url: "/context-documents", icon: BookOpen },
    { title: "Technical Architecture", url: "/technical-architectures", icon: Server },
    { title: "Technical Tasks", url: "/technical-tasks", icon: CheckSquare },
    { title: "UI/UX Architecture", url: "/ui-ux-architectures", icon: Layout },
    { title: "Diagrams", url: "/diagrams", icon: Workflow },
  ]);

  React.useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      try {
        const [
          pyramids,
          definitions,
          documents,
          directories,
          techArchs,
          uiUxArchs,
          diagrams,
          pipelines
        ] = await Promise.all([
          getUserPyramids(user.uid),
          getUserProductDefinitions(user.uid),
          getUserContextDocuments(user.uid),
          getUserDirectories(user.uid),
          getUserTechnicalArchitectures(user.uid),
          getUserUiUxArchitectures(user.uid),
          getUserDiagrams(user.uid),
          getPipelines(user.uid)
        ]);

        // Process Context & Documents
        const directoryMap = new Map<string, NavItem>();
        const rootDocs: NavItem[] = [];

        // Initialize directory items
        directories.forEach(dir => {
          directoryMap.set(dir.id, {
            title: dir.title,
            url: `/directory/${dir.id}`,
            icon: Folder,
            items: []
          });
        });

        // Distribute documents
        documents.forEach(doc => {
          const docItem: NavItem = {
            title: doc.title,
            url: `/context-document/${doc.id}`,
            icon: FileText
          };

          if (doc.directoryId && directoryMap.has(doc.directoryId)) {
            directoryMap.get(doc.directoryId)!.items!.push(docItem);
          } else {
            rootDocs.push(docItem);
          }
        });

        const contextItems = [
          ...Array.from(directoryMap.values()),
          ...rootDocs
        ];

        // Construct full nav list
        setNavItems([
          { 
            title: "Dashboard", 
            url: "/", 
            icon: LayoutDashboardIcon 
          },
          { 
            title: "AI Assistant", 
            url: "/ai-chat", 
            icon: Bot 
          },
          { 
            title: "Pyramid Solver", 
            url: "/pyramids", 
            icon: Pyramid,
            items: pyramids.map(p => ({
              title: p.title,
              url: `/pyramid/${p.id}`,
              icon: Pyramid
            }))
          },
          { 
            title: "Product Definition", 
            url: "/product-definitions", 
            icon: GitMerge,
            items: definitions.map(d => ({
              title: d.title,
              url: `/product-definition/${d.id}`,
              icon: GitMerge
            }))
          },
          { 
            title: "Context & Documents", 
            url: "/context-documents", 
            icon: BookOpen,
            items: contextItems
          },
          { 
            title: "Technical Architecture", 
            url: "/technical-architectures", 
            icon: Server,
            items: techArchs.map(t => ({
              title: t.title,
              url: `/technical-architecture/${t.id}`,
              icon: Server
            }))
          },
          { 
            title: "Technical Tasks", 
            url: "/technical-tasks", 
            icon: CheckSquare,
            items: pipelines.map(p => ({
              title: p.title,
              url: `/technical-tasks?pipeline=${p.id}`, // Just linking to main page with filter? Or just main page.
              icon: ListTodo
            }))
          },
          { 
            title: "UI/UX Architecture", 
            url: "/ui-ux-architectures", 
            icon: Layout,
            items: uiUxArchs.map(u => ({
              title: u.title,
              url: `/ui-ux-architecture/${u.id}`,
              icon: Layout
            }))
          },
          { 
            title: "Diagrams", 
            url: "/diagrams", 
            icon: Workflow,
            items: diagrams.map(d => ({
              title: d.title,
              url: `/diagram/${d.id}`,
              icon: Workflow
            }))
          },
        ]);

      } catch (error) {
        console.error("Error fetching sidebar data:", error);
      }
    };

    fetchData();
  }, [user?.uid]); // Depend on user ID

  const handleAction = (actionId?: string) => {
    if (actionId === "global-context") {
      setIsContextModalOpen(true);
    }
  };

  const navSecondaryItems = React.useMemo(() => {
    return staticNavSecondary.map(item => {
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
        <NavMain items={navItems} />
        <NavSecondary items={navSecondaryItems} className="mt-auto" onAction={handleAction} />
      </SidebarContent>
      <SidebarFooter>
        <ModeToggle />
        <NavUser user={userData} logout={logout} />
      </SidebarFooter>
    </Sidebar>
  )
}
