import { createFileRoute } from "@tanstack/react-router";
import { useCurrentRole } from "@/lib/use-role";
import { ComposerChat } from "@/components/composer-chat";

export const Route = createFileRoute("/_authenticated/portal/chat")({
  component: PortalChat,
});

function PortalChat() {
  const { composerId, loading } = useCurrentRole();
  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl">Chat con IC</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Conversación organizada por canales: General, Producciones, Oportunidades, Facturación, Contratos, Actas y Calendario.
        </p>
      </header>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : composerId ? (
        <ComposerChat composerId={composerId} />
      ) : (
        <p className="text-sm text-muted-foreground">Tu cuenta aún no está vinculada a una ficha de compositor.</p>
      )}
    </div>
  );
}