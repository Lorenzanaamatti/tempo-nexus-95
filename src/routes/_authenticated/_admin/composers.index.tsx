import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComposerThumb } from "@/components/composer-thumb";
import { Plus } from "lucide-react";

type RosterRole = "composer" | "artist" | "supervisor" | "specialist" | "curator" | "other";
type Tier = "A" | "B" | "C" | "D" | "E" | "desarrollo";
const TIER_ORDER: Tier[] = ["A", "B", "C", "D", "E", "desarrollo"];
const TIER_LABEL: Record<Tier, string> = {
  A: "Tier A",
  B: "Tier B",
  C: "Tier C",
  D: "Tier D",
  E: "Tier E",
  desarrollo: "En desarrollo",
};
const TIER_HINT: Record<Tier, string> = {
  A: "Top — referentes consolidados con máxima prioridad.",
  B: "Sólidos — proyectos recurrentes y alta demanda.",
  C: "Activos — trayectoria estable, en crecimiento.",
  D: "Emergentes — perfiles en consolidación.",
  E: "Periféricos — colaboraciones puntuales o reserva.",
  desarrollo: "Sin tier asignado todavía.",
};
const ROLE_TITLE: Record<RosterRole, { title: string; singular: string; intro: string }> = {
  composer:   { title: "Compositores",         singular: "compositor",         intro: "Catálogo interno del equipo de Interesante Compañía." },
  artist:     { title: "Artistas",             singular: "artista",            intro: "Artistas representados por Interesante Compañía." },
  supervisor: { title: "Supervisores musicales", singular: "supervisor musical", intro: "Supervisores musicales del roster." },
  specialist: { title: "Especialistas",        singular: "especialista",       intro: "Especialistas que colaboran con la compañía." },
  curator:    { title: "Curadores musicales",  singular: "curador musical",    intro: "Curadores y selectores musicales." },
  other:      { title: "Otros",                singular: "perfil",             intro: "Otros perfiles del roster." },
};
const ALL_ROLES = Object.keys(ROLE_TITLE) as RosterRole[];

export const Route = createFileRoute("/_authenticated/_admin/composers/")({
  component: ComposersIndex,
  validateSearch: (s: Record<string, unknown>): { role: RosterRole } => {
    const v = typeof s.role === "string" ? s.role : "composer";
    return { role: (ALL_ROLES.includes(v as RosterRole) ? v : "composer") as RosterRole };
  },
});

function ComposersIndex() {
  const { role } = Route.useSearch() as { role: RosterRole };
  const meta = ROLE_TITLE[role];
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["composers", role, q],
    queryFn: async () => {
      let query = supabase
        .from("composers")
        .select("id, full_name, city, country, availability, tags, photo_path, roster_role, tier")
        .eq("roster_role", role)
        .order("full_name", { ascending: true });
      if (q.trim()) {
        const term = q.trim().replace(/[%,]/g, " ");
        const like = `%${term}%`;
        query = query.or(
          `full_name.ilike.${like},artistic_name.ilike.${like},legal_name.ilike.${like},city.ilike.${like},country.ilike.${like},email.ilike.${like}`,
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const grouped = (() => {
    const surname = (name: string | null | undefined) => {
      const parts = (name ?? "").trim().split(/\s+/);
      return (parts[parts.length - 1] ?? "").toLocaleLowerCase("es");
    };
    const map = new Map<Tier, typeof data>();
    for (const c of data ?? []) {
      const t = (TIER_ORDER.includes(c.tier as Tier) ? (c.tier as Tier) : "desarrollo") as Tier;
      if (!map.has(t)) map.set(t, [] as never);
      (map.get(t) as any[]).push(c);
    }
    return TIER_ORDER.filter((t) => map.has(t)).map((t) => ({
      tier: t,
      items: [...(map.get(t) as any[])].sort((a, b) =>
        surname(a.full_name).localeCompare(surname(b.full_name), "es") ||
        (a.full_name ?? "").localeCompare(b.full_name ?? "", "es"),
      ),
    }));
  })();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="smallcaps text-muted-foreground">Roster</p>
          <h1 className="mt-1 font-display text-5xl">{meta.title}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{meta.intro}</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, bio o filmografía…"
            className="w-72 rounded-sm"
          />
          <Button asChild size="sm">
            <Link to="/composers/new" search={{ role }}><Plus className="mr-1 h-4 w-4" /> Nuevo</Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="font-display text-muted-foreground">Cargando archivo…</p>
      ) : !data?.length ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center">
          <p className="font-display text-2xl">Aún no hay {meta.title.toLowerCase()} en el archivo.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Empieza añadiendo el primer {meta.singular} a la cartera.
          </p>
          <Button asChild className="mt-6">
            <Link to="/composers/new" search={{ role }}><Plus className="mr-1 h-4 w-4" /> Añadir {meta.singular}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-12">
          {grouped.map(({ tier, items }) => (
            <section key={tier}>
              <div className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-3">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-display text-3xl">{TIER_LABEL[tier]}</h2>
                  <span className="smallcaps text-muted-foreground">{items.length}</span>
                </div>
                <p className="hidden max-w-md text-right text-xs text-muted-foreground sm:block">{TIER_HINT[tier]}</p>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((c: any) => {
            return (
              <Link
                key={c.id}
                to="/composers/$composerId"
                params={{ composerId: c.id }}
                className="group block h-full"
              >
                <article className="glass-panel flex h-full flex-col overflow-hidden rounded-sm transition group-hover:border-primary/60">
                  <ComposerThumb
                    path={c.photo_path as string | null}
                    alt={c.full_name}
                    className="aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted"
                    imgClassName="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    fallback={
                      <div className="flex h-full items-center justify-center font-display text-4xl text-muted-foreground">
                        {c.full_name?.[0] ?? "·"}
                      </div>
                    }
                  />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-2xl leading-tight">{c.full_name}</h3>
                      <Badge variant="outline" className="shrink-0 rounded-sm font-mono">{c.tier ?? "—"}</Badge>
                    </div>
                    <p className="min-h-[1rem] text-xs text-muted-foreground">{[c.city, c.country].filter(Boolean).join(" · ") || "\u00A0"}</p>
                    <div className="mt-3 flex min-h-[1.5rem] flex-wrap gap-1.5">
                      {(c.tags ?? []).slice(0, 4).map((t: string) => (
                        <Badge key={t} variant="outline" className="rounded-sm">{t}</Badge>
                      ))}
                    </div>
                    <p className="mt-auto pt-4 smallcaps text-muted-foreground">
                      {c.availability === "available" ? "Disponible" : c.availability === "partial" ? "Parcial" : "No disponible"}
                    </p>
                  </div>
                </article>
              </Link>
            );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}