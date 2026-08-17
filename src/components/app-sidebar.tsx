import { Link, useRouterState } from "@tanstack/react-router";
import {
  User, LogOut, CalendarDays, Film, Music, Mic2, Headphones, Sparkles, ListMusic,
  LibraryBig, Home, FolderKanban, Inbox, FileSignature, MessagesSquare, Building2, Clapperboard, Tv,
  Target, ScrollText, Crosshair, Presentation, Newspaper, Palette, Trophy, Mail, FolderOpen, LineChart,
  Receipt, Share2, KanbanSquare, Handshake, Scale, Wallet, Megaphone, Users, Briefcase, Database, Plus,
  ListChecks,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import type { AppRole } from "@/lib/use-role";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useNewTaskDialog } from "@/components/new-task-dialog";
import { useMyDueTaskCount } from "@/lib/use-my-tasks";
import type { TaskArea } from "@/lib/task-areas";
import { setSessionView, type SessionView, SESSION_VIEW_LABEL } from "@/lib/session-view";
import { RefreshCw, Home as HomeIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { NAV_GROUPS, isItemActive, findNavLocation, type NavGroup, type NavItem } from "@/lib/nav-tree";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

export function AppSidebar({ role, sessionView }: { role: AppRole | null; sessionView?: SessionView | null }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const search = useRouterState({ select: (r) => r.location.search as { role?: string } });
  const { user, signOut } = useAuth();
  const { open: openNewTask } = useNewTaskDialog();
  const nav = useNavigate();

  // For non-admin roles, the session view is irrelevant (they get their own tree).
  // For admin, default to "bigc" (full) if nothing has been chosen.
  const effectiveView: SessionView = role === "admin" ? sessionView ?? "bigc" : "bigc";
  const isRosterView = role === "admin" && effectiveView === "roster";
  const isTeamView = role === "admin" && effectiveView === "team";

  const { data: myDueTasks } = useMyDueTaskCount();

  const { data: pendingAgentActions } = useQuery({
    queryKey: ["agent-actions-pending-count"],
    enabled: role === "admin",
    refetchInterval: 120000,
    queryFn: async () => {
      const { count } = await supabase
        .from("agent_actions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  // Solicitudes de alta pendientes de aprobación (solo BIG C).
  const { data: pendingUsers } = useQuery({
    queryKey: ["pending-users-count"],
    enabled: role === "admin",
    refetchInterval: 120000,
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  const groups = NAV_GROUPS
    .filter((g) => !(g.bigCOnly && isTeamView))
    .map((g) =>
      isTeamView && g.label === "Legal"
        ? { ...g, items: g.items.filter((i) => i.to !== "/agent-actions") }
        : g,
    );

  const visibleAdminGroups = groups;


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-5">
        <Link to="/" className="flex items-center justify-center" aria-label="Interesante Compañía">
          {collapsed ? (
            // Collapsed rail: show a compact "int." mark cropped from the wordmark.
            <div className="h-9 w-9 overflow-hidden">
              <BrandLogo variant="clear" className="h-9 w-auto max-w-none object-cover object-left" />
            </div>
          ) : (
            <BrandLogo variant="clear" className="h-8 w-auto object-contain" />
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {role === "admin" && !isRosterView ? (
          <>
            <SidebarGroup>
              {!collapsed && (
                <SidebarGroupLabel className="flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                  <ListChecks className="h-3 w-3" />
                  <span className="flex-1">Tareas</span>
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith("/tareas")}>
                      <Link to="/tareas" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {!collapsed && (
                          <span className="flex flex-1 items-center justify-between gap-2">
                            <span>Personal · mis tareas</span>
                            {(myDueTasks ?? 0) > 0 && (
                              <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                                {myDueTasks}
                              </span>
                            )}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => openNewTask({})} title="Nueva tarea">
                      <Plus className="h-4 w-4 text-primary" />
                      {!collapsed && <span>Nueva tarea</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {visibleAdminGroups.map((group) => (
              <NavGroupSection
                key={group.label}
                group={group}
                collapsed={collapsed}
                pathname={pathname}
                search={search}
                pendingAgentActions={pendingAgentActions ?? 0}
              />
            ))}
          </>
        ) : (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="font-display text-sm font-semibold uppercase tracking-[0.12em]">Mi portal</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { to: "/portal", label: "Inicio", icon: Home, exact: true },
                  { to: "/portal/carrera", label: "Mi carrera", icon: User },
                  { to: "/portal/kpis", label: "KPIs", icon: LineChart },
                  { to: "/portal/proyectos", label: "Proyectos activos", icon: FolderKanban },
                  { to: "/portal/propuestas", label: "Propuestas en curso", icon: Inbox },
                  { to: "/portal/facturacion", label: "Facturación", icon: Receipt },
                  { to: "/portal/contratos", label: "Contratos y derechos", icon: FileSignature },
                  { to: "/portal/agenda", label: "Agenda y reuniones", icon: CalendarDays },
                  { to: "/portal/chat", label: "Chat con IC", icon: MessagesSquare },
                  { to: "/portal/mensajes", label: "Materiales compartidos", icon: MessagesSquare },
                ].map((item) => {
                  const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.to as never} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.label}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          {role === "admin" && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/users")}>
                <Link to="/users" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {!collapsed && (
                    <span className="flex flex-1 items-center justify-between gap-2 truncate text-xs">
                      <span>Usuarios y permisos</span>
                      {(pendingUsers ?? 0) > 0 && (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                          {pendingUsers}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {role === "admin" && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => {
                  setSessionView(null);
                  nav({ to: "/vista" });
                }}
                title="Cambiar vista de sesión"
              >
                <RefreshCw className="h-4 w-4" />
                {!collapsed && (
                  <span className="truncate text-xs">
                    Vista · {SESSION_VIEW_LABEL[effectiveView]}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {isRosterView && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/portal" className="flex items-center gap-2">
                  <HomeIcon className="h-4 w-4" />
                  {!collapsed && <span className="truncate text-xs">Ir al portal</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <div className={collapsed ? "flex justify-center py-1" : "flex items-center justify-between gap-2 px-2 py-1"}>
              {!collapsed && (
                <span className="smallcaps text-sidebar-foreground/60">Tema</span>
              )}
              <ThemeToggle />
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
              {!collapsed && (
                <span className="truncate text-xs">
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

const OPEN_KEY = "ic:sidebar-open-groups";

function readOpenGroups(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(OPEN_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

function NavGroupSection({
  group,
  collapsed,
  pathname,
  search,
  pendingAgentActions,
}: {
  group: NavGroup;
  collapsed: boolean;
  pathname: string;
  search: { role?: string };
  pendingAgentActions: number;
}) {
  const active = findNavLocation(pathname, search)?.group.label === group.label;
  const [open, setOpen] = useState(active);

  // Abre automáticamente el grupo de la ruta actual; el resto recuerda su estado.
  useEffect(() => {
    if (active) {
      setOpen(true);
      return;
    }
    setOpen(readOpenGroups()[group.label] ?? false);
  }, [active, group.label]);

  function toggle(next: boolean) {
    setOpen(next);
    if (typeof window === "undefined") return;
    const stored = readOpenGroups();
    stored[group.label] = next;
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify(stored));
    } catch {
      /* almacenamiento no disponible */
    }
  }

  if (collapsed) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {group.items.map((item: NavItem) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isItemActive(item, pathname, search)} tooltip={item.title}>
                  <Link to={item.to} search={item.search as never}>
                    <item.icon className="h-4 w-4" />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={toggle}>
      <SidebarGroup>
        <CollapsibleTrigger className="w-full">
          <SidebarGroupLabel
            aria-current={active ? "true" : undefined}
            className={`flex w-full items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-[0.12em] hover:text-sidebar-accent-foreground ${
              active ? "text-primary" : ""
            }`}
          >
            <group.icon className="h-3 w-3" />
            <span className="flex-1 text-left">{group.label}</span>
            {active && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />}
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item: NavItem) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isItemActive(item, pathname, search)}>
                    <Link to={item.to} search={item.search as never} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span className="flex flex-1 items-center justify-between gap-2">
                        <span>{item.title}</span>
                        {item.to === "/agent-actions" && pendingAgentActions > 0 && (
                          <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                            {pendingAgentActions}
                          </span>
                        )}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
