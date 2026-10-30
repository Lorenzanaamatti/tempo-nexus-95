import { ProductionLinksEditor, type ProductionLinkConfig } from "@/components/production-detail/production-links-editor";

const CFG: ProductionLinkConfig = {
  linkTable: "production_partner_companies",
  linkFk: "company_id",
  crmTable: "production_companies",
  crmNameColumn: "name",
  crmQueryKey: ["production-companies-mini"],
  linkQueryKey: ["production-companies-link"],
  label: "Productoras (puede haber varias)",
  placeholder: "Añadir otra productora…",
  createLabel: "Crear productora",
  createdToast: "Productora creada en el CRM",
  alreadyText: "Esa productora ya está en la ficha",
  removeTitle: "Quitar productora",
  emptyText: "Sin productoras vinculadas.",
  invalidate: [["partner-productions"]],
};

/**
 * Productoras de la producción: la principal se edita arriba (Cliente / Productora)
 * y aquí se añaden o quitan las demás.
 */
export function ProductionCompaniesEditor({
  productionId,
  primaryCompanyId,
  primaryCompanyName,
}: {
  productionId: string;
  primaryCompanyId: string | null;
  primaryCompanyName: string | null;
}) {
  return (
    <ProductionLinksEditor
      productionId={productionId}
      primaryId={primaryCompanyId}
      primaryName={primaryCompanyName}
      cfg={CFG}
    />
  );
}
