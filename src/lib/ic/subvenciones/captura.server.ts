/**
 * Captura de convocatorias: BDNS (API oficial), CIDO (RSS) y vigilancia web.
 * Normaliza, deduplica y deja las novedades en la bandeja sin borrar nada.
 */
import { motivoDescarte } from "./perfil";
import { enriquecerPlazos } from "./plazos.server";

type Admin = any;

export interface Normalizada {
  titulo: string;
  organismo: string | null;
  descripcion: string | null;
  territorio: string | null;
  sector: string | null;
  destinatarios: string | null;
  tipo_oportunidad: string | null;
  importe: number | null;
  fecha_publicacion: string | null;
  fecha_limite: string | null;
  source_item_id: string | null;
  source_item_url: string | null;
  bdns: string | null;
}

export function claveDuplicado(o: Normalizada, organismo?: string | null): string {
  if (o.bdns) return `bdns:${o.bdns}`;
  if (o.source_item_id) return `item:${o.source_item_id}`;
  const norm = (t: string) =>
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const anio = (o.fecha_publicacion ?? o.fecha_limite ?? "").slice(0, 4);
  return `t:${norm(organismo ?? o.organismo ?? "")}|${norm(o.titulo)}|${anio}`;
}

async function guardar(
  supabaseAdmin: Admin,
  fuente: { id: string; source_id: string; territorio: string | null },
  items: Normalizada[],
): Promise<{ nuevas: number; repetidas: number; descartadas: number }> {
  let nuevas = 0;
  let repetidas = 0;
  let descartadas = 0;

  for (const item of items) {
    const texto = [item.titulo, item.descripcion, item.sector, item.destinatarios]
      .filter(Boolean)
      .join(" · ");
    if (motivoDescarte(texto, item.territorio)) {
      descartadas += 1;
      continue;
    }
    const clave = claveDuplicado(item);
    const { data: existe } = await supabaseAdmin
      .from("subv_oportunidades")
      .select("id")
      .eq("duplicate_key", clave)
      .maybeSingle();
    if (existe) {
      repetidas += 1;
      continue;
    }
    const { error } = await supabaseAdmin.from("subv_oportunidades").insert({
      fuente_id: fuente.id,
      source_id: fuente.source_id,
      duplicate_key: clave,
      ...item,
    });
    if (!error) nuevas += 1;
  }
  return { nuevas, repetidas, descartadas };
}

async function registrar(
  supabaseAdmin: Admin,
  fuenteId: string,
  conector: string,
  ok: boolean,
  datos: { nuevas?: number; repetidas?: number; mensaje?: string; inicio: number },
) {
  await supabaseAdmin.from("subv_capturas").insert({
    fuente_id: fuenteId,
    conector,
    ok,
    nuevas: datos.nuevas ?? 0,
    repetidas: datos.repetidas ?? 0,
    mensaje: datos.mensaje ?? null,
    duracion_ms: Date.now() - datos.inicio,
  });
  await supabaseAdmin
    .from("subv_fuentes")
    .update({
      last_checked_at: new Date().toISOString(),
      ...(ok
        ? { last_success_at: new Date().toISOString(), health_status: "OK", last_error: null }
        : { health_status: "ERROR", last_error: datos.mensaje ?? "Error desconocido" }),
      ...(ok && (datos.nuevas ?? 0) > 0 ? { last_change_at: new Date().toISOString() } : {}),
    })
    .eq("id", fuenteId);
}

