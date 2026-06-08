import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";
import { useAuth } from "@/lib/auth-context";
import {
  Mail,
  Home,
  User,
  LineChart,
  FolderKanban,
  Inbox,
  Receipt,
  FileSignature,
  CalendarDays,
  MessagesSquare,
  FolderOpen,
  LogOut,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal")({
  component: PortalLayout,
});

const NAV = [
  { to: "/portal", label: "Inicio", icon: Home, exact: true },
  { to: "/portal/carrera", label: "Mi carrera", icon: User },
  { to: "/portal/kpis", label: "KPIs", icon: LineChart },
  { to: "/portal/proyectos", label: "Proyectos", icon: FolderKanban },
  { to: "/portal/propuestas", label: "Propuestas", icon: Inbox },
  { to: "/portal/facturacion", label: "Facturación", icon: Receipt },
  { to: "/portal/contratos", label: "Contratos", icon: FileSignature },
  { to: "/portal/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/portal/chat", label: "Chat IC", icon: MessagesSquare },
  { to: "/portal/mensajes", label: "Materiales", icon: FolderOpen },
] as const;

function PortalLayout() {
  const { composerId } = useCurrentRole();
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const { data: composer } = useQuery({
    queryKey: ["portal-shell-composer", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("composers")
        .select("full_name, artistic_name")
        .eq("id", composerId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: unread = 0 } = useQuery({
    queryKey: ["portal-unread", composerId, user?.id],
    enabled: !!composerId && !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: read } = await supabase
        .from("chat_message_reads")
        .select("last_read_at")
        .eq("user_id", user!.id)
        .eq("composer_id", composerId!)
        .maybeSingle();
      const since = read?.last_read_at ?? "1970-01-01T00:00:00Z";
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("composer_id", composerId!)
        .neq("author_user_id", user!.id)
        .gt("created_at", since);
      return count ?? 0;
    },
  });

  const name = composer?.artistic_name || composer?.full_name || "Bienvenido/a";
  const initials = name
    .split(/\s+/)
    .map((s: string) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="portal-shell min-h-screen text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/40 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <Link to="/portal" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#e85d3a] via-[#c44569] to-[#6c5ce7] font-display text-base italic text-white shadow-lg shadow-[#c44569]/30">
              {initials || "IC"}
            </div>
            <div className="leading-tight">
              <p className="smallcaps text-[10px] text-muted-foreground">Portal del representado</p>
              <p className="font-display text-base">{name}</p>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/portal/chat"
              aria-label={`Buzón${unread ? `: ${unread} sin leer` : ""}`}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-foreground shadow-sm ring-1 ring-black/5 transition hover:scale-105 hover:bg-white"
            >
              <Mail className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b6b] to-[#c44569] px-1 text-[10px] font-semibold text-white shadow">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              aria-label="Salir"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/60 text-muted-foreground ring-1 ring-black/5 transition hover:bg-white hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Sub-nav */}
        <nav className="mx-auto max-w-6xl overflow-x-auto px-6 pb-3">
          <ul className="flex gap-1.5 whitespace-nowrap">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to as never}
                    className={
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition " +
                      (active
                        ? "bg-gradient-to-r from-[#e85d3a] to-[#c44569] text-white shadow-md shadow-[#c44569]/30"
                        : "bg-white/60 text-foreground/70 ring-1 ring-black/5 hover:bg-white hover:text-foreground")
                    }
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}