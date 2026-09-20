import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Lanza la captura a mano desde la pantalla de Fuentes. */
export const capturarAhora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ modo: z.enum(["api", "web", "todo"]).default("api") }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { capturarTodo } = await import("@/lib/ic/subvenciones/captura.server");
    const { puntuarPendientes } = await import("@/lib/ic/subvenciones/scoring.server");
    const capturas = await capturarTodo(supabaseAdmin, data.modo);
    const puntuacion = await puntuarPendientes(supabaseAdmin, 20);
    const nuevas = capturas.reduce((t, c) => t + c.nuevas, 0);
    const errores = capturas.filter((c) => c.error).length;
    return { nuevas, errores, puntuadas: puntuacion.hechas };
  });

/** Puntúa con IA las convocatorias que aún no tienen nota. */
export const puntuarAhora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ limite: z.number().int().min(1).max(50).default(20) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { puntuarPendientes } = await import("@/lib/ic/subvenciones/scoring.server");
    return await puntuarPendientes(supabaseAdmin, data.limite);
  });
