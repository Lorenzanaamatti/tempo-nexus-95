import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageCrumb } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const { data, isLoading } = useQuery({
    queryKey: ["template", templateId],
    queryFn: async () => {
      const { data, error } = await db.from("templates").select("*").eq("id", templateId).maybeSingle();
      if (error) throw error;
      return data as Record<string, any> | null;
    },
  });

  if (isLoading) return <div className="p-10 font-display text-muted-foreground">Cargando…</div>;
  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <EmptyState title="Plantilla no encontrada" description="Puede que se haya eliminado." action={{ label: "Volver a plantillas", to: "/templates" }} />
      </div>
    );
  }

  const variables = extractVariables(String(data.contenido ?? ""));

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
        </div>
      </div>

      {data.descripcion && <p className="mb-6 text-sm text-muted-foreground">{data.descripcion}</p>}

      <div className="mb-6">
        <p className="smallcaps mb-2 text-xs text-muted-foreground">Variables detectadas</p>
        {variables.length ? (
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => <Badge key={v} variant="outline" className="rounded-sm font-mono text-[10px]">{`{{${v}}}`}</Badge>)}
          </div>
        ) : <p className="text-sm text-muted-foreground">Sin variables.</p>}
      </div>

      <div>
        <p className="smallcaps mb-2 text-xs text-muted-foreground">Vista previa</p>
        <pre className="whitespace-pre-wrap rounded-sm border border-border bg-muted/20 p-4 font-mono text-xs leading-relaxed">
          {data.contenido || "—"}
        </pre>
      </div>
    </div>
  );
}
