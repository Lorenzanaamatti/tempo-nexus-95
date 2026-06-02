import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trash2, Plus, Check } from "lucide-react";
import { SaveButton } from "@/components/save-button";
import { formatEUR, formatNumberEs, parseAmount } from "@/lib/money";
import { OPPORTUNITY_STATUS_LABEL, OPPORTUNITY_STATUS_TONE, type OpportunityStatus } from "@/lib/opportunity-constants";
import { EntityActionsEditor } from "@/components/entity-actions-editor";
import { EntityDocumentsEditor } from "@/components/entity-documents-editor";

export const Route = createFileRoute("/_authenticated/_admin/opportunities/$opportunityId")({
  component: OpportunityDetail,
});

function OpportunityDetail() {
  const { opportunityId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const oppQ = useQuery({
    queryKey: ["opportunity", opportunityId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("opportunities").select("*").eq("id", opportunityId).single();
      if (error) throw error;
      return data;
    },
  });

  const candidatesQ = useQuery({
    queryKey: ["opportunity-candidates", opportunityId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("opportunity_candidates")
        .select("id, note, composer:composers(id, full_name, artistic_name)")
        .eq("opportunity_id", opportunityId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const composersQ = useQuery({
    queryKey: ["composers-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("composers").select("id, full_name, artistic_name").order("full_name");
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

  const peopleICQ = useQuery({
    queryKey: ["people-ic"],
    queryFn: async () => {
      const { data, error } = await supabase.from("people").select("id, full_name").eq("role", "ic_team").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    title: "",
    partner_company_id: "" as string,
    partner_name: "",
    statuses: [] as OpportunityStatus[],
    probability_pct: "" as string | number,
    estimated_value: "" as string | number,
    responsible_person_id: "" as string,
    notes: "",
    detected_date: "" as string,
    expected_close_date: "" as string,
    last_contact_date: "" as string,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (oppQ.data) {
      const d: any = oppQ.data;
      setForm({
        title: d.title ?? "",
        partner_company_id: d.partner_company_id ?? "",
        partner_name: d.partner_name ?? "",
        statuses: (d.statuses ?? []) as OpportunityStatus[],
        probability_pct: d.probability_pct ?? "",
        estimated_value: d.estimated_value ?? "",
        responsible_person_id: d.responsible_person_id ?? "",
        notes: d.notes ?? "",
        detected_date: d.detected_date ?? "",
        expected_close_date: d.expected_close_date ?? "",
        last_contact_date: d.last_contact_date ?? "",
      });
    }
  }, [oppQ.data]);

  async function save() {
    setSaving(true);
    const { error } = await (supabase as any).from("opportunities").update({
      title: form.title,
      partner_company_id: form.partner_company_id || null,
      partner_name: form.partner_name || null,
      statuses: form.statuses.length ? form.statuses : ["identificado"],
      probability_pct: form.probability_pct === "" ? null : Number(form.probability_pct),
      estimated_value: form.estimated_value === "" ? null : Number(form.estimated_value),
      responsible_person_id: form.responsible_person_id || null,
      notes: form.notes || null,
      detected_date: form.detected_date || null,
      expected_close_date: form.expected_close_date || null,
      last_contact_date: form.last_contact_date || null,
    }).eq("id", opportunityId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    qc.invalidateQueries({ queryKey: ["opportunity", opportunityId] });
    qc.invalidateQueries({ queryKey: ["opportunities"] });
  }

  async function remove() {
    if (!confirm("¿Eliminar esta oportunidad?")) return;
    const { error } = await (supabase as any).from("opportunities").delete().eq("id", opportunityId);
    if (error) return toast.error(error.message);
    navigate({ to: "/opportunities" });
  }

  function toggleStatus(s: OpportunityStatus) {
    setForm((f) => ({
      ...f,
      statuses: f.statuses.includes(s) ? f.statuses.filter((x) => x !== s) : [...f.statuses, s],
    }));
  }

  // candidates
  const [newCandidate, setNewCandidate] = useState("");
  async function addCandidate() {
    if (!newCandidate) return;
    const { error } = await (supabase as any).from("opportunity_candidates").insert({ opportunity_id: opportunityId, composer_id: newCandidate });
    if (error) return toast.error(error.message);
    setNewCandidate("");
    qc.invalidateQueries({ queryKey: ["opportunity-candidates", opportunityId] });
    qc.invalidateQueries({ queryKey: ["opportunities"] });
  }
  async function removeCandidate(id: string) {
    const { error } = await (supabase as any).from("opportunity_candidates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["opportunity-candidates", opportunityId] });
    qc.invalidateQueries({ queryKey: ["opportunities"] });
  }

  if (oppQ.isLoading || !oppQ.data) return <div className="p-10 font-display text-muted-foreground">Cargando…</div>;

  const candidates = candidatesQ.data ?? [];
  const candidateIds = new Set(candidates.map((c: any) => c.composer?.id));
  const availableComposers = (composersQ.data ?? []).filter((c: any) => !candidateIds.has(c.id));

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between gap-6 border-b border-border pb-4">
        <div>
          <Link to="/opportunities" className="smallcaps text-xs text-muted-foreground hover:underline">← Oportunidades</Link>
          <h1 className="mt-1 font-display text-4xl">{form.title || "—"}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Oportunidad detectada</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <Label>Partner interesado (productora del CRM)</Label>
          <Select value={form.partner_company_id || undefined} onValueChange={(v) => setForm({ ...form, partner_company_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona productora…" /></SelectTrigger>
            <SelectContent>
              {(companiesQ.data ?? []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Partner (texto libre si no está en el CRM)</Label>
          <Input value={form.partner_name} onChange={(e) => setForm({ ...form, partner_name: e.target.value })} placeholder="Nombre del partner" />
        </div>
        <div>
          <Label>Probabilidad (%)</Label>
          <Input type="number" min={0} max={100} step="1" value={form.probability_pct} onChange={(e) => setForm({ ...form, probability_pct: e.target.value })} placeholder="0–100" />
        </div>
        <div>
          <Label>Valor estimado (€)</Label>
          <Input
            key={`val-${form.estimated_value}`}
            defaultValue={form.estimated_value !== "" ? formatNumberEs(Number(form.estimated_value)) : ""}
            placeholder="0,00"
            onBlur={(e) => {
              const v = parseAmount(e.target.value);
              setForm({ ...form, estimated_value: v == null ? "" : v });
            }}
          />
          {form.estimated_value !== "" && <p className="mt-1 text-xs text-muted-foreground">{formatEUR(Number(form.estimated_value))}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label>Responsable</Label>
          <Select value={form.responsible_person_id || undefined} onValueChange={(v) => setForm({ ...form, responsible_person_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona responsable (Equipo IC)…" /></SelectTrigger>
            <SelectContent>
              {(peopleICQ.data ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Fecha de detección</Label>
          <Input type="date" value={form.detected_date} onChange={(e) => setForm({ ...form, detected_date: e.target.value })} />
        </div>
        <div>
          <Label>Último contacto</Label>
          <Input type="date" value={form.last_contact_date} onChange={(e) => setForm({ ...form, last_contact_date: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Cierre estimado</Label>
          <Input type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Estado (multi-opción)</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(OPPORTUNITY_STATUS_LABEL) as OpportunityStatus[]).map((s) => {
              const active = form.statuses.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={`rounded-sm border px-3 py-1.5 text-xs smallcaps transition ${
                    active ? `${OPPORTUNITY_STATUS_TONE[s]} border-transparent` : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {active && <Check className="mr-1 inline h-3 w-3" />}
                  {OPPORTUNITY_STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label>Notas</Label>
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-2xl">Representados candidatos</h2>
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-sm border border-dashed border-border p-4">
          <div className="flex-1 min-w-[240px]">
            <Label className="text-xs">Añadir candidato del roster</Label>
            <Select value={newCandidate || undefined} onValueChange={setNewCandidate}>
              <SelectTrigger><SelectValue placeholder="Selecciona compositor/representado…" /></SelectTrigger>
              <SelectContent>
                {availableComposers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.artistic_name || c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addCandidate} disabled={!newCandidate}><Plus className="mr-1 h-4 w-4" /> Añadir</Button>
        </div>
        {!candidates.length ? (
          <p className="text-sm text-muted-foreground">Sin candidatos aún.</p>
        ) : (
          <ul className="divide-y divide-border rounded-sm border border-border">
            {candidates.map((c: any) => (
              <li key={c.id} className="flex items-center justify-between px-3 py-2">
                <span className="font-display">{c.composer?.artistic_name || c.composer?.full_name || "—"}</span>
                <Button variant="ghost" size="sm" onClick={() => removeCandidate(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <EntityActionsEditor subjectType="opportunity" subjectId={opportunityId} title="Próximas acciones" />
      </section>

      <section className="mt-10">
        <EntityDocumentsEditor subjectType="opportunity" subjectId={opportunityId} />
      </section>
      <SaveButton floating onClick={save} saving={saving} />
    </div>
  );
}