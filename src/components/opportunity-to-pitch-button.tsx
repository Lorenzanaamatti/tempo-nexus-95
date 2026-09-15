import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Send } from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;

export type OpportunityToPitchButtonProps = {
  opportunity: {
    id: string;
    title: string;
    estimated_value?: number | null;
    responsible_person_id?: string | null;
    partner_company?: { name?: string | null } | null;
    partner_name?: string | null;
    target_production_id?: string | null;
  };
};

/** Traslada una oportunidad al módulo de Pitches creando la propuesta y abriéndola. */
export function OpportunityToPitchButton({ opportunity }: OpportunityToPitchButtonProps) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function toPitch() {
    setBusy(true);
    const destinatario = opportunity.partner_company?.name || opportunity.partner_name || null;
    const { data, error } = await db
      .from("oportunidades_pitches")
      .insert({
        titulo: opportunity.title,
        estado: "En preparación",
        tipo: "Música original",
        proyecto_vinculado: destinatario,
        produccion_id: opportunity.target_production_id ?? null,
        presupuesto_estimado: opportunity.estimated_value ?? null,
        responsable_id: opportunity.responsible_person_id ?? null,
        fecha_pitch: new Date().toISOString().slice(0, 10),
        notas: `Creado desde la oportunidad «${opportunity.title}».`,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "No se pudo crear el pitch");
    toast.success("Oportunidad trasladada a Pitches");
    navigate({ to: "/oportunidades/pitches/$pitchId", params: { pitchId: data.id } });
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" disabled={busy} onClick={() => void toPitch()} aria-label="Pasar a pitch">
          <Send className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Pasar a pitch</TooltipContent>
    </Tooltip>
  );
}
