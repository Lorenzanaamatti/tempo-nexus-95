import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { FinanceDashboard } from "@/components/finance-dashboard";
import { formatEUR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({ composerId: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/_admin/finance")({
  validateSearch: (s) => searchSchema.parse(s),
  component: FinancePage,
});

function FinancePage() {
  const { composerId } = Route.useSearch();
  const composerQ = useQuery({
    queryKey: ["finance-composer", composerId ?? null],
    enabled: !!composerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("composers")
        .select("full_name, artistic_name")
        .eq("id", composerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const title = composerId
    ? `Económico · ${composerQ.data?.artistic_name || composerQ.data?.full_name || ""}`
    : "Económico · IC";
  const eyebrow = composerId ? "Compositor" : "Compañía";
  const description = composerId
    ? "Previsto, facturado y cobrado de las producciones donde este compositor está asignado."
    : "Presupuesto por proyecto y consolidación temporal de previsto, facturado y cobrado.";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <p className="smallcaps text-muted-foreground">{eyebrow}</p>
        <h1 className="font-display text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Evolución temporal</h2>
        <FinanceDashboard composerId={composerId ?? null} />
      </section>

      <section className="mt-12 space-y-3">
        <h2 className="font-display text-2xl">Presupuesto por proyecto</h2>
        <BudgetTable composerId={composerId ?? null} />
      </section>

      {!composerId && (
        <>
          <section className="mt-12 space-y-3">
            <h2 className="font-display text-2xl">Business Plan · Presupuesto vs. real</h2>
            <BusinessPlanPanel />
          </section>
          <section className="mt-12 space-y-3">
            <h2 className="font-display text-2xl">Gastos operativos IC</h2>
            <IcExpensesPanel />
          </section>
        </>
      )}
    </div>
  );
}

function BudgetTable({ composerId }: { composerId: string | null }) {
  const productionsQ = useQuery({
    queryKey: ["budget-productions", composerId ?? null],
    queryFn: async () => {
      let q = supabase
        .from("productions")
        .select("id, title, year, fee_amount, ic_commission, ic_commission_pct, status, composer_id, composers(full_name, artistic_name)")
        .order("year", { ascending: false });
      if (composerId) q = q.eq("composer_id", composerId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const sprintsQ = useQuery({
    queryKey: ["budget-sprints", composerId ?? null],
    queryFn: async () => {
      let q = (supabase as any)
        .from("production_billing_sprints")
        .select("production_id, kind, amount, status, productions!inner(composer_id)");
      if (composerId) q = q.eq("productions.composer_id", composerId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  if (productionsQ.isLoading || sprintsQ.isLoading) {
    return <div className="font-display text-muted-foreground">Cargando presupuesto…</div>;
  }

  type Agg = { work: number; workInv: number; workPaid: number; comm: number; commInv: number; commPaid: number };
  const byProd = new Map<string, Agg>();
  for (const s of (sprintsQ.data ?? []) as any[]) {
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

  const rows = (productionsQ.data ?? []).map((p: any) => ({
    ...p,
    agg: byProd.get(p.id) ?? { work: 0, workInv: 0, workPaid: 0, comm: 0, commInv: 0, commPaid: 0 },
  }));

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
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Mini label="Fee presupuestado" value={formatEUR(totals.feeBudget)} />
        <Mini label="Trabajo facturado" value={formatEUR(totals.workInv)} hint={`Cobrado: ${formatEUR(totals.workPaid)}`} />
        <Mini label="Trabajo pendiente" value={formatEUR(totals.feeBudget - totals.workInv)} />
        <Mini label="Comisión IC presupuestada" value={formatEUR(totals.commBudget)} />
        <Mini label="Comisión IC facturada" value={formatEUR(totals.commInv)} hint={`Cobrada: ${formatEUR(totals.commPaid)}`} />
        <Mini label="Comisión IC pendiente" value={formatEUR(totals.commBudget - totals.commInv)} />
      </div>

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

function Mini({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/40 p-4">
      <p className="smallcaps text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}