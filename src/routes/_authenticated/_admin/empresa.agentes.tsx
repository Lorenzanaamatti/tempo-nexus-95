import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/list-states";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/_admin/empresa/agentes")({
  component: StubPage,
});

function StubPage() {
  const { isBigC, loading } = useCurrentRole();
  if (loading) return <div className="p-10 font-display text-muted-foreground">Comprobando permisos…</div>;
  if (!isBigC) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <EmptyState title="Sin acceso" description="Esta sección solo está disponible para BIG C." />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">EMPRESA</p>
      <h1 className="mt-2 font-display text-5xl font-extrabold title-caps">Agentes IA</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Configuración, instrucciones, log de actividad y validaciones pendientes de los agentes virtuales.
      </p>
      <div className="mt-10">
        <EmptyState title="Sin contenido" description="Todavía no hay registros en esta sección." />
      </div>
    </div>
  );
}
