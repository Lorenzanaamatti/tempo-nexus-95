import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AGENT_TOOLS, AGENT_TOOLS_BY_NAME, isWriteTool } from "@/lib/agent-tools";

type ChatMsg = { role: "user" | "assistant"; content: string };

type Input = {
  personId: string;
  messages: ChatMsg[];
};

function validate(input: unknown): Input {
  const i = input as Input;
  if (!i || typeof i.personId !== "string") throw new Error("personId requerido");
  if (!Array.isArray(i.messages) || i.messages.length === 0) throw new Error("messages requerido");
  for (const m of i.messages) {
    if ((m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      throw new Error("formato de mensaje inválido");
    }
    if (m.content.length > 8000) throw new Error("mensaje demasiado largo");
  }
  if (i.messages.length > 40) throw new Error("conversación demasiado larga");
  return { personId: i.personId, messages: i.messages };
}

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

type AnthropicMessage = { role: "user" | "assistant"; content: string | AnthropicContentBlock[] };

async function callClaude(
  apiKey: string,
  model: string,
  system: string,
  messages: AnthropicMessage[],
  tools: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>,
) {
  const body: Record<string, unknown> = { model, max_tokens: 1024, system, messages };
  if (tools.length > 0) body.tools = tools;
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Claude API error", resp.status, txt);
    throw new Error(`Claude error ${resp.status}: ${txt.slice(0, 500)}`);
  }
  return (await resp.json()) as {
    content: AnthropicContentBlock[];
    stop_reason: string;
  };
}

/** Ejecuta una tool de LECTURA contra la BBDD. Devuelve string serializable para tool_result. */
async function executeReadTool(
  supabase: any,
  toolName: string,
  input: Record<string, unknown>,
): Promise<string> {
  try {
    if (toolName === "find_composer") {
      const q = String(input.query ?? "").trim();
      if (!q) return JSON.stringify({ error: "query vacía" });
      const { data, error } = await supabase
        .from("composers")
        .select("id, full_name, email, roster_role")
        .ilike("full_name", `%${q}%`)
        .limit(10);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ results: data ?? [] });
    }
    if (toolName === "list_recent_deal_memos") {
      const limit = Math.min(Number(input.limit ?? 10), 25);
      let q = supabase
        .from("deal_memos")
        .select("id, referencia, obra, importe_propuesto, moneda, estado, fecha_envio")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (input.estado) q = q.eq("estado", String(input.estado));
      const { data, error } = await q;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ results: data ?? [] });
    }
    if (toolName === "find_production") {
      const query = String(input.query ?? "").trim();
      if (!query) return JSON.stringify({ error: "query vacía" });
      const { data, error } = await supabase
        .from("productions")
        .select("id, title, year, project_type, composer_id")
        .ilike("title", `%${query}%`)
        .limit(10);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ results: data ?? [] });
    }
    return JSON.stringify({ error: `Tool desconocida: ${toolName}` });
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : String(e) });
  }
}

function summarizeWritePayload(toolName: string, input: Record<string, unknown>): string {
  if (toolName === "propose_deal_memo") {
    return `Deal memo ${input.referencia ?? ""} · ${input.obra ?? ""} · ${input.importe_propuesto ?? "?"} EUR → ${input.destinatario_final_email ?? ""}`;
  }
  if (toolName === "propose_calendar_event") {
    return `Evento "${input.title}" ${input.start_date}${input.end_date && input.end_date !== input.start_date ? `→${input.end_date}` : ""}`;
  }
  if (toolName === "propose_action_task") {
    return `Tarea "${input.title}" sobre ${input.subject_type} ${input.subject_id}${input.due_date ? ` (vence ${input.due_date})` : ""}`;
  }
  return toolName;
}

