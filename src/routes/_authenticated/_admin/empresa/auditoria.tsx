import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck, Loader2, AlertTriangle } from "lucide-react";

import { runOpenAiAudit } from "@/lib/auditoria.functions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_admin/empresa/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoría IA — Interesante Compañía" },
      { name: "description", content: "Auditoría operativa del CRM con la plataforma OpenAI." },
      { property: "og:title", content: "Auditoría IA — Interesante Compañía" },
      { property: "og:description", content: "Auditoría operativa del CRM con la plataforma OpenAI." },
    ],
  }),
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const runAudit = useServerFn(runOpenAiAudit);
  const mutation = useMutation({ mutationFn: () => runAudit() });
  const result = mutation.data;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="AUDITORÍA IA"
        description="Análisis operativo del CRM realizado con la plataforma OpenAI. Solo BIG C."
      />

      <div className="rounded-lg border border-border bg-card p-6 space-y-4 max-w-3xl">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            La auditoría resume las métricas del CRM (roster, cuentas objetivo, deal memos,
            producciones y tareas) y la plataforma OpenAI devuelve salud general, riesgos y
            recomendaciones.
          </p>
        </div>

        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Ejecutando auditoría…
            </>
          ) : (
            "Ejecutar auditoría"
          )}
        </Button>

        {mutation.isError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="size-4 mt-0.5 text-destructive" />
            <span>{(mutation.error as Error).message}</span>
          </div>
        )}

        {result && !result.ok && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="size-4 mt-0.5 text-amber-600" />
            <span>{result.error}</span>
          </div>
        )}

        {result?.ok && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Auditoría generada el {new Date(result.auditedAt).toLocaleString("es-ES")}
            </p>
            <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-4 text-sm leading-relaxed">
              {result.report}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
