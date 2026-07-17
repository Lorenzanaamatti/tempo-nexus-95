import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Download, FileIcon } from "lucide-react";
import { uploadMarketingAsset, signMarketingAsset, deleteMarketingAsset } from "@/lib/marketing-upload";
import { LayoutGrid, List as ListIcon, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_admin/marketing/brand/")({
  component: BrandIndex,
});

type Asset = { id: string; title: string; kind: string | null; storage_path: string | null; external_url: string | null; notes: string | null; position: number };
type AssetFile = { id: string; asset_id: string; storage_path: string; filename: string | null; notes: string | null; position: number; created_at: string };
type AllFile = AssetFile & { asset_title?: string | null; asset_kind?: string | null };
type ViewMode = "collections" | "grid" | "list";

function BrandIndex() {
  const qc = useQueryClient();
  const [view, setView] = useState<ViewMode>("collections");
  const [query, setQuery] = useState("");

  const assetsQ = useQuery({
    queryKey: ["brand-assets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brand_assets").select("*").order("position");
      if (error) throw error;
      return (data ?? []) as Asset[];
    },
  });

  const allFilesQ = useQuery({
    queryKey: ["brand-asset-files-all"],
    enabled: view !== "collections",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brand_asset_files")
        .select("*, brand_assets!inner(title, kind)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        asset_title: r.brand_assets?.title ?? null,
        asset_kind: r.brand_assets?.kind ?? null,
      })) as AllFile[];
    },
  });

  const filteredFiles = (allFilesQ.data ?? []).filter((f) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (f.filename ?? "").toLowerCase().includes(q) ||
      (f.asset_title ?? "").toLowerCase().includes(q) ||
      (f.asset_kind ?? "").toLowerCase().includes(q)
    );
  });

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

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Recursos descargables</h2>
          <div className="flex items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-sm border border-border">
              <ViewBtn active={view === "collections"} onClick={() => setView("collections")} icon={<FolderOpen className="h-3.5 w-3.5" />} label="Colecciones" />
              <ViewBtn active={view === "grid"} onClick={() => setView("grid")} icon={<LayoutGrid className="h-3.5 w-3.5" />} label="Cuadrícula" />
              <ViewBtn active={view === "list"} onClick={() => setView("list")} icon={<ListIcon className="h-3.5 w-3.5" />} label="Lista" />
            </div>
            <Button size="sm" onClick={addAsset}><Plus className="mr-1 h-4 w-4" /> Nuevo recurso</Button>
          </div>
        </div>
        {view !== "collections" && (
          <div className="mb-3 flex items-center justify-between gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar archivo, colección o tipo…"
              className="h-8 max-w-sm text-sm"
            />
            <span className="text-xs text-muted-foreground">{filteredFiles.length} archivo(s)</span>
          </div>
        )}
        {view === "collections" ? (
          !assetsQ.data?.length ? (
          <p className="rounded-sm border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Sube logos, paletas, tipografías y el manual completo para que el equipo y los partners los descarguen.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {assetsQ.data.map((a) => <AssetRow key={a.id} item={a} />)}
          </ul>
          )
        ) : view === "grid" ? (
          <FilesGrid files={filteredFiles} onChanged={() => qc.invalidateQueries({ queryKey: ["brand-asset-files-all"] })} />
        ) : (
          <FilesList files={filteredFiles} onChanged={() => qc.invalidateQueries({ queryKey: ["brand-asset-files-all"] })} />
        )}
      </section>
    </div>
  );
}

function ViewBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 text-xs transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-transparent hover:bg-muted",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

async function openFile(path: string) {
  const url = await signMarketingAsset(path);
  if (url) window.open(url, "_blank");
}

async function deleteFileRow(f: AllFile) {
  if (!confirm(`¿Eliminar "${f.filename ?? "archivo"}"?`)) return false;
  await deleteMarketingAsset(f.storage_path).catch(() => {});
  const { error } = await (supabase as any).from("brand_asset_files").delete().eq("id", f.id);
  if (error) { toast.error(error.message); return false; }
  return true;
}

