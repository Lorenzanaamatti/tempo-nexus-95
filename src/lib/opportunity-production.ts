/**
 * Modelo de proyecto para OPORTUNIDADES · PRODUCCIONES.
 * Etiquetas, normalización y parseo de JSON de reports externos.
 */

export type OppProductionType = "pelicula" | "serie" | "documental" | "animacion" | "otro";
export type OppProductionGenre = "ficcion" | "animacion" | "no_ficcion";
export type OppPhase = "desarrollo" | "preproduccion" | "rodaje" | "postproduccion" | "finalizado" | "estreno";
export type OppPriority = "alta" | "media" | "baja";

export const OPP_TYPE_LABEL: Record<OppProductionType, string> = {
  pelicula: "Película",
  serie: "Serie",
  documental: "Documental",
  animacion: "Animación",
  otro: "Otro",
};

export const OPP_GENRE_LABEL: Record<OppProductionGenre, string> = {
  ficcion: "Ficción",
  animacion: "Animación",
  no_ficcion: "No ficción",
};

export const OPP_PHASE_LABEL: Record<OppPhase, string> = {
  desarrollo: "Desarrollo",
  preproduccion: "Preproducción",
  rodaje: "Rodaje",
  postproduccion: "Postproducción",
  finalizado: "Finalizado",
  estreno: "Estreno",
};

export const OPP_PHASE_TONE: Record<OppPhase, string> = {
  desarrollo: "bg-emerald-100 text-emerald-900",
  preproduccion: "bg-sky-100 text-sky-900",
  rodaje: "bg-amber-100 text-amber-900",
  postproduccion: "bg-orange-100 text-orange-900",
  finalizado: "bg-muted text-muted-foreground",
  estreno: "bg-muted text-muted-foreground",
};

export const OPP_PRIORITY_LABEL: Record<OppPriority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

function norm(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeTitle(s: unknown): string {
  return norm(s).replace(/\s+/g, " ");
}

export function parseProductionType(raw: unknown): OppProductionType | null {
  const v = norm(raw);
  if (!v) return null;
  if (v.includes("serie") || v.includes("series") || v.includes("tv")) return "serie";
  if (v.includes("documental") || v.includes("docu")) return "documental";
  if (v.includes("pelicula") || v.includes("film") || v.includes("largo") || v.includes("movie")) return "pelicula";
  if (v.includes("animacion") || v.includes("animation")) return "animacion";
  return "otro";
}

export function parseGenre(raw: unknown, typeRaw?: unknown): OppProductionGenre | null {
  const v = `${norm(raw)} ${norm(typeRaw)}`.trim();
  if (!v) return null;
  if (v.includes("animacion") || v.includes("animation")) return "animacion";
  if (v.includes("no-ficcion") || v.includes("no ficcion") || v.includes("documental") || v.includes("non-fiction")) return "no_ficcion";
  if (v.includes("ficcion") || v.includes("fiction")) return "ficcion";
  return null;
}

export function parsePhase(raw: unknown): OppPhase | null {
  const v = norm(raw);
  if (!v) return null;
  if (v.includes("post")) return "postproduccion";
  if (v.includes("pre") || v.includes("greenlit") || v.includes("green light")) return "preproduccion";
  if (v.includes("rodaje") || v.includes("shooting") || v.includes("filming") || v.includes("produccion")) return "rodaje";
  if (v.includes("estreno") || v.includes("release")) return "estreno";
  if (v.includes("final") || v.includes("complet")) return "finalizado";
  if (v.includes("desarrollo") || v.includes("development")) return "desarrollo";
  return null;
}

export function parseCountries(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((c) => String(c).trim()).filter(Boolean);
  const s = String(raw ?? "").trim();
  if (!s) return [];
  return s
    .split(/[\/,;]|\sy\s|\+/g)
    .map((c) => c.trim())
    .filter(Boolean);
}

/** Convierte "6-8M", "est. €20M+", ">5M", "1.500.000 €" en un rango numérico. */
export function parseBudgetRange(raw: unknown): { min: number | null; max: number | null } {
  const s = String(raw ?? "").toLowerCase();
  if (!s.trim()) return { min: null, max: null };
  const numbers: number[] = [];
  const re = /(\d+(?:[.,]\d+)?)\s*(m|k|mm|millones|million)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    let n = Number(m[1].replace(/\./g, m[1].includes(",") ? "" : ".").replace(",", "."));
    if (!Number.isFinite(n)) continue;
    const unit = m[2];
    if (unit === "m" || unit === "mm" || unit === "millones" || unit === "million") n *= 1_000_000;
    else if (unit === "k") n *= 1_000;
    else if (n < 1000 && /m/.test(s)) n *= 1_000_000;
    numbers.push(n);
  }
  if (!numbers.length) return { min: null, max: null };
  const openUp = s.includes("+") || s.includes(">") || s.includes("mas de") || s.includes("más de");
  const openDown = s.includes("<") || s.includes("menos de");
  if (numbers.length === 1) {
    if (openUp) return { min: numbers[0], max: null };
    if (openDown) return { min: null, max: numbers[0] };
    return { min: numbers[0], max: numbers[0] };
  }
  const sorted = [...numbers].sort((a, b) => a - b);
  return { min: sorted[0], max: sorted[sorted.length - 1] };
}

