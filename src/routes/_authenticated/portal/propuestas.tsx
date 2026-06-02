import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/portal/propuestas")({
  component: Propuestas,
});

function Propuestas() {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-3xl">Propuestas en curso</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Oportunidades en negociación que el equipo IC está gestionando para ti.
        </p>
      </header>
      <div className="rounded-sm border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Pronto verás aquí las propuestas activas con su estado, plazos y materiales asociados.
      </div>
    </div>
  );
}