import { ESTADO_LABEL, ESTADO_TONE, type DealMemoEstado } from "@/lib/deal-memo-constants";

export function EstadoBadge({ estado, className = "" }: { estado: DealMemoEstado; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-wider ${ESTADO_TONE[estado]} ${className}`}
    >
      {ESTADO_LABEL[estado]}
    </span>
  );
}