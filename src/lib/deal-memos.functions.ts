import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type GenInput = {
  dealMemoId: string;
  correctionComments?: string;
};

function validate(input: unknown): GenInput {
  const i = input as GenInput;
  if (!i || typeof i.dealMemoId !== "string") throw new Error("dealMemoId requerido");
  if (i.correctionComments != null && typeof i.correctionComments !== "string") {
    throw new Error("correctionComments inválido");
  }
  if (i.correctionComments && i.correctionComments.length > 4000) {
    throw new Error("correctionComments demasiado largo");
  }
  return { dealMemoId: i.dealMemoId, correctionComments: i.correctionComments };
}

function extractJson(text: string): { email_asunto: string; email_cuerpo: string } {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fence ? fence[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("La IA no devolvió un JSON válido");
  const parsed = JSON.parse(raw.slice(start, end + 1));
  if (typeof parsed.email_asunto !== "string" || typeof parsed.email_cuerpo !== "string") {
    throw new Error("La IA no devolvió email_asunto/email_cuerpo");
  }
  return { email_asunto: parsed.email_asunto, email_cuerpo: parsed.email_cuerpo };
}

const formatMoneyEs = (amount: number | string | null | undefined, moneda = "EUR") => {
  if (amount === null || amount === undefined || amount === "") return "(sin especificar)";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "(sin especificar)";
  const symbol = moneda === "EUR" ? "€" : moneda === "USD" ? "$" : moneda;
  return `${new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ${symbol}`;
};

export const generateDealMemoVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");
    const { supabase } = context;

    // Load deal memo
    const { data: dm, error: dmErr } = await supabase
      .from("deal_memos")
      .select("id, referencia, obra, descripcion_uso, importe_propuesto, moneda, destinatario_final_email, plantilla_id, cliente_id, cliente_kind, contraparte_id, contraparte_kind, estado, notas_internas")
      .eq("id", data.dealMemoId)
      .single();
    if (dmErr || !dm) throw new Error(dmErr?.message ?? "Deal memo no encontrado");
    if (!dm.plantilla_id) throw new Error("Este deal memo no tiene plantilla asignada");

    const { data: plantilla, error: plErr } = await supabase
      .from("dm_plantillas")
      .select("nombre, email_asunto_template, email_cuerpo_template, email_firma, instrucciones_para_agente, activa")
      .eq("id", dm.plantilla_id)
      .single();
    if (plErr || !plantilla) throw new Error("Plantilla no encontrada");
    if (!plantilla.activa) throw new Error("La plantilla no está activa");

    const resolveParty = async (label: "Cliente" | "Contraparte", kind: string | null, id: string | null) => {
      if (!kind || !id) return null;
      if (kind === "company") {
        const { data: company } = await supabase.from("production_companies").select("name, email").eq("id", id).maybeSingle();
        return company ? `- ${label}: ${company.name}${company.email ? ` <${company.email}>` : ""} · Productora` : null;
      }
      const { data: composer } = await supabase.from("composers").select("full_name, email").eq("id", id).maybeSingle();
      return composer ? `- ${label}: ${composer.full_name}${composer.email ? ` <${composer.email}>` : ""} · Roster` : null;
    };
    const contactsCtx = (await Promise.all([
      resolveParty("Cliente", dm.cliente_kind, dm.cliente_id),
      resolveParty("Contraparte", dm.contraparte_kind, dm.contraparte_id),
    ])).filter(Boolean).join("\n");

    // Determine next version number + previous version (for corrections)
    const { data: lastVer } = await supabase
      .from("deal_memo_versiones")
      .select("numero_version, email_asunto, email_cuerpo")
      .eq("deal_memo_id", dm.id)
      .order("numero_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNumber = (lastVer?.numero_version ?? 0) + 1;
    const isCorrection = !!data.correctionComments;

    // Build prompt
    const system = `${plantilla.instrucciones_para_agente}

Devuelve SIEMPRE un único objeto JSON con esta forma exacta y nada más:
{"email_asunto": "...", "email_cuerpo": "..."}

El cuerpo del email debe terminar con la siguiente firma literal (no la modifiques):
---
${plantilla.email_firma}`;

    const ctxBlock = `# Datos del deal memo
- Referencia: ${dm.referencia}
- Obra: ${dm.obra}
- Descripción de uso: ${dm.descripcion_uso ?? "(sin especificar)"}
- Importe propuesto: ${formatMoneyEs(dm.importe_propuesto, dm.moneda ?? "EUR")}
- Destinatario: ${dm.destinatario_final_email}
- Notas internas: ${dm.notas_internas ?? "(ninguna)"}
${contactsCtx ? `\n# Contactos\n${contactsCtx}` : ""}

# Plantilla base (referencia para tono y estructura)
Asunto base: ${plantilla.email_asunto_template}
Cuerpo base:
${plantilla.email_cuerpo_template}`;

    const userMsg = isCorrection
      ? `Versión previa (nº ${lastVer!.numero_version}) que necesita revisión:
ASUNTO PREVIO: ${lastVer!.email_asunto}
CUERPO PREVIO:
${lastVer!.email_cuerpo}

CORRECCIONES SOLICITADAS:
${data.correctionComments}

Regenera el email aplicando ESAS correcciones, manteniendo el resto. Mismos datos:

${ctxBlock}`
      : `Genera la primera versión del email para el siguiente deal memo:

${ctxBlock}`;

    // Call Claude (consistent with existing Anthropic integration)
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2048,
        system,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Anthropic ${resp.status}: ${txt.slice(0, 300)}`);
    }
    const json = (await resp.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (json.content ?? []).map((p) => (p.type === "text" ? p.text : "")).join("").trim();
    if (!text) throw new Error("La IA devolvió una respuesta vacía");
    const { email_asunto, email_cuerpo } = extractJson(text);

    // If this is a correction, log the request event first
    if (isCorrection) {
      await supabase.from("deal_memo_eventos").insert({
        deal_memo_id: dm.id,
        tipo_evento: "correcciones_solicitadas",
        actor_email: (context.claims as { email?: string } | undefined)?.email ?? null,
        payload: { comentarios: data.correctionComments, version_base: lastVer!.numero_version },
      });
    }

    // Insert new version
    const { data: inserted, error: vErr } = await supabase
      .from("deal_memo_versiones")
      .insert({
        deal_memo_id: dm.id,
        numero_version: nextNumber,
        email_asunto,
        email_cuerpo,
        generada_por: "agente_ia",
        comentarios_revision: data.correctionComments ?? null,
      })
      .select()
      .single();
    if (vErr) throw new Error(vErr.message);

    // Log generation event + advance state to revision_interna if borrador
    await supabase.from("deal_memo_eventos").insert({
      deal_memo_id: dm.id,
      tipo_evento: "version_generada",
      actor_email: (context.claims as { email?: string } | undefined)?.email ?? null,
      payload: { numero_version: nextNumber, correccion: isCorrection },
    });

    if (dm.estado === "borrador" || dm.estado === "generando" || dm.estado === "corrigiendo") {
      await supabase.from("deal_memos").update({ estado: "revision_interna" }).eq("id", dm.id);
    }

    return { version: inserted };
  });