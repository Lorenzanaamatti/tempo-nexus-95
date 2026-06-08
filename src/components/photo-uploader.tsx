import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadComposerPhoto, useComposerPhotoUrl } from "@/lib/composers-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function PhotoUploader({
  composerId,
  photoPath,
  onChange,
}: {
  composerId: string;
  photoPath: string | null;
  onChange: (path: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Subiendo…" : url ? "Cambiar foto" : "Subir foto"}
        </Button>
        <p className="text-xs text-muted-foreground">JPG/PNG, recomendamos 800×800</p>
      </div>
    </div>
  );
}