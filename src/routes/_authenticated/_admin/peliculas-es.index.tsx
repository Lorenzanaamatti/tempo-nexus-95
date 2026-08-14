import { createFileRoute } from "@tanstack/react-router";
import { PaginationBar, useServerPagination } from "@/components/pagination-bar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ExportButton } from "@/components/export-button";
import { FilmsTable, type FilmSortKey } from "@/components/peliculas-es/films-table";
import { FilmEditDialog } from "@/components/peliculas-es/film-edit-dialog";
import {
  FILM_SELECT,
  filmExportFields,
  normalizeName,
  type Film,
  type RosterCompany,
  type RosterComposer,
  type RosterDirector,
  type RosterPerson,
} from "@/lib/spanish-films-crm";
import {
  importSpanishFilmsByYear,
  updateSpanishFilm,
  deleteSpanishFilm,
  rematchSpanishFilmsWithCrm,
} from "@/lib/spanish-films.functions";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2020 }, (_, i) => CURRENT_YEAR - i);

export const Route = createFileRoute("/_authenticated/_admin/peliculas-es/")({
  component: SpanishFilmsPage,
});

function SpanishFilmsPage() {
  const qc = useQueryClient();
  const importFn = useServerFn(importSpanishFilmsByYear);
  const updateFn = useServerFn(updateSpanishFilm);
  const deleteFn = useServerFn(deleteSpanishFilm);
  const rematchFn = useServerFn(rematchSpanishFilmsWithCrm);

  const [yearFilter, setYearFilter] = useState<string>("all");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [q, setQ] = useState("");
  const [importYear, setImportYear] = useState<string>(String(CURRENT_YEAR));
  const [importing, setImporting] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const [editing, setEditing] = useState<Film | null>(null);

  const pg = useServerPagination<FilmSortKey>({
    list: "peliculas-es",
    sortKey: "year",
    sortDir: "desc",
    pageSize: 50,
    deps: [yearFilter, reviewOnly, q],
  });
  const { page, setPage, pageSize, setPageSize } = pg;

  const { data: result, isLoading } = useQuery({
    queryKey: ["spanish-films", yearFilter, reviewOnly, q, page, pageSize, pg.sortKey, pg.sortDir],
    queryFn: async () => {
      let query = supabase.from("spanish_films").select(FILM_SELECT, { count: "exact" });
      if (yearFilter !== "all") query = query.eq("year", Number(yearFilter));
      if (reviewOnly) query = query.eq("needs_review", true);
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      const { data, error, count } = await pg.applyTo(query);
      if (error) throw error;
      return { rows: (data ?? []) as Film[], count: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });

  const data = result?.rows;
  const totalCount = result?.count ?? 0;
  const pageCount = pg.pageCountOf(totalCount);

  const { data: rosterPeople } = useQuery({
    queryKey: ["roster-people-composers-supervisors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("id, full_name, role")
        .in("role", ["composer", "supervisor"])
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as RosterPerson[];
    },
  });

  const { data: rosterDirectors } = useQuery({
    queryKey: ["roster-directors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("directors").select("id, full_name").order("full_name");
      if (error) throw error;
      return (data ?? []) as RosterDirector[];
    },
  });

  const { data: rosterCompanies } = useQuery({
    queryKey: ["roster-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("production_companies").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as RosterCompany[];
    },
  });

  const { data: rosterComposers } = useQuery({
    queryKey: ["roster-composers-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("composers").select("id, full_name, artistic_name");
      if (error) throw error;
      return (data ?? []) as RosterComposer[];
    },
  });

  const directorByName = new Map<string, string>();
  for (const d of rosterDirectors ?? []) directorByName.set(normalizeName(d.full_name), d.id);
  const companyByName = new Map<string, string>();
  for (const c of rosterCompanies ?? []) companyByName.set(normalizeName(c.name), c.id);
  const composerByName = new Map<string, string>();
  for (const c of rosterComposers ?? []) {
    composerByName.set(normalizeName(c.full_name), c.id);
    if (c.artistic_name) composerByName.set(normalizeName(c.artistic_name), c.id);
  }

  async function runImport() {
    setImporting(true);
    try {
      const res = await importFn({ data: { year: Number(importYear) } });
      toast.success(
        `Año ${res.year}: ${res.imported} nuevas, ${res.updated} actualizadas, ${res.needsReview} requieren revisión`,
      );
      qc.invalidateQueries({ queryKey: ["spanish-films"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error en la importación");
    } finally {
      setImporting(false);
    }
  }

  async function runRematch() {
    setRematching(true);
    try {
      const res = await rematchFn({});
      toast.success(
        `Re-cruce CRM: ${res.updated}/${res.scanned} actualizadas · +${res.linkedDirectors} dir · +${res.linkedCompanies} prod · +${res.linkedComposers} comp · +${res.linkedSupervisors} sup`,
      );
      qc.invalidateQueries({ queryKey: ["spanish-films"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error en el re-cruce");
    } finally {
      setRematching(false);
    }
  }

  async function runProject() {
    setProjecting(true);
    try {
      const { data, error } = await (supabase as any).rpc("backfill_spanish_films_to_productions");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      toast.success(
        `Proyección a Producciones: ${row?.created_count ?? 0} creadas · ${row?.linked_count ?? 0} completadas`,
      );
      qc.invalidateQueries({ queryKey: ["spanish-films"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error proyectando a Producciones");
    } finally {
      setProjecting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Inteligencia de mercado</p>
          <h1 className="mt-1 font-display text-5xl">Películas ES</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Catálogo de cine español (2021–{CURRENT_YEAR}) importado desde TMDb. Cruza créditos con tu roster
            para detectar oportunidades.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex items-end gap-2">
            <div>
              <Label className="smallcaps mb-1 block text-xs">Importar año</Label>
              <Select value={importYear} onValueChange={setImportYear}>
                <SelectTrigger className="w-28 rounded-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runImport} disabled={importing} size="sm">
              {importing ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Importando…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-4 w-4" /> Importar desde TMDb
                </>
              )}
            </Button>
            <Button onClick={runRematch} disabled={rematching} size="sm" variant="outline">
              {rematching ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Cruzando…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-4 w-4" /> Re-cruzar con CRM
                </>
              )}
            </Button>
            <Button onClick={runProject} disabled={projecting} size="sm" variant="outline">
              {projecting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Proyectando…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-4 w-4" /> Películas ES → Producciones
                </>
              )}
            </Button>
          </div>
          <ExportButton<Film>
            entityLabel="Películas ES"
            filename="peliculas-es"
            sheetName="Películas ES"
            fetchAll={async () => {
              const { data, error } = await supabase
                .from("spanish_films")
                .select("*")
                .order("year", { ascending: false })
                .order("title");
              if (error) throw error;
              return (data ?? []) as Film[];
            }}
            fields={filmExportFields()}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar título…"
          className="w-64 rounded-sm"
        />
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-32 rounded-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los años</SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={reviewOnly} onCheckedChange={setReviewOnly} />
          <span>Solo necesitan revisión</span>
        </label>
        <span className="ml-auto smallcaps text-muted-foreground">{totalCount} películas</span>
      </div>

      {isLoading ? (
        <p className="font-display text-muted-foreground">Cargando catálogo…</p>
      ) : !data?.length ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center">
          <p className="font-display text-2xl">Aún no hay películas en el catálogo.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecciona un año arriba y pulsa "Importar desde TMDb".
          </p>
        </div>
      ) : (
        <FilmsTable
          films={data}
          directorByName={directorByName}
          companyByName={companyByName}
          composerByName={composerByName}
          sortKey={pg.sortKey}
          sortDir={pg.sortDir}
          onSort={pg.toggleSort}
          onOpen={setEditing}
        />
      )}
      <PaginationBar
        latencyMs={pg.lastLatencyMs}
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        total={totalCount}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        label="películas"
      />

      <FilmEditDialog
        film={editing}
        rosterDirectors={rosterDirectors ?? []}
        rosterCompanies={rosterCompanies ?? []}
        rosterPeople={rosterPeople ?? []}
        onClose={() => setEditing(null)}
        onDelete={async () => {
          if (!editing) return;
          if (
            !confirm(
              `¿Eliminar "${editing.title_es || editing.title}" del catálogo? Esta acción no se puede deshacer.`,
            )
          )
            return;
          try {
            await deleteFn({ data: { id: editing.id } });
            toast.success("Película eliminada");
            qc.invalidateQueries({ queryKey: ["spanish-films"] });
            setEditing(null);
          } catch (e: any) {
            toast.error(e?.message ?? "Error al eliminar");
          }
        }}
        onSave={async (patch) => {
          if (!editing) return;
          try {
            await updateFn({ data: { id: editing.id, ...patch } });
            toast.success("Película actualizada");
            qc.invalidateQueries({ queryKey: ["spanish-films"] });
            setEditing(null);
          } catch (e: any) {
            toast.error(e?.message ?? "Error al guardar");
          }
        }}
      />
    </div>
  );
}
