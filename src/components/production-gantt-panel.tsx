import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductionGantt, GANTT_OWNER_LABEL, type GanttLegendItem, type GanttPhase, type GanttOwner } from "@/components/production-gantt";
import type { PhaseColorKey } from "@/lib/phase-catalog";
import { Rows3, LayoutList } from "lucide-react";

const db = supabase as any;

async function loadProductionIds(opts: { productionIds?: string[]; composerId?: string }) {
  if (opts.productionIds) return opts.productionIds;
  if (!opts.composerId) return [];
  const [direct, assigned] = await Promise.all([
    db.from("productions").select("id").eq("composer_id", opts.composerId),
    db.from("production_assignments").select("production_id").eq("composer_id", opts.composerId),
  ]);
  const ids = new Set<string>();
  ((direct.data ?? []) as any[]).forEach((r) => ids.add(r.id));
  ((assigned.data ?? []) as any[]).forEach((r) => r.production_id && ids.add(r.production_id));
  return Array.from(ids);
}

type Row = GanttPhase & { composerId: string | null; composerName: string | null };

export function ProductionGanttPanel({
  productionIds,
  composerId,
  defaultMode = "desplegado",
  showModeToggle = true,
  showFilters = false,
}: {
  productionIds?: string[];
  composerId?: string;
  defaultMode?: "desplegado" | "lineal";
  showModeToggle?: boolean;
  /** Muestra filtros por compositor, producción y responsable (vista global). */
  showFilters?: boolean;
}) {
  const [mode, setMode] = useState<"desplegado" | "lineal">(defaultMode);
  const [composerFilter, setComposerFilter] = useState("all");
  const [productionFilter, setProductionFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState<"all" | GanttOwner>("all");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["gantt-phases", productionIds ?? null, composerId ?? null],
    staleTime: 30_000,
    queryFn: async () => {
      const ids = await loadProductionIds({ productionIds, composerId });
      if (!ids.length) return { rows: [] as Row[], legend: [] as GanttLegendItem[] };
      const [prods, assignments, phases, catalog, evSubject, evSource] = await Promise.all([
        db.from("productions").select("id, title, composer_id, production_company, partner, platform, partner_company:production_companies(name), platform_ref:platforms(name)").in("id", ids),
        db.from("production_assignments").select("production_id, partner_company:production_companies(name)").in("production_id", ids).not("partner_company_id", "is", null),
        db
          .from("production_phases")
          .select("id, production_id, name, owner, start_date, end_date, status, notes, position, is_milestone, catalog_id")
          .in("production_id", ids)
          .order("position"),
        db.from("phase_catalog").select("id, name, color_key").order("position"),
        db
          .from("calendar_events")
          .select("id, subject_id, source_production_id, source_phase_id, title, note, start_date, end_date, kind")
          .eq("subject_type", "production")
          .in("subject_id", ids),
        db
          .from("calendar_events")
          .select("id, subject_id, source_production_id, source_phase_id, title, note, start_date, end_date, kind")
          .in("source_production_id", ids),
      ]);
      if (prods.error) throw prods.error;
      if (phases.error) throw phases.error;
      if (catalog.error) throw catalog.error;

      const catalogRows = (catalog.data ?? []) as { id: string; name: string; color_key: PhaseColorKey }[];
      const assignedClients = new Map<string, string>();
      ((assignments.data ?? []) as any[]).forEach((assignment) => {
        const name = assignment.partner_company?.name;
        if (name && !assignedClients.has(assignment.production_id)) assignedClients.set(assignment.production_id, name);
      });

      const catalogById = new Map(catalogRows.map((c) => [c.id, c]));
      const catalogByName = new Map(catalogRows.map((c) => [c.name.trim().toLowerCase(), c]));

      const composerIds = Array.from(
        new Set(((prods.data ?? []) as any[]).map((p) => p.composer_id).filter(Boolean)),
      );
      let names = new Map<string, string>();
      if (composerIds.length) {
        const { data: cs } = await db
          .from("composers")
          .select("id, full_name, artistic_name")
          .in("id", composerIds);
        names = new Map(((cs ?? []) as any[]).map((c) => [c.id, c.artistic_name || c.full_name]));
      }

      const meta = new Map<string, { title: string; composer_id: string | null; client: string | null }>(
        ((prods.data ?? []) as any[]).map((p) => [p.id, {
          title: p.title,
          composer_id: p.composer_id,
          client: p.partner_company?.name ?? assignedClients.get(p.id) ?? p.production_company ?? p.partner ?? p.platform_ref?.name ?? p.platform ?? null,
        }]),
      );

      const phaseRows: Row[] = ((phases.data ?? []) as any[])
        .filter((p) => p.start_date || p.end_date)
        .map((p) => {
          const m = meta.get(p.production_id);
          const catalogItem = catalogById.get(p.catalog_id) ?? catalogByName.get(String(p.name).trim().toLowerCase());
          return {
            id: p.id,
            name: p.name,
            owner: (p.owner ?? "agencia") as GanttOwner,
            start: p.start_date ?? p.end_date,
            end: p.end_date ?? p.start_date,
            status: (p.status ?? "planificada") as GanttPhase["status"],
            note: p.notes,
            milestone: !!p.is_milestone || p.start_date === p.end_date,
            productionId: p.production_id,
            productionTitle: m?.title ?? "Producción",
            productionClient: m?.client ?? null,
            composerId: m?.composer_id ?? null,
            composerName: m?.composer_id ? names.get(m.composer_id) ?? null : null,
            colorKey: catalogItem?.color_key ?? "graphite",
          } as Row;
        });

      // Eventos de calendario de la producción (los que no proceden de un proceso ya pintado)
      const seen = new Set<string>();
      const eventRows: Row[] = [...((evSubject.data ?? []) as any[]), ...((evSource.data ?? []) as any[])]
        .filter((e) => {
          if (!e.start_date && !e.end_date) return false;
          if (e.source_phase_id) return false;
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        })
        .map((e) => {
          const pid: string = e.source_production_id ?? e.subject_id;
          const m = meta.get(pid);
          const start = e.start_date ?? e.end_date;
          const end = e.end_date ?? e.start_date;
          const eventName = String(e.title || "Evento").split("·")[0].trim();
          const catalogItem = catalogByName.get(eventName.toLowerCase());
          return {
            id: `ev-${e.id}`,
            name: eventName,
            owner: "agencia" as GanttOwner,
            start,
            end,
            status: "planificada" as GanttPhase["status"],
            note: e.note,
            milestone: start === end,
            productionId: pid,
            productionTitle: m?.title ?? "Producción",
            productionClient: m?.client ?? null,
            composerId: m?.composer_id ?? null,
            composerName: m?.composer_id ? names.get(m.composer_id) ?? null : null,
            colorKey: catalogItem?.color_key ?? "graphite",
          } as Row;
        })
        .filter((r) => !!r.productionId && meta.has(r.productionId));

      return { rows: [...phaseRows, ...eventRows], legend: catalogRows.map((c) => ({ name: c.name, colorKey: c.color_key })) };
    },
  });

  const rows = data?.rows ?? [];

  const composerOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => { if (r.composerId && r.composerName) map.set(r.composerId, r.composerName); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const productionOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => { if (r.productionId) map.set(r.productionId, r.productionTitle ?? "Producción"); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = rows.filter(
    (r) =>
      (composerFilter === "all" || r.composerId === composerFilter) &&
      (productionFilter === "all" || r.productionId === productionFilter) &&
      (ownerFilter === "all" || r.owner === ownerFilter),
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando calendario…</p>;
  if (error) {
    return (
      <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p>No se pudo cargar el calendario de procesos.</p>
        <p className="mt-1 text-muted-foreground">{(error as any)?.message}</p>
        <Button className="mt-3" size="sm" variant="outline" onClick={() => refetch()}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {showModeToggle && (
          <>
            <Button size="sm" variant={mode === "desplegado" ? "default" : "outline"} onClick={() => setMode("desplegado")}>
              <LayoutList className="mr-1 h-4 w-4" />Desplegado
            </Button>
            <Button size="sm" variant={mode === "lineal" ? "default" : "outline"} onClick={() => setMode("lineal")}>
              <Rows3 className="mr-1 h-4 w-4" />Lineal
            </Button>
          </>
        )}
        {showFilters && (
          <>
            <Select value={composerFilter} onValueChange={setComposerFilter}>
              <SelectTrigger className="h-8 w-52 text-xs"><SelectValue placeholder="Compositor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los compositores</SelectItem>
                {composerOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={productionFilter} onValueChange={setProductionFilter}>
              <SelectTrigger className="h-8 w-52 text-xs"><SelectValue placeholder="Producción" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las producciones</SelectItem>
                {productionOptions.map(([id, title]) => <SelectItem key={id} value={id}>{title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={(v) => setOwnerFilter(v as any)}>
              <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Responsable" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los responsables</SelectItem>
                {(Object.keys(GANTT_OWNER_LABEL) as GanttOwner[]).map((o) => (
                  <SelectItem key={o} value={o}>{GANTT_OWNER_LABEL[o]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
      <ProductionGantt phases={filtered} mode={mode} legendItems={(data?.legend ?? []) as GanttLegendItem[]} />
    </div>
  );
}
