import { ExportRowsButton } from "@/components/export-rows-button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Search, Film, Download, LayoutGrid, List as ListIcon, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import {
  EN_SEGUIMIENTO, PROSPECCION_ESTADOS, PROSPECCION_LABEL, posterUrl,
  ROLES_FICHAJE,
  type ProduccionEspanola, type ProspeccionEstado,
} from "@/lib/producciones-espanolas";
import {
  enrichEspanolas, importEspanolasYearPage, importProduccionEspanola, searchTmdbEspanolas,
  syncProduccionesEspanolas,
} from "@/lib/producciones-espanolas.functions";
import { addCompanyToCrm, addDirectorToCrm, addPlatformToCrm, addToRoster, addToTargetAccounts } from "@/lib/spanish-films-crm";
import { addEspanolaToProducciones, addPartner, addProspectFichaje } from "@/lib/espanolas-actions";
import { cn } from "@/lib/utils";

const db = supabase as any;
const ALL = "__all__";

export const Route = createFileRoute("/_authenticated/_admin/producciones/espanolas")({
  component: ProduccionesEspanolas,
});

function useEspanolas() {
  return useQuery({
    queryKey: ["producciones-espanolas"],
    queryFn: async () => {
      // PostgREST devuelve como máximo 1000 filas por petición: paginamos por bloques.
      const all: ProduccionEspanola[] = [];
      const size = 1000;
      for (let from = 0; from < 40_000; from += size) {
        const { data, error } = await db
          .from("producciones_espanolas")
          .select("*")
          .order("year", { ascending: false, nullsFirst: false })
          .order("title", { ascending: true })
          .range(from, from + size - 1);
        if (error) throw error;
        const chunk = (data ?? []) as ProduccionEspanola[];
        all.push(...chunk);
        if (chunk.length < size) break;
      }
      return all;
    },
  });
}

