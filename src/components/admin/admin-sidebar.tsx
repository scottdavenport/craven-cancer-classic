"use client";

import Link from "next/link";
import Image from "next/image";
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
  useSidebar,
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

const groups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Contacts", href: "/admin/contacts", icon: Mail },
      { label: "Registrations", href: "/admin/teams", icon: Users },
    ],
  },
  {
    label: "Revenue",
    items: [
      { label: "Sponsors", href: "/admin/sponsors", icon: Award },
      { label: "Sponsorships", href: "/admin/sponsorships", icon: ShoppingBag },
    ],
  },
  {
    label: "Event Day",
    items: [
      { label: "Photos", href: "/admin/photos", icon: Camera },
      { label: "Scores", href: "/admin/scores", icon: Trophy },
    ],
  },
  {
    label: "Setup",
    items: [
      { label: "Event", href: "/admin/event", icon: Calendar },
      { label: "Settings", href: "/admin/settings", icon: Settings },
      { label: "Trash", href: "/admin/trash", icon: Trash2 },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const logoSrc = state === "collapsed" ? "/brand/ccc-logo-mark.svg" : "/brand/ccc-logo-full.svg";

  return (
    <Sidebar className="bg-neutral-50">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          <Image
            src={logoSrc}
            alt="CCC"
            width={120}
            height={43}
            priority
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
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
        ))}
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
