import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { formatEUR, parseAmount } from "@/lib/money";

const STATUS_LABEL = {
  pendiente: "Pendiente",
  facturado: "Facturado",
  cobrado: "Cobrado",
} as const;

export function BillingSprintsEditor({
  productionId,
  kind,
  title,
  totalReference,
}: {
  productionId: string;
  kind: "trabajo" | "comision";
  title: string;
  totalReference?: number | null;
}) {
  const qc = useQueryClient();
  const key = ["billing-sprints", productionId, kind];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_billing_sprints")
        .select("*")
        .eq("production_id", productionId)
        .eq("kind", kind)
        .order("sprint_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = data ?? [];
  const sum = rows.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
  const sumInvoiced = rows
    .filter((r: any) => r.status === "facturado" || r.status === "cobrado")
    .reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
  const sumPaid = rows
    .filter((r: any) => r.status === "cobrado")
    .reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);

  async function add() {
    if (rows.length >= 6) return toast.error("Máximo 6 sprints");
    const next = (rows.at(-1) as any)?.sprint_number ?? 0;
    const { error } = await supabase.from("production_billing_sprints").insert({
      production_id: productionId,
      kind,
      sprint_number: Math.min(next + 1, 6),
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }

  async function update(id: string, patch: Record<string, unknown>) {
    const { error } = await supabase.from("production_billing_sprints").update(patch as any).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar sprint?")) return;
    const { error } = await supabase.from("production_billing_sprints").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="font-display text-xl">{title}</h3>
          <p className="text-xs text-muted-foreground">
            Total presupuestado: <strong>{formatEUR(sum)}</strong> ·
            Facturado: <strong>{formatEUR(sumInvoiced)}</strong> ·
            Cobrado: <strong>{formatEUR(sumPaid)}</strong>
            {typeof totalReference === "number" && (
              <> · Referencia: <strong>{formatEUR(totalReference)}</strong></>
            )}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={rows.length >= 6}>
          <Plus className="mr-1 h-3 w-3" /> Añadir sprint
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground">Aún no hay sprints. Pueden crearse hasta 6.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r: any) => (
            <li key={r.id} className="rounded-sm border border-border bg-card/40 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                <div>
                  <Label className="text-xs text-muted-foreground">Sprint #</Label>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    defaultValue={r.sprint_number}
                    onBlur={(e) => {
                      const n = Math.max(1, Math.min(6, Number(e.target.value) || 1));
                      if (n !== r.sprint_number) update(r.id, { sprint_number: n });
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Concepto</Label>
                  <Input
                    defaultValue={r.label ?? ""}
                    placeholder="Ej. Sprint 1 · entrega de música"
                    onBlur={(e) => e.target.value !== (r.label ?? "") && update(r.id, { label: e.target.value || null })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Importe (€)</Label>
                  <Input
                    defaultValue={r.amount != null ? String(r.amount).replace(".", ",") : ""}
                    placeholder="0,00"
                    onBlur={(e) => {
                      const parsed = parseAmount(e.target.value);
                      if (parsed !== Number(r.amount)) update(r.id, { amount: parsed });
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vencimiento</Label>
                  <Input type="date" defaultValue={r.due_date ?? ""} onBlur={(e) => e.target.value !== (r.due_date ?? "") && update(r.id, { due_date: e.target.value || null })} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Select value={r.status} onValueChange={(v) => update(r.id, { status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha factura</Label>
                  <Input type="date" defaultValue={r.invoiced_date ?? ""} onBlur={(e) => e.target.value !== (r.invoiced_date ?? "") && update(r.id, { invoiced_date: e.target.value || null })} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha cobro</Label>
                  <Input type="date" defaultValue={r.paid_date ?? ""} onBlur={(e) => e.target.value !== (r.paid_date ?? "") && update(r.id, { paid_date: e.target.value || null })} />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-xs text-muted-foreground">Notas</Label>
                  <Input defaultValue={r.notes ?? ""} onBlur={(e) => e.target.value !== (r.notes ?? "") && update(r.id, { notes: e.target.value || null })} />
                </div>
                <div className="flex items-end justify-end">
                  <Button type="button" size="sm" variant="ghost" onClick={() => remove(r.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}