function ProduccionesEspanolas() {
  const qc = useQueryClient();
  const rowsQ = useEspanolas();
  const searchFn = useServerFn(searchTmdbEspanolas);
  const importFn = useServerFn(importProduccionEspanola);
  const syncFn = useServerFn(syncProduccionesEspanolas);
  const yearFn = useServerFn(importEspanolasYearPage);
  const enrichFn = useServerFn(enrichEspanolas);

  const [q, setQ] = useState("");
  const [year, setYear] = useState(ALL);
  const [genre, setGenre] = useState(ALL);
  const [platform, setPlatform] = useState(ALL);
  const [icFilter, setIcFilter] = useState(ALL);
  const [tmdbResults, setTmdbResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<ProduccionEspanola | null>(null);
  const [view, setView] = useState<"lista" | "fichas">("lista");
  const [bulk, setBulk] = useState<{ running: boolean; label: string; done: number }>({
    running: false, label: "", done: 0,
  });
  const [enriching, setEnriching] = useState<{ running: boolean; remaining: number | null }>({
    running: false, remaining: null,
  });

  const all = rowsQ.data ?? [];
  const years = useMemo(() => [...new Set(all.map((r) => r.year).filter(Boolean))].sort((a, b) => (b as number) - (a as number)), [all]);
  const genres = useMemo(() => [...new Set(all.flatMap((r) => r.genres ?? []))].sort(), [all]);
  const platforms = useMemo(() => [...new Set(all.map((r) => r.platform).filter(Boolean))].sort() as string[], [all]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      if (year !== ALL && String(r.year ?? "") !== year) return false;
      if (genre !== ALL && !(r.genres ?? []).includes(genre)) return false;
      if (platform !== ALL && r.platform !== platform) return false;
      if (icFilter !== ALL && r.ic_participo !== true) return false;
      if (!needle) return true;
      return [r.title, r.title_original, r.title_es, ...(r.directors ?? []), ...(r.production_companies ?? [])]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [all, q, year, genre, platform, icFilter]);

  async function runTmdbSearch() {
    setSearching(true);
    try {
      const res = await searchFn({ data: { query: q.trim(), year: year === ALL ? null : Number(year), mediaType: "all" } });
      setTmdbResults(res as any[]);
      if (!res.length) toast.info("Sin resultados en TMDb");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al buscar en TMDb");
    } finally {
      setSearching(false);
    }
  }

  async function importOne(r: any) {
    setImportingId(r.tmdb_id);
    try {
      await importFn({ data: { tmdbId: r.tmdb_id, mediaType: r.media_type } });
      toast.success(`"${r.title}" importada`);
      setTmdbResults((prev) => prev?.map((x) => (x.tmdb_id === r.tmdb_id ? { ...x, already_imported: true } : x)) ?? null);
      qc.invalidateQueries({ queryKey: ["producciones-espanolas"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al importar");
    } finally {
      setImportingId(null);
    }
  }

  async function runSync() {
    setSyncing(true);
    try {
      const res = await syncFn({});
      toast.success(`${(res as any).updated} fichas actualizadas`);
      qc.invalidateQueries({ queryKey: ["producciones-espanolas"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  /** Completa por lotes compositor, supervisor, productoras, plataforma y taquilla. */
  async function runEnrich() {
    setEnriching({ running: true, remaining: null });
    try {
      for (;;) {
        const res = (await enrichFn({ data: { limit: 24 } })) as { enriched: number; remaining: number };
        setEnriching({ running: true, remaining: res.remaining });
        qc.invalidateQueries({ queryKey: ["producciones-espanolas"] });
        if (res.enriched === 0 || res.remaining === 0) break;
      }
      toast.success("Créditos musicales completados");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al completar créditos");
    } finally {
      setEnriching({ running: false, remaining: null });
      qc.invalidateQueries({ queryKey: ["producciones-espanolas"] });
    }
  }


  /** Importa el catálogo completo de cine español desde `desde` hasta el año en curso. */
  async function runBulkImport(desde = 2020) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const hasta = new Date().getFullYear();
    setBulk({ running: true, label: `Preparando ${desde}–${hasta}…`, done: 0 });
    let total = 0;
    try {
      for (let y = hasta; y >= desde; y--) {
        let page = 1;
        let totalPages = 1;
        do {
          const res = (await yearFn({ data: { year: y, page } })) as {
            saved: number; totalPages: number; totalResults: number;
          };
          totalPages = res.totalPages;
          total += res.saved;
          setBulk({ running: true, label: `${y} · página ${page}/${totalPages}`, done: total });
          page++;
        } while (page <= totalPages);
        qc.invalidateQueries({ queryKey: ["producciones-espanolas"] });
      }
      toast.success(`Catálogo importado: ${total} títulos entre ${desde} y ${hasta}`);
      void runEnrich();
    } catch (e: any) {
      toast.error(e?.message ?? "Error al importar el catálogo");
    } finally {
      setBulk({ running: false, label: "", done: total });
      qc.invalidateQueries({ queryKey: ["producciones-espanolas"] });
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">PRODUCCIONES</p>
          <h1 className="mt-2 font-display text-5xl font-extrabold title-caps">Producciones españolas</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            CRM de mercado: cine y series españolas, participe o no Interesante Compañía. Inteligencia de mercado y prospección.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => runBulkImport(2020)} disabled={bulk.running}>
            {bulk.running ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            {bulk.running ? `Importando… ${bulk.label}` : "Importar catálogo 2020–hoy"}
          </Button>
          <Button variant="outline" onClick={runSync} disabled={syncing || bulk.running}>
            {syncing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            Sincronizar
          </Button>
          <Button variant="outline" onClick={() => void runEnrich()} disabled={enriching.running || bulk.running}>
            {enriching.running ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            {enriching.running
              ? `Completando créditos… ${enriching.remaining ?? ""}`
              : "Completar créditos"}
          </Button>
        </div>
      </div>

      <div className="sticky top-0 z-10 -mx-2 mt-6 flex flex-wrap items-center gap-2 bg-background/95 px-2 py-3 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="w-64 pl-8" placeholder="Buscar título, director, productora…" value={q}
            onChange={(e) => { setQ(e.target.value); setTmdbResults(null); }} />
        </div>
        <FilterSelect value={year} onChange={setYear} allLabel="Todos los años" options={years.map((y) => ({ value: String(y), label: String(y) }))} />
        <FilterSelect value={genre} onChange={setGenre} allLabel="Todos los géneros" options={genres.map((g) => ({ value: g, label: g }))} />
        <FilterSelect value={platform} onChange={setPlatform} allLabel="Todas las plataformas" options={platforms.map((p) => ({ value: p, label: p }))} />
        <FilterSelect value={icFilter} onChange={setIcFilter} allLabel="Todos"
          options={[{ value: "si", label: "IC participó" }]} />
        <div className="ml-auto flex items-center gap-1 rounded-sm border border-border p-0.5">
          <Button size="sm" variant={view === "lista" ? "secondary" : "ghost"} onClick={() => setView("lista")}>
            <ListIcon className="mr-1 h-4 w-4" /> Lista
          </Button>
          <Button size="sm" variant={view === "fichas" ? "secondary" : "ghost"} onClick={() => setView("fichas")}>
            <LayoutGrid className="mr-1 h-4 w-4" /> Fichas
          </Button>
        </div>
        <ExportRowsButton rows={rows} filename="producciones-espanolas" sheetName="Producciones ES" />
        <span className="font-mono text-xs text-muted-foreground">{rows.length} títulos</span>
      </div>

      {rowsQ.isLoading ? (
        <ListSkeleton rows={8} variant="grid" />
      ) : rows.length && view === "fichas" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((r) => <FilmCard key={r.id} row={r} onEdit={() => setEditing(r)} />)}
        </div>
      ) : rows.length ? (
        <YearTable rows={rows} onEdit={setEditing} />
      ) : (
        <div className="mt-6">
          <EmptyState
            title="Sin resultados en la base local"
            description={q.trim() ? "Puedes buscar este título en TMDb e importarlo con un clic." : "Busca un título para importarlo desde TMDb."}
          />
          {q.trim() && (
            <div className="mt-4 flex justify-center">
              <Button onClick={runTmdbSearch} disabled={searching}>
                {searching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Search className="mr-1 h-4 w-4" />}
                Buscar en TMDb
              </Button>
            </div>
          )}
        </div>
      )}

      {tmdbResults && (
        <div className="mt-10">
          <h2 className="mb-3 font-display text-2xl title-caps">Resultados en TMDb</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tmdbResults.map((r) => (
              <div key={`${r.media_type}-${r.tmdb_id}`} className="overflow-hidden rounded-sm border border-border">
                <Poster path={r.poster_path} />
                <div className="space-y-2 p-3">
                  <p className="font-display leading-tight">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.year ?? "—"} · {r.media_type === "tv" ? "Serie" : "Película"}</p>
                  {r.already_imported ? (
                    <Badge variant="outline" className="rounded-sm text-[10px]">Ya importada</Badge>
                  ) : (
                    <Button size="sm" className="w-full" onClick={() => importOne(r)} disabled={importingId === r.tmdb_id}>
                      {importingId === r.tmdb_id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null} Importar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ICDialog row={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function FilterSelect({ value, onChange, allLabel, options }: {
  value: string; onChange: (v: string) => void; allLabel: string; options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

type Accion = { label: string; run: () => void | Promise<unknown> };

/** Dato accionable: se muestra como texto y despliega las acciones de CRM disponibles. */
function Accionable({ text, titulo, acciones, className }: {
  text: string | null | undefined; titulo: string; acciones: Accion[]; className?: string;
}) {
  if (!text) return <span className="text-muted-foreground">—</span>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-left underline decoration-dotted underline-offset-4 hover:text-primary",
            className,
          )}
        >
          {text}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="truncate">{titulo}</DropdownMenuLabel>
        {acciones.map((a) => (
          <DropdownMenuItem key={a.label} onSelect={() => void a.run()}>{a.label}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const eur = (n: number | null | undefined) =>
  typeof n === "number" && n > 0
    ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
    : "—";

/** Listado por años con todos los datos accionables uno a uno. */
function YearTable({ rows, onEdit }: { rows: ProduccionEspanola[]; onEdit: (r: ProduccionEspanola) => void }) {
  const navigate = useNavigate();

  /** Crea la ficha independiente en el CRM correspondiente y la abre. */
  async function crearYAbrir(kind: "director" | "productora" | "roster", nombre: string, rosterRole: "composer" | "supervisor" = "composer") {
    if (kind === "director") {
      const id = await addDirectorToCrm(nombre);
      if (id) navigate({ to: "/directors/$directorId", params: { directorId: id } });
      return;
    }
    if (kind === "productora") {
      const id = await addCompanyToCrm(nombre);
      if (id) navigate({ to: "/production-companies/$companyId", params: { companyId: id } });
      return;
    }
    const id = await addToRoster(nombre, rosterRole);
    if (id) navigate({ to: "/composers/$composerId", params: { composerId: id } });
  }

  /** Crea (o reutiliza) el prospect de fichaje para un rol técnico y abre su ficha. */
  async function crearProspectYAbrir(nombre: string, rol: string, contexto: string) {
    const id = await addProspectFichaje(nombre, contexto, rol);
    if (id) navigate({ to: "/oportunidades/prospect/$prospectId", params: { prospectId: id } });
  }

  const porAno = useMemo(() => {
    const map = new Map<number, ProduccionEspanola[]>();
    for (const r of rows) {
      const y = r.year ?? 0;
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(r);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [rows]);

  return (
    <div className="mt-6 space-y-10">
      {porAno.map(([ano, lista]) => (
        <section key={ano}>
          <div className="flex items-baseline gap-3 border-b border-border pb-2">
            <h2 className="font-display text-3xl font-extrabold title-caps">{ano || "Sin año"}</h2>
            <span className="font-mono text-xs text-muted-foreground">{lista.length} títulos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-border font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="py-2 pr-3 text-left">Título</th>
                  <th className="py-2 pr-3 text-left">Título original</th>
                  <th className="py-2 pr-3 text-left">Dirección</th>
                  <th className="py-2 pr-3 text-left">Productoras</th>
                  <th className="py-2 pr-3 text-left">Compositor BSO</th>
                  <th className="py-2 pr-3 text-left">Supervisor musical</th>
                  <th className="py-2 pr-3 text-left">Mezclador</th>
                  <th className="py-2 pr-3 text-left">Orquestador</th>
                  <th className="py-2 pr-3 text-left">Orquesta</th>
                  <th className="py-2 pr-3 text-left">Dir. orquesta</th>
                  <th className="py-2 pr-3 text-left">Plataforma</th>
                  <th className="py-2 pr-3 text-right">Box office</th>
                  <th className="py-2 text-right" />
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => {
                  const titulo = r.title_es ?? r.title;
                  return (
                    <tr key={r.id} className="border-b border-border/60 align-top hover:bg-muted/40">
                      <td className="py-2 pr-3">
                        <Accionable
                          text={titulo}
                          titulo={titulo}
                          className="font-display"
                          acciones={[
                            { label: "Abrir ficha", run: () => onEdit(r) },
                            { label: "Añadir a Producciones", run: () => addEspanolaToProducciones(r) },
                            { label: "Vincular / marcar IC participó", run: () => onEdit(r) },
                            ...(r.tmdb_url ? [{ label: "Abrir en TMDb", run: () => window.open(r.tmdb_url!, "_blank") }] : []),
                          ]}
                        />
                        {r.ic_participo && (
                          <Badge className="ml-2 rounded-sm bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">IC</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.title_original ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {(r.directors ?? []).length ? (
                          <div className="flex flex-col gap-0.5">
                            {(r.directors ?? []).map((d) => (
                              <Accionable
                                key={d}
                                text={d}
                                titulo={d}
                                acciones={[
                                  { label: "Crear ficha de director y abrir", run: () => crearYAbrir("director", d) },
                                  { label: "Añadir a Directores CRM", run: () => addDirectorToCrm(d) },
                                  { label: "Añadir a Cuentas objetivo", run: () => addToTargetAccounts({ name: d, account_type: "otros" }) },
                                ]}
                              />
                            ))}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 pr-3">
                        {(r.production_companies ?? []).length ? (
                          <div className="flex flex-col gap-0.5">
                            {(r.production_companies ?? []).map((c) => (
                              <Accionable
                                key={c}
                                text={c}
                                titulo={c}
                                acciones={[
                                  { label: "Crear ficha de productora y abrir", run: () => crearYAbrir("productora", c) },
                                  { label: "Añadir a Partners (Productora)", run: () => addPartner(c, "Productora") },
                                  { label: "Añadir a Productoras CRM", run: () => addCompanyToCrm(c) },
                                  { label: "Añadir a Cuentas objetivo", run: () => addToTargetAccounts({ name: c, account_type: "productora" }) },
                                ]}
                              />
                            ))}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 pr-3">
                        <Accionable
                          text={r.composer}
                          titulo={r.composer ?? ""}
                          acciones={[
                            { label: "Crear ficha de compositor y abrir", run: () => crearYAbrir("roster", r.composer!, "composer") },
                            { label: "Añadir al Roster", run: () => addToRoster(r.composer!, "composer") },
                            { label: "Añadir a Prospects de fichaje", run: () => addProspectFichaje(r.composer!, `BSO de ${titulo} (${r.year ?? "—"})`) },
                            { label: "Añadir a Cuentas objetivo", run: () => addToTargetAccounts({ name: r.composer!, account_type: "roster", roster_kind: "composer" }) },
                          ]}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Accionable
                          text={r.music_supervisor}
                          titulo={r.music_supervisor ?? ""}
                          acciones={[
                            { label: "Crear ficha de supervisor y abrir", run: () => crearYAbrir("roster", r.music_supervisor!, "supervisor") },
                            { label: "Añadir al Roster (supervisor)", run: () => addToRoster(r.music_supervisor!, "supervisor") },
                            { label: "Añadir a Prospects de fichaje", run: () => addProspectFichaje(r.music_supervisor!, `Supervisión musical de ${titulo}`) },
                            { label: "Añadir a Cuentas objetivo", run: () => addToTargetAccounts({ name: r.music_supervisor!, account_type: "roster", roster_kind: "otros" }) },
                          ]}
                        />
                      </td>
                      {ROLES_FICHAJE.map((rol) => {
                        const valor = (r as any)[rol.key] as string | null;
                        return (
                          <td key={rol.key} className="py-2 pr-3">
                            {valor ? (
                              <Accionable
                                text={valor}
                                titulo={valor}
                                acciones={[
                                  {
                                    label: "Crear prospect de fichaje y abrir ficha",
                                    run: () => crearProspectYAbrir(valor, rol.label, `${rol.label} de ${titulo} (${r.year ?? "—"})`),
                                  },
                                  {
                                    label: "Añadir a Cuentas objetivo",
                                    run: () => addToTargetAccounts({ name: valor, account_type: "roster", roster_kind: "otros" }),
                                  },
                                ]}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => onEdit(r)}
                                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                              >
                                Añadir
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 pr-3">
                        <Accionable
                          text={r.platform}
                          titulo={r.platform ?? ""}
                          acciones={[
                            { label: "Añadir a Plataformas CRM", run: () => addPlatformToCrm(r.platform!) },
                            { label: "Añadir a Partners (Medio)", run: () => addPartner(r.platform!, "Medio") },
                            { label: "Añadir a Cuentas objetivo", run: () => addToTargetAccounts({ name: r.platform!, account_type: "plataforma" }) },
                          ]}
                        />
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">{eur(r.box_office)}</td>
                      <td className="py-2 text-right">
                        <Button size="icon" variant="ghost" onClick={() => onEdit(r)} aria-label="Editar vínculos">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}


function Poster({ path, className }: { path: string | null; className?: string }) {
  const url = posterUrl(path);
  return url ? (
    <img src={url} alt="" loading="lazy" className={cn("aspect-[2/3] w-full object-cover", className)} />
  ) : (
    <div className={cn("flex aspect-[2/3] w-full items-center justify-center bg-muted", className)}>
      <Film className="h-8 w-8 text-muted-foreground" />
    </div>
  );
}

function FilmCard({ row, onEdit }: { row: ProduccionEspanola; onEdit: () => void }) {
  const seguimiento = EN_SEGUIMIENTO.includes(row.estado_prospeccion);
  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <Poster path={row.poster_path} />
      <div className="space-y-2 p-3">
        <p className="font-display leading-tight">{row.title_es ?? row.title}</p>
        <p className="text-xs text-muted-foreground">
          {row.year ?? "—"} · {(row.directors ?? []).join(", ") || "Sin director"}
        </p>
        <p className="text-xs text-muted-foreground">
          {(row.production_companies ?? []).slice(0, 2).join(", ") || "—"}
          {row.platform ? ` · ${row.platform}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">{(row.genres ?? []).slice(0, 3).join(" · ")}</p>
        <div className="flex flex-wrap gap-1">
          {row.ic_participo && (
            <Badge className="rounded-sm bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">IC participó</Badge>
          )}
          {seguimiento && (
            <Badge variant="outline" className="rounded-sm text-[10px]">En seguimiento</Badge>
          )}
          <Badge variant="secondary" className="rounded-sm text-[10px]">{PROSPECCION_LABEL[row.estado_prospeccion]}</Badge>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
            {row.ic_participo ? "Editar vínculos" : "Marcar: IC participó"}
          </Button>
          {row.tmdb_url && (
            <Button size="sm" variant="ghost" asChild>
              <a href={row.tmdb_url} target="_blank" rel="noreferrer">TMDb</a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ICDialog({ row, onClose }: { row: ProduccionEspanola | null; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [icParticipo, setIc] = useState(false);
  const [equipo, setEquipo] = useState<Record<string, string>>({});
  const [produccion, setProduccion] = useState<string>("");
  const [reps, setReps] = useState<string[]>([]);
  const [estado, setEstado] = useState<ProspeccionEstado>("sin_valorar");
  const [oportunidad, setOportunidad] = useState<string>("");
  const [notas, setNotas] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const options = useQuery({
    queryKey: ["espanolas-vinculos"],
    queryFn: async () => {
      const [{ data: composers }, { data: productions }, { data: opps }] = await Promise.all([
        db.from("composers").select("id, full_name, artistic_name").order("full_name"),
        db.from("productions").select("id, title, year").order("title"),
        db.from("opportunities").select("id, title").order("title"),
      ]);
      return { composers: composers ?? [], productions: productions ?? [], opps: opps ?? [] };
    },
  });

  if (row && loadedFor !== row.id) {
    setLoadedFor(row.id);
    setIc(row.ic_participo);
    setProduccion(row.produccion_ic_vinculada ?? "");
    setReps(row.representados_vinculados ?? []);
    setEstado(row.estado_prospeccion);
    setOportunidad(row.oportunidad_vinculada ?? "");
    setNotas(row.notas ?? "");
    setEquipo({
      mezclador: (row as any).mezclador ?? "",
      orquestador: (row as any).orquestador ?? "",
      orquesta: (row as any).orquesta ?? "",
      director_orquesta: (row as any).director_orquesta ?? "",
    });
  }

  async function save() {
    if (!row) return;
    setSaving(true);
    const { error } = await db.from("producciones_espanolas").update({
      ic_participo: icParticipo,
      produccion_ic_vinculada: produccion || null,
      representados_vinculados: reps,
      estado_prospeccion: estado,
      oportunidad_vinculada: oportunidad || null,
      notas: notas || null,
      mezclador: equipo.mezclador?.trim() || null,
      orquestador: equipo.orquestador?.trim() || null,
      orquesta: equipo.orquesta?.trim() || null,
      director_orquesta: equipo.director_orquesta?.trim() || null,
    }).eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(icParticipo ? "Vinculada y propagada a Filmografía IC" : "Ficha actualizada");
    qc.invalidateQueries({ queryKey: ["producciones-espanolas"] });
    qc.invalidateQueries({ queryKey: ["filmografia-ic"] });
    onClose();
  }

  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{row?.title_es ?? row?.title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-3 rounded-sm border border-border p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Equipo musical · oportunidades de fichaje
            </p>
            {ROLES_FICHAJE.map((rol) => (
              <div key={rol.key} className="grid gap-1.5">
                <Label>{rol.label}</Label>
                <div className="flex gap-2">
                  <Input
                    value={equipo[rol.key] ?? ""}
                    onChange={(e) => setEquipo({ ...equipo, [rol.key]: e.target.value })}
                    placeholder={`Nombre del ${rol.label.toLowerCase()}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!(equipo[rol.key] ?? "").trim()}
                    onClick={async () => {
                      const nombre = (equipo[rol.key] ?? "").trim();
                      if (!row) return;
                      await db.from("producciones_espanolas").update({ [rol.key]: nombre }).eq("id", row.id);
                      const id = await addProspectFichaje(
                        nombre,
                        `${rol.label} de ${row.title_es ?? row.title} (${row.year ?? "—"})`,
                        rol.label,
                      );
                      qc.invalidateQueries({ queryKey: ["producciones-espanolas"] });
                      if (id) {
                        onClose();
                        navigate({ to: "/oportunidades/prospect/$prospectId", params: { prospectId: id } });
                      }
                    }}
                  >
                    Ficha
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={icParticipo} onChange={(e) => setIc(e.target.checked)} />
            IC participó en esta producción
          </label>

          <div className="grid gap-1.5">
            <Label>Expediente interno vinculado</Label>
            <Select value={produccion || "__none__"} onValueChange={(v) => setProduccion(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Sin expediente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin expediente</SelectItem>
                {options.data?.productions.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}{p.year ? ` (${p.year})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Representados participantes</Label>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-sm border border-border p-2">
              {options.data?.composers.map((c: any) => {
                const on = reps.includes(c.id);
                return (
                  <button key={c.id} type="button"
                    onClick={() => setReps(on ? reps.filter((x) => x !== c.id) : [...reps, c.id])}
                    className={cn("rounded-sm border px-2 py-1 text-xs", on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}>
                    {c.artistic_name || c.full_name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Estado de prospección</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as ProspeccionEstado)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROSPECCION_ESTADOS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Oportunidad vinculada</Label>
              <Select value={oportunidad || "__none__"} onValueChange={(v) => setOportunidad(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ninguna</SelectItem>
                  {options.data?.opps.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Notas</Label>
            <Textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
