import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/portal/proyectos")({
  component: Proyectos,
});

function Proyectos() {
  const { composerId } = useCurrentRole();
  const { data, isLoading } = useQuery({
    queryKey: ["portal-proyectos", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("composer_projects")
        .select("id, production, year, director, production_company, platform, music_type, notes, production_type")
        .eq("composer_id", composerId!)
        .order("position");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl">Proyectos activos</h2>
        <p className="mt-2 text-sm text-muted-foreground">Producciones en curso vinculadas a tu representación.</p>
      </header>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">No hay proyectos activos.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((p) => (
            <li key={p.id} className="rounded-sm border border-border p-4">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-display text-lg">{p.production}</p>
                <div className="flex items-center gap-2">
                  {p.production_type && (
                    <span className="smallcaps rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {p.production_type}
                    </span>
                  )}
                  {p.year && <span className="smallcaps text-xs text-muted-foreground">{p.year}</span>}
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {[p.director, p.production_company, p.platform].filter(Boolean).join(" · ") || "—"}
              </p>
              {p.music_type && <p className="mt-1 text-xs text-muted-foreground">{p.music_type}</p>}
              {p.notes && (
                <div className="mt-3 rounded-sm border border-border bg-card/40 p-3">
                  <p className="smallcaps text-xs text-muted-foreground">Estado y próximo hito</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{p.notes}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}