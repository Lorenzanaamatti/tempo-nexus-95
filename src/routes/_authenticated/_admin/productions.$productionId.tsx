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
import { PRODUCTION_KIND_LABEL, PRODUCTION_STATUS_LABEL, type ProductionKind, type ProductionStatus } from "@/lib/production-constants";

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
    project_type: "" as ProductionKind | "",
    status: "" as ProductionStatus | "",
    partner: "",
    composer_id: "" as string,
    negotiator_person_id: "" as string,
    fee_amount: "" as string | number,
    ic_commission: "" as string | number,
    delivery_date: "",
    partner_company_id: "" as string,
    director_id: "" as string,
    platform_id: "" as string,
    production_director_person_id: "" as string,
    postproduction_supervisor_person_id: "" as string,
    music_supervisor_person_id: "" as string,
    other_responsibles: "",
    premiere_date: "",
  });
  const [saving, setSaving] = useState(false);

  const composersQ = useQuery({
    queryKey: ["composers-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("composers").select("id, full_name, artistic_name").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const peopleQ = useQuery({
    queryKey: ["people-ic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("id, full_name, role")
        .eq("role", "ic_team")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const companiesQ = useQuery({
    queryKey: ["production-companies-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("production_companies").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const directorsQ = useQuery({
    queryKey: ["directors-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("directors").select("id, full_name").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const platformsQ = useQuery({
    queryKey: ["platforms-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platforms").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const peopleAllQ = useQuery({
    queryKey: ["people-all-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("id, full_name, role").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (data) {
      const d = data as any;
      setForm({
        title: d.title ?? "",
        kind: d.kind ?? "",
        year: d.year ?? "",
        production_company: d.production_company ?? "",
        director: d.director ?? "",
        platform: d.platform ?? "",
        notes: d.notes ?? "",
        color: d.color ?? "#6366f1",
        project_type: d.project_type ?? "",
        status: d.status ?? "",
        partner: d.partner ?? "",
        composer_id: d.composer_id ?? "",
        negotiator_person_id: d.negotiator_person_id ?? "",
        fee_amount: d.fee_amount ?? "",
        ic_commission: d.ic_commission ?? "",
        delivery_date: d.delivery_date ?? "",
        partner_company_id: d.partner_company_id ?? "",
        director_id: d.director_id ?? "",
        platform_id: d.platform_id ?? "",
        production_director_person_id: d.production_director_person_id ?? "",
        postproduction_supervisor_person_id: d.postproduction_supervisor_person_id ?? "",
        music_supervisor_person_id: d.music_supervisor_person_id ?? "",
        other_responsibles: d.other_responsibles ?? "",
        premiere_date: d.premiere_date ?? "",
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
      project_type: (form.project_type || null) as any,
      status: (form.status || null) as any,
      partner: form.partner || null,
      composer_id: form.composer_id || null,
      negotiator_person_id: form.negotiator_person_id || null,
      fee_amount: form.fee_amount === "" ? null : Number(form.fee_amount),
      ic_commission: form.ic_commission === "" ? null : Number(form.ic_commission),
      delivery_date: form.delivery_date || null,
      partner_company_id: form.partner_company_id || null,
      director_id: form.director_id || null,
      platform_id: form.platform_id || null,
      production_director_person_id: form.production_director_person_id || null,
      postproduction_supervisor_person_id: form.postproduction_supervisor_person_id || null,
      music_supervisor_person_id: form.music_supervisor_person_id || null,
      other_responsibles: form.other_responsibles || null,
      premiere_date: form.premiere_date || null,
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

  if (isLoading || !data) return <div className="p-10 font-display text-muted-foreground">Cargando…</div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between gap-6 border-b border-border pb-4">
        <div>
          <Link to="/productions" className="smallcaps text-xs text-muted-foreground hover:underline">← Producciones</Link>
          <h1 className="mt-1 font-display text-4xl">{form.title || "—"}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div>
          <Label>Tipo</Label>
          <Select value={form.project_type || undefined} onValueChange={(v) => setForm({ ...form, project_type: v as ProductionKind })}>
            <SelectTrigger><SelectValue placeholder="Selecciona tipo…" /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRODUCTION_KIND_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Representado asignado</Label>
          <Select value={form.composer_id || undefined} onValueChange={(v) => setForm({ ...form, composer_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
            <SelectContent>
              {(composersQ.data ?? []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.artistic_name || c.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Partner / Productora</Label>
          <div className="flex gap-2">
            <Select value={form.partner_company_id || undefined} onValueChange={(v) => setForm({ ...form, partner_company_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona productora…" /></SelectTrigger>
              <SelectContent>
                {(companiesQ.data ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={async () => {
              const name = window.prompt("Nombre de la productora");
              if (!name?.trim()) return;
              const { data, error } = await supabase.from("production_companies").insert({ name: name.trim() }).select("id").single();
              if (error) return toast.error(error.message);
              setForm((f) => ({ ...f, partner_company_id: data.id }));
              qc.invalidateQueries({ queryKey: ["production-companies-mini"] });
            }}><Plus className="h-3 w-3" /></Button>
          </div>
          <Link to="/production-companies" className="mt-1 inline-block text-xs text-muted-foreground hover:underline">Gestionar productoras →</Link>
        </div>
        <div>
          <Label>Estado</Label>
          <Select value={form.status || undefined} onValueChange={(v) => setForm({ ...form, status: v as ProductionStatus })}>
            <SelectTrigger><SelectValue placeholder="Selecciona estado…" /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRODUCTION_STATUS_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Fee acordado (€)</Label><Input type="number" step="0.01" value={form.fee_amount} onChange={(e) => setForm({ ...form, fee_amount: e.target.value })} /></div>
        <div><Label>Comisión IC (€)</Label><Input type="number" step="0.01" value={form.ic_commission} onChange={(e) => setForm({ ...form, ic_commission: e.target.value })} /></div>
        <div><Label>Fecha de entrega</Label><Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} /></div>
        <div>
          <Label>Responsable de negociación</Label>
          <Select value={form.negotiator_person_id || undefined} onValueChange={(v) => setForm({ ...form, negotiator_person_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona persona…" /></SelectTrigger>
            <SelectContent>
              {(peopleQ.data ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Año</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
        <div><Label>Fecha de estreno</Label><Input type="date" value={form.premiere_date} onChange={(e) => setForm({ ...form, premiere_date: e.target.value })} /></div>
        <div>
          <Label>Director de Producción</Label>
          <Select value={form.production_director_person_id || undefined} onValueChange={(v) => setForm({ ...form, production_director_person_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona persona…" /></SelectTrigger>
            <SelectContent>
              {(peopleAllQ.data ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Responsable de Postproducción</Label>
          <Select value={form.postproduction_supervisor_person_id || undefined} onValueChange={(v) => setForm({ ...form, postproduction_supervisor_person_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona persona…" /></SelectTrigger>
            <SelectContent>
              {(peopleAllQ.data ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Supervisor Musical</Label>
          <Select value={form.music_supervisor_person_id || undefined} onValueChange={(v) => setForm({ ...form, music_supervisor_person_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona persona…" /></SelectTrigger>
            <SelectContent>
              {(peopleAllQ.data ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Director</Label>
          <div className="flex gap-2">
            <Select value={form.director_id || undefined} onValueChange={(v) => setForm({ ...form, director_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona director…" /></SelectTrigger>
              <SelectContent>
                {(directorsQ.data ?? []).map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={async () => {
              const name = window.prompt("Nombre del director");
              if (!name?.trim()) return;
              const { data, error } = await supabase.from("directors").insert({ full_name: name.trim() }).select("id").single();
              if (error) return toast.error(error.message);
              setForm((f) => ({ ...f, director_id: data.id }));
              qc.invalidateQueries({ queryKey: ["directors-mini"] });
            }}><Plus className="h-3 w-3" /></Button>
          </div>
          <Link to="/directors" className="mt-1 inline-block text-xs text-muted-foreground hover:underline">Gestionar directores →</Link>
        </div>
        <div>
          <Label>Plataforma</Label>
          <div className="flex gap-2">
            <Select value={form.platform_id || undefined} onValueChange={(v) => setForm({ ...form, platform_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona plataforma…" /></SelectTrigger>
              <SelectContent>
                {(platformsQ.data ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={async () => {
              const name = window.prompt("Nombre de la plataforma");
              if (!name?.trim()) return;
              const { data, error } = await supabase.from("platforms").insert({ name: name.trim() }).select("id").single();
              if (error) return toast.error(error.message);
              setForm((f) => ({ ...f, platform_id: data.id }));
              qc.invalidateQueries({ queryKey: ["platforms-mini"] });
            }}><Plus className="h-3 w-3" /></Button>
          </div>
          <Link to="/platforms" className="mt-1 inline-block text-xs text-muted-foreground hover:underline">Gestionar plataformas →</Link>
        </div>
        <div>
          <Label>Color en calendario</Label>
          <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-20 p-1" />
        </div>
        <div className="sm:col-span-2"><Label>Otros responsables</Label><Textarea value={form.other_responsibles} onChange={(e) => setForm({ ...form, other_responsibles: e.target.value })} rows={2} placeholder="Cualquier otro responsable o contacto relevante" /></div>
        <div className="sm:col-span-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 font-display text-2xl">Documentos asociados</h2>
        <ProductionDocumentsEditor productionId={productionId} />
      </div>

      <div className="mt-10">
        <h2 className="mb-3 font-display text-2xl">Personal asignado</h2>
        <AssignmentsEditor productionId={productionId} />
      </div>

      <div className="mt-10">
        <h2 className="mb-3 font-display text-2xl">Eventos en el calendario</h2>
        <ProductionEventsEditor productionId={productionId} />
      </div>
    </div>
  );
}

function ProductionDocumentsEditor({ productionId }: { productionId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  const docsQ = useQuery({
    queryKey: ["prod-docs", productionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_documents")
        .select("*")
        .eq("production_id", productionId)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function add() {
    if (!title.trim()) return;
    const { error } = await supabase.from("production_documents").insert({
      production_id: productionId,
      title: title.trim(),
      kind: kind || null,
      url: url || null,
      notes: notes || null,
      position: (docsQ.data?.length ?? 0),
    });
    if (error) return toast.error(error.message);
    setTitle(""); setKind(""); setUrl(""); setNotes("");
    qc.invalidateQueries({ queryKey: ["prod-docs", productionId] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("production_documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["prod-docs", productionId] });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 rounded-sm border border-dashed border-border p-3 sm:grid-cols-[1fr_140px_1fr_auto]">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
        <Input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="Tipo (contrato, brief…)" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" />
        <Button onClick={add} disabled={!title.trim()}><Plus className="mr-1 h-4 w-4" /> Añadir</Button>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)" rows={2} className="sm:col-span-4" />
      </div>
      {(docsQ.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin documentos.</p>
      ) : (
        <div className="divide-y divide-border rounded-sm border border-border">
          {(docsQ.data ?? []).map((d: any) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="font-display">{d.title}</span>
              {d.kind && <span className="text-xs text-muted-foreground">{d.kind}</span>}
              {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">abrir</a>}
              {d.notes && <span className="text-xs text-muted-foreground">— {d.notes}</span>}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => remove(d.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      )}
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
              <span className="font-display">{a.people?.full_name}</span>
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