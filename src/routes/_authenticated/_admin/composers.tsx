import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, bio o filmografía…"
          className="max-w-sm rounded-sm"
        />
      </div>

      {isLoading ? (
        <p className="font-display italic text-muted-foreground">Cargando archivo…</p>
      ) : !data?.length ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center">
          <p className="font-display text-2xl italic">Aún no hay compositores en el archivo.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            El siguiente paso será habilitar la creación de fichas y el editor completo (Módulo 1, parte B).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <article key={c.id} className="glass-panel rounded-sm p-5">
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
            </article>
          ))}
        </div>
      )}
    </div>
  );
}