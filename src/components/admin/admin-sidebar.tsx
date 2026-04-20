"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Calendar,
  Award,
  Users,
  ShoppingBag,
  Camera,
  Trophy,
  Mail,
  Settings,
  LogOut,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";

const menuItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Event", href: "/admin/event", icon: Calendar },
  { label: "Sponsors", href: "/admin/sponsors", icon: Award },
  { label: "Registrations", href: "/admin/teams", icon: Users },
  { label: "Sponsorships", href: "/admin/sponsorships", icon: ShoppingBag },
  { label: "Photos", href: "/admin/photos", icon: Camera },
  { label: "Scores", href: "/admin/scores", icon: Trophy },
  { label: "Contacts & Email", href: "/admin/contacts", icon: Mail },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Trash", href: "/admin/trash", icon: Trash2 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="bg-neutral-50">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="font-display text-base font-semibold text-foreground">CCC</span>
          <span className="font-sans text-base font-medium text-muted-foreground">Admin</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    render={<Link href={item.href} />}
                    className={cn(
                      "border-l-2 transition-colors duration-150",
                      isActive
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-neutral-50"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/" target="_blank" />}>
              <ExternalLink className="h-4 w-4" />
              <span>View Site</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut()}
              className="text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
