import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatEUR } from "@/lib/money";
import { Button } from "@/components/ui/button";

type Granularity = "month" | "quarter" | "year";
type Sprint = {
  id: string;
  production_id: string;
  kind: "trabajo" | "comision" | string;
  amount: number | null;
  due_date: string | null;
  invoiced_date: string | null;
  paid_date: string | null;
  status: string | null;
  productions?: { title: string; composer_id: string | null } | null;
};

function bucketKey(date: string, g: Granularity): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (g === "year") return `${y}`;
  if (g === "quarter") return `${y}-T${Math.floor(m / 3) + 1}`;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function bucketLabel(key: string, g: Granularity): string {
  if (g === "year") return key;
  if (g === "quarter") return key;
  const [y, m] = key.split("-");
  const names = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${names[Number(m) - 1]} ${y}`;
}

export function FinanceDashboard({ composerId }: { composerId?: string | null }) {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [kindFilter, setKindFilter] = useState<"all" | "comision" | "trabajo">("all");

  const sprintsQ = useQuery({
    queryKey: ["finance-sprints", composerId ?? null],
    queryFn: async () => {
      let query = (supabase as any)
        .from("production_billing_sprints")
        .select("id, production_id, kind, amount, due_date, invoiced_date, paid_date, status, productions!inner(title, composer_id)");
      if (composerId) query = query.eq("productions.composer_id", composerId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Sprint[];
    },
  });

  const sprints = useMemo(() => {
    const list = sprintsQ.data ?? [];
    if (kindFilter === "all") return list;
    return list.filter((s) => s.kind === kindFilter);
  }, [sprintsQ.data, kindFilter]);

  const buckets = useMemo(() => {
    const map = new Map<string, { previsto: number; facturado: number; cobrado: number }>();
    for (const s of sprints) {
      const amt = Number(s.amount) || 0;
      if (s.due_date) {
        const k = bucketKey(s.due_date, granularity);
        const cur = map.get(k) ?? { previsto: 0, facturado: 0, cobrado: 0 };
        cur.previsto += amt;
        map.set(k, cur);
      }
      if (s.invoiced_date) {
        const k = bucketKey(s.invoiced_date, granularity);
        const cur = map.get(k) ?? { previsto: 0, facturado: 0, cobrado: 0 };
        cur.facturado += amt;
        map.set(k, cur);
      }
      if (s.paid_date) {
        const k = bucketKey(s.paid_date, granularity);
        const cur = map.get(k) ?? { previsto: 0, facturado: 0, cobrado: 0 };
        cur.cobrado += amt;
        map.set(k, cur);
      }
    }
    const keys = Array.from(map.keys()).sort();
    return keys.map((k) => ({ key: k, label: bucketLabel(k, granularity), ...map.get(k)! }));
  }, [sprints, granularity]);

  const totals = useMemo(() => {
    return buckets.reduce(
      (acc, b) => {
        acc.previsto += b.previsto;
        acc.facturado += b.facturado;
        acc.cobrado += b.cobrado;
        return acc;
      },
      { previsto: 0, facturado: 0, cobrado: 0 },
    );
  }, [buckets]);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = sprints.filter((s) => s.due_date && !s.invoiced_date && s.due_date < today);
  const overdueTotal = overdue.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const max = Math.max(1, ...buckets.map((b) => Math.max(b.previsto, b.facturado, b.cobrado)));

  if (sprintsQ.isLoading) {
    return <div className="font-display text-muted-foreground">Cargando datos económicos…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-sm border border-border p-1">
          {(["month", "quarter", "year"] as Granularity[]).map((g) => (
            <Button
              key={g}
              size="sm"
              variant={granularity === g ? "default" : "ghost"}
              onClick={() => setGranularity(g)}
              className="h-7 px-3 text-xs"
            >
              {g === "month" ? "Mes" : g === "quarter" ? "Trimestre" : "Año"}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 rounded-sm border border-border p-1">
          {([
            ["all", "Todo"],
            ["comision", "Comisión IC"],
            ["trabajo", "Trabajo"],
          ] as const).map(([v, l]) => (
            <Button
              key={v}
              size="sm"
              variant={kindFilter === v ? "default" : "ghost"}
              onClick={() => setKindFilter(v)}
              className="h-7 px-3 text-xs"
            >
              {l}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="Previsto" value={formatEUR(totals.previsto)} accent="muted" />
        <KPI label="Facturado" value={formatEUR(totals.facturado)} accent="primary" />
        <KPI label="Cobrado" value={formatEUR(totals.cobrado)} accent="success" />
        <KPI label="Vencido sin facturar" value={formatEUR(overdueTotal)} accent="warn" sub={`${overdue.length} sprint${overdue.length === 1 ? "" : "s"}`} />
      </div>

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Periodo</th>
              <th className="px-3 py-2 text-right">Previsto</th>
              <th className="px-3 py-2 text-right">Facturado</th>
              <th className="px-3 py-2 text-right">Cobrado</th>
              <th className="px-3 py-2 w-1/3">Distribución</th>
            </tr>
          </thead>
          <tbody>
            {buckets.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Sin datos de facturación.</td></tr>
            ) : (
              buckets.map((b) => (
                <tr key={b.key} className="border-t border-border">
                  <td className="px-3 py-2 font-display">{b.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatEUR(b.previsto)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatEUR(b.facturado)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatEUR(b.cobrado)}</td>
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      <Bar value={b.previsto} max={max} className="bg-muted-foreground/30" />
                      <Bar value={b.facturado} max={max} className="bg-primary/60" />
                      <Bar value={b.cobrado} max={max} className="bg-emerald-500/70" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "primary" | "success" | "warn" | "muted" }) {
  const ring = accent === "primary" ? "border-primary/40" : accent === "success" ? "border-emerald-500/40" : accent === "warn" ? "border-amber-500/50" : "border-border";
  return (
    <div className={`rounded-sm border ${ring} bg-card p-3`}>
      <div className="smallcaps text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  const w = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-sm bg-muted/40">
      <div className={`h-full rounded-sm ${className}`} style={{ width: `${w}%` }} />
    </div>
  );
}