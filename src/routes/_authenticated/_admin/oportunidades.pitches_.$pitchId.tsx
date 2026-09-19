import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ListSkeleton } from "@/components/list-states";
import { CreatableSelect } from "@/components/creatable-select";
import { findOrCreateDirector } from "@/lib/opportunity-intake";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PITCH_ESTADOS, PITCH_TIPOS } from "@/lib/pitches";
import { PitchCloseActions } from "@/components/pitch-close-actions";
import {
  OPP_GENRE_LABEL,
  OPP_PHASE_LABEL,
  OPP_PRIORITY_LABEL,
  OPP_TYPE_LABEL,
  parseBudgetRange,
  parseCountries,
  type OppPhase,
  type OppPriority,
  type OppProductionGenre,
  type OppProductionType,
} from "@/lib/opportunity-production";

const db = supabase as any;

const EMPTY_PROJECT = {
  titulo_alt: "",
  tipo_produccion: "",
  genero_produccion: "",
  paises: "",
  presupuesto_texto: "",
  financiacion_publica: "",
  fase: "",
  fecha_rodaje: "",
  fecha_estreno: "",
  productora_aie: "",
  director_id: "",
  director_text: "",
  reparto: "",
  fuente_url: "",
  origen: "",
  prioridad: "",
  detected_date: "",
  partner_company_id: "",
  partner_name: "",
  notes: "",
};

