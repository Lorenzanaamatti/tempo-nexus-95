import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatableSelect } from "@/components/creatable-select";
import { toast } from "sonner";
import { Plus, Upload } from "lucide-react";
import {
  JSON_EXAMPLE,
  OPP_GENRE_LABEL,
  OPP_PHASE_LABEL,
  OPP_PRIORITY_LABEL,
  OPP_TYPE_LABEL,
  parseBudgetRange,
  parseCountries,
  parseOpportunityJson,
  type OppPhase,
  type OppPriority,
  type OppProductionGenre,
  type OppProductionType,
  type ParsedOpportunity,
} from "@/lib/opportunity-production";
import { findOrCreateCompany, findOrCreateDirector, upsertProductionOpportunity, type IntakeOutcome } from "@/lib/opportunity-intake";
import { formatEUR0 } from "@/lib/money";

const EMPTY = {
  title: "",
  titulo_alt: "",
  tipo_produccion: "" as OppProductionType | "",
  genero_produccion: "" as OppProductionGenre | "",
  paises: "",
  presupuesto_texto: "",
  financiacion_publica: "",
  fase: "" as OppPhase | "",
  fecha_rodaje: "",
  fecha_estreno: "",
  productora_aie: "",
  reparto: "",
  fuente_url: "",
  detected_date: "",
  origen: "",
  notes: "",
  prioridad: "" as OppPriority | "",
  responsible_person_id: "",
};

