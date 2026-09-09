import { useMemo } from "react";

export type GanttOwner = "agencia" | "representado" | "productora";

export type GanttPhase = {
  id: string;
  name: string;
  owner: GanttOwner;
  start: string; // yyyy-mm-dd
  end: string; // yyyy-mm-dd
  status: "planificada" | "en_curso" | "completada" | "bloqueada";
  note?: string | null;
  milestone?: boolean;
  productionId?: string;
  productionTitle?: string;
};

export const GANTT_OWNER_LABEL: Record<GanttOwner, string> = {
  agencia: "Agencia",
  representado: "Representado",
  productora: "Productora / Cliente",
};

const OWNER_ORDER: GanttOwner[] = ["agencia", "representado", "productora"];

export const GANTT_STATUS_STYLE: Record<GanttPhase["status"], { bar: string; label: string }> = {
  planificada: { bar: "bg-muted-foreground/25 border border-dashed border-muted-foreground/50", label: "Planificada" },
  en_curso: { bar: "bg-primary", label: "En curso" },
  completada: { bar: "bg-emerald-500", label: "Completada" },
  bloqueada: { bar: "bg-amber-500", label: "Bloqueada" },
};

const DAY = 86400000;

function d(v: string) {
  return new Date(`${v}T00:00:00`).getTime();
}

function monthsBetween(from: number, to: number) {
  const out: { label: string; start: number; end: number }[] = [];
  const cur = new Date(from);
  cur.setDate(1);
  while (cur.getTime() <= to) {
    const start = cur.getTime();
    const next = new Date(cur);
    next.setMonth(next.getMonth() + 1);
    out.push({
      label: cur.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }).replace(".", ""),
      start,
      end: next.getTime(),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

function fmt(v: string) {
  const [y, m, day] = v.split("-");
  return `${day}/${m}/${y}`;
}

export function GanttLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      {Object.entries(GANTT_STATUS_STYLE).map(([k, s]) => (
        <span key={k} className="inline-flex items-center gap-2">
          <span className={`h-3 w-6 rounded-[2px] ${s.bar}`} />
          {s.label}
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
}: {
  phases: GanttPhase[];
  mode?: "desplegado" | "lineal";
  today?: Date;
}) {
  const dated = phases
    .filter((p) => p.start || p.end)
    .map((p) => ({ ...p, start: p.start || p.end, end: p.end || p.start }));

  const model = useMemo(() => {
    if (!dated.length) return null;
    const rawMin = Math.min(...dated.map((p) => d(p.start)));
    const rawMax = Math.max(...dated.map((p) => d(p.end)));
    const min = new Date(rawMin);
    min.setDate(1);
    const max = new Date(rawMax);
    max.setMonth(max.getMonth() + 1, 0);
    const from = min.getTime();
    const to = max.getTime();
    return { from, to, span: Math.max(to - from, DAY), months: monthsBetween(from, to) };
  }, [dated]);

  if (!model) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay procesos con fechas. Añádelas en la ficha de la producción.
      </p>
    );
  }

  const pct = (t: number) => ((t - model.from) / model.span) * 100;
  const todayPct = pct(today.getTime());

  const Grid = () => (
    <div className="pointer-events-none absolute inset-0 flex">
      {model.months.map((m) => (
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
    const st = GANTT_STATUS_STYLE[p.status];
    const title = `${p.name} · ${fmt(p.start)} – ${fmt(p.end)}${p.note ? ` · ${p.note}` : ""}`;
    if (compact) {
      return (
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${p.milestone ? "h-3 w-3 rotate-45 bg-primary" : `h-4 rounded-[3px] ${st.bar}`}`}
          style={p.milestone ? { left: `${left}%` } : { left: `${left}%`, width: `${width}%` }}
          title={title}
        />
      );
    }
    return (
      <div className="relative" style={{ marginLeft: `${left}%`, width: `${width}%` }}>
        {p.milestone ? (
          <div className="h-4 w-4 rotate-45 bg-primary" title={title} />
        ) : (
          <div className={`h-5 rounded-[3px] ${st.bar}`} title={title} />
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
      <GanttLegend />
      <div className="overflow-x-auto rounded-sm border border-border">
        <div className="min-w-[760px]">
          <div className="flex border-b border-border bg-muted/40">
            <div className="w-56 shrink-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {mode === "lineal" ? "Producción" : "Fase"}
            </div>
            <div className="relative flex-1">
              <div className="flex h-full">
                {model.months.map((m) => (
                  <div
                    key={m.start}
                    style={{ width: `${((Math.min(m.end, model.to) - m.start) / model.span) * 100}%` }}
                    className="border-l border-border px-2 py-2 text-[10px] uppercase tracking-wide text-muted-foreground"
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
