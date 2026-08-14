import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Inbox } from "lucide-react";

/** Esqueleto de carga unificado para listados y rejillas. */
export function ListSkeleton({ rows = 6, variant = "list" }: { rows?: number; variant?: "list" | "grid" | "cards" }) {
  if (variant === "grid" || variant === "cards") {
    return (
      <div className={variant === "grid" ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={variant === "grid" ? "h-48 rounded-sm" : "h-36 rounded-sm"} />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-sm" />
      ))}
    </div>
  );
}

/** Estado vacío unificado. */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-dashed border-border p-12 text-center">
      <Inbox className="mx-auto mb-2 h-6 w-6 text-muted-foreground opacity-60" />
      <p className="text-sm text-muted-foreground">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

/** Estado de error unificado. */
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-8 text-center">
      <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-destructive" />
      <p className="text-sm text-destructive">{message ?? "No se han podido cargar los datos."}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-sm border border-border px-3 py-1 text-xs hover:bg-muted">
          Reintentar
        </button>
      )}
    </div>
  );
}
