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
};

const OWNER_LABEL: Record<GanttOwner, string> = {
  agencia: "Agencia",
  representado: "Representado",
  productora: "Productora / Cliente",
};

const OWNER_ORDER: GanttOwner[] = ["agencia", "representado", "productora"];

const STATUS_STYLE: Record<GanttPhase["status"], { bar: string; label: string }> = {
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

export function ProductionGantt({
  phases,
  today = new Date(),
}: {
  phases: GanttPhase[];
  today?: Date;
}) {
  const model = useMemo(() => {
    if (!phases.length) return null;
    const starts = phases.map((p) => d(p.start));
    const ends = phases.map((p) => d(p.end));
    const rawMin = Math.min(...starts);
    const rawMax = Math.max(...ends);
    const min = new Date(rawMin);
    min.setDate(1);
    const max = new Date(rawMax);
    max.setMonth(max.getMonth() + 1, 0);
    const from = min.getTime();
    const to = max.getTime();
    const span = Math.max(to - from, DAY);
    return { from, to, span, months: monthsBetween(from, to) };
  }, [phases]);

  if (!model) {
    return <p className="text-sm text-muted-foreground">Sin fases planificadas todavía.</p>;
  }

  const pct = (t: number) => ((t - model.from) / model.span) * 100;
  const todayPct = pct(today.getTime());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {Object.entries(STATUS_STYLE).map(([k, s]) => (
          <span key={k} className="inline-flex items-center gap-2">
            <span className={`h-3 w-6 rounded-[2px] ${s.bar}`} />
            {s.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-[2px] bg-primary" /> Hoy
        </span>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border">
        <div className="min-w-[760px]">
          {/* header */}
          <div className="flex border-b border-border bg-muted/40">
            <div className="w-56 shrink-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fase
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

          {OWNER_ORDER.filter((o) => phases.some((p) => p.owner === o)).map((owner) => (
            <div key={owner}>
              <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-3 py-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide">{OWNER_LABEL[owner]}</span>
                <span className="text-[10px] text-muted-foreground">
                  {phases.filter((p) => p.owner === owner).length} procesos
                </span>
              </div>
              {phases
                .filter((p) => p.owner === owner)
                .sort((a, b) => d(a.start) - d(b.start))
                .map((p) => {
                  const left = pct(d(p.start));
                  const width = Math.max(pct(d(p.end) + DAY) - left, 1.2);
                  const st = STATUS_STYLE[p.status];
                  return (
                    <div key={p.id} className="flex border-b border-border/60 last:border-b-0">
                      <div className="w-56 shrink-0 px-3 py-3">
                        <p className="text-sm font-medium leading-tight">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {fmt(p.start)} – {fmt(p.end)}
                        </p>
                      </div>
                      <div className="relative flex-1 py-3">
                        {/* month grid */}
                        <div className="pointer-events-none absolute inset-0 flex">
                          {model.months.map((m) => (
                            <div
                              key={m.start}
                              style={{ width: `${((Math.min(m.end, model.to) - m.start) / model.span) * 100}%` }}
                              className="border-l border-border/50"
                            />
                          ))}
                        </div>
                        {todayPct >= 0 && todayPct <= 100 && (
                          <div className="absolute inset-y-0 w-[2px] bg-primary/70" style={{ left: `${todayPct}%` }} />
                        )}
                        <div className="relative" style={{ marginLeft: `${left}%`, width: `${width}%` }}>
                          {p.milestone ? (
                            <div className="h-4 w-4 rotate-45 bg-primary" title={p.name} />
                          ) : (
                            <div className={`h-5 rounded-[3px] ${st.bar}`} />
                          )}
                          {p.note ? (
                            <p className="mt-1 truncate text-[11px] text-muted-foreground" title={p.note}>
                              {p.note}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
