import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "update_target_account",
  title: "Actualizar cuenta objetivo",
  description:
    "Modifica campos de una cuenta objetivo existente por id. Solo actualiza los campos enviados. Requiere permisos de admin (BIG C).",
  inputSchema: {
    id: z.string().uuid().describe("UUID de la cuenta objetivo."),
    name: z.string().optional(),
    account_type: z.enum(["roster", "productora", "plataforma", "otros"]).optional(),
    roster_kind: z.enum(["composer", "artista", "productor_musical", "otros"]).optional(),
    other_label: z.string().optional(),
    sector: z.string().optional(),
    website: z.string().optional(),
    priority: z.enum(["alta", "media", "baja"]).optional(),
    status: z
      .enum(["sin_contacto", "contactado", "en_conversacion", "propuesta_enviada", "ganada", "descartada"])
      .optional(),
    responsible_person_id: z.string().uuid().optional(),
    next_step: z.string().optional(),
    next_step_date: z.string().optional(),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    const { id, ...rest } = input;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) patch[k] = v;
    if (Object.keys(patch).length === 0) {
      return { content: [{ type: "text", text: "No se ha enviado ningún campo a actualizar." }], isError: true };
    }
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.from("target_accounts").update(patch).eq("id", id).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Cuenta objetivo actualizada: ${data.id}` }],
      structuredContent: { target_account: data },
    };
  },
});