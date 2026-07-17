import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Download, GripVertical } from "lucide-react";
import { uploadMarketingAsset, signMarketingAsset, deleteMarketingAsset } from "@/lib/marketing-upload";

export const Route = createFileRoute("/_authenticated/_admin/marketing/brand/")({
  component: BrandIndex,
});

type Section = { id: string; section: string; body_md: string | null; position: number; version: string | null };
type Asset = { id: string; title: string; kind: string | null; storage_path: string | null; external_url: string | null; notes: string | null; position: number };
type AssetFile = { id: string; asset_id: string; storage_path: string; filename: string | null; notes: string | null; position: number; created_at: string };

function BrandIndex() {
  const qc = useQueryClient();

  const sectionsQ = useQuery({
    queryKey: ["brand-guidelines"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brand_guidelines").select("*").order("position");
      if (error) throw error;
      return (data ?? []) as Section[];
    },
  });

  const assetsQ = useQuery({
    queryKey: ["brand-assets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brand_assets").select("*").order("position");
      if (error) throw error;
      return (data ?? []) as Asset[];
    },
  });

  async function addSection() {
    const name = prompt("Título de la sección (p. ej. Logo, Tipografía, Tono de voz):");
    if (!name?.trim()) return;
    const max = (sectionsQ.data ?? []).reduce((m, s) => Math.max(m, s.position), -1);
    const { error } = await (supabase as any).from("brand_guidelines").insert({ section: name.trim(), position: max + 1 });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["brand-guidelines"] });
  }

  async function addAsset() {
    const title = prompt("Nombre del recurso (p. ej. Logo SVG, Manual completo):");
    if (!title?.trim()) return;
    const max = (assetsQ.data ?? []).reduce((m, a) => Math.max(m, a.position), -1);
    const { error } = await (supabase as any).from("brand_assets").insert({ title: title.trim(), position: max + 1 });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["brand-assets"] });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Marketing y Ventas</p>
        <h1 className="mt-1 font-display text-5xl">Identidad corporativa</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Identidad visual, tono de voz y recursos descargables de Interesante Compañía. La fuente única de verdad para cualquier comunicación.
        </p>
      </div>

      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Secciones</h2>
          <Button size="sm" onClick={addSection}><Plus className="mr-1 h-4 w-4" /> Nueva sección</Button>
        </div>
        {!sectionsQ.data?.length ? (
          <p className="rounded-sm border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aún no hay secciones del libro de estilo. Empieza por "Logo", "Color", "Tipografía", "Tono de voz"…
          </p>
        ) : (
          <ul className="space-y-4">
            {sectionsQ.data.map((s) => <SectionRow key={s.id} item={s} />)}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Recursos descargables</h2>
          <Button size="sm" onClick={addAsset}><Plus className="mr-1 h-4 w-4" /> Nuevo recurso</Button>
        </div>
        {!assetsQ.data?.length ? (
          <p className="rounded-sm border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Sube logos, paletas, tipografías y el manual completo para que el equipo y los partners los descarguen.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {assetsQ.data.map((a) => <AssetRow key={a.id} item={a} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function SectionRow({ item }: { item: Section }) {
  const qc = useQueryClient();
  const [s, setS] = useState(item);
  const [saving, setSaving] = useState(false);
  useEffect(() => setS(item), [item]);

  async function save() {
    setSaving(true);
    const { error } = await (supabase as any).from("brand_guidelines").update({
      section: s.section, body_md: s.body_md, version: s.version,
    }).eq("id", s.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Sección guardada");
    qc.invalidateQueries({ queryKey: ["brand-guidelines"] });
  }
  async function remove() {
    if (!confirm("¿Eliminar esta sección?")) return;
    const { error } = await (supabase as any).from("brand_guidelines").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["brand-guidelines"] });
  }

  return (
    <li className="glass-panel rounded-sm border border-border p-4">
      <div className="mb-3 flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <Input value={s.section} onChange={(e) => setS({ ...s, section: e.target.value })} className="font-display text-lg" />
        <Input value={s.version ?? ""} onChange={(e) => setS({ ...s, version: e.target.value || null })} placeholder="v" className="w-20" />
      </div>
      <Textarea
        rows={5}
        value={s.body_md ?? ""}
        onChange={(e) => setS({ ...s, body_md: e.target.value || null })}
        placeholder="Contenido en markdown: principios, normas, ejemplos correctos e incorrectos…"
      />
      <div className="mt-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive"><Trash2 className="mr-1 h-3 w-3" /> Eliminar</Button>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
      </div>
    </li>
  );
}

function AssetRow({ item }: { item: Asset }) {
  const qc = useQueryClient();
  const [a, setA] = useState(item);
  const [uploading, setUploading] = useState(false);
  useEffect(() => setA(item), [item]);

  async function save() {
    const { error } = await (supabase as any).from("brand_assets").update({
      title: a.title, kind: a.kind, external_url: a.external_url, notes: a.notes,
    }).eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    qc.invalidateQueries({ queryKey: ["brand-assets"] });
  }
  async function remove() {
    if (!confirm("¿Eliminar este recurso?")) return;
    if (a.storage_path) await deleteMarketingAsset(a.storage_path).catch(() => {});
    const { error } = await (supabase as any).from("brand_assets").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["brand-assets"] });
  }
  async function onFile(file: File) {
    setUploading(true);
    try {
      if (a.storage_path) await deleteMarketingAsset(a.storage_path).catch(() => {});
      const path = await uploadMarketingAsset("brand", file);
      const { error } = await (supabase as any).from("brand_assets").update({ storage_path: path }).eq("id", a.id);
      if (error) throw error;
      setA({ ...a, storage_path: path });
      toast.success("Subido");
    } catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setUploading(false); }
  }
  async function download() {
    if (!a.storage_path) return;
    const url = await signMarketingAsset(a.storage_path);
    if (url) window.open(url, "_blank");
  }

  return (
    <li className="glass-panel rounded-sm border border-border p-4">
      <Input value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} className="mb-2 font-display" />
      <Input value={a.kind ?? ""} onChange={(e) => setA({ ...a, kind: e.target.value || null })} placeholder="Tipo (logo, tipografía, color…)" className="mb-2 text-sm" />
      <Input value={a.external_url ?? ""} onChange={(e) => setA({ ...a, external_url: e.target.value || null })} placeholder="URL externa (opcional)" className="mb-2 text-sm" />
      <Textarea rows={2} value={a.notes ?? ""} onChange={(e) => setA({ ...a, notes: e.target.value || null })} placeholder="Notas de uso" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {a.storage_path && <Button size="sm" variant="outline" onClick={download}><Download className="mr-1 h-3 w-3" /> Descargar</Button>}
        <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline">
          <Upload className="h-3 w-3" /> {a.storage_path ? "Reemplazar" : "Subir archivo"}
          <input type="file" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </label>
        <Button size="sm" className="ml-auto" onClick={save}>Guardar</Button>
        <Button size="sm" variant="ghost" onClick={remove} className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
      </div>
    </li>
  );
}