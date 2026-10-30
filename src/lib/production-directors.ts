import { additionalEntities, entitiesToAdd, isEntityLinked } from "@/lib/production-links";

/**
 * Direcciones de una producción: la principal (productions.director_id)
 * más las adicionales de production_directors.
 */
export type DirectorLink = {
  id: string;
  director_id: string;
  name: string | null;
  is_primary: boolean;
};

/** ¿Ya está esa dirección en la ficha (principal o vinculada)? */
export function isDirectorLinked(directorId: string, links: DirectorLink[], primaryId?: string | null): boolean {
  return isEntityLinked(directorId, links, (l) => l.director_id, primaryId);
}

/** Direcciones adicionales, sin repetir la principal ni duplicados. */
export function additionalDirectors(links: DirectorLink[], primaryId?: string | null): DirectorLink[] {
  return additionalEntities(links, (l) => l.director_id, (l) => l.name, primaryId);
}

/** Opciones del selector: solo las direcciones que aún no están en la ficha. */
export function directorsToAdd<T extends { id: string; name: string }>(
  directors: T[],
  links: DirectorLink[],
  primaryId?: string | null,
): T[] {
  return entitiesToAdd(directors, links, (l) => l.director_id, primaryId);
}
