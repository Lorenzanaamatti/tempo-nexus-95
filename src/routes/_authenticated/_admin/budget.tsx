import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatEUR } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/_admin/budget")({
  component: Budget,
});

function Budget() {
  const productionsQ = useQuery({
    queryKey: ["budget-productions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productions")
        .select("id, title, year, fee_amount, ic_commission, ic_commission_pct, status, composers(full_name, artistic_name)")
        .order("year", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const sprintsQ = useQuery({
    queryKey: ["budget-sprints"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("production_billing_sprints")
        .select("production_id, kind, amount, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (productionsQ.isLoading || sprintsQ.isLoading) {
    return <div className="p-10 font-display text-muted-foreground">Cargando…</div>;
  }

  const sprints = sprintsQ.data ?? [];
  const byProd = new Map<string, { work: number; workInv: number; workPaid: number; comm: number; commInv: number; commPaid: number }>();
  for (const s of sprints as any[]) {
    const cur = byProd.get(s.production_id) ?? { work: 0, workInv: 0, workPaid: 0, comm: 0, commInv: 0, commPaid: 0 };
    const amt = Number(s.amount) || 0;
    if (s.kind === "trabajo") {
      cur.work += amt;
      if (s.status === "facturado" || s.status === "cobrado") cur.workInv += amt;
      if (s.status === "cobrado") cur.workPaid += amt;
    } else {
      cur.comm += amt;
      if (s.status === "facturado" || s.status === "cobrado") cur.commInv += amt;
      if (s.status === "cobrado") cur.commPaid += amt;
    }
    byProd.set(s.production_id, cur);
  }

  const rows = (productionsQ.data ?? []).map((p: any) => {
    const agg = byProd.get(p.id) ?? { work: 0, workInv: 0, workPaid: 0, comm: 0, commInv: 0, commPaid: 0 };
    return { ...p, agg };
  });

  const totals = rows.reduce(
    (acc, r: any) => {
      acc.feeBudget += Number(r.fee_amount) || 0;
      acc.commBudget += Number(r.ic_commission) || 0;
      acc.workInv += r.agg.workInv;
      acc.workPaid += r.agg.workPaid;
      acc.commInv += r.agg.commInv;
      acc.commPaid += r.agg.commPaid;
      return acc;
    },
    { feeBudget: 0, commBudget: 0, workInv: 0, workPaid: 0, commInv: 0, commPaid: 0 },
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Interesante Compañía</p>
        <h1 className="mt-1 font-display text-5xl">PRESUPUESTO</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Vista interna de IC: proyectos presupuestados frente a proyectos facturados y cobrados.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card label="Fee total presupuestado" value={formatEUR(totals.feeBudget)} />
        <Card label="Trabajo facturado" value={formatEUR(totals.workInv)} hint={`Cobrado: ${formatEUR(totals.workPaid)}`} />
        <Card label="Trabajo pendiente" value={formatEUR(totals.feeBudget - totals.workInv)} />
        <Card label="Comisión IC presupuestada" value={formatEUR(totals.commBudget)} />
        <Card label="Comisión IC facturada" value={formatEUR(totals.commInv)} hint={`Cobrada: ${formatEUR(totals.commPaid)}`} />
        <Card label="Comisión IC pendiente" value={formatEUR(totals.commBudget - totals.commInv)} />
      </div>

      <h2 className="mb-3 font-display text-2xl">Detalle por proyecto</h2>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 smallcaps text-xs">Año</th>
              <th className="px-3 py-2 smallcaps text-xs">Proyecto</th>
              <th className="px-3 py-2 smallcaps text-xs">Representado</th>
              <th className="px-3 py-2 smallcaps text-xs text-right">Fee</th>
              <th className="px-3 py-2 smallcaps text-xs text-right">Trabajo fact.</th>
              <th className="px-3 py-2 smallcaps text-xs text-right">Trabajo cobrado</th>
              <th className="px-3 py-2 smallcaps text-xs text-right">Com. IC</th>
              <th className="px-3 py-2 smallcaps text-xs text-right">Com. fact.</th>
              <th className="px-3 py-2 smallcaps text-xs text-right">Com. cobrada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r: any) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-3 py-2 text-muted-foreground">{r.year ?? "—"}</td>
                <td className="px-3 py-2">
                  <Link to="/productions/$productionId" params={{ productionId: r.id }} className="font-display hover:underline">{r.title}</Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.composers?.artistic_name || r.composers?.full_name || "—"}</td>
                <td className="px-3 py-2 text-right">{formatEUR(r.fee_amount)}</td>
                <td className="px-3 py-2 text-right">{formatEUR(r.agg.workInv)}</td>
                <td className="px-3 py-2 text-right">{formatEUR(r.agg.workPaid)}</td>
                <td className="px-3 py-2 text-right">{formatEUR(r.ic_commission)}{r.ic_commission_pct != null && <span className="ml-1 text-xs text-muted-foreground">({r.ic_commission_pct}%)</span>}</td>
                <td className="px-3 py-2 text-right">{formatEUR(r.agg.commInv)}</td>
                <td className="px-3 py-2 text-right">{formatEUR(r.agg.commPaid)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Aún no hay producciones registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <p className="smallcaps text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}