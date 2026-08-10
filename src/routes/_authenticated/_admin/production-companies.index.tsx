import { createFileRoute, Link } from "@tanstack/react-router";
import { CatalogIndex } from "@/components/catalog-index";

export const Route = createFileRoute("/_authenticated/_admin/production-companies/")({
  component: ProductionCompaniesIndex,
});

function ProductionCompaniesIndex() {
  return (
    <CatalogIndex
      table="production_companies"
      nameColumn="name"
      queryKey="production-companies"
      title="Productoras"
      description="Partners y productoras vinculables a los proyectos de producción."
      createPlaceholder="Nombre de la productora"
      createLabel="Añadir productora"
      emptyLabel="Sin productoras."
      deleteConfirm="¿Eliminar productora?"
      exportLabel="Productoras"
      exportFilename="productoras"
      exportFields={[
        { key: "name", label: "Nombre", get: (r: any) => r.name },
        { key: "legal_name", label: "Razón social", get: (r: any) => r.legal_name },
        { key: "cif", label: "CIF", get: (r: any) => r.cif },
        { key: "contact_name", label: "Contacto", get: (r: any) => r.contact_name },
        { key: "email", label: "Email", get: (r: any) => r.email },
        { key: "phone", label: "Teléfono", get: (r: any) => r.phone },
        { key: "website", label: "Web", get: (r: any) => r.website },
        { key: "address", label: "Dirección", default: false, get: (r: any) => r.address },
        { key: "city", label: "Ciudad", get: (r: any) => r.city },
        { key: "country", label: "País", get: (r: any) => r.country },
        { key: "area_managers", label: "Responsables de área", default: false, get: (r: any) => r.area_managers },
        { key: "contract_notes", label: "Notas de contrato", default: false, get: (r: any) => r.contract_notes },
        { key: "notes", label: "Notas", default: false, get: (r: any) => r.notes },
        { key: "created_at", label: "Creado", default: false, get: (r: any) => r.created_at },
      ]}
      subtitle={(c) => [c.cif, c.city, c.country, c.email].filter(Boolean).join(" · ") || "Sin datos · abre para completar"}
      renderLink={(c, children) => (
        <Link to="/production-companies/$companyId" params={{ companyId: c.id }} className="flex-1">
          {children}
        </Link>
      )}
    />
  );
}
