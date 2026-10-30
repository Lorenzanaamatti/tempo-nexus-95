import { useEffect, useState } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateEs } from "@/lib/dates";

const db = supabase as any;

export type SiblingProduction = { id: string; label: string };

/** Otras fichas de la misma película (una por representado). */
export function useSiblingProductions(productionId: string) {
  return useQuery({
    queryKey: ["production-sibling-list", productionId],
    queryFn: async (): Promise<SiblingProduction[]> => {
      const { data: me } = await db.from("productions").select("sibling_group_id").eq("id", productionId).maybeSingle();
      if (!me?.sibling_group_id) return [];
      const { data: rows } = await db
        .from("productions")
        .select("id, composer_id")
        .eq("sibling_group_id", me.sibling_group_id)
        .neq("id", productionId);
      const cids = ((rows ?? []) as any[]).map((r) => r.composer_id).filter(Boolean);
      const { data: cs } = cids.length
        ? await db.from("composers").select("id, full_name, artistic_name").in("id", cids)
        : { data: [] };
      const byId = new Map(((cs ?? []) as any[]).map((c) => [c.id, c.artistic_name || c.full_name]));
      return ((rows ?? []) as any[]).map((r) => ({ id: r.id, label: byId.get(r.composer_id) ?? "otro representado" }));
    },
  });
}

/** Refresca todas las vistas que pintan procesos o fechas de producciones (Gantt, calendarios, fichas). */
export function invalidateProductionTimelines(qc: QueryClient) {
  for (const k of [
    "production-milestones", "production-phases", "gantt-phases", "calendar-events", "calendar-events-all",
    "calendario-general-eventos", "calendario-general-producciones", "productions-lifecycle",
    "produccion-seguimiento", "produccion", "production-change-log",
  ]) qc.invalidateQueries({ queryKey: [k] });
}

export type PendingChange = {
  title: string;
  /** Líneas «antes → después» que se muestran y se guardan en el registro. */
  changes: { field: string; label: string; old: string | null; next: string | null; oldShown?: string | null; nextShown?: string | null }[];
  isDelete?: boolean;
};

export function displayValue(v: string | null | undefined) {
  if (v == null || v === "") return "vacío";
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDateEs(v) : v;
}

/**
 * Pregunta el motivo de un cambio y, una por una, si se aplica también en las otras fichas de la película.
 * Devuelve el motivo y los ids de las fichas hermanas elegidas.
 */
export function ChangeReasonDialog({
  pending,
  siblings,
  onConfirm,
  onCancel,
}: {
  pending: PendingChange | null;
  siblings: SiblingProduction[];
  onConfirm: (reason: string, siblingIds: string[]) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (pending) { setReason(""); setPicked({}); }
  }, [pending]);

  return (
    <Dialog open={!!pending} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pending?.isDelete ? "¿Por qué se elimina?" : "¿Por qué cambia?"}</DialogTitle>
          <DialogDescription>{pending?.title}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1 text-sm">
          {pending?.changes.map((c) => (
            <li key={c.field}>
              <span className="text-muted-foreground">{c.label}:</span>{" "}
              <span className="line-through text-muted-foreground">{displayValue(c.oldShown ?? c.old)}</span> →{" "}
              <strong>{pending.isDelete ? "eliminado" : displayValue(c.nextShown ?? c.next)}</strong>
            </li>
          ))}
        </ul>
        <div>
          <Label>Motivo del cambio (opcional)</Label>
          <Textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explica por qué" />
        </div>
        {siblings.length > 0 && (
          <div className="space-y-2 rounded-sm border border-border p-3">
            <p className="text-sm font-medium">¿Aplicar también en las otras fichas de esta película?</p>
            {siblings.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!picked[s.id]} onCheckedChange={(v) => setPicked((p) => ({ ...p, [s.id]: v === true }))} />
                Ficha de {s.label}
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar el cambio</Button>
          <Button variant="secondary" onClick={() => onConfirm("Sin motivo indicado", siblings.filter((s) => picked[s.id]).map((s) => s.id))}>
            Guardar sin motivo
          </Button>
          <Button disabled={!reason.trim()} onClick={() => onConfirm(reason.trim(), siblings.filter((s) => picked[s.id]).map((s) => s.id))}>
            Guardar con motivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function logProductionChanges(rows: {
  production_id: string; phase_id?: string | null; subject: string; field: string;
  old_value: string | null; new_value: string | null; reason: string; also_applied_to?: string | null;
}[]) {
  if (!rows.length) return;
  const { data: u } = await supabase.auth.getUser();
  const { error } = await db.from("production_change_log").insert(rows.map((r) => ({ ...r, changed_by: u.user?.id })));
  if (error) throw error;
}

/** Listado del registro de cambios de una producción. */
export function ProductionChangeLog({ productionId }: { productionId: string }) {
  const q = useQuery({
    queryKey: ["production-change-log", productionId],
    queryFn: async () => {
      const { data, error } = await db
        .from("production_change_log")
        .select("*")
        .eq("production_id", productionId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const rows = q.data ?? [];
  if (!rows.length) return <p className="text-sm text-muted-foreground">Todavía no hay cambios registrados.</p>;
  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Quién</th><th className="px-3 py-2">Qué</th>
            <th className="px-3 py-2">Antes</th><th className="px-3 py-2">Después</th><th className="px-3 py-2">Motivo</th>
            <th className="px-3 py-2">También en</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border align-top">
              <td className="whitespace-nowrap px-3 py-2">{new Date(r.changed_at).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
              <td className="px-3 py-2 font-semibold">{r.changed_by_initials ?? "?"}</td>
              <td className="px-3 py-2">{r.subject} · {r.field}</td>
              <td className="px-3 py-2 text-muted-foreground">{displayValue(r.old_value)}</td>
              <td className="px-3 py-2">{displayValue(r.new_value)}</td>
              <td className="px-3 py-2">{r.reason}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.also_applied_to || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function useQc() { return useQueryClient(); }