function pick(obj: Record<string, any>, keys: string[]): any {
  for (const k of keys) {
    const found = Object.keys(obj).find((ok) => norm(ok) === norm(k));
    if (found && obj[found] !== null && obj[found] !== undefined && obj[found] !== "") return obj[found];
  }
  return undefined;
}

export type ParsedOpportunity = {
  title: string;
  titulo_alt: string | null;
  tipo_produccion: OppProductionType | null;
  genero_produccion: OppProductionGenre | null;
  paises: string[];
  presupuesto_min: number | null;
  presupuesto_max: number | null;
  presupuesto_texto: string | null;
  financiacion_publica: string | null;
  fase: OppPhase | null;
  fecha_rodaje: string | null;
  fecha_estreno: string | null;
  productoraName: string | null;
  productora_aie: string | null;
  directorName: string | null;
  reparto: string | null;
  fuente_url: string | null;
  detected_date: string | null;
  origen: string | null;
  notes: string | null;
  prioridad: OppPriority | null;
};

export function parseOpportunityJson(input: string): { rows: ParsedOpportunity[]; errors: string[] } {
  const errors: string[] = [];
  let data: any;
  try {
    data = JSON.parse(input);
  } catch (e: any) {
    return { rows: [], errors: [`JSON inválido: ${e.message}`] };
  }
  const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.proyectos) ? data.proyectos : [data];
  const rows: ParsedOpportunity[] = [];
  list.forEach((item, i) => {
    if (!item || typeof item !== "object") {
      errors.push(`Elemento ${i + 1}: no es un objeto.`);
      return;
    }
    const title = String(pick(item, ["titulo", "title", "nombre", "proyecto"]) ?? "").trim();
    if (!title) {
      errors.push(`Elemento ${i + 1}: falta el título.`);
      return;
    }
    const tipoRaw = pick(item, ["tipo_produccion", "tipo", "type", "formato"]);
    const budgetRaw = pick(item, ["presupuesto_texto", "presupuesto", "budget"]);
    const range = parseBudgetRange(budgetRaw);
    const minExplicit = Number(pick(item, ["presupuesto_min", "budget_min"]));
    const maxExplicit = Number(pick(item, ["presupuesto_max", "budget_max"]));
    rows.push({
      title,
      titulo_alt: (pick(item, ["titulo_alt", "titulo_internacional", "alt_title"]) as string) ?? null,
      tipo_produccion: parseProductionType(tipoRaw),
      genero_produccion: parseGenre(pick(item, ["genero", "genre"]), tipoRaw),
      paises: parseCountries(pick(item, ["pais", "paises", "country", "countries"])),
      presupuesto_min: Number.isFinite(minExplicit) && minExplicit > 0 ? minExplicit : range.min,
      presupuesto_max: Number.isFinite(maxExplicit) && maxExplicit > 0 ? maxExplicit : range.max,
      presupuesto_texto: budgetRaw != null ? String(budgetRaw) : null,
      financiacion_publica: (pick(item, ["financiacion_publica", "ayudas", "public_funding"]) as string) ?? null,
      fase: parsePhase(pick(item, ["fase", "estado", "phase", "status"])),
      fecha_rodaje: (pick(item, ["fecha_rodaje", "rodaje", "shooting_date"]) as string) ?? null,
      fecha_estreno: (pick(item, ["fecha_estreno", "estreno", "release_date"]) as string) ?? null,
      productoraName: (pick(item, ["productora", "production_company", "company"]) as string) ?? null,
      productora_aie: (pick(item, ["productora_aie", "aie"]) as string) ?? null,
      directorName: (pick(item, ["director", "direccion"]) as string) ?? null,
      reparto: (() => {
        const r = pick(item, ["reparto", "cast"]);
        return Array.isArray(r) ? r.join(", ") : (r as string) ?? null;
      })(),
      fuente_url: (pick(item, ["fuente_url", "fuente", "url", "source"]) as string) ?? null,
      detected_date: (() => {
        const d = pick(item, ["fecha_deteccion", "detected_date", "fecha"]);
        if (!d) return null;
        const s = String(d).trim();
        return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
      })(),
      origen: (pick(item, ["origen", "source_name", "report"]) as string) ?? null,
      notes: (() => {
        const n = pick(item, ["nota", "notas", "note", "notes"]);
        return n ? String(n) : null;
      })(),
      prioridad: (() => {
        const p = norm(pick(item, ["prioridad", "priority"]));
        return p === "alta" || p === "media" || p === "baja" ? (p as OppPriority) : null;
      })(),
    });
  });
  return { rows, errors };
}

