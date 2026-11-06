export type SearchableProduction = { id: string; title: string };

/** Quita tildes y mayúsculas para que «maleta» encuentre «La Maleta». */
export function normalizeText(s: string) {
  return (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const collator = new Intl.Collator("es", { sensitivity: "base" });

/** Orden alfabético español, sin que las tildes ni las mayúsculas descolquen una ficha. */
export function sortProductionsByTitle<T extends SearchableProduction>(productions: T[]): T[] {
  return [...productions].sort((a, b) => collator.compare(a.title ?? "", b.title ?? ""));
}

/**
 * Filtra producciones por lo que se ha escrito: todas las palabras deben aparecer
 * en el título, sin importar mayúsculas, tildes ni espacios de más.
 * Con la búsqueda vacía devuelve la lista completa ordenada.
 */
export function filterProductionsByTitle<T extends SearchableProduction>(
  productions: T[],
  query: string,
): T[] {
  const sorted = sortProductionsByTitle(productions);
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!words.length) return sorted;
  return sorted.filter((p) => {
    const hay = normalizeText(p.title ?? "");
    return words.every((w) => hay.includes(w));
  });
}
