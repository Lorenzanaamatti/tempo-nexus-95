import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/list-states";
import { Money } from "@/components/money";
import { formatDateEs } from "@/lib/dates";
import { toast } from "sonner";
import { Plus, Receipt } from "lucide-react";

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
  "Otros",
] as const;

export type ProductionExpense = {
  id: string;
  concepto: string;
  description: string | null;
  amount: number | null;
  expense_date: string | null;
  provider_name: string | null;
};

export function useProductionExpenses(productionId: string) {
  return useQuery({
    queryKey: ["production-expenses", productionId],
    queryFn: async () => {
      const { data, error } = await db
        .from("production_expenses")
        .select("id, concepto, description, amount, expense_date, provider_name")
        .eq("production_id", productionId)
        .order("expense_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ProductionExpense[];
    },
  });
}

export function ProductionExpenses({
  productionId,
  composerId,
  feeAmount,
  readOnly = false,
}: {
  productionId: string;
  composerId?: string | null;
  feeAmount?: number | null;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const listQ = useProductionExpenses(productionId);
  const [concepto, setConcepto] = useState<string>(EXPENSE_CONCEPTS[0]);
  const [customConcept, setCustomConcept] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [provider, setProvider] = useState("");

  const rows = listQ.data ?? [];
  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.amount ?? 0), 0), [rows]);
  const byConcept = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.concepto, (map.get(r.concepto) ?? 0) + Number(r.amount ?? 0)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["production-expenses", productionId] });
    qc.invalidateQueries({ queryKey: ["composer-expenses"] });
  }

  async function add() {
    const name = concepto === "Otros" && customConcept.trim() ? customConcept.trim() : concepto;
    const value = Number(amount.replace(",", "."));
    if (!name || Number.isNaN(value)) return toast.error("Indica un concepto y un importe válido");
    const { error } = await db.from("production_expenses").insert({
      production_id: productionId,
      composer_id: composerId || null,
      concepto: name,
      description: description.trim() || null,
      amount: value,
      expense_date: expenseDate || null,
      provider_name: provider.trim() || null,
    });
    if (error) return toast.error(error.message);
    setCustomConcept(""); setDescription(""); setAmount(""); setExpenseDate(""); setProvider("");
    invalidate();
  }

  async function remove(id: string) {
    const { error } = await db.from("production_expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="grid gap-2 rounded-sm border border-dashed border-border p-3 sm:grid-cols-[180px_1fr_120px_150px_150px_auto]">
          <Select value={concepto} onValueChange={setConcepto}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPENSE_CONCEPTS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {concepto === "Otros" ? (
            <Input value={customConcept} onChange={(e) => setCustomConcept(e.target.value)} placeholder="Concepto propio" />
          ) : (
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalle (opcional)" />
          )}
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Importe €" inputMode="decimal" />
          <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Proveedor" />
          <Button onClick={add}><Plus className="mr-1 h-4 w-4" /> Añadir</Button>
        </div>
      )}

      {listQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando gastos…</p>
      ) : listQ.error ? (
        <p className="text-sm text-destructive">{(listQ.error as any)?.message}</p>
      ) : !rows.length ? (
        <EmptyState variant="inline" icon={Receipt} title="Sin gastos" description="Añade los gastos de producción con su concepto para ver el margen real." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Concepto</th>
                  <th className="px-3 py-2 text-left">Detalle</th>
                  <th className="px-3 py-2 text-left">Proveedor</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-right">Importe</th>
                  {!readOnly && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium">{r.concepto}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.description ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.provider_name ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDateEs(r.expense_date)}</td>
                    <td className="px-3 py-2 text-right"><Money value={r.amount} /></td>
                    {!readOnly && (
                      <td className="px-3 py-2 text-right">
                        <ConfirmDeleteButton iconOnly title="¿Eliminar este gasto?" onConfirm={() => remove(r.id)} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-sm border border-border p-3">
              <Label className="smallcaps text-[10px] text-muted-foreground">Total gastos</Label>
              <p className="font-display text-2xl"><Money value={total} /></p>
            </div>
            {feeAmount != null && (
              <div className="rounded-sm border border-border p-3">
                <Label className="smallcaps text-[10px] text-muted-foreground">Margen sobre caché</Label>
                <p className="font-display text-2xl"><Money value={Number(feeAmount) - total} /></p>
              </div>
            )}
            <div className="rounded-sm border border-border p-3">
              <Label className="smallcaps text-[10px] text-muted-foreground">Por concepto</Label>
              <ul className="mt-1 space-y-0.5 text-xs">
                {byConcept.map(([c, v]) => (
                  <li key={c} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{c}</span>
                    <Money value={v} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
