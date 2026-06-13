import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Kind = "director" | "company" | "platform" | "composer-person";

/**
 * Lista unificada de obras (Filmografía manual + Películas ES + Producciones IC)
 * que referencian la entidad indicada.
 */
export function RelatedWorks({
  kind,
  id,
  personId,
  title = "Obras vinculadas",
}: {
  kind: Kind;
  /** id de la entidad principal (director/company/platform/composer) */
  id: string;
  /** id en people, solo necesario para 'composer-person' (BSO/Supervisor en Películas ES) */
  personId?: string | null;
  title?: string;
}) {
  const q = useQuery({
    queryKey: ["related-works", kind, id, personId ?? null],
    queryFn: async () => {
      // 1) Filmografía manual
      let filmoQ = supabase
        .from("composer_filmography")
        .select("id, title, year, composer:composers(id, full_name, artistic_name)");
      if (kind === "director") filmoQ = filmoQ.eq("director_id", id);
      if (kind === "company") filmoQ = filmoQ.eq("production_company_id", id);
      if (kind === "platform") filmoQ = filmoQ.eq("platform_id", id);
      if (kind === "composer-person") filmoQ = filmoQ.eq("composer_id", id);
      const filmo = await filmoQ;

      // 2) Producciones IC
      let prodQ = (supabase as any)
        .from("productions")
        .select(
          "id, title, year, project_type, composer:composers(id, full_name, artistic_name)",
        );
      if (kind === "director") prodQ = prodQ.eq("director_id", id);
      if (kind === "company") prodQ = prodQ.eq("partner_company_id", id);
      if (kind === "platform") prodQ = prodQ.eq("platform_id", id);
      if (kind === "composer-person") prodQ = prodQ.eq("composer_id", id);
      const prod = await prodQ;

      // 3) Películas ES
      let sfQ: any = supabase
        .from("spanish_films")
        .select("id, title, title_es, year, composer, music_supervisor");
      if (kind === "director") sfQ = sfQ.contains("director_ids", [id]);
      else if (kind === "company") sfQ = sfQ.contains("production_company_ids", [id]);
      else if (kind === "composer-person" && personId)
        sfQ = sfQ.or(
          `composer_person_id.eq.${personId},music_supervisor_person_id.eq.${personId}`,
        );
      else sfQ = null;
      const sf = sfQ ? await sfQ : { data: [] as any[] };

      return {
        filmo: filmo.data ?? [],
        prod: prod.data ?? [],
        sf: sf.data ?? [],
      };
    },
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando obras…</p>;
  const data = q.data!;
  const total = data.filmo.length + data.prod.length + data.sf.length;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between border-b border-border pb-2">
        <h2 className="font-display text-2xl">{title}</h2>
        <span className="smallcaps text-xs text-muted-foreground">{total} entradas</span>
      </div>

      {total === 0 && (
        <p className="text-sm text-muted-foreground">
          Sin obras vinculadas todavía. Aparecerán aquí cuando enlaces este registro desde una
          Filmografía, una Producción IC o desde Películas ES.
        </p>
      )}

      {data.prod.length > 0 && (
        <Group label="Producciones IC">
          {data.prod.map((p: any) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-1.5">
              <Link
                to="/productions/$productionId"
                params={{ productionId: p.id }}
                className="hover:underline"
              >
                {p.title}
              </Link>
              <span className="text-xs text-muted-foreground">
                {[p.year, p.composer?.artistic_name || p.composer?.full_name]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </Group>
      )}

      {data.filmo.length > 0 && (
        <Group label="Filmografía (Roster)">
          {data.filmo.map((f: any) => (
            <li key={f.id} className="flex items-center justify-between gap-3 py-1.5">
              <span>
                {f.title}
                {f.composer?.id && (
                  <Link
                    to="/composers/$composerId"
                    params={{ composerId: f.composer.id }}
                    className="ml-2 text-xs text-primary hover:underline"
                  >
                    → {f.composer.artistic_name || f.composer.full_name}
                  </Link>
                )}
              </span>
              <span className="text-xs text-muted-foreground">{f.year ?? "—"}</span>
            </li>
          ))}
        </Group>
      )}

      {data.sf.length > 0 && (
        <Group label="Películas ES">
          {data.sf.map((s: any) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-1.5">
              <Link to="/peliculas-es" className="hover:underline">
                {s.title_es || s.title}
              </Link>
              <span className="text-xs text-muted-foreground">
                {[s.year, s.composer].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </Group>
      )}
    </section>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border p-3">
      <p className="smallcaps mb-2 text-xs text-muted-foreground">{label}</p>
      <ul className="divide-y divide-border text-sm">{children}</ul>
    </div>
  );
}