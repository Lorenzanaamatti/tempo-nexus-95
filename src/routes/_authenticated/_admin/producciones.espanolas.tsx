import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Search, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListSkeleton, EmptyState } from "@/components/list-states";
import {
  EN_SEGUIMIENTO, PROSPECCION_ESTADOS, PROSPECCION_LABEL, posterUrl,
  type ProduccionEspanola, type ProspeccionEstado,
} from "@/lib/producciones-espanolas";
import {
  importProduccionEspanola, searchTmdbEspanolas, syncProduccionesEspanolas,
} from "@/lib/producciones-espanolas.functions";
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
      const { data, error } = await db
        .from("producciones_espanolas")
        .select("*")
        .order("year", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ProduccionEspanola[];
    },
  });
}

function ProduccionesEspanolas() {
  const qc = useQueryClient();
  const rowsQ = useEspanolas();
  const searchFn = useServerFn(searchTmdbEspanolas);
  const importFn = useServerFn(importProduccionEspanola);
  const syncFn = useServerFn(syncProduccionesEspanolas);

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
      if (icFilter !== ALL && r.ic_participo !== (icFilter === "si")) return false;
      if (estado !== ALL && r.estado_prospeccion !== estado) return false;
      if (!needle) return true;
      return [r.title, r.title_original, r.title_es, ...(r.directors ?? []), ...(r.production_companies ?? [])]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [all, q, year, genre, platform, icFilter, estado]);

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
        <Button variant="outline" onClick={runSync} disabled={syncing}>
          {syncing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
          Sincronizar con TMDb
        </Button>
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
        <FilterSelect value={icFilter} onChange={setIcFilter} allLabel="IC participó: todos"
          options={[{ value: "si", label: "IC participó" }, { value: "no", label: "Sin participación IC" }]} />
        <FilterSelect value={estado} onChange={setEstado} allLabel="Toda la prospección"
          options={PROSPECCION_ESTADOS.map((e) => ({ value: e.value, label: e.label }))} />
      </div>

      {rowsQ.isLoading ? (
        <ListSkeleton rows={8} variant="grid" />
      ) : rows.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((r) => <FilmCard key={r.id} row={r} onEdit={() => setEditing(r)} />)}
        </div>
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
  const [saving, setSaving] = useState(false);
  const [icParticipo, setIc] = useState(false);
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{row?.title_es ?? row?.title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
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
