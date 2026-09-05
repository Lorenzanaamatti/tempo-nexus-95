import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Auditoría con la plataforma OpenAI: recoge un resumen de datos del CRM
// (sin PII sensible) y lo envía a la API de OpenAI para su análisis.
// La clave se lee de la variable de entorno OPENAI_API_KEY (secreto del proyecto).

async function collectStats(supabase: any) {
  const safeCount = async (table: string) => {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    return error ? null : (count ?? 0);
  };
  const [composers, targetAccounts, dealMemos, productions, tasks, partners, spanishFilms] =
    await Promise.all([
      safeCount("composers"),
      safeCount("target_accounts"),
      safeCount("deal_memos"),
      safeCount("productions"),
      safeCount("actions"),
      safeCount("partners"),
      safeCount("producciones_espanolas"),
    ]);

  const { data: memosByStatus } = await supabase.from("deal_memos").select("estado");
  const { data: tasksOpen } = await supabase
    .from("actions")
    .select("id", { count: "exact", head: true })
    .neq("status", "done");

  const estadoCounts: Record<string, number> = {};
  for (const m of memosByStatus ?? []) {
    const k = (m as { estado?: string }).estado ?? "sin_estado";
    estadoCounts[k] = (estadoCounts[k] ?? 0) + 1;
  }

  return {
    roster_fichas: composers,
    cuentas_objetivo: targetAccounts,
    deal_memos_total: dealMemos,
    deal_memos_por_estado: estadoCounts,
    producciones: productions,
    partners: partners,
    producciones_espanolas: spanishFilms,
    tareas_totales: tasks,
    tareas_abiertas: tasksOpen?.length ?? null,
  };
}

export const runOpenAiAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Solo BIG C puede ejecutar la auditoría.
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Solo BIG C puede ejecutar la auditoría.");

    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      return {
        ok: false as const,
        error: "Falta la clave OPENAI_API_KEY. Guárdala desde el aviso de esta pantalla.",
      };
    }

    const stats = await collectStats(supabase);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Eres un auditor senior de operaciones para una compañía de representación de compositores de cine. " +
              "Analiza las métricas del CRM y devuelve una auditoría breve en español con: " +
              "1) Salud general, 2) Riesgos o cuellos de botella, 3) 3-5 recomendaciones accionables. " +
              "Sé conciso y usa listas.",
          },
          {
            role: "user",
            content: `Métricas actuales del CRM de Interesante Compañía:\n${JSON.stringify(stats, null, 2)}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return {
        ok: false as const,
        error: `OpenAI respondió ${res.status}. Revisa la clave guardada.`,
        stats,
        detail: detail.slice(0, 300),
      };
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const report = json.choices?.[0]?.message?.content ?? "Sin respuesta del modelo.";

    return { ok: true as const, report, stats, auditedAt: new Date().toISOString() };
  });
