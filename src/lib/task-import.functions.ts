import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canImportTasks } from "./task-import";

const AREAS = ["roster", "oportunidades", "economico", "legal", "marketing", "comunicacion", "produccion", "general"] as const;

const inputSchema = z.object({
  area: z.enum(AREAS),
  assignee_person_id: z.string().uuid().nullable(),
  rows: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(2000),
        notes: z.string().max(4000).nullable(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
        subarea: z.string().trim().max(200).nullable(),
      }),
    )
    .min(1)
    .max(500),
});

export const importTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const email = (context.claims as any)?.email as string | undefined;
    if (!canImportTasks(email)) throw new Error("No tienes permiso para importar tareas.");
    const payload = data.rows.map((r) => ({
      title: r.title,
      notes: r.notes,
      due_date: r.due_date,
      subarea: r.subarea,
      area: data.area,
      assignee_person_id: data.assignee_person_id,
      kind: "tarea",
      status: "pendiente",
    }));
    const { data: inserted, error } = await (context.supabase as any).from("actions").insert(payload).select("id");
    if (error) throw new Error(error.message);
    return { created: inserted?.length ?? 0 };
  });
