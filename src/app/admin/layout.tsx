import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
            <SidebarTrigger />
            <div className="ml-auto font-sans text-xs text-muted-foreground/60">Craven Cancer Classic Admin</div>
          </div>
          <div className="p-6">{children}</div>
        </main>
      </SidebarProvider>
    </TooltipProvider>
  );
}
