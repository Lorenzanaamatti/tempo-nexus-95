import { useMemo, useState } from "react";
import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "@tanstack/react-router";
import { AVAILABILITY_LABELS } from "@/components/availability-editor";
import { EXTRA_KIND_LABELS, KIND_BAR_ALL } from "@/lib/calendar-sources";

const ALL_LABELS: Record<string, string> = { ...AVAILABILITY_LABELS, ...EXTRA_KIND_LABELS };

export type FlatCalendarEvent = {
  id: string;
  start: Date;
  end: Date;
  kind: string;
  title?: string;
  note?: string | null;
  category: string;
  subjectLabel: string;
  subjectGroup: string;
  to?: string;
  params?: Record<string, string>;
  sourceKind?: string | null;
  sourceActionId?: string | null;
};

export function CalendarMonthGrid({
  anchor,
  events,
  onMoveTask,
}: {
  anchor: Date;
  events: FlatCalendarEvent[];
  onMoveTask?: (actionId: string, newDateIso: string) => void;
}) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { locale: es });
  const gridEnd = endOfWeek(monthEnd, { locale: es });
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart.getTime(), gridEnd.getTime()],
  );

  const weekdayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, i) => format(addDays(gridStart, i), "EEE", { locale: es })),
    [gridStart.getTime()],
  );

  const [dragOverIso, setDragOverIso] = useState<string | null>(null);

  return (
    <div className="rounded-sm border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {weekdayLabels.map((w, i) => (
          <div key={i} className="px-2 py-1.5 smallcaps text-[10px] text-muted-foreground border-r border-border/60 last:border-r-0">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[minmax(120px,1fr)]">
        {days.map((day) => {
          const dayEvents = events.filter((e) => day >= startOfDay(e.start) && day <= startOfDay(e.end));
          const inMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          const dayIso = format(day, "yyyy-MM-dd");
          const isDropTarget = dragOverIso === dayIso;
          return (
            <div
              key={day.toISOString()}
              className={`relative border-r border-b border-border/60 last:border-r-0 p-1.5 flex flex-col gap-1 ${
                inMonth ? "bg-card" : "bg-muted/20 text-muted-foreground"
              } ${isDropTarget ? "ring-2 ring-foreground/40 bg-foreground/[0.03]" : ""}`}
              onDragOver={(e) => {
                if (!onMoveTask) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverIso !== dayIso) setDragOverIso(dayIso);
              }}
              onDragLeave={() => {
                if (dragOverIso === dayIso) setDragOverIso(null);
              }}
              onDrop={(e) => {
                if (!onMoveTask) return;
                e.preventDefault();
                const actionId = e.dataTransfer.getData("text/x-action-id");
                setDragOverIso(null);
                if (actionId) onMoveTask(actionId, dayIso);
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-medium ${
                    isToday ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background" : ""
                  }`}
                >
                  {format(day, "d", { locale: es })}
                </span>
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 3}</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((e) => {
                  const cls = KIND_BAR_ALL[e.kind] ?? "bg-muted border-border text-foreground";
                  const label = e.title ?? ALL_LABELS[e.kind] ?? e.kind;
                  const draggable = !!onMoveTask && e.sourceKind === "action" && !!e.sourceActionId;
                  const inner = (
                    <span className="truncate">
                      <span className="opacity-70 mr-1">{e.subjectLabel}</span>
                      {label}
                    </span>
                  );
                  return (
                    <div
                      key={e.id}
                      title={`${e.subjectLabel} · ${label}\n${e.start.toLocaleDateString("es-ES")} → ${e.end.toLocaleDateString("es-ES")}${e.note ? "\n" + e.note : ""}`}
                      className={`rounded-sm border px-1.5 py-[2px] text-[10px] leading-tight flex items-center ${cls} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
                      draggable={draggable}
                      onDragStart={(ev) => {
                        if (!draggable) return;
                        ev.dataTransfer.effectAllowed = "move";
                        ev.dataTransfer.setData("text/x-action-id", e.sourceActionId!);
                      }}
                    >
                      {e.to ? (
                        <Link to={e.to} params={e.params as never} className="block w-full truncate hover:underline">
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}