import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalComposer } from "@/lib/use-portal-composer";
import { useAuth } from "@/lib/auth-context";
import { BrandLogo } from "@/components/brand-logo";
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
  Newspaper,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal")({
  component: PortalLayout,
});

const NAV: { to: string; label: string; icon: typeof Home; exact?: boolean }[] = [
  { to: "/portal", label: "Inicio", icon: Home, exact: true },
  { to: "/portal/carrera", label: "Mi carrera", icon: User },
  { to: "/portal/kpis", label: "KPIs", icon: LineChart },
  { to: "/portal/proyectos", label: "Proyectos", icon: FolderKanban },
  { to: "/portal/propuestas", label: "Propuestas", icon: Inbox },
  { to: "/portal/facturacion", label: "Facturación", icon: Receipt },
  { to: "/portal/contratos", label: "Contratos", icon: FileSignature },
  { to: "/portal/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/portal/prensa", label: "Prensa", icon: Newspaper },
  { to: "/portal/mensajes", label: "Mensajes", icon: MessagesSquare },
  { to: "/portal/chat", label: "Chat IC", icon: FolderOpen },
] as const;

function PortalLayout() {
  const { composerId } = usePortalComposer();
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

  return (
    <div className="portal-shell min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-[color:var(--portal-border)] bg-[color:var(--portal-bg)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link to="/portal" className="flex items-center gap-4">
            <BrandLogo variant="noir" className="h-16 w-auto object-contain" />
            <div className="leading-tight">
              <p className="smallcaps text-[10px] text-[color:var(--portal-muted)]">Portal del representado</p>
              <p className="font-display text-base text-[color:var(--portal-fg)]">{name}</p>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/portal/chat"
              aria-label={`Buzón${unread ? `: ${unread} sin leer` : ""}`}
              className="relative inline-flex h-10 w-10 items-center justify-center border border-[color:var(--portal-border)] text-[color:var(--portal-fg)] transition hover:border-[color:var(--portal-border-strong)]"
            >
              <Mail className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[color:var(--accent-coral)] px-1 text-[10px] font-semibold text-[color:var(--portal-bg)]">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              aria-label="Salir"
              className="inline-flex h-10 w-10 items-center justify-center border border-[color:var(--portal-border)] text-[color:var(--portal-muted)] transition hover:border-[color:var(--portal-border-strong)] hover:text-[color:var(--portal-fg)]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Sub-nav */}
        <nav className="mx-auto max-w-6xl overflow-x-auto px-6 pb-3">
          <ul className="flex gap-5 whitespace-nowrap">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to as never}
                    className={
                      "relative inline-flex items-center gap-1.5 py-1.5 text-xs font-medium transition " +
                      (active
                        ? "text-[color:var(--portal-fg)] after:absolute after:-bottom-0.5 after:left-0 after:right-0 after:h-px after:bg-[color:var(--accent-coral)]"
                        : "text-[color:var(--portal-muted)] hover:text-[color:var(--portal-fg)]")
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
      <main className="mx-auto max-w-6xl px-6 py-10 text-[color:var(--portal-fg)]">
        <Outlet />
      </main>
    </div>
  );
}