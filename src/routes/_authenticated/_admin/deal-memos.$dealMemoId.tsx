import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { generateDealMemoVersion } from "@/lib/deal-memos.functions";
import { formatDateEs } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/_admin/deal-memos/$dealMemoId")({
  component: DealMemoDetail,
});

function DealMemoDetail() {
  const { dealMemoId } = Route.useParams();
  const qc = useQueryClient();
  const generate = useServerFn(generateDealMemoVersion);
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);

  const dmQ = useQuery({
    queryKey: ["deal-memo", dealMemoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_memos")
        .select("*, plantilla:dm_plantillas(id, nombre, activa)")
        .eq("id", dealMemoId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const versionsQ = useQuery({
    queryKey: ["deal-memo-versions", dealMemoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_memo_versiones")
        .select("*")
        .eq("deal_memo_id", dealMemoId)
        .order("numero_version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const eventsQ = useQuery({
    queryKey: ["deal-memo-events", dealMemoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_memo_eventos")
        .select("id, tipo_evento, actor_email, payload, created_at")
        .eq("deal_memo_id", dealMemoId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function handleGenerate(isCorrection: boolean) {
    if (isCorrection && !comments.trim()) {
      toast.error("Describe las correcciones primero");
      return;
    }
    setBusy(true);
    try {
      await generate({
        data: {
          dealMemoId,
          correctionComments: isCorrection ? comments.trim() : undefined,
        },
      });
      toast.success(isCorrection ? "Nueva versión con correcciones" : "Nueva versión generada");
      setComments("");
      qc.invalidateQueries({ queryKey: ["deal-memo", dealMemoId] });
      qc.invalidateQueries({ queryKey: ["deal-memo-versions", dealMemoId] });
      qc.invalidateQueries({ queryKey: ["deal-memo-events", dealMemoId] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al generar la versión";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  if (dmQ.isLoading) return <p className="p-10 text-muted-foreground">Cargando…</p>;
  if (dmQ.error || !dmQ.data) return <p className="p-10 text-rose-600">No se pudo cargar el deal memo</p>;

  const dm = dmQ.data as any;
  const hasVersion = (versionsQ.data ?? []).length > 0;

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <Link to="/deal-memos" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Deal memos
      </Link>

      <div className="mb-6 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">{dm.referencia}</p>
        <h1 className="mt-1 font-display text-4xl">{dm.obra}</h1>
        <div className="mt-2 grid gap-1 text-sm text-muted-foreground md:grid-cols-2">
          <div><span className="smallcaps text-[10px]">Estado:</span> {dm.estado.replace(/_/g, " ")}</div>
          <div><span className="smallcaps text-[10px]">Destinatario:</span> {dm.destinatario_final_email}</div>
          {dm.importe_propuesto && <div><span className="smallcaps text-[10px]">Importe:</span> {dm.importe_propuesto} {dm.moneda}</div>}
          {dm.plantilla && <div><span className="smallcaps text-[10px]">Plantilla:</span> {dm.plantilla.nombre}</div>}
        </div>
        {dm.descripcion_uso && (
          <p className="mt-3 text-sm">{dm.descripcion_uso}</p>
        )}
      </div>

      <section className="mb-6 rounded-sm border border-border bg-card p-4">
        <h2 className="mb-2 font-display text-lg">Generación con IA</h2>
        {!dm.plantilla_id ? (
          <p className="text-sm text-amber-600">Asigna una plantilla a este deal memo para poder generar versiones.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleGenerate(false)} disabled={busy}>
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                {hasVersion ? "Regenerar (nueva versión)" : "Generar primera versión"}
              </Button>
            </div>
            {hasVersion && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <p className="smallcaps text-[10px] text-muted-foreground">Solicitar correcciones sobre la última versión</p>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Ej: rebaja el tono, sube el importe a 8.000€, añade cláusula de exclusividad..."
                  rows={3}
                />
                <Button variant="outline" onClick={() => handleGenerate(true)} disabled={busy || !comments.trim()}>
                  {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
                  Pedir correcciones y regenerar
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 font-display text-lg">Versiones</h2>
        {(versionsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay versiones generadas.</p>
        ) : (
          <div className="space-y-3">
            {(versionsQ.data ?? []).map((v: any) => (
              <div key={v.id} className="rounded-sm border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-sm bg-foreground px-2 py-0.5 text-[10px] uppercase tracking-wider text-background">v{v.numero_version}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {v.generada_por === "agente_ia" ? "IA" : "Corrección humana"}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatDateEs(v.created_at)}</span>
                </div>
                {v.comentarios_revision && (
                  <p className="mb-2 rounded-sm border-l-2 border-amber-500 bg-amber-500/5 px-2 py-1 text-xs italic text-muted-foreground">
                    Correcciones pedidas: {v.comentarios_revision}
                  </p>
                )}
                <p className="text-xs font-semibold text-muted-foreground">ASUNTO</p>
                <p className="mb-2 text-sm">{v.email_asunto}</p>
                <p className="text-xs font-semibold text-muted-foreground">CUERPO</p>
                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{v.email_cuerpo}</pre>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg">Auditoría</h2>
        {(eventsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin eventos.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {(eventsQ.data ?? []).map((e: any) => (
              <li key={e.id} className="flex items-center gap-2 text-muted-foreground">
                <span className="font-mono">{formatDateEs(e.created_at)}</span>
                <span className="rounded-sm border border-border px-1.5 py-[1px] text-[10px] uppercase tracking-wider">
                  {e.tipo_evento.replace(/_/g, " ")}
                </span>
                {e.actor_email && <span>· {e.actor_email}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}