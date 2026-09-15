import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { formatEUR0 } from "@/lib/money";
import { OPP_PHASE_LABEL, OPP_TYPE_LABEL, type OppPhase, type OppProductionType } from "@/lib/opportunity-production";

const db = supabase as any;

export type OpportunityToPitchButtonProps = {
  opportunity: Record<string, any>;
  onDone?: () => void;
};

/**
 * Traslada una oportunidad de producción al módulo de Pitches tal cual está:
 * no se edita ningún dato y la oportunidad se archiva para que desaparezca del listado.
 */
export function OpportunityToPitchButton({ opportunity, onDone }: OpportunityToPitchButtonProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const destinatario = opportunity.partner_company?.name || opportunity.partner_name || null;
  const presupuesto = opportunity.estimated_value ?? opportunity.presupuesto_max ?? opportunity.presupuesto_min ?? null;
  const composerIds: string[] = (opportunity.candidates ?? []).map((c: any) => c.composer_id).filter(Boolean);
  const responsable: string | null = opportunity.responsible_person_id ?? null;

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
    [
      "Representados",
      (opportunity.candidates ?? [])
        .map((c: any) => c.composer?.artistic_name || c.composer?.full_name)
        .filter(Boolean)
        .join(", ") || "—",
    ],
    ["Responsable", opportunity.responsible?.full_name || "—"],
  ];

  async function trasladar() {
    setBusy(true);
    const hoy = new Date().toISOString().slice(0, 10);

    const { data: pitch, error } = await db
      .from("oportunidades_pitches")
      .insert({
        titulo: opportunity.title,
        estado: "En preparación",
        tipo: "Música original",
        oportunidad_id: opportunity.id,
        proyecto_vinculado: destinatario,
        produccion_id: opportunity.target_production_id ?? null,
        presupuesto_estimado: presupuesto,
        responsable_id: responsable,
        fecha_pitch: hoy,
        fecha_seguimiento: opportunity.expected_close_date ?? null,
        notas: null,
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
    }

    if (responsable) {
      await db.from("actions").insert({
        title: `Pitch: ${opportunity.title}`,
        area: "oportunidades",
        assignee_person_id: responsable,
        subject_type: "opportunity",
        subject_id: opportunity.id,
        due_date: opportunity.expected_close_date ?? hoy,
        notes: `Seguimiento del pitch trasladado desde la oportunidad «${opportunity.title}».`,
      });
    }

    // La oportunidad deja de estar activa: ahora vive en Pitches.
    await db
      .from("opportunities")
      .update({ archived_at: new Date().toISOString(), archived_reason: "Trasladada a pitch" })
      .eq("id", opportunity.id);

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
            La ficha pasa tal cual a Pitches, sin cambios, y deja de aparecer en el listado de oportunidades.
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

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => void trasladar()} disabled={busy}>Trasladar a pitch</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
