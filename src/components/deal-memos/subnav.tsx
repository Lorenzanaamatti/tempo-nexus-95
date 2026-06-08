import { Link, useRouterState } from "@tanstack/react-router";
import { KanbanSquare, List, LayoutTemplate, Users, Settings } from "lucide-react";

const items = [
  { to: "/deal-memos",              label: "Dashboard",  icon: KanbanSquare, exact: true },
  { to: "/deal-memos/lista",        label: "Lista",      icon: List,         exact: false },
  { to: "/deal-memos/plantillas",   label: "Plantillas", icon: LayoutTemplate, exact: false },
  { to: "/deal-memos/contactos",    label: "Contactos",  icon: Users,        exact: false },
  { to: "/deal-memos/configuracion", label: "Configuración", icon: Settings, exact: false },
] as const;

export function DealMemosSubnav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to || pathname === "/deal-memos/" : pathname.startsWith(to);

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-[1400px] items-center gap-1 overflow-x-auto px-6">
        {items.map(({ to, label, icon: Icon, exact }) => {
          const active = isActive(to, exact);
          return (
            <Link
              key={to}
              to={to}
              className={`group inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors ${
                active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}