import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { ProductionEventsEditor } from "@/components/person-events-editor";

export const Route = createFileRoute("/_authenticated/_admin/productions/$productionId")({
  component: ProductionEdit,
});

function ProductionEdit() {
  const { productionId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["production", productionId],
    queryFn: async () => {
      const { data, error } = await supabase.from("productions").select("*").eq("id", productionId).single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    title: "", kind: "", year: "" as string | number, production_company: "", director: "", platform: "", notes: "", color: "#6366f1",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        title: data.title ?? "",
        kind: data.kind ?? "",
        year: data.year ?? "",
        production_company: data.production_company ?? "",
        director: data.director ?? "",
        platform: data.platform ?? "",
        notes: data.notes ?? "",
        color: data.color ?? "#6366f1",
      });
    }
  }, [data]);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("productions").update({
      title: form.title,
      kind: form.kind || null,
      year: form.year === "" ? null : Number(form.year),
      production_company: form.production_company || null,
      director: form.director || null,
      platform: form.platform || null,
      notes: form.notes || null,
      color: form.color || null,
    }).eq("id", productionId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    refetch();
  }

  async function remove() {
    if (!confirm("¿Eliminar esta producción?")) return;
    const { error } = await supabase.from("productions").delete().eq("id", productionId);
    if (error) return toast.error(error.message);
    navigate({ to: "/productions" });
  }

  if (isLoading || !data) return <div className="p-10 font-display italic text-muted-foreground">Cargando…</div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between gap-6 border-b border-border pb-4">
        <div>
          <Link to="/productions" className="smallcaps text-xs text-muted-foreground hover:underline">← Producciones</Link>
          <h1 className="mt-1 font-display text-4xl italic">{form.title || "—"}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Tipo</Label><Input value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} placeholder="Película, Serie, Doc…" /></div>
        <div><Label>Año</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
        <div><Label>Productora</Label><Input value={form.production_company} onChange={(e) => setForm({ ...form, production_company: e.target.value })} /></div>
        <div><Label>Director</Label><Input value={form.director} onChange={(e) => setForm({ ...form, director: e.target.value })} /></div>
        <div><Label>Plataforma</Label><Input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} /></div>
        <div>
          <Label>Color en calendario</Label>
          <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-20 p-1" />
        </div>
        <div className="sm:col-span-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 font-display text-2xl italic">Personal asignado</h2>
        <AssignmentsEditor productionId={productionId} />
      </div>

      <div className="mt-10">
        <h2 className="mb-3 font-display text-2xl italic">Eventos en el calendario</h2>
        <ProductionEventsEditor productionId={productionId} />
      </div>
    </div>
  );
}

function AssignmentsEditor({ productionId }: { productionId: string }) {
  const qc = useQueryClient();
  const [personId, setPersonId] = useState<string>("");
  const [role, setRole] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const peopleQ = useQuery({
    queryKey: ["people-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("id, full_name, role").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const assignsQ = useQuery({
    queryKey: ["prod-assigns", productionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_assignments")
        .select("id, role_in_project, start_date, end_date, person_id, people(id, full_name, role)")
        .eq("production_id", productionId);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function add() {
    if (!personId) return;
    const { error } = await supabase.from("production_assignments").insert({
      production_id: productionId,
      person_id: personId,
      role_in_project: role || null,
      start_date: start || null,
      end_date: end || null,
    });
    if (error) return toast.error(error.message);
    setPersonId(""); setRole(""); setStart(""); setEnd("");
    qc.invalidateQueries({ queryKey: ["prod-assigns", productionId] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("production_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["prod-assigns", productionId] });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 rounded-sm border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_140px_140px_auto]">
        <Select value={personId} onValueChange={setPersonId}>
          <SelectTrigger><SelectValue placeholder="Persona…" /></SelectTrigger>
          <SelectContent>
            {(peopleQ.data ?? []).map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Rol (compositor, artista…)" />
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        <Button onClick={add} disabled={!personId}><Plus className="mr-1 h-4 w-4" /> Asignar</Button>
      </div>
      {(assignsQ.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin asignaciones.</p>
      ) : (
        <div className="divide-y divide-border rounded-sm border border-border">
          {(assignsQ.data ?? []).map((a: any) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="font-display italic">{a.people?.full_name}</span>
              {a.role_in_project && <span className="text-xs text-muted-foreground">{a.role_in_project}</span>}
              {(a.start_date || a.end_date) && (
                <span className="text-xs text-muted-foreground">{a.start_date ?? "?"} → {a.end_date ?? "?"}</span>
              )}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => remove(a.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}