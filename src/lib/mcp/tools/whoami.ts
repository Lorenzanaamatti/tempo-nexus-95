import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "whoami",
  title: "Quién soy",
  description:
    "Devuelve el id, email y rol (BIG C / TEAM / ROSTER) del usuario autenticado que llama al servidor MCP.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userId = ctx.getUserId();
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
    const r = (roles ?? []).map((x: any) => x.role as string);
    const role = r.includes("admin") ? "admin" : r.includes("team") ? "team" : r.includes("composer") ? "composer" : null;
    return {
      content: [{ type: "text", text: JSON.stringify({ userId, email: ctx.getUserEmail(), role }) }],
      structuredContent: { userId, email: ctx.getUserEmail(), role },
    };
  },
});