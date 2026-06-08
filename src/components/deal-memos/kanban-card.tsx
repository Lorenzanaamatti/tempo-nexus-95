import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { formatMoneyEs } from "@/lib/deal-memo-constants";

export type KanbanCardData = {
  id: string;
  referencia: string;
  obra: string;
  importe_propuesto: number | string | null;
  moneda: string | null;
  updated_at: string;
  fecha_limite_respuesta: string | null;
  cliente_nombre: string | null;
  contraparte_nombre: string | null;
};

export function KanbanCard({ data }: { data: KanbanCardData }) {
  let urgency: "red" | "amber" | "none" = "none";
  if (data.fecha_limite_respuesta) {
    const limit = new Date(data.fecha_limite_respuesta).getTime();
    const now = Date.now();
    const days = (limit - now) / (1000 * 60 * 60 * 24);
    if (days < 0) urgency = "red";
    else if (days < 3) urgency = "amber";
  }
  const borderClass =
    urgency === "red"
      ? "border-l-rose-500"
      : urgency === "amber"
      ? "border-l-amber-500"
      : "border-l-transparent";

  return (
    <Link
      to="/deal-memos/$dealMemoId"
      params={{ dealMemoId: data.id }}
      className={`block rounded-sm border border-border border-l-4 ${borderClass} bg-card p-3 text-sm shadow-sm transition-colors hover:bg-muted/50`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold font-mono text-[11px] tracking-tight">{data.referencia}</span>
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{data.obra}</p>
      <div className="mt-2 flex items-center gap-1 text-[11px] text-foreground/80">
        <span className="truncate">{data.cliente_nombre ?? "—"}</span>
        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate">{data.contraparte_nombre ?? "—"}</span>
      </div>
      <p className="mt-2 text-sm font-medium tabular-nums">
        {formatMoneyEs(data.importe_propuesto, data.moneda ?? "EUR")}
      </p>
      <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        {formatDistanceToNow(new Date(data.updated_at), { locale: es, addSuffix: true })}
      </p>
    </Link>
  );
}