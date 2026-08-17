import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageCrumb } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatDateEs } from "@/lib/dates";
import { extractVariables, optionLabel, TEMPLATE_IDIOMAS, TEMPLATE_TIPOS } from "@/lib/comunicacion-model";
import { EmptyState } from "@/components/list-states";
import { toast } from "sonner";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/_admin/templates/$templateId")({
  component: TemplateDetail,
});

function TemplateDetail() {
  const { templateId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nombre: "", descripcion: "", contenido: "" });
  const [saving, setSaving] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["template", templateId],
    queryFn: async () => {
      const { data, error } = await db.from("templates").select("*").eq("id", templateId).maybeSingle();
      if (error) throw error;
      return data as Record<string, any> | null;
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      nombre: data.nombre ?? "",
      descripcion: data.descripcion ?? "",
      contenido: data.contenido ?? "",
    });
  }, [data]);

  async function save() {
    if (!form.nombre.trim()) return toast.error("El nombre es obligatorio");
    setSaving(true);
    const { error } = await db.from("templates").update({
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      contenido: form.contenido,
    }).eq("id", templateId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Plantilla guardada");
    qc.invalidateQueries({ queryKey: ["template", templateId] });
    qc.invalidateQueries({ queryKey: ["templates"] });
  }

  async function remove() {
    const { error } = await db.from("templates").delete().eq("id", templateId);
    if (error) return toast.error(error.message);
    toast.success("Plantilla eliminada");
    qc.invalidateQueries({ queryKey: ["templates"] });
    navigate({ to: "/templates" });
  }

  if (isLoading) return <div className="p-10 font-display text-muted-foreground">Cargando…</div>;
  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <EmptyState title="Plantilla no encontrada" description="Puede que se haya eliminado." action={{ label: "Volver a plantillas", to: "/templates" }} />
      </div>
    );
  }

  const variables = extractVariables(String(form.contenido ?? ""));

  function usar() {
    const draft = {
      templateId,
      nombre: data!.nombre,
      tipo: data!.tipo,
      contenido: data!.contenido,
      variables,
      createdAt: new Date().toISOString(),
    };
    try { sessionStorage.setItem("paperwork:draft", JSON.stringify(draft)); } catch { /* ignore */ }
    toast.success("Borrador preparado en Paperwork");
    const dest = String(data!.tipo).includes("presupuesto")
      ? "/paperwork/presupuestos"
      : String(data!.tipo).includes("deal_memo")
        ? "/paperwork/deal-memos"
        : String(data!.tipo).includes("adenda")
          ? "/paperwork/adendas"
          : String(data!.tipo).startsWith("email")
            ? "/comunicacion/publicaciones"
            : "/paperwork/otros";
    navigate({ to: dest });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <PageCrumb label={data.nombre} />
          <h1 className="mt-1 font-display text-4xl title-caps">{data.nombre}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="rounded-sm">{optionLabel(TEMPLATE_TIPOS, data.tipo)}</Badge>
            <Badge variant="outline" className="rounded-sm">{optionLabel(TEMPLATE_IDIOMAS, data.idioma)}</Badge>
            {data.uso_agentes && <Badge className="rounded-sm">Agentes IA</Badge>}
            {(data.agente_autorizado ?? []).map((a: string) => (
              <Badge key={a} variant="outline" className="rounded-sm">{a}</Badge>
            ))}
            <span>Actualizada {formatDateEs(data.updated_at)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/templates">Volver</Link></Button>
          <Button onClick={usar}>Usar plantilla</Button>
          <ConfirmDeleteButton
            onConfirm={remove}
            title={`¿Eliminar la plantilla "${data.nombre}"?`}
            description="Se eliminará la plantilla de forma permanente."
          />
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} /></div>
        <div><Label>Descripción</Label><Input value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} /></div>
      </div>

      <div className="mb-6">
        <p className="smallcaps mb-2 text-xs text-muted-foreground">Variables detectadas</p>
        {variables.length ? (
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => <Badge key={v} variant="outline" className="rounded-sm font-mono text-[10px]">{`{{${v}}}`}</Badge>)}
          </div>
        ) : <p className="text-sm text-muted-foreground">Sin variables.</p>}
      </div>

      <div>
        <p className="smallcaps mb-2 text-xs text-muted-foreground">Contenido</p>
        <Textarea
          value={form.contenido}
          rows={18}
          onChange={(e) => setForm((p) => ({ ...p, contenido: e.target.value }))}
          className="font-mono text-xs leading-relaxed"
        />
      </div>
    </div>
  );
}
