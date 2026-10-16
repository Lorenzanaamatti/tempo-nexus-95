import { useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { addDays, format, getISOWeekYear, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { type PhaseColorKey } from "@/lib/phase-catalog";
import { fallbackProjectColor, projectColorVar } from "@/lib/project-palette";
import { ProjectColorPicker } from "@/components/project-color-picker";

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
  productionClient?: string | null;
  colorKey?: PhaseColorKey;
  productionColor?: string | null;
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
      label: `${format(cur, "d/M", { locale: es })}-${format(next, "d/M", { locale: es })}`,
      year: String(getISOWeekYear(cur)),
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

/**
 * Nombre de la producción en la columna fija: abre su ficha para editarla.
 * Sin id (filas sueltas o agrupadas por responsable) se muestra como texto.
 */
function ProductionLink({ id, title, small = false }: { id?: string; title: string; small?: boolean }) {
  const base = small
    ? "mt-0.5 block text-xs font-medium leading-tight"
    : "block text-sm font-medium leading-tight";
  if (!id || id === "__") return <p className={`${base} text-foreground`}>{title}</p>;
  return (
    <Link
      to="/producciones/$productionId"
      params={{ productionId: id }}
      title={`Abrir la ficha de ${title}`}
      className={`${base} text-aubergine underline-offset-4 hover:underline focus-visible:underline`}
    >
      {title}
    </Link>
  );
}

export type GanttLegendItem = { name: string; colorKey: PhaseColorKey };

export function GanttLegend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      {items.map((item) => (
        <span key={item.name} className="inline-flex items-center gap-2">
          <span className="h-3 w-6 rounded-[2px]" style={{ background: projectColorVar(item.color) }} />
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayTime = today.getTime();
  const dated = phases
    .filter((p) => p.start || p.end)
    .map((p) => ({ ...p, start: p.start || p.end, end: p.end || p.start }));

  const model = useMemo(() => {
    if (!dated.length) return null;
    const rawMin = Math.min(todayTime, ...dated.map((p) => d(p.start)));
    const rawMax = Math.max(addDays(today, 84).getTime(), ...dated.map((p) => d(p.end)));
    const min = startOfWeek(new Date(rawMin), { weekStartsOn: 1 });
    const max = addDays(startOfWeek(new Date(rawMax), { weekStartsOn: 1 }), 7);
    const from = min.getTime();
    const to = max.getTime();
    return { from, to, span: Math.max(to - from, DAY), weeks: weeksBetween(from, to) };
  }, [dated, todayTime]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !model) return;
    const weekWidth = 72;
    const elapsedWeeks = Math.max(0, (todayTime - model.from) / (7 * DAY));
    container.scrollLeft = elapsedWeeks * weekWidth;
  }, [model, todayTime]);

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

  const Bar = ({ p, color }: { p: GanttPhase; color: string }) => {
    const bg = projectColorVar(color);
    const title = `${p.name} · ${fmt(p.start)} – ${fmt(p.end)}${p.note ? ` · ${p.note}` : ""}`;
    if (p.milestone) {
      const date = new Date(`${p.start}T00:00:00`);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }).getTime();
      const weekLeft = pct(weekStart);
      const weekWidth = pct(weekStart + 7 * DAY) - weekLeft;
      const dayOffset = Math.max(0, Math.min(6, Math.round((d(p.start) - weekStart) / DAY)));
      const markerLeft = 6 + (Math.min(dayOffset, 4) / 4) * 88;
      return (
        <>
          <div className="absolute inset-y-1 rounded-[3px]" style={{ left: `${weekLeft}%`, width: `${weekWidth}%`, background: bg }} title={title}>
            <span
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/20 bg-background shadow-sm"
              style={{ left: `${markerLeft}%` }}
              aria-hidden
            />
          </div>
          <span className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap pl-1.5 text-[11px] font-medium text-foreground" style={{ left: `${weekLeft + weekWidth}%` }}>
            {p.name}
          </span>
        </>
      );
    }
    const left = pct(d(p.start));
    const width = Math.max(pct(d(p.end) + DAY) - left, 1.2);
    const days = Math.round((d(p.end) - d(p.start)) / DAY) + 1;
    const inside = days >= 10 || width >= 8;
    return (
      <>
        <div
          className="absolute inset-y-1 flex items-center overflow-hidden rounded-[3px] px-1.5"
          style={{ left: `${left}%`, width: `${width}%`, background: bg, color: "var(--proj-fg)" }}
          title={title}
        >
          {inside && <span className="truncate text-[11px] font-semibold">{p.name}</span>}
        </div>
        {!inside && (
          <span className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap pl-1.5 text-[11px] font-medium text-foreground" style={{ left: `${left + width}%` }}>
            {p.name}
          </span>
        )}
      </>
    );
  };

  const groups = Array.from(
    dated.reduce((map, p) => {
      const key = p.productionId ?? "__";
      if (!map.has(key)) map.set(key, { id: key, title: p.productionTitle ?? "Producción", client: p.productionClient ?? null, color: p.productionColor || fallbackProjectColor(key), rows: [] as GanttPhase[] });
      map.get(key)!.rows.push(p);
      return map;
    }, new Map<string, { id: string; title: string; client: string | null; color: string; rows: GanttPhase[] }>()).values(),
  );
  groups.forEach((g) => g.rows.sort((a, b) => d(a.start) - d(b.start) || d(a.end) - d(b.end)));
  void mode; void legendItems;
  const timelineWidth = Math.max(760, 224 + model.weeks.length * 72);
  const TodayLine = () =>
    todayPct >= 0 && todayPct <= 100 ? <div className="absolute inset-y-0 z-[1] w-[2px] bg-primary/70" style={{ left: `${todayPct}%` }} /> : null;

  return (
    <div className="space-y-4">
      <GanttLegend items={groups.map((g) => ({ name: g.title, color: g.color }))} />
      <div ref={scrollRef} className="overflow-x-auto rounded-sm border border-border">
        <div style={{ minWidth: `${timelineWidth}px` }}>
          <div className="flex border-b border-border bg-muted/40">
            <div className="sticky left-0 z-20 w-56 shrink-0 bg-muted px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Proyecto · fase
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

          {groups.map((g) => (
            <div key={g.id} className="border-b-2 border-border last:border-b-0">
              <div className="flex border-b border-border/60 bg-muted/20">
                <div className="sticky left-0 z-10 flex w-56 shrink-0 items-start gap-2 bg-muted px-3 py-2">
                  {g.id !== "__" ? <ProjectColorPicker productionId={g.id} value={g.color} /> : null}
                  <div className="min-w-0">
                    <ProductionLink id={g.id} title={g.title} />
                    <p className="text-[11px] text-muted-foreground">{g.client ?? "Cliente pendiente"} · {g.rows.length} fases</p>
                  </div>
                </div>
                <div className="relative flex-1"><Grid /><TodayLine /></div>
              </div>
              {g.rows.map((p) => (
                <div key={p.id} className="flex border-b border-border/40 last:border-b-0">
                  <div className="sticky left-0 z-10 w-56 shrink-0 bg-background px-3 py-1.5 pl-9">
                    <p className="truncate text-xs font-medium leading-tight" title={p.name}>{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{fmt(p.start)}{p.end !== p.start ? ` – ${fmt(p.end)}` : ""}</p>
                  </div>
                  <div className="relative h-9 flex-1">
                    <Grid />
                    <TodayLine />
                    <Bar p={p} color={g.color} />
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
