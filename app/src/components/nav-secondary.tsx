"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { AnimatedIcon } from "@/components/ui/animated-icon"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  onAction,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isAction?: boolean
    actionId?: string
    badge?: React.ReactNode
  }[],
  onAction?: (actionId?: string) => void
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                asChild={!item.isAction} 
                onClick={item.isAction ? (e) => {
                   e.preventDefault();
                   onAction?.(item.actionId);
                } : undefined}
                className={item.isAction ? "cursor-pointer" : ""}
              >
                {item.isAction ? (
                   <div className="flex items-center gap-2 w-full">
                     <AnimatedIcon icon={item.icon} size={18} />
                     <span>{item.title}</span>
                     {item.badge && <div className="ml-auto">{item.badge}</div>}
                   </div>
                ) : (
                  <a href={item.url}>
                    <AnimatedIcon icon={item.icon} size={18} />
                    <span>{item.title}</span>
                    {item.badge && <div className="ml-auto">{item.badge}</div>}
                  </a>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
