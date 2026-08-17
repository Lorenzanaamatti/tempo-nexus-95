import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Sparkles, RefreshCw, Loader2, Download, FileText, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { generateDealMemoVersion } from "@/lib/deal-memos.functions";

export function DealMemoVersions({ dm, onChange }: { dm: any; onChange: () => void }) {
  const qc = useQueryClient();
  const generate = useServerFn(generateDealMemoVersion);
  const [busy, setBusy] = useState(false);
  const [comments, setComments] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [modalVersion, setModalVersion] = useState<any | null>(null);

  const versionsQ = useQuery({
    queryKey: ["dm-versions", dm.id],
    queryFn: async () => ((await supabase.from("deal_memo_versiones").select("*").eq("deal_memo_id", dm.id).order("numero_version", { ascending: false })).data ?? []),
  });

  async function regenerate(isCorrection: boolean) {
    if (!dm.plantilla_id) return toast.error("Asigna una plantilla primero");
    if (isCorrection && !comments.trim()) return toast.error("Escribe las correcciones");
    setBusy(true);
    try {
      await generate({ data: { dealMemoId: dm.id, correctionComments: isCorrection ? comments : undefined } });
      toast.success(isCorrection ? "Correcciones aplicadas · nueva versión generada" : "Nueva versión generada");
      setComments("");
      qc.invalidateQueries({ queryKey: ["dm-versions", dm.id] });
      qc.invalidateQueries({ queryKey: ["dm-events", dm.id] });
      onChange();
    } catch (e: any) { toast.error(e?.message ?? "Error"); }
    finally { setBusy(false); }
  }

  const versions = versionsQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-border bg-card p-4">
        <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Generación con IA</h3>
        {!dm.plantilla_id ? (
          <p className="text-sm text-amber-600">Asigna una plantilla en la pestaña Datos para generar versiones.</p>
        ) : versions.length === 0 ? (
          <Button onClick={() => regenerate(false)} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            Generar primera versión
          </Button>
        ) : (
          <div className="space-y-2">
            <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Correcciones para la siguiente versión…" />
            <div className="flex gap-2">
              <Button onClick={() => regenerate(false)} disabled={busy} variant="outline" size="sm">
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
                Regenerar
              </Button>
              <Button onClick={() => regenerate(true)} disabled={busy || !comments.trim()} size="sm">
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                Pedir correcciones
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {busy
                ? "Generando con IA… puede tardar unos segundos."
                : comments.trim()
                  ? "Se creará una nueva versión aplicando estas correcciones."
                  : "Escribe las correcciones para activar el botón."}
            </p>
          </div>
        )}
      </div>

      {versionsQ.isLoading ? <Skeleton className="h-32" /> :
       versions.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 h-6 w-6 opacity-50" />
          Aún no hay versiones generadas
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((v: any) => {
            const open = openId === v.id;
            return (
              <div key={v.id} className="rounded-sm border border-border bg-card">
                <button onClick={() => setOpenId(open ? null : v.id)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="rounded-sm bg-foreground px-2 py-0.5 text-[10px] uppercase tracking-wider text-background">v{v.numero_version}</span>
                    <span className="text-sm font-medium">{v.email_asunto}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{v.generada_por === "agente_ia" ? "IA" : "Corrección humana"} · {formatDistanceToNow(new Date(v.created_at), { locale: es, addSuffix: true })}</span>
                </button>
                {open && (
                  <div className="border-t border-border px-4 py-3">
                    {v.comentarios_revision && (
                      <p className="mb-3 rounded-sm border-l-2 border-amber-500 bg-amber-500/10 px-3 py-2 text-xs italic">
                        Correcciones aplicadas: {v.comentarios_revision}
                      </p>
                    )}
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{v.email_cuerpo}</pre>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setModalVersion({ ...v, _editing: false })}>Ver completo</Button>
                      <Button size="sm" variant="outline" onClick={() => setModalVersion({ ...v, _editing: true })}><Pencil className="mr-1 h-4 w-4" />Editar y guardar como nueva versión</Button>
                      <Button size="sm" variant="outline" onClick={() => toast("Función disponible en Bloque 5")}><Download className="mr-1 h-4 w-4" />Descargar .docx</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <VersionModal
        version={modalVersion}
        onClose={() => setModalVersion(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["dm-versions", dm.id] });
          qc.invalidateQueries({ queryKey: ["dm-events", dm.id] });
          setModalVersion(null);
        }}
        dealMemoId={dm.id}
      />
    </div>
  );
}

function VersionModal({ version, onClose, onSaved, dealMemoId }: { version: any; onClose: () => void; onSaved: () => void; dealMemoId: string }) {
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (version) {
      setAsunto(version.email_asunto ?? "");
      setCuerpo(version.email_cuerpo ?? "");
      setEditing(!!version._editing);
    }
  }, [version]);

  async function save() {
    if (!asunto.trim() || !cuerpo.trim()) return toast.error("Asunto y cuerpo son obligatorios");
    setSaving(true);
    try {
      const { data: maxRow } = await supabase
        .from("deal_memo_versiones")
        .select("numero_version")
        .eq("deal_memo_id", dealMemoId)
        .order("numero_version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNumber = (maxRow?.numero_version ?? 0) + 1;
      const { error } = await supabase.from("deal_memo_versiones").insert({
        deal_memo_id: dealMemoId,
        numero_version: nextNumber,
        email_asunto: asunto,
        email_cuerpo: cuerpo,
        generada_por: "correccion_humana",
        comentarios_revision: `Editado manualmente sobre v${version.numero_version}`,
      });
      if (error) throw error;
      toast.success(`Versión v${nextNumber} guardada`);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!version} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Versión {version?.numero_version} {editing && <span className="ml-2 text-xs font-normal text-muted-foreground">(editando — se guardará como nueva versión)</span>}
          </DialogTitle>
        </DialogHeader>
        {version && (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Asunto</p>
              {editing ? (
                <Input value={asunto} onChange={(e) => setAsunto(e.target.value)} className="mt-1" />
              ) : (
                <p className="text-sm font-medium">{version.email_asunto}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cuerpo</p>
              {editing ? (
                <Textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={20} className="mt-1 font-sans text-sm leading-relaxed" />
              ) : (
                <pre className="mt-1 max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-sm border border-border bg-muted/30 p-3 font-sans text-sm leading-relaxed">{version.email_cuerpo}</pre>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>Cancelar edición</Button>
                  <Button size="sm" onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    Guardar como v{(version.numero_version ?? 0) + 1}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1 h-4 w-4" />Editar</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
