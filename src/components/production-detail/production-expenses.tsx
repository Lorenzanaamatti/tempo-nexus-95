import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/list-states";
import { Money } from "@/components/money";
import { formatNumberEs } from "@/lib/money";
import { toast } from "sonner";
import { Plus, Receipt } from "lucide-react";
import { computeAgencyCommission, type CommissionBasis } from "@/lib/commission";

const db = supabase as any;

export const EXPENSE_CONCEPTS = [
  "Músicos",
  "Estudio de grabación",
  "Mezcla",
  "Máster",
  "Orquestador / arreglos",
  "Copistería",
  "Licencias",
  "Viajes y dietas",
] as const;

export type ProductionExpense = {
  id: string;
  concepto: string;
  description: string | null;
  amount: number | null;
  budget_amount: number | null;
  expense_date: string | null;
  provider_name: string | null;
};

export function useProductionExpenses(productionId: string) {
  return useQuery({
    queryKey: ["production-expenses", productionId],
    queryFn: async () => {
      const { data, error } = await db
        .from("production_expenses")
        .select("id, concepto, description, amount, budget_amount, expense_date, provider_name")
        .eq("production_id", productionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductionExpense[];
    },
  });
}

/** Conceptos y proveedores ya usados en cualquier producción, para ofrecerlos en desplegable. */
function useExpenseSuggestions() {
  return useQuery({
    queryKey: ["production-expenses-suggestions"],
    queryFn: async () => {
      const { data, error } = await db.from("production_expenses").select("concepto, provider_name").limit(5000);
      if (error) throw error;
      const uniq = (vals: (string | null)[]) => {
        const m = new Map<string, string>();
        vals.forEach((v) => { const t = v?.trim(); if (t && !m.has(t.toLowerCase())) m.set(t.toLowerCase(), t); });
        return Array.from(m.values()).sort((a, b) => a.localeCompare(b, "es"));
      };
      return {
        concepts: uniq([...EXPENSE_CONCEPTS, ...(data ?? []).map((r: any) => r.concepto)]),
        providers: uniq((data ?? []).map((r: any) => r.provider_name)),
      };
    },
  });
}

const parseNum = (s: string) => {
  const t = s.trim().replace(/\./g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};
const devCls = (d: number) => (d > 0 ? "text-destructive" : d < 0 ? "text-success" : "text-muted-foreground");
const devTxt = (d: number) => `${d > 0 ? "+" : d < 0 ? "−" : ""}${formatNumberEs(Math.abs(d))} €`;
const pct = (v: number, total: number) => (total ? `${((v / total) * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 })} %` : "—");

export function ProductionExpenses({
  productionId,
  composerId,
  feeAmount,
  commissionBasis,
  commissionPct,
  readOnly = false,
}: {
  productionId: string;
  composerId?: string | null;
  feeAmount?: number | null;
  commissionBasis?: string | null;
  commissionPct?: number | null;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const listQ = useProductionExpenses(productionId);
  const sugQ = useExpenseSuggestions();
  const [concepto, setConcepto] = useState("");
  const [provider, setProvider] = useState("");
  const [budget, setBudget] = useState("");
  const [real, setReal] = useState("");

  const rows = listQ.data ?? [];
  const totalBudget = useMemo(() => rows.reduce((s, r) => s + Number(r.budget_amount ?? 0), 0), [rows]);
  const totalReal = useMemo(() => rows.reduce((s, r) => s + Number(r.amount ?? 0), 0), [rows]);
  const basis = (commissionBasis || "precio") as CommissionBasis;
  const commission = computeAgencyCommission(feeAmount ?? null, commissionPct ?? null, basis, totalReal);
  const margin = feeAmount != null ? Number(feeAmount) - totalReal : null;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["production-expenses", productionId] });
    qc.invalidateQueries({ queryKey: ["production-expenses-suggestions"] });
    qc.invalidateQueries({ queryKey: ["composer-expenses"] });
  }

  async function add() {
    const name = concepto.trim();
    const b = parseNum(budget);
    const r = parseNum(real);
    if (!name) return toast.error("Escribe o elige un concepto");
    if (Number.isNaN(b) || Number.isNaN(r)) return toast.error("Importe no válido");
    if (b == null && r == null) return toast.error("Indica el importe presupuestado o el coste real");
    const { error } = await db.from("production_expenses").insert({
      production_id: productionId,
      composer_id: composerId || null,
      concepto: name,
      provider_name: provider.trim() || null,
      budget_amount: b,
      amount: r ?? 0,
    });
    if (error) return toast.error(error.message);
    setConcepto(""); setProvider(""); setBudget(""); setReal("");
    invalidate();
  }

  async function updateField(id: string, field: "budget_amount" | "amount", raw: string) {
    const v = parseNum(raw);
    if (Number.isNaN(v)) return toast.error("Importe no válido");
    const { error } = await db.from("production_expenses").update({ [field]: field === "amount" ? (v ?? 0) : v }).eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  async function remove(id: string) {
    const { error } = await db.from("production_expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  const fmt = (n: number | null) => (n == null ? "" : n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" as any }));

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="grid gap-2 rounded-sm border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_150px_150px_auto]">
          <Input list={`concepts-${productionId}`} value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Concepto (escribe o elige)" />
          <datalist id={`concepts-${productionId}`}>
            {(sugQ.data?.concepts ?? []).map((c) => <option key={c} value={c} />)}
          </datalist>
          <Input list={`providers-${productionId}`} value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Proveedor (escribe o elige)" />
          <datalist id={`providers-${productionId}`}>
            {(sugQ.data?.providers ?? []).map((c) => <option key={c} value={c} />)}
          </datalist>
          <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Presupuestado €" inputMode="decimal" />
          <Input value={real} onChange={(e) => setReal(e.target.value)} placeholder="Coste real €" inputMode="decimal" />
          <Button onClick={add}><Plus className="mr-1 h-4 w-4" /> Añadir</Button>
        </div>
      )}

      {listQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando gastos…</p>
      ) : listQ.error ? (
        <p className="text-sm text-destructive">{(listQ.error as any)?.message}</p>
      ) : !rows.length ? (
        <EmptyState variant="inline" icon={Receipt} title="Sin gastos" description="Añade los gastos de producción con su concepto, proveedor, presupuesto y coste real." />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full table-fixed text-base">
            <colgroup><col className="w-[18%]" /><col className="w-[16%]" /><col className="w-[13%]" /><col className="w-[10%]" /><col className="w-[13%]" /><col className="w-[10%]" /><col className="w-[12%]" />{!readOnly && <col className="w-[8%]" />}</colgroup>
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Concepto</th>
                <th className="px-3 py-2 text-left">Proveedor</th>
                <th className="px-3 py-2 text-right">Presupuestado (€)</th>
                <th className="px-3 py-2 text-right">% presupuesto</th>
                <th className="px-3 py-2 text-right">Coste real (€)</th>
                <th className="px-3 py-2 text-right">% coste real</th>
                <th className="px-3 py-2 text-right">Desviación (€)</th>
                {!readOnly && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const b = Number(r.budget_amount ?? 0);
                const c = Number(r.amount ?? 0);
                const dev = c - b;
                return (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium">{r.concepto}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.provider_name ?? "—"}</td>
                    <td className="px-3 py-1 text-right">
                      {readOnly ? <Money value={r.budget_amount} /> : (
                        <Input key={`b-${r.id}-${r.budget_amount}`} className="ml-auto h-8 w-28 text-right" defaultValue={fmt(r.budget_amount)} onBlur={(e) => e.target.value !== fmt(r.budget_amount) && updateField(r.id, "budget_amount", e.target.value)} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pct(b, Number(feeAmount ?? 0))}</td>
                    <td className="px-3 py-1 text-right">
                      {readOnly ? <Money value={r.amount} /> : (
                        <Input key={`a-${r.id}-${r.amount}`} className="ml-auto h-8 w-28 text-right" defaultValue={fmt(r.amount)} onBlur={(e) => e.target.value !== fmt(r.amount) && updateField(r.id, "amount", e.target.value)} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pct(c, Number(feeAmount ?? 0))}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${devCls(dev)}`}>{devTxt(dev)}</td>
                    {!readOnly && (
                      <td className="px-3 py-2 text-right">
                        <ConfirmDeleteButton iconOnly title="¿Eliminar este gasto?" onConfirm={() => remove(r.id)} />
                      </td>
                    )}
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border font-medium">
                <td className="px-3 py-2" colSpan={2}>TOTAL</td>
                <td className="px-3 py-2 text-right"><Money value={totalBudget} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{pct(totalBudget, Number(feeAmount ?? 0))}</td>
                <td className="px-3 py-2 text-right"><Money value={totalReal} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{pct(totalReal, Number(feeAmount ?? 0))}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${devCls(totalReal - totalBudget)}`}>{devTxt(totalReal - totalBudget)}</td>
                {!readOnly && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {feeAmount == null && (
        <p className="rounded-sm border border-dashed border-border p-3 text-sm text-muted-foreground">
          Falta el <strong>precio negociado con la productora</strong> en Datos económicos: sin él no se pueden calcular los porcentajes ni la comisión de la agencia.
        </p>
      )}
      {feeAmount != null && (
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="rounded-sm border border-border p-3">
            <Label className="smallcaps text-[10px] text-muted-foreground">Precio negociado</Label>
            <p className="font-display text-2xl"><Money value={feeAmount} /></p>
          </div>
          <div className="rounded-sm border border-border p-3">
            <Label className="smallcaps text-[10px] text-muted-foreground">Total gastos</Label>
            <p className="font-display text-2xl"><Money value={totalReal} /></p>
            <p className="text-xs text-muted-foreground">Coste real</p>
          </div>
          <div className="rounded-sm border border-border p-3">
            <Label className="smallcaps text-[10px] text-muted-foreground">Margen del compositor/a</Label>
            <p className="font-display text-2xl"><Money value={margin} /></p>
            <p className="text-xs text-muted-foreground">Precio − coste real</p>
          </div>
          <div className="rounded-sm border border-border p-3">
            <Label className="smallcaps text-[10px] text-muted-foreground">Comisión agencia</Label>
            <p className="font-display text-2xl">{commission == null ? "—" : <Money value={commission} />}</p>
            <p className="text-xs text-muted-foreground">
              {commissionPct == null ? "Falta el % en Datos económicos" : `${commissionPct} % sobre ${basis === "margen" ? "el margen" : "el precio negociado"}`}
            </p>
          </div>
          <div className="rounded-sm border border-border p-3">
            <Label className="smallcaps text-[10px] text-muted-foreground">Le queda al compositor/a</Label>
            <p className="font-display text-2xl"><Money value={margin != null ? margin - (commission ?? 0) : null} /></p>
          </div>
        </div>
      )}
    </div>
  );
}