export const chatWithAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");

    const { supabase, userId } = context;
    const { data: person, error } = await supabase
      .from("people")
      .select("full_name, assistant_persona, assistant_model, is_virtual_assistant")
      .eq("id", data.personId)
      .single();
    if (error) throw new Error(error.message);
    if (!person?.is_virtual_assistant) throw new Error("Esta persona no es un asistente virtual");

    let system =
      person.assistant_persona ??
      `Eres ${person.full_name}, asistente virtual de Claude integrado en el equipo IC.`;
    const model = person.assistant_model || "claude-sonnet-4-5-20250929";

    // Cargar herramientas habilitadas de este agente.
    const { data: enabledRows } = await (supabase as any)
      .from("agent_tools")
      .select("tool_name")
      .eq("agent_person_id", data.personId)
      .eq("enabled", true);
    const enabledNames = new Set<string>((enabledRows ?? []).map((r: any) => r.tool_name as string));
    const tools = AGENT_TOOLS.filter((t) => enabledNames.has(t.name)).map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));

    // ¿Tiene verificadores asignados? Necesario para herramientas de escritura.
    const { count: verifierCount } = await (supabase as any)
      .from("person_verifier_assignments")
      .select("id", { count: "exact", head: true })
      .eq("person_id", data.personId);
    const hasVerifier = (verifierCount ?? 0) > 0;

    if (tools.length > 0) {
      system +=
        "\n\n## Herramientas\n" +
        "Tienes acceso a herramientas. Úsalas cuando el usuario te pida buscar datos reales o crear/proponer algo. " +
        "Las herramientas que empiezan por 'propose_' CREAN PROPUESTAS pendientes de aprobación humana: úsalas solo cuando el usuario pida claramente crear ese artefacto. " +
        "Tras llamarlas, explica al usuario qué propuesta has dejado y que su verificador la revisará en 'Acciones de agentes'. " +
        "No inventes ids: si necesitas un id (de compositor, producción…), úsalo solo si lo obtuviste con una herramienta o el usuario te lo dio.";
    }

    const conversation: AnthropicMessage[] = data.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const proposedActions: Array<{ id: string; summary: string; tool: string }> = [];
    let finalText = "";

    // Loop de tool calling. Máx 6 iteraciones para evitar bucles.
    for (let step = 0; step < 6; step++) {
      const resp = await callClaude(apiKey, model, system, conversation, tools);
      // Append assistant turn as-is.
      conversation.push({ role: "assistant", content: resp.content });

      const toolUses = resp.content.filter((b): b is Extract<AnthropicContentBlock, { type: "tool_use" }> => b.type === "tool_use");

      if (toolUses.length === 0 || resp.stop_reason !== "tool_use") {
        finalText = resp.content
          .filter((b): b is Extract<AnthropicContentBlock, { type: "text" }> => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        break;
      }

      // Resolver cada tool_use.
      const results: AnthropicContentBlock[] = [];
      for (const tu of toolUses) {
        const def = AGENT_TOOLS_BY_NAME[tu.name];
        if (!def) {
          results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify({ error: `tool desconocida: ${tu.name}` }), is_error: true });
          continue;
        }
        if (!enabledNames.has(tu.name)) {
          results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify({ error: `tool no habilitada para este agente` }), is_error: true });
          continue;
        }
        if (isWriteTool(tu.name)) {
          if (!hasVerifier) {
            results.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: JSON.stringify({ error: "Este agente no tiene verificadores asignados. Pide al equipo BIG C que asigne uno antes de proponer acciones." }),
              is_error: true,
            });
            continue;
          }
          const summary = summarizeWritePayload(tu.name, tu.input);
          const { data: actionRow, error: insErr } = await (supabase as any)
            .from("agent_actions")
            .insert({
              agent_person_id: data.personId,
              tool_name: tu.name,
              payload: tu.input,
              summary,
              requested_by_user_id: userId,
            })
            .select("id")
            .single();
          if (insErr) {
            results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify({ error: insErr.message }), is_error: true });
            continue;
          }
          proposedActions.push({ id: actionRow.id as string, summary, tool: tu.name });
          results.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify({
              status: "pending_approval",
              action_id: actionRow.id,
              summary,
              note: "Propuesta registrada. Quedará pendiente hasta que un verificador la apruebe.",
            }),
          });
        } else {
          const readResult = await executeReadTool(supabase, tu.name, tu.input as Record<string, unknown>);
          results.push({ type: "tool_result", tool_use_id: tu.id, content: readResult });
        }
      }
      conversation.push({ role: "user", content: results });
    }

    return { reply: finalText, model, proposedActions };
  });

