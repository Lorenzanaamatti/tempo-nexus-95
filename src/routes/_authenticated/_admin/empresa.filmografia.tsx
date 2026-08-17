import { ExportRowsButton } from "@/components/export-rows-button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Film, Plus, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import { PRODUCTION_KIND_LABEL, type ProductionKind } from "@/lib/production-constants";
import { STAGE_DEFAULT_STATUS } from "@/lib/production-lifecycle";
import { posterUrl } from "@/lib/producciones-espanolas";
import { formatEUR } from "@/lib/money";

const db = supabase as any;
const ALL = "__all__";

export const Route = createFileRoute("/_authenticated/_admin/empresa/filmografia")({
  component: FilmografiaIC,
});

type Credit = { composerId: string | null; name: string; role: string };

type Entry = {
  key: string;
  title: string;
  year: string;
  kind: string;
  poster: string | null;
  company: string | null;
  director: string | null;
  credits: Credit[];
  source: "Producción IC" | "Externo" | "Producción española";
  budget: number | null;
  commission: number | null;
  to?: { path: string; id: string };
};

function useFilmografia() {
  return useQuery({
    queryKey: ["filmografia-ic"],
    queryFn: async () => {
      const [prods, assigns, composers, externals, espanolas, companies, directors] = await Promise.all([
        db.from("productions").select("id, title, year, kind, project_type, premiere_date, delivery_date, production_company, director, composer_id, partner_company_id, director_id, spanish_film_id, partner, fee_amount, ic_commission, ic_commission_pct"),
        db.from("production_assignments").select("production_id, composer_id, role_in_project"),
        db.from("composers").select("id, full_name, artistic_name, roster_role"),
        db.from("composer_filmography").select("id, composer_id, title, year, format, production_company, director, production_id"),
        db.from("producciones_espanolas").select("*").eq("ic_participo", true),
        db.from("production_companies").select("id, name"),
        db.from("directors").select("id, full_name"),
      ]);

      const composerById = new Map<string, any>(((composers.data ?? []) as any[]).map((c) => [c.id, c]));
      const companyById = new Map<string, string>(((companies.data ?? []) as any[]).map((c) => [c.id, c.name]));
      const directorById = new Map<string, string>(((directors.data ?? []) as any[]).map((d) => [d.id, d.full_name]));
      const nameOf = (id: string | null | undefined) => {
        const c = id ? composerById.get(id) : null;
        return c ? (c.artistic_name || c.full_name) : null;
      };

      const entries: Entry[] = [];
      const productionIds = new Set<string>();
      const espanolasByProd = new Map<string, any>();
      for (const e of (espanolas.data ?? []) as any[]) {
        if (e.produccion_ic_vinculada) espanolasByProd.set(e.produccion_ic_vinculada, e);
      }

      for (const p of (prods.data ?? []) as any[]) {
        productionIds.add(p.id);
        const credits: Credit[] = [];
        if (p.composer_id) credits.push({ composerId: p.composer_id, name: nameOf(p.composer_id) ?? "—", role: "Compositor principal" });
        for (const a of (assigns.data ?? []) as any[]) {
          if (a.production_id !== p.id || !a.composer_id) continue;
          if (credits.some((c) => c.composerId === a.composer_id)) continue;
          credits.push({ composerId: a.composer_id, name: nameOf(a.composer_id) ?? "—", role: a.role_in_project ?? "Participante" });
        }
        const linked = espanolasByProd.get(p.id);
        const yr = p.year ? String(p.year) : (p.premiere_date ?? p.delivery_date ?? "").slice(0, 4) || "Sin año";
        entries.push({
          key: `prod-${p.id}`,
          title: p.title,
          year: yr,
          kind: p.project_type ? (PRODUCTION_KIND_LABEL as any)[p.project_type] ?? p.kind ?? "Otro" : p.kind ?? "Otro",
          poster: linked ? posterUrl(linked.poster_path) : null,
          company: p.production_company ?? companyById.get(p.partner_company_id) ?? null,
          director: p.director ?? directorById.get(p.director_id) ?? null,
          credits,
          source: "Producción IC",
          budget: p.fee_amount == null ? null : Number(p.fee_amount),
          commission:
            p.ic_commission != null
              ? Number(p.ic_commission)
              : p.fee_amount != null && p.ic_commission_pct != null
                ? (Number(p.fee_amount) * Number(p.ic_commission_pct)) / 100
                : null,
          to: { path: "/producciones/$productionId", id: p.id },
        });
      }

      for (const f of (externals.data ?? []) as any[]) {
        if (f.production_id && productionIds.has(f.production_id)) continue;
        const name = nameOf(f.composer_id);
        entries.push({
          key: `ext-${f.id}`,
          title: f.title,
          year: f.year ? String(f.year) : "Sin año",
          kind: f.format ?? "Otro",
          poster: null,
          company: f.production_company ?? null,
          director: f.director ?? null,
          credits: name ? [{ composerId: f.composer_id, name, role: "Crédito externo" }] : [],
          source: "Externo",
          budget: null,
          commission: null,
        });
      }

      for (const e of (espanolas.data ?? []) as any[]) {
        if (e.produccion_ic_vinculada && productionIds.has(e.produccion_ic_vinculada)) continue;
        entries.push({
          key: `esp-${e.id}`,
          title: e.title_es ?? e.title,
          year: e.year ? String(e.year) : "Sin año",
          kind: e.media_type === "tv" ? "Serie" : "Película",
          poster: posterUrl(e.poster_path),
          company: (e.production_companies ?? [])[0] ?? null,
          director: (e.directors ?? [])[0] ?? null,
          credits: (e.representados_vinculados ?? []).map((id: string) => ({
            composerId: id, name: nameOf(id) ?? "—", role: "Participante",
          })),
          source: "Producción española",
          budget: null,
          commission: null,
        });
      }

      const roster = ((composers.data ?? []) as any[])
        .map((c) => ({ id: c.id, name: c.artistic_name || c.full_name }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return { entries, roster };
    },
  });
}

function FilmografiaIC() {
  const q = useFilmografia();
  const [year, setYear] = useState(ALL);
  const [kind, setKind] = useState(ALL);
  const [rep, setRep] = useState(ALL);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");

  const entries = q.data?.entries ?? [];
  const years = useMemo(() => [...new Set(entries.map((e) => e.year))].sort((a, b) => (a < b ? 1 : -1)), [entries]);
  const kinds = useMemo(() => [...new Set(entries.map((e) => e.kind).filter(Boolean))].sort(), [entries]);

  const rows = useMemo(
    () => entries
      .filter((e) => year === ALL || e.year === year)
      .filter((e) => kind === ALL || e.kind === kind)
      .filter((e) => rep === ALL || e.credits.some((c) => c.composerId === rep))
      .sort((a, b) => (a.year < b.year ? 1 : a.year > b.year ? -1 : a.title.localeCompare(b.title))),
    [entries, year, kind, rep],
  );

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">EMPRESA</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold title-caps">Filmografía IC</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Histórico completo de Interesante Compañía: producciones propias, créditos externos del roster y
            producciones españolas en las que IC participó.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportRowsButton rows={rows} filename="filmografia-ic" sheetName="Filmografía" />
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los años</SelectItem>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los tipos</SelectItem>
              {kinds.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={rep} onValueChange={setRep}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los representados</SelectItem>
              {(q.data?.roster ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-sm border border-border">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              aria-label="Vista de lista"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              aria-label="Vista de cuadrícula"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Entrada histórica</Button>
        </div>
      </div>

      <div className="mt-8">
        {q.isLoading ? (
          <ListSkeleton rows={8} variant={view === "grid" ? "grid" : "list"} />
        ) : !rows.length ? (
          <EmptyState icon={Film} title="Sin registros" description="Añade una entrada histórica o marca producciones españolas con participación de IC." />
        ) : view === "list" ? (
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-3 py-2">Título</th>
                  <th className="px-3 py-2">Roster asociado</th>
                  <th className="px-3 py-2">Productora</th>
                  <th className="px-3 py-2">Año</th>
                  <th className="px-3 py-2 text-right">Presupuesto</th>
                  <th className="px-3 py-2 text-right">Comisión IC</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.key} className="border-b border-border/60 last:border-0 align-top">
                    <td className="px-3 py-2">
                      <span className="font-display">
                        {e.to ? (
                          <Link to="/producciones/$productionId" params={{ productionId: e.to.id }} className="hover:underline">{e.title}</Link>
                        ) : e.title}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">{e.kind}</span>
                      {e.source !== "Producción IC" && (
                        <Badge variant="outline" className="ml-2 rounded-sm text-[10px]">{e.source}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {e.credits.length ? (
                        <div className="flex flex-wrap gap-1">
                          {e.credits.map((c, i) => (
                            <Badge key={`${e.key}-l-${c.composerId}-${i}`} variant="secondary" className="rounded-sm text-[10px]">
                              {c.name} · {c.role}
                            </Badge>
                          ))}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2">{e.company ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{e.year}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{e.budget != null ? formatEUR(e.budget) : "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{e.commission != null ? formatEUR(e.commission) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/30 font-mono text-xs">
                  <td className="px-3 py-2" colSpan={4}>{rows.length} registros</td>
                  <td className="px-3 py-2 text-right">{formatEUR(rows.reduce((s, e) => s + (e.budget ?? 0), 0))}</td>
                  <td className="px-3 py-2 text-right">{formatEUR(rows.reduce((s, e) => s + (e.commission ?? 0), 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((e) => (
              <article key={e.key} className="overflow-hidden rounded-sm border border-border">
                {e.poster ? (
                  <img src={e.poster} alt="" loading="lazy" className="aspect-[2/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted">
                    <Film className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-2 p-3">
                  <p className="font-display leading-tight">
                    {e.to ? (
                      <Link to="/producciones/$productionId" params={{ productionId: e.to.id }} className="hover:underline">{e.title}</Link>
                    ) : e.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.year} · {e.kind}</p>
                  <p className="text-xs text-muted-foreground">{[e.company, e.director].filter(Boolean).join(" · ") || "—"}</p>
                  <div className="flex flex-wrap gap-1">
                    {e.credits.map((c, i) => (
                      <Badge key={`${e.key}-${c.composerId}-${i}`} variant="secondary" className="rounded-sm text-[10px]">
                        {c.name} · {c.role}
                      </Badge>
                    ))}
                    {e.source !== "Producción IC" && (
                      <Badge variant="outline" className="rounded-sm text-[10px]">{e.source === "Externo" ? "Externo" : "Producción española"}</Badge>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <HistoricalDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function HistoricalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ProductionKind>("cine");
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await db.from("productions").insert({
      title: title.trim(),
      project_type: kind,
      kind: PRODUCTION_KIND_LABEL[kind],
      year: year ? Number(year) : null,
      is_historical: true,
      status: STAGE_DEFAULT_STATUS.finalizada,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Entrada histórica añadida");
    setTitle(""); setYear("");
    onOpenChange(false);
    qc.invalidateQueries({ queryKey: ["filmografia-ic"] });
    qc.invalidateQueries({ queryKey: ["productions-lifecycle"] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva entrada histórica</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as ProductionKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRODUCTION_KIND_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Año</Label><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !title.trim()}>Añadir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
