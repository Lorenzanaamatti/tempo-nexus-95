import { Fragment, useMemo } from "react";
import { differenceInDays, isWithinInterval } from "date-fns";
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
}: {
  rows: TimelineRow[];
  start: Date;
  end: Date;
  ticks: { date: Date; label: string; major?: boolean }[];
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
                  {row.events
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

// helper used by callers
export function eventIsInRange(ev: { start: Date; end: Date }, start: Date, end: Date) {
  return isWithinInterval(ev.start, { start, end }) || isWithinInterval(ev.end, { start, end }) || (ev.start <= start && ev.end >= end);
}