/** BDNS / SNPSAP: registro nacional de subvenciones. */
export async function capturarBdns(supabaseAdmin: Admin, fuente: any, dias = 3) {
  const inicio = Date.now();
  try {
    const listado = await fetch(
      "https://www.infosubvenciones.es/bdnstrans/api/convocatorias/busqueda?vpd=GE&page=0&pageSize=200&order=fechaRecepcion&direccion=desc",
      { headers: { Accept: "application/json" } },
    );
    if (!listado.ok) throw new Error(`BDNS ha respondido ${listado.status}`);
    const json = (await listado.json()) as { content?: any[] };
    const corte = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);

    const items: Normalizada[] = [];
    for (const c of json.content ?? []) {
      if ((c.fechaRecepcion ?? "") < corte) continue;
      const titulo = String(c.descripcion ?? "").trim();
      if (!titulo) continue;
      const organismo = [c.nivel3, c.nivel2].filter(Boolean)[0] ?? null;
      const previo = motivoDescarte(titulo, null);
      // El detalle solo se pide para lo que ya parece relevante: evita miles de llamadas.
      if (previo) continue;

      let detalle: any = null;
      try {
        const res = await fetch(
          `https://www.infosubvenciones.es/bdnstrans/api/convocatorias?vpd=GE&numConv=${c.numeroConvocatoria}`,
          { headers: { Accept: "application/json" } },
        );
        if (res.ok) detalle = await res.json();
      } catch {
        // Sin detalle se guarda igualmente lo que devuelve el listado.
      }

      items.push({
        titulo,
        organismo,
        descripcion: detalle?.descripcionFinalidad ?? null,
        territorio:
          (detalle?.regiones ?? []).map((r: any) => r.descripcion).join(", ") || c.nivel1 || null,
        sector: (detalle?.sectores ?? []).map((s: any) => s.descripcion).join(", ") || null,
        destinatarios:
          (detalle?.tiposBeneficiarios ?? []).map((b: any) => b.descripcion).join(", ") || null,
        tipo_oportunidad: detalle?.tipoConvocatoria ?? "Subvención",
        importe: typeof detalle?.presupuestoTotal === "number" ? detalle.presupuestoTotal : null,
        fecha_publicacion: c.fechaRecepcion ?? null,
        fecha_limite: detalle?.fechaFinSolicitud ?? null,
        source_item_id: String(c.numeroConvocatoria ?? c.id),
        source_item_url: `https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/${c.numeroConvocatoria}`,
        bdns: String(c.numeroConvocatoria ?? ""),
      });
    }

    await enriquecerPlazos(items);
    const r = await guardar(supabaseAdmin, fuente, items);
    await registrar(supabaseAdmin, fuente.id, "bdns", true, { ...r, inicio });
    return r;
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    await registrar(supabaseAdmin, fuente.id, "bdns", false, { mensaje, inicio });
    return { nuevas: 0, repetidas: 0, descartadas: 0, error: mensaje };
  }
}

const CANALES_CIDO = [
  "https://cido.diba.cat/rss/subvencions/subvencions",
  "https://cido.diba.cat/rss/subvencions/premis",
  "https://cido.diba.cat/rss/subvencions/beques",
];

function entreEtiquetas(bloque: string, etiqueta: string): string | null {
  const m = bloque.match(new RegExp(`<${etiqueta}>([\\s\\S]*?)</${etiqueta}>`, "i"));
  if (!m) return null;
  return m[1]!.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

/** CIDO (Diputació de Barcelona): subvenciones, premios y becas de Cataluña. */
export async function capturarCido(supabaseAdmin: Admin, fuente: any, dias = 7) {
  const inicio = Date.now();
  const corte = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
  try {
    const items: Normalizada[] = [];
    for (const url of CANALES_CIDO) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`CIDO ha respondido ${res.status} en ${url}`);
      const xml = await res.text();
      for (const bloque of xml.split("<item>").slice(1)) {
        const titulo = entreEtiquetas(bloque, "title");
        const enlace = entreEtiquetas(bloque, "link");
        if (!titulo || !enlace) continue;
        const desc = (entreEtiquetas(bloque, "description") ?? "").replace(/<[^>]+>/g, " ");
        const pub = entreEtiquetas(bloque, "pubDate");
        const fecha = pub ? new Date(pub).toISOString().slice(0, 10) : null;
        if (fecha && fecha < corte) continue;
        const ens = desc.match(/Ens:\s*([^]+?)\s*$/)?.[1]?.trim() ?? null;
        items.push({
          titulo,
          organismo: ens,
          descripcion: desc.replace(/\s+/g, " ").trim() || null,
          territorio: "Cataluña",
          sector: null,
          destinatarios: null,
          tipo_oportunidad: url.includes("premis")
            ? "Premio"
            : url.includes("beques")
              ? "Beca"
              : "Subvención",
          importe: null,
          fecha_publicacion: fecha,
          fecha_limite: null,
          source_item_id: enlace.split("/").slice(-2, -1)[0] ?? enlace,
          source_item_url: enlace,
          bdns: null,
        });
      }
    }
    await enriquecerPlazos(items);
    const r = await guardar(supabaseAdmin, fuente, items);
    await registrar(supabaseAdmin, fuente.id, "cido", true, { ...r, inicio });
    return r;
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    await registrar(supabaseAdmin, fuente.id, "cido", false, { mensaje, inicio });
    return { nuevas: 0, repetidas: 0, descartadas: 0, error: mensaje };
  }
}

