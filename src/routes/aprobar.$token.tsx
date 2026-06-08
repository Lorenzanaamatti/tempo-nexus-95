import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, FileText, Mail, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { formatMoneyEs } from "@/lib/deal-memo-constants";

export const Route = createFileRoute("/aprobar/$token")({
  component: AprobarPage,
});

// Mock — la verificación real del token y los datos llegan en Bloque 6.
const MOCK = {
  referencia: "DM-IC-2026-047",
  obra: "Documental Atlas — La huella del agua",
  cliente: "Cliente demo",
  importe: 85000,
  moneda: "EUR",
  destinatario_final_email: "destinatario@productora.com",
  email_asunto: "Deal memo · Documental Atlas",
  email_cuerpo: `Hola Cliente demo,

Adjuntamos el deal memo para la composición original de "Documental Atlas — La huella del agua".

• Importe: 85.000 €
• Plazo: 7 días para revisión
• Ámbito: mundial
• Duración: indefinida

Quedamos a la espera de tu validación.

Un saludo,
Equipo Interesante Compañía SL`,
  word_filename: "DM-IC-2026-047_Documental_Atlas.docx",
};

function AprobarPage() {
  const { token } = Route.useParams();
  const [mode, setMode] = useState<"none" | "cambios" | "rechazo">("none");
  const [comentarios, setComentarios] = useState("");

  function submit(action: string) {
    toast.success(`Acción registrada — se implementará en Bloque 6 (${action})`);
    setComentarios("");
    setMode("none");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-foreground/30 bg-foreground/5 font-display text-lg italic">ic</div>
            <div className="leading-tight">
              <p className="text-xs text-muted-foreground">Interesante Compañía SL</p>
              <p className="text-sm font-medium">Revisión solicitada</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-sm border border-border bg-card p-5 shadow-sm">
          <div className="border-b border-border pb-4">
            <p className="font-mono text-xs text-muted-foreground">{MOCK.referencia}</p>
            <h1 className="mt-1 font-display text-2xl">{MOCK.obra}</h1>
            <div className="mt-2 grid gap-1 text-sm md:grid-cols-2">
              <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Cliente: </span>{MOCK.cliente}</div>
              <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Importe: </span><span className="font-medium">{formatMoneyEs(MOCK.importe, MOCK.moneda)}</span></div>
            </div>
          </div>

          <section className="mt-5">
            <h2 className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Mail className="h-3.5 w-3.5" />Email que se enviaría</h2>
            <div className="mt-3 rounded-sm border border-border bg-background p-4">
              <div className="border-b border-border pb-2 text-xs">
                <p><span className="text-muted-foreground">Para: </span>{MOCK.destinatario_final_email}</p>
                <p className="mt-1"><span className="text-muted-foreground">Asunto: </span><span className="font-medium">{MOCK.email_asunto}</span></p>
              </div>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed">{MOCK.email_cuerpo}</pre>
            </div>
          </section>

          <section className="mt-5">
            <h2 className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><FileText className="h-3.5 w-3.5" />Documento adjunto</h2>
            <div className="mt-3 flex items-center justify-between rounded-sm border border-border bg-background p-3">
              <p className="truncate text-sm">{MOCK.word_filename}</p>
              <Button variant="outline" size="sm" onClick={() => toast("Función disponible en Bloque 6")}><FileText className="mr-1 h-4 w-4" />Ver Word</Button>
            </div>
          </section>

          <section className="mt-6 space-y-2">
            <div className="grid gap-2 md:grid-cols-3">
              <Button className="h-12 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => submit("aprobado")}>
                <Check className="mr-2 h-5 w-5" /> Aprobar tal cual
              </Button>
              <Button variant="outline" className="h-12 border-amber-400 text-amber-700 hover:bg-amber-50" onClick={() => setMode(mode === "cambios" ? "none" : "cambios")}>
                <MessageSquare className="mr-2 h-5 w-5" /> Pedir cambios
              </Button>
              <Button variant="outline" className="h-12 border-rose-400 text-rose-700 hover:bg-rose-50" onClick={() => setMode(mode === "rechazo" ? "none" : "rechazo")}>
                <X className="mr-2 h-5 w-5" /> Rechazar
              </Button>
            </div>

            {mode === "cambios" && (
              <div className="rounded-sm border border-amber-400/40 bg-amber-50/50 p-3 dark:bg-amber-950/20">
                <Textarea rows={4} value={comentarios} onChange={(e) => setComentarios(e.target.value)} placeholder="Describe los cambios que necesitas…" />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={() => submit("cambios solicitados")} disabled={!comentarios.trim()}>Enviar correcciones</Button>
                </div>
              </div>
            )}

            {mode === "rechazo" && (
              <div className="rounded-sm border border-rose-400/40 bg-rose-50/50 p-3 dark:bg-rose-950/20">
                <Textarea rows={4} value={comentarios} onChange={(e) => setComentarios(e.target.value)} placeholder="Motivo del rechazo (opcional)…" />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="destructive" onClick={() => submit("rechazado")}>Confirmar rechazo</Button>
                </div>
              </div>
            )}
          </section>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Token: <span className="font-mono">{token}</span> · La verificación real del token se implementará en Bloque 6.
        </p>
      </main>
    </div>
  );
}