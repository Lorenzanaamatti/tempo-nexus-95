import { z } from "zod";

import { MEDIO_TIPOS, type MedioTipo } from "@/lib/medios-model";
export { MEDIO_TIPOS };
export type { MedioTipo };

const QIDS: Record<MedioTipo, string[]> = {
  "Prensa escrita": ["Q11032"],
  Revista: ["Q41298", "Q1002697"],
  Radio: ["Q14350", "Q1474493"],
  "Cadena de televisión": ["Q2001305", "Q1616075"],
  "Medio digital": ["Q1153191", "Q17232649"],
};

export const searchInput = z.object({
  pais: z.string().min(2).default("España"),
  tipos: z.array(z.enum(MEDIO_TIPOS)).min(1),
  limit: z.number().int().min(1).max(1000).default(400),
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
        fuente_externa_id: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(1000),
});

const COUNTRY_QID: Record<string, string> = {
  españa: "Q29",
  espana: "Q29",
  spain: "Q29",
  francia: "Q142",
  italia: "Q38",
  portugal: "Q45",
  alemania: "Q183",
  "reino unido": "Q145",
  "estados unidos": "Q30",
  méxico: "Q96",
  mexico: "Q96",
  argentina: "Q414",
};

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
  subtipo: MedioTipo;
  ciudad: string | null;
  pais: string;
  website: string | null;
  existe: boolean;
};

export async function queryWikidata(pais: string, tipos: MedioTipo[], limit: number): Promise<MedioCandidato[]> {
  const countryQid = COUNTRY_QID[normalize(pais)] ?? "Q29";
  const out: MedioCandidato[] = [];

  for (const tipo of tipos) {
    const classes = QIDS[tipo].map((q) => `wd:${q}`).join(" ");
    const sparql = `SELECT ?item ?itemLabel ?web ?ciudadLabel WHERE {
  VALUES ?cls { ${classes} }
  ?item wdt:P31/wdt:P279* ?cls ;
        wdt:P17 wd:${countryQid} .
  OPTIONAL { ?item wdt:P856 ?web }
  OPTIONAL { ?item wdt:P159 ?ciudad }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
} LIMIT ${Math.max(20, Math.floor(limit / tipos.length))}`;

    const res = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/sparql-results+json",
        "User-Agent": "InteresanteCompania-CRM/1.0 (contacto@interesante.app)",
      },
      body: new URLSearchParams({ query: sparql }).toString(),
    });
    if (!res.ok) {
      throw new Error(`Wikidata devolvió ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const json = (await res.json()) as any;
    for (const b of json.results?.bindings ?? []) {
      const uri: string = b.item?.value ?? "";
      const qid = uri.split("/").pop() ?? "";
      const nombre: string = b.itemLabel?.value ?? "";
      if (!qid || !nombre || /^Q\d+$/.test(nombre)) continue;
      out.push({
        fuente_externa_id: `wikidata:${qid}`,
        nombre,
        subtipo: tipo,
        ciudad: b.ciudadLabel?.value && !/^Q\d+$/.test(b.ciudadLabel.value) ? b.ciudadLabel.value : null,
        pais,
        website: b.web?.value ?? null,
        existe: false,
      });
    }
  }

  const seen = new Set<string>();
  return out
    .filter((c) => (seen.has(c.fuente_externa_id) ? false : (seen.add(c.fuente_externa_id), true)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
