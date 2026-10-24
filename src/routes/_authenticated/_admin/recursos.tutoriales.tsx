import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrentRole } from "@/lib/use-role";
import { useMyOnboardingProgress, useOnboardingSlides } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_admin/recursos/tutoriales")({
  component: Tutoriales,
  head: () => ({
    meta: [
      { title: "Tutoriales y onboarding · IC APP" },
      { name: "description", content: "Onboarding de bienvenida y guías internas de Interesante Compañía." },
      { property: "og:title", content: "Tutoriales y onboarding · IC APP" },
      { property: "og:description", content: "Onboarding de bienvenida y guías internas de Interesante Compañía." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Tutoriales() {
  const { user } = useAuth();
  const { isBigC } = useCurrentRole();
  const { data: slides = [] } = useOnboardingSlides();
  const { data: progress } = useMyOnboardingProgress(user?.id);
  const total = slides.length || 1;
  const done = progress?.completed_at ? total : Math.min(progress?.last_position ?? 0, total);
  const pct = Math.round((done / total) * 100);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-4xl uppercase text-aubergine">Tutoriales</h1>
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-rust">Onboarding</p>
        <h2 className="mt-1 font-display text-2xl uppercase text-aubergine">Benvinguda a Plusmusic / Interesante Compañía</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {slides.length} diapositives en 5 capítols: qui som, qui és qui, cultura, com es fa una peli i l’agència.
        </p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {progress?.completed_at ? "Completado" : `${pct}% recorrido`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/recursos/onboarding">{progress?.last_position ? "Continuar" : "Empezar"}</Link>
          </Button>
          {isBigC && (
            <Button asChild variant="outline">
              <Link to="/recursos/onboarding" search={{ edit: true }}>Editar</Link>
            </Button>
          )}
        </div>
      </div>
      {isBigC && <ProgressPanel total={slides.length} />}
    </div>
  );
}

function ProgressPanel({ total }: { total: number }) {
  const { data } = useQuery({
    queryKey: ["onboarding-progress-team"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "team"]);
      const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
      const [{ data: profiles }, { data: prog }] = await Promise.all([
        supabase.from("profiles").select("id, display_name").in("id", ids),
        supabase.from("onboarding_progress").select("user_id, last_position, completed_at").in("user_id", ids),
      ]);
      return ids.map((id) => {
        const p = prog?.find((x) => x.user_id === id);
        return {
          id,
          name: profiles?.find((x) => x.id === id)?.display_name ?? "Sin nombre",
          last: p?.last_position ?? 0,
          completed: p?.completed_at ?? null,
        };
      });
    },
  });
  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6">
      <h3 className="font-display text-xl uppercase text-aubergine">Quién lo ha hecho</h3>
      <ul className="mt-4 divide-y divide-border text-sm">
        {(data ?? []).map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2">
            <span>{r.name}</span>
            <span className={r.completed ? "font-semibold text-primary" : "text-muted-foreground"}>
              {r.completed
                ? `Completado ${new Date(r.completed).toLocaleDateString("es-ES")}`
                : r.last
                  ? `Va por la ${r.last} de ${total}`
                  : "Sin empezar"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
