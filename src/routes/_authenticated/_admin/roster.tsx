import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ComposerThumb } from "@/components/composer-thumb";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/list-states";
import { usePersistedState } from "@/lib/use-persisted-filters";

export const Route = createFileRoute("/_authenticated/_admin/roster")({
  component: RosterAll,
});

const CLOSED_STATUS = new Set([
  "finalizada",
  "estrenada",
  "cobrado",
  "facturado",
  "entregables_completados",
  "compositor_descartado",
  "comunicado_estreno",
]);

function year(d: string | null | undefined) {
  return d ? new Date(d).getFullYear() : null;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function RosterAll() {
  const [q, setQ] = usePersistedState("roster-all:q", "");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["roster-all-v2"],
    queryFn: async () => {
      const [composers, productions, filmography, films, targets] = await Promise.all([
        supabase
          .from("composers")
          .select(
            "id, full_name, artistic_name, city, country, photo_path, roster_role, representation_status, representation_start_date, renewal_date, prospect_next_action_date, prospect_target_date",
          )
          .order("full_name"),
        supabase.from("productions").select("id, title, year, status, composer_id, premiere_date"),
        supabase.from("composer_filmography").select("id, title, year, composer_id, format"),
        supabase.from("spanish_films").select("id, title, title_es, year, composer, composer_person_id"),
        supabase
          .from("target_accounts")
          .select("id, name, status, priority, account_type, roster_kind, created_at")
          .eq("account_type", "roster")
          .order("name"),
      ]);
      const err = composers.error || productions.error || filmography.error || films.error || targets.error;
      if (err) throw err;
      return {
        composers: composers.data ?? [],
        productions: productions.data ?? [],
        filmography: filmography.data ?? [],
        films: films.data ?? [],
        targets: targets.data ?? [],
      };
    },
  });

  const term = q.trim().toLowerCase();

  const rows = useMemo(() => {
    const list = (data?.composers ?? []).filter((c) => c.roster_role !== "ic_company");
    const openByComposer = new Map<string, number>();
    for (const p of data?.productions ?? []) {
      if (!p.composer_id) continue;
      if (CLOSED_STATUS.has(String(p.status))) continue;
      openByComposer.set(p.composer_id, (openByComposer.get(p.composer_id) ?? 0) + 1);
    }
    return list
      .filter((c) => !term || (c.full_name ?? "").toLowerCase().includes(term) || (c.artistic_name ?? "").toLowerCase().includes(term))
      .map((c) => ({ ...c, open: openByComposer.get(c.id) ?? 0 }));
  }, [data, term]);

  const actual = rows.filter((c) => c.representation_status === "activo" || c.representation_status === "pausa");
  const prospeccion = rows.filter((c) => c.representation_status === "en_negociacion");
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
          <h1 className="mt-1 font-display text-5xl">Roster completo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Estos son nuestros clientes y clientas seleccionados según su sector de actividad profesional.
          </p>
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre…"
          className="w-72 rounded-sm"
        />
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListSkeleton rows={8} />
      ) : (
        <div className="space-y-14">
          <RosterSection title="Roster actual" rows={actual} variant="active" />
          <RosterSection title="Roster en prospección" rows={prospeccion} variant="prospect" />

          <section>
            <h2 className="mb-4 border-b border-border pb-2 font-display text-3xl">Roster objetivo</h2>
            {!objetivo.length ? (
              <EmptyState title="Sin candidatos en cuentas objetivo." hint="Añade cuentas de tipo Roster desde Cuentas objetivo." />
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
              <h2 className="font-display text-3xl">Interesante Filmografía</h2>
              <Link to="/ic" className="smallcaps text-xs text-muted-foreground hover:text-foreground">
                Ficha corporativa →
              </Link>
            </div>
            {!filmografia.length ? (
              <EmptyState title="Sin obras registradas todavía." />
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
  open: number;
};

function RosterSection({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between border-b border-border pb-2">
        <h2 className="font-display text-3xl">{title}</h2>
        <span className="font-mono text-xs text-muted-foreground">{rows.length}</span>
      </div>
      {!rows.length ? (
        <EmptyState title="Sin fichas en esta categoría." />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-left smallcaps text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Representado</th>
                <th className="px-3 py-2">Contratación</th>
                <th className="px-3 py-2">Vencimiento</th>
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
                  <td className="px-3 py-2 font-mono text-xs">{year(c.representation_start_date) ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{fmtDate(c.renewal_date)}</td>
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
