import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { OPTIONAL_MODULES, toggleModule, useEnabledModules } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/_admin/modulos")({
  component: ModulesPage,
  head: () => ({
    meta: [
      { title: "Módulos activos · Interesante Compañía" },
      { name: "description", content: "Activa o aparca secciones del back-office para simplificar el árbol de navegación." },
      { property: "og:title", content: "Módulos activos · Interesante Compañía" },
      { property: "og:description", content: "Activa o aparca secciones del back-office para simplificar el árbol de navegación." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ModulesPage() {
  const enabled = useEnabledModules();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Ajustes</p>
        <h1 className="mt-1 font-display text-5xl">Módulos activos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aparca las secciones que no uses para aligerar el menú. No se borra nada: los datos siguen ahí y la
          sección vuelve a aparecer en cuanto la actives.
        </p>
      </header>

      <ul className="divide-y divide-border rounded-sm border border-border">
        {OPTIONAL_MODULES.map((m) => (
          <li key={m.key} className="flex items-center gap-4 px-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg">{m.label}</p>
              <p className="text-xs text-muted-foreground">{m.hint}</p>
            </div>
            <Switch
              checked={enabled.includes(m.key)}
              onCheckedChange={(v) => toggleModule(m.key, v)}
              aria-label={m.label}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
