import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_calendar_events",
  title: "Listar eventos de calendario",
  description:
    "Devuelve eventos de calendario dentro de un rango de fechas. Respeta los permisos del usuario autenticado.",
  inputSchema: {
    from: z.string().describe("Fecha inicio YYYY-MM-DD."),
    to: z.string().describe("Fecha fin YYYY-MM-DD."),
    limit: z.number().int().min(1).max(200).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, title, start_date, end_date, calendar_category, kind, note")
      .gte("start_date", from)
      .lte("start_date", to)
      .order("start_date", { ascending: true })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { results: data ?? [] },
    };
  },
});