import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ExportButton, type ExportField } from "@/components/export-button";
import {
  importSpanishFilmsByYear,
  updateSpanishFilm,
} from "@/lib/spanish-films.functions";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2020 }, (_, i) => CURRENT_YEAR - i);

export const Route = createFileRoute("/_authenticated/_admin/peliculas-es/")({
  component: SpanishFilmsPage,
});

type Film = {
  id: string;
  tmdb_id: number;
  year: number;
  title: string;
  directors: string[];
  production_companies: string[];
  composer: string | null;
  music_supervisor: string | null;
  platform: string | null;
  box_office_eur: number | null;
  needs_review: boolean;
  review_reason: string | null;
  completeness: number;
  poster_path: string | null;
  director_ids: string[] | null;
  production_company_ids: string[] | null;
};

type RosterDirector = { id: string; full_name: string };
type RosterCompany = { id: string; name: string };

function SpanishFilmsPage() {
  const qc = useQueryClient();
  const importFn = useServerFn(importSpanishFilmsByYear);
  const updateFn = useServerFn(updateSpanishFilm);

  const [yearFilter, setYearFilter] = useState<string>("all");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [q, setQ] = useState("");
  const [importYear, setImportYear] = useState<string>(String(CURRENT_YEAR));
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Film | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["spanish-films", yearFilter, reviewOnly, q],
    queryFn: async () => {
      let query = supabase
        .from("spanish_films")
        .select(
          "id, tmdb_id, year, title, directors, production_companies, composer, music_supervisor, platform, box_office_eur, needs_review, review_reason, completeness, poster_path, director_ids, production_company_ids",
        )
        .order("year", { ascending: false })
        .order("title");
      if (yearFilter !== "all") query = query.eq("year", Number(yearFilter));
      if (reviewOnly) query = query.eq("needs_review", true);
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data ?? []) as Film[];
    },
  });

  const { data: rosterDirectors } = useQuery({
    queryKey: ["roster-directors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("directors")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as RosterDirector[];
    },
  });

  const { data: rosterCompanies } = useQuery({
    queryKey: ["roster-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_companies")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as RosterCompany[];
    },
  });

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

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Inteligencia de mercado</p>
          <h1 className="mt-1 font-display text-5xl">Películas ES</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Catálogo de cine español (2021–{CURRENT_YEAR}) importado desde TMDb. Cruza
            créditos con tu roster para detectar oportunidades.
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
            fields={exportFields()}
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
        <span className="ml-auto smallcaps text-muted-foreground">
          {data?.length ?? 0} películas
        </span>
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
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left smallcaps text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Año</th>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Director(es)</th>
                <th className="px-3 py-2">Productoras</th>
                <th className="px-3 py-2">Compositor BSO</th>
                <th className="px-3 py-2">Supervisor musical</th>
                <th className="px-3 py-2">Plataforma</th>
                <th className="px-3 py-2 text-center">Completo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((f) => (
                <tr key={f.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-xs">{f.year}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{f.title}</div>
                    {f.needs_review && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        {f.review_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {f.directors.join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {f.production_companies.slice(0, 2).join(", ")}
                    {f.production_companies.length > 2 && ` +${f.production_companies.length - 2}`}
                  </td>
                  <td className="px-3 py-2 text-xs">{f.composer || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 text-xs">{f.music_supervisor || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 text-xs">{f.platform || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge
                      variant="outline"
                      className={
                        "rounded-sm font-mono " +
                        (f.completeness === 7
                          ? "border-green-500/40 text-green-600"
                          : f.completeness >= 5
                            ? "border-amber-500/40 text-amber-600"
                            : "border-red-500/40 text-red-600")
                      }
                    >
                      {f.completeness}/7
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(f)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditDialog
        film={editing}
        rosterDirectors={rosterDirectors ?? []}
        rosterCompanies={rosterCompanies ?? []}
        onClose={() => setEditing(null)}
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

function EditDialog({
  film,
  onClose,
  onSave,
}: {
  film: Film | null;
  onClose: () => void;
  onSave: (patch: {
    composer: string | null;
    music_supervisor: string | null;
    platform: string | null;
    needs_review: boolean;
  }) => Promise<void>;
}) {
  const [composer, setComposer] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [platform, setPlatform] = useState("");
  const [needsReview, setNeedsReview] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (film) {
      setComposer(film.composer ?? "");
      setSupervisor(film.music_supervisor ?? "");
      setPlatform(film.platform ?? "");
      setNeedsReview(film.needs_review);
    }
  }, [film]);

  return (
    <Dialog
      open={!!film}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{film?.title}</DialogTitle>
          <DialogDescription>
            {film?.year} · {film?.directors.join(", ")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Compositor BSO</Label>
            <Input value={composer} onChange={(e) => setComposer(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Supervisor musical</Label>
            <Input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Plataforma</Label>
            <Input
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="Netflix, Filmin, Movistar+, Cine…"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={needsReview} onCheckedChange={setNeedsReview} />
            <span>Necesita revisión</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onSave({
                composer: composer.trim() || null,
                music_supervisor: supervisor.trim() || null,
                platform: platform.trim() || null,
                needs_review: needsReview,
              });
              setBusy(false);
            }}
          >
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function exportFields(): ExportField<Film>[] {
  return [
    { key: "year", label: "Año", get: (r) => r.year },
    { key: "title", label: "Título", get: (r) => r.title },
    { key: "directors", label: "Director(es)", get: (r) => r.directors },
    { key: "production_companies", label: "Productoras", get: (r) => r.production_companies },
    { key: "composer", label: "Compositor BSO", get: (r) => r.composer },
    { key: "music_supervisor", label: "Supervisor musical", get: (r) => r.music_supervisor },
    { key: "platform", label: "Plataforma", get: (r) => r.platform },
    { key: "box_office_eur", label: "Recaudación (€)", get: (r) => r.box_office_eur },
    { key: "completeness", label: "Completitud (0-7)", get: (r) => r.completeness },
    { key: "needs_review", label: "Necesita revisión", default: false, get: (r) => r.needs_review },
    { key: "review_reason", label: "Motivo revisión", default: false, get: (r) => r.review_reason },
    { key: "tmdb_id", label: "TMDb ID", default: false, get: (r) => r.tmdb_id },
  ];
}