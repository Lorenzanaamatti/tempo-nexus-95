import { SaveButton } from "@/components/save-button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { photoUrl, uploadComposerPhoto } from "@/lib/composers-api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MAX_PHOTOS = 12;

type Photo = {
  id: string;
  composer_id: string;
  storage_path: string;
  year: number | null;
  copyright: string | null;
  position: number;
};

export function PhotoGallery({ composerId }: { composerId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function reload() {
    setLoading(true);
    const { data, error } = await supabase
      .from("composer_photos")
      .select("*")
      .eq("composer_id", composerId)
      .order("position", { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    setPhotos((data ?? []) as Photo[]);
  }

  useEffect(() => { void reload(); }, [composerId]);

  async function onUpload(file: File) {
    if (photos.length >= MAX_PHOTOS) {
      toast.error(`Máximo ${MAX_PHOTOS} fotografías`);
      return;
    }
    setUploading(true);
    try {
      const path = await uploadComposerPhoto(composerId, file);
      const { error } = await supabase.from("composer_photos").insert({
        composer_id: composerId,
        storage_path: path,
        position: photos.length,
      });
      if (error) throw error;
      await reload();
    } catch (e: any) {
      toast.error(e.message ?? "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  async function savePhoto(id: string, patch: Partial<Photo>) {
    const { error } = await supabase.from("composer_photos").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function removePhoto(p: Photo) {
    if (!confirm("¿Eliminar esta fotografía?")) return;
    const { error } = await supabase.from("composer_photos").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    await supabase.storage.from("composer-photos").remove([p.storage_path]);
    await reload();
  }

  const empty = MAX_PHOTOS - photos.length;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {photos.length} / {MAX_PHOTOS} fotografías. Cada imagen lleva año y pie de copyright.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => (
            <PhotoCard
              key={p.id}
              photo={p}
              onSave={(patch) => savePhoto(p.id, patch)}
              onRemove={() => removePhoto(p)}
            />
          ))}
          {empty > 0 && (
            <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-foreground">
              <Plus className="h-5 w-5" />
              {uploading ? "Subiendo…" : `Añadir foto (${empty} libres)`}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

function PhotoCard({
  photo,
  onSave,
  onRemove,
}: {
  photo: Photo;
  onSave: (patch: Partial<Photo>) => Promise<void>;
  onRemove: () => void;
}) {
  const url = photoUrl(photo.storage_path);
  const [year, setYear] = useState<string>(photo.year != null ? String(photo.year) : "");
  const [copyright, setCopyright] = useState<string>(photo.copyright ?? "");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setYear(photo.year != null ? String(photo.year) : "");
    setCopyright(photo.copyright ?? "");
  }, [photo.id, photo.year, photo.copyright]);

  const dirty =
    (year === "" ? null : Number(year)) !== (photo.year ?? null) ||
    (copyright.trim() === "" ? null : copyright) !== (photo.copyright ?? null);

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await onSave({
        year: year === "" ? null : Number(year),
        copyright: copyright.trim() === "" ? null : copyright,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1200);
    } catch {
      /* toast in parent */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-sm border border-border p-3">
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <Label className="text-[10px] text-muted-foreground">Año</Label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }}
          />
        </div>
        <div className="col-span-2">
          <Label className="text-[10px] text-muted-foreground">© Copyright</Label>
          <Input
            value={copyright}
            onChange={(e) => setCopyright(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }}
            placeholder="© Autor, Año"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={onRemove}>
          <Trash2 className="mr-1 h-3 w-3" /> Eliminar
        </Button>
        {saving ? (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Guardando
          </span>
        ) : dirty ? (
          <SaveButton size="sm" onClick={save} />
        ) : justSaved ? (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Check className="h-3 w-3" /> Guardado
          </span>
        ) : null}
      </div>
    </div>
  );
}