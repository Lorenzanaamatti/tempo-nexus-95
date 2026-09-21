import { createFileRoute } from "@tanstack/react-router";

/**
 * Captura diaria de convocatorias (cron). Protegida con token.
 * ?modo=api (BDNS + CIDO, por defecto) | web (vigilancia de páginas) | todo
 */
async function manejar(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("token");
  const esperado = process.env["API_INGESTA_TOKEN"];
  if (!token || !esperado || token !== esperado) {
    return new Response("No autorizado", { status: 401 });
  }

  const modo = (url.searchParams.get("modo") ?? "api") as "api" | "web" | "todo";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { capturarTodo } = await import("@/lib/ic/subvenciones/captura.server");
  const { puntuarPendientes } = await import("@/lib/ic/subvenciones/scoring.server");
  const { completarPlazosPendientes } = await import("@/lib/ic/subvenciones/plazos.server");

  const capturas = await capturarTodo(supabaseAdmin, modo);
  const plazos = await completarPlazosPendientes(supabaseAdmin, 60);
  const puntuacion = await puntuarPendientes(supabaseAdmin, 30);

  return new Response(JSON.stringify({ ok: true, modo, capturas, plazos, puntuacion }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/subvenciones/capturar")({
  server: {
    handlers: {
      GET: ({ request }) => manejar(request),
      POST: ({ request }) => manejar(request),
    },
  },
});
