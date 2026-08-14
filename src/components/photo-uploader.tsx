import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadComposerPhoto, useComposerPhotoUrl } from "@/lib/composers-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileDropzone } from "@/components/file-dropzone";

export function PhotoUploader({
  composerId,
  photoPath,
  onChange,
}: {
  composerId: string;
  photoPath: string | null;
  onChange: (path: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const url = useComposerPhotoUrl(photoPath).data ?? null;

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const path = await uploadComposerPhoto(composerId, file);
      const { error } = await supabase
        .from("composers")
        .update({ photo_path: path })
        .eq("id", composerId);
      if (error) throw error;
      onChange(path);
      qc.invalidateQueries({ queryKey: ["composer-photo-signed"] });
      toast.success("Foto actualizada");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo subir la foto");
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
      <FileDropzone
        accept="image/*"
        multiple={false}
        busy={busy}
        className="px-6 py-4"
        label={url ? "Arrastra o haz clic para cambiar la foto" : "Arrastra o haz clic para subir la foto"}
        hint="JPG/PNG, recomendamos 800×800"
        onFiles={(files) => handleFile(files[0])}
      />
    </div>
  );
}
