import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { Money } from "@/components/money";
import { supabase } from "@/integrations/supabase/client";
import { formatEUR } from "@/lib/money";

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border p-3">
      <div className="smallcaps text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl tabular-nums">{value}</div>
    </div>
  );
}

export function ProductionEconomics({
  productionId, feeAmount, commission,
}: { productionId: string; feeAmount: number | null; commission: number | null }) {
  const q = useQuery({
    queryKey: ["production-economics", productionId],
    queryFn: async () => {
      const [sprints, memos] = await Promise.all([
        (supabase as any).from("production_billing_sprints")
          .select("amount, invoiced_date, paid_date").eq("production_id", productionId),
        (supabase as any).from("deal_memos")
          .select("importe_propuesto, estado").eq("production_id", productionId),
      ]);
      if (sprints.error) throw sprints.error;
      if (memos.error) throw memos.error;
      const rows = sprints.data ?? [];
      const invoiced = rows.filter((r: any) => r.invoiced_date).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      const paid = rows.filter((r: any) => r.paid_date).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      const approved = (memos.data ?? [])
        .filter((m: any) => m.estado === "cerrado")
        .reduce((s: number, m: any) => s + Number(m.importe_propuesto ?? 0), 0);
      return { invoiced, paid, approved };
    },
  });

  const approved = q.data?.approved || Number(feeAmount ?? 0);
  const invoiced = q.data?.invoiced ?? 0;
  const paid = q.data?.paid ?? 0;
  const margin = approved > 0 && commission != null ? (Number(commission) / approved) * 100 : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Kpi label="Presupuesto aprobado" value={<Money value={approved} />} />
      <Kpi label="Facturado" value={<Money value={invoiced} />} />
      <Kpi label="Cobrado" value={<Money value={paid} />} />
      <Kpi label="Margen estimado" value={margin == null ? "—" : `${margin.toFixed(1)} %`} />
    </div>
  );
}