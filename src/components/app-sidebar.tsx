import { Link, useRouterState } from "@tanstack/react-router";
import {
  User, LogOut, CalendarDays, Film, Music, Mic2, Headphones, Sparkles, ListMusic,
  LibraryBig, Home, FolderKanban, Inbox, FileSignature, MessagesSquare, Building2, Clapperboard, Tv,
  Target, ScrollText, Crosshair, Presentation, Newspaper, Palette, Trophy, Mail, FolderOpen, LineChart,
  Receipt, Share2, KanbanSquare, Handshake, Scale, Wallet, Megaphone, Users, Briefcase, Database, Plus, ListChecks,
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
import { SidebarMenuAction } from "@/components/ui/sidebar";
import type { TaskArea } from "@/lib/task-areas";

export function AppSidebar({ role }: { role: AppRole | null }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const search = useRouterState({ select: (r) => r.location.search as { role?: string } });
  const { user, signOut } = useAuth();
  const { open: openNewTask } = useNewTaskDialog();

  const { data: pendingAgentActions } = useQuery({
    queryKey: ["agent-actions-pending-count"],
    enabled: role === "admin",
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("agent_actions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  const composerActive = pathname.startsWith("/composers");
  const composersRole = composerActive ? (search?.role ?? "composer") : null;

  type NavItem = {
    title: string;
    to: string;
    search?: Record<string, string>;
    icon: typeof Music;
    active: boolean;
  };
  // 1. ROSTER
  const rosterItems: NavItem[] = [
    { title: "Roster completo", to: "/roster", icon: LibraryBig, active: pathname.startsWith("/roster") },
    { title: "Compositores",        to: "/composers", search: { role: "composer" },   icon: Music,            active: composersRole === "composer" },
    { title: "Artistas",            to: "/composers", search: { role: "artist" },     icon: Mic2,             active: composersRole === "artist" },
    { title: "Supervisores musicales", to: "/composers", search: { role: "supervisor" }, icon: Headphones,    active: composersRole === "supervisor" },
    { title: "Especialistas",       to: "/composers", search: { role: "specialist" }, icon: Sparkles,         active: composersRole === "specialist" },
    { title: "Curadores musicales", to: "/composers", search: { role: "curator" },    icon: ListMusic,        active: composersRole === "curator" },
    { title: "Interesante Compañía", to: "/ic", icon: Building2,                       active: pathname.startsWith("/ic") },
  ];

  // 2. PARTNERS (productoras, plataformas, directores, cuentas objetivo)
  const partnersItems: NavItem[] = [
    { title: "Cuentas objetivo", to: "/marketing/target-accounts", icon: Crosshair, active: pathname.startsWith("/marketing/target-accounts") },
    { title: "Productoras", to: "/production-companies", icon: Building2, active: pathname.startsWith("/production-companies") },
    { title: "Plataformas", to: "/platforms", icon: Tv, active: pathname.startsWith("/platforms") },
    { title: "Directores", to: "/directors", icon: Clapperboard, active: pathname.startsWith("/directors") },
    { title: "Proveedores", to: "/providers", icon: Briefcase, active: pathname.startsWith("/providers") },
    { title: "Películas ES", to: "/peliculas-es", icon: Database, active: pathname.startsWith("/peliculas-es") },
  ];

  // 3. OPORTUNIDADES
  const opportunitiesItems: NavItem[] = [
    { title: "Oportunidades", to: "/opportunities", icon: Target, active: pathname.startsWith("/opportunities") },
  ];

  // 4. ECONÓMICO
  const economicoItems: NavItem[] = [
    { title: "Dashboard económico", to: "/finance", icon: LineChart, active: pathname.startsWith("/finance") || pathname.startsWith("/budget") },
    { title: "Producciones", to: "/productions", icon: Film, active: pathname.startsWith("/productions") },
    { title: "Deal memos", to: "/deal-memos", icon: KanbanSquare, active: pathname === "/deal-memos" || pathname.startsWith("/deal-memos/lista") || pathname.startsWith("/deal-memos/configuracion") },
    { title: "Plan facturación IC", to: "/billing", icon: Receipt, active: pathname.startsWith("/billing") },
  ];

  // 5. LEGAL
  const legalItems: NavItem[] = [
    { title: "Contratos", to: "/contracts", icon: ScrollText, active: pathname.startsWith("/contracts") },
    { title: "Plantillas DM", to: "/deal-memos/plantillas", icon: FileSignature, active: pathname.startsWith("/deal-memos/plantillas") },
    { title: "Equipo IC", to: "/people", icon: Users, active: pathname.startsWith("/people") },
    { title: "Acciones agentes", to: "/agent-actions", icon: Sparkles, active: pathname.startsWith("/agent-actions") },
  ];

  // 6. MKTG
  const marketingItems: NavItem[] = [
    { title: "Decks de venta", to: "/marketing/decks", icon: Presentation, active: pathname.startsWith("/marketing/decks") },
    { title: "Clipping", to: "/marketing/clippings", icon: Newspaper, active: pathname.startsWith("/marketing/clippings") },
    { title: "Libro de estilo", to: "/marketing/brand", icon: Palette, active: pathname.startsWith("/marketing/brand") },
    { title: "Casos de éxito", to: "/marketing/case-studies", icon: Trophy, active: pathname.startsWith("/marketing/case-studies") },
    { title: "Plantillas", to: "/marketing/templates", icon: Mail, active: pathname.startsWith("/marketing/templates") },
    { title: "Press kits", to: "/marketing/press-kits", icon: FolderOpen, active: pathname.startsWith("/marketing/press-kits") },
    { title: "Redes sociales", to: "/marketing/social", icon: Share2, active: pathname.startsWith("/marketing/social") },
  ];

  // 7. CALENDARIOS — todas las vistas (presets de /calendar)
  const calView = (search as { view?: string } | undefined)?.view;
  const onCal = pathname.startsWith("/calendar");
  const calendarItems: NavItem[] = [
    { title: "General",      to: "/calendar", search: { view: "global" },       icon: CalendarDays, active: onCal && (calView === "global" || !calView) },
    { title: "Producciones", to: "/calendar", search: { view: "producciones" }, icon: Film,         active: onCal && calView === "producciones" },
    { title: "Facturación",  to: "/calendar", search: { view: "economico" },    icon: Receipt,      active: onCal && calView === "economico" },
    { title: "Marketing",    to: "/calendar", search: { view: "marketing" },    icon: Megaphone,    active: onCal && calView === "marketing" },
    { title: "Legal",        to: "/calendar", search: { view: "legal" },        icon: Scale,        active: onCal && calView === "legal" },
    { title: "Personal · mis tareas", to: "/calendar", search: { view: "personal" }, icon: User,    active: onCal && calView === "personal" },
  ];

  const adminGroups: { label: string; icon: typeof Music; items: NavItem[]; area?: TaskArea }[] = [
    { label: "Roster",        icon: LibraryBig,  items: rosterItems,        area: "roster" },
    { label: "Partners",      icon: Handshake,   items: partnersItems },
    { label: "Oportunidades", icon: Target,      items: opportunitiesItems, area: "oportunidades" },
    { label: "Económico",     icon: Wallet,      items: economicoItems,     area: "economico" },
    { label: "Legal",         icon: Scale,       items: legalItems,         area: "legal" },
    { label: "Marketing",     icon: Megaphone,   items: marketingItems,     area: "marketing" },
    { label: "Calendarios",   icon: CalendarDays, items: calendarItems },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-5">
        <Link to="/" className="flex items-center gap-3">
          <BrandLogo
            variant="noir"
            className={collapsed ? "h-10 w-10 object-contain" : "h-14 w-14 object-contain"}
          />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-xl text-sidebar-foreground">Interesante</span>
              <span className="smallcaps text-sidebar-foreground/60">Compañía</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {role === "admin" ? (
          <>
            {adminGroups.map((group) => (
              <SidebarGroup key={group.label}>
                {!collapsed && (
                  <SidebarGroupLabel className="smallcaps flex items-center gap-1.5">
                    <group.icon className="h-3 w-3" />
                    <span className="flex-1">{group.label}</span>
                    {group.area && (
                      <button
                        type="button"
                        onClick={() => openNewTask({ area: group.area })}
                        className="rounded-sm p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title={`Nueva tarea en ${group.label}`}
                        aria-label={`Nueva tarea en ${group.label}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.area && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith("/tareas")}>
                          <Link to="/tareas" className="flex items-center gap-2">
                            <ListChecks className="h-4 w-4" />
                            {!collapsed && <span>Mis tareas</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={item.active}>
                          <Link to={item.to} search={item.search as never} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            {!collapsed && (
                              <span className="flex flex-1 items-center justify-between gap-2">
                                <span>{item.title}</span>
                                {item.to === "/agent-actions" && (pendingAgentActions ?? 0) > 0 && (
                                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                                    {pendingAgentActions}
                                  </span>
                                )}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </>
        ) : (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="smallcaps">Mi portal</SidebarGroupLabel>}
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