export function OpportunityIntakeDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [companyId, setCompanyId] = useState("");
  const [companyLabel, setCompanyLabel] = useState("");
  const [directorId, setDirectorId] = useState("");
  const [directorLabel, setDirectorLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const [json, setJson] = useState("");
  const [preview, setPreview] = useState<{ rows: ParsedOpportunity[]; errors: string[] } | null>(null);
  const [results, setResults] = useState<IntakeOutcome[] | null>(null);

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
  const peopleICQ = useQuery({
    queryKey: ["people-ic"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ic_team").select("id, full_name").eq("role", "ic_team").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  function reset() {
    setForm({ ...EMPTY });
    setCompanyId(""); setCompanyLabel(""); setDirectorId(""); setDirectorLabel("");
    setJson(""); setPreview(null); setResults(null);
  }

  async function saveManual() {
    if (!form.title.trim()) return toast.error("El título es obligatorio");
    setSaving(true);
    const range = parseBudgetRange(form.presupuesto_texto);
    const row: ParsedOpportunity = {
      title: form.title,
      titulo_alt: form.titulo_alt || null,
      tipo_produccion: (form.tipo_produccion || null) as OppProductionType | null,
      genero_produccion: (form.genero_produccion || null) as OppProductionGenre | null,
      paises: parseCountries(form.paises),
      presupuesto_min: range.min,
      presupuesto_max: range.max,
      presupuesto_texto: form.presupuesto_texto || null,
      financiacion_publica: form.financiacion_publica || null,
      fase: (form.fase || null) as OppPhase | null,
      fecha_rodaje: form.fecha_rodaje || null,
      fecha_estreno: form.fecha_estreno || null,
      productoraName: companyId ? null : companyLabel || null,
      productora_aie: form.productora_aie || null,
      directorName: directorId ? null : directorLabel || null,
      reparto: form.reparto || null,
      fuente_url: form.fuente_url || null,
      detected_date: form.detected_date || null,
      origen: form.origen || null,
      notes: form.notes || null,
      prioridad: (form.prioridad || null) as OppPriority | null,
    };
    const outcome = await upsertProductionOpportunity(row);
    if (outcome.action === "error") {
      setSaving(false);
      return toast.error(outcome.message ?? "No se pudo guardar");
    }
    // Vínculos elegidos explícitamente en el formulario.
    const patch: Record<string, unknown> = {};
    if (companyId) { patch.partner_company_id = companyId; patch.partner_name = null; }
    if (directorId) { patch.director_id = directorId; patch.director_text = null; }
    if (form.responsible_person_id) patch.responsible_person_id = form.responsible_person_id;
    if (Object.keys(patch).length && outcome.id) {
      await supabase.from("opportunities").update(patch as never).eq("id", outcome.id);
    }
    setSaving(false);
    toast.success(outcome.action === "creada" ? "Oportunidad creada" : "Oportunidad actualizada (ya existía)");
    qc.invalidateQueries({ queryKey: ["opportunities"] });
    qc.invalidateQueries({ queryKey: ["production-companies-mini"] });
    qc.invalidateQueries({ queryKey: ["directors-mini"] });
    reset();
    setOpen(false);
  }

  async function importJson() {
    if (!preview?.rows.length) return;
    setSaving(true);
    const out: IntakeOutcome[] = [];
    for (const row of preview.rows) {
      out.push(await upsertProductionOpportunity(row));
    }
    setSaving(false);
    setResults(out);
    qc.invalidateQueries({ queryKey: ["opportunities"] });
    qc.invalidateQueries({ queryKey: ["production-companies-mini"] });
    qc.invalidateQueries({ queryKey: ["directors-mini"] });
    const ok = out.filter((o) => o.action !== "error").length;
    toast.success(`${ok} de ${out.length} oportunidades procesadas`);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="rounded-sm"><Plus className="mr-1 h-4 w-4" /> Nueva oportunidad</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Ingestar oportunidad de producción</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="manual">
          <TabsList>
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="json">Desde JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-4 space-y-6">
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Título del proyecto *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Título alternativo</Label>
                <Input value={form.titulo_alt} onChange={(e) => setForm({ ...form, titulo_alt: e.target.value })} placeholder="Título internacional o de trabajo" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo_produccion || undefined} onValueChange={(v) => setForm({ ...form, tipo_produccion: v as OppProductionType })}>
                  <SelectTrigger><SelectValue placeholder="Tipo…" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(OPP_TYPE_LABEL) as OppProductionType[]).map((k) => (
                      <SelectItem key={k} value={k}>{OPP_TYPE_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Género</Label>
                <Select value={form.genero_produccion || undefined} onValueChange={(v) => setForm({ ...form, genero_produccion: v as OppProductionGenre })}>
                  <SelectTrigger><SelectValue placeholder="Género…" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(OPP_GENRE_LABEL) as OppProductionGenre[]).map((k) => (
                      <SelectItem key={k} value={k}>{OPP_GENRE_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>País(es)</Label>
                <Input value={form.paises} onChange={(e) => setForm({ ...form, paises: e.target.value })} placeholder="España / Francia" />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Presupuesto (texto original)</Label>
                <Input value={form.presupuesto_texto} onChange={(e) => setForm({ ...form, presupuesto_texto: e.target.value })} placeholder="6-8M, est. €20M+…" />
                {(() => {
                  const r = parseBudgetRange(form.presupuesto_texto);
                  return r.min || r.max ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Rango: {r.min ? formatEUR0(r.min) : "—"} – {r.max ? formatEUR0(r.max) : "abierto"}
                    </p>
                  ) : null;
                })()}
              </div>
              <div>
                <Label>Financiación pública</Label>
                <Input value={form.financiacion_publica} onChange={(e) => setForm({ ...form, financiacion_publica: e.target.value })} placeholder="ICAA 815.600€…" />
              </div>
              <div>
                <Label>Fase</Label>
                <Select value={form.fase || undefined} onValueChange={(v) => setForm({ ...form, fase: v as OppPhase })}>
                  <SelectTrigger><SelectValue placeholder="Fase…" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(OPP_PHASE_LABEL) as OppPhase[]).map((k) => (
                      <SelectItem key={k} value={k}>{OPP_PHASE_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridad IC</Label>
                <Select value={form.prioridad || undefined} onValueChange={(v) => setForm({ ...form, prioridad: v as OppPriority })}>
                  <SelectTrigger><SelectValue placeholder="Prioridad…" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(OPP_PRIORITY_LABEL) as OppPriority[]).map((k) => (
                      <SelectItem key={k} value={k}>{OPP_PRIORITY_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha de rodaje</Label>
                <Input value={form.fecha_rodaje} onChange={(e) => setForm({ ...form, fecha_rodaje: e.target.value })} placeholder="Otoño 2026" />
              </div>
              <div>
                <Label>Fecha de estreno</Label>
                <Input value={form.fecha_estreno} onChange={(e) => setForm({ ...form, fecha_estreno: e.target.value })} placeholder="2027" />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Productora (CRM)</Label>
                <CreatableSelect
                  value={companyLabel}
                  options={(companiesQ.data ?? []).map((c: any) => ({ id: c.id, label: c.name }))}
                  placeholder="Busca o crea la productora…"
                  onPick={(id, label) => { setCompanyId(id); setCompanyLabel(label); }}
                  onCreate={async (label) => {
                    try {
                      const id = await findOrCreateCompany(label);
                      qc.invalidateQueries({ queryKey: ["production-companies-mini"] });
                      toast.success("Productora añadida al CRM");
                      return id;
                    } catch (e: any) { toast.error(e.message); return null; }
                  }}
                  createLabel="Crear productora en el CRM"
                />
              </div>
              <div>
                <Label>Director (CRM)</Label>
                <CreatableSelect
                  value={directorLabel}
                  options={(directorsQ.data ?? []).map((d: any) => ({ id: d.id, label: d.full_name }))}
                  placeholder="Busca o crea el director…"
                  onPick={(id, label) => { setDirectorId(id); setDirectorLabel(label); }}
                  onCreate={async (label) => {
                    try {
                      const id = await findOrCreateDirector(label);
                      qc.invalidateQueries({ queryKey: ["directors-mini"] });
                      toast.success("Director añadido al CRM");
                      return id;
                    } catch (e: any) { toast.error(e.message); return null; }
                  }}
                  createLabel="Crear director en el CRM"
                />
              </div>
              <div>
                <Label>AIE</Label>
                <Input value={form.productora_aie} onChange={(e) => setForm({ ...form, productora_aie: e.target.value })} placeholder="Película X A.I.E." />
              </div>
              <div>
                <Label>Reparto</Label>
                <Input value={form.reparto} onChange={(e) => setForm({ ...form, reparto: e.target.value })} />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Fuente (URL)</Label>
                <Input value={form.fuente_url} onChange={(e) => setForm({ ...form, fuente_url: e.target.value })} placeholder="https://…" />
              </div>
              <div>
                <Label>Origen</Label>
                <Input value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })} placeholder="Report Vanessa Garde" />
              </div>
              <div>
                <Label>Fecha de detección</Label>
                <Input type="date" value={form.detected_date} onChange={(e) => setForm({ ...form, detected_date: e.target.value })} />
              </div>
              <div>
                <Label>Responsable IC</Label>
                <Select value={form.responsible_person_id || undefined} onValueChange={(v) => setForm({ ...form, responsible_person_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Equipo IC…" /></SelectTrigger>
                  <SelectContent>
                    {(peopleICQ.data ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Nota</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </section>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={saveManual} disabled={saving}>Guardar oportunidad</Button>
            </div>
          </TabsContent>

          <TabsContent value="json" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Pega un objeto o una lista de proyectos. Se traducen los formatos del report («película ficción», «6-8M», «España/Francia»)
              y se evita duplicar: si el título y el director ya existen, la ficha se actualiza.
            </p>
            <Textarea
              rows={10}
              value={json}
              onChange={(e) => { setJson(e.target.value); setPreview(null); setResults(null); }}
              placeholder={JSON_EXAMPLE}
              className="font-mono text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreview(parseOpportunityJson(json))} disabled={!json.trim()}>
                Previsualizar
              </Button>
              <Button onClick={importJson} disabled={!preview?.rows.length || saving}>
                <Upload className="mr-1 h-4 w-4" /> Importar {preview?.rows.length ? `(${preview.rows.length})` : ""}
              </Button>
            </div>

            {preview?.errors.length ? (
              <ul className="rounded-sm border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                {preview.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            ) : null}

            {preview?.rows.length ? (
              <div className="overflow-x-auto rounded-sm border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-2 py-1.5 smallcaps">Título</th>
                      <th className="px-2 py-1.5 smallcaps">Tipo</th>
                      <th className="px-2 py-1.5 smallcaps">País</th>
                      <th className="px-2 py-1.5 smallcaps">Presupuesto</th>
                      <th className="px-2 py-1.5 smallcaps">Fase</th>
                      <th className="px-2 py-1.5 smallcaps">Productora</th>
                      <th className="px-2 py-1.5 smallcaps">Director</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5">{r.title}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.tipo_produccion ? OPP_TYPE_LABEL[r.tipo_produccion] : "—"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.paises.join(" / ") || "—"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {r.presupuesto_min || r.presupuesto_max
                            ? `${r.presupuesto_min ? formatEUR0(r.presupuesto_min) : "—"} – ${r.presupuesto_max ? formatEUR0(r.presupuesto_max) : "abierto"}`
                            : r.presupuesto_texto || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.fase ? OPP_PHASE_LABEL[r.fase] : "—"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.productoraName || "—"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{r.directorName || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {results?.length ? (
              <ul className="space-y-1 rounded-sm border border-border p-3 text-xs">
                {results.map((r, i) => (
                  <li key={i} className={r.action === "error" ? "text-destructive" : "text-muted-foreground"}>
                    <span className="font-medium text-foreground">{r.title}</span> · {r.action}
                    {r.message ? ` — ${r.message}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
