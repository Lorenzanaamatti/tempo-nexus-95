import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { formatEUR0 } from "@/lib/money";
import { ListSkeleton, ErrorState } from "@/components/list-states";

export const Route = createFileRoute("/_authenticated/_admin/roster_/ocupacion")({
  validateSearch: (s: { c?: unknown }) => ({ c: typeof s.c === "string" ? s.c : undefined }),
  head: () => ({
    meta: [
      { title: "Ocupación del roster · Interesante" },
      { name: "description", content: "Qué hace cada representado mes a mes y quién se queda sin ingresos previstos." },
      { property: "og:title", content: "Ocupación del roster · Interesante" },
      { property: "og:description", content: "Producción, cobros y negociaciones del roster en los próximos meses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Ocupacion,
});

type Cell = { month: string; has_production: boolean; has_billing: boolean; has_negotiation: boolean; billing_amount: number };

function monthLabel(m: string) {
  return new Date(m + "T00:00:00").toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
}

/** Primer tramo de 3 meses seguidos sin producción, cobro ni negociación. */
export function firstGap(cells: Cell[]): number {
  for (let i = 0; i + 2 < cells.length; i++) {
    if ([0, 1, 2].every((k) => {
      const c = cells[i + k];
      return !c.has_production && !c.has_billing && !c.has_negotiation;
    })) return i;
  }
  return -1;
}

function Ocupacion() {
  const { c: highlight } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [months, setMonths] = useState(12);
  const [onlyGaps, setOnlyGaps] = useState(false);

  const q = useQuery({
    queryKey: ["roster-occupancy", months],
    queryFn: async () => {
      const [occ, comps, prods] = await Promise.all([
        (supabase as any).rpc("roster_occupancy_months", { _months: months }),
        (supabase as any).from("composers").select("id, full_name, artistic_name, city, country, ciudad_origen, pais_origen, fee_min, fee_max, representation_status").in("representation_status", ["activo", "pausa"]),
        (supabase as any).from("productions").select("id, title, composer_id, status, start_date, delivery_date, is_historical").not("composer_id", "is", null),
      ]);
      if (occ.error) throw occ.error;
      if (comps.error) throw comps.error;
      return { occ: (occ.data ?? []) as any[], comps: (comps.data ?? []) as any[], prods: (prods.data ?? []) as any[] };
    },
  });

  const rows = useMemo(() => {
    if (!q.data) return [];
    const byComposer = new Map<string, Cell[]>();
    for (const r of q.data.occ) {
      const arr = byComposer.get(r.composer_id) ?? [];
      arr.push({ ...r, billing_amount: Number(r.billing_amount ?? 0) });
      byComposer.set(r.composer_id, arr);
    }
    const today = new Date().toISOString().slice(0, 10);
    return q.data.comps
      .map((c) => {
        const cells = (byComposer.get(c.id) ?? []).sort((a, b) => (a.month < b.month ? -1 : 1));
        const current = q.data!.prods.filter((p) => p.composer_id === c.id && !p.is_historical && (!p.delivery_date || p.delivery_date >= today));
        return { c, cells, gap: firstGap(cells), current };
      })
      .filter((r) => {
        const name = `${r.c.artistic_name ?? ""} ${r.c.full_name ?? ""}`.toLowerCase();
        if (search && !name.includes(search.toLowerCase())) return false;
        if (onlyGaps && r.gap < 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.c.id === highlight) return -1;
        if (b.c.id === highlight) return 1;
        const ga = a.gap < 0 ? 99 : a.gap;
        const gb = b.gap < 0 ? 99 : b.gap;
        return ga - gb || (a.c.full_name ?? "").localeCompare(b.c.full_name ?? "");
      });
  }, [q.data, search, onlyGaps, highlight]);

  const monthsHeader = rows[0]?.cells.map((c) => c.month) ?? [];
  const alerts = rows.filter((r) => r.gap >= 0).length;

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 px-6 py-10">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Clientes · Calendario</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold title-caps">Ocupación del roster</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Qué hace cada representado mes a mes: producción en marcha, cobros previstos y negociaciones abiertas.
          Si alguien acumula tres meses seguidos sin nada, aparece el aviso y el equipo recibe una notificación cada lunes.
        </p>
      </header>

      {alerts > 0 && (
        <div className="flex items-center gap-3 rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span><strong>{alerts}</strong> {alerts === 1 ? "persona no tendrá" : "personas no tendrán"} ingresos previstos durante al menos tres meses seguidos.</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Buscar persona…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        {[6, 12, 18].map((m) => (
          <button key={m} type="button" onClick={() => setMonths(m)} className={`rounded-sm border px-3 py-1 text-xs ${months === m ? "border-foreground bg-foreground text-background" : "border-border"}`}>
            {m} meses
          </button>
        ))}
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={onlyGaps} onChange={(e) => setOnlyGaps(e.target.checked)} /> Solo con aviso
        </label>
        <div className="ml-auto flex flex-wrap gap-3 text-xs text-muted-foreground">
          <Legend className="bg-primary" label="En producción" />
          <Legend className="bg-chart-3" label="Cobro previsto" />
          <Legend className="bg-chart-2/60" label="En negociación" />
          <Legend className="bg-destructive/20 border border-destructive/40" label="Sin nada" />
        </div>
      </div>

      {q.isLoading ? <ListSkeleton /> : q.error ? <ErrorState message={(q.error as any)?.message} /> : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="sticky left-0 z-10 bg-muted px-3 py-2 text-left">Persona</th>
                <th className="px-3 py-2 text-left">Procedencia</th>
                <th className="px-3 py-2 text-left">Caché</th>
                <th className="px-3 py-2 text-left">Ahora</th>
                {monthsHeader.map((m) => <th key={m} className="px-1 py-2 text-center font-mono font-normal capitalize">{monthLabel(m)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, cells, gap, current }) => (
                <tr key={c.id} className={`border-t border-border ${c.id === highlight ? "bg-primary/5" : ""}`}>
                  <td className="sticky left-0 z-10 bg-background px-3 py-2">
                    <Link to="/composers/$composerId" params={{ composerId: c.id }} className="font-medium hover:underline">
                      {c.artistic_name || c.full_name}
                    </Link>
                    {gap >= 0 && (
                      <p className="flex items-center gap-1 text-[11px] text-destructive">
                        <AlertTriangle className="h-3 w-3" /> Sin ingresos desde {monthLabel(cells[gap].month)}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {[c.ciudad_origen || c.city, c.pais_origen || c.country].filter(Boolean).join(", ") || "Pendiente"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {c.fee_min || c.fee_max ? `${c.fee_min ? formatEUR0(c.fee_min) : "?"} – ${c.fee_max ? formatEUR0(c.fee_max) : "?"}` : <span className="text-muted-foreground">Pendiente</span>}
                  </td>
                  <td className="max-w-[220px] px-3 py-2 text-xs">
                    {current.length ? current.slice(0, 2).map((p: any) => (
                      <Link key={p.id} to="/productions/$productionId" params={{ productionId: p.id }} className="block truncate hover:underline">{p.title}</Link>
                    )) : <span className="text-muted-foreground">Sin producción</span>}
                  </td>
                  {cells.map((cell, i) => {
                    const empty = !cell.has_production && !cell.has_billing && !cell.has_negotiation;
                    const inGap = gap >= 0 && i >= gap && i < gap + 3;
                    const tip = [
                      cell.has_production && "En producción",
                      cell.has_billing && `Cobro previsto ${formatEUR0(cell.billing_amount)}`,
                      cell.has_negotiation && "Negociación abierta",
                      empty && "Sin producción, cobros ni negociaciones",
                    ].filter(Boolean).join(" · ");
                    return (
                      <td key={cell.month} className="px-0.5 py-2" title={tip}>
                        <div className={`flex h-7 flex-col overflow-hidden rounded-sm ${empty ? (inGap ? "border border-destructive/60 bg-destructive/25" : "border border-destructive/30 bg-destructive/10") : "bg-muted/40"}`}>
                          {cell.has_production && <div className="flex-1 bg-primary" />}
                          {cell.has_billing && <div className="flex-1 bg-chart-3" />}
                          {cell.has_negotiation && <div className="flex-1 bg-chart-2/60" />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Producción: fechas de la producción, sus fases y asignaciones. Cobros: plazos de facturación con fecha.
        Negociación: pitches abiertos y candidaturas, que cubren los cuatro meses siguientes a su fecha de seguimiento o cierre previsto.
      </p>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-sm ${className}`} />{label}</span>;
}
