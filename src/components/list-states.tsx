import type { ComponentType, ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Inbox, SearchX } from "lucide-react";

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

export type EmptyStateAction = {
  label: string;
  onClick?: () => void;
  /** Navegación con TanStack Router (alternativa a onClick). */
  to?: LinkProps["to"];
  params?: LinkProps["params"];
  search?: LinkProps["search"];
};

/**
 * Estado vacío unificado con jerarquía: icono, título en mayúsculas,
 * descripción orientativa y acción hacia el siguiente paso.
 *
 * - `block`: pantallas y listados principales.
 * - `inline`: paneles internos de una ficha (compacto).
 * - `filtered`: hay datos pero los filtros no devuelven nada.
 */
export function EmptyState({
  title,
  description,
  hint,
  icon,
  action,
  secondaryAction,
  variant = "block",
  className,
}: {
  title: string;
  description?: ReactNode;
  /** @deprecated alias de `description`. */
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  variant?: "block" | "inline" | "filtered";
  className?: string;
}) {
  const Icon = icon ?? (variant === "filtered" ? SearchX : Inbox);
  const text = description ?? hint;
  const inline = variant === "inline";

  const renderAction = (a: EmptyStateAction, kind: "primary" | "secondary") => {
    const size = inline ? "sm" : "default";
    const btnVariant = kind === "primary" ? "default" : "ghost";
    if (a.to) {
      return (
        <Button key={a.label} asChild size={size} variant={btnVariant} className="rounded-sm">
          <Link to={a.to} params={a.params as never} search={a.search as never}>
            {a.label}
          </Link>
        </Button>
      );
    }
    return (
      <Button key={a.label} size={size} variant={btnVariant} className="rounded-sm" onClick={a.onClick}>
        {a.label}
      </Button>
    );
  };

  if (inline) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-sm border border-dashed border-border bg-muted/30 px-4 py-3",
          className,
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground/80">{title}</p>
          {text && <p className="text-xs text-muted-foreground">{text}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action && renderAction(action, "primary")}
          {secondaryAction && renderAction(secondaryAction, "secondary")}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-sm border border-dashed border-border bg-muted/30 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-full border border-border bg-background">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </span>
      <h3 className="title-caps font-display text-base text-foreground">{title}</h3>
      {text && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && renderAction(action, "primary")}
          {secondaryAction && renderAction(secondaryAction, "secondary")}
        </div>
      )}
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
