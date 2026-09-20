import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/list-states";
import { formatDateEs } from "@/lib/dates";
import {
  MILESTONE_STATUSES, MILESTONE_STATUS_LABEL, MILESTONE_TONE,
  isMilestoneOverdue, normalizeMilestoneStatus,
} from "@/lib/production-milestones";
import { GANTT_OWNER_LABEL, type GanttOwner } from "@/components/production-gantt";
import {
  PHASE_TEMPLATE_LABEL, seedProductionPhases, templateForKind, type PhaseTemplateKey,
} from "@/lib/production-phase-templates";
import { addToPhaseCatalog, findCatalogByName, PHASE_COLOR_CLASS, PHASE_COLOR_KEYS, PHASE_COLOR_LABEL, useInvalidatePhaseCatalog, usePhaseCatalog, type PhaseColorKey } from "@/lib/phase-catalog";
import { toast } from "sonner";
import { Plus, Flag, AlertTriangle, Sparkles, Star, PartyPopper } from "lucide-react";

const db = supabase as any;
const MANUAL = "__manual__";

export type Milestone = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  position: number;
  owner: string | null;
  is_milestone: boolean | null;
  detail: string | null;
  place: string | null;
  people: string | null;
  is_premiere: boolean | null;
  catalog_id: string | null;
};

export function useProductionMilestones(productionId: string) {
  return useQuery({
    queryKey: ["production-milestones", productionId],
    queryFn: async () => {
      const { data, error } = await db
        .from("production_phases")
        .select("id, name, start_date, end_date, status, position, owner, is_milestone, detail, place, people, is_premiere, catalog_id")
        .eq("production_id", productionId)
        .order("start_date", { ascending: true, nullsFirst: false })
        .order("position");
      if (error) throw error;
      return (data ?? []) as Milestone[];
    },
  });
}

