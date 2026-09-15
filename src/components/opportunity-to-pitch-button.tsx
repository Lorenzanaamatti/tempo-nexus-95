import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PITCH_ESTADOS, PITCH_TIPOS } from "@/lib/pitches";
import { formatEUR0 } from "@/lib/money";
import { OPP_PHASE_LABEL, OPP_TYPE_LABEL, type OppPhase, type OppProductionType } from "@/lib/opportunity-production";

const db = supabase as any;

export type OpportunityToPitchButtonProps = {
  opportunity: Record<string, any>;
  onDone?: () => void;
};

/** Traslada una oportunidad de producción al módulo de Pitches conservando todos sus datos. */
export function OpportunityToPitchButton({ opportunity, onDone }: OpportunityToPitchButtonProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [estado, setEstado] = useState<string>("En preparación");
  const [tipo, setTipo] = useState<string>("Música original");
  const [notas, setNotas] = useState("");
  const [fechaPitch, setFechaPitch] = useState(new Date().toISOString().slice(0, 10));
  const [fechaSeguimiento, setFechaSeguimiento] = useState("");
  const [composerIds, setComposerIds] = useState<string[]>(
    (opportunity.candidates ?? []).map((c: any) => c.composer_id).filter(Boolean),
  );
  const [responsable, setResponsable] = useState<string>(opportunity.responsible_person_id ?? "");

  const composersQ = useQuery({
    queryKey: ["lookup-composers"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await db.from("composers").select("id, full_name").order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });

  const peopleQ = useQuery({
    queryKey: ["people-ic"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await db.from("ic_team").select("id, full_name").eq("role", "ic_team").order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });

  const destinatario = opportunity.partner_company?.name || opportunity.partner_name || null;
  const presupuesto = opportunity.estimated_value ?? opportunity.presupuesto_max ?? opportunity.presupuesto_min ?? null;

  const resumen: [string, string][] = [
    ["Título", opportunity.title ?? "—"],
    ["Título alternativo", opportunity.titulo_alt || "—"],
    ["Tipo", opportunity.tipo_produccion ? OPP_TYPE_LABEL[opportunity.tipo_produccion as OppProductionType] : "—"],
    ["Fase", opportunity.fase ? OPP_PHASE_LABEL[opportunity.fase as OppPhase] : "—"],
    ["Productora", destinatario || "—"],
    ["Director", opportunity.director?.full_name || opportunity.director_text || "—"],
    ["País", (opportunity.paises ?? []).join(" / ") || "—"],
    [
      "Presupuesto",
      opportunity.presupuesto_min || opportunity.presupuesto_max
        ? `${opportunity.presupuesto_min ? formatEUR0(opportunity.presupuesto_min) : "—"} – ${opportunity.presupuesto_max ? formatEUR0(opportunity.presupuesto_max) : "abierto"}`
        : opportunity.presupuesto_texto || "—",
    ],
  ];

  async function trasladar() {
    setBusy(true);
    const { data: pitch, error } = await db
      .from("oportunidades_pitches")
      .insert({
        titulo: opportunity.title,
        estado,
        tipo,
        oportunidad_id: opportunity.id,
        proyecto_vinculado: destinatario,
        produccion_id: opportunity.target_production_id ?? null,
        presupuesto_estimado: presupuesto,
        responsable_id: responsable || null,
        fecha_pitch: fechaPitch || null,
        fecha_seguimiento: fechaSeguimiento || null,
        notas: notas.trim() || null,
      })
      .select("id")
      .single();

    if (error || !pitch) {
      setBusy(false);
      return toast.error(error?.message ?? "No se pudo crear el pitch");
    }

    if (composerIds.length) {
      await db
        .from("oportunidades_pitch_composers")
        .insert(composerIds.map((id) => ({ pitch_id: pitch.id, composer_id: id })));
      // El representado ve la propuesta en su portal
      for (const id of composerIds) {
        await db
          .from("opportunity_candidates")
          .upsert({ opportunity_id: opportunity.id, composer_id: id }, { onConflict: "opportunity_id,composer_id" });
      }
    }

    if (responsable) {
      await db.from("actions").insert({
        title: `Pitch: ${opportunity.title}`,
        area: "oportunidades",
        assignee_person_id: responsable,
        subject_type: "opportunity",
        subject_id: opportunity.id,
        due_date: fechaSeguimiento || fechaPitch || null,
        notes: notas.trim() || `Seguimiento del pitch trasladado desde la oportunidad «${opportunity.title}».`,
      });
    }

    setBusy(false);
    setOpen(false);
    toast.success("Oportunidad trasladada a Pitches");
    qc.invalidateQueries({ queryKey: ["pitches"] });
    qc.invalidateQueries({ queryKey: ["opportunities"] });
    onDone?.();
    navigate({ to: "/oportunidades/pitches/$pitchId", params: { pitchId: pitch.id } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" title="Trasladar a Pitches">
          <Send className="h-3.5 w-3.5" /> A pitch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trasladar a pitch</DialogTitle>
          <DialogDescription>
            Se conservan todos los datos de la producción; el pitch queda enlazado a la oportunidad de origen.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-sm border border-border bg-muted/30 p-3 text-xs">
          {resumen.map(([k, v]) => (
            <div key={k}>
              <p className="smallcaps text-[10px] text-muted-foreground">{k}</p>
              <p>{v}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PITCH_ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PITCH_TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fecha del pitch</Label>
            <Input type="date" value={fechaPitch} onChange={(e) => setFechaPitch(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de seguimiento</Label>
            <Input type="date" value={fechaSeguimiento} onChange={(e) => setFechaSeguimiento(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Representados vinculados</Label>
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
            <p className="text-[11px] text-muted-foreground">El pitch aparecerá en el portal de cada representado seleccionado.</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Ejecutiva responsable</Label>
            <Select value={responsable || "__none"} onValueChange={(v) => setResponsable(v === "__none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sin asignar</SelectItem>
                {(peopleQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Se crea una tarea de seguimiento en sus tareas y en el calendario.</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notas</Label>
            <Textarea rows={4} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Contexto, contactos, próximos pasos…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => void trasladar()} disabled={busy}>Trasladar a pitch</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
