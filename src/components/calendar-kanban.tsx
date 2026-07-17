import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AVAILABILITY_LABELS } from "@/components/availability-editor";
import { EXTRA_KIND_LABELS, KIND_BAR_ALL } from "@/lib/calendar-sources";
import type { FlatCalendarEvent } from "@/components/calendar-month-grid";

const ALL_LABELS: Record<string, string> = { ...AVAILABILITY_LABELS, ...EXTRA_KIND_LABELS };

const COLUMNS: { key: string; label: string; accent: string }[] = [
  { key: "operativo", label: "Operativo", accent: "border-violet-500/50" },
  { key: "marketing", label: "Marketing", accent: "border-sky-500/50" },
  { key: "facturacion", label: "Facturación", accent: "border-amber-500/50" },
  { key: "personal", label: "Personal", accent: "border-emerald-500/50" },
];

export function CalendarKanban({
  events,
  onMoveTask,
}: {
  events: FlatCalendarEvent[];
  onMoveTask?: (actionId: string, newDateIso: string) => void;
}) {
  const byCol = useMemo(() => {
    const map = new Map<string, FlatCalendarEvent[]>();
    for (const col of COLUMNS) map.set(col.key, []);
    for (const e of events) {
      const k = map.has(e.category) ? e.category : "operativo";
      map.get(k)!.push(e);
    }
    for (const list of map.values()) list.sort((a, b) => a.start.getTime() - b.start.getTime());
    return map;
  }, [events]);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const list = byCol.get(col.key) ?? [];
        return (
          <div key={col.key} className={`rounded-sm border-t-2 ${col.accent} border border-border bg-card`}>
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="smallcaps text-xs">{col.label}</span>
              <span className="text-[10px] text-muted-foreground">{list.length}</span>
            </div>
            <div className="flex flex-col gap-1.5 p-2 max-h-[70vh] overflow-y-auto">
              {list.length === 0 ? (
                <p className="px-1 py-6 text-center text-[11px] text-muted-foreground">Sin eventos</p>
              ) : (
                list.map((e) => {
                  const cls = KIND_BAR_ALL[e.kind] ?? "bg-muted border-border text-foreground";
                  const label = e.title ?? ALL_LABELS[e.kind] ?? e.kind;
                  return (
                    <div key={e.id} className="rounded-sm border border-border bg-background p-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`inline-block rounded-sm border px-1.5 py-[1px] text-[9px] uppercase tracking-wider ${cls}`}>
                          {label}
                        </span>
                        {onMoveTask && e.sourceKind === "action" && e.sourceActionId ? (
                          <input
                            type="date"
                            value={format(e.start, "yyyy-MM-dd")}
                            onChange={(ev) => {
                              const v = ev.target.value;
                              if (v) onMoveTask(e.sourceActionId!, v);
                            }}
                            className="rounded-sm border border-border bg-background px-1 py-[1px] text-[10px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/40"
                            title="Cambiar fecha de entrega"
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {format(e.start, "dd MMM", { locale: es })}
                            {e.start.toDateString() !== e.end.toDateString() && ` → ${format(e.end, "dd MMM", { locale: es })}`}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5">
                        {e.to ? (
                          <Link to={e.to} params={e.params as never} className="font-display text-sm hover:underline">
                            {e.subjectLabel}
                          </Link>
                        ) : (
                          <span className="font-display text-sm">{e.subjectLabel}</span>
                        )}
                        <div className="text-[10px] text-muted-foreground">{e.subjectGroup}</div>
                      </div>
                      {e.note && (
                        <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">{e.note}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}