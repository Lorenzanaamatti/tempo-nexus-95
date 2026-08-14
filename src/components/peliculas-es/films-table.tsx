import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SortTh } from "@/components/pagination-bar";
import { normalizeName, type Film } from "@/lib/spanish-films-crm";

export type FilmSortKey =
  | "year"
  | "title"
  | "original_title"
  | "composer"
  | "music_supervisor"
  | "platform"
  | "completeness";

function ComposerLink({ name, byName }: { name: string | null; byName: Map<string, string> }) {
  if (!name) return <span className="text-muted-foreground">—</span>;
  const id = byName.get(normalizeName(name));
  if (!id) return <>{name}</>;
  return (
    <Link
      to="/composers/$composerId"
      params={{ composerId: id }}
      className="text-primary underline-offset-2 hover:underline"
    >
      {name}
    </Link>
  );
}

export function FilmsTable({
  films,
  directorByName,
  companyByName,
  composerByName,
  sortKey,
  sortDir,
  onSort,
  onOpen,
}: {
  films: Film[];
  directorByName: Map<string, string>;
  companyByName: Map<string, string>;
  composerByName: Map<string, string>;
  sortKey: FilmSortKey;
  sortDir: "asc" | "desc";
  onSort: (k: FilmSortKey) => void;
  onOpen: (film: Film) => void;
}) {
  const Th = (props: { k: FilmSortKey; children: React.ReactNode; className?: string }) => (
    <SortTh k={props.k} sortKey={sortKey} sortDir={sortDir} onSort={onSort} className={props.className}>
      {props.children}
    </SortTh>
  );

  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/30 text-left smallcaps text-muted-foreground">
          <tr>
            <Th k="year">Año</Th>
            <Th k="title">Título ES</Th>
            <Th k="original_title">Título original</Th>
            <th className="px-3 py-2">Director(es)</th>
            <th className="px-3 py-2">Productoras</th>
            <Th k="composer">Compositor BSO</Th>
            <Th k="music_supervisor">Supervisor musical</Th>
            <Th k="platform">Plataforma</Th>
            <Th k="completeness" className="text-center">
              Completo
            </Th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {films.map((f) => (
            <tr key={f.id} className="border-b border-border/50 hover:bg-muted/20">
              <td className="px-3 py-2 font-mono text-xs">{f.year}</td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(f);
                  }}
                  className="text-left font-medium text-primary underline-offset-2 hover:underline"
                >
                  {f.title_es || f.title}
                </button>
                {f.needs_review && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    {f.review_reason}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{f.original_title || "—"}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {f.directors.length === 0 ? (
                  "—"
                ) : (
                  <ul className="space-y-0.5">
                    {f.directors.map((name, i) => {
                      const id = directorByName.get(normalizeName(name));
                      return (
                        <li key={i}>
                          {id ? (
                            <Link
                              to="/directors/$directorId"
                              params={{ directorId: id }}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {name}
                            </Link>
                          ) : (
                            name
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {f.production_companies.length === 0 ? (
                  "—"
                ) : (
                  <ul className="space-y-0.5">
                    {f.production_companies.map((name, i) => {
                      const id = companyByName.get(normalizeName(name));
                      return (
                        <li key={i}>
                          {id ? (
                            <Link
                              to="/production-companies/$companyId"
                              params={{ companyId: id }}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {name}
                            </Link>
                          ) : (
                            name
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </td>
              <td className="px-3 py-2 text-xs">
                <ComposerLink name={f.composer} byName={composerByName} />
              </td>
              <td className="px-3 py-2 text-xs">
                <ComposerLink name={f.music_supervisor} byName={composerByName} />
              </td>
              <td className="px-3 py-2 text-xs">
                {f.platform || <span className="text-muted-foreground">—</span>}
              </td>
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
                <Button variant="ghost" size="sm" onClick={() => onOpen(f)}>
                  Abrir ficha
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
