import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { Money } from "@/components/money";
import { supabase } from "@/integrations/supabase/client";

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

  const price = Number(feeAmount ?? 0);
  const memoTotal = q.data?.approved ?? 0;
  const invoiced = q.data?.invoiced ?? 0;
  const paid = q.data?.paid ?? 0;
  const margin = price > 0 && commission != null ? (Number(commission) / price) * 100 : null;
  const both = price > 0 && memoTotal > 0;
  const diff = Math.abs(price - memoTotal);

  let note: React.ReactNode;
  if (price <= 0) {
    note = <span className="text-destructive">Falta el precio de venta en «Datos principales»: sin él no se puede cruzar con el deal memo ni calcular el margen.</span>;
  } else if (both && diff > 0.005) {
    note = (
      <span className="text-destructive">
        El precio de venta de la ficha y el deal memo cerrado no coinciden: <Money value={price} /> frente a <Money value={memoTotal} /> (diferencia <Money value={diff} />).
      </span>
    );
  } else if (both) {
    note = <span className="text-muted-foreground">El precio de venta de la ficha coincide con el deal memo cerrado.</span>;
  } else {
    note = <span className="text-muted-foreground">Sin deal memo cerrado: se usa el precio de venta de la ficha.</span>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Precio de venta (ficha)" value={price > 0 ? <Money value={price} /> : "—"} />
        <Kpi label="Deal memo cerrado" value={memoTotal > 0 ? <Money value={memoTotal} /> : "—"} />
        <Kpi label="Facturado" value={<Money value={invoiced} />} />
        <Kpi label="Cobrado" value={<Money value={paid} />} />
      </div>
      <p className="text-sm">{note}</p>
      {margin != null && (
        <p className="text-xs text-muted-foreground">
          Margen estimado de la agencia: {margin.toFixed(1)} % sobre el precio de venta.
        </p>
      )}
    </div>
  );
}
