import { useQuery } from 'convex/react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronRight, FileDown, FileText, Folder, LayoutDashboardIcon, Network, Settings, type LucideIcon } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { ModeToggle } from '@/components/mode-toggle';
import { NavMain, type NavItem } from '@/components/layout/NavMain';
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
import { WORKSPACE_APPS } from './apps';
import { useWorkspace, useWorkspacePath } from './WorkspaceContext';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

/** Live sub-items for each app, keyed by WorkspaceApp.key. */
function useAppItems(): Record<string, NavItem[]> {
  const { _id: workspaceId } = useWorkspace();
  const wp = useWorkspacePath();
  const args = { workspaceId };
  const documents = useQuery(api.contextDocuments.list, args) ?? [];
  const directories = useQuery(api.directories.list, args) ?? [];
  const lists: Record<string, { _id: string; title: string }[]> = {
    pyramids: useQuery(api.pyramids.list, args) ?? [],
    diagrams: useQuery(api.diagrams.list, args) ?? [],
    decisions: useQuery(api.decisions.list, args) ?? [],
    productDefinitions: useQuery(api.productDefinitions.list, args) ?? [],
    researchStudies: useQuery(api.researchStudies.list, args) ?? [],
    roadmaps: useQuery(api.roadmaps.list, args) ?? [],
    designSystems: useQuery(api.designSystems.list, args) ?? [],
    uiUxArchitectures: useQuery(api.uiUxArchitectures.list, args) ?? [],
    glossaries: useQuery(api.glossaries.list, args) ?? [],
    technicalArchitectures: useQuery(api.technicalArchitectures.list, args) ?? [],
    technicalPlans: useQuery(api.technicalPlans.list, args) ?? [],
  };

  const docItem = (doc: (typeof documents)[number]): NavItem => ({
    title: doc.title,
    url: wp(`/context-document/${doc._id}`),
    icon: FileText,
  });

  const items: Record<string, NavItem[]> = Object.fromEntries(
    WORKSPACE_APPS.filter((app) => lists[app.key]).map((app) => [
      app.key,
      lists[app.key].map((d) => ({ title: d.title, url: wp(`${app.itemPath}/${d._id}`), icon: app.icon })),
    ]),
  );
  items.contextDocuments = [
    ...directories.map((dir) => ({
      title: dir.title,
      url: wp(`/directory/${dir._id}`),
      icon: Folder,
      items: documents.filter((doc) => doc.directoryId === dir._id).map(docItem),
    })),
    ...documents.filter((doc) => !doc.directoryId).map(docItem),
  ];
  return items;
}

/** A large footer entry (icon tile, title, subtitle), highlighted on its own page. */
function FooterLink({ to, title, subtitle, icon: Icon }: { to: string; title: string; subtitle: string; icon: LucideIcon }) {
  const { pathname } = useLocation();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        size="lg"
        tooltip={title}
        isActive={pathname === to}
        className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
      >
        <Link to={to}>
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{title}</span>
            <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
          </div>
          <ChevronRight className="ml-auto size-4" />
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function WorkspaceSidebar() {
  const wp = useWorkspacePath();
  const appItems = useAppItems();

  const navItems: NavItem[] = [
    { title: 'Dashboard', url: wp('/dashboard'), icon: LayoutDashboardIcon },
    ...WORKSPACE_APPS.map((app) => ({
      title: app.title,
      url: wp(app.path),
      icon: app.icon,
      items: appItems[app.key],
    })),
  ];

  return (
    <Sidebar collapsible="icon">
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
        <SidebarMenu>
          <FooterLink to={wp('/knowledge-graph')} title="Knowledge graph" subtitle="Items and relations" icon={Network} />
          <FooterLink to={wp('/export-knowledge')} title="Export knowledge" subtitle="Markdown and relations" icon={FileDown} />
          <FooterLink to={wp('/settings')} title="Settings" subtitle="AI and account" icon={Settings} />
        </SidebarMenu>
        <ModeToggle />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
