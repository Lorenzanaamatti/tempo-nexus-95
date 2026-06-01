import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
  type AvailabilityKind,
} from "@/components/availability-editor";

type Ev = {
  id: string;
  subject_id: string;
  subject_type: "person" | "production";
  kind: AvailabilityKind;
  start_date: string;
  end_date: string;
  title: string | null;
  note: string | null;
};

function today() { return new Date().toISOString().slice(0, 10); }

export function PersonEventsEditor({ personId }: { personId: string }) {
  return <EventsEditor subjectType="person" subjectId={personId} />;
}

export function ProductionEventsEditor({ productionId }: { productionId: string }) {
  return <EventsEditor subjectType="production" subjectId={productionId} />;
}

function EventsEditor({ subjectType, subjectId }: { subjectType: "person" | "production"; subjectId: string }) {
  const [rows, setRows] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function reload() {
    setLoading(true);
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .order("start_date");
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Ev[]);
  }

  useEffect(() => { void reload(); }, [subjectType, subjectId]);

  async function add() {
    setCreating(true);
    const t = today();
    const { error } = await supabase.from("calendar_events").insert({
      subject_type: subjectType,
      subject_id: subjectId,
      kind: subjectType === "production" ? "produccion" : "ocupado",
      start_date: t,
      end_date: t,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    await reload();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este evento?")) return;
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((p) => p.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-sm italic text-muted-foreground">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin eventos. Añade uno para que aparezca en el calendario.</p>
      ) : (
        rows.map((e) => <Row key={e.id} ev={e} onRemove={() => remove(e.id)} />)
      )}
      <Button size="sm" variant="outline" onClick={add} disabled={creating}>
        <Plus className="mr-1 h-3 w-3" /> {creating ? "Añadiendo…" : "Añadir evento"}
      </Button>
    </div>
  );
}

function Row({ ev, onRemove }: { ev: Ev; onRemove: () => void }) {
  const [kind, setKind] = useState<AvailabilityKind>(ev.kind);
  const [start, setStart] = useState(ev.start_date);
  const [end, setEnd] = useState(ev.end_date);
  const [title, setTitle] = useState(ev.title ?? "");
  const [note, setNote] = useState(ev.note ?? "");
  const [saving, setSaving] = useState(false);

  const dirty =
    kind !== ev.kind || start !== ev.start_date || end !== ev.end_date ||
    (title.trim() || null) !== (ev.title ?? null) ||
    (note.trim() || null) !== (ev.note ?? null);

  async function save() {
    if (end < start) return toast.error("Fin no puede ser anterior al inicio");
    setSaving(true);
    const { error } = await supabase.from("calendar_events").update({
      kind, start_date: start, end_date: end,
      title: title.trim() || null, note: note.trim() || null,
    }).eq("id", ev.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
  }

  return (
    <div className={`grid grid-cols-1 gap-2 rounded-sm border p-3 sm:grid-cols-[130px_130px_130px_1fr_auto] sm:items-end ${AVAILABILITY_COLORS[kind]}`}>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo</label>
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
      <div className="grid grid-cols-2 gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="bg-background" />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota" className="bg-background" />
      </div>
      <div className="flex items-center gap-1">
        {dirty && (
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}