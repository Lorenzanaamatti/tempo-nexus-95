import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Home, User, FolderKanban, Inbox, FileSignature, CalendarDays, MessagesSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal")({
  component: PortalLayout,
});

type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/portal", label: "Inicio", icon: Home, exact: true },
  { to: "/portal/carrera", label: "Mi carrera", icon: User },
  { to: "/portal/proyectos", label: "Proyectos activos", icon: FolderKanban },
  { to: "/portal/propuestas", label: "Propuestas en curso", icon: Inbox },
  { to: "/portal/contratos", label: "Contratos y derechos", icon: FileSignature },
  { to: "/portal/agenda", label: "Agenda y reuniones", icon: CalendarDays },
  { to: "/portal/mensajes", label: "Mensajes y actualizaciones", icon: MessagesSquare },
];

function PortalLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Portal del representado</p>
        <h1 className="mt-1 font-display text-4xl">Tu espacio privado</h1>
      </header>
      <nav className="mb-8 flex flex-wrap gap-1 border-b border-border">
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to as string}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}