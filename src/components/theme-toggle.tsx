import { Sun, Moon, MonitorSmartphone } from "lucide-react";
import { useTheme } from "@/lib/use-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, cycle } = useTheme();
  const label =
    mode === "light" ? "Tema: claro (clic para oscuro)"
    : mode === "dark" ? "Tema: oscuro (clic para auto)"
    : "Tema: automático (clic para claro)";
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : MonitorSmartphone;
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className={
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-accent " +
        className
      }
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}