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
  if (!companyId) return false;
  if (primaryId && companyId === primaryId) return true;
  return links.some((l) => l.company_id === companyId);
}

/** Productoras adicionales, sin repetir la principal ni duplicados. */
export function additionalCompanies(links: CompanyLink[], primaryId?: string | null): CompanyLink[] {
  const seen = new Set<string>();
  const out: CompanyLink[] = [];
  for (const l of links) {
    if (!l.company_id) continue;
    if (primaryId && l.company_id === primaryId) continue;
    if (seen.has(l.company_id)) continue;
    seen.add(l.company_id);
    out.push(l);
  }
  return out.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "es", { sensitivity: "base" }));
}

/** Opciones del selector: solo las productoras que aún no están en la ficha. */
export function companiesToAdd<T extends { id: string; name: string }>(
  companies: T[],
  links: CompanyLink[],
  primaryId?: string | null,
): T[] {
  return companies.filter((c) => !isCompanyLinked(c.id, links, primaryId));
}
