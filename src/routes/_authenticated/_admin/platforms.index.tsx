import { createFileRoute } from "@tanstack/react-router";
import { CatalogIndex } from "@/components/catalog-index";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/_admin/platforms/")({
  component: PlatformsIndex,
});

function PlatformsIndex() {
  return (
    <CatalogIndex
      table="platforms"
      nameColumn="name"
      queryKey="platforms"
      title="Plataformas"
      description="Plataformas de distribución y streaming vinculables a las producciones."
      createPlaceholder="Nombre de la plataforma"
      createLabel="Añadir plataforma"
      emptyLabel="Sin plataformas."
      deleteConfirm="¿Eliminar plataforma?"
      exportLabel="Plataformas"
      exportFilename="plataformas"
      exportFields={[
        { key: "name", label: "Nombre", get: (r: any) => r.name },
        { key: "contact_name", label: "Contacto", get: (r: any) => r.contact_name },
        { key: "email", label: "Email", get: (r: any) => r.email },
        { key: "phone", label: "Teléfono", get: (r: any) => r.phone },
        { key: "website", label: "Web", get: (r: any) => r.website },
        { key: "country", label: "País", get: (r: any) => r.country },
        { key: "notes", label: "Notas", default: false, get: (r: any) => r.notes },
        { key: "created_at", label: "Creado", default: false, get: (r: any) => r.created_at },
      ]}
      subtitle={(p) => [p.country, p.contact_name, p.email].filter(Boolean).join(" · ")}
      renderExtra={(p, update) => (
        <>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input defaultValue={p.contact_name ?? ""} placeholder="Contacto" onBlur={(e) => update({ contact_name: e.target.value || null })} />
            <Input defaultValue={p.email ?? ""} placeholder="Email" onBlur={(e) => update({ email: e.target.value || null })} />
            <Input defaultValue={p.phone ?? ""} placeholder="Teléfono" onBlur={(e) => update({ phone: e.target.value || null })} />
            <Input defaultValue={p.website ?? ""} placeholder="Web" onBlur={(e) => update({ website: e.target.value || null })} />
            <Input defaultValue={p.country ?? ""} placeholder="País" onBlur={(e) => update({ country: e.target.value || null })} />
          </div>
          <Textarea defaultValue={p.notes ?? ""} placeholder="Notas" rows={2} className="mt-2" onBlur={(e) => update({ notes: e.target.value || null })} />
        </>
      )}
    />
  );
}
