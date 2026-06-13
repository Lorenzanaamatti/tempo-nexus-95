import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalComposer } from "@/lib/use-portal-composer";
import { IC_FUNCTION_LABEL, type IcTeamFunction } from "@/components/person-ic-functions-editor";
import { SocialLinksBadges, type SocialLinks } from "@/components/social-links";

export const Route = createFileRoute("/_authenticated/portal/carrera")({
  component: Carrera,
});

function Carrera() {
  const { composerId } = usePortalComposer();
  const { data } = useQuery({
    queryKey: ["portal-carrera", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("composers")
        .select("full_name, artistic_name, bio_short, bio_long, career_notes, reel_url, city, country, social_links")
        .eq("id", composerId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: team } = useQuery({
    queryKey: ["portal-team", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("composer_team_assignments")
        .select("id, ic_function, position, person:people(id, full_name, email, phone)")
        .eq("composer_id", composerId!)
        .order("position");
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        ic_function: IcTeamFunction | null;
        position: number;
        person: { id: string; full_name: string; email: string | null; phone: string | null } | null;
      }>;
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
      <section className="rounded-sm border border-border p-4">
        <p className="smallcaps text-xs text-muted-foreground">Redes y portales</p>
        <div className="mt-3">
          <SocialLinksBadges value={(data?.social_links ?? {}) as SocialLinks} />
        </div>
      </section>
      <Block title="Biografía breve" value={data?.bio_short} multiline />
      <Block title="Biografía extendida" value={data?.bio_long} multiline />
      <Block title="Plan de carrera vigente" value={data?.career_notes} multiline />
      <section className="rounded-sm border border-border p-4">
        <p className="smallcaps text-xs text-muted-foreground">Mi equipo IC</p>
        {team && team.length > 0 ? (
          <ul className="mt-3 divide-y divide-border">
            {team.map((row) => {
              const fn = row.ic_function ? IC_FUNCTION_LABEL[row.ic_function] : "Función por definir";
              const email = row.person?.email?.trim() || null;
              return (
                <li key={row.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-baseline">
                  <div>
                    <p className="font-display text-lg">{row.person?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{fn}</p>
                  </div>
                  <div className="text-right text-sm">
                    {email ? (
                      <a href={`mailto:${email}`} className="text-primary underline">{email}</a>
                    ) : (
                      <span className="text-muted-foreground">Contacto únicamente a través de la App</span>
                    )}
                    {row.person?.phone && (
                      <p className="text-xs text-muted-foreground">{row.person.phone}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Aún no hay personas del equipo IC asignadas a tu representación.
          </p>
        )}
      </section>
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