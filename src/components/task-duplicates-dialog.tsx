import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateEs } from "@/lib/dates";
import { findDuplicatePairs, pairKey, type DupTask } from "@/lib/task-duplicates";
import { deleteTask, invalidateTaskQueries } from "@/components/task-edit-dialog";

export type DupRow = DupTask & { notes?: string | null; assignee?: { full_name: string } | null; production?: { title: string } | null; entry_date?: string | null };

const STORAGE = "task-dup-ignored";
function loadIgnored(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE) ?? "[]")); } catch { return new Set(); }
}

export function useDuplicatePairs(tasks: DupRow[]) {
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  useEffect(() => setIgnored(loadIgnored()), []);
  const pairs = useMemo(() => findDuplicatePairs(tasks, ignored) as Array<{ a: DupRow; b: DupRow; score: number }>, [tasks, ignored]);
  const ignore = (a: string, b: string) => {
    const next = new Set(ignored); next.add(pairKey(a, b));
    localStorage.setItem(STORAGE, JSON.stringify([...next]));
    setIgnored(next);
  };
  return { pairs, ignore };
}

function Card({ t, onKeep, busy }: { t: DupRow; onKeep: () => void; busy: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-border p-3">
      <p className="text-sm font-medium">{t.title}</p>
      {t.notes && <p className="line-clamp-4 whitespace-pre-line text-xs text-muted-foreground">{t.notes}</p>}
      <dl className="grid grid-cols-[auto,1fr] gap-x-2 text-[11px] text-muted-foreground">
        <dt>Cliente</dt><dd>{t.client || "—"}</dd>
        <dt>Producción</dt><dd>{t.production?.title || "—"}</dd>
        <dt>Responsable</dt><dd>{t.assignee?.full_name || "—"}</dd>
        <dt>Entrada</dt><dd>{formatDateEs(t.entry_date ?? null)}</dd>
        <dt>Entrega</dt><dd>{formatDateEs(t.due_date ?? null)}</dd>
      </dl>
      <Button size="sm" className="mt-auto" disabled={busy} onClick={onKeep}>Conservar esta (eliminar la otra)</Button>
    </div>
  );
}

export function TaskDuplicatesDialog({ open, onClose, pairs, ignore }: {
  open: boolean; onClose: () => void;
  pairs: Array<{ a: DupRow; b: DupRow; score: number }>; ignore: (a: string, b: string) => void;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const pair = pairs[0];

  async function keep(keepId: string, dropId: string) {
    setBusy(true);
    try { await deleteTask(dropId); toast.success("Duplicado eliminado"); invalidateTaskQueries(qc); }
    catch (e) { toast.error(e instanceof Error ? e.message : "No se ha podido eliminar"); }
    finally { setBusy(false); }
    void keepId;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>¿Son la misma tarea?</DialogTitle>
          <DialogDescription>
            {pair ? `Posible duplicado (${Math.round(pair.score * 100)}% de coincidencia). Quedan ${pairs.length} por revisar.` : "No quedan posibles duplicados."}
          </DialogDescription>
        </DialogHeader>
        {pair ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card t={pair.a} busy={busy} onKeep={() => keep(pair.a.id, pair.b.id)} />
              <Card t={pair.b} busy={busy} onKeep={() => keep(pair.b.id, pair.a.id)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={busy} onClick={() => ignore(pair.a.id, pair.b.id)}>No, son distintas (conservar ambas)</Button>
              <Button variant="ghost" onClick={onClose}>Cerrar</Button>
            </div>
          </>
        ) : (
          <div className="flex justify-end"><Button onClick={onClose}>Cerrar</Button></div>
        )}
      </DialogContent>
    </Dialog>
  );
}
