export type ProspeccionEstado = "sin_valorar" | "interesa_contactar" | "contactada" | "descartada";

export const PROSPECCION_ESTADOS: { value: ProspeccionEstado; label: string }[] = [
  { value: "sin_valorar", label: "Sin valorar" },
  { value: "interesa_contactar", label: "Interesa contactar" },
  { value: "contactada", label: "Contactada" },
  { value: "descartada", label: "Descartada" },
];

export const PROSPECCION_LABEL: Record<string, string> = Object.fromEntries(
  PROSPECCION_ESTADOS.map((o) => [o.value, o.label]),
);

export const EN_SEGUIMIENTO: ProspeccionEstado[] = ["interesa_contactar", "contactada"];

export type ProduccionEspanola = {
  id: string;
  tmdb_id: number | null;
  media_type: string;
  title: string;
  title_original: string | null;
  title_es: string | null;
  year: number | null;
  release_date: string | null;
  poster_path: string | null;
  directors: string[];
  production_companies: string[];
  genres: string[];
  runtime: number | null;
  platform: string | null;
  countries: string[];
  synopsis: string | null;
  tmdb_url: string | null;
  tmdb_status: string | null;
  composer: string | null;
  music_supervisor: string | null;
  mezclador: string | null;
  orquestador: string | null;
  orquesta: string | null;
  director_orquesta: string | null;
  box_office: number | null;
  budget: number | null;
  ic_participo: boolean;
  origen: string;
  ic_personas: string[];
  produccion_ic_vinculada: string | null;
  representados_vinculados: string[];
  estado_prospeccion: ProspeccionEstado;
  oportunidad_vinculada: string | null;
  notas: string | null;
  last_synced_at: string | null;
};

export function posterUrl(path: string | null | undefined, size: "w185" | "w342" = "w342") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

/** Roles de equipo musical que la app trata como oportunidad de fichaje. */
export const ROLES_FICHAJE = [
  { key: "mezclador", label: "Mezclador" },
  { key: "orquestador", label: "Orquestador" },
  { key: "orquesta", label: "Orquesta" },
  { key: "director_orquesta", label: "Director de orquesta" },
] as const;

export type RolFichaje = (typeof ROLES_FICHAJE)[number]["key"];
