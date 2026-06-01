import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { photoUrl } from "@/lib/composers-api";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/composers")({
  component: ComposersIndex,
});

function ComposersIndex() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["composers", q],
    queryFn: async () => {
      let query = supabase
        .from("composers")
        .select("id, full_name, city, country, availability, tags, photo_path")
        .order("full_name", { ascending: true });
      if (q.trim()) {
        query = query.textSearch("search_tsv", q.trim(), { type: "plain", config: "spanish" });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Roster</p>
          <h1 className="mt-1 font-display text-5xl italic">Compositores</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Catálogo interno del equipo de Interesante Compañía. Filtra, busca y propón.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, bio o filmografía…"
            className="w-72 rounded-sm"
          />
          <Button asChild size="sm">
            <Link to="/composers/new"><Plus className="mr-1 h-4 w-4" /> Nuevo</Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="font-display italic text-muted-foreground">Cargando archivo…</p>
      ) : !data?.length ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center">
          <p className="font-display text-2xl italic">Aún no hay compositores en el archivo.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Empieza añadiendo el primer compositor a la cartera.
          </p>
          <Button asChild className="mt-6">
            <Link to="/composers/new"><Plus className="mr-1 h-4 w-4" /> Añadir compositor</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => {
            const url = photoUrl(c.photo_path as string | null);
            return (
              <Link
                key={c.id}
                to="/composers/$composerId"
                params={{ composerId: c.id }}
                className="group block"
              >
                <article className="glass-panel overflow-hidden rounded-sm transition group-hover:border-primary/60">
                  <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                    {url ? (
                      <img
                        src={url}
                        alt={c.full_name}
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-display text-4xl italic text-muted-foreground">
                        {c.full_name?.[0] ?? "·"}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h2 className="font-display text-2xl">{c.full_name}</h2>
                    <p className="text-xs text-muted-foreground">{[c.city, c.country].filter(Boolean).join(" · ")}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(c.tags ?? []).slice(0, 4).map((t: string) => (
                        <Badge key={t} variant="outline" className="rounded-sm">{t}</Badge>
                      ))}
                    </div>
                    <p className="mt-4 smallcaps text-muted-foreground">
                      {c.availability === "available" ? "Disponible" : c.availability === "partial" ? "Parcial" : "No disponible"}
                    </p>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}