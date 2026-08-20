import { ExportRowsButton } from "@/components/export-rows-button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ComposerThumb } from "@/components/composer-thumb";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/list-states";
import { usePersistedState } from "@/lib/use-persisted-filters";
import { isOpenProduction } from "@/lib/production-progress";
import { formatLocation, matchesLocation } from "@/lib/geo";
import { ROSTER_ROLE_OPTIONS, rosterRoleLabel } from "@/lib/roster-roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_admin/roster")({
  component: RosterAll,
});

function year(d: string | null | undefined) {
  return d ? new Date(d).getFullYear() : null;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

type Status = "contratado" | "prospeccion" | "negociacion" | "objetivo";

const STATUS_FILTERS: { key: Status | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "contratado", label: "Contratados" },
  { key: "prospeccion", label: "En prospección" },
  { key: "negociacion", label: "En negociación" },
  { key: "objetivo", label: "En objetivos" },
];

const STATUS_TONE: Record<Status, string> = {
  contratado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  prospeccion: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25",
  negociacion: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25",
  objetivo: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25",
};

function statusFromComposer(status?: string | null): Status {
  if (status === "activo" || status === "pausa") return "contratado";
  if (status === "en_negociacion") return "negociacion";
  if (status === "prospeccion") return "prospeccion";
  return "objetivo";
}

const STATUS_LABEL: Record<Status, string> = {
  contratado: "Contratado",
  prospeccion: "En prospección",
  negociacion: "En negociación",
  objetivo: "En objetivos",
};

