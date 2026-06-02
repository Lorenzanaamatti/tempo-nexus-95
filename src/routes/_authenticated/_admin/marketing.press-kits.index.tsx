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
import { Plus, FolderOpen, Download, ExternalLink, Trash2, Upload } from "lucide-react";
import {
  PRESS_KIT_SCOPES,
  PRESS_KIT_SCOPE_LABEL,
  MARKETING_LANGUAGES,
  MARKETING_LANGUAGE_LABEL,
  type PressKitScope,
  type MarketingLanguage,
} from "@/lib/marketing-constants";
import { uploadMarketingAsset, signMarketingAsset, deleteMarketingAsset } from "@/lib/marketing-upload";

export const Route = createFileRoute("/_authenticated/_admin/marketing/press-kits/")({
  component: PressKitsIndex,
});

type Kit = {
  id: string;
  title: string;
  scope: PressKitScope;
  composer_id: string | null;
  language: MarketingLanguage;
  version: string | null;
  storage_path: string | null;
  external_url: string | null;
  public_link: string | null;
  notes: string | null;
};

function PressKitsIndex() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [editing, setEditing] = useState<Kit | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["press-kits"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("press_kits").select("*").order("scope").order("title");
      if (error) throw error;
      return (data ?? []) as Kit[];
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
    return (data ?? []).filter((k) => {
      if (scopeFilter !== "all" && k.scope !== scopeFilter) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay = [k.title, k.notes, composerName(k.composer_id)].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data, q, scopeFilter, composersQ.data]);

  async function createKit() {
    const title = prompt("Título del press kit:");
    if (!title?.trim()) return;
    const { data: created, error } = await (supabase as any).from("press_kits").insert({ title: title.trim() }).select("*").single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["press-kits"] });
    setEditing(created as Kit);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Marketing y Ventas</p>
          <h1 className="mt-1 font-display text-5xl">Press kits / EPK</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Kits de prensa globales de IC y por compositor. Mantén siempre la última versión por idioma con enlace público.
          </p>
        </div>
        <Button size="sm" onClick={createKit}><Plus className="mr-1 h-4 w-4" /> Nuevo press kit</Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="w-72 rounded-sm" />
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="w-52 rounded-sm"><SelectValue placeholder="Alcance" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {PRESS_KIT_SCOPES.map((s) => <SelectItem key={s} value={s}>{PRESS_KIT_SCOPE_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="font-display text-muted-foreground">Cargando press kits…</p>
      ) : !filtered.length ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center">
          <FolderOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="font-display text-2xl">Aún no hay press kits.</p>
          <p className="mt-2 text-sm text-muted-foreground">Empieza por el press kit global de IC.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((k) => (
            <button key={k.id} onClick={() => setEditing(k)} className="glass-panel flex flex-col gap-2 rounded-sm border border-border p-4 text-left transition hover:border-primary/60">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-xl leading-tight">{k.title}</h3>
                <Badge variant="outline" className="shrink-0 rounded-sm text-[10px]">{PRESS_KIT_SCOPE_LABEL[k.scope]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {composerName(k.composer_id) ?? (k.scope === "ic_global" ? "Interesante Compañía" : "—")} · {MARKETING_LANGUAGE_LABEL[k.language]}{k.version ? ` · v${k.version}` : ""}
              </p>
              <div className="mt-auto flex items-center gap-2 pt-2 text-xs">
                {k.storage_path && <span className="inline-flex items-center gap-1 text-emerald-400"><Download className="h-3 w-3" /> Archivo</span>}
                {k.public_link && <span className="inline-flex items-center gap-1 text-amber-300"><ExternalLink className="h-3 w-3" /> Público</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      <KitSheet item={editing} composers={composersQ.data ?? []} onClose={() => setEditing(null)} />
    </div>
  );
}

function KitSheet({ item, composers, onClose }: { item: Kit | null; composers: { id: string; full_name: string }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Kit | null>(item);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => setF(item), [item]);

  if (!item || !f) return <Sheet open={false} onOpenChange={(o) => { if (!o) onClose(); }}><SheetContent /></Sheet>;

  function up<K extends keyof Kit>(k: K, v: Kit[K]) { setF((p) => p ? { ...p, [k]: v } : p); }

  async function save() {
    setSaving(true);
    const { error } = await (supabase as any).from("press_kits").update({
      title: f!.title, scope: f!.scope, composer_id: f!.scope === "compositor" ? f!.composer_id : null,
      language: f!.language, version: f!.version, external_url: f!.external_url,
      public_link: f!.public_link, notes: f!.notes,
    }).eq("id", f!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Press kit guardado");
    qc.invalidateQueries({ queryKey: ["press-kits"] });
    onClose();
  }

  async function remove() {
    if (!confirm("¿Eliminar este press kit?")) return;
    if (f?.storage_path) await deleteMarketingAsset(f.storage_path).catch(() => {});
    const { error } = await (supabase as any).from("press_kits").delete().eq("id", f!.id);
    if (error) return toast.error(error.message);
    toast.success("Eliminado");
    qc.invalidateQueries({ queryKey: ["press-kits"] });
    onClose();
  }

  async function onFile(file: File) {
    setUploading(true);
    try {
      if (f?.storage_path) await deleteMarketingAsset(f.storage_path).catch(() => {});
      const path = await uploadMarketingAsset("press-kits", file);
      const { error } = await (supabase as any).from("press_kits").update({ storage_path: path }).eq("id", f!.id);
      if (error) throw error;
      up("storage_path", path);
      toast.success("Archivo subido");
    } catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setUploading(false); }
  }

  async function openFile() {
    if (!f?.storage_path) return;
    const url = await signMarketingAsset(f.storage_path);
    if (url) window.open(url, "_blank");
  }

  return (
    <Sheet open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Editar press kit</SheetTitle>
          <SheetDescription>Alcance, versión y enlaces compartibles.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Field label="Título"><Input value={f.title} onChange={(e) => up("title", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Alcance">
              <Select value={f.scope} onValueChange={(v) => up("scope", v as PressKitScope)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRESS_KIT_SCOPES.map((s) => <SelectItem key={s} value={s}>{PRESS_KIT_SCOPE_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Idioma">
              <Select value={f.language} onValueChange={(v) => up("language", v as MarketingLanguage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MARKETING_LANGUAGES.map((l) => <SelectItem key={l} value={l}>{MARKETING_LANGUAGE_LABEL[l]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          {f.scope === "compositor" && (
            <Field label="Compositor">
              <Select value={f.composer_id ?? "none"} onValueChange={(v) => up("composer_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Seleccionar —</SelectItem>
                  {composers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Versión"><Input value={f.version ?? ""} onChange={(e) => up("version", e.target.value || null)} placeholder="2026.1" /></Field>

          <div className="rounded-sm border border-border p-3">
            <Label className="smallcaps mb-2 block text-xs text-muted-foreground">Archivo del kit</Label>
            {f.storage_path ? <Button size="sm" variant="outline" onClick={openFile}><Download className="mr-1 h-3 w-3" /> Descargar</Button> : <p className="text-xs text-muted-foreground">Sin archivo.</p>}
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-primary hover:underline">
              <Upload className="h-3 w-3" /> {f.storage_path ? "Reemplazar" : "Subir archivo"}
              <input type="file" className="hidden" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); }} />
            </label>
          </div>

          <Field label="Enlace externo"><Input value={f.external_url ?? ""} onChange={(e) => up("external_url", e.target.value || null)} placeholder="https://…" /></Field>
          <Field label="Enlace público compartible"><Input value={f.public_link ?? ""} onChange={(e) => up("public_link", e.target.value || null)} /></Field>
          <Field label="Notas"><Textarea rows={3} value={f.notes ?? ""} onChange={(e) => up("notes", e.target.value || null)} /></Field>

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