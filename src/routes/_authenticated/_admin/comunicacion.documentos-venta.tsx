import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/list-states";

export const Route = createFileRoute("/_authenticated/_admin/comunicacion/documentos-venta")({
  component: StubPage,
});

function StubPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">COMUNICACIÓN</p>
      <h1 className="mt-2 font-display text-5xl font-extrabold title-caps">Documentos de venta</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Decks de presentación de IC en todos sus formatos e idiomas.
      </p>
      <div className="mt-10">
        <EmptyState title="Sin contenido" description="Todavía no hay registros en esta sección." />
      </div>
    </div>
  );
}
