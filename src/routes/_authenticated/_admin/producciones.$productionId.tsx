import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageCrumb } from "@/components/breadcrumbs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { SaveButton } from "@/components/save-button";
import { useDirtyForm } from "@/lib/use-dirty-form";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PRODUCTION_KIND_LABEL, type ProductionKind } from "@/lib/production-constants";
import {
  PRODUCTION_STAGE_LABEL, PRODUCTION_STAGE_TONE, STAGE_DEFAULT_STATUS, stageOf,
  type ProductionStage,
} from "@/lib/production-lifecycle";
import { ProductionRepresentadosEditor } from "@/components/production-detail/representados-editor";
import { ProductionMilestonesEditor } from "@/components/production-detail/milestones-editor";
import { ProductionLinkedDocuments } from "@/components/production-detail/linked-documents";
import { ProductionTasks } from "@/components/production-detail/production-tasks";
import { ProductionEconomics } from "@/components/production-detail/production-economics";
import { useCurrentRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated/_admin/producciones/$productionId")({
  component: ProduccionDetalle,
});

type Form = {
  title: string;
  project_type: ProductionKind | "";
  partner_company_id: string;
  platform_id: string;
  director_id: string;
  director: string;
  country: string;
  original_language: string;
  year: string;
  start_date: string;
  delivery_date: string;
  actual_delivery_date: string;
  notes: string;
};

