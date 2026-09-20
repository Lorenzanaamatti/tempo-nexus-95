import { createFileRoute } from "@tanstack/react-router";

/**
 * Entrada por correo: boletines reenviados a la app.
 * Cada correo crea una oportunidad pendiente de revisión con sus enlaces.
 * Protegida con token; acepta el formato de los servicios de reenvío habituales.
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

  let cuerpo: Record<string, unknown> = {};
  try {
    const tipo = request.headers.get("content-type") ?? "";
    if (tipo.includes("application/json")) {
      cuerpo = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      cuerpo = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    }
  } catch {
    return new Response("Cuerpo ilegible", { status: 400 });
  }

  const texto = String(cuerpo["text"] ?? cuerpo["body-plain"] ?? cuerpo["html"] ?? "");
  const asunto = String(cuerpo["subject"] ?? "Boletín sin asunto").trim();
  const remitente = String(cuerpo["from"] ?? cuerpo["sender"] ?? "").trim();
  const enlaces = [...texto.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map((m) => m[0]).slice(0, 10);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const clave = `mail:${asunto.toLowerCase().slice(0, 120)}|${remitente.toLowerCase()}`;

  const { data: existe } = await supabaseAdmin
    .from("subv_oportunidades")
    .select("id")
    .eq("duplicate_key", clave)
    .maybeSingle();
  if (existe) return new Response(JSON.stringify({ ok: true, repetido: true }), { status: 200 });

  const { error } = await supabaseAdmin.from("subv_oportunidades").insert({
    duplicate_key: clave,
    titulo: asunto,
    organismo: remitente || null,
    descripcion:
      (texto.replace(/\s+/g, " ").trim().slice(0, 1200) || null) +
      (enlaces.length ? `\n\nEnlaces:\n${enlaces.join("\n")}` : ""),
    tipo_oportunidad: "Boletín recibido",
    source_item_url: enlaces[0] ?? null,
    estado: "nueva",
  });
  if (error) return new Response(error.message, { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/subvenciones/correo")({
  server: {
    handlers: {
      POST: ({ request }) => manejar(request),
    },
  },
});
