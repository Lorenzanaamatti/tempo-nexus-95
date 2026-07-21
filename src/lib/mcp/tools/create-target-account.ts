import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "create_target_account",
  title: "Crear cuenta objetivo",
  description:
    "Crea una nueva cuenta objetivo (cliente potencial) en el CRM. Requiere permisos de admin (BIG C).",
  inputSchema: {
    name: z.string().describe("Nombre de la cuenta."),
    account_type: z
      .enum(["roster", "productora", "plataforma", "otros"])
      .optional()
      .describe("Tipo de cuenta. Por defecto 'productora'."),
    roster_kind: z
      .enum(["composer", "artista", "productor_musical", "otros"])
      .optional()
      .describe("Subtipo cuando account_type = 'roster'."),
    other_label: z.string().optional().describe("Etiqueta libre cuando account_type = 'otros'."),
    sector: z.string().optional(),
    website: z.string().optional(),
    priority: z.enum(["alta", "media", "baja"]).optional(),
    status: z
      .enum(["sin_contacto", "contactado", "en_conversacion", "propuesta_enviada", "ganada", "descartada"])
      .optional(),
    responsible_person_id: z.string().uuid().optional(),
    next_step: z.string().optional(),
    next_step_date: z.string().optional().describe("YYYY-MM-DD."),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  needsApproval: true,
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const row: Record<string, unknown> = { name: input.name };
    for (const k of [
      "account_type",
      "roster_kind",
      "other_label",
      "sector",
      "website",
      "priority",
      "status",
      "responsible_person_id",
      "next_step",
      "next_step_date",
      "notes",
    ] as const) {
      const v = (input as Record<string, unknown>)[k];
      if (v !== undefined) row[k] = v;
    }
    const { data, error } = await supabase.from("target_accounts").insert(row).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Cuenta objetivo creada: ${data.id}` }],
      structuredContent: { target_account: data },
    };
  },
});