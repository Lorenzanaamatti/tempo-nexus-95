import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Newspaper, ExternalLink, Trash2, Upload, Star } from "lucide-react";
import {
  MARKETING_LANGUAGES,
  MARKETING_LANGUAGE_LABEL,
  fmtDate,
  type MarketingLanguage,
} from "@/lib/marketing-constants";
import { uploadMarketingAsset, signMarketingAsset, deleteMarketingAsset } from "@/lib/marketing-upload";

export const Route = createFileRoute("/_authenticated/_admin/marketing/clippings/")({
  component: ClippingsIndex,
});

type Clipping = {
  id: string;
  outlet: string;
  headline: string;
  author: string | null;
  published_date: string | null;
  language: MarketingLanguage;
  url: string | null;
  screenshot_path: string | null;
  composer_id: string | null;
  tags: string[];
  featured: boolean;
  notes: string | null;
  visible_to_composer: boolean;
};

function ClippingsIndex() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [langFilter, setLangFilter] = useState("all");
  const [composerFilter, setComposerFilter] = useState("all");
  const [editing, setEditing] = useState<Clipping | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["press-clippings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("press_clippings")
        .select("*")
        .order("featured", { ascending: false })
        .order("published_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Clipping[];
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
      if (langFilter !== "all" && c.language !== langFilter) return false;
      if (composerFilter !== "all" && c.composer_id !== composerFilter) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay = [c.outlet, c.headline, c.author, c.notes, (c.tags ?? []).join(" ")].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data, q, langFilter, composerFilter]);

  async function createClipping() {
    const outlet = prompt("Medio (p. ej. El País):");
    if (!outlet?.trim()) return;
    const headline = prompt("Titular:");
    if (!headline?.trim()) return;
    const { data: created, error } = await (supabase as any)
      .from("press_clippings")
      .insert({ outlet: outlet.trim(), headline: headline.trim() })
      .select("*").single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["press-clippings"] });
    setEditing(created as Clipping);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Marketing y Ventas</p>
          <h1 className="mt-1 font-display text-5xl">Clipping</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Apariciones en medios de IC y de los compositores del roster. Marca como destacadas las que reutilizarás en propuestas.
          </p>
        </div>
        <Button size="sm" onClick={createClipping}><Plus className="mr-1 h-4 w-4" /> Nueva entrada</Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar medio, titular, etiqueta…" className="w-72 rounded-sm" />
        <Select value={langFilter} onValueChange={setLangFilter}>
          <SelectTrigger className="w-40 rounded-sm"><SelectValue placeholder="Idioma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los idiomas</SelectItem>
            {MARKETING_LANGUAGES.map((l) => <SelectItem key={l} value={l}>{MARKETING_LANGUAGE_LABEL[l]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={composerFilter} onValueChange={setComposerFilter}>
          <SelectTrigger className="w-56 rounded-sm"><SelectValue placeholder="Compositor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los compositores</SelectItem>
            {(composersQ.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="font-display text-muted-foreground">Cargando clipping…</p>
      ) : !filtered.length ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center">
          <Newspaper className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="font-display text-2xl">Sin clipping aún.</p>
          <p className="mt-2 text-sm text-muted-foreground">Añade la primera mención de prensa para empezar el archivo.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <button onClick={() => setEditing(c)} className="glass-panel block w-full rounded-sm border border-border p-4 text-left transition hover:border-primary/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="smallcaps text-xs text-muted-foreground">{c.outlet}</span>
                      {c.featured && <Badge variant="outline" className="rounded-sm border-amber-400/40 text-amber-300 text-[10px]"><Star className="mr-1 h-2.5 w-2.5" /> Destacada</Badge>}
                    </div>
                    <h3 className="mt-1 font-display text-xl">{c.headline}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {c.author && <span>Por {c.author}</span>}
                      <span>{fmtDate(c.published_date)}</span>
                      <span>· {MARKETING_LANGUAGE_LABEL[c.language]}</span>
                      {composerName(c.composer_id) && <span>· {composerName(c.composer_id)}</span>}
                    </div>
                  </div>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> Abrir
                    </a>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ClippingSheet item={editing} composers={composersQ.data ?? []} onClose={() => setEditing(null)} />
    </div>
  );
}

function ClippingSheet({ item, composers, onClose }: { item: Clipping | null; composers: { id: string; full_name: string }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Clipping | null>(item);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setForm(item); }, [item]);

  if (!item || !form) return <Sheet open={false} onOpenChange={(o) => { if (!o) onClose(); }}><SheetContent /></Sheet>;

  function update<K extends keyof Clipping>(k: K, v: Clipping[K]) {
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    const { error } = await (supabase as any).from("press_clippings").update({
      outlet: form.outlet, headline: form.headline, author: form.author,
      published_date: form.published_date, language: form.language, url: form.url,
      composer_id: form.composer_id, tags: form.tags ?? [], featured: form.featured, notes: form.notes,
      visible_to_composer: form.visible_to_composer,
    }).eq("id", form.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Entrada guardada");
    qc.invalidateQueries({ queryKey: ["press-clippings"] });
    onClose();
  }

  async function remove() {
    if (!confirm("¿Eliminar esta entrada de clipping?")) return;
    if (form?.screenshot_path) await deleteMarketingAsset(form.screenshot_path).catch(() => {});
    const { error } = await (supabase as any).from("press_clippings").delete().eq("id", form!.id);
    if (error) return toast.error(error.message);
    toast.success("Eliminada");
    qc.invalidateQueries({ queryKey: ["press-clippings"] });
    onClose();
  }

  async function onScreenshot(file: File) {
    setUploading(true);
    try {
      if (form?.screenshot_path) await deleteMarketingAsset(form.screenshot_path).catch(() => {});
      const path = await uploadMarketingAsset("clippings", file);
      const { error } = await (supabase as any).from("press_clippings").update({ screenshot_path: path }).eq("id", form!.id);
      if (error) throw error;
      update("screenshot_path", path);
      toast.success("Captura subida");
    } catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setUploading(false); }
  }

  async function viewShot() {
    if (!form?.screenshot_path) return;
    const url = await signMarketingAsset(form.screenshot_path);
    if (url) window.open(url, "_blank");
  }

  return (
    <Sheet open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Editar clipping</SheetTitle>
          <SheetDescription>Datos del medio, autor, vínculo al compositor y captura.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Field label="Medio"><Input value={form.outlet} onChange={(e) => update("outlet", e.target.value)} /></Field>
          <Field label="Titular"><Input value={form.headline} onChange={(e) => update("headline", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Autor"><Input value={form.author ?? ""} onChange={(e) => update("author", e.target.value || null)} /></Field>
            <Field label="Fecha"><Input type="date" value={form.published_date ?? ""} onChange={(e) => update("published_date", e.target.value || null)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Idioma">
              <Select value={form.language} onValueChange={(v) => update("language", v as MarketingLanguage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MARKETING_LANGUAGES.map((l) => <SelectItem key={l} value={l}>{MARKETING_LANGUAGE_LABEL[l]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Compositor relacionado">
              <Select value={form.composer_id ?? "none"} onValueChange={(v) => update("composer_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Ninguno —</SelectItem>
                  {composers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="URL"><Input value={form.url ?? ""} onChange={(e) => update("url", e.target.value || null)} placeholder="https://…" /></Field>
          <Field label="Etiquetas (coma)">
            <Input value={(form.tags ?? []).join(", ")} onChange={(e) => update("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          </Field>
          <div className="flex items-center gap-3 rounded-sm border border-border p-3">
            <Switch checked={form.featured} onCheckedChange={(v) => update("featured", v)} />
            <Label className="text-sm">Marcar como destacada</Label>
          </div>
          <div className="flex items-center gap-3 rounded-sm border border-border p-3">
            <Switch checked={!!form.visible_to_composer} onCheckedChange={(v) => update("visible_to_composer", v)} />
            <Label className="text-sm">Visible en el portal del representado</Label>
          </div>
          <div className="rounded-sm border border-border p-3">
            <Label className="smallcaps mb-2 block text-xs text-muted-foreground">Captura</Label>
            {form.screenshot_path ? (
              <Button size="sm" variant="outline" onClick={viewShot}>Ver captura</Button>
            ) : (
              <p className="text-xs text-muted-foreground">Sin captura.</p>
            )}
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-primary hover:underline">
              <Upload className="h-3 w-3" /> {form.screenshot_path ? "Reemplazar" : "Subir imagen"}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onScreenshot(f); }} />
            </label>
          </div>
          <Field label="Notas"><Textarea rows={3} value={form.notes ?? ""} onChange={(e) => update("notes", e.target.value || null)} /></Field>
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