export function ProductionMilestonesEditor({
  productionId,
  productionKind,
}: {
  productionId: string;
  productionKind?: string | null;
}) {
  const qc = useQueryClient();
  const key = ["production-milestones", productionId];
  const listQ = useProductionMilestones(productionId);
  const catalogQ = usePhaseCatalog();
  const invalidateCatalog = useInvalidatePhaseCatalog();

  const [pick, setPick] = useState<string>(MANUAL);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [place, setPlace] = useState("");
  const [people, setPeople] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [owner, setOwner] = useState<GanttOwner>("representado");
  const [template, setTemplate] = useState<PhaseTemplateKey>(templateForKind(productionKind));
  const [askStandard, setAskStandard] = useState<string | null>(null);
  const [standardColor, setStandardColor] = useState<PhaseColorKey>("aubergine");

  const catalog = catalogQ.data ?? [];
  const picked = useMemo(() => catalog.find((c) => c.id === pick) ?? null, [catalog, pick]);
  const effectiveName = picked ? picked.name : name;
  const showDetail = picked ? picked.requires_detail : true;
  const showPlace = picked ? picked.requires_place : true;

  function invalidate() {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["production-phases", productionId] });
    qc.invalidateQueries({ queryKey: ["gantt-phases"] });
    qc.invalidateQueries({ queryKey: ["calendar-events"] });
    qc.invalidateQueries({ queryKey: ["calendar-events-all"] });
    qc.invalidateQueries({ queryKey: ["productions-lifecycle"] });
    qc.invalidateQueries({ queryKey: ["produccion-seguimiento"] });
  }

  async function add() {
    const n = effectiveName.trim();
    if (!n) return;
    const match = picked ?? findCatalogByName(catalog, n);
    const { error } = await db.from("production_phases").insert({
      production_id: productionId,
      name: n,
      owner,
      start_date: date || null,
      end_date: endDate || null,
      status: "pendiente",
      position: listQ.data?.length ?? 0,
      detail: detail.trim() || null,
      place: place.trim() || null,
      people: people.trim() || null,
      catalog_id: match?.id ?? null,
      is_premiere: match?.is_premiere ?? false,
    });
    if (error) return toast.error(error.message);
    const wasManual = !picked && !match;
    setName(""); setDetail(""); setPlace(""); setPeople(""); setDate(""); setEndDate("");
    invalidate();
    if (wasManual) setAskStandard(n);
  }

  async function confirmStandard() {
    const n = askStandard;
    setAskStandard(null);
    if (!n) return;
    try {
      await addToPhaseCatalog({ name: n, requires_detail: true, requires_place: true, color_key: standardColor });
      invalidateCatalog();
      toast.success(`“${n}” ya forma parte de la lista estándar`);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo añadir a la lista estándar");
    }
  }

  async function applyTemplate() {
    try {
      const { inserted } = await seedProductionPhases(productionId, template);
      toast.success(inserted ? `${inserted} procesos añadidos` : "La plantilla ya estaba aplicada");
      invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo aplicar la plantilla");
    }
  }

  async function update(id: string, patch: Partial<Milestone>) {
    const { error } = await db.from("production_phases").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  async function remove(id: string) {
    const { error } = await db.from("production_phases").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  }

  const rows = listQ.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-muted/30 p-3">
        <span className="text-xs text-muted-foreground">Plantilla de procesos</span>
        <Select value={template} onValueChange={(v) => setTemplate(v as PhaseTemplateKey)}>
          <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PHASE_TEMPLATE_LABEL) as PhaseTemplateKey[]).map((k) => (
              <SelectItem key={k} value={k}>{PHASE_TEMPLATE_LABEL[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={applyTemplate}>
          <Sparkles className="mr-1 h-4 w-4" /> Aplicar plantilla
        </Button>
        <span className="text-xs text-muted-foreground">Añade los procesos habituales sin fechas: complétalas a mano.</span>
      </div>

      <div className="space-y-2 rounded-sm border border-dashed border-border p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_170px]">
          <div>
            <Label className="smallcaps text-[10px] text-muted-foreground">Subproceso estándar</Label>
            <Select value={pick} onValueChange={(v) => {
              setPick(v);
              const c = catalog.find((x) => x.id === v);
              if (c) { setName(c.name); setOwner((c.default_owner as GanttOwner) ?? "representado"); }
              else setName("");
            }}>
              <SelectTrigger><SelectValue placeholder="Elegir de la lista" /></SelectTrigger>
              <SelectContent>
                {catalog.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                <SelectItem value={MANUAL}>Otro (escribir a mano)…</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="smallcaps text-[10px] text-muted-foreground">Nombre del proceso</Label>
            <Input
              value={effectiveName}
              disabled={!!picked}
              onChange={(e) => setName(e.target.value)}
              placeholder="Escribe un subproceso nuevo"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            />
          </div>
          <div>
            <Label className="smallcaps text-[10px] text-muted-foreground">Responsable</Label>
            <Select value={owner} onValueChange={(v) => setOwner(v as GanttOwner)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(GANTT_OWNER_LABEL) as GanttOwner[]).map((o) => (
                  <SelectItem key={o} value={o}>{GANTT_OWNER_LABEL[o]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {showDetail && (
            <div>
              <Label className="smallcaps text-[10px] text-muted-foreground">
                {picked?.is_premiere ? "Qué se estrena" : "Qué se entrega / se graba"}
              </Label>
              <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Ej: bobina 3, tema principal…" />
            </div>
          )}
          {showPlace && (
            <>
              <div>
                <Label className="smallcaps text-[10px] text-muted-foreground">Dónde</Label>
                <Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Estudio, sala, ciudad…" />
              </div>
              <div>
                <Label className="smallcaps text-[10px] text-muted-foreground">Quién</Label>
                <Input value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Ingeniero, orquesta, equipo…" />
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[170px_170px_auto]">
          <div>
            <Label className="smallcaps text-[10px] text-muted-foreground">Desde</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label className="smallcaps text-[10px] text-muted-foreground">Hasta</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={add} disabled={!effectiveName.trim()}><Plus className="mr-1 h-4 w-4" /> Añadir subproceso</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Puedes repetir un subproceso tantas veces como necesites (varias grabaciones, entregas, mezclas o estrenos).
        </p>
      </div>

      {!rows.length ? (
        <EmptyState variant="inline" icon={Flag} title="Sin procesos" description="Aplica una plantilla o añade los subprocesos con sus fechas: aparecerán en el calendario y en el Gantt." />
      ) : (
        <ol className="space-y-2">
          {rows.map((m) => {
            const st = normalizeMilestoneStatus(m.status);
            const overdue = isMilestoneOverdue(m);
            return (
              <li key={m.id} className={`rounded-sm border p-3 ${overdue ? "border-destructive bg-destructive/5" : "border-border"}`}>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[180px] flex-1">
                    <Label className="smallcaps text-[10px] text-muted-foreground">Proceso</Label>
                    <Input value={m.name} onChange={(e) => update(m.id, { name: e.target.value })} />
                  </div>
                  <div className="w-44">
                    <Label className="smallcaps text-[10px] text-muted-foreground">Responsable</Label>
                    <Select value={(m.owner ?? "agencia") as string} onValueChange={(v) => update(m.id, { owner: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(GANTT_OWNER_LABEL) as GanttOwner[]).map((o) => (
                          <SelectItem key={o} value={o}>{GANTT_OWNER_LABEL[o]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="smallcaps text-[10px] text-muted-foreground">Desde</Label>
                    <Input type="date" value={m.start_date ?? ""} onChange={(e) => update(m.id, { start_date: e.target.value || null })} />
                  </div>
                  <div>
                    <Label className="smallcaps text-[10px] text-muted-foreground">Hasta</Label>
                    <Input type="date" value={m.end_date ?? ""} onChange={(e) => update(m.id, { end_date: e.target.value || null })} />
                  </div>
                  <div className="w-40">
                    <Label className="smallcaps text-[10px] text-muted-foreground">Estado</Label>
                    <Select value={st} onValueChange={(v) => update(m.id, { status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MILESTONE_STATUSES.map((s) => <SelectItem key={s} value={s}>{MILESTONE_STATUS_LABEL[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={m.is_milestone ? "default" : "outline"}
                    onClick={() => update(m.id, { is_milestone: !m.is_milestone })}
                    title="Marcar como entrega destacada"
                  >
                    <Star className="mr-1 h-4 w-4" /> {m.is_milestone ? "Entrega destacada" : "Destacar"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={m.is_premiere ? "default" : "outline"}
                    onClick={() => update(m.id, { is_premiere: !m.is_premiere })}
                    title="Los estrenos pasan al calendario de marketing"
                  >
                    <PartyPopper className="mr-1 h-4 w-4" /> {m.is_premiere ? "Estreno" : "Marcar estreno"}
                  </Button>
                  <ConfirmDeleteButton iconOnly title="¿Eliminar este proceso?" onConfirm={() => remove(m.id)} />
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div>
                    <Label className="smallcaps text-[10px] text-muted-foreground">Qué</Label>
                    <Input
                      value={m.detail ?? ""}
                      placeholder="Qué se entrega, graba o estrena"
                      onChange={(e) => update(m.id, { detail: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <Label className="smallcaps text-[10px] text-muted-foreground">Dónde</Label>
                    <Input
                      value={m.place ?? ""}
                      placeholder="Estudio, sala, ciudad…"
                      onChange={(e) => update(m.id, { place: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <Label className="smallcaps text-[10px] text-muted-foreground">Quién</Label>
                    <Input
                      value={m.people ?? ""}
                      placeholder="Ingeniero, orquesta, equipo…"
                      onChange={(e) => update(m.id, { people: e.target.value || null })}
                    />
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={`rounded-sm px-1.5 py-0.5 smallcaps ${MILESTONE_TONE[st]}`}>{MILESTONE_STATUS_LABEL[st]}</span>
                  <span className="text-muted-foreground">
                    {GANTT_OWNER_LABEL[(m.owner ?? "agencia") as GanttOwner]} · Del {formatDateEs(m.start_date)} al {formatDateEs(m.end_date)}
                  </span>
                  {m.is_premiere && (
                    <span className="rounded-sm bg-primary px-1.5 py-0.5 font-semibold smallcaps text-primary-foreground">
                      En calendario de marketing
                    </span>
                  )}
                  {overdue && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-destructive px-1.5 py-0.5 font-semibold smallcaps text-destructive-foreground">
                      <AlertTriangle className="h-3 w-3" aria-hidden /> Retrasado
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-xs text-muted-foreground">
        Cada subproceso con fechas marca el inicio y el fin de esa etapa en el calendario y en el Gantt. Los estrenos pasan
        además al calendario de marketing con la película y el cliente.
      </p>

      <AlertDialog open={!!askStandard} onOpenChange={(o) => { if (!o) setAskStandard(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Añadirlo a la lista estándar?</AlertDialogTitle>
            <AlertDialogDescription>
              “{askStandard}” no estaba en el desplegable de subprocesos. ¿Quieres que forme parte del estándar y aparezca
              en todas las producciones? Elige también el color con el que aparecerá en los Gantt.
            </AlertDialogDescription>
            <div className="grid grid-cols-3 gap-2 pt-3 sm:grid-cols-4">
              {PHASE_COLOR_KEYS.map((color) => (
                <Button
                  key={color}
                  type="button"
                  variant="outline"
                  className={`h-auto justify-start gap-2 px-2 py-2 ${standardColor === color ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setStandardColor(color)}
                >
                  <span className={`h-4 w-4 shrink-0 rounded-sm ${PHASE_COLOR_CLASS[color]}`} />
                  <span className="truncate text-xs">{PHASE_COLOR_LABEL[color]}</span>
                </Button>
              ))}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, solo aquí</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStandard}>Sí, añadir al estándar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
