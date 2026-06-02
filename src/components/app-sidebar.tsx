import { Link, useRouterState } from "@tanstack/react-router";
import { User, LogOut, CalendarDays, UserCircle2, Film, Music, Mic2, Headphones, Sparkles, ListMusic, MoreHorizontal, LibraryBig, Home, FolderKanban, Inbox, FileSignature, MessagesSquare, Building2, Clapperboard, Tv, Wallet, Target, ScrollText, Crosshair, Presentation, Newspaper, Palette, Trophy, Mail, FolderOpen } from "lucide-react";
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
  const isPeople = pathname.startsWith("/people");
  const peopleRole = isPeople ? search?.role ?? "all" : null;

  type NavItem = {
    title: string;
    to: string;
    search?: Record<string, string>;
    icon: typeof Music;
    active: boolean;
  };
  const rosterItems: NavItem[] = [
    { title: "Roster completo", to: "/roster", icon: LibraryBig, active: pathname.startsWith("/roster") },
    { title: "Compositores",        to: "/composers", search: { role: "composer" },   icon: Music,            active: composersRole === "composer" },
    { title: "Artistas",            to: "/composers", search: { role: "artist" },     icon: Mic2,             active: composersRole === "artist" },
    { title: "Supervisores musicales", to: "/composers", search: { role: "supervisor" }, icon: Headphones,    active: composersRole === "supervisor" },
    { title: "Especialistas",       to: "/composers", search: { role: "specialist" }, icon: Sparkles,         active: composersRole === "specialist" },
    { title: "Curadores musicales", to: "/composers", search: { role: "curator" },    icon: ListMusic,        active: composersRole === "curator" },
    { title: "Otros",               to: "/composers", search: { role: "other" },      icon: MoreHorizontal,   active: composersRole === "other" },
  ];
  const otherItems: NavItem[] = [
    { title: "Equipo IC", to: "/people", search: { role: "ic_team" }, icon: UserCircle2, active: peopleRole === "ic_team" },
    { title: "Producciones", to: "/productions", icon: Film, active: pathname.startsWith("/productions") },
    { title: "Oportunidades", to: "/opportunities", icon: Target, active: pathname.startsWith("/opportunities") },
    { title: "Contratos", to: "/contracts", icon: ScrollText, active: pathname.startsWith("/contracts") },
    { title: "Presupuesto", to: "/budget", icon: Wallet, active: pathname.startsWith("/budget") },
    { title: "Productoras", to: "/production-companies", icon: Building2, active: pathname.startsWith("/production-companies") },
    { title: "Directores", to: "/directors", icon: Clapperboard, active: pathname.startsWith("/directors") },
    { title: "Plataformas", to: "/platforms", icon: Tv, active: pathname.startsWith("/platforms") },
    { title: "Calendario", to: "/calendar", icon: CalendarDays, active: pathname.startsWith("/calendar") },
  ];
  const marketingItems: NavItem[] = [
    { title: "Cuentas objetivo", to: "/marketing/target-accounts", icon: Crosshair, active: pathname.startsWith("/marketing/target-accounts") },
    { title: "Decks de venta", to: "/marketing/decks", icon: Presentation, active: pathname.startsWith("/marketing/decks") },
    { title: "Clipping", to: "/marketing/clippings", icon: Newspaper, active: pathname.startsWith("/marketing/clippings") },
    { title: "Libro de estilo", to: "/marketing/brand", icon: Palette, active: pathname.startsWith("/marketing/brand") },
    { title: "Casos de éxito", to: "/marketing/case-studies", icon: Trophy, active: pathname.startsWith("/marketing/case-studies") },
    { title: "Plantillas", to: "/marketing/templates", icon: Mail, active: pathname.startsWith("/marketing/templates") },
    { title: "Press kits", to: "/marketing/press-kits", icon: FolderOpen, active: pathname.startsWith("/marketing/press-kits") },
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
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel className="smallcaps">Roster</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {rosterItems.map((item) => (
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
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel className="smallcaps">Gestión</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {otherItems.map((item) => (
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
            <SidebarGroup>
              {!collapsed && <SidebarGroupLabel className="smallcaps">Marketing y Ventas</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {marketingItems.map((item) => (
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
          </>
        ) : (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="smallcaps">Mi portal</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { to: "/portal", label: "Inicio", icon: Home, exact: true },
                  { to: "/portal/carrera", label: "Mi carrera", icon: User },
                  { to: "/portal/proyectos", label: "Proyectos activos", icon: FolderKanban },
                  { to: "/portal/propuestas", label: "Propuestas en curso", icon: Inbox },
                  { to: "/portal/contratos", label: "Contratos y derechos", icon: FileSignature },
                  { to: "/portal/agenda", label: "Agenda y reuniones", icon: CalendarDays },
                  { to: "/portal/mensajes", label: "Mensajes", icon: MessagesSquare },
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
