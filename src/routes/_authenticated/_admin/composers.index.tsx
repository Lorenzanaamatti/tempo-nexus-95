import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComposerThumb } from "@/components/composer-thumb";
import { Plus } from "lucide-react";
import { ExportButton, type ExportField } from "@/components/export-button";

type RosterRole = "composer" | "artist" | "supervisor" | "specialist" | "curator";
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
  composer:   { title: "Compositores",         singular: "compositor",         intro: "Nuestro equipo de compositores y compositoras INTERESANTES para cine, televisión, publicidad, videojuegos, teatro, danza y whatnot." },
  artist:     { title: "Artistas",             singular: "artista",            intro: "Artistas representadas por INTERESANTE COMPAÑÍA para su colaboración en proyectos audiovisuales." },
  supervisor: { title: "Supervisores musicales", singular: "supervisor musical", intro: "Este es nuestro equipo de supervisoras musicales (no curadores musicales)." },
  specialist: { title: "Especialistas",        singular: "especialista",       intro: "Las personas representadas bajo este epígrafe tienen profesiones variadas: perfiles técnicos, producción, cantantes, instrumentistas, ingenieros, etc." },
  curator:    { title: "Curadores musicales",  singular: "curador musical",    intro: "Curadores y selectores musicales." },
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
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [groupByTag, setGroupByTag] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["composers", role, q],
    queryFn: async () => {
      let query = supabase
        .from("composers")
        .select("id, full_name, city, country, availability, tags, specialist_tags, specialist_subtype, photo_path, roster_role, tier")
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

  const allSpecialistTagsWithCount = (() => {
    if (role !== "specialist") return [] as Array<{ tag: string; count: number }>;
    const counts = new Map<string, number>();
    for (const c of (data ?? []) as any[]) {
      const set = new Set<string>();
      for (const t of (c.tags ?? []) as string[]) if (t?.trim()) set.add(t.trim());
      for (const t of (c.specialist_tags ?? []) as string[]) if (t?.trim()) set.add(t.trim());
      for (const t of set) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "es"));
  })();

  const filtered = (data ?? []).filter((c: any) => {
    if (role !== "specialist" || !tagFilter) return true;
    const pool = new Set<string>();
    for (const t of (c.tags ?? []) as string[]) if (t?.trim()) pool.add(t.trim());
    for (const t of (c.specialist_tags ?? []) as string[]) if (t?.trim()) pool.add(t.trim());
    return pool.has(tagFilter);
  });

  const specialistTagGroups = (() => {
    if (role !== "specialist" || !groupByTag) return [] as Array<{ tag: string; items: any[] }>;
    const map = new Map<string, any[]>();
    for (const c of filtered as any[]) {
      const set = new Set<string>();
      for (const t of (c.tags ?? []) as string[]) if (t?.trim()) set.add(t.trim());
      for (const t of (c.specialist_tags ?? []) as string[]) if (t?.trim()) set.add(t.trim());
      if (!set.size) {
        if (!map.has("Sin etiquetas")) map.set("Sin etiquetas", []);
        map.get("Sin etiquetas")!.push(c);
        continue;
      }
      for (const t of set) {
        if (!map.has(t)) map.set(t, []);
        map.get(t)!.push(c);
      }
    }
    return [...map.entries()]
      .map(([tag, items]) => ({
        tag,
        items: items.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "", "es")),
      }))
      .sort((a, b) => b.items.length - a.items.length || a.tag.localeCompare(b.tag, "es"));
  })();

  const grouped = (() => {
    const surname = (name: string | null | undefined) => {
      const parts = (name ?? "").trim().split(/\s+/);
      return (parts[parts.length - 1] ?? "").toLocaleLowerCase("es");
    };
    const map = new Map<Tier, typeof filtered>();
    for (const c of filtered) {
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
          {role === "specialist" && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Filtrar por tag:</span>
                {allSpecialistTagsWithCount.length === 0 ? (
                  <span className="text-xs italic text-muted-foreground">Aún no hay tags libres asignados.</span>
                ) : (
                  allSpecialistTagsWithCount.map(({ tag, count }) => {
                    const active = tagFilter === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTagFilter(active ? null : tag)}
                        className={`rounded-full border px-3 py-1 text-xs font-mono transition ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:border-primary/60 hover:text-primary"
                        }`}
                      >
                        #{tag} <span className="opacity-70">({count})</span>
                      </button>
                    );
                  })
                )}
                {tagFilter && (
                  <button
                    type="button"
                    onClick={() => setTagFilter(null)}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={groupByTag}
                  onChange={(e) => setGroupByTag(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Ver agrupado por tag
              </label>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, bio o filmografía…"
            className="w-72 rounded-sm"
          />
          <ExportButton
            entityLabel={meta.title}
            filename={`roster-${role}`}
            sheetName={meta.title}
            fetchAll={async () => {
              const { data, error } = await supabase
                .from("composers")
                .select("*")
                .eq("roster_role", role)
                .order("full_name");
              if (error) throw error;
              return data ?? [];
            }}
            fields={composerExportFields()}
          />
          <Button asChild size="sm">
            <Link to="/composers/new" search={{ role }}><Plus className="mr-1 h-4 w-4" /> Nuevo</Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="font-display text-muted-foreground">Cargando archivo…</p>
      ) : !filtered.length ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center">
          <p className="font-display text-2xl">Aún no hay {meta.title.toLowerCase()} en el archivo.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Empieza añadiendo el primer {meta.singular} a la cartera.
          </p>
          <Button asChild className="mt-6">
            <Link to="/composers/new" search={{ role }}><Plus className="mr-1 h-4 w-4" /> Añadir {meta.singular}</Link>
          </Button>
        </div>
      ) : role !== "composer" ? (
        role === "specialist" && groupByTag ? (
          <div className="space-y-12">
            {specialistTagGroups.map(({ tag, items }) => (
              <section key={tag}>
                <div className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-3">
                  <div className="flex items-baseline gap-3">
                    <h2 className="font-display text-3xl">#{tag}</h2>
                    <span className="smallcaps text-muted-foreground">{items.length}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((c: any) => (
                    <SpecialistCard key={`${tag}-${c.id}`} c={c} role={role} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...filtered]
              .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "", "es"))
              .map((c: any) => (
                <SpecialistCard key={c.id} c={c} role={role} />
              ))}
          </div>
        )
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

function SpecialistCard({ c, role }: { c: any; role: RosterRole }) {
  const tags: string[] = (() => {
    const set = new Set<string>();
    for (const t of (c.tags ?? []) as string[]) if (t?.trim()) set.add(t.trim());
    if (role === "specialist") {
      for (const t of (c.specialist_tags ?? []) as string[]) if (t?.trim()) set.add(t.trim());
    }
    return [...set];
  })();
  return (
    <Link
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
          {role === "specialist" && tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {tags.slice(0, 6).map((t) => (
                <span
                  key={t}
                  className="rounded-sm bg-primary/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-primary"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
          <h3 className="font-display text-2xl leading-tight">{c.full_name}</h3>
          <p className="min-h-[1rem] text-xs text-muted-foreground">{[c.city, c.country].filter(Boolean).join(" · ") || "\u00A0"}</p>
          {role !== "specialist" && (
            <div className="mt-3 flex min-h-[1.5rem] flex-wrap gap-1.5">
              {tags.slice(0, 4).map((t) => (
                <Badge key={t} variant="outline" className="rounded-sm">{t}</Badge>
              ))}
            </div>
          )}
          <p className="mt-auto pt-4 smallcaps text-muted-foreground">
            {c.availability === "available" ? "Disponible" : c.availability === "partial" ? "Parcial" : "No disponible"}
          </p>
        </div>
      </article>
    </Link>
  );
}

function composerExportFields(): ExportField<any>[] {
  return [
    { key: "full_name", label: "Nombre completo", get: (r) => r.full_name },
    { key: "artistic_name", label: "Nombre artístico", get: (r) => r.artistic_name },
    { key: "legal_name", label: "Nombre legal", default: false, get: (r) => r.legal_name },
    { key: "roster_role", label: "Rol", get: (r) => r.roster_role },
    { key: "tier", label: "Tier", get: (r) => r.tier },
    { key: "representation_status", label: "Estado representación", get: (r) => r.representation_status },
    { key: "representation_start_date", label: "Inicio representación", get: (r) => r.representation_start_date },
    { key: "renewal_date", label: "Renovación", get: (r) => r.renewal_date },
    { key: "email", label: "Email", get: (r) => r.email },
    { key: "email_secondary", label: "Email secundario", default: false, get: (r) => r.email_secondary },
    { key: "phone", label: "Teléfono", get: (r) => r.phone },
    { key: "city", label: "Ciudad", get: (r) => r.city },
    { key: "country", label: "País", get: (r) => r.country },
    { key: "province", label: "Provincia", default: false, get: (r) => r.province },
    { key: "address", label: "Dirección", default: false, get: (r) => r.address },
    { key: "postal_code", label: "Código postal", default: false, get: (r) => r.postal_code },
    { key: "nif", label: "NIF", default: false, get: (r) => r.nif },
    { key: "birth_year", label: "Año nacimiento", default: false, get: (r) => r.birth_year },
    { key: "availability", label: "Disponibilidad", get: (r) => r.availability },
    { key: "next_available_on", label: "Próx. disponibilidad", default: false, get: (r) => r.next_available_on },
    { key: "tags", label: "Etiquetas", get: (r) => r.tags },
    { key: "bio_short", label: "Bio corta", default: false, get: (r) => r.bio_short },
    { key: "bio_long", label: "Bio larga", default: false, get: (r) => r.bio_long },
    { key: "reel_url", label: "Reel URL", default: false, get: (r) => r.reel_url },
    { key: "portal_url", label: "Portal URL", default: false, get: (r) => r.portal_url },
    { key: "team_name", label: "Equipo", default: false, get: (r) => r.team_name },
    { key: "team_email", label: "Email del equipo", default: false, get: (r) => r.team_email },
    { key: "owner_email", label: "Email propietario", default: false, get: (r) => r.owner_email },
    { key: "internal_notes", label: "Notas internas", default: false, get: (r) => r.internal_notes },
    { key: "career_notes", label: "Notas de carrera", default: false, get: (r) => r.career_notes },
    { key: "created_at", label: "Creado", default: false, get: (r) => r.created_at },
  ];
}