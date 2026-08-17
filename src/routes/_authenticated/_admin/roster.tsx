import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, Film, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ComposerThumb } from "@/components/composer-thumb";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/list-states";
import { usePersistedState } from "@/lib/use-persisted-filters";
import { isOpenProduction } from "@/lib/production-progress";

export const Route = createFileRoute("/_authenticated/_admin/roster")({
  component: RosterAll,
});

function year(d: string | null | undefined) {
  return d ? new Date(d).getFullYear() : null;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function RosterAll() {
  const [q, setQ] = usePersistedState("roster-all:q", "");
  const [onlyIncomplete, setOnlyIncomplete] = usePersistedState("roster-all:incomplete", false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["roster-all-v2"],
    queryFn: async () => {
      const [composers, productions, filmography, films, targets, assignments, people] = await Promise.all([
        supabase
          .from("composers")
          .select(
            "id, full_name, artistic_name, city, country, photo_path, roster_role, representation_status, representation_start_date, renewal_date, prospect_next_action_date, prospect_target_date",
          )
          .order("full_name"),
        supabase
          .from("productions")
          .select("id, title, year, status, composer_id, premiere_date, music_supervisor_person_id"),
        supabase.from("composer_filmography").select("id, title, year, composer_id, format"),
        supabase.from("spanish_films").select("id, title, title_es, year, composer, composer_person_id"),
        supabase
          .from("target_accounts")
          .select("id, name, status, priority, account_type, roster_kind, created_at")
          .eq("account_type", "roster")
          .order("name"),
        supabase.from("production_assignments").select("production_id, composer_id"),
        supabase.from("people").select("id, composer_id").not("composer_id", "is", null),
      ]);
      const err =
        composers.error || productions.error || filmography.error || films.error || targets.error ||
        assignments.error || people.error;
      if (err) throw err;
      return {
        composers: composers.data ?? [],
        productions: productions.data ?? [],
        filmography: filmography.data ?? [],
        films: films.data ?? [],
        targets: targets.data ?? [],
        assignments: assignments.data ?? [],
        people: people.data ?? [],
      };
    },
  });

  const term = q.trim().toLowerCase();

  const rows = useMemo(() => {
    const list = (data?.composers ?? []).filter((c) => c.roster_role !== "ic_company");
    // Mismo criterio que la ficha de compositor: producción directa,
    // asignaciones de producción y supervisión musical (vía people).
    const composerByPerson = new Map<string, string>();
    for (const p of data?.people ?? []) {
      if (p.composer_id) composerByPerson.set(p.id, p.composer_id);
    }
    const prodById = new Map((data?.productions ?? []).map((p) => [p.id, p]));
    const openIdsByComposer = new Map<string, Set<string>>();
    const add = (composerId: string | null | undefined, prod: { id: string } | undefined) => {
      if (!composerId || !prod || !isOpenProduction(prod as never)) return;
      const set = openIdsByComposer.get(composerId) ?? new Set<string>();
      set.add(prod.id);
      openIdsByComposer.set(composerId, set);
    };
    for (const p of data?.productions ?? []) {
      add(p.composer_id, p);
      if (p.music_supervisor_person_id) add(composerByPerson.get(p.music_supervisor_person_id), p);
    }
    for (const a of data?.assignments ?? []) {
      add(a.composer_id, prodById.get(a.production_id));
    }
    return list
      .filter((c) => !term || (c.full_name ?? "").toLowerCase().includes(term) || (c.artistic_name ?? "").toLowerCase().includes(term))
      .map((c) => ({ ...c, open: openIdsByComposer.get(c.id)?.size ?? 0 }));
  }, [data, term]);

  const isIncomplete = (c: { representation_start_date: string | null; renewal_date: string | null; prospect_next_action_date: string | null; prospect_target_date: string | null }, variant: "active" | "prospect") =>
    variant === "active"
      ? !c.representation_start_date || !c.renewal_date
      : !c.prospect_next_action_date || !c.prospect_target_date;

  const actualAll = rows.filter((c) => c.representation_status === "activo" || c.representation_status === "pausa");
  const prospeccionAll = rows.filter((c) => c.representation_status === "en_negociacion");
  const actual = onlyIncomplete ? actualAll.filter((c) => isIncomplete(c, "active")) : actualAll;
  const prospeccion = onlyIncomplete ? prospeccionAll.filter((c) => isIncomplete(c, "prospect")) : prospeccionAll;
  const actualMissing = actualAll.filter((c) => isIncomplete(c, "active")).length;
  const prospeccionMissing = prospeccionAll.filter((c) => isIncomplete(c, "prospect")).length;
  const objetivo = (data?.targets ?? []).filter((t) => !term || t.name.toLowerCase().includes(term));

  const filmografia = useMemo(() => {
    const nameById = new Map((data?.composers ?? []).map((c) => [c.id, c.artistic_name || c.full_name]));
    const byYear = new Map<number, { key: string; title: string; who: string; source: string }[]>();
    const push = (y: number | null, item: { key: string; title: string; who: string; source: string }) => {
      if (!y) return;
      const arr = byYear.get(y) ?? [];
      if (!arr.some((x) => x.title.toLowerCase() === item.title.toLowerCase() && x.who === item.who)) arr.push(item);
      byYear.set(y, arr);
    };
    for (const p of data?.productions ?? []) {
      push(p.year ?? year(p.premiere_date), {
        key: `p-${p.id}`,
        title: p.title ?? "—",
        who: (p.composer_id && nameById.get(p.composer_id)) || "—",
        source: "Producciones",
      });
    }
    for (const f of data?.filmography ?? []) {
      push(f.year ?? null, {
        key: `f-${f.id}`,
        title: f.title ?? "—",
        who: nameById.get(f.composer_id) || "—",
        source: "Ficha compositor",
      });
    }
    const rosterNames = new Set(
      (data?.composers ?? []).flatMap((c) => [c.full_name, c.artistic_name].filter(Boolean).map((n) => String(n).toLowerCase())),
    );
    for (const f of data?.films ?? []) {
      if (!f.composer || !rosterNames.has(f.composer.toLowerCase())) continue;
      push(f.year ?? null, {
        key: `s-${f.id}`,
        title: f.title_es || f.title,
        who: f.composer,
        source: "CRM Películas",
      });
    }
    return [...byYear.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([y, items]) => ({
        year: y,
        items: items.filter((i) => !term || i.title.toLowerCase().includes(term) || i.who.toLowerCase().includes(term)),
      }))
      .filter((g) => g.items.length);
  }, [data, term]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Roster</p>
          <h1 className="mt-1 font-display text-5xl title-caps">Roster completo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Estos son nuestros clientes y clientas seleccionados según su sector de actividad profesional.
          </p>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            «Pendiente» en una fecha significa que el dato falta por completar en la ficha del representado, no que no exista contrato.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyIncomplete(!onlyIncomplete)}
            aria-pressed={onlyIncomplete}
            className={
              onlyIncomplete
                ? "smallcaps rounded-sm bg-primary px-3 py-2 text-xs text-primary-foreground"
                : "smallcaps rounded-sm border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            }
          >
            Solo incompletas
          </button>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre…"
            className="w-72 rounded-sm"
          />
        </div>
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListSkeleton rows={8} />
      ) : (
        <div className="space-y-14">
          <RosterSection title="Roster actual" rows={actual} variant="active" missing={actualMissing} />
          <RosterSection title="Roster en prospección" rows={prospeccion} variant="prospect" missing={prospeccionMissing} />

          <section>
            <h2 className="mb-4 border-b border-border pb-2 font-display text-3xl title-caps">Roster objetivo</h2>
            {!objetivo.length ? (
              <EmptyState icon={Target} title="Sin roster en prospección" description="Añade cuentas de tipo Roster para hacer seguimiento de futuras incorporaciones." action={{ label: "Ir a cuentas objetivo", to: "/marketing/target-accounts" }} />
            ) : (
              <div className="overflow-x-auto rounded-sm border border-border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/50 text-left smallcaps text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Perfil</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Prioridad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {objetivo.map((t) => (
                      <tr key={t.id} className="border-t border-border hover:bg-muted/40">
                        <td className="px-3 py-2">
                          <Link to="/marketing/target-accounts/$accountId" params={{ accountId: t.id }} className="font-display text-base hover:text-primary">
                            {t.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{t.roster_kind ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{t.status ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{t.priority ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between border-b border-border pb-2">
              <h2 className="font-display text-3xl title-caps">Interesante Filmografía</h2>
              <Link to="/ic" className="smallcaps text-xs text-muted-foreground hover:text-foreground">
                Ficha corporativa →
              </Link>
            </div>
            {!filmografia.length ? (
              <EmptyState icon={Film} title="Sin obras registradas" description="La filmografía de las fichas del roster se agregará aquí automáticamente." />
            ) : (
              <div className="space-y-6">
                {filmografia.map((g) => (
                  <div key={g.year}>
                    <p className="mb-2 font-mono text-sm text-primary">{g.year}</p>
                    <div className="overflow-x-auto rounded-sm border border-border">
                      <table className="w-full min-w-[640px] text-sm">
                        <tbody>
                          {g.items.map((i) => (
                            <tr key={i.key} className="border-b border-border last:border-0">
                              <td className="px-3 py-2 font-display text-base">{i.title}</td>
                              <td className="px-3 py-2 text-muted-foreground">{i.who}</td>
                              <td className="px-3 py-2 text-right text-xs text-muted-foreground">{i.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

type Row = {
  id: string;
  full_name: string;
  artistic_name: string | null;
  city: string | null;
  country: string | null;
  photo_path: string | null;
  representation_start_date: string | null;
  renewal_date: string | null;
  prospect_next_action_date: string | null;
  prospect_target_date: string | null;
  open: number;
};

function DateCell({ value, composerId }: { value: string | null; composerId: string }) {
  if (value) return <>{value}</>;
  return (
    <Link
      to="/composers/$composerId"
      params={{ composerId }}
      className="smallcaps rounded-sm border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
      title="Dato por completar en la ficha"
    >
      Pendiente
    </Link>
  );
}

function RosterSection({ title, rows, variant, missing = 0 }: { title: string; rows: Row[]; variant: "active" | "prospect"; missing?: number }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between border-b border-border pb-2">
        <h2 className="font-display text-3xl title-caps">{title}</h2>
        <span className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
          {missing > 0 && <span className="smallcaps">{missing} sin fechas</span>}
          <span>{rows.length}</span>
        </span>
      </div>
      {!rows.length ? (
        <EmptyState icon={Users} title="Sin fichas en esta categoría" description="Crea una ficha nueva o revisa las otras categorías del roster." action={{ label: "Añadir ficha", to: "/composers/new" }} />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-left smallcaps text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Representado</th>
                {variant === "prospect" ? (
                  <>
                    <th className="px-3 py-2">Próxima acción</th>
                    <th className="px-3 py-2">Objetivo contratación</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2">Contratación</th>
                    <th className="px-3 py-2">Vencimiento</th>
                  </>
                )}
                <th className="px-3 py-2">Proyectos en curso</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-3 py-2">
                    <Link to="/composers/$composerId" params={{ composerId: c.id }} className="flex items-center gap-3">
                      <ComposerThumb
                        path={c.photo_path}
                        alt={c.full_name}
                        className="h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-muted"
                        imgClassName="h-full w-full object-cover"
                        fallback={
                          <div className="flex h-full items-center justify-center font-display text-lg text-muted-foreground">
                            {c.full_name?.[0] ?? "·"}
                          </div>
                        }
                      />
                      <span className="min-w-0">
                        <span className="block font-display text-base leading-tight hover:text-primary">{c.full_name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[c.city, c.country].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  {variant === "prospect" ? (
                    <>
                      <td className="px-3 py-2 font-mono text-xs">
                        <DateCell value={c.prospect_next_action_date ? fmtDate(c.prospect_next_action_date) : null} composerId={c.id} />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        <DateCell value={c.prospect_target_date ? fmtDate(c.prospect_target_date) : null} composerId={c.id} />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-mono text-xs">
                        <DateCell value={year(c.representation_start_date)?.toString() ?? null} composerId={c.id} />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        <DateCell value={c.renewal_date ? fmtDate(c.renewal_date) : null} composerId={c.id} />
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2 font-mono text-xs">{c.open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
