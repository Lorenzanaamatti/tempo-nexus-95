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
  ic_participo: boolean;
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
