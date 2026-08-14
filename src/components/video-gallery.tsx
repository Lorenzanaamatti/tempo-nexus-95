import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SaveButton } from "@/components/save-button";
import { FileDropzone } from "@/components/file-dropzone";
import { uploadToBucket, signBucketPath, removeFromBucket } from "@/lib/storage-upload";

const MAX_VIDEOS = 12;
const BUCKET = "composer-assets";

type Video = {
  id: string;
  composer_id: string;
  storage_path: string | null;
  external_url: string | null;
  poster_path: string | null;
  title: string | null;
  year: number | null;
  copyright: string | null;
  duration_seconds: number | null;
  position: number;
};

const signedUrl = (path: string | null) => signBucketPath(BUCKET, path);

export function VideoGallery({ composerId }: { composerId: string }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function reload() {
    setLoading(true);
    const { data, error } = await supabase
      .from("composer_videos")
      .select("*")
      .eq("composer_id", composerId)
      .order("position", { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    setVideos((data ?? []) as Video[]);
  }

  useEffect(() => { void reload(); }, [composerId]);

  async function onUpload(file: File) {
    if (videos.length >= MAX_VIDEOS) {
      toast.error(`Máximo ${MAX_VIDEOS} vídeos`);
      return;
    }
    setUploading(true);
    try {
      const path = await uploadToBucket(BUCKET, `${composerId}/videos`, file, { upsert: true, keepName: false });
      const { error } = await supabase.from("composer_videos").insert({
        composer_id: composerId,
        storage_path: path,
        title: file.name,
        position: videos.length,
      });
      if (error) throw error;
      await reload();
    } catch (e: any) {
      toast.error(e.message ?? "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  async function addExternal() {
    const url = window.prompt("URL del vídeo (YouTube, Vimeo, MP4 público)");
    if (!url) return;
    const { error } = await supabase.from("composer_videos").insert({
      composer_id: composerId,
      external_url: url,
      position: videos.length,
    });
    if (error) return toast.error(error.message);
    await reload();
  }

  async function saveVideo(id: string, patch: Partial<Video>) {
    const { error } = await supabase.from("composer_videos").update(patch).eq("id", id);
    if (error) { toast.error(error.message); throw error; }
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  async function removeVideo(v: Video) {
    if (!confirm("¿Eliminar este vídeo?")) return;
    const { error } = await supabase.from("composer_videos").delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    await removeFromBucket(BUCKET, v.storage_path);
    await reload();
  }

  const empty = MAX_VIDEOS - videos.length;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {videos.length} / {MAX_VIDEOS} vídeos. Subida directa o enlace externo (YouTube/Vimeo).
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} onSave={(patch) => saveVideo(v.id, patch)} onRemove={() => removeVideo(v)} />
          ))}
          {empty > 0 && (
            <div className="flex flex-col gap-2">
              <FileDropzone
                accept="video/*"
                multiple={false}
                busy={uploading}
                className="aspect-[4/3]"
                label={`Subir vídeo (${empty} libres)`}
                onFiles={(files) => files[0] && onUpload(files[0])}
              />
              <Button type="button" variant="outline" size="sm" onClick={addExternal}>Añadir enlace externo</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, onSave, onRemove }: { video: Video; onSave: (patch: Partial<Video>) => Promise<void>; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [title, setTitle] = useState(video.title ?? "");
  const [year, setYear] = useState(video.year != null ? String(video.year) : "");
  const [copyright, setCopyright] = useState(video.copyright ?? "");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (video.storage_path) signedUrl(video.storage_path).then(setUrl);
    else setUrl(video.external_url);
  }, [video.storage_path, video.external_url]);

  const dirty =
    title !== (video.title ?? "") ||
    (year === "" ? null : Number(year)) !== (video.year ?? null) ||
    (copyright.trim() === "" ? null : copyright) !== (video.copyright ?? null);

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim() || null,
        year: year === "" ? null : Number(year),
        copyright: copyright.trim() === "" ? null : copyright,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1200);
    } catch { /* toast in parent */ } finally { setSaving(false); }
  }

  const isEmbed = !!video.external_url && /youtu\.?be|vimeo/.test(video.external_url);

  return (
    <div className="space-y-2 rounded-sm border border-border p-3">
      <div className="aspect-[16/9] w-full overflow-hidden bg-black">
        {url ? (
          isEmbed ? (
            <iframe src={toEmbed(url)} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" />
          ) : (
            <video src={url} controls className="h-full w-full" />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">sin vídeo</div>
        )}
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={save} placeholder="Título" className="text-sm" />
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <Label className="text-[10px] text-muted-foreground">Año</Label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} onBlur={save} />
        </div>
        <div className="col-span-2">
          <Label className="text-[10px] text-muted-foreground">© Copyright</Label>
          <Input value={copyright} onChange={(e) => setCopyright(e.target.value)} onBlur={save} placeholder="© Autor, Año" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={onRemove}><Trash2 className="mr-1 h-3 w-3" /> Eliminar</Button>
        {saving ? (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Guardando</span>
        ) : dirty ? (
          <SaveButton size="sm" onClick={save} />
        ) : justSaved ? (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Check className="h-3 w-3" /> Guardado</span>
        ) : null}
      </div>
    </div>
  );
}

function toEmbed(url: string) {
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimMatch) return `https://player.vimeo.com/video/${vimMatch[1]}`;
  return url;
}