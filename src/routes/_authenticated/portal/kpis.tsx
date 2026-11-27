import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/list-states";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalComposer } from "@/lib/use-portal-composer";
import { formatEUR0 } from "@/lib/money";

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
      const { data: asg } = await supabase
        .from("production_assignments")
        .select("production_id")
        .eq("composer_id", composerId!);
      const asgIds = [...new Set((asg ?? []).map((r) => r.production_id))];
      const orFilter = asgIds.length
        ? `composer_id.eq.${composerId},id.in.(${asgIds.join(",")})`
        : `composer_id.eq.${composerId}`;
      const { data: prods } = await supabase
        .from("productions")
        .select("id, year, start_date, created_at, fee_amount, ic_commission, ic_commission_pct")
        .or(orFilter);
      const ids = (prods ?? []).map((p) => p.id);
      const { data: lines } = ids.length
        ? await supabase
            .from("production_finance_lines")
            .select("production_id, kind, amount_initial, amount_final, composer_id")
            .in("production_id", ids)
            .eq("kind", "gasto")
        : { data: [] as { production_id: string; amount_final: number | null; amount_initial: number | null; composer_id: string | null }[] };
      const costBy = new Map<string, number>();
      for (const l of lines ?? []) {
        if (l.composer_id && l.composer_id !== composerId) continue;
        costBy.set(l.production_id, (costBy.get(l.production_id) ?? 0) + Number(l.amount_final ?? l.amount_initial ?? 0));
      }
      const projects = (prods ?? []).map((p) => {
        const revenue = Number(p.fee_amount ?? 0);
        const commission = p.ic_commission != null ? Number(p.ic_commission) : (revenue * Number(p.ic_commission_pct ?? 0)) / 100;
        const cost = costBy.get(p.id) ?? 0;
        const y = p.year ?? (p.start_date ? Number(p.start_date.slice(0, 4)) : Number(p.created_at.slice(0, 4)));
        return {
          year: y,
          price_charged: revenue,
          production_cost: cost,
          agency_commission: commission,
          net_margin: revenue - cost,
          composer_profit: revenue - cost - commission,
        };
      });
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
      {hint && <p className="mt-1 text-xs text-muted-foreground">vs año anterior · {hint}</p>}
    </div>
  );
}