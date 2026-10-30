import { additionalEntities, entitiesToAdd, isEntityLinked } from "@/lib/production-links";

/**
 * Productoras de una producción: la principal (productions.partner_company_id)
 * más las adicionales de production_partner_companies.
 */
export type CompanyLink = {
  id: string;
  company_id: string;
  name: string | null;
  is_primary: boolean;
};

/** ¿Ya está esa productora en la ficha (principal o vinculada)? */
export function isCompanyLinked(companyId: string, links: CompanyLink[], primaryId?: string | null): boolean {
  return isEntityLinked(companyId, links, (l) => l.company_id, primaryId);
}

/** Productoras adicionales, sin repetir la principal ni duplicados. */
export function additionalCompanies(links: CompanyLink[], primaryId?: string | null): CompanyLink[] {
  return additionalEntities(links, (l) => l.company_id, (l) => l.name, primaryId);
}

/** Opciones del selector: solo las productoras que aún no están en la ficha. */
export function companiesToAdd<T extends { id: string; name: string }>(
  companies: T[],
  links: CompanyLink[],
  primaryId?: string | null,
): T[] {
  return entitiesToAdd(companies, links, (l) => l.company_id, primaryId);
}