function FilesGrid({ files, onChanged }: { files: AllFile[]; onChanged: () => void }) {
  if (!files.length) {
    return <p className="rounded-sm border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No hay archivos.</p>;
  }
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
      {files.map((f) => (
        <li key={f.id} className="group relative overflow-hidden rounded-sm border border-border bg-card/50">
          <button
            type="button"
            onClick={() => openFile(f.storage_path)}
            className="block aspect-square w-full"
            title={`${f.asset_title ?? ""} · ${f.filename ?? ""}`}
          >
            <FileThumb file={f} />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-background/85 px-1 py-0.5">
            <div className="truncate text-[10px]">{f.filename ?? f.storage_path.split("/").pop()}</div>
            {f.asset_title && <div className="truncate text-[9px] text-muted-foreground">{f.asset_title}</div>}
          </div>
          <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button size="icon" variant="secondary" className="h-6 w-6" onClick={() => openFile(f.storage_path)}>
              <Download className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="secondary" className="h-6 w-6 text-destructive hover:text-destructive" onClick={async () => { if (await deleteFileRow(f)) onChanged(); }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function FilesList({ files, onChanged }: { files: AllFile[]; onChanged: () => void }) {
  if (!files.length) {
    return <p className="rounded-sm border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No hay archivos.</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-sm border border-border">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-border">
            <FileThumb file={f} />
          </div>
          <button type="button" onClick={() => openFile(f.storage_path)} className="min-w-0 flex-1 text-left">
            <div className="truncate text-sm">{f.filename ?? f.storage_path.split("/").pop()}</div>
            <div className="truncate text-xs text-muted-foreground">
              {f.asset_title ?? "—"}{f.asset_kind ? ` · ${f.asset_kind}` : ""}
            </div>
          </button>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            {new Date(f.created_at).toLocaleDateString()}
          </span>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openFile(f.storage_path)}>
            <Download className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={async () => { if (await deleteFileRow(f)) onChanged(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

const NON_IMAGE_EXT = /\.(pdf|zip|rar|7z|tar|gz|docx?|xlsx?|pptx?|txt|csv|json|xml|mp3|wav|mp4|mov|webm|ttf|otf|woff2?)$/i;

function FileThumb({ file }: { file: AssetFile }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const name = file.filename ?? file.storage_path;
  const definitelyNotImage = NON_IMAGE_EXT.test(name);
  useEffect(() => {
    let cancelled = false;
    if (definitelyNotImage) return;
    signMarketingAsset(file.storage_path).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [file.storage_path, definitelyNotImage]);
  if (!definitelyNotImage && url && !failed) {
    return (
      <div className="h-full w-full bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
        <img
          src={url}
          alt={file.filename ?? ""}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <FileIcon className="h-6 w-6" />
    </div>
  );
}

function AssetRow({ item }: { item: Asset }) {
  const qc = useQueryClient();
  const [a, setA] = useState(item);
  const [uploading, setUploading] = useState(false);
  useEffect(() => setA(item), [item]);

  const filesQ = useQuery({
    queryKey: ["brand-asset-files", item.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brand_asset_files")
        .select("*")
        .eq("asset_id", item.id)
        .order("position")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as AssetFile[];
    },
  });

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
    for (const f of filesQ.data ?? []) {
      await deleteMarketingAsset(f.storage_path).catch(() => {});
    }
    if (a.storage_path) await deleteMarketingAsset(a.storage_path).catch(() => {});
    const { error } = await (supabase as any).from("brand_assets").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["brand-assets"] });
  }
  async function onFiles(files: FileList) {
    setUploading(true);
    try {
      const base = (filesQ.data ?? []).length;
      const rows: Array<Partial<AssetFile>> = [];
      let i = 0;
      for (const file of Array.from(files)) {
        const path = await uploadMarketingAsset("brand", file);
        rows.push({ asset_id: a.id, storage_path: path, filename: file.name, position: base + i });
        i++;
      }
      if (rows.length) {
        const { error } = await (supabase as any).from("brand_asset_files").insert(rows);
        if (error) throw error;
      }
      toast.success(rows.length > 1 ? `${rows.length} archivos subidos` : "Archivo subido");
      qc.invalidateQueries({ queryKey: ["brand-asset-files", a.id] });
    } catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setUploading(false); }
  }
  async function downloadFile(path: string) {
    const url = await signMarketingAsset(path);
    if (url) window.open(url, "_blank");
  }
  async function removeFile(f: AssetFile) {
    if (!confirm("¿Eliminar este archivo?")) return;
    await deleteMarketingAsset(f.storage_path).catch(() => {});
    const { error } = await (supabase as any).from("brand_asset_files").delete().eq("id", f.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["brand-asset-files", a.id] });
  }

  return (
    <li className="glass-panel rounded-sm border border-border p-4">
      <Input value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} className="mb-2 font-display" />
      <Input value={a.kind ?? ""} onChange={(e) => setA({ ...a, kind: e.target.value || null })} placeholder="Tipo (logo, tipografía, color…)" className="mb-2 text-sm" />
      <Input value={a.external_url ?? ""} onChange={(e) => setA({ ...a, external_url: e.target.value || null })} placeholder="URL externa (opcional)" className="mb-2 text-sm" />
      <Textarea rows={2} value={a.notes ?? ""} onChange={(e) => setA({ ...a, notes: e.target.value || null })} placeholder="Notas de uso" />
      {(filesQ.data?.length ?? 0) > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {filesQ.data!.map((f) => (
            <li key={f.id} className="group relative overflow-hidden rounded-sm border border-border">
              <button
                type="button"
                onClick={() => downloadFile(f.storage_path)}
                className="block aspect-square w-full"
                title={f.filename ?? f.storage_path}
              >
                <FileThumb file={f} />
              </button>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-background/80 px-1 py-0.5 text-[10px]">
                {f.filename ?? f.storage_path.split("/").pop()}
              </div>
              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button size="icon" variant="secondary" className="h-6 w-6" onClick={() => downloadFile(f.storage_path)}>
                  <Download className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="secondary" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeFile(f)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline">
          <Upload className="h-3 w-3" /> {uploading ? "Subiendo…" : "Añadir archivos"}
          <input
            type="file"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => { const fs = e.target.files; if (fs && fs.length) { onFiles(fs); e.target.value = ""; } }}
          />
        </label>
        <Button size="sm" className="ml-auto" onClick={save}>Guardar</Button>
        <Button size="sm" variant="ghost" onClick={remove} className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
      </div>
    </li>
  );
}