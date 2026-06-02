import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/portal/agenda")({
  component: Agenda,
});

function Agenda() {
  const { composerId } = useCurrentRole();
  const { data, isLoading } = useQuery({
    queryKey: ["portal-agenda", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: person } = await supabase
        .from("people")
        .select("id")
        .eq("composer_id", composerId!)
        .maybeSingle();
      if (!person) return [];
      const { data } = await supabase
        .from("calendar_events")
        .select("id, title, note, kind, start_date, end_date")
        .eq("subject_type", "person")
        .eq("subject_id", person.id)
        .gte("end_date", today)
        .order("start_date");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl">Agenda y reuniones</h2>
        <p className="mt-2 text-sm text-muted-foreground">Tus próximos compromisos y citas.</p>
      </header>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">No hay eventos próximos.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((e) => (
            <li key={e.id} className="rounded-sm border border-border p-4">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-display text-lg">{e.title || "Sin título"}</p>
                <span className="smallcaps text-xs text-muted-foreground">{e.kind}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {e.start_date}{e.end_date && e.end_date !== e.start_date ? ` → ${e.end_date}` : ""}
              </p>
              {e.note && <p className="mt-2 whitespace-pre-wrap text-sm">{e.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}