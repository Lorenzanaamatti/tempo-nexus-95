import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/portal/mensajes")({
  component: Mensajes,
});

function Mensajes() {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-3xl">Mensajes y actualizaciones</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Comunicación con el equipo IC y novedades sobre tu representación.
        </p>
      </header>
      <div className="rounded-sm border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        El canal de mensajes se activará próximamente. Mientras tanto, contacta a tu agente por los canales habituales.
      </div>
    </div>
  );
}