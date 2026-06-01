import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type AvailabilityKind = "libre" | "ocupado" | "vacaciones" | "personal" | "produccion";

export const AVAILABILITY_LABELS: Record<AvailabilityKind, string> = {
  libre: "Libre",
  ocupado: "Ocupado",
  vacaciones: "Vacaciones",
  personal: "Personal",
  produccion: "Producción",
};

export const AVAILABILITY_COLORS: Record<AvailabilityKind, string> = {
  libre: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  ocupado: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40",
  vacaciones: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
  personal: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40",
  produccion: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40",
};

type Period = {
  id: string;
  composer_id: string;
  kind: AvailabilityKind;
  start_date: string;
  end_date: string;
  note: string | null;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AvailabilityEditor({ composerId }: { composerId: string }) {
  const [rows, setRows] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function reload() {
    setLoading(true);
    const { data, error } = await supabase
      .from("composer_availability")
      .select("*")
      .eq("composer_id", composerId)
      .order("start_date", { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Period[]);
  }

  useEffect(() => { void reload(); }, [composerId]);

  async function addPeriod() {
    setCreating(true);
    const start = todayIso();
    const { error } = await supabase.from("composer_availability").insert({
      composer_id: composerId,
      kind: "ocupado",
      start_date: start,
      end_date: start,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    await reload();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este periodo?")) return;
    const { error } = await supabase.from("composer_availability").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-sm italic text-muted-foreground">Cargando periodos…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin periodos. Pulsa “Añadir periodo” para registrar disponibilidad.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <PeriodRow key={p.id} period={p} onRemove={() => remove(p.id)} />
          ))}
        </div>
      )}
      <Button size="sm" variant="outline" onClick={addPeriod} disabled={creating}>
        <Plus className="mr-1 h-3 w-3" /> {creating ? "Añadiendo…" : "Añadir periodo"}
      </Button>
    </div>
  );
}

function PeriodRow({ period, onRemove }: { period: Period; onRemove: () => void }) {
  const [kind, setKind] = useState<AvailabilityKind>(period.kind);
  const [start, setStart] = useState(period.start_date);
  const [end, setEnd] = useState(period.end_date);
  const [note, setNote] = useState(period.note ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setKind(period.kind);
    setStart(period.start_date);
    setEnd(period.end_date);
    setNote(period.note ?? "");
  }, [period.id, period.kind, period.start_date, period.end_date, period.note]);

  const dirty =
    kind !== period.kind ||
    start !== period.start_date ||
    end !== period.end_date ||
    (note.trim() === "" ? null : note) !== (period.note ?? null);

  async function save() {
    if (end < start) {
      toast.error("La fecha de fin no puede ser anterior al inicio");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("composer_availability")
      .update({
        kind,
        start_date: start,
        end_date: end,
        note: note.trim() === "" ? null : note,
      })
      .eq("id", period.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Periodo guardado");
  }

  return (
    <div className={`grid grid-cols-1 gap-2 rounded-sm border p-3 sm:grid-cols-[140px_140px_140px_1fr_auto] sm:items-end ${AVAILABILITY_COLORS[kind]}`}>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Estado</label>
        <Select value={kind} onValueChange={(v) => setKind(v as AvailabilityKind)}>
          <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(AVAILABILITY_LABELS) as AvailabilityKind[]).map((k) => (
              <SelectItem key={k} value={k}>{AVAILABILITY_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Inicio</label>
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="bg-background" />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fin</label>
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-background" />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nota</label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" className="bg-background" />
      </div>
      <div className="flex items-center gap-1">
        {dirty && (
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onRemove} aria-label="Eliminar">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}