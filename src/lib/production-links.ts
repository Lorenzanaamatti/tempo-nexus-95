/**
 * Vínculos múltiples entre una producción y fichas del CRM (productoras, direcciones…).
 * La ficha "principal" sigue viviendo en la propia producción; las demás, en la tabla de vínculo.
 */
export type Named = { id: string; name: string };

/** ¿Ya está esa ficha en la producción (principal o vinculada)? */
export function isEntityLinked<T>(
  id: string,
  links: T[],
  fk: (l: T) => string | null,
  primaryId?: string | null,
): boolean {
  if (!id) return false;
  if (primaryId && id === primaryId) return true;
  return links.some((l) => fk(l) === id);
}

/** Vínculos adicionales, sin repetir la principal ni duplicados, ordenados por nombre. */
export function additionalEntities<T>(
  links: T[],
  fk: (l: T) => string | null,
  name: (l: T) => string | null,
  primaryId?: string | null,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const l of links) {
    const id = fk(l);
    if (!id) continue;
    if (primaryId && id === primaryId) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(l);
  }
  return out.sort((a, b) => (name(a) ?? "").localeCompare(name(b) ?? "", "es", { sensitivity: "base" }));
}

/** Opciones del selector: solo las fichas que aún no están en la producción. */
export function entitiesToAdd<T extends Named, L>(
  items: T[],
  links: L[],
  fk: (l: L) => string | null,
  primaryId?: string | null,
): T[] {
  return items.filter((i) => !isEntityLinked(i.id, links, fk, primaryId));
}