export const JSON_EXAMPLE = `[
  {
    "titulo": "Wasp",
    "tipo": "película ficción",
    "pais": "España/Francia",
    "presupuesto": "est. €20M+",
    "fase": "pre-producción",
    "productora": "Nostromo Pictures",
    "productora_aie": "Película Wasp A.I.E.",
    "director": "Jaume Balagueró",
    "fuente_url": "https://…",
    "fecha_deteccion": "2026-09-01",
    "origen": "Report Vanessa Garde",
    "nota": "Buscan compositor internacional."
  }
]`;

// ===================== Ingesta del report diario (texto del email) =====================

const MONTHS_ES: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10",
  noviembre: "11", diciembre: "12",
};

function isoFromSpanishDate(raw: string): string | null {
  const s = norm(raw);
  const dmy = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const long = s.match(/(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+)?(\d{4})|(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (long) {
    const d = long[1] ?? long[4];
    const mth = MONTHS_ES[long[2] ?? long[5]];
    const y = long[3] ?? long[6];
    if (d && mth && y) return `${y}-${mth}-${String(d).padStart(2, "0")}`;
  }
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : null;
}

function field(chunk: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*:\\s*([^|\\n]+)`, "i");
    const m = chunk.match(re);
    if (m) {
      const v = m[1].replace(/[🏢🎬💶🔗📅]/gu, "").trim();
      if (v) return v;
    }
  }
  return null;
}

/** Parsea el email/report diario en formato de viñetas numeradas. */
export function parseOpportunityReport(input: string): { rows: ParsedOpportunity[]; errors: string[] } {
  const errors: string[] = [];
  const text = input.replace(/\r/g, "");
  const itemRe = /^\s*\d+[.)]\s+\*{0,2}/gm;

  // Cabecera: todo lo anterior al primer proyecto numerado.
  const firstMatch = itemRe.exec(text);
  const headerRaw = (firstMatch ? text.slice(0, firstMatch.index) : "").trim();
  const headerLine = headerRaw.split("\n").map((l) => l.trim()).filter(Boolean)[0] ?? "";
  const origenHeader = headerLine ? headerLine.replace(/^[^\p{L}\d]+/u, "").trim() : null;
  const headerDate = headerLine ? isoFromSpanishDate(headerLine) : null;
  const today = new Date().toISOString().slice(0, 10);

  // Trocea por proyecto.
  itemRe.lastIndex = 0;
  const starts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(text))) starts.push(m.index);
  if (!starts.length) return { rows: [], errors: ["No se han encontrado proyectos numerados (1., 2., …) en el texto."] };

  const rows: ParsedOpportunity[] = [];
  starts.forEach((start, i) => {
    const raw = text.slice(start, starts[i + 1] ?? text.length);
    // Las líneas indentadas son campos nuevos; las que empiezan en columna 0 son continuación del ajuste del email.
    const logical: string[] = [];
    raw.split("\n").forEach((line, idx) => {
      const isNewField = idx === 0 || /^\s/.test(line);
      if (isNewField || !logical.length) logical.push(line.trim());
      else logical[logical.length - 1] = `${logical[logical.length - 1]} ${line.trim()}`.trim();
    });
    const chunk = logical.filter(Boolean).join("\n");
    const flat = chunk.replace(/\s+/g, " ");

    const titleMatch = flat.match(/\*\*(.+?)\*\*/) ?? flat.match(/^\s*\d+[.)]\s+([^([|]+)/);
    const title = (titleMatch?.[1] ?? "").trim();
    if (!title) {
      errors.push(`Proyecto ${i + 1}: no se ha podido leer el título.`);
      return;
    }

    // Etiquetas [película], [ficción] justo después del título.
    const afterTitle = flat.slice((titleMatch?.index ?? 0) + (titleMatch?.[0].length ?? 0));
    const tags = [...afterTitle.slice(0, 120).matchAll(/\[([^\]]+)\]/g)].map((t) => t[1]);
    const tipoRaw = tags[0] ?? null;
    const genreRaw = tags[1] ?? null;

    // País: entre el guion largo y el primer bloque de datos.
    const countryMatch = afterTitle.match(/[—–-]\s*([^|💶\n]+)/);
    const countryRaw = countryMatch ? countryMatch[1].replace(/\(([^)]*)\)/g, "").trim() : "";

    const presupuesto = field(chunk, ["Presupuesto"]);
    const estado = field(chunk, ["Estado", "Fase"]);
    const productora = cleanEntity(field(chunk, ["Productora", "Productoras", "Producción"]));
    const director = cleanEntity(
      field(chunk, ["Director", "Directora", "Dirección", "Showrunner/protagonista", "Showrunner", "Creador"]),
    );
    const reparto = field(chunk, ["Reparto", "Cast"]);
    const aie = field(chunk, ["AIE", "A\\.I\\.E"]);
    const urlMatch = flat.match(/https?:\/\/[^\s)|]+/);
    const notaMatch = chunk.match(/Nota\s*:\s*([\s\S]+)$/i);


    const range = parseBudgetRange(presupuesto);
    const estreno = estado ? isoFromSpanishDate((estado.match(/estreno[^;)]*/i) ?? [""])[0]) : null;

    rows.push({
      title,
      titulo_alt: null,
      tipo_produccion: parseProductionType(tipoRaw),
      genero_produccion: parseGenre(genreRaw, tipoRaw),
      paises: parseCountries(countryRaw),
      presupuesto_min: range.min,
      presupuesto_max: range.max,
      presupuesto_texto: presupuesto,
      financiacion_publica: null,
      fase: parsePhase(estado),
      fecha_rodaje: null,
      fecha_estreno: estreno,
      productoraName: productora,
      productora_aie: aie,
      directorName: director ? director.replace(/\(([^)]*)\)/g, "").trim() : null,
      reparto,
      fuente_url: urlMatch ? urlMatch[0] : null,
      detected_date: headerDate ?? today,
      origen: origenHeader,
      notes: notaMatch ? notaMatch[1].replace(/\s+/g, " ").trim() : null,
      prioridad: null,
    });
  });

  return { rows, errors };
}

/** Detecta si el texto pegado es JSON o el email del report y lo parsea. */
export function parseOpportunityIntake(input: string): { rows: ParsedOpportunity[]; errors: string[]; format: "json" | "report" } {
  const t = input.trim();
  if (t.startsWith("{") || t.startsWith("[")) return { ...parseOpportunityJson(t), format: "json" };
  return { ...parseOpportunityReport(t), format: "report" };
}

export const REPORT_EXAMPLE = `🎬 Proyectos España & Europa >5M€ — 15 septiembre 2026

1. **WASP 2026** ([película], [ficción]) — España (Madrid)
   💶 Presupuesto: €9M (declarado) | Estado: pre-producción
   🏢 Productora: Wanda Visión | 🎬 Director: Woody Allen
   🔗 https://…
   Nota: Primera película rodada íntegramente en Madrid.`;
