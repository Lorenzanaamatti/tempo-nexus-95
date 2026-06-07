import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/portal/mensajes")({
  component: Mensajes,
});

function Mensajes() {
  const { composerId } = useCurrentRole();
  const { data } = useQuery({
    queryKey: ["portal-materiales", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("composer_documents")
        .select("id, title, kind, url, notes, created_at")
        .eq("composer_id", composerId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl">Materiales compartidos</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Documentos y materiales que IC ha vinculado a tu ficha. Para hablar con el equipo, usa el <Link to="/portal/chat" className="underline">Chat con IC</Link>.
        </p>
      </header>
      <section className="space-y-3">
        {!data?.length ? (
          <p className="text-sm text-muted-foreground">Aún no hay materiales compartidos.</p>
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
                    Abrir
                  </a>
                )}
                {d.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{d.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}