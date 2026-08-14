import { createFileRoute, Link } from "@tanstack/react-router";
import { CatalogIndex } from "@/components/catalog-index";

export const Route = createFileRoute("/_authenticated/_admin/directors/")({
  component: DirectorsIndex,
});

function DirectorsIndex() {
  return (
    <CatalogIndex
      table="directors"
      nameColumn="full_name"
      queryKey="directors"
      listColumns="id,full_name,email,country,agent,created_at"
      title="Directores"
      description="Directores vinculables a los proyectos de producción."
      createPlaceholder="Nombre del director"
      createLabel="Añadir director"
      emptyLabel="Sin directores."
      deleteConfirm="¿Eliminar director?"
      exportLabel="Directores"
      exportFilename="directores"
      exportFields={[
        { key: "full_name", label: "Nombre", get: (r: any) => r.full_name },
        { key: "email", label: "Email", get: (r: any) => r.email },
        { key: "phone", label: "Teléfono", get: (r: any) => r.phone },
        { key: "agent", label: "Agente", get: (r: any) => r.agent },
        { key: "country", label: "País", get: (r: any) => r.country },
        { key: "website", label: "Web", get: (r: any) => r.website },
        { key: "imdb_url", label: "IMDB", get: (r: any) => r.imdb_url },
        { key: "notes", label: "Notas", default: false, get: (r: any) => r.notes },
        { key: "created_at", label: "Creado", default: false, get: (r: any) => r.created_at },
      ]}
      subtitle={(d) => [d.country, d.agent, d.email].filter(Boolean).join(" · ") || "Abre para completar la ficha"}
      renderLink={(d, children) => (
        <Link to="/directors/$directorId" params={{ directorId: d.id }} className="flex-1">
          {children}
        </Link>
      )}
    />
  );
}
