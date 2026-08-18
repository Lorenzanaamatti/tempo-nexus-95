import type { ReactNode } from "react";
import { formatEUR, formatEUR0, formatMoneyEs } from "@/lib/money";

/** Clase de color para importes: los negativos siempre en rojo. */
export function amountClass(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(String(value).replace(",", ".")) : value;
  return typeof n === "number" && Number.isFinite(n) && n < 0 ? "text-destructive" : "";
}

type MoneyProps = {
  value: number | string | null | undefined;
  /** Moneda distinta de EUR (se formatea igual, con separador de miles). */
  moneda?: string;
  /** Sin decimales (KPIs y totales grandes). */
  compact?: boolean;
  emptyLabel?: string;
  className?: string;
};

/**
 * Único componente de presentación de importes de la app:
 * siempre en euros con separador de miles y negativos en rojo.
 */
export function Money({ value, moneda, compact, emptyLabel, className }: MoneyProps): ReactNode {
  const text =
    moneda && moneda !== "EUR"
      ? formatMoneyEs(value, moneda, emptyLabel ? { emptyLabel } : undefined)
      : compact
        ? formatEUR0(value)
        : formatEUR(value);
  return <span className={`tabular-nums ${amountClass(value)} ${className ?? ""}`.trim()}>{text}</span>;
}