// -------- Aprobación / rechazo / ejecución de acciones --------

type DecisionInput = { actionId: string; notes?: string };
function validateDecision(input: unknown): DecisionInput {
  const i = input as DecisionInput;
  if (!i || typeof i.actionId !== "string") throw new Error("actionId requerido");
  return { actionId: i.actionId, notes: typeof i.notes === "string" ? i.notes : undefined };
}

async function executeApprovedAction(
  supabase: any,
  toolName: string,
  payload: Record<string, unknown>,
): Promise<{ entity_kind: string; entity_id: string }> {
  if (toolName === "propose_deal_memo") {
    const { data, error } = await supabase
      .from("deal_memos")
      .insert({
        referencia: payload.referencia,
        obra: payload.obra,
        descripcion_uso: payload.descripcion_uso ?? null,
        importe_propuesto: payload.importe_propuesto ?? null,
        destinatario_final_email: payload.destinatario_final_email,
        plazo_respuesta_dias: payload.plazo_respuesta_dias ?? 7,
        notas_internas: payload.notas_internas ?? null,
        estado: "borrador",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { entity_kind: "deal_memo", entity_id: data.id as string };
  }
  if (toolName === "propose_calendar_event") {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        subject_type: "production",
        subject_id: payload.subject_id ?? "00000000-0000-0000-0000-000000000000",
        title: payload.title,
        start_date: payload.start_date,
        end_date: payload.end_date,
        kind: payload.kind ?? "tarea",
        calendar_category: payload.calendar_category ?? "operativo",
        note: payload.note ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { entity_kind: "calendar_event", entity_id: data.id as string };
  }
  if (toolName === "propose_action_task") {
    const { data, error } = await supabase
      .from("actions")
      .insert({
        subject_type: payload.subject_type,
        subject_id: payload.subject_id,
        title: payload.title,
        notes: payload.notes ?? null,
        due_date: payload.due_date ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { entity_kind: "action", entity_id: data.id as string };
  }
  throw new Error(`Tool no ejecutable: ${toolName}`);
}

export const approveAgentAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateDecision)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await (supabase as any)
      .from("agent_actions")
      .select("id, tool_name, payload, status")
      .eq("id", data.actionId)
      .single();
    if (error) throw new Error(error.message);
    if (row.status !== "pending") throw new Error(`Acción ya ${row.status}`);
    try {
      const { entity_kind, entity_id } = await executeApprovedAction(supabase, row.tool_name, row.payload || {});
      const { error: upErr } = await (supabase as any)
        .from("agent_actions")
        .update({
          status: "approved",
          decided_by_user_id: userId,
          decided_at: new Date().toISOString(),
          decision_notes: data.notes ?? null,
          resulting_entity_kind: entity_kind,
          resulting_entity_id: entity_id,
        })
        .eq("id", data.actionId);
      if (upErr) throw new Error(upErr.message);
      return { ok: true, entity_kind, entity_id };
    } catch (e) {
      await (supabase as any)
        .from("agent_actions")
        .update({
          status: "failed",
          decided_by_user_id: userId,
          decided_at: new Date().toISOString(),
          decision_notes: data.notes ?? null,
          error_message: e instanceof Error ? e.message : String(e),
        })
        .eq("id", data.actionId);
      throw e;
    }
  });

export const rejectAgentAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateDecision)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await (supabase as any)
      .from("agent_actions")
      .update({
        status: "rejected",
        decided_by_user_id: userId,
        decided_at: new Date().toISOString(),
        decision_notes: data.notes ?? null,
      })
      .eq("id", data.actionId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });