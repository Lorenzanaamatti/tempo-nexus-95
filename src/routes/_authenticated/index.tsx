import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurrentRole } from "@/lib/use-role";
import { BrandLogo } from "@/components/brand-logo";
import { UserCog } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav-tree";

export const Route = createFileRoute("/_authenticated/")({
  component: Index,
});

function Index() {
  const { role, status, isStaff, isBigC, loading } = useCurrentRole();
  useEffect(() => {
    if (loading) return;
    if (status === "pending" || status === "rejected") {
      window.location.replace("/pending");
      return;
    }
    if (!isStaff) window.location.replace("/me");
  }, [role, status, isStaff, loading]);

  if (loading || !isStaff || status !== "active") {
    return (
      <div className="flex min-h-screen items-center justify-center font-display text-muted-foreground">
        Abriendo el archivo…
      </div>
    );
  }

  const visibleGroups = NAV_GROUPS.filter((g) => isBigC || !g.bigCOnly).map((g) =>
    g.label === "Legal" && isBigC
      ? { ...g, items: [...g.items, { title: "Usuarios y permisos", to: "/users", icon: UserCog }] as typeof g.items }
      : g,
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-10 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Bienvenida</p>
        <BrandLogo variant="auto" className="mt-1 h-20 w-auto" />
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Elige un área para navegar por el archivo. Tienes el árbol completo siempre disponible en la barra lateral.
        </p>
      </header>

      <div className="space-y-10">
        {visibleGroups.map((group) => (
          <section key={group.label}>
            <div className="mb-3 flex items-end justify-between border-b border-border pb-2">
              <h2 className="flex items-center gap-2 font-display text-2xl">
                <group.icon className="h-4 w-4 text-muted-foreground" />
                {group.label}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <Link
                  key={`${group.label}-${item.title}`}
                  to={item.to}
                  search={item.search as never}
                  className="group flex items-start gap-3 rounded-sm border border-border p-4 transition hover:border-primary/60 hover:bg-muted/40"
                >
                  <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
                  <div className="min-w-0">
                    <p className="font-display text-base leading-tight">{item.title}</p>
                    {item.hint && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.hint}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}