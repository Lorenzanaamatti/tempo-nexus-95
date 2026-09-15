import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ListSkeleton } from "@/components/list-states";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PITCH_ESTADOS, PITCH_TIPOS } from "@/lib/pitches";

const db = supabase as any;

function PitchDetail() {
  const { pitchId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({});
  const [composerIds, setComposerIds] = useState<string[]>([]);
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

  useEffect(() => {
    if (!pitchQ.data?.pitch) return;
    setForm(pitchQ.data.pitch);
    setComposerIds(pitchQ.data.composerIds);
  }, [pitchQ.data]);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!String(form.titulo ?? "").trim()) return toast.error("El título es obligatorio");
    setSaving(true);
    const payload = {
      titulo: String(form.titulo).trim(),
      partner_destinatario: form.partner_destinatario || null,
      proyecto_vinculado: form.proyecto_vinculado || null,
      tipo: form.tipo || "Música original",
      fecha_pitch: form.fecha_pitch || null,
      estado: form.estado || "En preparación",
      presupuesto_estimado: form.presupuesto_estimado === "" || form.presupuesto_estimado == null ? null : Number(form.presupuesto_estimado),
      fecha_seguimiento: form.fecha_seguimiento || null,
      responsable_id: form.responsable_id || null,
      notas: form.notas || null,
    };
    const { data: updated, error } = await db.from("oportunidades_pitches").update(payload).eq("id", pitchId).select("id");
    if (!error) {
      await db.from("oportunidades_pitch_composers").delete().eq("pitch_id", pitchId);
      if (composerIds.length) {
        await db.from("oportunidades_pitch_composers").insert(composerIds.map((c) => ({ pitch_id: pitchId, composer_id: c })));
      }
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    if (!updated?.length) return toast.error("No se guardó ningún cambio: revisa tus permisos.");
    toast.success("Pitch guardado");
    qc.invalidateQueries({ queryKey: ["pitches"] });
    qc.invalidateQueries({ queryKey: ["pitch", pitchId] });
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
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Oportunidades de ventas · Pitches</p>
        <h1 className="mt-1 font-display text-4xl title-caps">{form.titulo || "PITCH"}</h1>
      </div>

      {origenQ.data && (
        <div className="mb-8 rounded-sm border border-border bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="smallcaps text-xs text-muted-foreground">Datos de la producción de origen</p>
            <Link
              to="/opportunities/$opportunityId"
              params={{ opportunityId: origenQ.data.id }}
              className="text-xs underline"
            >
              Ver oportunidad
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {([
              ["Título alternativo", origenQ.data.titulo_alt],
              ["Tipo", origenQ.data.tipo_produccion ? OPP_TYPE_LABEL[origenQ.data.tipo_produccion as OppProductionType] : null],
              ["Fase", origenQ.data.fase ? OPP_PHASE_LABEL[origenQ.data.fase as OppPhase] : null],
              ["Productora", origenQ.data.partner_company?.name || origenQ.data.partner_name],
              ["Director", origenQ.data.director?.full_name || origenQ.data.director_text],
              ["País", (origenQ.data.paises ?? []).join(" / ")],
              [
                "Presupuesto",
                origenQ.data.presupuesto_min || origenQ.data.presupuesto_max
                  ? `${origenQ.data.presupuesto_min ? formatEUR0(origenQ.data.presupuesto_min) : "—"} – ${origenQ.data.presupuesto_max ? formatEUR0(origenQ.data.presupuesto_max) : "abierto"}`
                  : origenQ.data.presupuesto_texto,
              ],
              ["Detectada", formatDateEs(origenQ.data.detected_date)],
              ["Reparto", (origenQ.data.reparto ?? []).join(", ")],
            ] as [string, any][]).map(([k, v]) => (
              <div key={k}>
                <p className="smallcaps text-[10px] text-muted-foreground">{k}</p>
                <p>{v || "—"}</p>
              </div>
            ))}
          </div>
          {origenQ.data.notes && <p className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">{origenQ.data.notes}</p>}
        </div>
      )}


      <div className="grid grid-cols-2 gap-4">
        <Field label="Título" full>
          <Input value={form.titulo ?? ""} onChange={(e) => set("titulo", e.target.value)} />
        </Field>

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

        <Field label="Notas" full>
          <Textarea rows={4} value={form.notas ?? ""} onChange={(e) => set("notas", e.target.value)} />
        </Field>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <ConfirmDeleteButton onConfirm={remove} title="Eliminar pitch" label="Eliminar pitch" />
        <Button onClick={save} disabled={saving}>Guardar</Button>
      </div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("grid gap-1.5", full && "col-span-2")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/_admin/oportunidades/pitches_/$pitchId")({
  component: PitchDetail,
});