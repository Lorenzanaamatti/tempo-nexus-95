import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AVAILABILITY_COLORS,
  AVAILABILITY_LABELS,
  type AvailabilityKind,
} from "@/components/availability-editor";

export const Route = createFileRoute("/_authenticated/_admin/calendar")({
  component: GlobalCalendar,
});

type Row = {
  id: string;
  kind: AvailabilityKind;
  start_date: string;
  end_date: string;
  note: string | null;
  composer_id: string;
  composers: { id: string; full_name: string } | null;
};

function monthKey(iso: string) {
  // YYYY-MM
  return iso.slice(0, 7);
}

function fmtMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function fmtRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const a = new Date(start + "T00:00:00").toLocaleDateString("es-ES", opts);
  const b = new Date(end + "T00:00:00").toLocaleDateString("es-ES", opts);
  return a === b ? a : `${a} → ${b}`;
}

function GlobalCalendar() {
  const [kindFilter, setKindFilter] = useState<AvailabilityKind | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["availability-global"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("composer_availability")
        .select("id, kind, start_date, end_date, note, composer_id, composers(id, full_name)")
        .gte("end_date", today)
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const grouped = useMemo(() => {
    const rows = (data ?? []).filter((r) => kindFilter === "all" || r.kind === kindFilter);
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const k = monthKey(r.start_date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data, kindFilter]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Interesante Compañía</p>
          <h1 className="mt-1 font-display text-5xl italic">Calendario general</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Periodos de disponibilidad de todos los compositores del roster, agrupados por mes.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={kindFilter === "all"} onClick={() => setKindFilter("all")}>Todos</FilterChip>
          {(Object.keys(AVAILABILITY_LABELS) as AvailabilityKind[]).map((k) => (
            <FilterChip
              key={k}
              active={kindFilter === k}
              onClick={() => setKindFilter(k)}
              className={AVAILABILITY_COLORS[k]}
            >
              {AVAILABILITY_LABELS[k]}
            </FilterChip>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="font-display italic text-muted-foreground">Cargando calendario…</p>
      ) : grouped.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center">
          <p className="font-display text-2xl italic">No hay periodos próximos.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Los periodos que añadan los compositores aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(([month, rows]) => (
            <section key={month}>
              <h2 className="mb-3 font-display text-2xl italic capitalize">{fmtMonth(month)}</h2>
              <div className="space-y-2">
                {rows.map((r) => (
                  <Link
                    key={r.id}
                    to="/composers/$composerId"
                    params={{ composerId: r.composer_id }}
                    className={`flex flex-wrap items-center gap-3 rounded-sm border p-3 text-sm transition hover:border-foreground/60 ${AVAILABILITY_COLORS[r.kind]}`}
                  >
                    <span className="smallcaps min-w-[90px]">{AVAILABILITY_LABELS[r.kind]}</span>
                    <span className="font-display text-base italic">{r.composers?.full_name ?? "—"}</span>
                    <span className="ml-auto text-xs">{fmtRange(r.start_date, r.end_date)}</span>
                    {r.note && <span className="basis-full text-xs italic opacity-80">{r.note}</span>}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-3 py-1 text-xs transition ${
        active ? "border-foreground" : "border-border opacity-70 hover:opacity-100"
      } ${className}`}
    >
      {children}
    </button>
  );
}