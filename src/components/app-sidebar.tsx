import { Link, useRouterState } from "@tanstack/react-router";
import {
  User, LogOut, CalendarDays, Film, Music, Mic2, Headphones, Sparkles, ListMusic, MoreHorizontal,
  LibraryBig, Home, FolderKanban, Inbox, FileSignature, MessagesSquare, Building2, Clapperboard, Tv,
  Target, ScrollText, Crosshair, Presentation, Newspaper, Palette, Trophy, Mail, FolderOpen, LineChart,
  Receipt, Share2, KanbanSquare, Handshake, Scale, Wallet, Megaphone, Users,
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
import type { AppRole } from "@/lib/use-role";

export function AppSidebar({ role }: { role: AppRole | null }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const search = useRouterState({ select: (r) => r.location.search as { role?: string } });
  const { user, signOut } = useAuth();

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
    { title: "Otros",               to: "/composers", search: { role: "other" },      icon: MoreHorizontal,   active: composersRole === "other" },
  ];

  // 2. PARTNERS (productoras, plataformas, directores, cuentas objetivo)
  const partnersItems: NavItem[] = [
    { title: "Cuentas objetivo", to: "/marketing/target-accounts", icon: Crosshair, active: pathname.startsWith("/marketing/target-accounts") },
    { title: "Productoras", to: "/production-companies", icon: Building2, active: pathname.startsWith("/production-companies") },
    { title: "Plataformas", to: "/platforms", icon: Tv, active: pathname.startsWith("/platforms") },
    { title: "Directores", to: "/directors", icon: Clapperboard, active: pathname.startsWith("/directors") },
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
    { title: "Contactos DM", to: "/deal-memos/contactos", icon: User, active: pathname.startsWith("/deal-memos/contactos") },
    { title: "Equipo IC", to: "/people", icon: Users, active: pathname.startsWith("/people") },
  ];

  // 6. MKTG
  const marketingItems: NavItem[] = [
    { title: "Calendario MKTG", to: "/marketing/calendar", icon: CalendarDays, active: pathname.startsWith("/marketing/calendar") },
    { title: "Decks de venta", to: "/marketing/decks", icon: Presentation, active: pathname.startsWith("/marketing/decks") },
    { title: "Clipping", to: "/marketing/clippings", icon: Newspaper, active: pathname.startsWith("/marketing/clippings") },
    { title: "Libro de estilo", to: "/marketing/brand", icon: Palette, active: pathname.startsWith("/marketing/brand") },
    { title: "Casos de éxito", to: "/marketing/case-studies", icon: Trophy, active: pathname.startsWith("/marketing/case-studies") },
    { title: "Plantillas", to: "/marketing/templates", icon: Mail, active: pathname.startsWith("/marketing/templates") },
    { title: "Press kits", to: "/marketing/press-kits", icon: FolderOpen, active: pathname.startsWith("/marketing/press-kits") },
    { title: "Redes sociales", to: "/marketing/social", icon: Share2, active: pathname.startsWith("/marketing/social") },
  ];

  const adminGroups: { label: string; icon: typeof Music; items: NavItem[] }[] = [
    { label: "Roster",        icon: LibraryBig,  items: rosterItems },
    { label: "Partners",      icon: Handshake,   items: partnersItems },
    { label: "Oportunidades", icon: Target,      items: opportunitiesItems },
    { label: "Económico",     icon: Wallet,      items: economicoItems },
    { label: "Legal",         icon: Scale,       items: legalItems },
    { label: "Marketing",     icon: Megaphone,   items: marketingItems },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-sidebar-primary/60 bg-sidebar-primary/20 font-display text-lg italic text-sidebar-primary-foreground">
            ic
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg text-sidebar-foreground">Interesante</span>
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
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={item.active}>
                          <Link to={item.to} search={item.search as never} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
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
