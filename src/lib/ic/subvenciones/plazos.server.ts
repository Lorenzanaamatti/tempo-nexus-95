/**
 * Lectura del plazo de presentación desde la página de la convocatoria.
 * Muchos canales (CIDO, webs de organismos) no envían la fecha límite en el
 * aviso: solo está en la ficha. Aquí se descarga y se busca por etiquetas.
 */

type Admin = any;

export type Plazo =
  | { fecha: string; abierto: false }
  | { fecha: null; abierto: true }
  | null;

const MESES: Record<string, number> = {
  enero: 1, gener: 1, xaneiro: 1, urtarrila: 1,
  febrero: 2, febrer: 2, febreiro: 2, otsaila: 2,
  marzo: 3, marc: 3, martxoa: 3,
  abril: 4, apirila: 4,
  mayo: 5, maig: 5, maio: 5, maiatza: 5,
  junio: 6, juny: 6, xuno: 6, ekaina: 6,
  julio: 7, juliol: 7, xullo: 7, uztaila: 7,
  agosto: 8, agost: 8, abuztua: 8,
  septiembre: 9, setembre: 9, setembro: 9, iraila: 9,
  octubre: 10, octubre_ca: 10, outubro: 10, urria: 10,
  noviembre: 11, novembre: 11, novembro: 11, azaroa: 11,
  diciembre: 12, desembre: 12, decembro: 12, abendua: 12,
};

function sinAcentos(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/·/g, "");
}

function iso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const y4 = y < 100 ? 2000 + y : y;
  if (y4 < 2000 || y4 > 2100) return null;
  return `${y4}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Extrae la primera fecha reconocible de un fragmento de texto. */
export function extraerFecha(texto: string): string | null {
  const t = sinAcentos(texto);

  // ISO primero: "2026-10-05" no debe leerse como 26/10/05.
  const isoM = t.match(/(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/);
  if (isoM) return iso(Number(isoM[1]), Number(isoM[2]), Number(isoM[3]));

  const num = t.match(/(?<!\d)(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?!\d)/);
  if (num) return iso(Number(num[3]), Number(num[2]), Number(num[1]));

  const larga = t.match(/(\d{1,2})\s+d[e']?\s*([a-z]+)\s+d[e']?\s*(\d{4})/);
  if (larga) {
    const mes = MESES[larga[2]!] ?? MESES[`${larga[2]}_ca`];
    if (mes) return iso(Number(larga[3]), mes, Number(larga[1]));
  }
  return null;
}

/** Etiquetas que preceden a la fecha de cierre, en catalán y castellano. */
const ETIQUETAS = [
  "finalitzacio de presentacio de sol licituds",
  "finalitzacio de presentacio de sollicituds",
  "fi del termini de presentacio",
  "termini de presentacio de sol licituds",
  "termini de presentacio de sollicituds",
  "termini de presentacio",
  "data limit de presentacio",
  "fin de plazo de solicitud",
  "fin del plazo de presentacion",
  "fin de plazo de presentacion",
  "plazo de presentacion de solicitudes",
  "plazo de presentacion",
  "fecha limite de presentacion",
  "fecha limite",
  "fecha fin de solicitud",
  "hasta el",
  "fins el",
];

const ABIERTO = ["termini obert", "plazo abierto", "convocatoria abierta", "tot l any"];

export function plazoDesdeTexto(textoPlano: string): Plazo {
  const t = sinAcentos(textoPlano).replace(/\s+/g, " ");
  for (const etiqueta of ETIQUETAS) {
    let desde = 0;
    for (;;) {
      const i = t.indexOf(etiqueta, desde);
      if (i === -1) break;
      const fecha = extraerFecha(t.slice(i + etiqueta.length, i + etiqueta.length + 120));
      if (fecha) return { fecha, abierto: false };
      desde = i + etiqueta.length;
    }
  }
  if (ABIERTO.some((a) => t.includes(a))) return { fecha: null, abierto: true };
  return null;
}

function aTextoPlano(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Descarga la ficha de la convocatoria y devuelve su plazo, si lo publica. */
export async function leerPlazo(url: string | null): Promise<Plazo> {
  if (!url) return null;
  try {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), 12000);
    const res = await fetch(url, {
      headers: { "User-Agent": "InteresanteBot/1.0", Accept: "text/html,*/*" },
      signal: control.signal,
    });
    clearTimeout(reloj);
    if (!res.ok) return null;
    const html = await res.text();
    return plazoDesdeTexto(aTextoPlano(html).slice(0, 300000));
  } catch {
    return null;
  }
}

/** Completa el plazo de los items recién capturados que llegaron sin fecha. */
export async function enriquecerPlazos<T extends { fecha_limite: string | null; source_item_url: string | null; descripcion: string | null }>(
  items: T[],
  tope = 40,
): Promise<T[]> {
  let pedidas = 0;
  for (const item of items) {
    if (item.fecha_limite || pedidas >= tope) continue;
    pedidas += 1;
    const plazo = await leerPlazo(item.source_item_url);
    if (plazo?.fecha) item.fecha_limite = plazo.fecha;
    else if (plazo?.abierto) {
      item.descripcion = [item.descripcion, "Plazo abierto (sin fecha de cierre publicada)."]
        .filter(Boolean)
        .join(" · ");
    }
  }
  return items;
}

/** Repasa las convocatorias ya guardadas que siguen sin fecha límite. */
export async function completarPlazosPendientes(supabaseAdmin: Admin, limite = 60) {
  const { data } = await supabaseAdmin
    .from("subv_oportunidades")
    .select("id, source_item_url, notas")
    .is("fecha_limite", null)
    .not("source_item_url", "is", null)
    .order("detectada_at", { ascending: false })
    .limit(limite);

  let completadas = 0;
  let abiertas = 0;
  let sinDato = 0;
  for (const o of (data ?? []) as any[]) {
    const plazo = await leerPlazo(o.source_item_url);
    if (plazo?.fecha) {
      await supabaseAdmin
        .from("subv_oportunidades")
        .update({ fecha_limite: plazo.fecha })
        .eq("id", o.id);
      completadas += 1;
    } else if (plazo?.abierto) {
      const nota = "Plazo abierto (sin fecha de cierre publicada).";
      if (!String(o.notas ?? "").includes(nota)) {
        await supabaseAdmin
          .from("subv_oportunidades")
          .update({ notas: [o.notas, nota].filter(Boolean).join(" · ") })
          .eq("id", o.id);
      }
      abiertas += 1;
    } else {
      sinDato += 1;
    }
  }
  return { completadas, abiertas, sinDato };
}
