import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/portal/carrera")({
  component: Carrera,
});

function Carrera() {
  const { composerId } = useCurrentRole();
  const { data } = useQuery({
    queryKey: ["portal-carrera", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("composers")
        .select("full_name, artistic_name, bio_short, bio_long, career_notes, reel_url, city, country")
        .eq("id", composerId!)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl">Mi carrera</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu biografía, materiales y notas de carrera. Para modificarlos, contacta con tu agente.
        </p>
      </header>
      <Block title="Nombre artístico" value={data?.artistic_name || data?.full_name} />
      <Block title="Ubicación" value={[data?.city, data?.country].filter(Boolean).join(" · ")} />
      <Block title="Reel" value={data?.reel_url} link />
      <Block title="Biografía breve" value={data?.bio_short} multiline />
      <Block title="Biografía extendida" value={data?.bio_long} multiline />
      <Block title="Plan de carrera vigente" value={data?.career_notes} multiline />
      <section className="rounded-sm border border-border p-4">
        <p className="smallcaps text-xs text-muted-foreground">Mercados y objetivos</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Los mercados estratégicos y objetivos anuales se definen junto con tu agente. Consulta la última versión acordada en la sección de Contratos y derechos o solicita una revisión.
        </p>
      </section>
    </div>
  );
}

function Block({ title, value, multiline, link }: { title: string; value?: string | null; multiline?: boolean; link?: boolean }) {
  return (
    <section className="rounded-sm border border-border p-4">
      <p className="smallcaps text-xs text-muted-foreground">{title}</p>
      {value ? (
        link ? (
          <a href={value} target="_blank" rel="noreferrer" className="mt-1 block break-all text-primary underline">{value}</a>
        ) : (
          <p className={`mt-1 ${multiline ? "whitespace-pre-wrap text-sm" : "font-display text-lg"}`}>{value}</p>
        )
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">—</p>
      )}
    </section>
  );
}