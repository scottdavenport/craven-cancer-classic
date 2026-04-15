"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { signOut } from "@/app/auth/actions";

const menuItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Event", href: "/admin/event", icon: Calendar },
  { label: "Sponsors", href: "/admin/sponsors", icon: Award },
  { label: "Registrations", href: "/admin/registrations", icon: Users },
  { label: "Sponsorships", href: "/admin/sponsorships", icon: ShoppingBag },
  { label: "Photos", href: "/admin/photos", icon: Camera },
  { label: "Scores", href: "/admin/scores", icon: Trophy },
  { label: "Contacts & Email", href: "/admin/contacts", icon: Mail },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-lg font-bold text-sidebar-primary">
            CCC Admin
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href)
                  }
                  render={<Link href={item.href} />}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
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
