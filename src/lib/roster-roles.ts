/**
 * Fuente única de las categorías de representación (composers.roster_role).
 * La nomenclatura debe ser idéntica en toda la app.
 */
export const ROSTER_ROLES = [
  "composer",
  "artist",
  "curator",
  "supervisor",
  "productor_musical",
  "specialist",
  "other",
] as const;
export type RosterRoleValue = (typeof ROSTER_ROLES)[number];

export const ROSTER_ROLE_LABELS: Record<string, string> = {
  composer: "Composer",
  artist: "Artista",
  curator: "Music Curator",
  supervisor: "Music Supervisor",
  productor_musical: "Productor Musical",
  specialist: "Especialista",
  other: "Otros",
  ic_company: "IC",
};

export function rosterRoleLabel(role: string | null | undefined) {
  return ROSTER_ROLE_LABELS[role ?? "other"] ?? role ?? "—";
}

export const ROSTER_ROLE_OPTIONS = ROSTER_ROLES.map((value) => ({
  value,
  label: ROSTER_ROLE_LABELS[value]!,
}));

/** Sugerencias de subcategoría (campo libre: se puede escribir cualquier otra). */
export const ROSTER_ROLE_SUBTYPES: Record<string, string[]> = {
  composer: ["Cine", "Series", "Documental", "Publicidad", "Videojuegos", "Escena"],
  artist: ["Cantante", "Instrumentista", "Banda", "DJ"],
  curator: ["Sync", "Programación", "Catálogo"],
  supervisor: ["Ficción", "Publicidad", "Plataformas"],
  productor_musical: ["Estudio", "Directo", "Electrónica", "Orquestal"],
  specialist: ["Orquestador", "Copista", "Cantante", "Ingeniero", "Arreglista", "Editor musical", "Programador"],
  other: [],
};
