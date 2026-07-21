import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "create_task",
  title: "Crear tarea",
  description:
    "Crea una tarea en el CRM (tabla actions). Se sincroniza automáticamente en el calendario. Requiere permisos de admin (BIG C).",
  inputSchema: {
    title: z.string().describe("Título de la tarea."),
    notes: z.string().optional().describe("Notas o descripción."),
    due_date: z.string().optional().describe("Fecha de vencimiento YYYY-MM-DD."),
    assignee_person_id: z.string().uuid().optional().describe("UUID de la persona del equipo IC asignada."),
    area: z.string().optional().describe("Área funcional (opcional)."),
    subject_type: z
      .enum(["target_account", "opportunity", "candidacy", "composer", "production", "spanish_film", "person"])
      .optional()
      .describe("Tipo de entidad vinculada."),
    subject_id: z.string().uuid().optional().describe("UUID de la entidad vinculada."),
    kind: z.string().optional().describe("Tipo de acción (por defecto 'tarea')."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const row: Record<string, unknown> = {
      title: input.title,
      kind: input.kind ?? "tarea",
    };
    if (input.notes) row.notes = input.notes;
    if (input.due_date) row.due_date = input.due_date;
    if (input.assignee_person_id) row.assignee_person_id = input.assignee_person_id;
    if (input.area) row.area = input.area;
    if (input.subject_type) row.subject_type = input.subject_type;
    if (input.subject_id) row.subject_id = input.subject_id;
    const { data, error } = await supabase.from("actions").insert(row).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Tarea creada: ${data.id}` }],
      structuredContent: { task: data },
    };
  },
});