async function huella(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const buf = await crypto.subtle.digest("SHA-256", datos);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Vigilancia web: descarga la página de convocatorias, la compara con la
 * versión anterior y avisa del cambio. No inventa datos de la convocatoria.
 */
export async function vigilarWeb(supabaseAdmin: Admin, fuente: any) {
  const inicio = Date.now();
  const url = fuente.url_portal as string | null;
  if (!url) return { nuevas: 0, repetidas: 0, descartadas: 0 };
  try {
    const res = await fetch(url, { headers: { "User-Agent": "InteresanteBot/1.0" } });
    if (!res.ok) throw new Error(`La página ha respondido ${res.status}`);
    const html = await res.text();
    const limpio = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\d{1,2}:\d{2}(:\d{2})?/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200000);
    const hash = await huella(limpio);

    let nuevas = 0;
    if (fuente.content_hash && fuente.content_hash !== hash) {
      const clave = `web:${fuente.source_id}:${hash.slice(0, 16)}`;
      const { data: existe } = await supabaseAdmin
        .from("subv_oportunidades")
        .select("id")
        .eq("duplicate_key", clave)
        .maybeSingle();
      if (!existe) {
        await supabaseAdmin.from("subv_oportunidades").insert({
          fuente_id: fuente.id,
          source_id: fuente.source_id,
          duplicate_key: clave,
          titulo: `Cambio detectado en ${fuente.nombre}`,
          organismo: fuente.nombre,
          descripcion:
            "La página de convocatorias de esta fuente ha cambiado desde la última revisión. Ábrela para ver qué se ha publicado.",
          territorio: fuente.territorio,
          tipo_oportunidad: "Cambio detectado",
          source_item_url: url,
          estado: "nueva",
          analizada_ia: true,
        });
        nuevas = 1;
      }
    }
    await supabaseAdmin.from("subv_fuentes").update({ content_hash: hash }).eq("id", fuente.id);
    await registrar(supabaseAdmin, fuente.id, "web", true, { nuevas, inicio });
    return { nuevas, repetidas: 0, descartadas: 0 };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    await registrar(supabaseAdmin, fuente.id, "web", false, { mensaje, inicio });
    return { nuevas: 0, repetidas: 0, descartadas: 0, error: mensaje };
  }
}

/** Ejecuta la captura de todas las fuentes activas del modo indicado. */
export async function capturarTodo(
  supabaseAdmin: Admin,
  modo: "api" | "web" | "todo" = "api",
) {
  const { data: fuentes } = await supabaseAdmin
    .from("subv_fuentes")
    .select("*")
    .eq("activa", true);

  const resultados: { fuente: string; nuevas: number; error?: string }[] = [];
  for (const f of (fuentes ?? []) as any[]) {
    const esBdns = f.source_id === "S001";
    const esCido = f.source_id === "S003";
    if (modo !== "web" && esBdns) {
      const r = await capturarBdns(supabaseAdmin, f);
      resultados.push({ fuente: f.nombre, nuevas: r.nuevas, ...(("error" in r) ? { error: (r as any).error } : {}) });
    } else if (modo !== "web" && esCido) {
      const r = await capturarCido(supabaseAdmin, f);
      resultados.push({ fuente: f.nombre, nuevas: r.nuevas, ...(("error" in r) ? { error: (r as any).error } : {}) });
    } else if (modo !== "api" && !esBdns && !esCido && f.url_portal) {
      const r = await vigilarWeb(supabaseAdmin, f);
      resultados.push({ fuente: f.nombre, nuevas: r.nuevas, ...(("error" in r) ? { error: (r as any).error } : {}) });
    }
  }
  return resultados;
}
