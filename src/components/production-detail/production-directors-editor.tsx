import { ProductionLinksEditor, type ProductionLinkConfig } from "@/components/production-detail/production-links-editor";

const CFG: ProductionLinkConfig = {
  linkTable: "production_directors",
  linkFk: "director_id",
  crmTable: "directors",
  crmNameColumn: "full_name",
  crmQueryKey: ["directors-mini"],
  linkQueryKey: ["production-directors-link"],
  label: "Dirección (puede haber varias)",
  placeholder: "Añadir otra dirección…",
  createLabel: "Crear director",
  createdToast: "Director creado en el CRM",
  alreadyText: "Esa dirección ya está en la ficha",
  removeTitle: "Quitar dirección",
  emptyText: "Sin dirección vinculada.",
  invalidate: [["director-history"], ["directors"]],
};

/**
 * Direcciones de la producción: la principal se edita arriba (Director) y aquí
 * se añaden o quitan las demás.
 */
export function ProductionDirectorsEditor({
  productionId,
  primaryDirectorId,
  primaryDirectorName,
}: {
  productionId: string;
  primaryDirectorId: string | null;
  primaryDirectorName: string | null;
}) {
  return (
    <ProductionLinksEditor
      productionId={productionId}
      primaryId={primaryDirectorId}
      primaryName={primaryDirectorName}
      cfg={CFG}
    />
  );
}
