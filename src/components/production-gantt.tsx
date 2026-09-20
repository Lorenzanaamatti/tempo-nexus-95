import { useMemo } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { PHASE_COLOR_CLASS, type PhaseColorKey } from "@/lib/phase-catalog";

export type GanttOwner = "agencia" | "representado" | "productora";

export type GanttPhase = {
  id: string;
  name: string;
  owner: GanttOwner;
  start: string; // yyyy-mm-dd
  end: string; // yyyy-mm-dd
  status: string;
  note?: string | null;
  milestone?: boolean;
  productionId?: string;
  productionTitle?: string;
  colorKey?: PhaseColorKey;
};

export const GANTT_OWNER_LABEL: Record<GanttOwner, string> = {
  agencia: "Agencia",
  representado: "Representado",
  productora: "Productora / Cliente",
};

const OWNER_ORDER: GanttOwner[] = ["agencia", "representado", "productora"];

const DAY = 86400000;

function d(v: string) {
  return new Date(`${v}T00:00:00`).getTime();
}

function weeksBetween(from: number, to: number) {
  const out: { label: string; year: string; start: number; end: number }[] = [];
  let cur = startOfWeek(new Date(from), { weekStartsOn: 1 });
  while (cur.getTime() < to) {
    const next = addDays(cur, 7);
    out.push({
      label: `${format(cur, "d/M", { locale: es })}–${format(next, "d/M", { locale: es })}`,
      year: format(cur, "yyyy"),
      start: cur.getTime(),
      end: next.getTime(),
    });
    cur = next;
  }
  return out;
}

function fmt(v: string) {
  const [y, m, day] = v.split("-");
  return `${day}/${m}/${y}`;
}

export type GanttLegendItem = { name: string; colorKey: PhaseColorKey };

export function GanttLegend({ items }: { items: GanttLegendItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      {items.map((item) => (
        <span key={item.name} className="inline-flex items-center gap-2">
          <span className={`h-3 w-6 rounded-[2px] ${PHASE_COLOR_CLASS[item.colorKey]}`} />
          {item.name}
        </span>
      ))}
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-[2px] bg-primary" /> Hoy
      </span>
    </div>
  );
}

/**
 * mode "desplegado": una fila por fase, agrupadas por responsable (o por producción si hay varias).
 * mode "lineal": una fila por producción, con todas sus fases en la misma línea, para detectar solapes.
 */
