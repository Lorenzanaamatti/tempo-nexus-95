import { z } from "zod";

import {
  MEDIO_AMBITOS,
  MEDIO_ESPECIALIDADES,
  MEDIO_FORMATOS,
  type MedioEspecialidad,
  type MedioFormato,
} from "@/lib/medios-model";

export const searchInput = z.object({
  ambito: z.enum(MEDIO_AMBITOS).default("España"),
  especialidades: z.array(z.enum(MEDIO_ESPECIALIDADES)).min(1),
  formatos: z.array(z.enum(MEDIO_FORMATOS)).min(1),
  limit: z.number().int().min(5).max(120).default(60),
});

export const importInput = z.object({
  items: z
    .array(
      z.object({
        nombre: z.string().min(1),
        subtipo: z.string().nullable().optional(),
        ciudad: z.string().nullable().optional(),
        pais: z.string().nullable().optional(),
        website: z.string().nullable().optional(),
        contacto_principal: z.string().nullable().optional(),
        contacto_email: z.string().nullable().optional(),
        notas: z.string().nullable().optional(),
        fuente_externa_id: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(500),
});

export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function domainOf(url?: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export type MedioCandidato = {
  fuente_externa_id: string;
  nombre: string;
  formato: MedioFormato;
  especialidad: MedioEspecialidad;
  ambito: "Nacional" | "Internacional";
  pais: string;
  ciudad: string | null;
  website: string;
  descripcion: string | null;
  verificado: boolean;
  existe: boolean;
};

const aiSchema = z.object({
  medios: z
    .array(
      z.object({
        nombre: z.string().min(1),
        website: z.string().min(4),
        formato: z.enum(MEDIO_FORMATOS),
        especialidad: z.enum(MEDIO_ESPECIALIDADES),
        pais: z.string().min(2),
        ciudad: z.string().nullable().optional(),
        descripcion: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

/* ---------------------------- Firecrawl search ---------------------------- */

type WebHit = { url: string; title: string; description: string };

const AMBITO_QUERIES: Record<string, { sufijo: string; lang: string; country: string; pais: string }[]> = {
  España: [{ sufijo: "en España", lang: "es", country: "es", pais: "España" }],
  Internacional: [{ sufijo: "internacionales (industria audiovisual y musical)", lang: "en", country: "us", pais: "Internacional" }],
};

function buildQueries(ambito: string, especialidades: string[], formatos: string[]) {
  const bases = ambito === "Ambos" ? [...AMBITO_QUERIES["España"]!, ...AMBITO_QUERIES["Internacional"]!] : AMBITO_QUERIES[ambito]!;
  const queries: { q: string; lang: string; country: string; pais: string }[] = [];
  for (const base of bases) {
    for (const esp of especialidades) {
      const formatosTxt = formatos.join(", ").toLowerCase();
      queries.push({
        q: `medios de comunicación ${esp === "Generalista" ? "generalistas" : `especializados en ${esp}`} ${base.sufijo}: ${formatosTxt} — listado de cabeceras y webs oficiales`,
        lang: base.lang,
        country: base.country,
        pais: base.pais,
      });
    }
  }
  return queries;
}

async function firecrawlSearch(query: string, lang: string, country: string, limit: number): Promise<WebHit[]> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["FIRECRAWL_API_KEY"];
  if (!lovableKey || !connKey) {
    throw new Error("Falta la conexión con el buscador web (Firecrawl). Conéctala en Conectores.");
  }

  const res = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connKey,
    },
    body: JSON.stringify({ query, limit, lang, country }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Firecrawl search failed [${res.status}]: ${body}`);
    throw new Error(`La búsqueda web falló [${res.status}]: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as any;
  const web = json?.data?.web ?? json?.data ?? [];
  return (Array.isArray(web) ? web : []).map((r: any) => ({
    url: String(r.url ?? ""),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
  }));
}

/* ------------------------------ AI extraction ----------------------------- */

async function extractMedios(
  hits: WebHit[],
  ambito: string,
  especialidades: string[],
  formatos: string[],
): Promise<z.infer<typeof aiSchema>["medios"]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Falta LOVABLE_API_KEY");

  const contexto = hits
    .slice(0, 120)
    .map((h) => `- ${h.title} | ${h.url} | ${h.description}`)
    .join("\n");

  const prompt = `A partir de estos resultados de búsqueda web, extrae MEDIOS DE COMUNICACIÓN reales y activos hoy.

Ámbito solicitado: ${ambito}
Especialidades solicitadas: ${especialidades.join(", ")}
Formatos solicitados: ${formatos.join(", ")}

Reglas estrictas:
- Devuelve el medio en sí (cabecera, emisora, canal, revista o podcast), NUNCA artículos, rankings, blogs personales, tiendas, PDFs ni directorios.
- "website" debe ser la home oficial del medio (https://dominio.tld), no la URL del artículo donde se menciona.
- Si un resultado es un listado que menciona varios medios, extrae esos medios con su dominio oficial conocido.
- Excluye medios cerrados o inactivos.
- Usa solo los valores permitidos de formato y especialidad, y solo los solicitados.
- "pais": país de edición (p. ej. España, Estados Unidos, Reino Unido).
- Máximo 60 medios, sin duplicar dominios.

RESULTADOS:
${contexto}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Eres un documentalista de medios. Respondes solo con la herramienta indicada." },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "devolver_medios",
            description: "Devuelve la lista de medios de comunicación detectados",
            parameters: {
              type: "object",
              properties: {
                medios: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      nombre: { type: "string" },
                      website: { type: "string" },
                      formato: { type: "string", enum: [...MEDIO_FORMATOS] },
                      especialidad: { type: "string", enum: [...MEDIO_ESPECIALIDADES] },
                      pais: { type: "string" },
                      ciudad: { type: "string" },
                      descripcion: { type: "string" },
                    },
                    required: ["nombre", "website", "formato", "especialidad", "pais"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["medios"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "devolver_medios" } },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (res.status === 429) throw new Error("Límite de peticiones de IA alcanzado. Inténtalo en unos minutos.");
  if (res.status === 402) throw new Error("Sin créditos de IA disponibles.");
  if (!res.ok) {
    const body = await res.text();
    console.error(`AI gateway failed [${res.status}]: ${body}`);
    throw new Error(`No se pudo clasificar los medios [${res.status}]`);
  }

  const json = (await res.json()) as any;
  const raw = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!raw) return [];
  const parsed = aiSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data.medios : [];
}

/* -------------------------------- Verify ---------------------------------- */

async function verifyUrl(url: string): Promise<boolean> {
  const attempt = async (method: "HEAD" | "GET") => {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; InteresanteCompania-CRM/1.0)" },
      signal: AbortSignal.timeout(8_000),
    });
    return res.status < 400 || res.status === 403 || res.status === 405;
  };
  try {
    return await attempt("HEAD");
  } catch {
    try {
      return await attempt("GET");
    } catch {
      return false;
    }
  }
}

async function verifyAll(urls: string[]): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  const queue = [...urls];
  const workers = Array.from({ length: 8 }, async () => {
    for (;;) {
      const url = queue.shift();
      if (!url) return;
      out[url] = await verifyUrl(url);
    }
  });
  await Promise.all(workers);
  return out;
}

/* -------------------------------- Pipeline -------------------------------- */

export async function searchMediosWeb(input: z.infer<typeof searchInput>): Promise<MedioCandidato[]> {
  const queries = buildQueries(input.ambito, input.especialidades, input.formatos);
  const perQuery = Math.max(5, Math.min(20, Math.ceil(input.limit / Math.max(1, queries.length))));

  const batches = await Promise.all(
    queries.map(async (q) => {
      try {
        return await firecrawlSearch(q.q, q.lang, q.country, perQuery);
      } catch (e) {
        console.error("Firecrawl query failed", e);
        return [] as WebHit[];
      }
    }),
  );

  const hits: WebHit[] = [];
  const seenUrls = new Set<string>();
  for (const batch of batches) {
    for (const h of batch) {
      if (!h.url || seenUrls.has(h.url)) continue;
      seenUrls.add(h.url);
      hits.push(h);
    }
  }

  if (!hits.length) {
    throw new Error("La búsqueda web no devolvió resultados. Prueba con otros filtros.");
  }

  const medios = await extractMedios(hits, input.ambito, input.especialidades, input.formatos);

  const byDomain = new Map<string, MedioCandidato>();
  for (const m of medios) {
    const url = m.website.startsWith("http") ? m.website : `https://${m.website}`;
    const dominio = domainOf(url);
    if (!dominio || byDomain.has(dominio)) continue;
    if (!input.formatos.includes(m.formato)) continue;
    if (!input.especialidades.includes(m.especialidad)) continue;
    const esEspana = normalize(m.pais) === "espana";
    byDomain.set(dominio, {
      fuente_externa_id: `web:${dominio}`,
      nombre: m.nombre.trim(),
      formato: m.formato,
      especialidad: m.especialidad,
      ambito: esEspana ? "Nacional" : "Internacional",
      pais: m.pais.trim(),
      ciudad: m.ciudad?.trim() || null,
      website: `https://${dominio}`,
      descripcion: m.descripcion?.trim() || null,
      verificado: false,
      existe: false,
    });
  }

  const candidatos = [...byDomain.values()];
  const verificados = await verifyAll(candidatos.map((c) => c.website));
  for (const c of candidatos) c.verificado = verificados[c.website] ?? false;

  return candidatos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
