import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowRight, ChevronRight, Sparkles, RefreshCw, Loader2, MoreHorizontal, Copy, Ban, Download, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDateEs } from "@/lib/dates";
import { buildNextReference, type DealMemoEstado } from "@/lib/deal-memo-constants";
import { EstadoBadge } from "@/components/deal-memos/estado-badge";
import { generateDealMemoVersion } from "@/lib/deal-memos.functions";
import { SendEmailDialog } from "@/components/deal-memos/detail/send-email-dialog";

export function DealMemoHeader({ dm, onChange }: { dm: any; onChange: () => void }) {
  const qc = useQueryClient();
  const generate = useServerFn(generateDealMemoVersion);
  const [busy, setBusy] = useState(false);
  const [emailMode, setEmailMode] = useState<"reenvio" | "reminder" | null>(null);

  const allRefsQ = useQuery({
    queryKey: ["dm-refs-min"],
    queryFn: async () => ((await supabase.from("deal_memos").select("referencia")).data ?? []).map((r) => r.referencia as string),
  });

  async function duplicate() {
    const refs = allRefsQ.data ?? [];
    const next = buildNextReference(refs);
    const { data: ins, error } = await supabase.from("deal_memos").insert({
      referencia: next,
      obra: dm.obra + " (copia)",
      descripcion_uso: dm.descripcion_uso,
      cliente_id: dm.cliente_id,
      cliente_kind: dm.cliente_kind,
      contraparte_id: dm.contraparte_id,
      contraparte_kind: dm.contraparte_kind,
      importe_propuesto: dm.importe_propuesto,
      moneda: dm.moneda,
      plantilla_id: dm.plantilla_id,
      validador_interno_id: dm.validador_interno_id,
      validador_final_id: dm.validador_final_id,
      destinatario_final_email: dm.destinatario_final_email,
      plazo_respuesta_dias: dm.plazo_respuesta_dias,
      notas_internas: dm.notas_internas,
    }).select("id").single();
    if (error || !ins) return toast.error(error?.message ?? "Error");
    await supabase.from("deal_memo_eventos").insert({ deal_memo_id: ins.id, tipo_evento: "creado", payload: { duplicado_de: dm.id } });
    toast.success(`Duplicado como ${next}`);
  }

  async function cancelDm() {
    if (!confirm("¿Cancelar este deal memo?")) return;
    const { error } = await supabase.from("deal_memos").update({ estado: "cancelado" }).eq("id", dm.id);
    if (error) return toast.error(error.message);
    await supabase.from("deal_memo_eventos").insert({ deal_memo_id: dm.id, tipo_evento: "cerrado", payload: { motivo: "cancelado_desde_ficha" } });
    toast.success("Cancelado");
    onChange();
  }

  async function aiGenerate() {
    if (!dm.plantilla_id) return toast.error("Asigna una plantilla primero");
    setBusy(true);
    try {
      await generate({ data: { dealMemoId: dm.id } });
      toast.success("Versión generada");
      qc.invalidateQueries({ queryKey: ["dm-versions", dm.id] });
      qc.invalidateQueries({ queryKey: ["dm-events", dm.id] });
      onChange();
    } catch (e: any) { toast.error(e?.message ?? "Error generando"); }
    finally { setBusy(false); }
  }

  const estado = dm.estado as DealMemoEstado;

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-[1100px] px-6 py-4">
        <nav className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/deal-memos" className="hover:text-foreground">Dashboard</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/deal-memos/lista" className="hover:text-foreground">Deal Memos</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-mono text-foreground">{dm.referencia}</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl">{dm.obra}</h2>
              <EstadoBadge estado={estado} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{dm.referencia}</span>
              <span className="mx-2">·</span>
              {dm.cliente?.nombre ?? "Sin cliente"}
              <ArrowRight className="mx-1 inline h-3 w-3" />
              {dm.contraparte?.nombre ?? "Sin contraparte"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ContextualActions dm={dm} busy={busy} onAiGenerate={aiGenerate} onEmail={setEmailMode} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={duplicate}><Copy className="mr-2 h-4 w-4" />Duplicar</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast("Función disponible en Bloque 5")}><Download className="mr-2 h-4 w-4" />Exportar log</DropdownMenuItem>
                <DropdownMenuItem onSelect={cancelDm} className="text-rose-600"><Ban className="mr-2 h-4 w-4" />Cancelar deal memo</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <SendEmailDialog
        dm={dm}
        mode={emailMode ?? "reenvio"}
        open={!!emailMode}
        onOpenChange={(o) => !o && setEmailMode(null)}
        onSent={() => {
          qc.invalidateQueries({ queryKey: ["dm-events", dm.id] });
          onChange();
        }}
      />
    </div>
  );
}

function ContextualActions({ dm, busy, onAiGenerate, onEmail }: { dm: any; busy: boolean; onAiGenerate: () => void; onEmail: (m: "reenvio" | "reminder") => void }) {
  const estado = dm.estado as DealMemoEstado;
  if (estado === "borrador") {
    return (
      <Button onClick={onAiGenerate} disabled={busy} size="sm">
        {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
        Generar draft con IA
      </Button>
    );
  }
  if (estado === "generando") {
    return <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Generando…</span>;
  }
  if (estado === "revision_interna") {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">⏳ Esperando revisión de {dm.validador_interno?.nombre ?? "—"}</span>
        <Button variant="outline" size="sm" onClick={() => toast("Función disponible en Bloque 6")}><Mail className="mr-1 h-4 w-4" />Reenviar email</Button>
      </div>
    );
  }
  if (estado === "corrigiendo") {
    return <Button size="sm" onClick={onAiGenerate} disabled={busy}><RefreshCw className="mr-1 h-4 w-4" />Generar nueva versión</Button>;
  }
  if (estado === "revision_final") {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">⏳ Esperando aprobación de {dm.validador_final?.nombre ?? "—"}</span>
        <Button variant="outline" size="sm" onClick={() => toast("Función disponible en Bloque 6")}><Mail className="mr-1 h-4 w-4" />Reenviar email</Button>
      </div>
    );
  }
  if (estado === "enviado") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Enviado el {formatDateEs(dm.fecha_envio)} · Plazo: {formatDateEs(dm.fecha_limite_respuesta)}
        </span>
        <Button variant="outline" size="sm" onClick={() => toast("Función disponible en Bloque 6")}><Send className="mr-1 h-4 w-4" />Enviar reminder</Button>
      </div>
    );
  }
  if (estado === "respondido") {
    return <Button size="sm" onClick={() => toast("Función disponible en Bloque 5")}><Sparkles className="mr-1 h-4 w-4" />Procesar respuesta con IA</Button>;
  }
  return null;
}
