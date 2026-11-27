import { createFileRoute, Outlet, useRouterState, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { useAuth } from "@/lib/auth-context";
import { useCurrentRole } from "@/lib/use-role";
import { TaskDialogProvider } from "@/components/new-task-dialog";
import { TaskInboxBell } from "@/components/task-inbox-bell";
import { useSessionView, setSessionView } from "@/lib/session-view";
import { SimulatedViewBar } from "@/components/simulated-view-bar";
import { Breadcrumbs, PageCrumbProvider } from "@/components/breadcrumbs";

export const Route = createFileRoute("/_authenticated")({
  component: Shell,
});

function Shell() {
  const { loading, user } = useAuth();
  const { role, loading: roleLoading, isRealBigC: isBigC, isSimulating } = useCurrentRole();
  const sessionView = useSessionView();
  const [ready, setReady] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isPortal = pathname.startsWith("/portal");
  const isVistaPicker = pathname === "/vista";

  // Asegura que cada navegación entre páginas comienza arriba del todo.
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      window.location.replace("/login");
      return;
    }
    setReady(true);
  }, [loading, user]);

  // La vista de sesión se elige en la portada; BIG C entra por defecto en vista completa.
  useEffect(() => {
    if (!ready || roleLoading) return;
    if (!isBigC || sessionView) return;
    setSessionView("bigc");
  }, [ready, roleLoading, isBigC, sessionView]);

  // Simulando ROSTER: solo existe el portal del artista.
  const mustGoToPortal = isSimulating && role === "composer" && !isPortal && !isVistaPicker;
  useEffect(() => {
    if (mustGoToPortal) window.location.replace("/portal");
  }, [mustGoToPortal]);

  if (!ready || mustGoToPortal) {
    return (
      <div className="flex min-h-screen items-center justify-center font-display text-muted-foreground">
        Abriendo el archivo…
      </div>
    );
  }

  // Portal del representado: experiencia inmersiva sin chrome del back-office.
  if (isPortal) {
    return (
      <>
        <SimulatedViewBar />
        <Outlet />
      </>
    );
  }

  // Vista picker: pantalla limpia sin sidebar.
  if (isVistaPicker) {
    return <Outlet />;
  }


  // Portada: pantalla completa, sin árbol de navegación.
  if (pathname === "/") {
    return (
      <TaskDialogProvider>
        <SimulatedViewBar />
        <Outlet />
      </TaskDialogProvider>
    );
  }

  return (
    <SidebarProvider>
      <TaskDialogProvider>
      <PageCrumbProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar role={role} sessionView={sessionView} />
        <div className="flex flex-1 flex-col">
          <SimulatedViewBar />
          <header className="flex h-12 items-center gap-3 border-b border-border bg-background px-4">
            <SidebarTrigger />
            <div className="min-w-0 flex-1"><Breadcrumbs /></div>
            <GlobalSearch />
            <TaskInboxBell />
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--rust)] hover:underline"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Volver a bienvenida</span>
            </Link>
          </header>
          <main className="flex-1 bg-background">
            <Outlet />
          </main>
        </div>
      </div>
      </PageCrumbProvider>
      </TaskDialogProvider>
    </SidebarProvider>
  );
}
