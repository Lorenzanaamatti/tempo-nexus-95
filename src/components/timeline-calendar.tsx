import { Fragment, useMemo, useRef, useState } from "react";
import { addDays, differenceInDays, format, isWithinInterval } from "date-fns";
import { Link } from "@tanstack/react-router";
import { AVAILABILITY_LABELS } from "@/components/availability-editor";
import type { TimelineRow } from "@/lib/calendar-api";
import { EXTRA_KIND_LABELS, KIND_BAR_ALL } from "@/lib/calendar-sources";

const ALL_LABELS: Record<string, string> = { ...AVAILABILITY_LABELS, ...EXTRA_KIND_LABELS };

export function TimelineCalendar({
  rows,
  start,
  end,
  ticks,
  onMoveTask,
}: {
  rows: TimelineRow[];
  start: Date;
  end: Date;
  ticks: { date: Date; label: string; major?: boolean }[];
  onMoveTask?: (actionId: string, newDateIso: string) => void;
}) {
  const totalDays = Math.max(1, differenceInDays(end, start));

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineRow[]>();
    for (const r of rows) {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    }
    return Array.from(map.entries());
  }, [rows]);

  function offsetPct(d: Date) {
    const days = differenceInDays(d, start);
    return Math.max(0, Math.min(100, (days / totalDays) * 100));
  }

  const laneRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<{ id: string; deltaPct: number } | null>(null);

  function startDrag(
    ev: React.PointerEvent<HTMLDivElement>,
    actionId: string,
    eventStart: Date,
    laneEl: HTMLDivElement,
  ) {
    if (!onMoveTask) return;
    const rect = laneEl.getBoundingClientRect();
    const startX = ev.clientX;
    const originalPct = offsetPct(eventStart);
    (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
    laneRef.current = laneEl;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const deltaPct = (dx / rect.width) * 100;
      setDragState({ id: actionId, deltaPct });
    };
    const onUp = (e: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const dx = e.clientX - startX;
      const dayDelta = Math.round((dx / rect.width) * totalDays);
      setDragState(null);
      if (dayDelta !== 0) {
        const newDate = addDays(eventStart, dayDelta);
        onMoveTask(actionId, format(newDate, "yyyy-MM-dd"));
      }
      // silence unused warning
      void originalPct;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="rounded-sm border border-border bg-card">
      {/* Header */}
      <div className="grid grid-cols-[200px_1fr] border-b border-border">
        <div className="border-r border-border p-2 smallcaps text-xs text-muted-foreground">
          Sujeto
        </div>
        <div className="relative h-10 overflow-hidden">
          <div className="absolute inset-0 flex">
            {ticks.map((t, i) => {
              const left = offsetPct(t.date);
              const nextLeft = i < ticks.length - 1 ? offsetPct(ticks[i + 1].date) : 100;
              return (
                <div
                  key={i}
                  className={`flex h-full items-center border-l text-[10px] ${
                    t.major ? "border-foreground/30 font-medium" : "border-border/60 text-muted-foreground"
                  }`}
                  style={{ position: "absolute", left: `${left}%`, width: `${Math.max(0, nextLeft - left)}%`, paddingLeft: 6 }}
                >
                  <span className="truncate capitalize">{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          Nada que mostrar con los filtros actuales.
        </div>
      ) : (
        grouped.map(([group, list]) => (
          <Fragment key={group}>
            <div className="bg-muted/40 px-3 py-1.5 smallcaps text-xs text-muted-foreground border-b border-border">
              {group} <span className="ml-2 opacity-60">{list.length}</span>
            </div>
            {list.map((row) => (
              <div key={row.id} className="grid grid-cols-[200px_1fr] border-b border-border/60 last:border-b-0">
                <div className="flex flex-col justify-center gap-0.5 border-r border-border p-2">
                  {row.to ? (
                    <Link
                      to={row.to}
                      params={row.params as never}
                      className="font-display text-sm hover:underline"
                    >
                      {row.label}
                    </Link>
                  ) : (
                    <span className="font-display text-sm">{row.label}</span>
                  )}
                  {row.sublabel && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {row.sublabel}
                    </span>
                  )}
                </div>
                <div className="relative h-12">
                  {/* tick guides */}
                  {ticks.map((t, i) => (
                    <div
                      key={i}
                      className={`absolute top-0 bottom-0 border-l ${
                        t.major ? "border-foreground/15" : "border-border/40"
                      }`}
                      style={{ left: `${offsetPct(t.date)}%` }}
                    />
                  ))}
                  <LaneEvents
                    laneKey={row.id}
                    row={row}
                    start={start}
                    end={end}
                    offsetPct={offsetPct}
                    onDragStart={startDrag}
                    onMoveTask={onMoveTask}
                    dragState={dragState}
                  />
                  {false && row.events
                    .filter((e) => e.end >= start && e.start <= end)
                    .map((e) => {
                      const clampedStart = e.start < start ? start : e.start;
                      const clampedEnd = e.end > end ? end : e.end;
                      const left = offsetPct(clampedStart);
                      const right = offsetPct(clampedEnd);
                      const width = Math.max(0.6, right - left);
                      return (
                        <div
                          key={e.id}
                          title={`${e.title ?? ALL_LABELS[e.kind] ?? e.kind} · ${e.start.toLocaleDateString("es-ES")} → ${e.end.toLocaleDateString("es-ES")}${e.note ? "\n" + e.note : ""}`}
                          className={`absolute top-1.5 bottom-1.5 overflow-hidden rounded-sm border px-1.5 text-[10px] leading-[9px] flex items-center ${KIND_BAR_ALL[e.kind] ?? "bg-muted border-border text-foreground"}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          <span className="truncate">
                            {e.title ?? ALL_LABELS[e.kind] ?? e.kind}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </Fragment>
        ))
      )}
    </div>
  );
}

function LaneEvents({
  row,
  start,
  end,
  offsetPct,
  onDragStart,
  onMoveTask,
  dragState,
}: {
  laneKey: string;
  row: TimelineRow;
  start: Date;
  end: Date;
  offsetPct: (d: Date) => number;
  onDragStart: (
    ev: React.PointerEvent<HTMLDivElement>,
    actionId: string,
    eventStart: Date,
    laneEl: HTMLDivElement,
  ) => void;
  onMoveTask?: (actionId: string, newDateIso: string) => void;
  dragState: { id: string; deltaPct: number } | null;
}) {
  const laneRef = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={laneRef} className="absolute inset-0">
      {row.events
        .filter((e) => e.end >= start && e.start <= end)
        .map((e) => {
          const clampedStart = e.start < start ? start : e.start;
          const clampedEnd = e.end > end ? end : e.end;
          const left = offsetPct(clampedStart);
          const right = offsetPct(clampedEnd);
          const width = Math.max(0.6, right - left);
          const rowEvent = e as typeof e & { sourceKind?: string | null; sourceActionId?: string | null };
          const draggable = !!onMoveTask && rowEvent.sourceKind === "action" && !!rowEvent.sourceActionId;
          const isDragging = dragState?.id === rowEvent.sourceActionId;
          const dx = isDragging ? dragState!.deltaPct : 0;
          return (
            <div
              key={e.id}
              title={`${e.title ?? ALL_LABELS[e.kind] ?? e.kind} · ${e.start.toLocaleDateString("es-ES")} → ${e.end.toLocaleDateString("es-ES")}${e.note ? "\n" + e.note : ""}`}
              className={`absolute top-1.5 bottom-1.5 overflow-hidden rounded-sm border px-1.5 text-[10px] leading-[9px] flex items-center ${KIND_BAR_ALL[e.kind] ?? "bg-muted border-border text-foreground"} ${draggable ? "cursor-grab active:cursor-grabbing select-none" : ""} ${isDragging ? "opacity-70 shadow-md" : ""}`}
              style={{ left: `calc(${left}% + ${dx}%)`, width: `${width}%`, touchAction: draggable ? "none" : undefined }}
              onPointerDown={(ev) => {
                if (!draggable) return;
                ev.preventDefault();
                if (laneRef.current) onDragStart(ev, rowEvent.sourceActionId!, e.start, laneRef.current);
              }}
            >
              <span className="truncate">
                {e.title ?? ALL_LABELS[e.kind] ?? e.kind}
              </span>
            </div>
          );
        })}
    </div>
  );
}

// helper used by callers
export function eventIsInRange(ev: { start: Date; end: Date }, start: Date, end: Date) {
  return isWithinInterval(ev.start, { start, end }) || isWithinInterval(ev.end, { start, end }) || (ev.start <= start && ev.end >= end);
}