export function ProductionGantt({
  phases,
  mode = "desplegado",
  today = new Date(),
  legendItems = [],
}: {
  phases: GanttPhase[];
  mode?: "desplegado" | "lineal";
  today?: Date;
  legendItems?: GanttLegendItem[];
}) {
  const dated = phases
    .filter((p) => p.start || p.end)
    .map((p) => ({ ...p, start: p.start || p.end, end: p.end || p.start }));

  const model = useMemo(() => {
    if (!dated.length) return null;
    const rawMin = Math.min(...dated.map((p) => d(p.start)));
    const rawMax = Math.max(...dated.map((p) => d(p.end)));
    const min = startOfWeek(new Date(rawMin), { weekStartsOn: 1 });
    const max = addDays(startOfWeek(new Date(rawMax), { weekStartsOn: 1 }), 7);
    const from = min.getTime();
    const to = max.getTime();
    return { from, to, span: Math.max(to - from, DAY), weeks: weeksBetween(from, to) };
  }, [dated]);

  if (!model) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay nada con fechas. Añade procesos o eventos en la sección «Procesos de la producción» y «Eventos en el calendario» de la ficha.
      </p>
    );
  }

  const pct = (t: number) => ((t - model.from) / model.span) * 100;
  const todayPct = pct(today.getTime());

  const Grid = () => (
    <div className="pointer-events-none absolute inset-0 flex">
      {model.weeks.map((m) => (
        <div
          key={m.start}
          style={{ width: `${((Math.min(m.end, model.to) - m.start) / model.span) * 100}%` }}
          className="border-l border-border/50"
        />
      ))}
    </div>
  );

  const Bar = ({ p, compact }: { p: GanttPhase; compact?: boolean }) => {
    const left = pct(d(p.start));
    const width = Math.max(pct(d(p.end) + DAY) - left, 1.2);
    const color = PHASE_COLOR_CLASS[p.colorKey ?? "graphite"];
    const title = `${p.name} · ${fmt(p.start)} – ${fmt(p.end)}${p.note ? ` · ${p.note}` : ""}`;
    if (compact) {
      return (
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${p.milestone ? `h-3 w-3 rotate-45 ${color}` : `h-4 rounded-[3px] ${color}`}`}
          style={p.milestone ? { left: `${left}%` } : { left: `${left}%`, width: `${width}%` }}
          title={title}
        />
      );
    }
    return (
      <div className="relative" style={{ marginLeft: `${left}%`, width: `${width}%` }}>
        {p.milestone ? (
          <div className={`h-4 w-4 rotate-45 ${color}`} title={title} />
        ) : (
          <div className={`h-5 rounded-[3px] ${color}`} title={title} />
        )}
        {p.note ? (
          <p className="mt-1 truncate text-[11px] text-muted-foreground" title={p.note}>
            {p.note}
          </p>
        ) : null}
      </div>
    );
  };

  const productions = Array.from(
    new Map(dated.map((p) => [p.productionId ?? "__", p.productionTitle ?? "Producción"])).entries(),
  );
  const multi = productions.length > 1;

  return (
    <div className="space-y-4">
      <GanttLegend items={legendItems} />
      <div className="overflow-x-auto rounded-sm border border-border">
        <div className="min-w-[760px]">
          <div className="flex border-b border-border bg-muted/40">
            <div className="w-56 shrink-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {mode === "lineal" ? "Producción" : "Fase"}
            </div>
            <div className="relative flex-1">
              <div className="flex border-b border-border/60">
                {Array.from(new Set(model.weeks.map((w) => w.year))).map((year) => {
                  const count = model.weeks.filter((w) => w.year === year).length;
                  return <div key={year} className="border-l border-border px-2 py-1 text-center text-xs font-semibold" style={{ width: `${(count / model.weeks.length) * 100}%` }}>{year}</div>;
                })}
              </div>
              <div className="flex">
                {model.weeks.map((m) => (
                  <div
                    key={m.start}
                    style={{ width: `${((Math.min(m.end, model.to) - m.start) / model.span) * 100}%` }}
                    className="border-l border-border px-1 py-2 text-center text-[10px] text-muted-foreground"
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {mode === "lineal"
            ? productions.map(([pid, title]) => {
                const rows = dated.filter((p) => (p.productionId ?? "__") === pid);
                return (
                  <div key={pid} className="flex border-b border-border/60 last:border-b-0">
                    <div className="w-56 shrink-0 px-3 py-3">
                      <p className="text-sm font-medium leading-tight">{title}</p>
                      <p className="text-[11px] text-muted-foreground">{rows.length} fases</p>
                    </div>
                    <div className="relative min-h-[46px] flex-1 py-3">
                      <Grid />
                      {todayPct >= 0 && todayPct <= 100 && (
                        <div className="absolute inset-y-0 w-[2px] bg-primary/70" style={{ left: `${todayPct}%` }} />
                      )}
                      {rows.map((p) => (
                        <Bar key={p.id} p={p} compact />
                      ))}
                    </div>
                  </div>
                );
              })
            : (multi ? productions.map(([pid, title]) => ({ key: pid, label: title, rows: dated.filter((p) => (p.productionId ?? "__") === pid) }))
                     : OWNER_ORDER.filter((o) => dated.some((p) => p.owner === o)).map((o) => ({ key: o, label: GANTT_OWNER_LABEL[o], rows: dated.filter((p) => p.owner === o) }))
              ).map((group) => (
                <div key={group.key}>
                  <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-3 py-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide">{group.label}</span>
                    <span className="text-[10px] text-muted-foreground">{group.rows.length} procesos</span>
                  </div>
                  {group.rows
                    .slice()
                    .sort((a, b) => d(a.start) - d(b.start))
                    .map((p) => (
                      <div key={p.id} className="flex border-b border-border/60 last:border-b-0">
                        <div className="w-56 shrink-0 px-3 py-3">
                          <p className="text-sm font-medium leading-tight">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {multi ? `${GANTT_OWNER_LABEL[p.owner]} · ` : ""}
                            {fmt(p.start)} – {fmt(p.end)}
                          </p>
                        </div>
                        <div className="relative flex-1 py-3">
                          <Grid />
                          {todayPct >= 0 && todayPct <= 100 && (
                            <div className="absolute inset-y-0 w-[2px] bg-primary/70" style={{ left: `${todayPct}%` }} />
                          )}
                          <Bar p={p} />
                        </div>
                      </div>
                    ))}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
