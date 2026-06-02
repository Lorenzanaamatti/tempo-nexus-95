import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trophy, Trash2, Upload } from "lucide-react";
import {
  CASE_STUDY_VISIBILITIES,
  CASE_STUDY_VISIBILITY_LABEL,
  type CaseStudyVisibility,
} from "@/lib/marketing-constants";
import { uploadMarketingAsset, signMarketingAsset, deleteMarketingAsset } from "@/lib/marketing-upload";

export const Route = createFileRoute("/_authenticated/_admin/marketing/case-studies/")({
  component: CaseStudiesIndex,
});

type CaseStudy = {
  id: string;
  title: string;
  client: string | null;
  composer_id: string | null;
  year: number | null;
  problem: string | null;
  proposal: string | null;
  outcome: string | null;
  metrics: string | null;
  visibility: CaseStudyVisibility;
  cover_path: string | null;
  external_url: string | null;
  tags: string[];
};

function CaseStudiesIndex() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [visFilter, setVisFilter] = useState("all");
  const [editing, setEditing] = useState<CaseStudy | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["case-studies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("case_studies").select("*").order("year", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as CaseStudy[];
    },
  });

  const composersQ = useQuery({
    queryKey: ["composers-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("composers").select("id, full_name").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const composerName = (id: string | null) => composersQ.data?.find((c) => c.id === id)?.full_name ?? null;

  const filtered = useMemo(() => {
    return (data ?? []).filter((c) => {
      if (visFilter !== "all" && c.visibility !== visFilter) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay = [c.title, c.client, c.problem, c.outcome, (c.tags ?? []).join(" ")].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data, q, visFilter]);

  async function createCase() {
    const title = prompt("Título del caso de éxito:");
    if (!title?.trim()) return;
    const { data: created, error } = await (supabase as any).from("case_studies").insert({ title: title.trim() }).select("*").single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["case-studies"] });
    setEditing(created as CaseStudy);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Marketing y Ventas</p>
          <h1 className="mt-1 font-display text-5xl">Casos de éxito</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Fichas reutilizables con la estructura problema → propuesta → resultado. Marca las externas para usarlas en propuestas y web.
          </p>
        </div>
        <Button size="sm" onClick={createCase}><Plus className="mr-1 h-4 w-4" /> Nuevo caso</Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, etiqueta, problema…" className="w-72 rounded-sm" />
        <Select value={visFilter} onValueChange={setVisFilter}>
          <SelectTrigger className="w-52 rounded-sm"><SelectValue placeholder="Visibilidad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CASE_STUDY_VISIBILITIES.map((v) => <SelectItem key={v} value={v}>{CASE_STUDY_VISIBILITY_LABEL[v]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="font-display text-muted-foreground">Cargando casos…</p>
      ) : !filtered.length ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center">
          <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="font-display text-2xl">Aún no hay casos de éxito.</p>
          <p className="mt-2 text-sm text-muted-foreground">Empieza por un encargo destacado y replica la plantilla.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => setEditing(c)} className="glass-panel flex flex-col gap-2 rounded-sm border border-border p-4 text-left transition hover:border-primary/60">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-xl leading-tight">{c.title}</h3>
                <Badge variant="outline" className={`shrink-0 rounded-sm text-[10px] ${c.visibility === "externa" ? "border-emerald-400/40 text-emerald-300" : "border-slate-400/40 text-slate-300"}`}>
                  {CASE_STUDY_VISIBILITY_LABEL[c.visibility]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {c.client ?? "—"} {composerName(c.composer_id) ? `· ${composerName(c.composer_id)}` : ""} {c.year ? `· ${c.year}` : ""}
              </p>
              {c.outcome && <p className="line-clamp-3 text-sm text-foreground/80">{c.outcome}</p>}
              {(c.tags?.length ?? 0) > 0 && (
                <div className="mt-auto flex flex-wrap gap-1 pt-1">
                  {c.tags.slice(0, 4).map((t) => <span key={t} className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <CaseSheet item={editing} composers={composersQ.data ?? []} onClose={() => setEditing(null)} />
    </div>
  );
}

function CaseSheet({ item, composers, onClose }: { item: CaseStudy | null; composers: { id: string; full_name: string }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<CaseStudy | null>(item);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => setF(item), [item]);

  if (!item || !f) return <Sheet open={false} onOpenChange={(o) => { if (!o) onClose(); }}><SheetContent /></Sheet>;

  function up<K extends keyof CaseStudy>(k: K, v: CaseStudy[K]) { setF((p) => p ? { ...p, [k]: v } : p); }

  async function save() {
    setSaving(true);
    const { error } = await (supabase as any).from("case_studies").update({
      title: f!.title, client: f!.client, composer_id: f!.composer_id, year: f!.year,
      problem: f!.problem, proposal: f!.proposal, outcome: f!.outcome, metrics: f!.metrics,
      visibility: f!.visibility, external_url: f!.external_url, tags: f!.tags ?? [],
    }).eq("id", f!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Caso guardado");
    qc.invalidateQueries({ queryKey: ["case-studies"] });
    onClose();
  }

  async function remove() {
    if (!confirm("¿Eliminar este caso?")) return;
    if (f?.cover_path) await deleteMarketingAsset(f.cover_path).catch(() => {});
    const { error } = await (supabase as any).from("case_studies").delete().eq("id", f!.id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado");
    qc.invalidateQueries({ queryKey: ["case-studies"] });
    onClose();
  }

  async function onCover(file: File) {
    setUploading(true);
    try {
      if (f?.cover_path) await deleteMarketingAsset(f.cover_path).catch(() => {});
      const path = await uploadMarketingAsset("case-studies", file);
      const { error } = await (supabase as any).from("case_studies").update({ cover_path: path }).eq("id", f!.id);
      if (error) throw error;
      up("cover_path", path);
      toast.success("Portada subida");
    } catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setUploading(false); }
  }

  async function viewCover() {
    if (!f?.cover_path) return;
    const url = await signMarketingAsset(f.cover_path);
    if (url) window.open(url, "_blank");
  }

  return (
    <Sheet open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Editar caso de éxito</SheetTitle>
          <SheetDescription>Estructura problema → propuesta → resultado, con métricas y portada.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Field label="Título"><Input value={f.title} onChange={(e) => up("title", e.target.value)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cliente"><Input value={f.client ?? ""} onChange={(e) => up("client", e.target.value || null)} /></Field>
            <Field label="Compositor">
              <Select value={f.composer_id ?? "none"} onValueChange={(v) => up("composer_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Ninguno —</SelectItem>
                  {composers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Año"><Input type="number" value={f.year ?? ""} onChange={(e) => up("year", e.target.value ? Number(e.target.value) : null)} /></Field>
          </div>
          <Field label="Problema"><Textarea rows={3} value={f.problem ?? ""} onChange={(e) => up("problem", e.target.value || null)} placeholder="¿Qué reto tenía el cliente?" /></Field>
          <Field label="Propuesta"><Textarea rows={3} value={f.proposal ?? ""} onChange={(e) => up("proposal", e.target.value || null)} placeholder="¿Qué hizo IC?" /></Field>
          <Field label="Resultado"><Textarea rows={3} value={f.outcome ?? ""} onChange={(e) => up("outcome", e.target.value || null)} placeholder="¿Qué se consiguió?" /></Field>
          <Field label="Métricas"><Textarea rows={2} value={f.metrics ?? ""} onChange={(e) => up("metrics", e.target.value || null)} placeholder="p. ej. +35% engagement, 8 nominaciones…" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Visibilidad">
              <Select value={f.visibility} onValueChange={(v) => up("visibility", v as CaseStudyVisibility)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CASE_STUDY_VISIBILITIES.map((v) => <SelectItem key={v} value={v}>{CASE_STUDY_VISIBILITY_LABEL[v]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Etiquetas (coma)">
              <Input value={(f.tags ?? []).join(", ")} onChange={(e) => up("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
            </Field>
          </div>
          <Field label="Enlace externo"><Input value={f.external_url ?? ""} onChange={(e) => up("external_url", e.target.value || null)} placeholder="https://…" /></Field>
          <div className="rounded-sm border border-border p-3">
            <Label className="smallcaps mb-2 block text-xs text-muted-foreground">Portada</Label>
            {f.cover_path ? <Button size="sm" variant="outline" onClick={viewCover}>Ver portada</Button> : <p className="text-xs text-muted-foreground">Sin portada.</p>}
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-primary hover:underline">
              <Upload className="h-3 w-3" /> {f.cover_path ? "Reemplazar" : "Subir imagen"}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) onCover(file); }} />
            </label>
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive"><Trash2 className="mr-1 h-4 w-4" /> Eliminar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="smallcaps mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}