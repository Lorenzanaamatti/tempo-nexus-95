import { createFileRoute } from "@tanstack/react-router";

/** Sincronización mensual de producciones españolas (llamada por un cron externo). */
export const Route = createFileRoute("/api/public/cron/sync-producciones-espanolas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env['CRON_SECRET'];
        if (!secret) return new Response("Cron no configurado", { status: 503 });
        if (request.headers.get("authorization") !== `Bearer ${secret}`) {
          return new Response("No autorizado", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runSync } = await import("@/lib/producciones-espanolas.server");
        const result = await runSync(supabaseAdmin);
        return Response.json(result);
      },
    },
  },
});
