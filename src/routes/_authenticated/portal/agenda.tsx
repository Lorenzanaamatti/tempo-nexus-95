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
      const [{ data: person }, { data: prods }] = await Promise.all([
        supabase.from("people").select("id").eq("composer_id", composerId!).maybeSingle(),
        (supabase as any).from("productions").select("id").eq("composer_id", composerId!),
      ]);
      const subjects: { type: string; id: string }[] = [
        { type: "composer", id: composerId! },
      ];
      if (person?.id) subjects.push({ type: "person", id: person.id });
      for (const p of (prods ?? []) as { id: string }[]) subjects.push({ type: "production", id: p.id });

      const results = await Promise.all(
        subjects.map((s) =>
          supabase
            .from("calendar_events")
            .select("id, title, note, kind, start_date, end_date, subject_type")
            .eq("subject_type", s.type as any)
            .eq("subject_id", s.id),
        ),
      );
      const seen = new Set<string>();
      const data: any[] = [];
      for (const r of results) {
        for (const ev of r.data ?? []) {
          if (seen.has(ev.id)) continue;
          seen.add(ev.id);
          data.push(ev);
        }
      }
      data.sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
      const today = new Date().toISOString().slice(0, 10);
      const all = data;
      return {
        upcoming: all.filter((e) => (e.end_date ?? e.start_date) >= today),
        past: all
          .filter((e) => (e.end_date ?? e.start_date) < today && e.note)
          .reverse(),
      };
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-3xl">Agenda y reuniones</h2>
        <p className="mt-2 text-sm text-muted-foreground">Tus próximos compromisos y citas.</p>
      </header>
      <div className="rounded-sm border border-dashed border-border p-4 text-sm text-muted-foreground">
        <p className="font-display text-base text-foreground">Solicitud de reuniones vía Calendly · próximamente</p>
        <p className="mt-1">
          La reserva de reuniones con tu agente se vinculará a <strong>Calendly</strong> en una próxima actualización.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="font-display text-xl">Reuniones futuras</h3>
            {!data?.upcoming.length ? (
              <p className="text-sm text-muted-foreground">No hay eventos próximos.</p>
            ) : (
              <ul className="space-y-3">
                {data.upcoming.map((e) => (
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
          </section>
          <section className="space-y-3">
            <h3 className="font-display text-xl">Actas de reuniones</h3>
            {!data?.past.length ? (
              <p className="text-sm text-muted-foreground">Aún no hay actas registradas.</p>
            ) : (
              <ul className="space-y-3">
                {data.past.map((e) => (
                  <li key={e.id} className="rounded-sm border border-border p-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="font-display text-lg">{e.title || "Reunión"}</p>
                      <span className="smallcaps text-xs text-muted-foreground">{e.start_date}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{e.note}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}