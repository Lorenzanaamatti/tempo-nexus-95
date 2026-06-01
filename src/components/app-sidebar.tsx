import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Mic2,
  Wallet,
  BarChart3,
  Disc3,
  FolderKanban,
  Users,
  FileSignature,
  HardDrive,
  Film,
  Calendar,
  Bot,
  Map,
  Inbox,
  Zap,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";

const groups = [
  {
    label: "Visión",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { title: "Presupuestos", url: "/budgets", icon: Wallet },
      { title: "Facturas", url: "/invoices", icon: FileSignature },
      { title: "Cashflow", url: "/cashflow", icon: BarChart3 },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { title: "Booking", url: "/booking", icon: Mic2 },
      { title: "TourMap", url: "/tourmap", icon: Map },
      { title: "Hojas de ruta", url: "/roadmaps", icon: Map },
      { title: "Calendario", url: "/calendar", icon: Calendar },
    ],
  },
  {
    label: "Creatividad",
    items: [
      { title: "Discografía", url: "/discografia", icon: Disc3 },
      { title: "Sincronizaciones", url: "/sync", icon: Film },
      { title: "Proyectos", url: "/projects", icon: FolderKanban },
    ],
  },
  {
    label: "Personas",
    items: [
      { title: "Contactos", url: "/contacts", icon: Users },
      { title: "Contratos", url: "/contracts", icon: FileSignature },
      { title: "Drive", url: "/drive", icon: HardDrive },
    ],
  },
  {
    label: "Inteligencia",
    items: [
      { title: "Moodita Copilot", url: "/copilot", icon: Bot },
      { title: "Action Center", url: "/action-center", icon: Inbox },
      { title: "Automatizaciones", url: "/automations", icon: Zap },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-display font-bold">
            L
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm font-semibold">Lorenzana</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Music OS
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider">
                {g.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {!collapsed && <span>Ajustes</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
              {!collapsed && (
                <span className="truncate">
                  {user?.email ? `Salir · ${user.email}` : "Salir"}
                </span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
