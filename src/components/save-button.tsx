import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

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
 * Botón global de guardado: SIEMPRE redondo y verde.
 * En modo `floating` se fija en el extremo inferior derecho de la pantalla.
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
  const sizeCls =
    size === "sm" ? "h-9 w-9" : size === "md" ? "h-11 w-11" : "h-14 w-14";
  const iconCls = size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : "h-6 w-6";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || saving}
      title={title ?? (saving ? "Guardando…" : label)}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "bg-emerald-600 text-white shadow-lg ring-1 ring-emerald-700/30",
        "transition hover:bg-emerald-500 hover:shadow-xl",
        "active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        floating && "fixed bottom-6 right-6 z-50 shadow-2xl",
        sizeCls,
        className,
      )}
    >
      {saving ? <Loader2 className={cn(iconCls, "animate-spin")} /> : <Check className={iconCls} />}
    </button>
  );
}