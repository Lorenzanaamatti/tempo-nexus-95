import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDateEs } from "@/lib/dates";
import { PRODUCTION_KIND_LABEL, PRODUCTION_STATUS_LABEL, type ProductionKind } from "@/lib/production-constants";
import { PRODUCTION_STAGE_LABEL, PRODUCTION_STAGE_TONE, stageOf } from "@/lib/production-lifecycle";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { Clapperboard, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

export const PRODUCTION_SELECT =
  "id, title, project_type, kind, status, year, delivery_date, premiere_date, created_at, partner, production_company, partner_company_id, platform, composer_id, composers(full_name, artistic_name), partner_company:production_companies(name)";

export type ProductionRecord = {
  id: string;
  title: string;
  project_type: ProductionKind | null;
  kind: string | null;
  status: string | null;
  year: number | null;
  delivery_date: string | null;
  premiere_date: string | null;
  created_at: string;
  partner: string | null;
  production_company: string | null;
  platform: string | null;
  composers?: { full_name: string | null; artistic_name: string | null } | null;
  partner_company?: { name: string | null } | null;
  /** Origen del registro: producción IC, crédito de la ficha del representado o CRM de producciones españolas. */
  source?: "ic" | "ficha" | "espanola";
  /** Id del compositor (para créditos que vienen de una ficha). */
  composer_id?: string | null;
  /** Nombre del representado o profesional acreditado cuando no hay ficha vinculada. */
  credited_name?: string | null;
};

const normalize = (v: string | null | undefined) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const keyOf = (title: string | null | undefined, year: number | string | null | undefined) =>
  `${normalize(title)}::${year ?? ""}`;

/**
 * Producciones consolidadas: registros propios de IC + créditos de las fichas de
 * los representados que aún no tienen producción + producciones españolas con
 * representados vinculados. Se deduplica por título y año.
 */
export function useProductions() {
  return useQuery({
    queryKey: ["productions-lifecycle"],
    queryFn: async () => {
      const db = supabase as any;
      const [prodRes, filmoRes, espRes, composersRes] = await Promise.all([
        db.from("productions").select(PRODUCTION_SELECT).order("created_at", { ascending: false }),
        db
          .from("composer_filmography")
          .select("id, composer_id, title, year, format, production_company, director, platform, production_id, created_at"),
        db
          .from("producciones_espanolas")
          .select(
            "id, title, title_es, year, media_type, release_date, platform, production_companies, composer, ic_participo, produccion_ic_vinculada, created_at",
          )
          .eq("ic_participo", true),
        db.from("composers").select("id, full_name, artistic_name"),
      ]);
      if (prodRes.error) throw prodRes.error;

      const base = (prodRes.data ?? []) as ProductionRecord[];
      const rows: ProductionRecord[] = base.map((p) => ({ ...p, source: "ic" as const }));
      const seen = new Set(rows.map((p) => keyOf(p.title, p.year)));
      const composerById = new Map<string, { full_name: string | null; artistic_name: string | null }>(
        ((composersRes.data ?? []) as any[]).map((c) => [c.id, { full_name: c.full_name, artistic_name: c.artistic_name }]),
      );
      const currentYear = new Date().getFullYear();

      // Créditos de las fichas de representados sin producción IC vinculada.
      for (const f of (filmoRes.data ?? []) as any[]) {
        if (f.production_id) continue;
        const k = keyOf(f.title, f.year);
        if (seen.has(k)) continue;
        seen.add(k);
        rows.push({
          id: `ficha:${f.id}`,
          title: f.title ?? "Sin título",
          project_type: null,
          kind: f.format ?? null,
          status: f.year && Number(f.year) > currentYear ? "en_produccion" : "finalizada",
          year: f.year ? Number(f.year) : null,
          delivery_date: null,
          premiere_date: null,
          created_at: f.created_at ?? new Date().toISOString(),
          partner: null,
          production_company: f.production_company ?? null,
          platform: f.platform ?? null,
          composers: f.composer_id ? composerById.get(f.composer_id) ?? null : null,
          composer_id: f.composer_id ?? null,
          source: "ficha",
        });
      }

      // Producciones españolas con participación IC que aún no tienen ficha propia.
      for (const e of (espRes.data ?? []) as any[]) {
        if (e.produccion_ic_vinculada) continue;
        const title = e.title_es || e.title;
        const k = keyOf(title, e.year);
        if (seen.has(k)) continue;
        seen.add(k);
        const companies: string[] = Array.isArray(e.production_companies) ? e.production_companies : [];
        rows.push({
          id: `espanola:${e.id}`,
          title: title ?? "Sin título",
          project_type: null,
          kind: e.media_type === "tv" ? "Serie" : "Cine",
          status: e.year && Number(e.year) > currentYear ? "en_produccion" : "finalizada",
          year: e.year ? Number(e.year) : null,
          delivery_date: null,
          premiere_date: e.release_date ?? null,
          created_at: e.created_at ?? new Date().toISOString(),
          partner: null,
          production_company: companies[0] ?? null,
          platform: e.platform ?? null,
          composers: null,
          credited_name: e.composer ?? null,
          source: "espanola",
        });
      }

      return rows;
    },
  });
}

export function composerName(p: ProductionRecord) {
  return p.composers?.artistic_name || p.composers?.full_name || p.credited_name || "—";
}

export function clientName(p: ProductionRecord) {
  return p.partner_company?.name || p.production_company || p.partner || p.platform || "—";
}

export function StageBadge({ status }: { status: string | null }) {
  const stage = stageOf(status);
  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-[10px] smallcaps ${PRODUCTION_STAGE_TONE[stage]}`}
      title={status ? PRODUCTION_STATUS_LABEL[status as keyof typeof PRODUCTION_STATUS_LABEL] ?? status : undefined}
    >
      {PRODUCTION_STAGE_LABEL[stage]}
    </span>
  );
}

function EntryTitle({ p }: { p: ProductionRecord }) {
  const cls = "font-display hover:underline";
  if (p.source === "ficha") {
    return p.composer_id ? (
      <Link to="/composers/$composerId" params={{ composerId: p.composer_id }} className={cls}>
        {p.title}
      </Link>
    ) : (
      <span className="font-display">{p.title}</span>
    );
  }
  if (p.source === "espanola") {
    return (
      <Link to="/producciones/espanolas" className={cls}>
        {p.title}
      </Link>
    );
  }
  return (
    <Link to="/producciones/$productionId" params={{ productionId: p.id }} className={cls}>
      {p.title}
    </Link>
  );
}

const SOURCE_LABEL: Record<NonNullable<ProductionRecord["source"]>, string> = {
  ic: "IC",
  ficha: "Ficha representado",
  espanola: "CRM españolas",
};

function SourceBadge({ source }: { source: ProductionRecord["source"] }) {
  if (!source || source === "ic") return null;
  return (
    <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] smallcaps text-muted-foreground">
      {SOURCE_LABEL[source]}
    </span>
  );
}

export function ProductionsTable({ rows, showFinishDate = false }: { rows: ProductionRecord[]; showFinishDate?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2 smallcaps text-xs">Título</th>
            <th className="px-3 py-2 smallcaps text-xs">Compositor</th>
            <th className="px-3 py-2 smallcaps text-xs">Cliente / Partner</th>
            <th className="px-3 py-2 smallcaps text-xs">Inicio</th>
            <th className="px-3 py-2 smallcaps text-xs">Entrega prevista</th>
            {showFinishDate && <th className="px-3 py-2 smallcaps text-xs">Fecha finalización</th>}
            <th className="px-3 py-2 smallcaps text-xs">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-muted/30">
              <td className="px-3 py-2">
                <EntryTitle p={p} />
                {p.project_type && <span className="ml-2 text-xs text-muted-foreground">{PRODUCTION_KIND_LABEL[p.project_type]}</span>}
                <SourceBadge source={p.source} />
              </td>
              <td className="px-3 py-2 text-muted-foreground">{composerName(p)}</td>
              <td className="px-3 py-2 text-muted-foreground">{clientName(p)}</td>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDateEs(p.created_at)}</td>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDateEs(p.delivery_date)}</td>
              {showFinishDate && (
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDateEs(p.premiere_date ?? p.delivery_date)}</td>
              )}
              <td className="px-3 py-2"><StageBadge status={p.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function YearGroupedProductions({ rows }: { rows: ProductionRecord[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, ProductionRecord[]>();
    for (const p of rows) {
      const iso = p.premiere_date ?? p.delivery_date;
      const year = p.year ? String(p.year) : iso ? iso.slice(0, 4) : "Sin año";
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(p);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      {groups.map(([year, items]) => {
        const isCollapsed = collapsed[year];
        return (
          <section key={year}>
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [year]: !c[year] }))}
              className="mb-2 flex items-center gap-2 font-display text-2xl title-caps"
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              {year}
              <span className="text-sm text-muted-foreground tabular-nums">({items.length})</span>
            </button>
            {!isCollapsed && <ProductionsTable rows={items} showFinishDate />}
          </section>
        );
      })}
    </div>
  );
}

export function ProductionSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Buscar título…" className="w-56 rounded-sm" />;
}

export { Clapperboard, ListSkeleton, EmptyState };
