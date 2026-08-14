import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileDropzone } from "@/components/file-dropzone";
import { removeFromBucket, uploadToBucket, useSignedUrl } from "@/lib/storage-upload";

const BUCKET = "people-photos";

export function usePersonPhotoUrl(path?: string | null) {
  return useSignedUrl(BUCKET, path);
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
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const url = usePersonPhotoUrl(photoPath).data ?? null;

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const path = await uploadToBucket(BUCKET, personId, file, { upsert: true, keepName: false });
      const { error } = await supabase
        .from("people")
        .update({ photo_path: path } as any)
        .eq("id", personId);
      if (error) throw error;
      onChange(path);
      qc.invalidateQueries({ queryKey: ["signed-url", BUCKET] });
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
      await removeFromBucket(BUCKET, photoPath);
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
        <FileDropzone
          accept="image/*"
          multiple={false}
          busy={busy}
          className="px-6 py-4"
          label={photoPath ? "Arrastra o haz clic para cambiar la foto" : "Arrastra o haz clic para subir la foto"}
          hint="JPG/PNG, recomendamos 800×800"
          onFiles={(files) => handleFile(files[0])}
        />
        {photoPath && (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={removePhoto} className="self-start">
            Quitar foto
          </Button>
        )}
      </div>
    </div>
  );
}
