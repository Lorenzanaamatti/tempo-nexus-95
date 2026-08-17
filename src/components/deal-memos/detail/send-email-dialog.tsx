import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Mode = "reenvio" | "reminder";

export function SendEmailDialog({
  dm,
  mode,
  open,
  onOpenChange,
  onSent,
}: {
  dm: any;
  mode: Mode;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSent?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [to, setTo] = useState("");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setTo(dm.destinatario_final_email ?? "");
    supabase
      .from("deal_memo_versiones")
      .select("numero_version, email_asunto, email_cuerpo")
      .eq("deal_memo_id", dm.id)
      .order("numero_version", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const base = data?.email_asunto ?? `Deal memo ${dm.referencia} · ${dm.obra}`;
        setAsunto(mode === "reminder" ? `Recordatorio · ${base}` : base);
        setCuerpo(data?.email_cuerpo ?? "");
        setLoading(false);
      });
  }, [open, dm.id, dm.referencia, dm.obra, dm.destinatario_final_email, mode]);

  async function logEvent(tipo: string) {
    await supabase.from("deal_memo_eventos").insert({
      deal_memo_id: dm.id,
      tipo_evento: tipo,
      payload: { destinatario: to, asunto },
    });
    onSent?.();
  }

  async function copyAll() {
    await navigator.clipboard.writeText(`Para: ${to}\nAsunto: ${asunto}\n\n${cuerpo}`);
    toast.success("Email copiado al portapapeles");
    await logEvent("email_copiado");
  }

  async function openMail() {
    if (!to.trim()) return toast.error("Falta el destinatario");
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.open(href, "_blank");
    toast.success("Abriendo tu cliente de correo");
    await logEvent(mode === "reminder" ? "reminder_enviado" : "email_reenviado");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "reminder" ? "Enviar recordatorio" : "Reenviar email"}</DialogTitle>
          <DialogDescription>
            Revisa el contenido y ábrelo en tu cliente de correo o cópialo. Queda registrado en el log del deal memo.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando última versión…
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Para</p>
              <Input value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" placeholder="destinatario@email.com" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Asunto</p>
              <Input value={asunto} onChange={(e) => setAsunto(e.target.value)} className="mt-1" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cuerpo</p>
              <Textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={14} className="mt-1 font-sans text-sm leading-relaxed" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={copyAll}><Copy className="mr-1 h-4 w-4" />Copiar</Button>
              <Button size="sm" onClick={openMail}><Mail className="mr-1 h-4 w-4" />Abrir en correo</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
