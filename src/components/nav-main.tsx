"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { AnimatedIcon } from "@/components/ui/animated-icon"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuAction,
} from "@/components/ui/sidebar"

export type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: NavItem[]
}

export function NavMain({
  items,
}: {
  items: NavItem[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <NavMainItem key={item.title + item.url} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function NavMainItem({ item }: { item: NavItem }) {
  if (!item.items?.length) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={item.title}>
          <Link to={item.url}>
            {item.icon && <AnimatedIcon icon={item.icon} size={18} />}
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible asChild className="group/collapsible">
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={item.title}>
          <Link to={item.url}>
            {item.icon && <AnimatedIcon icon={item.icon} size={18} />}
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
        <CollapsibleTrigger asChild>
          <SidebarMenuAction className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90">
            <ChevronRight />
            <span className="sr-only">Toggle {item.title}</span>
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <NavSubItem key={subItem.title + subItem.url} item={subItem} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function NavSubItem({ item }: { item: NavItem }) {
  if (!item.items?.length) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild>
          <Link to={item.url}>
            {item.icon && <item.icon className="size-4 mr-2" />}
            <span>{item.title}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }

  return (
    <SidebarMenuSubItem>
      <Collapsible className="group/sub-collapsible w-full">
        <div className="flex items-center w-full">
          <SidebarMenuSubButton asChild className="flex-1">
            <Link to={item.url}>
              {item.icon && <item.icon className="size-4 mr-2" />}
              <span>{item.title}</span>
            </Link>
          </SidebarMenuSubButton>
          <CollapsibleTrigger asChild>
            <SidebarMenuAction className="h-7 w-7 transition-transform duration-200 group-data-[state=open]/sub-collapsible:rotate-90">
              <ChevronRight className="size-4" />
            </SidebarMenuAction>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <ul className="pl-4 border-l border-sidebar-border ml-2 mt-1 space-y-1">
            {item.items.map((sub) => (
              <li key={sub.title + sub.url}>
                <SidebarMenuSubButton asChild size="sm">
                  <Link to={sub.url}>
                    {sub.icon && <sub.icon className="size-4 mr-2" />}
                    <span>{sub.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  )
}
