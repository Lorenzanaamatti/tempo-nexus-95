import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ComposerThumb } from "@/components/composer-thumb";

export const Route = createFileRoute("/_authenticated/_admin/roster")({
  component: RosterAll,
});

type RosterRole = "composer" | "artist" | "supervisor" | "specialist" | "curator" | "ic_company";
const ROLE_LABEL: Record<RosterRole, string> = {
  composer: "Compositores",
  artist: "Artistas",
  supervisor: "Supervisores musicales",
  specialist: "Especialistas",
  curator: "Curadores musicales",
  ic_company: "Interesante Filmografía",
};
const ORDER: RosterRole[] = ["ic_company", "composer", "artist", "supervisor", "specialist", "curator"];

function RosterAll() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["roster-all", q],
    queryFn: async () => {
      let query = supabase
        .from("composers")
        .select("id, full_name, city, country, availability, photo_path, roster_role")
        .order("full_name");
      if (q.trim()) query = query.ilike("full_name", `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const grouped = (data ?? []).reduce<Record<RosterRole, typeof data>>((acc, row) => {
    const r = (row.roster_role as RosterRole) ?? "composer";
    (acc[r] ||= [] as never).push(row);
    return acc;
  }, { composer: [], artist: [], supervisor: [], specialist: [], curator: [], ic_company: [] } as never);

  const total = data?.length ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Roster</p>
          <h1 className="mt-1 font-display text-5xl">Directorio completo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Estos son nuestros clientes y clientas seleccionados según su sector de actividad profesional.
          </p>
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre…"
          className="w-72 rounded-sm"
        />
      </div>

      {isLoading ? (
        <p className="font-display text-muted-foreground">Cargando archivo…</p>
      ) : !total ? (
        <p className="text-sm text-muted-foreground">Sin fichas en el roster.</p>
      ) : (
        <div className="space-y-12">
          {ORDER.map((r) => {
            const rows = grouped[r] ?? [];
            if (!rows.length) return null;
            return (
              <section key={r}>
                <div className="mb-4 flex items-end justify-between border-b border-border pb-2">
                  <h2 className="font-display text-3xl">{ROLE_LABEL[r]}</h2>
                  {r !== "ic_company" && (
                    <Link to="/composers" search={{ role: r }} className="smallcaps text-xs text-muted-foreground hover:text-foreground">
                      Ver categoría →
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((c) => {
                    return (
                      <Link
                        key={c.id}
                        to={r === "ic_company" ? "/ic" : "/composers/$composerId"}
                        params={r === "ic_company" ? undefined : { composerId: c.id }}
                        className="group flex items-center gap-4 rounded-sm border border-border p-3 transition hover:border-primary/60"
                      >
                        <ComposerThumb
                          path={c.photo_path as string | null}
                          alt={c.full_name}
                          className="h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-muted"
                          imgClassName="h-full w-full object-cover"
                          fallback={
                            <div className="flex h-full items-center justify-center font-display text-xl text-muted-foreground">
                              {c.full_name?.[0] ?? "·"}
                            </div>
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-lg leading-tight">{c.full_name}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {[c.city, c.country].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}