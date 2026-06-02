import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/portal")({
  component: PortalLayout,
});

function PortalLayout() {
  return (
    <div className="mx-auto max-w-5xl px-10 py-14">
      <header className="mb-12">
        <p className="smallcaps text-muted-foreground">Portal del representado</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight">Tu espacio privado</h1>
        <div className="mt-6 h-px w-16 bg-primary/70" />
      </header>
      <Outlet />
    </div>
  );
}