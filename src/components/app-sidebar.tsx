import { Link, useRouterState } from "@tanstack/react-router";
import { Users, User, LogOut, CalendarDays, UserCircle2, Film, Music, Mic2, Headphones, Sparkles, ListMusic, MoreHorizontal } from "lucide-react";
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
  const isPeople = pathname.startsWith("/people");
  const peopleRole = isPeople ? search?.role ?? "all" : null;

  const rosterItems = [
    { title: "Compositores", to: "/composers", icon: Music, active: composerActive },
    { title: "Artistas", to: "/people", search: { role: "artist" }, icon: Mic2, active: peopleRole === "artist" },
    { title: "Supervisores musicales", to: "/people", search: { role: "supervisor" }, icon: Headphones, active: peopleRole === "supervisor" },
    { title: "Especialistas", to: "/people", search: { role: "specialist" }, icon: Sparkles, active: peopleRole === "specialist" },
    { title: "Curadores musicales", to: "/people", search: { role: "curator" }, icon: ListMusic, active: peopleRole === "curator" },
    { title: "Otros", to: "/people", search: { role: "other" }, icon: MoreHorizontal, active: peopleRole === "other" },
  ] as const;

  const otherItems = [
    { title: "Equipo IC", url: "/people", search: { role: "ic_team" }, icon: UserCircle2, active: peopleRole === "ic_team" },
    { title: "Producciones", url: "/productions", icon: Film, active: pathname.startsWith("/productions") },
    { title: "Calendario", url: "/calendar", icon: CalendarDays, active: pathname.startsWith("/calendar") },
    { title: "Directorio completo", url: "/people", search: { role: "all" }, icon: Users, active: peopleRole === "all" },
  ] as const;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-primary/50 bg-primary/15 font-display text-base italic text-primary-foreground">
            ic
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base italic">Interesante</span>
              <span className="smallcaps text-muted-foreground">Compañía</span>
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
                        <Link to={item.url} search={item.search as never} className="flex items-center gap-2">
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
            {!collapsed && <SidebarGroupLabel className="smallcaps">Catálogo</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/me")}>
                    <Link to="/me" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {!collapsed && <span>Mi ficha</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
