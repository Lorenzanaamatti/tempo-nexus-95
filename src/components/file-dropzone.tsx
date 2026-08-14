import { useRef, useState, type ReactNode } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Zona única de subida (clic o arrastrar-y-soltar).
 * Reutilízala en cualquier pantalla que acepte archivos en lugar de crear
 * otro `<input type="file">` con su propio comportamiento.
 */
export function FileDropzone({
  onFiles,
  accept,
  multiple = true,
  disabled = false,
  busy = false,
  label = "Arrastra archivos aquí o haz clic para seleccionar",
  hint,
  className,
  children,
}: {
  onFiles: (files: File[]) => void | Promise<void>;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  busy?: boolean;
  label?: string;
  hint?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const emit = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length) void onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled || busy}
      onClick={() => !disabled && !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled && !busy) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && !busy) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (disabled || busy) return;
        emit(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground transition-colors",
        over && "border-primary bg-primary/5 text-foreground",
        (disabled || busy) && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          emit(e.target.files);
          e.target.value = "";
        }}
      />
      {children ?? (
        <>
          <Upload className="h-4 w-4" />
          <span>{busy ? "Subiendo…" : label}</span>
          {hint && <span className="text-xs">{hint}</span>}
        </>
      )}
    </div>
  );
}
