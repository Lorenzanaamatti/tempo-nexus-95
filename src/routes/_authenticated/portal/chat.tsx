import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePortalComposer } from "@/lib/use-portal-composer";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ComposerChat } from "@/components/composer-chat";

export const Route = createFileRoute("/_authenticated/portal/chat")({
  component: PortalChat,
  validateSearch: (s: Record<string, unknown>): { ch?: string } => ({
    ch: typeof s.ch === "string" ? s.ch : undefined,
  }),
});

function PortalChat() {
  const { composerId, loading } = usePortalComposer();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { ch } = Route.useSearch();

  useEffect(() => {
    if (!composerId || !user) return;
    (async () => {
      await supabase
        .from("chat_message_reads")
        .upsert(
          { user_id: user.id, composer_id: composerId, last_read_at: new Date().toISOString() },
          { onConflict: "user_id,composer_id" },
        );
      qc.invalidateQueries({ queryKey: ["portal-unread"] });
    })();
  }, [composerId, user, qc]);

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
        <ComposerChat composerId={composerId} initialChannelId={ch ?? null} />
      ) : (
        <p className="text-sm text-muted-foreground">Tu cuenta aún no está vinculada a una ficha de compositor.</p>
      )}
    </div>
  );
}