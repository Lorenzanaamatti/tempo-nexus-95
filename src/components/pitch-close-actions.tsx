import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Archive, ArchiveRestore, Trophy } from "lucide-react";
import { toast } from "sonner";
import { PRODUCTION_KIND_LABEL, type ProductionKind } from "@/lib/production-constants";
import { seedProductionPhases, templateForKind } from "@/lib/production-phase-templates";

const db = supabase as any;

/** Tipo de producción de la oportunidad → tipo de producción de la app. */
function kindFromOpportunity(tipo?: string | null): ProductionKind {
  switch (tipo) {
    case "serie":
      return "serie";
    case "documental":
      return "documental";
    case "animacion":
    case "pelicula":
      return "cine";
    default:
      return "cine";
  }
}

export type PitchCloseActionsProps = {
  pitchId: string;
  pitch: Record<string, any>;
  opportunity?: Record<string, any> | null;
  composerIds: string[];
};

/**
 * Cierre de un pitch: se archiva como descartado, o se gana y viaja a Producciones activas.
 * En los dos casos desaparece del listado activo de pitches y se refleja en los portales.
 */
export function PitchCloseActions({ pitchId, pitch, opportunity, composerIds }: PitchCloseActionsProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [winOpen, setWinOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);

  const archivado = !!pitch?.archivado_at;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["pitches"] });
    qc.invalidateQueries({ queryKey: ["pitch", pitchId] });
    qc.invalidateQueries({ queryKey: ["portal-pitches"] });
    qc.invalidateQueries({ queryKey: ["productions-lifecycle"] });
    qc.invalidateQueries({ queryKey: ["productions"] });
  }

  async function archivar() {
    setBusy(true);
    const { error } = await db
      .from("oportunidades_pitches")
      .update({
        archivado_at: new Date().toISOString(),
        archivado_motivo: motivo.trim() || "Descartado",
        estado: pitch.estado === "Ganado" ? pitch.estado : "Perdido",
      })
      .eq("id", pitchId);
    setBusy(false);
    if (error) return toast.error(error.message);
    setArchiveOpen(false);
    setMotivo("");
    toast.success("Pitch archivado como descartado");
    refresh();
  }

  async function desarchivar() {
    const { error } = await db
      .from("oportunidades_pitches")
      .update({ archivado_at: null, archivado_motivo: null })
      .eq("id", pitchId);
    if (error) return toast.error(error.message);
    toast.success("Pitch reactivado");
    refresh();
  }

  async function ganar() {
    setBusy(true);
    const kind = kindFromOpportunity(opportunity?.tipo_produccion);
    const hoy = new Date().toISOString().slice(0, 10);

    let produccionId: string | null = pitch.produccion_id ?? null;
    if (!produccionId) {
      const { data: created, error } = await db
        .from("productions")
        .insert({
          title: pitch.titulo,
          project_type: kind,
          kind: PRODUCTION_KIND_LABEL[kind],
          status: "contrato_firmado",
          composer_id: composerIds[0] ?? null,
          partner_company_id: opportunity?.partner_company_id ?? null,
          director_id: opportunity?.director_id ?? null,
          source_opportunity_id: pitch.oportunidad_id ?? null,
          year: opportunity?.fecha_estreno ? Number(String(opportunity.fecha_estreno).slice(0, 4)) : null,
        })
        .select("id")
        .single();
      if (error || !created) {
        setBusy(false);
        return toast.error(error?.message ?? "No se pudo crear la producción");
      }
      produccionId = created.id;
      try {
        await seedProductionPhases(produccionId!, templateForKind(kind));
      } catch {
        toast.message("Producción creada, pero no se pudo aplicar la plantilla de procesos.");
      }
    }

    const { error: upErr } = await db
      .from("oportunidades_pitches")
      .update({
        estado: "Ganado",
        produccion_id: produccionId,
        archivado_at: new Date().toISOString(),
        archivado_motivo: "Contrato conseguido · producción activa",
      })
      .eq("id", pitchId);

    if (pitch.responsable_id) {
      await db.from("actions").insert({
        title: `Producción ganada: ${pitch.titulo}`,
        area: "producciones",
        assignee_person_id: pitch.responsable_id,
        subject_type: "production",
        subject_id: produccionId,
        due_date: hoy,
        notes: "Arranque de la producción tras ganar el pitch.",
      });
    }

    setBusy(false);
    if (upErr) return toast.error(upErr.message);
    setWinOpen(false);
    toast.success("Pitch ganado: la producción ya está en Producciones activas");
    refresh();
    navigate({ to: "/producciones/$productionId", params: { productionId: produccionId! } });
  }

  if (archivado) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">
          Archivado{pitch.archivado_motivo ? ` · ${pitch.archivado_motivo}` : ""}
        </span>
        {pitch.produccion_id && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/producciones/$productionId", params: { productionId: pitch.produccion_id } })}
          >
            Ver producción
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => void desarchivar()}>
          <ArchiveRestore className="mr-1 h-4 w-4" /> Reactivar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setWinOpen(true)}>
        <Trophy className="mr-1 h-4 w-4" /> Contrato conseguido
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setArchiveOpen(true)}>
        <Archive className="mr-1 h-4 w-4" /> Archivar
      </Button>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archivar pitch</DialogTitle>
            <DialogDescription>
              El pitch deja de estar activo y se muestra como descartado en el portal del representado y en el de la
              ejecutiva.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label>Motivo</Label>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descartado por…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancelar</Button>
            <Button onClick={() => void archivar()} disabled={busy}>Archivar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={winOpen} onOpenChange={setWinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contrato conseguido</DialogTitle>
            <DialogDescription>
              «{pitch.titulo}» pasa a Producciones activas con su plantilla de procesos y se archiva como ganado. Se
              verá en el portal del representado y en el resto de portales.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWinOpen(false)}>Cancelar</Button>
            <Button onClick={() => void ganar()} disabled={busy}>Crear producción</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
