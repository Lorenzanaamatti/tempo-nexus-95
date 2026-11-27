import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/list-states";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalComposer } from "@/lib/use-portal-composer";
import { formatEUR0 } from "@/lib/money";
import { fetchComposerProductions } from "@/lib/composer-productions";
import { IC_FEE_SELECT, currentColumn, feeConfigFromProduction } from "@/lib/production-finance";

export const Route = createFileRoute("/_authenticated/portal/kpis")({
  component: Kpis,
});

const fmt = (n: number) =>
  formatEUR0(n || 0);

function Kpis() {
  const { composerId } = usePortalComposer();
  const { data, isLoading } = useQuery({
    queryKey: ["portal-kpis", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      // Datos reales: producciones del representado (titular o asignado) y su economía.
      const prods = await fetchComposerProductions<any>(composerId!, `id, year, start_date, created_at, fee_amount, ${IC_FEE_SELECT}`);
      const ids = (prods ?? []).map((p) => p.id);
      const { data: lines } = ids.length
        ? await supabase.from("production_finance_lines").select("production_id, kind, amount_initial, amount_final, paid_by_agency").in("production_id", ids)
        : { data: [] as any[] };
      let extraTotal = 0;
      const projects = (prods ?? []).map((p) => {
        const c = currentColumn(((lines ?? []) as any[]).filter((l) => l.production_id === p.id), feeConfigFromProduction(p));
        const revenue = c.ingresos || Number(p.fee_amount ?? 0);
        const commission = c.fee;
        const cost = c.gastos;
        extraTotal += c.extraordinarios;
        // Año de trabajo: inicio real (start_date); el campo «año» suele ser el de estreno.
        const y = p.start_date ? Number(p.start_date.slice(0, 4)) : (p.year ?? Number(p.created_at.slice(0, 4)));
        return {
          year: y,
          price_charged: revenue,
          production_cost: cost,
          agency_commission: commission,
          net_margin: revenue - cost,
          composer_profit: revenue - cost - commission,
        };
      });
      const nowYear = new Date().getFullYear();
      // Proyectos con año futuro van aparte como «Previstos»; no se mezclan con lo ya hecho.
      const all = (projects ?? []).filter((p) => (p.year ?? 0) <= nowYear);
      const planned = (projects ?? []).filter((p) => (p.year ?? 0) > nowYear);
      const plannedCount = planned.length;
      const plannedRevenue = planned.reduce((s, p) => s + Number(p.price_charged ?? 0), 0);
      const plannedYears = Array.from(new Set(planned.map((p) => p.year))).sort().join(", ");
      const byYear = new Map<number, { count: number; revenue: number; margin: number; profit: number; commission: number; cost: number }>();
      let totRevenue = 0, totMargin = 0, totProfit = 0, totCommission = 0, totCost = 0;
      for (const p of all) {
        const y = p.year ?? 0;
        const cur = byYear.get(y) ?? { count: 0, revenue: 0, margin: 0, profit: 0, commission: 0, cost: 0 };
        cur.count += 1;
        cur.revenue += Number(p.price_charged ?? 0);
        cur.margin += Number(p.net_margin ?? 0);
        cur.profit += Number(p.composer_profit ?? 0);
        cur.commission += Number(p.agency_commission ?? 0);
        cur.cost += Number(p.production_cost ?? 0);
        byYear.set(y, cur);
        totRevenue += cur.revenue; totMargin += cur.margin; totProfit += cur.profit; totCommission += cur.commission; totCost += cur.cost;
      }
      // recompute totals correctly
      totRevenue = all.reduce((s, p) => s + Number(p.price_charged ?? 0), 0);
      totMargin = all.reduce((s, p) => s + Number(p.net_margin ?? 0), 0);
      totProfit = all.reduce((s, p) => s + Number(p.composer_profit ?? 0), 0);
      totCommission = all.reduce((s, p) => s + Number(p.agency_commission ?? 0), 0);
      totCost = all.reduce((s, p) => s + Number(p.production_cost ?? 0), 0);

      const years = Array.from(byYear.entries())
        .filter(([y]) => y > 0)
        .sort((a, b) => b[0] - a[0]);
      const thisYear = new Date().getFullYear();
      const cur = byYear.get(thisYear);
      const prev = byYear.get(thisYear - 1);
      const missingFee = (prods ?? []).filter((p) => !Number(p.fee_amount)).length;
      return { thisYear, plannedCount, plannedRevenue, plannedYears, extraTotal, missingFee, years, total: all.length, totRevenue, totMargin, totProfit, totCommission, totCost, cur, prev };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  const cur = data?.cur;
  const prev = data?.prev;
  const y = data?.thisYear ?? new Date().getFullYear();
  const pctChange = (a?: number, b?: number) => {
    if (!a || !b) return null;
    const pct = ((a - b) / b) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)} %`;
  };
  const vsPrev = (a: number | undefined, b: number | undefined, show: (v: number) => string) =>
    !prev ? `${y - 1}: sin proyectos` : `${y - 1}: ${show(b ?? 0)}${pctChange(a, b) ? ` (${pctChange(a, b)})` : ""}`;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-3xl">KPIs de tu carrera</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Indicadores acumulados desde el inicio de tu representación con IC.
        </p>
      </header>

      {!!data?.missingFee && (
        <p className="rounded-sm border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {data.missingFee} de {data.total} proyectos aún no tienen precio de venta registrado; no suman en facturación ni margen hasta que el equipo lo complete.
        </p>
      )}

      <section>
        <h3 className="mb-3 font-display text-xl">Acumulado histórico</h3>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Card label="Proyectos totales" value={String(data?.total ?? 0)} />
          <Card label="Facturación total" value={fmt(data?.totRevenue ?? 0)} />
          <Card label="Margen neto total" value={fmt(data?.totMargin ?? 0)} />
          <Card label="Beneficio compositor" value={fmt(data?.totProfit ?? 0)} />
          <Card label="Comisión IC" value={fmt(data?.totCommission ?? 0)} />
        </div>
        {!!data?.extraTotal && (
          <p className="mt-3 text-sm text-muted-foreground">Gastos extraordinarios asumidos por IC (no restan de tu beneficio): {fmt(data.extraTotal)}</p>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-display text-xl">{y} comparado con {y - 1}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card label={`Proyectos ${y}`} value={String(cur?.count ?? 0)} hint={vsPrev(cur?.count, prev?.count, String)} />
          <Card label={`Facturación ${y}`} value={fmt(cur?.revenue ?? 0)} hint={vsPrev(cur?.revenue, prev?.revenue, fmt)} />
          <Card label={`Margen ${y}`} value={fmt(cur?.margin ?? 0)} hint={vsPrev(cur?.margin, prev?.margin, fmt)} />
          <Card label={`Coste producción ${y}`} value={fmt(cur?.cost ?? 0)} hint={vsPrev(cur?.cost, prev?.cost, fmt)} />
        </div>
      </section>

      {!!data?.plannedCount && (
      <section>
        <h3 className="mb-3 font-display text-xl">Previstos ({data.plannedYears})</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Proyectos previstos" value={String(data.plannedCount)} />
          <Card label="Facturación prevista" value={fmt(data.plannedRevenue)} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Proyectos con fecha en años futuros. No cuentan en el acumulado ni en la comparación hasta que llegue su año.</p>
      </section>
      )}

      <section>
        <h3 className="mb-3 font-display text-xl">Evolución por año</h3>
        {!data?.years.length ? (
          <EmptyState variant="inline" icon={BarChart3} title="Sin datos suficientes" description="Necesitamos algo más de actividad para calcular tus indicadores." />
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-base">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Año</th>
                  <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Proyectos</th>
                  <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Facturación</th>
                  <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Coste prod.</th>
                  <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Comisión IC</th>
                  <th className="px-3 py-2 smallcaps text-xs text-muted-foreground">Margen neto</th>
                </tr>
              </thead>
              <tbody>
                {data.years.map(([year, v]) => (
                  <tr key={year} className="border-t border-border">
                    <td className="px-3 py-2 font-display">{year}</td>
                    <td className="px-3 py-2">{v.count}</td>
                    <td className="px-3 py-2">{fmt(v.revenue)}</td>
                    <td className="px-3 py-2">{fmt(v.cost)}</td>
                    <td className="px-3 py-2">{fmt(v.commission)}</td>
                    <td className="px-3 py-2">{fmt(v.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <p className="smallcaps text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}