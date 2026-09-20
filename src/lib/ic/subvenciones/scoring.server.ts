/**
 * Puntuación de encaje de cada convocatoria con el perfil de Interesante.
 * La nota solo ordena la revisión; nunca decide la elegibilidad.
 */
import { PERFIL_INTERESANTE } from "./perfil";

type Admin = any;

const PROMPT = `Eres analista de financiación pública y privada para una empresa cultural española.
Recibes el perfil de la empresa y una convocatoria detectada automáticamente.

Devuelve un JSON con exactamente estas claves, todas strings planos salvo "score":
- "score": número entero de 0 a 100. Encaje real de la empresa con la convocatoria.
- "motivo": máximo dos frases. Por qué encaja o por qué no. Directo, sin relleno ni adjetivos de entusiasmo.
- "excluyentes": requisitos que impedirían presentarse (territorio, tipo de beneficiario, tamaño, sector, plazo cerrado). Si no detectas ninguno con la información disponible, escribe "Ninguno detectado con los datos disponibles".

Criterios: 80-100 encaje directo con su actividad y territorio; 50-79 posible pero con condiciones; 20-49 dudoso; 0-19 no aplica.
No inventes requisitos que no aparezcan en el texto. Si la información es insuficiente, dilo en el motivo y puntúa bajo sin afirmar que no encaja.
No uses emojis ni fórmulas de cortesía.`;

async function leerStream(res: Response): Promise<string> {
  if (!res.body) throw new Error("La IA no ha devuelto respuesta");
  const lector = res.body.getReader();
  const decoder = new TextDecoder();
  let pendiente = "";
  let contenido = "";
  for (;;) {
    const { done, value } = await lector.read();
    pendiente += decoder.decode(value, { stream: !done });
    const lineas = pendiente.split("\n");
    pendiente = lineas.pop() ?? "";
    for (const linea of lineas) {
      if (!linea.startsWith("data: ") || linea === "data: [DONE]") continue;
      try {
        const evento = JSON.parse(linea.slice(6)) as { type?: string; delta?: string };
        if (evento.type === "response.output_text.delta") contenido += evento.delta ?? "";
      } catch {
        // Evento incompleto: se ignora.
      }
    }
    if (done) break;
  }
  return contenido;
}

export async function puntuarOportunidad(o: any): Promise<{
  score: number;
  motivo: string;
  excluyentes: string;
}> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("La IA de la app no está configurada");

  const ficha = [
    `Título: ${o.titulo}`,
    o.organismo ? `Organismo: ${o.organismo}` : null,
    o.territorio ? `Territorio: ${o.territorio}` : null,
    o.sector ? `Sector: ${o.sector}` : null,
    o.destinatarios ? `Beneficiarios: ${o.destinatarios}` : null,
    o.tipo_oportunidad ? `Tipo: ${o.tipo_oportunidad}` : null,
    o.importe ? `Presupuesto: ${o.importe} €` : null,
    o.fecha_limite ? `Fecha límite: ${o.fecha_limite}` : null,
    o.descripcion ? `Descripción: ${o.descripcion}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      input: [
        { role: "system", content: PROMPT },
        {
          role: "user",
          content: `Perfil de la empresa:\n${PERFIL_INTERESANTE}\n\nConvocatoria:\n${ficha}\n\nDevuelve únicamente el JSON solicitado.`,
        },
      ],
      text: { format: { type: "json_object" } },
    }),
  });
  if (!res.ok) {
    let mensaje = `La IA ha respondido ${res.status}`;
    try {
      const err = (await res.json()) as { error?: { message?: string }; message?: string };
      mensaje = err.error?.message ?? err.message ?? mensaje;
    } catch {
      // Sin cuerpo legible.
    }
    throw new Error(mensaje);
  }

  const contenido = await leerStream(res);
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(contenido);
  } catch {
    const m = contenido.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  }
  const bruto = Number(parsed["score"]);
  return {
    score: Number.isFinite(bruto) ? Math.max(0, Math.min(100, Math.round(bruto))) : 0,
    motivo: String(parsed["motivo"] ?? "").trim(),
    excluyentes: String(parsed["excluyentes"] ?? "").trim(),
  };
}

/** Puntúa las convocatorias nuevas todavía sin analizar, con tope por ejecución. */
export async function puntuarPendientes(supabaseAdmin: Admin, limite = 25) {
  const { data: pendientes } = await supabaseAdmin
    .from("subv_oportunidades")
    .select("*")
    .eq("analizada_ia", false)
    .eq("estado", "nueva")
    .order("detectada_at", { ascending: true })
    .limit(limite);

  let hechas = 0;
  let fallos = 0;
  for (const o of (pendientes ?? []) as any[]) {
    try {
      const r = await puntuarOportunidad(o);
      await supabaseAdmin
        .from("subv_oportunidades")
        .update({
          score_ia: r.score,
          motivo_ia: r.motivo,
          excluyentes_ia: r.excluyentes,
          analizada_ia: true,
        })
        .eq("id", o.id);
      hechas += 1;
    } catch (e) {
      fallos += 1;
      const mensaje = e instanceof Error ? e.message : String(e);
      // Un 402/403 detiene la tanda: no tiene sentido seguir gastando intentos.
      if (/402|403|credit/i.test(mensaje)) break;
    }
  }
  return { hechas, fallos };
}
