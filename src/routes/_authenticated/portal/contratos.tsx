import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/portal/contratos")({
  component: Contratos,
});

function Contratos() {
  const { composerId } = useCurrentRole();
  const { data, isLoading } = useQuery({
    queryKey: ["portal-contratos", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("composer_documents")
        .select("id, title, kind, url, notes")
        .eq("composer_id", composerId!)
        .order("position");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl">Contratos y derechos</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Documentación contractual, acuerdos y materiales legales asociados a tu representación.
        </p>
      </header>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Aún no hay documentos disponibles.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((d) => (
            <li key={d.id} className="rounded-sm border border-border p-4">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-display text-lg">{d.title}</p>
                {d.kind && <span className="smallcaps text-xs text-muted-foreground">{d.kind}</span>}
              </div>
              {d.url && (
                <a href={d.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-primary underline">
                  Abrir documento
                </a>
              )}
              {d.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{d.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}