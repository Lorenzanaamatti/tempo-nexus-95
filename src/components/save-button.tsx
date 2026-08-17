import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  onClick: () => void;
  saving?: boolean;
  disabled?: boolean;
  /** Render fixed at the bottom-right of the viewport (main page save). */
  floating?: boolean;
  /** Optional label, only shown on hover for floating; inline always shows it. */
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  title?: string;
};

/**
 * Botón global de guardado. Usa el color de acción del sistema (primary).
 * En modo `floating` se fija abajo a la derecha como píldora con etiqueta visible.
 * Tras guardar muestra una confirmación breve con el token semántico `success`.
 */
export function SaveButton({
  onClick,
  saving = false,
  disabled = false,
  floating = false,
  label = "Guardar",
  className,
  size = "lg",
  title,
}: Props) {
  const iconCls = size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : "h-6 w-6";
  const wasSaving = useRef(saving);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (wasSaving.current && !saving) {
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 1800);
      wasSaving.current = saving;
      return () => clearTimeout(t);
    }
    wasSaving.current = saving;
  }, [saving]);

  const currentLabel = saving ? "Guardando…" : justSaved ? "Guardado" : label;

  const shapeCls = floating
    ? size === "sm"
      ? "h-9 gap-2 rounded-full px-4 text-xs"
      : size === "md"
        ? "h-11 gap-2 rounded-full px-5 text-sm"
        : "h-14 gap-2 rounded-full px-6 text-sm"
    : size === "sm"
      ? "h-9 w-9 rounded-full"
      : size === "md"
        ? "h-11 w-11 rounded-full"
        : "h-14 w-14 rounded-full";

  const colorCls = justSaved
    ? "bg-success text-success-foreground hover:bg-success"
    : "bg-primary text-primary-foreground hover:bg-primary/90";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || saving}
      title={title ?? currentLabel}
      aria-label={currentLabel}
      aria-live="polite"
      className={cn(
        "inline-flex items-center justify-center font-semibold shadow-lg",
        colorCls,
        "transition hover:shadow-xl",
        "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        floating && "fixed bottom-6 right-6 z-50 shadow-2xl",
        shapeCls,
        className,
      )}
    >
      {saving ? <Loader2 className={cn(iconCls, "animate-spin")} /> : <Check className={iconCls} />}
      {floating && <span>{currentLabel}</span>}
    </button>
  );
}