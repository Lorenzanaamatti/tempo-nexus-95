import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/deal-memos/plantillas/$plantillaId")({
  component: PlantillaEditor,
});

function PlantillaEditor() {
  const { plantillaId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["dm-plantilla", plantillaId],
    queryFn: async () => (await supabase.from("dm_plantillas").select("*").eq("id", plantillaId).single()).data,
  });

  useEffect(() => { if (q.data) setForm(q.data); }, [q.data]);

  async function save() {
    if (!form?.nombre?.trim()) return toast.error("El nombre es obligatorio");
    setSaving(true);
    const { error } = await supabase.from("dm_plantillas").update({
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      email_asunto_template: form.email_asunto_template,
      email_cuerpo_template: form.email_cuerpo_template,
      email_firma: form.email_firma,
      instrucciones_para_agente: form.instrucciones_para_agente,
      activa: form.activa,
    }).eq("id", plantillaId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Plantilla guardada");
    qc.invalidateQueries({ queryKey: ["dm-plantillas"] });
  }

  async function handleFile(file: File) {
    const path = `plantillas/${plantillaId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("composer-assets").upload(path, file);
    if (error) return toast.error("No se pudo subir: " + error.message);
    const { data: signed } = await supabase.storage.from("composer-assets").createSignedUrl(path, 60 * 60 * 24 * 365);
    setForm({ ...form, word_template_url: signed?.signedUrl ?? path });
    toast.success("Archivo subido");
  }

  if (q.isLoading || !form) return <div className="mx-auto max-w-[900px] px-6 py-6"><Skeleton className="h-[500px]" /></div>;

  return (
    <div className="mx-auto max-w-[900px] px-6 py-6">
      <Link to="/deal-memos/plantillas" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Plantillas
      </Link>
      <div className="space-y-4">
        <div className="space-y-3 rounded-sm border border-border bg-card p-4">
          <div><Label className="text-xs">Nombre *</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
          <div><Label className="text-xs">Descripción</Label><Textarea rows={2} value={form.descripcion ?? ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={form.activa} onCheckedChange={(v) => setForm({ ...form, activa: v })} />
            <Label className="text-xs">Plantilla activa (disponible para nuevos deal memos)</Label>
          </div>
        </div>

        <div className="space-y-3 rounded-sm border border-border bg-card p-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Email</h3>
          <div>
            <Label className="text-xs">Asunto del email</Label>
            <Input value={form.email_asunto_template} onChange={(e) => setForm({ ...form, email_asunto_template: e.target.value })} />
            <p className="mt-1 text-[11px] text-muted-foreground">Puedes usar <code>{"{{obra}}"}</code>, <code>{"{{cliente}}"}</code>, <code>{"{{contraparte}}"}</code>, <code>{"{{importe}}"}</code>.</p>
          </div>
          <div>
            <Label className="text-xs">Cuerpo del email</Label>
            <Textarea rows={8} value={form.email_cuerpo_template} onChange={(e) => setForm({ ...form, email_cuerpo_template: e.target.value })} className="font-mono text-xs" />
          </div>
          <div>
            <Label className="text-xs">Firma (HTML básico permitido)</Label>
            <Textarea rows={4} value={form.email_firma} onChange={(e) => setForm({ ...form, email_firma: e.target.value })} className="font-mono text-xs" />
          </div>
        </div>

        <div className="space-y-3 rounded-sm border border-border bg-card p-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Plantilla Word (.docx)</h3>
          <div className="flex items-center gap-2">
            <Input type="file" accept=".docx" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {form.word_template_url && <a href={form.word_template_url} target="_blank" rel="noreferrer" className="text-xs underline">Ver actual</a>}
          </div>
        </div>

        <div className="space-y-2 rounded-sm border border-border bg-card p-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Instrucciones para el agente IA</h3>
          <p className="text-[11px] text-muted-foreground">
            Sé específico: tono, cláusulas a incluir, longitud aproximada, estructura.
          </p>
          <Textarea rows={6} value={form.instrucciones_para_agente} onChange={(e) => setForm({ ...form, instrucciones_para_agente: e.target.value })} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/deal-memos/plantillas" })}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </div>
    </div>
  );
}