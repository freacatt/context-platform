import * as React from "react"
import { useLocation, Link } from "react-router-dom"
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
  ArrowLeft,
  Database,
  Globe,
  Download,
  Settings2
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
import { useGlobalContext } from "@/contexts/GlobalContext"
import { useAuth } from "@/contexts/AuthContext"
import { useWorkspace } from "@/contexts/WorkspaceContext"
import { useNavigate } from "react-router-dom"
import { useWorkspacePath } from "@/hooks/useWorkspacePath"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { StorageSettingsDialog } from "@/components/storage-settings-dialog"
import { McpAccessModal } from "@/components/McpAccess/McpAccessModal"
import { LocalMcpExportModal } from "@/components/LocalMcpExport/LocalMcpExportModal"

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
import { NavItem as NavItemType } from "@/components/nav-main" // Ensure correct type import if needed, assuming NavItem matches

export function WorkspaceSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth();
  const { setIsContextModalOpen, selectedSources } = useGlobalContext();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const wp = useWorkspacePath();

  // State for dynamic nav items
  const [navItems, setNavItems] = React.useState<NavItem[]>([]);
  const [isMcpModalOpen, setIsMcpModalOpen] = React.useState(false);
  const [isLocalMcpModalOpen, setIsLocalMcpModalOpen] = React.useState(false);

  // Update nav items based on workspace context and fetched data
  React.useEffect(() => {
    // Full sidebar for workspace context
    const baseItems: NavItem[] = [
      { title: "Dashboard", url: wp('/dashboard'), icon: LayoutDashboardIcon },
      { title: "AI Assistant", url: wp('/ai-chat'), icon: Bot },
      { title: "Pyramid Solver", url: wp('/pyramids'), icon: Pyramid },
      { title: "Product Definition", url: wp('/product-definitions'), icon: GitMerge },
      { title: "Context & Documents", url: wp('/context-documents'), icon: BookOpen },
      { title: "Technical Architecture", url: wp('/technical-architectures'), icon: Server },
      { title: "Technical Tasks", url: wp('/technical-tasks'), icon: CheckSquare },
      { title: "UI/UX Architecture", url: wp('/ui-ux-architectures'), icon: Layout },
      { title: "Diagrams", url: wp('/diagrams'), icon: Workflow },
    ];
    
    setNavItems(baseItems);
  }, [currentWorkspace]);

  // Fetch dynamic sub-items (pyramids, docs, etc.)
  React.useEffect(() => {
    if (!user?.uid || !currentWorkspace?.id) return;

    const fetchData = async () => {
      try {
        const workspaceId = currentWorkspace?.id;
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
          getUserPyramids(user.uid, workspaceId),
          getUserProductDefinitions(user.uid, workspaceId),
          getUserContextDocuments(user.uid, workspaceId),
          getUserDirectories(user.uid, workspaceId),
          getUserTechnicalArchitectures(user.uid, workspaceId),
          getUserUiUxArchitectures(user.uid, workspaceId),
          getUserDiagrams(user.uid, workspaceId),
          getPipelines(user.uid, workspaceId)
        ]);

        // Process Context & Documents
        const directoryMap = new Map<string, NavItem>();
        const rootDocs: NavItem[] = [];

        // Initialize directory items
        directories.forEach(dir => {
          directoryMap.set(dir.id, {
            title: dir.title,
            url: wp(`/directory/${dir.id}`),
            icon: Folder,
            items: []
          });
        });

        // Distribute documents
        documents.forEach(doc => {
          const docItem: NavItem = {
            title: doc.title,
            url: wp(`/context-document/${doc.id}`),
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
            url: wp('/dashboard'),
            icon: LayoutDashboardIcon
          },
          {
            title: "AI Assistant",
            url: wp('/ai-chat'),
            icon: Bot
          },
          {
            title: "Pyramid Solver",
            url: wp('/pyramids'),
            icon: Pyramid,
            items: pyramids.map(p => ({
              title: p.title,
              url: wp(`/pyramid/${p.id}`),
              icon: Pyramid
            }))
          },
          {
            title: "Product Definition",
            url: wp('/product-definitions'),
            icon: GitMerge,
            items: definitions.map(d => ({
              title: d.title,
              url: wp(`/product-definition/${d.id}`),
              icon: GitMerge
            }))
          },
          {
            title: "Context & Documents",
            url: wp('/context-documents'),
            icon: BookOpen,
            items: contextItems
          },
          {
            title: "Technical Architecture",
            url: wp('/technical-architectures'),
            icon: Server,
            items: techArchs.map(t => ({
              title: t.title,
              url: wp(`/technical-architecture/${t.id}`),
              icon: Server
            }))
          },
          {
            title: "Technical Tasks",
            url: wp('/technical-tasks'),
            icon: CheckSquare,
            items: pipelines.map(p => ({
              title: p.title,
              url: wp(`/technical-tasks?pipeline=${p.id}`),
              icon: ListTodo
            }))
          },
          {
            title: "UI/UX Architecture",
            url: wp('/ui-ux-architectures'),
            icon: Layout,
            items: uiUxArchs.map(u => ({
              title: u.title,
              url: wp(`/ui-ux-architecture/${u.id}`),
              icon: Layout
            }))
          },
          {
            title: "Diagrams",
            url: wp('/diagrams'),
            icon: Workflow,
            items: diagrams.map(d => ({
              title: d.title,
              url: wp(`/diagram/${d.id}`),
              icon: Workflow
            }))
          },
        ]);

      } catch (error) {
        console.error("Error fetching sidebar data:", error);
      }
    };

    fetchData();
  }, [user?.uid, currentWorkspace?.id]);

  const userData = {
    name: user?.displayName || "User",
    email: user?.email || "user@example.com",
    avatar: user?.photoURL || "",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-2 pb-2">
            <SidebarMenuItem>
                <SidebarMenuButton asChild className="text-muted-foreground hover:text-foreground">
                    <Link to="/workspaces">
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Workspaces</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
        <NavMain items={navItems} />

      </SidebarContent>
      <SidebarFooter>
        <ModeToggle />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate(wp('/ai-settings'))}
              tooltip="AI Settings"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-300">
                <Settings2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">AI Settings</span>
                <span className="truncate text-xs text-muted-foreground">Agents & Models</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => setIsContextModalOpen(true)}
              tooltip="Global Context"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                <Globe className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Global Context</span>
                <span className="truncate text-xs text-muted-foreground">
                  {selectedSources.length} sources selected
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
            size="lg" 
            onClick={() => setIsMcpModalOpen(true)}
            tooltip="MCP Access"
            >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300">
                <Server className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">MCP Access</span>
                <span className="truncate text-xs text-muted-foreground">Connect AI Agents</span>
            </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
            size="lg" 
            onClick={() => setIsLocalMcpModalOpen(true)}
            tooltip="Export Local MCP"
            >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                <Download className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Local MCP Server</span>
                <span className="truncate text-xs text-muted-foreground">Export Standalone</span>
            </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
      <McpAccessModal isOpen={isMcpModalOpen} onClose={() => setIsMcpModalOpen(false)} />
      <LocalMcpExportModal isOpen={isLocalMcpModalOpen} onClose={() => setIsLocalMcpModalOpen(false)} />
    </Sidebar>
  )
}
