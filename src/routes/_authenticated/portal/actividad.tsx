import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { usePortalComposer } from "@/lib/use-portal-composer";
import { AgencyTimeline, fetchAgencyTimeline } from "@/components/agency-activity";

export const Route = createFileRoute("/_authenticated/portal/actividad")({
  head: () => ({
    meta: [
      { title: "Lo que hacemos por ti · Portal Interesante" },
      { name: "description", content: "Historial completo de gestiones de la agencia para tu carrera." },
      { property: "og:title", content: "Lo que hacemos por ti · Portal Interesante" },
      { property: "og:description", content: "Historial completo de gestiones de la agencia para tu carrera." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Actividad,
});

function Actividad() {
  const { composerId } = usePortalComposer();
  const q = useQuery({
    queryKey: ["agency-timeline", composerId, "visible"],
    enabled: !!composerId,
    queryFn: () => fetchAgencyTimeline(composerId!, true),
  });
  const items = q.data ?? [];
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const thisYear = items.filter((i) => i.date >= yearStart);
  const count = (k: string) => thisYear.filter((i) => i.kind === k).length;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-3xl">Lo que hacemos por ti</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Todas las gestiones de Interesante para tu carrera: cada vez que te presentamos a un proyecto,
          enviamos tu material, nos reunimos con una productora o conseguimos un trabajo.
        </p>
      </header>
      <div className="grid gap-px border border-border bg-border sm:grid-cols-4">
        {[
          ["Gestiones este año", thisYear.length],
          ["Pitches", count("pitch")],
          ["Envíos y reuniones", count("envio_material") + count("reunion") + count("llamada")],
          ["Producciones", count("produccion")],
        ].map(([l, v]) => (
          <div key={l as string} className="bg-background px-5 py-4">
            <p className="smallcaps text-[10px] text-muted-foreground">{l}</p>
            <p className="font-display text-3xl">{v}</p>
          </div>
        ))}
      </div>
      {q.isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : <AgencyTimeline items={items} />}
    </div>
  );
}
