import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Inbox, Upload } from "lucide-react";
import {
  OPP_PHASE_LABEL,
  OPP_TYPE_LABEL,
  REPORT_EXAMPLE,
  parseOpportunityIntake,
  type ParsedOpportunity,
} from "@/lib/opportunity-production";
import { upsertProductionOpportunity, type IntakeOutcome } from "@/lib/opportunity-intake";
import { formatEUR0 } from "@/lib/money";

type Preview = { rows: ParsedOpportunity[]; errors: string[]; format: "json" | "report" };

export function OpportunityImportDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [results, setResults] = useState<IntakeOutcome[] | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setText("");
    setPreview(null);
    setResults(null);
  }

  function analyze() {
    const p = parseOpportunityIntake(text);
    setResults(null);
    setPreview(p);
    if (!p.rows.length && !p.errors.length) toast.error("No se ha reconocido ningún proyecto en el texto");
  }

  async function runImport() {
    if (!preview?.rows.length) return;
    setSaving(true);
    const out: IntakeOutcome[] = [];
    for (const row of preview.rows) out.push(await upsertProductionOpportunity(row));
    setSaving(false);
    setResults(out);
    qc.invalidateQueries({ queryKey: ["opportunities"] });
    qc.invalidateQueries({ queryKey: ["production-companies-mini"] });
    qc.invalidateQueries({ queryKey: ["directors-mini"] });
    const ok = out.filter((o) => o.action !== "error").length;
    toast.success(`${ok} de ${out.length} proyectos procesados`);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-sm">
          <Inbox className="mr-1 h-4 w-4" /> Importar novedades
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Importar novedades de producción</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pega el correo diario de proyectos tal cual, o una lista en JSON. Se leen título, tipo, país, presupuesto,
            estado, productora, director, enlace y nota. Antes de guardar verás fila a fila lo que se va a crear.
            Si el proyecto y el director ya existen, la ficha se actualiza en lugar de duplicarse.
          </p>
          <Textarea
            rows={10}
            value={text}
            onChange={(e) => { setText(e.target.value); setPreview(null); setResults(null); }}
            placeholder={REPORT_EXAMPLE}
            className="font-mono text-xs"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {preview ? (preview.format === "json" ? "Formato detectado: JSON" : "Formato detectado: correo de novedades") : ""}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={analyze} disabled={!text.trim()}>Previsualizar</Button>
              <Button onClick={runImport} disabled={!preview?.rows.length || saving}>
                <Upload className="mr-1 h-4 w-4" /> Importar {preview?.rows.length ? `(${preview.rows.length})` : ""}
              </Button>
            </div>
          </div>

          {preview?.errors.length ? (
            <ul className="rounded-sm border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              {preview.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          ) : null}

          {preview?.rows.length ? (
            <div className="overflow-x-auto rounded-sm border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-2 py-1.5 smallcaps">Título</th>
                    <th className="px-2 py-1.5 smallcaps">Tipo</th>
                    <th className="px-2 py-1.5 smallcaps">País</th>
                    <th className="px-2 py-1.5 smallcaps">Presupuesto</th>
                    <th className="px-2 py-1.5 smallcaps">Fase</th>
                    <th className="px-2 py-1.5 smallcaps">Productora</th>
                    <th className="px-2 py-1.5 smallcaps">Director</th>
                    <th className="px-2 py-1.5 smallcaps">Detectado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5">{r.title}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.tipo_produccion ? OPP_TYPE_LABEL[r.tipo_produccion] : "—"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.paises.join(" / ") || "—"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {r.presupuesto_min || r.presupuesto_max
                          ? `${r.presupuesto_min ? formatEUR0(r.presupuesto_min) : "—"} – ${r.presupuesto_max ? formatEUR0(r.presupuesto_max) : "abierto"}`
                          : r.presupuesto_texto || "—"}
                      </td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.fase ? OPP_PHASE_LABEL[r.fase] : "—"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.productoraName || "—"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.directorName || "—"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.detected_date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {results?.length ? (
            <ul className="space-y-1 rounded-sm border border-border p-3 text-xs">
              {results.map((r, i) => (
                <li key={i} className={r.action === "error" ? "text-destructive" : "text-muted-foreground"}>
                  <span className="font-medium text-foreground">{r.title}</span> · {r.action}
                  {r.message ? ` — ${r.message}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
