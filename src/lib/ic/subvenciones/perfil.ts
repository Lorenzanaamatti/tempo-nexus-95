/**
 * Perfil de Interesante Compañía usado para filtrar y puntuar convocatorias.
 * Los filtros duros se aplican antes de llamar a la IA, para no puntuar ruido.
 */
export const PERFIL_INTERESANTE = `Interesante Compañía es una empresa cultural española de nueva creación, con sede en
Barcelona (Cataluña), fundada y dirigida por mujeres.
Actividad: representación y management de músicos y compositores, con foco en cine y
audiovisual (supervisión musical, composición para ficción, documental y publicidad),
fomento de la igualdad de género en la industria musical y apoyo a los estudios musicales
de mujeres. Es una pyme joven; no es una entidad sin ánimo de lucro, aunque representa a
artistas que sí pueden ser beneficiarios de ayudas individuales.
Territorios de interés: Barcelona, Cataluña, España, Unión Europea e Iberoamérica.`;

/** Palabras que hacen relevante una convocatoria para Interesante. */
export const PALABRAS_RELEVANTES = [
  "música",
  "musical",
  "audiovisual",
  "cine",
  "serie",
  "cultura",
  "cultural",
  "creativ",
  "industrias culturales",
  "editorial",
  "artista",
  "digitaliza",
  "inteligencia artificial",
  "tecnolog",
  "innovación",
  "i+d",
  "internacionaliza",
  "exportación",
  "emprendedora",
  "mujer",
  "femenino",
  "pyme",
  "autónom",
  "empresa",
  "contratación",
  "formación",
  "propiedad intelectual",
  // Variantes en catalán: CIDO publica en catalán.
  "musica",
  "audiovisuals",
  "cinema",
  "cultura popular",
  "creació",
  "creacio",
  "empresa cultural",
  "indústries culturals",
  "industries culturals",
  "artistic",
  "artístic",
  "digitalitzacio",
  "innovacio",
  "internacionalitzacio",
  "formacio",
  "empreses",
  "autonom",
  "dones",
  "propietat intel",
  // Señas de identidad de Interesante.
  "igualdad de género",
  "igualtat",
  "paridad",
  "violencia de género",
  "conciliación",
  "emprendimiento femenino",
  "emprenedoria",
  "nueva creación",
  "joven empresa",
  "startup",
  "representación de artistas",
  "management",
  "cortometraje",
  "documental",
  "largometraje",
  "becas",
  "beques",
  "estudios musicales",
  "conservatorio",
  "formación musical",
];

/** Palabras que descartan la convocatoria sin consultar a la IA. */
export const PALABRAS_EXCLUIDAS = [
  "agricultura",
  "agrario",
  "ganader",
  "pesca",
  "forestal",
  "regadío",
  "vivienda",
  "alquiler social",
  "rehabilitación de edificios",
  "taxi",
  "vtc",
  "transporte de mercancías",
  "explotación minera",
  "caza",
  "cofradía",
  "parroquia",
  "obra hidráulica",
  "carretera",
  "alumbrado público",
  "residuos urbanos",
  "bomberos",
];

const TERRITORIOS_VALIDOS = [
  "españa",
  "estatal",
  "nacional",
  "cataluña",
  "catalunya",
  "barcelona",
  "europ",
  "unión europea",
  "iberoam",
  "internacional",
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

const sin = (lista: string[]) => lista.map(normalizar);

/**
 * Filtro duro previo a la IA. Devuelve null si pasa, o el motivo del descarte.
 */
export function motivoDescarte(texto: string, territorio?: string | null): string | null {
  const t = normalizar(texto);
  const excluida = sin(PALABRAS_EXCLUIDAS).find((p) => t.includes(p));
  if (excluida) return `Sector ajeno (${excluida})`;

  const relevante = sin(PALABRAS_RELEVANTES).some((p) => t.includes(p));
  if (!relevante) return "Sin relación con la actividad de Interesante";

  if (territorio) {
    const ter = normalizar(territorio);
    const encaja = sin(TERRITORIOS_VALIDOS).some((p) => ter.includes(p));
    // Una comunidad autónoma distinta de Cataluña no sirve.
    if (!encaja) return `Territorio fuera de alcance (${territorio})`;
  }
  return null;
}
