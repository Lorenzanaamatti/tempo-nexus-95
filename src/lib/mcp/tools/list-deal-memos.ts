import { defineTool } from "@lovable.dev/mcp-js";
import { mcpToolMeta } from "@/lib/tool-catalog";
import { z } from "zod";

export default defineTool({
  name: "list_deal_memos",
  ...mcpToolMeta("list_deal_memos"),
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10),
    estado: z.string().optional().describe("Filtrar por estado, ej: borrador, enviado, firmado."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, estado }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q: any = supabase.from("deal_memos").select("id, referencia, obra, importe_propuesto, estado, created_at").order("created_at", { ascending: false }).limit(limit);
    if (estado) q = q.eq("estado", estado);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { results: data ?? [] },
    };
  },
});