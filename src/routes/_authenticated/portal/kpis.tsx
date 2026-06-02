import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/portal/kpis")({
  component: Kpis,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

function Kpis() {
  const { composerId } = useCurrentRole();
  const { data, isLoading } = useQuery({
    queryKey: ["portal-kpis", composerId],
    enabled: !!composerId,
    queryFn: async () => {
      const { data: projects } = await supabase
        .from("composer_projects")
        .select("year, price_charged, net_margin, composer_profit, agency_commission, production_cost, production_type")
        .eq("composer_id", composerId!);
      const all = projects ?? [];
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
      return { years, total: all.length, totRevenue, totMargin, totProfit, totCommission, totCost, cur, prev };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  const cur = data?.cur;
  const prev = data?.prev;
  const delta = (a?: number, b?: number) => {
    if (!a || !b) return null;
    const pct = ((a - b) / b) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-3xl">KPIs de tu carrera</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Indicadores acumulados desde el inicio de tu representación con IC.
        </p>
      </header>

      <section>
        <h3 className="mb-3 font-display text-xl">Acumulado histórico</h3>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Card label="Proyectos totales" value={String(data?.total ?? 0)} />
          <Card label="Facturación total" value={fmt(data?.totRevenue ?? 0)} />
          <Card label="Margen neto total" value={fmt(data?.totMargin ?? 0)} />
          <Card label="Beneficio compositor" value={fmt(data?.totProfit ?? 0)} />
          <Card label="Comisión IC" value={fmt(data?.totCommission ?? 0)} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-display text-xl">Año en curso vs anterior</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Proyectos" value={String(cur?.count ?? 0)} hint={delta(cur?.count, prev?.count) ?? "—"} />
          <Card label="Facturación" value={fmt(cur?.revenue ?? 0)} hint={delta(cur?.revenue, prev?.revenue) ?? "—"} />
          <Card label="Margen" value={fmt(cur?.margin ?? 0)} hint={delta(cur?.margin, prev?.margin) ?? "—"} />
          <Card label="Coste producción" value={fmt(cur?.cost ?? 0)} hint={delta(cur?.cost, prev?.cost) ?? "—"} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-display text-xl">Evolución por año</h3>
        {!data?.years.length ? (
          <p className="text-sm text-muted-foreground">Sin datos suficientes.</p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
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
      {hint && <p className="mt-1 text-xs text-muted-foreground">vs año anterior · {hint}</p>}
    </div>
  );
}