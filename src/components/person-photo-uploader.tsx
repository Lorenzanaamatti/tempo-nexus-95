import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePersonPhotoUrl(path?: string | null) {
  return useQuery({
    queryKey: ["person-photo-signed", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 50,
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from("people-photos")
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function PersonPhotoUploader({
  personId,
  photoPath,
  onChange,
}: {
  personId: string;
  photoPath: string | null;
  onChange: (path: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const url = usePersonPhotoUrl(photoPath).data ?? null;

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${personId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("people-photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase
        .from("people")
        .update({ photo_path: path } as any)
        .eq("id", personId);
      if (error) throw error;
      onChange(path);
      qc.invalidateQueries({ queryKey: ["person-photo-signed"] });
      toast.success("Foto actualizada");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo subir la foto");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (!photoPath) return;
    setBusy(true);
    try {
      await supabase.storage.from("people-photos").remove([photoPath]);
      const { error } = await supabase
        .from("people")
        .update({ photo_path: null } as any)
        .eq("id", personId);
      if (error) throw error;
      onChange(null);
      toast.success("Foto eliminada");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="h-28 w-28 overflow-hidden rounded-sm border border-border bg-muted">
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            sin foto
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Subiendo…" : photoPath ? "Cambiar foto" : "Subir foto"}
          </Button>
          {photoPath && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={removePhoto}>
              Quitar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG/PNG, recomendamos 800×800</p>
      </div>
    </div>
  );
}