function PitchDetail() {
  const { pitchId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({});
  const [proj, setProj] = useState<Record<string, any>>({ ...EMPTY_PROJECT });
  const [composerIds, setComposerIds] = useState<string[]>([]);
  const [directorLabel, setDirectorLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const pitchQ = useQuery({
    queryKey: ["pitch", pitchId],
    queryFn: async () => {
      const [{ data, error }, { data: links }] = await Promise.all([
        db.from("oportunidades_pitches").select("*").eq("id", pitchId).maybeSingle(),
        db.from("oportunidades_pitch_composers").select("composer_id").eq("pitch_id", pitchId),
      ]);
      if (error) throw error;
      return { pitch: data, composerIds: (links ?? []).map((l: any) => l.composer_id) as string[] };
    },
  });

  const oportunidadId: string | null = pitchQ.data?.pitch?.oportunidad_id ?? null;

  const origenQ = useQuery({
    queryKey: ["pitch-origen", oportunidadId],
    enabled: !!oportunidadId,
    queryFn: async () => {
      const { data, error } = await db.from("opportunities").select("*").eq("id", oportunidadId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const composersQ = useQuery({
    queryKey: ["lookup-composers"],
    queryFn: async () => {
      const { data, error } = await db.from("composers").select("id, full_name").order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });
  const partnersQ = useQuery({
    queryKey: ["lookup-partners-institucion"],
    queryFn: async () => {
      const { data, error } = await db.from("partners").select("id, nombre").order("nombre");
      if (error) throw error;
      return (data ?? []) as { id: string; nombre: string }[];
    },
  });
  const peopleQ = useQuery({
    queryKey: ["people-ic"],
    queryFn: async () => {
      const { data, error } = await db.from("ic_team").select("id, full_name").eq("role", "ic_team").order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });
  const companiesQ = useQuery({
    queryKey: ["production-companies-mini"],
    queryFn: async () => {
      const { data, error } = await db.from("production_companies").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
  const directorsQ = useQuery({
    queryKey: ["directors-mini"],
    queryFn: async () => {
      const { data, error } = await db.from("directors").select("id, full_name").order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });

  useEffect(() => {
    if (!pitchQ.data?.pitch) return;
    setForm(pitchQ.data.pitch);
    setComposerIds(pitchQ.data.composerIds);
  }, [pitchQ.data]);

  useEffect(() => {
    const d = origenQ.data;
    if (!d) return;
    setProj({
      titulo_alt: d.titulo_alt ?? "",
      tipo_produccion: d.tipo_produccion ?? "",
      genero_produccion: d.genero_produccion ?? "",
      paises: (d.paises ?? []).join(" / "),
      presupuesto_texto: d.presupuesto_texto ?? "",
      financiacion_publica: d.financiacion_publica ?? "",
      fase: d.fase ?? "",
      fecha_rodaje: d.fecha_rodaje ?? "",
      fecha_estreno: d.fecha_estreno ?? "",
      productora_aie: d.productora_aie ?? "",
      director_id: d.director_id ?? "",
      director_text: d.director_text ?? "",
      reparto: d.reparto ?? "",
      fuente_url: d.fuente_url ?? "",
      origen: d.origen ?? "",
      prioridad: d.prioridad ?? "",
      detected_date: d.detected_date ?? "",
      partner_company_id: d.partner_company_id ?? "",
      partner_name: d.partner_name ?? "",
      notes: d.notes ?? "",
    });
  }, [origenQ.data]);

  useEffect(() => {
    const d = origenQ.data;
    if (!d) return;
    if (d.director_id) {
      const found = (directorsQ.data ?? []).find((x) => x.id === d.director_id);
      if (found) setDirectorLabel(found.full_name);
    } else if (d.director_text) {
      setDirectorLabel(d.director_text);
    }
  }, [origenQ.data, directorsQ.data]);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const setP = (k: string, v: any) => setProj((p) => ({ ...p, [k]: v }));

  async function save() {
    const titulo = String(form.titulo ?? "").trim();
    if (!titulo) return toast.error("El título es obligatorio");
    setSaving(true);

    const payload = {
      titulo,
      partner_destinatario: form.partner_destinatario || null,
      proyecto_vinculado: form.proyecto_vinculado || null,
      tipo: form.tipo || "Música original",
      fecha_pitch: form.fecha_pitch || null,
      estado: form.estado || "En preparación",
      presupuesto_estimado:
        form.presupuesto_estimado === "" || form.presupuesto_estimado == null ? null : Number(form.presupuesto_estimado),
      fecha_seguimiento: form.fecha_seguimiento || null,
      responsable_id: form.responsable_id || null,
      notas: form.notas || null,
    };
    const { data: updated, error } = await db.from("oportunidades_pitches").update(payload).eq("id", pitchId).select("id");
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }
    if (!updated?.length) {
      setSaving(false);
      return toast.error("No se guardó ningún cambio: revisa tus permisos.");
    }

    await db.from("oportunidades_pitch_composers").delete().eq("pitch_id", pitchId);
    if (composerIds.length) {
      await db.from("oportunidades_pitch_composers").insert(composerIds.map((c) => ({ pitch_id: pitchId, composer_id: c })));
    }

    if (oportunidadId) {
      const range = parseBudgetRange(proj.presupuesto_texto);
      const { error: oppErr } = await db
        .from("opportunities")
        .update({
          title: titulo,
          titulo_alt: proj.titulo_alt || null,
          tipo_produccion: proj.tipo_produccion || null,
          genero_produccion: proj.genero_produccion || null,
          paises: parseCountries(proj.paises),
          presupuesto_texto: proj.presupuesto_texto || null,
          presupuesto_min: range.min,
          presupuesto_max: range.max,
          financiacion_publica: proj.financiacion_publica || null,
          fase: proj.fase || null,
          fecha_rodaje: proj.fecha_rodaje || null,
          fecha_estreno: proj.fecha_estreno || null,
          productora_aie: proj.productora_aie || null,
          director_id: proj.director_id || null,
          director_text: proj.director_id ? null : proj.director_text || null,
          reparto: proj.reparto || null,
          fuente_url: proj.fuente_url || null,
          origen: proj.origen || null,
          prioridad: proj.prioridad || null,
          detected_date: proj.detected_date || null,
          partner_company_id: proj.partner_company_id || null,
          partner_name: proj.partner_name || null,
          notes: proj.notes || null,
        })
        .eq("id", oportunidadId);
      if (oppErr) {
        setSaving(false);
        return toast.error(oppErr.message);
      }
    }

    setSaving(false);
    toast.success("Pitch guardado");
    qc.invalidateQueries({ queryKey: ["pitches"] });
    qc.invalidateQueries({ queryKey: ["pitch", pitchId] });
    qc.invalidateQueries({ queryKey: ["pitch-origen", oportunidadId] });
    qc.invalidateQueries({ queryKey: ["opportunities"] });
  }

  async function remove() {
    const { error } = await db.from("oportunidades_pitches").delete().eq("id", pitchId);
    if (error) return toast.error(error.message);
    toast.success("Pitch eliminado");
    qc.invalidateQueries({ queryKey: ["pitches"] });
    navigate({ to: "/oportunidades/pitches" });
  }

  if (pitchQ.isLoading) return <div className="mx-auto max-w-3xl px-6 py-10"><ListSkeleton rows={6} /></div>;
  if (!pitchQ.data?.pitch) return <div className="mx-auto max-w-3xl px-6 py-10 text-sm text-muted-foreground">Pitch no encontrado.</div>;

  return (
    <div className="mx-auto max-w-[1700px] px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Oportunidades de ventas · Pitches</p>
          <h1 className="mt-1 font-display text-4xl title-caps">{form.titulo || "PITCH"}</h1>
        </div>
        {oportunidadId && (
          <Link to="/opportunities/$opportunityId" params={{ opportunityId: oportunidadId }} className="text-xs underline">
            Ver oportunidad de origen
          </Link>
        )}
      </div>

      {oportunidadId && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-2xl title-caps">Proyecto</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Título" full>
              <Input value={form.titulo ?? ""} onChange={(e) => set("titulo", e.target.value)} />
            </Field>
            <Field label="Título alternativo">
              <Input value={proj.titulo_alt} onChange={(e) => setP("titulo_alt", e.target.value)} />
            </Field>
            <Field label="Director (CRM)">
              <CreatableSelect
                value={directorLabel}
                options={(directorsQ.data ?? []).map((d) => ({ id: d.id, label: d.full_name }))}
                placeholder="Busca o crea el director…"
                onPick={(id, label) => {
                  setDirectorLabel(label);
                  setProj((p) => ({ ...p, director_id: id ?? "", director_text: id ? "" : label }));
                }}
                onCreate={async (label) => {
                  try {
                    const id = await findOrCreateDirector(label);
                    directorsQ.refetch();
                    toast.success("Director añadido al CRM");
                    return id;
                  } catch (e: any) {
                    toast.error(e.message);
                    return null;
                  }
                }}
                createLabel="Crear director en el CRM"
              />
            </Field>
            <Field label="Productora (CRM)">
              <Select
                value={proj.partner_company_id || "__none"}
                onValueChange={(v) => setP("partner_company_id", v === "__none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona productora…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sin productora</SelectItem>
                  {(companiesQ.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Productora (texto libre)">
              <Input value={proj.partner_name} onChange={(e) => setP("partner_name", e.target.value)} />
            </Field>
            <Field label="Tipo de producción">
              <Select value={proj.tipo_produccion || "__none"} onValueChange={(v) => setP("tipo_produccion", v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Tipo…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sin definir</SelectItem>
                  {(Object.keys(OPP_TYPE_LABEL) as OppProductionType[]).map((k) => (
                    <SelectItem key={k} value={k}>{OPP_TYPE_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Género">
              <Select value={proj.genero_produccion || "__none"} onValueChange={(v) => setP("genero_produccion", v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Género…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sin definir</SelectItem>
                  {(Object.keys(OPP_GENRE_LABEL) as OppProductionGenre[]).map((k) => (
                    <SelectItem key={k} value={k}>{OPP_GENRE_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Fase">
              <Select value={proj.fase || "__none"} onValueChange={(v) => setP("fase", v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Fase…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sin definir</SelectItem>
                  {(Object.keys(OPP_PHASE_LABEL) as OppPhase[]).map((k) => (
                    <SelectItem key={k} value={k}>{OPP_PHASE_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Prioridad IC">
              <Select value={proj.prioridad || "__none"} onValueChange={(v) => setP("prioridad", v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Prioridad…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sin definir</SelectItem>
                  {(Object.keys(OPP_PRIORITY_LABEL) as OppPriority[]).map((k) => (
                    <SelectItem key={k} value={k}>{OPP_PRIORITY_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="País(es)">
              <Input value={proj.paises} onChange={(e) => setP("paises", e.target.value)} placeholder="España / Francia" />
            </Field>
            <Field label="AIE">
              <Input value={proj.productora_aie} onChange={(e) => setP("productora_aie", e.target.value)} />
            </Field>
            <Field label="Presupuesto (texto original)">
              <Input value={proj.presupuesto_texto} onChange={(e) => setP("presupuesto_texto", e.target.value)} placeholder="6-8M" />
            </Field>
            <Field label="Financiación pública">
              <Input value={proj.financiacion_publica} onChange={(e) => setP("financiacion_publica", e.target.value)} />
            </Field>
            <Field label="Fecha de rodaje">
              <Input value={proj.fecha_rodaje} onChange={(e) => setP("fecha_rodaje", e.target.value)} placeholder="Otoño 2026" />
            </Field>
            <Field label="Fecha de estreno">
              <Input value={proj.fecha_estreno} onChange={(e) => setP("fecha_estreno", e.target.value)} placeholder="2027" />
            </Field>
            <Field label="Fecha de detección">
              <Input type="date" value={proj.detected_date} onChange={(e) => setP("detected_date", e.target.value)} />
            </Field>
            <Field label="Origen">
              <Input value={proj.origen} onChange={(e) => setP("origen", e.target.value)} placeholder="Report, prensa, contacto…" />
            </Field>
            <Field label="Reparto" full>
              <Input value={proj.reparto} onChange={(e) => setP("reparto", e.target.value)} />
            </Field>
            <Field label="Fuente (URL)" full>
              <Input value={proj.fuente_url} onChange={(e) => setP("fuente_url", e.target.value)} placeholder="https://…" />
            </Field>
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl title-caps">Pitch</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!oportunidadId && (
            <Field label="Título" full>
              <Input value={form.titulo ?? ""} onChange={(e) => set("titulo", e.target.value)} />
            </Field>
          )}

          <Field label="Representados vinculados" full>
            <div className="flex flex-wrap gap-1.5 rounded-sm border border-border p-2">
              {(composersQ.data ?? []).map((c) => {
                const active = composerIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setComposerIds((prev) => (active ? prev.filter((x) => x !== c.id) : [...prev, c.id]))}
                    className={cn(
                      "rounded-sm border px-2 py-1 text-xs transition",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                    )}
                  >
                    {c.full_name}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Partner destinatario">
            <Select value={form.partner_destinatario ?? "__none"} onValueChange={(v) => set("partner_destinatario", v === "__none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sin asignar</SelectItem>
                {(partnersQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Proyecto vinculado">
            <Input value={form.proyecto_vinculado ?? ""} onChange={(e) => set("proyecto_vinculado", e.target.value)} />
          </Field>

          <Field label="Tipo">
            <Select value={form.tipo ?? ""} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent>{PITCH_TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Estado">
            <Select value={form.estado ?? ""} onValueChange={(v) => set("estado", v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent>{PITCH_ESTADOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Fecha del pitch">
            <Input type="date" value={form.fecha_pitch ?? ""} onChange={(e) => set("fecha_pitch", e.target.value)} />
          </Field>

          <Field label="Fecha de seguimiento">
            <Input type="date" value={form.fecha_seguimiento ?? ""} onChange={(e) => set("fecha_seguimiento", e.target.value)} />
          </Field>

          <Field label="Presupuesto estimado (€)">
            <Input type="number" value={form.presupuesto_estimado ?? ""} onChange={(e) => set("presupuesto_estimado", e.target.value)} />
          </Field>

          <Field label="Responsable">
            <Select value={form.responsable_id ?? "__none"} onValueChange={(v) => set("responsable_id", v === "__none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sin asignar</SelectItem>
                {(peopleQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl title-caps">Notas y seguimiento</h2>
        <div className="grid grid-cols-1 gap-4">
          {oportunidadId && (
            <div className="grid gap-1.5">
              <Label>Notas del proyecto</Label>
              <Textarea rows={4} value={proj.notes} onChange={(e) => setP("notes", e.target.value)} />
            </div>
          )}
          <div className="grid gap-1.5">
            <Label>Notas del pitch</Label>
            <Textarea rows={4} value={form.notas ?? ""} onChange={(e) => set("notas", e.target.value)} />
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        <ConfirmDeleteButton onConfirm={remove} title="Eliminar pitch" label="Eliminar pitch" />
        <div className="flex flex-wrap items-center gap-3">
          {pitchQ.data?.pitch && (
            <PitchCloseActions
              pitchId={pitchId}
              pitch={pitchQ.data.pitch}
              opportunity={origenQ.data ?? null}
              composerIds={composerIds}
            />
          )}
          <Button onClick={save} disabled={saving}>Guardar</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("grid gap-1.5", full && "sm:col-span-2")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/pitches_/$pitchId")({
  component: PitchDetail,
});
