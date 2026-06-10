import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

type Phase = {
  id: string;
  production_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
  position: number;
};

const STATUS = [
  { v: "planificada", l: "Planificada" },
  { v: "en_curso", l: "En curso" },
  { v: "completada", l: "Completada" },
  { v: "bloqueada", l: "Bloqueada" },
];

export function ProductionPhasesEditor({ productionId }: { productionId: string }) {
  const qc = useQueryClient();
  const key = ["production-phases", productionId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("production_phases")
        .select("*")
        .eq("production_id", productionId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Phase[];
    },
  });

  const [name, setName] = useState("");

  async function add() {
    const n = name.trim();
    if (!n) return;
    const pos = (data?.length ?? 0);
    const { error } = await (supabase as any).from("production_phases").insert({
      production_id: productionId, name: n, position: pos,
    });
    if (error) return toast.error(error.message);
    setName("");
    qc.invalidateQueries({ queryKey: key });
  }

  async function update(id: string, patch: Partial<Phase>) {
    const { error } = await (supabase as any).from("production_phases").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta fase?")) return;
    const { error } = await (supabase as any).from("production_phases").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }

  async function move(id: string, dir: -1 | 1) {
    const list = data ?? [];
    const idx = list.findIndex((p) => p.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= list.length) return;
    const a = list[idx], b = list[j];
    await Promise.all([
      (supabase as any).from("production_phases").update({ position: b.position }).eq("id", a.id),
      (supabase as any).from("production_phases").update({ position: a.position }).eq("id", b.id),
    ]);
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Nombre de la fase (ej: Composición, Grabación, Mezcla…)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Button size="sm" onClick={add}><Plus className="mr-1 h-4 w-4" />Añadir fase</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Sin fases. Añade las que necesites para esta producción.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((p, i) => (
            <li key={p.id} className="rounded-sm border border-border p-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === 0} onClick={() => move(p.id, -1)}><ArrowUp className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === data.length - 1} onClick={() => move(p.id, 1)}><ArrowDown className="h-3 w-3" /></Button>
                </div>
                <div className="flex-1 min-w-[180px]">
                  <Label className="smallcaps text-[10px] text-muted-foreground">Nombre</Label>
                  <Input value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} />
                </div>
                <div>
                  <Label className="smallcaps text-[10px] text-muted-foreground">Inicio</Label>
                  <Input type="date" value={p.start_date ?? ""} onChange={(e) => update(p.id, { start_date: e.target.value || null })} />
                </div>
                <div>
                  <Label className="smallcaps text-[10px] text-muted-foreground">Fin</Label>
                  <Input type="date" value={p.end_date ?? ""} onChange={(e) => update(p.id, { end_date: e.target.value || null })} />
                </div>
                <div className="w-40">
                  <Label className="smallcaps text-[10px] text-muted-foreground">Estado</Label>
                  <Select value={p.status} onValueChange={(v) => update(p.id, { status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                className="mt-2"
                rows={2}
                placeholder="Notas (opcional)"
                value={p.notes ?? ""}
                onChange={(e) => update(p.id, { notes: e.target.value || null })}
              />
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Cada fase con inicio y fin aparece automáticamente en el calendario operativo del compositor.
      </p>
    </div>
  );
}