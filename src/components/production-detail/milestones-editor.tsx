import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/list-states";
import { formatDateEs } from "@/lib/dates";
import {
  MILESTONE_STATUSES, MILESTONE_STATUS_LABEL, MILESTONE_TONE,
  isMilestoneOverdue, normalizeMilestoneStatus,
} from "@/lib/production-milestones";
import { toast } from "sonner";
import { Plus, Flag, AlertTriangle } from "lucide-react";

export type Milestone = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  position: number;
};

export function useProductionMilestones(productionId: string) {
  return useQuery({
    queryKey: ["production-milestones", productionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_phases")
        .select("id, name, start_date, end_date, status, position")
        .eq("production_id", productionId)
        .order("start_date", { ascending: true, nullsFirst: false })
        .order("position");
      if (error) throw error;
      return (data ?? []) as Milestone[];
    },
  });
}

export function ProductionMilestonesEditor({ productionId }: { productionId: string }) {
  const qc = useQueryClient();
  const key = ["production-milestones", productionId];
  const listQ = useProductionMilestones(productionId);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  function invalidate() {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["production-phases", productionId] });
    qc.invalidateQueries({ queryKey: ["calendar-events"] });
    qc.invalidateQueries({ queryKey: ["productions-lifecycle"] });
  }

  async function add() {
    const n = name.trim();
    if (!n) return;
    const { error } = await supabase.from("production_phases").insert({
      production_id: productionId,
      name: n,
      start_date: date || null,
      status: "pendiente",
      position: listQ.data?.length ?? 0,
    });
    if (error) return toast.error(error.message);
    setName(""); setDate("");
    invalidate();
  }

  async function update(id: string, patch: Partial<Milestone>) {
    const { error } = await supabase.from("production_phases").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("production_phases").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  const rows = listQ.data ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 rounded-sm border border-dashed border-border p-3 sm:grid-cols-[1fr_180px_auto]">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del hito (Entrega stems, Mix final, Master aprobado, Estreno…)"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} title="Fecha estimada" />
        <Button onClick={add} disabled={!name.trim()}><Plus className="mr-1 h-4 w-4" /> Añadir hito</Button>
      </div>

      {!rows.length ? (
        <EmptyState variant="inline" icon={Flag} title="Sin hitos" description="Añade los hitos de entrega: aparecerán en el calendario, capa Producciones." />
      ) : (
        <ol className="space-y-2">
          {rows.map((m) => {
            const st = normalizeMilestoneStatus(m.status);
            const overdue = isMilestoneOverdue(m);
            return (
              <li key={m.id} className={`rounded-sm border p-3 ${overdue ? "border-destructive bg-destructive/5" : "border-border"}`}>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[180px] flex-1">
                    <Label className="smallcaps text-[10px] text-muted-foreground">Hito</Label>
                    <Input value={m.name} onChange={(e) => update(m.id, { name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="smallcaps text-[10px] text-muted-foreground">Fecha estimada</Label>
                    <Input type="date" value={m.start_date ?? ""} onChange={(e) => update(m.id, { start_date: e.target.value || null })} />
                  </div>
                  <div>
                    <Label className="smallcaps text-[10px] text-muted-foreground">Fecha real</Label>
                    <Input type="date" value={m.end_date ?? ""} onChange={(e) => update(m.id, { end_date: e.target.value || null })} />
                  </div>
                  <div className="w-40">
                    <Label className="smallcaps text-[10px] text-muted-foreground">Estado</Label>
                    <Select value={st} onValueChange={(v) => update(m.id, { status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MILESTONE_STATUSES.map((s) => <SelectItem key={s} value={s}>{MILESTONE_STATUS_LABEL[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <ConfirmDeleteButton iconOnly title="¿Eliminar este hito?" onConfirm={() => remove(m.id)} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={`rounded-sm px-1.5 py-0.5 smallcaps ${MILESTONE_TONE[st]}`}>{MILESTONE_STATUS_LABEL[st]}</span>
                  <span className="text-muted-foreground">
                    Estimada {formatDateEs(m.start_date)} · Real {formatDateEs(m.end_date)}
                  </span>
                  {overdue && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-destructive px-1.5 py-0.5 font-semibold smallcaps text-destructive-foreground">
                      <AlertTriangle className="h-3 w-3" aria-hidden /> Retrasado
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-xs text-muted-foreground">Los hitos con fecha aparecen automáticamente en el calendario, capa Producciones.</p>
    </div>
  );
}