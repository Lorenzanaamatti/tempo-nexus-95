import { ExportRowsButton } from "@/components/export-rows-button";
import { Money } from "@/components/money";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Film, Plus, LayoutGrid, List, MoreHorizontal } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { addCuentaObjetivo, addDirector, addPlataforma, addProductora, addProspectFichaje } from "@/lib/crm-quick-add";

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
  platform: string | null;
  director: string | null;
  externalComposer: string | null;
  credits: Credit[];
  source: "Producción IC" | "Externo" | "Producción española";
  budget: number | null;
  commission: number | null;
  to?: { path: string; id: string };
  externalId?: string;
  espanolaId?: string;
};

function useFilmografia() {
  return useQuery({
    queryKey: ["filmografia-ic"],
    queryFn: async () => {
      const [prods, assigns, composers, externals, espanolas, companies, directors] = await Promise.all([
        db.from("productions").select("id, title, year, kind, project_type, premiere_date, delivery_date, production_company, director, composer_id, partner_company_id, director_id, spanish_film_id, partner, platform, external_composer, fee_amount, ic_commission, ic_commission_pct"),
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
          platform: p.platform ?? null,
          externalComposer: p.external_composer ?? null,
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
          platform: null,
          externalComposer: null,
          director: f.director ?? null,
          credits: name ? [{ composerId: f.composer_id, name, role: "Crédito externo" }] : [],
          source: "Externo",
          budget: null,
          commission: null,
          externalId: f.id,
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
          platform: e.platform ?? null,
          externalComposer: e.composer ?? null,
          director: (e.directors ?? [])[0] ?? null,
          credits: (e.representados_vinculados ?? []).map((id: string) => ({
            composerId: id, name: nameOf(id) ?? "—", role: "Participante",
          })),
          source: "Producción española",
          budget: null,
          commission: null,
          espanolaId: e.id,
        });
      }

      const roster = ((composers.data ?? []) as any[])
        .map((c) => ({ id: c.id, name: c.artistic_name || c.full_name }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return { entries, roster };
    },
  });
}

/** Alta directa de los datos de la fila en el resto de CRMs de la app. */
function CrmQuickAdd({ e }: { e: Entry }) {
  const rosterNames = new Set(e.credits.map((c) => c.name.toLowerCase()));
  const composerExterno =
    e.externalComposer && !rosterNames.has(e.externalComposer.toLowerCase()) ? e.externalComposer : null;
  const items: { label: string; run: () => Promise<void> }[] = [];
  if (e.company) {
    items.push({ label: `Productora · ${e.company}`, run: () => addProductora(e.company!) });
    items.push({ label: `Cuenta objetivo · ${e.company}`, run: () => addCuentaObjetivo(e.company!, "productora", `Detectada en «${e.title}» (${e.year})`) });
  }
  if (e.platform) {
    items.push({ label: `Plataforma · ${e.platform}`, run: () => addPlataforma(e.platform!) });
    items.push({ label: `Cuenta objetivo · ${e.platform}`, run: () => addCuentaObjetivo(e.platform!, "plataforma", `Detectada en «${e.title}» (${e.year})`) });
  }
  if (e.director) items.push({ label: `Director/a · ${e.director}`, run: () => addDirector(e.director!) });
  if (composerExterno)
    items.push({
      label: `Prospect de fichaje · ${composerExterno}`,
      run: () => addProspectFichaje(composerExterno, `Compositor de «${e.title}» (${e.year})`),
    });

  if (!items.length) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Añadir datos de ${e.title} a otros CRM`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Añadir a CRM</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((it, i) => (
          <DropdownMenuItem key={i} onSelect={() => void it.run()}>{it.label}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EntryTitle({ e, onExternal }: { e: Entry; onExternal: (e: Entry) => void }) {
  if (e.to) {
    return (
      <Link to="/producciones/$productionId" params={{ productionId: e.to.id }} className="hover:underline">
        {e.title}
      </Link>
    );
  }
  if (e.externalId) {
    return (
      <button type="button" className="text-left hover:underline" onClick={() => onExternal(e)}>
        {e.title}
      </button>
    );
  }
  if (e.espanolaId) {
    return (
      <Link to="/producciones/espanolas" className="hover:underline">
        {e.title}
      </Link>
    );
  }
  return <>{e.title}</>;
}

function FilmografiaIC() {
  const q = useFilmografia();
  const [year, setYear] = useState(ALL);
  const [kind, setKind] = useState(ALL);
  const [rep, setRep] = useState(ALL);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("list");
  const [external, setExternal] = useState<Entry | null>(null);

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
                  <th className="px-3 py-2">Plataforma</th>
                  <th className="px-3 py-2">Año</th>
                  <th className="px-3 py-2 text-right">Presupuesto</th>
                  <th className="px-3 py-2 text-right">Comisión IC</th>
                  <th className="px-3 py-2 text-right">CRM</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.key} className="border-b border-border/60 last:border-0 align-top">
                    <td className="px-3 py-2">
                      <span className="font-display">
                        <EntryTitle e={e} onExternal={setExternal} />
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
                    <td className="px-3 py-2">{e.platform ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{e.year}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{e.budget != null ? formatEUR(e.budget) : "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{e.commission != null ? formatEUR(e.commission) : "—"}</td>
                    <td className="px-3 py-2 text-right"><CrmQuickAdd e={e} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/30 font-mono text-xs">
                  <td className="px-3 py-2" colSpan={5}>{rows.length} registros</td>
                  <td className="px-3 py-2 text-right"><Money value={rows.reduce((s, e) => s + (e.budget ?? 0), 0)} /></td>
                  <td className="px-3 py-2 text-right"><Money value={rows.reduce((s, e) => s + (e.commission ?? 0), 0)} /></td>
                  <td className="px-3 py-2" />
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
                    <EntryTitle e={e} onExternal={setExternal} />
                  </p>
                  <p className="text-xs text-muted-foreground">{e.year} · {e.kind}</p>
                  <p className="text-xs text-muted-foreground">{[e.company, e.platform, e.director].filter(Boolean).join(" · ") || "—"}</p>
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
                  <CrmQuickAdd e={e} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <HistoricalDialog open={open} onOpenChange={setOpen} />
      <ExternalCreditDialog entry={external} onOpenChange={(v) => !v && setExternal(null)} />
    </div>
  );
}

function HistoricalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    kind: "cine" as ProductionKind,
    year: "",
    production_company: "",
    director: "",
    composer_id: "",
    external_composer: "",
    music_supervisor_name: "",
    platform: "",
    premiere_date: "",
    fee_amount: "",
    ic_commission_pct: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const roster = useQuery({
    queryKey: ["roster-min"],
    queryFn: async () => {
      const { data } = await db.from("composers").select("id, full_name, artistic_name").order("full_name");
      return ((data ?? []) as any[]).map((c) => ({ id: c.id, name: c.artistic_name || c.full_name }));
    },
    enabled: open,
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  /** Garantiza que la producción también exista en Producciones españolas. */
  async function ensureEspanola(productionId: string) {
    const { data: linked } = await db
      .from("producciones_espanolas")
      .select("id")
      .eq("produccion_ic_vinculada", productionId)
      .maybeSingle();
    if (linked) return;
    const { data: match } = await db
      .from("producciones_espanolas")
      .select("id")
      .ilike("title", form.title.trim())
      .limit(1)
      .maybeSingle();
    const payload = {
      title: form.title.trim(),
      title_es: form.title.trim(),
      year: form.year ? Number(form.year) : null,
      media_type: form.kind === "serie" ? "tv" : "movie",
      composer: form.external_composer || roster.data?.find((r) => r.id === form.composer_id)?.name || null,
      music_supervisor: form.music_supervisor_name || null,
      platform: form.platform || null,
      production_companies: form.production_company ? [form.production_company] : [],
      directors: form.director ? [form.director] : [],
      ic_participo: true,
      produccion_ic_vinculada: productionId,
      origen: "produccion_ic",
    };
    if (match) await db.from("producciones_espanolas").update(payload).eq("id", (match as any).id);
    else await db.from("producciones_espanolas").insert(payload);
  }

  async function save() {
    if (!form.title.trim()) return toast.error("El título es obligatorio");
    setSaving(true);
    const fee = form.fee_amount ? Number(form.fee_amount) : null;
    const pct = form.ic_commission_pct ? Number(form.ic_commission_pct) : null;
    const { data, error } = await db
      .from("productions")
      .insert({
        title: form.title.trim(),
        project_type: form.kind,
        kind: PRODUCTION_KIND_LABEL[form.kind],
        year: form.year ? Number(form.year) : null,
        production_company: form.production_company || null,
        director: form.director || null,
        composer_id: form.composer_id || null,
        external_composer: form.external_composer || null,
        music_supervisor_name: form.music_supervisor_name || null,
        platform: form.platform || null,
        premiere_date: form.premiere_date || null,
        fee_amount: fee,
        ic_commission_pct: pct,
        ic_commission: fee != null && pct != null ? (fee * pct) / 100 : null,
        notes: form.notes || null,
        is_historical: true,
        status: STAGE_DEFAULT_STATUS.finalizada,
      })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      return toast.error(error?.message ?? "No se pudo crear la ficha");
    }
    const id = (data as any).id as string;
    try {
      await ensureEspanola(id);
    } catch {
      /* la sincronización automática de la base de datos se encarga si falla */
    }
    setSaving(false);
    toast.success("Ficha creada y vinculada a producciones españolas");
    onOpenChange(false);
    qc.invalidateQueries({ queryKey: ["filmografia-ic"] });
    qc.invalidateQueries({ queryKey: ["productions-lifecycle"] });
    qc.invalidateQueries({ queryKey: ["producciones-espanolas"] });
    void navigate({ to: "/producciones/$productionId", params: { productionId: id } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Nueva entrada histórica</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Título</Label><Input value={form.title} onChange={(e) => set({ title: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={form.kind} onValueChange={(v) => set({ kind: v as ProductionKind })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRODUCTION_KIND_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Año</Label><Input type="number" value={form.year} onChange={(e) => set({ year: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Estreno</Label><Input type="date" value={form.premiere_date} onChange={(e) => set({ premiere_date: e.target.value })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label>Productora</Label><Input value={form.production_company} onChange={(e) => set({ production_company: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Director/a</Label><Input value={form.director} onChange={(e) => set({ director: e.target.value })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Representado IC</Label>
              <Select value={form.composer_id || undefined} onValueChange={(v) => set({ composer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  {(roster.data ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Compositor externo</Label><Input value={form.external_composer} onChange={(e) => set({ external_composer: e.target.value })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label>Supervisión musical</Label><Input value={form.music_supervisor_name} onChange={(e) => set({ music_supervisor_name: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Plataforma</Label><Input value={form.platform} onChange={(e) => set({ platform: e.target.value })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label>Presupuesto (€)</Label><Input type="number" value={form.fee_amount} onChange={(e) => set({ fee_amount: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Comisión IC (%)</Label><Input type="number" value={form.ic_commission_pct} onChange={(e) => set({ ic_commission_pct: e.target.value })} /></div>
          </div>
          <div className="grid gap-1.5"><Label>Notas</Label><Input value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.title.trim()}>Crear ficha y abrir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/** Edita un crédito externo del roster y permite convertirlo en producción IC. */
function ExternalCreditDialog({
  entry, onOpenChange,
}: { entry: Entry | null; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", year: "", format: "", production_company: "", director: "" });
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (entry && loadedFor !== entry.externalId) {
    setLoadedFor(entry.externalId ?? null);
    setForm({
      title: entry.title,
      year: entry.year === "Sin año" ? "" : entry.year,
      format: entry.kind === "Otro" ? "" : entry.kind,
      production_company: entry.company ?? "",
      director: entry.director ?? "",
    });
  }

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["filmografia-ic"] });
    qc.invalidateQueries({ queryKey: ["composer"] });
  };

  async function save() {
    if (!entry?.externalId) return;
    setSaving(true);
    const { error } = await db
      .from("composer_filmography")
      .update({
        title: form.title.trim(),
        year: form.year ? Number(form.year) : null,
        format: form.format || null,
        production_company: form.production_company || null,
        director: form.director || null,
      })
      .eq("id", entry.externalId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Crédito actualizado");
    refresh();
    onOpenChange(false);
  }

  async function remove() {
    if (!entry?.externalId) return;
    if (!confirm("¿Eliminar este crédito externo?")) return;
    setSaving(true);
    const { error } = await db.from("composer_filmography").delete().eq("id", entry.externalId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Crédito eliminado");
    refresh();
    onOpenChange(false);
  }

  /** Crea una ficha de producción IC completa a partir del crédito externo. */
  async function promote() {
    if (!entry?.externalId) return;
    setSaving(true);
    const { data, error } = await db
      .from("productions")
      .insert({
        title: form.title.trim(),
        kind: form.format || "Otro",
        year: form.year ? Number(form.year) : null,
        production_company: form.production_company || null,
        director: form.director || null,
        composer_id: entry.credits[0]?.composerId ?? null,
        is_historical: true,
        status: STAGE_DEFAULT_STATUS.finalizada,
      })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      return toast.error(error?.message ?? "No se pudo crear la ficha");
    }
    const id = (data as any).id as string;
    await db.from("composer_filmography").update({ production_id: id }).eq("id", entry.externalId);
    setSaving(false);
    toast.success("Ficha de producción creada");
    refresh();
    onOpenChange(false);
    void navigate({ to: "/producciones/$productionId", params: { productionId: id } });
  }

  return (
    <Dialog open={!!entry} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>Crédito externo · {entry?.title}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Esta entrada procede de la filmografía de {entry?.credits[0]?.name ?? "un representado"} y no tenía ficha de
          producción propia. Corrige los datos aquí o conviértela en producción IC para gestionar créditos completos.
        </p>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Título</Label><Input value={form.title} onChange={(e) => set({ title: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label>Año</Label><Input type="number" value={form.year} onChange={(e) => set({ year: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Formato</Label><Input value={form.format} onChange={(e) => set({ format: e.target.value })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label>Productora</Label><Input value={form.production_company} onChange={(e) => set({ production_company: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label>Director/a</Label><Input value={form.director} onChange={(e) => set({ director: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={remove} disabled={saving}>Eliminar</Button>
          <Button variant="outline" onClick={promote} disabled={saving || !form.title.trim()}>Convertir en producción IC</Button>
          <Button onClick={save} disabled={saving || !form.title.trim()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
