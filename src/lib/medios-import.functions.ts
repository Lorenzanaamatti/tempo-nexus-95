import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/producciones-espanolas.server";
import {
  domainOf,
  importInput,
  normalize,
  searchInput,
  searchMediosWeb,
  type MedioCandidato,
} from "@/lib/medios-import.server";

/** Busca medios de comunicación en la web en vivo y marca los que ya existen en Partners. */
export const searchMedios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => searchInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.userId);
    const candidatos = await searchMediosWeb(data);

    const { data: existing, error } = await admin
      .from("partners")
      .select("nombre, website, fuente_externa_id");
    if (error) throw error;

    const byName = new Set<string>();
    const byDomain = new Set<string>();
    const byRef = new Set<string>();
    for (const p of existing ?? []) {
      byName.add(normalize(p.nombre ?? ""));
      const d = domainOf(p.website);
      if (d) byDomain.add(d);
      if (p.fuente_externa_id) byRef.add(p.fuente_externa_id);
    }

    const results: MedioCandidato[] = candidatos.map((c) => {
      const d = domainOf(c.website);
      return {
        ...c,
        existe: byRef.has(c.fuente_externa_id) || byName.has(normalize(c.nombre)) || (!!d && byDomain.has(d)),
      };
    });

    return { results, total: results.length };
  });

/** Crea o actualiza partners de tipo Medio a partir de los candidatos seleccionados. */
export const importMedios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => importInput.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await requireAdmin(context.userId);

    const { data: existing, error } = await admin
      .from("partners")
      .select("id, nombre, website, fuente_externa_id");
    if (error) throw error;

    const byRef = new Map<string, string>();
    const byName = new Map<string, string>();
    const byDomain = new Map<string, string>();
    for (const p of existing ?? []) {
      if (p.fuente_externa_id) byRef.set(p.fuente_externa_id, p.id);
      byName.set(normalize(p.nombre ?? ""), p.id);
      const d = domainOf(p.website);
      if (d) byDomain.set(d, p.id);
    }

    let creados = 0;
    let actualizados = 0;

    for (const item of data.items) {
      const d = domainOf(item.website ?? null);
      const id =
        (item.fuente_externa_id ? byRef.get(item.fuente_externa_id) : undefined) ??
        byName.get(normalize(item.nombre)) ??
        (d ? byDomain.get(d) : undefined);

      const payload: Record<string, unknown> = {
        tipo: "Medio",
        nombre: item.nombre,
        subtipo: item.subtipo ?? null,
        ciudad: item.ciudad ?? null,
        pais: item.pais ?? null,
        website: item.website ?? null,
        contacto_principal: item.contacto_principal ?? null,
        contacto_email: item.contacto_email ?? null,
        notas: item.notas ?? null,
        ambito: normalize(item.pais ?? "") === "espana" ? "Nacional" : "Internacional",
        fuente_externa_id: item.fuente_externa_id ?? null,
      };

      if (id) {
        const clean = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== null && v !== undefined));
        const { error: upErr } = await admin.from("partners").update(clean).eq("id", id);
        if (upErr) throw upErr;
        actualizados++;
      } else {
        const { data: inserted, error: insErr } = await admin
          .from("partners")
          .insert(payload)
          .select("id")
          .single();
        if (insErr) throw insErr;
        creados++;
        if (item.fuente_externa_id) byRef.set(item.fuente_externa_id, inserted.id);
        byName.set(normalize(item.nombre), inserted.id);
        if (d) byDomain.set(d, inserted.id);
      }
    }

    return { creados, actualizados };
  });