const EMPTY: Form = {
  title: "", project_type: "", partner_company_id: "", platform_id: "", director_id: "", director: "",
  country: "", original_language: "", year: "", start_date: "", delivery_date: "", actual_delivery_date: "", notes: "",
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl title-caps">{title}</h2>
      {description && <p className="mb-3 mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className={description ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function ProduccionDetalle() {
  const { productionId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isBigC } = useCurrentRole();

  const prodQ = useQuery({
    queryKey: ["produccion", productionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("productions")
        .select("*, partner_company:production_companies(id, name), platform_ref:platforms(id, name), source_opportunity:opportunities!productions_source_opportunity_id_fkey(id, title, statuses)")
        .eq("id", productionId)
        .single();
      if (error) throw error;
      return data as any;
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
  const platformsQ = useQuery({
    queryKey: ["platforms-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platforms").select("id, name").order("name");
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

  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const { dirty, markClean } = useDirtyForm(form);

  const data = prodQ.data;
  const stage: ProductionStage = stageOf(data?.status);

  useEffect(() => {
    if (!data) return;
    const hydrated: Form = {
      title: data.title ?? "",
      project_type: data.project_type ?? "",
      partner_company_id: data.partner_company_id ?? "",
      platform_id: data.platform_id ?? "",
      director_id: data.director_id ?? "",
      director: data.director ?? "",
      country: data.country ?? "",
      original_language: data.original_language ?? "",
      year: data.year != null ? String(data.year) : "",
      start_date: data.start_date ?? "",
      delivery_date: data.delivery_date ?? "",
      actual_delivery_date: data.actual_delivery_date ?? "",
      notes: data.notes ?? "",
    };
    setForm(hydrated);
    markClean(hydrated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function save() {
    setSaving(true);
    const { error } = await (supabase as any).from("productions").update({
      title: form.title,
      project_type: form.project_type || null,
      partner_company_id: form.partner_company_id || null,
      platform_id: form.platform_id || null,
      director_id: form.director_id || null,
      director: form.director || null,
      country: form.country || null,
      original_language: form.original_language || null,
      year: form.year === "" ? null : Number(form.year),
      start_date: form.start_date || null,
      delivery_date: form.delivery_date || null,
      actual_delivery_date: form.actual_delivery_date || null,
      notes: form.notes || null,
    }).eq("id", productionId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    markClean(form);
    qc.invalidateQueries({ queryKey: ["produccion", productionId] });
    qc.invalidateQueries({ queryKey: ["productions-lifecycle"] });
  }

  async function applyStage(next: ProductionStage) {
    const { error } = await (supabase as any)
      .from("productions")
      .update({ status: STAGE_DEFAULT_STATUS[next] })
      .eq("id", productionId);
    if (error) return toast.error(error.message);
    toast.success(`Estado: ${PRODUCTION_STAGE_LABEL[next]}`);
    qc.invalidateQueries({ queryKey: ["produccion", productionId] });
    qc.invalidateQueries({ queryKey: ["productions-lifecycle"] });
  }

  async function remove() {
    const { error } = await (supabase as any).from("productions").delete().eq("id", productionId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["productions-lifecycle"] });
    navigate({ to: "/producciones/activas" });
  }

  if (prodQ.isLoading || !data) {
    return <div className="p-10 font-display text-muted-foreground">Cargando…</div>;
  }

  const finalized = stage === "finalizada";

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageCrumb label={form.title} />

      <Link
        to={finalized ? "/producciones/finalizadas" : "/producciones/activas"}
        className="inline-flex items-center gap-1 text-xs smallcaps text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {finalized ? "Producciones finalizadas" : "Producciones activas"}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0 flex-1">
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="h-auto border-0 bg-transparent px-0 font-display text-4xl title-caps shadow-none focus-visible:ring-0"
            aria-label="Título de la producción"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${PRODUCTION_STAGE_TONE[stage]}`}>
              {PRODUCTION_STAGE_LABEL[stage]}
            </span>
            {form.project_type && (
              <span className="rounded-sm bg-muted px-2 py-0.5 text-[10px] smallcaps">
                {PRODUCTION_KIND_LABEL[form.project_type]}
              </span>
            )}
            {data.is_historical && (
              <span className="rounded-sm border border-border px-2 py-0.5 text-[10px] smallcaps text-muted-foreground">Histórico</span>
            )}
            <Select
              value={stage}
              onValueChange={(v) => {
                const next = v as ProductionStage;
                if (next === "finalizada") setConfirmFinalize(true);
                else applyStage(next);
              }}
            >
              <SelectTrigger className="h-7 w-[190px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PRODUCTION_STAGE_LABEL) as ProductionStage[]).map((s) => (
                  <SelectItem key={s} value={s}>{PRODUCTION_STAGE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ConfirmDeleteButton
          title="¿Eliminar esta producción?"
          description="Se eliminará la producción y sus vínculos con hitos, tareas y documentos."
          onConfirm={remove}
        />
      </div>

      <Section title="Datos principales">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Tipo</Label>
            <Select value={form.project_type || undefined} onValueChange={(v) => setForm({ ...form, project_type: v as ProductionKind })}>
              <SelectTrigger><SelectValue placeholder="Selecciona tipo…" /></SelectTrigger>
              <SelectContent>
                {Object.entries(PRODUCTION_KIND_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cliente / Productora</Label>
            <Select value={form.partner_company_id || undefined} onValueChange={(v) => setForm({ ...form, partner_company_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent>
                {(companiesQ.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Plataforma</Label>
            <Select value={form.platform_id || undefined} onValueChange={(v) => setForm({ ...form, platform_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent>
                {(platformsQ.data ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Director</Label>
            <Select
              value={form.director_id || undefined}
              onValueChange={(v) => {
                const d = (directorsQ.data ?? []).find((x: any) => x.id === v);
                setForm({ ...form, director_id: v, director: d?.full_name ?? form.director });
              }}
            >
              <SelectTrigger><SelectValue placeholder={form.director || "Selecciona…"} /></SelectTrigger>
              <SelectContent>
                {(directorsQ.data ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>País de producción</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          <div><Label>Idioma original</Label><Input value={form.original_language} onChange={(e) => setForm({ ...form, original_language: e.target.value })} /></div>
          <div><Label>Año de estreno / entrega</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
          <div><Label>Fecha inicio de producción</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><Label>Fecha de entrega estimada</Label><Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} /></div>
          <div><Label>Fecha de entrega real</Label><Input type="date" value={form.actual_delivery_date} onChange={(e) => setForm({ ...form, actual_delivery_date: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <Label>Notas internas</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </Section>

      <Section title="Representados vinculados" description="Compositores y artistas del roster implicados en esta producción. Aparece automáticamente en su ficha y en Filmografía IC.">
        <ProductionRepresentadosEditor productionId={productionId} />
      </Section>

      <Section title="Hitos de entrega" description="Cada hito con fecha se sincroniza con el calendario, capa Producciones.">
        <ProductionMilestonesEditor productionId={productionId} />
      </Section>

      <Section title="Documentos vinculados" description="Presupuestos, deal memos, contratos de obra y adendas de PAPERWORK.">
        <ProductionLinkedDocuments productionId={productionId} />
      </Section>

      <Section title="Oportunidad de origen">
        {data.source_opportunity ? (
          <div className="flex flex-wrap items-center gap-3 rounded-sm border border-border px-3 py-2 text-sm">
            <Link to="/opportunities/$opportunityId" params={{ opportunityId: data.source_opportunity.id }} className="font-display hover:underline">
              {data.source_opportunity.title}
            </Link>
            <span className="text-xs text-muted-foreground">
              {(data.source_opportunity.statuses ?? []).join(", ").replace(/_/g, " ") || "Sin estado"}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Esta producción no procede de una oportunidad registrada.</p>
        )}
      </Section>

      <Section title="Tareas vinculadas">
        <ProductionTasks productionId={productionId} productionTitle={form.title} />
      </Section>

      {isBigC && (
        <Section title="Económico" description="Resumen de solo lectura calculado a partir de PAPERWORK y los sprints de facturación.">
          <ProductionEconomics productionId={productionId} feeAmount={data.fee_amount} commission={data.ic_commission} />
        </Section>
      )}

      <SaveButton floating onClick={save} saving={saving} dirty={dirty} />

      <AlertDialog open={confirmFinalize} onOpenChange={setConfirmFinalize}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar esta producción como finalizada?</AlertDialogTitle>
            <AlertDialogDescription>
              Pasará a Producciones finalizadas y a Filmografía IC.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => applyStage("finalizada")}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}