function RosterAll() {
  const [q, setQ] = usePersistedState("roster-all:q", "");
  const [loc, setLoc] = usePersistedState("roster-all:loc", "");
  const [cat, setCat] = usePersistedState("roster-all:cat", "todas");
  const [statusFilter, setStatusFilter] = usePersistedState<Status | "todos">("roster-all:status", "todos");
  const [sortBy, setSortBy] = useState<"name" | "status">("status");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["roster-all-v3"],
    queryFn: async () => {
      const [composers, productions, targets, assignments, people] = await Promise.all([
        supabase
          .from("composers")
          .select(
            "id, full_name, artistic_name, city, country, ciudad_origen, pais_origen, photo_path, roster_role, role_subtype, specialist_subtype, representation_status, representation_start_date, renewal_date, prospect_next_action_date, prospect_target_date",
          )
          .order("full_name"),
        supabase
          .from("productions")
          .select("id, title, year, status, composer_id, premiere_date, music_supervisor_person_id"),
        supabase
          .from("target_accounts")
          .select("id, name, status, priority, account_type, roster_kind, created_at")
          .eq("account_type", "roster")
          .order("name"),
        supabase.from("production_assignments").select("production_id, composer_id"),
        supabase.from("people").select("id, composer_id").not("composer_id", "is", null),
      ]);
      const err =
        composers.error || productions.error || targets.error || assignments.error || people.error;
      if (err) throw err;
      return {
        composers: composers.data ?? [],
        productions: productions.data ?? [],
        targets: targets.data ?? [],
        assignments: assignments.data ?? [],
        people: people.data ?? [],
      };
    },
  });

  const term = q.trim().toLowerCase();
  const locTerm = loc.trim();

  const rows = useMemo<UnifiedRow[]>(() => {
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

    const composerRows = (data?.composers ?? [])
      .filter((c) => c.roster_role !== "ic_company")
      .filter((c) => !term || (c.full_name ?? "").toLowerCase().includes(term) || (c.artistic_name ?? "").toLowerCase().includes(term))
      .filter((c) => matchesLocation(locTerm, c.city, c.country, c.ciudad_origen, c.pais_origen))
      .map((c) => {
        const status = statusFromComposer(c.representation_status);
        const isProspect = status === "prospeccion";
        return {
          id: c.id,
          kind: "composer" as const,
          name: c.full_name,
          artisticName: c.artistic_name,
          photoPath: c.photo_path,
          location: formatLocation(c.city ?? c.ciudad_origen, c.country ?? c.pais_origen),
          role: c.roster_role,
          subtype: c.role_subtype || c.specialist_subtype,
          status,
          date1: isProspect
            ? c.prospect_next_action_date
              ? fmtDate(c.prospect_next_action_date)
              : null
            : c.representation_start_date
              ? String(year(c.representation_start_date))
              : null,
          date2: isProspect
            ? c.prospect_target_date
              ? fmtDate(c.prospect_target_date)
              : null
            : c.renewal_date
              ? fmtDate(c.renewal_date)
              : null,
          date1Label: isProspect ? "Próxima acción" : "Contratación",
          date2Label: isProspect ? "Objetivo contratación" : "Vencimiento",
          open: openIdsByComposer.get(c.id)?.size ?? 0,
        };
      });

    const targetRows = (data?.targets ?? [])
      .filter((t) => !term || t.name.toLowerCase().includes(term))
      .map((t) => ({
        id: t.id,
        kind: "target" as const,
        name: t.name,
        artisticName: null as string | null,
        photoPath: null as string | null,
        location: null as string | null,
        role: t.roster_kind,
        subtype: null as string | null,
        status: "objetivo" as Status,
        date1: t.created_at ? fmtDate(t.created_at) : null,
        date2: null,
        date1Label: "Alta",
        date2Label: "",
        open: 0,
      }));

    return [...composerRows, ...targetRows];
  }, [data, term, locTerm]);

  const filtered = useMemo(() => {
    let list = cat === "todas" ? rows : rows.filter((r) => (r.role ?? "composer") === cat);
    if (statusFilter !== "todos") list = list.filter((r) => r.status === statusFilter);
    list = [...list].sort((a, b) => {
      if (sortBy === "status") {
        const order: Record<Status, number> = { contratado: 0, prospeccion: 1, negociacion: 2, objetivo: 3 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      }
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [rows, cat, statusFilter, sortBy]);

  const counts = useMemo(() => ({
    contratado: rows.filter((r) => r.status === "contratado").length,
    prospeccion: rows.filter((r) => r.status === "prospeccion").length,
    negociacion: rows.filter((r) => r.status === "negociacion").length,
    objetivo: rows.filter((r) => r.status === "objetivo").length,
  }) as Record<Status, number>, [rows]);

  const exportRows = filtered.map((r) => ({
    Nombre: r.name,
    Categoría: rosterRoleLabel(r.role),
    Subcategoría: r.subtype ?? "",
    Estado: STATUS_LABEL[r.status],
    [r.date1Label]: r.date1 ?? "",
    [r.date2Label]: r.date2 ?? "",
    "Proyectos en curso": r.open,
  }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Roster</p>
          <h1 className="mt-1 font-display text-5xl title-caps">Roster completo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Listado único de perfiles mezclados. Cada fila indica claramente si ya es representado, está en prospección o es un objetivo pendiente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportRowsButton rows={exportRows} filename="roster-completo" sheetName="Roster" />
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label="Filtrar por categoría de representación"
            className="h-10 rounded-sm border border-input bg-background px-3 text-sm"
          >
            <option value="todas">Todas las categorías</option>
            {ROSTER_ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Input
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            placeholder="Filtrar por ubicación…"
            aria-label="Filtrar por área geográfica"
            className="w-56 rounded-sm"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre…"
            className="w-72 rounded-sm"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            aria-pressed={statusFilter === f.key}
            className={cn(
              "smallcaps rounded-sm border px-3 py-2 text-xs transition-colors",
              statusFilter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            <span className="ml-2 font-mono text-[10px] opacity-70">
              {f.key === "todos" ? rows.length : counts[f.key]}
            </span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Ordenar por</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "status")}
            className="h-8 rounded-sm border border-input bg-background px-2 text-xs"
          >
            <option value="status">Estado</option>
            <option value="name">Nombre</option>
          </select>
        </div>
      </div>

      {error ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListSkeleton rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin resultados"
          description="Prueba a cambiar el filtro de estado o el buscador."
        />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-muted/50 text-left smallcaps text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Perfil</th>
                <th className="px-3 py-2">Categoría</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">{filtered[0]?.date1Label ?? "Contratación"}</th>
                <th className="px-3 py-2">{filtered[0]?.date2Label ?? "Vencimiento"}</th>
                <th className="px-3 py-2 text-right">Proyectos en curso</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="border-t border-border hover:bg-muted/40">
                  <td className="px-3 py-2">
                    <RowLink row={r}>
                      <span className="flex items-center gap-3">
                        <ComposerThumb
                          path={r.photoPath}
                          alt={r.name}
                          className="h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-muted"
                          imgClassName="h-full w-full object-cover"
                          fallback={
                            <div className="flex h-full items-center justify-center font-display text-lg text-muted-foreground">
                              {r.name?.[0] ?? "·"}
                            </div>
                          }
                        />
                        <span className="min-w-0">
                          <span className="block font-display text-base leading-tight hover:text-primary">{r.name}</span>
                          {r.location && (
                            <span className="block truncate text-xs text-muted-foreground">{r.location}</span>
                          )}
                        </span>
                      </span>
                    </RowLink>
                  </td>
                  <td className="px-3 py-2">
                    <span className="smallcaps rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {rosterRoleLabel(r.role)}
                    </span>
                    {r.subtype && <span className="ml-2 text-xs text-muted-foreground">{r.subtype}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <DateCell value={r.date1} row={r} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <DateCell value={r.date2} row={r} />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{r.open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type UnifiedRow = {
  id: string;
  kind: "composer" | "target";
  name: string;
  artisticName: string | null;
  photoPath: string | null;
  location: string | null;
  role: string | null;
  subtype: string | null;
  status: Status;
  date1: string | null;
  date2: string | null;
  date1Label: string;
  date2Label: string;
  open: number;
};

function StatusBadge({ status }: { status: Status }) {
  const label = status === "contratado" ? "Contratado" : status === "prospeccion" ? "En prospección" : "Pendiente";
  return (
    <span className={cn("smallcaps rounded-sm border px-2 py-1 text-[10px]", STATUS_TONE[status])}>
      {label}
    </span>
  );
}

function RowLink({ row, children }: { row: UnifiedRow; children: React.ReactNode }) {
  if (row.kind === "target") {
    return (
      <Link to="/marketing/target-accounts/$accountId" params={{ accountId: row.id }} className="block">
        {children}
      </Link>
    );
  }
  return (
    <Link to="/composers/$composerId" params={{ composerId: row.id }} className="block">
      {children}
    </Link>
  );
}

function DateCell({ value, row }: { value: string | null; row: UnifiedRow }) {
  if (value) return <>{value}</>;
  if (row.kind === "target" && row.date2Label === "") return <>—</>;
  return (
    <Link
      to="/composers/$composerId"
      params={{ composerId: row.id }}
      className="smallcaps rounded-sm border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
      title="Dato por completar en la ficha"
    >
      Pendiente
    </Link>
  );
}

