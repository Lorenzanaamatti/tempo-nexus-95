import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/lib/auth-context";
import { useCurrentRole } from "@/lib/use-role";
import { CalendarDays, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: Shell,
});

function Shell() {
  const { loading, user } = useAuth();
  const { role, loading: roleLoading } = useCurrentRole();
  const [ready, setReady] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isPortal = pathname.startsWith("/portal");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      window.location.replace("/login");
      return;
    }
    setReady(true);
  }, [loading, user]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center font-display text-muted-foreground">
        Abriendo el archivo…
      </div>
    );
  }

  // Portal del representado: experiencia inmersiva sin chrome del back-office.
  if (isPortal) {
    return <Outlet />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar role={role} />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <span className="smallcaps text-muted-foreground">Interesante Compañía</span>
            {role === "admin" && (
              <nav className="ml-4 flex items-center gap-1">
                <Link
                  to="/calendar"
                  className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs smallcaps text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  activeProps={{ className: "flex items-center gap-1.5 rounded-sm bg-muted px-2 py-1 text-xs smallcaps text-foreground" }}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Calendarios</span>
                </Link>
                <Link
                  to="/people"
                  className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs smallcaps text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  activeProps={{ className: "flex items-center gap-1.5 rounded-sm bg-muted px-2 py-1 text-xs smallcaps text-foreground" }}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Equipo IC</span>
                </Link>
              </nav>
            )}
            {!roleLoading && role && (
              <span className="ml-auto smallcaps text-muted-foreground">{role === "admin" ? "Equipo IC" : "Compositor"}</span>
            )}
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
