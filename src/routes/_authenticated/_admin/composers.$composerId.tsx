import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fetchCatalogs } from "@/lib/composers-api";
import { PhotoUploader } from "@/components/photo-uploader";
import { PhotoGallery } from "@/components/photo-gallery";
import { MultiChipSelect } from "@/components/multi-chip-select";
import { RelationListEditor } from "@/components/relation-list-editor";
import { AvailabilityEditor } from "@/components/availability-editor";
import { ProjectsHistoryEditor } from "@/components/projects-history-editor";
import { ComposerTeamEditor } from "@/components/composer-team-editor";
import { toast } from "sonner";
import { Trash2, Copy, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/composers/$composerId")({
  component: ComposerEditPage,
});

function ComposerEditPage() {
  const { composerId } = Route.useParams();
  const navigate = useNavigate();

  const composerQ = useQuery({
    queryKey: ["composer", composerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("composers")
        .select("*")
        .eq("id", composerId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const catalogsQ = useQuery({ queryKey: ["catalogs"], queryFn: fetchCatalogs });

  const relationsQ = useQuery({
    queryKey: ["composer-relations", composerId],
    queryFn: async () => {
      const [demos, films, awards, styles, genres, langs, docs, projects, agents] = await Promise.all([
        supabase.from("composer_demos").select("*").eq("composer_id", composerId).order("position"),
        supabase.from("composer_filmography").select("*").eq("composer_id", composerId).order("position"),
        supabase.from("composer_awards").select("*").eq("composer_id", composerId).order("position"),
        supabase.from("composer_styles").select("style_id").eq("composer_id", composerId),
        supabase.from("composer_genres").select("genre_id").eq("composer_id", composerId),
        supabase.from("composer_languages").select("language_code").eq("composer_id", composerId),
        supabase.from("composer_documents").select("*").eq("composer_id", composerId).order("position"),
        supabase.from("composer_projects").select("*").eq("composer_id", composerId).order("year", { ascending: false }),
        supabase.from("people").select("id, full_name, email").eq("role", "ic_team").order("full_name"),
      ]);
      return {
        demos: demos.data ?? [],
        films: films.data ?? [],
        awards: awards.data ?? [],
        styleIds: new Set((styles.data ?? []).map((r: any) => r.style_id)),
        genreIds: new Set((genres.data ?? []).map((r: any) => r.genre_id)),
        langCodes: new Set((langs.data ?? []).map((r: any) => r.language_code)),
        docs: docs.data ?? [],
        projects: projects.data ?? [],
        agents: agents.data ?? [],
      };
    },
  });

  if (composerQ.isLoading || catalogsQ.isLoading || relationsQ.isLoading) {
    return <div className="p-10 font-display text-muted-foreground">Cargando ficha…</div>;
  }
  if (composerQ.error || !composerQ.data) {
    return <div className="p-10 text-destructive">No se encontró el compositor.</div>;
  }

  return (
    <Inner
      initial={composerQ.data as any}
      catalogs={catalogsQ.data!}
      initialRelations={relationsQ.data!}
      onDeleted={() => navigate({ to: "/composers" })}
    />
  );
}

type CatalogShape = Awaited<ReturnType<typeof fetchCatalogs>>;

function Inner({
  initial,
  catalogs,
  initialRelations,
  onDeleted,
}: {
  initial: any;
  catalogs: CatalogShape;
  initialRelations: any;
  onDeleted: () => void;
}) {
  const [c, setC] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [styleIds, setStyleIds] = useState<Set<string>>(initialRelations.styleIds);
  const [genreIds, setGenreIds] = useState<Set<string>>(initialRelations.genreIds);
  const [langCodes, setLangCodes] = useState<Set<string>>(initialRelations.langCodes);
  const [demos, setDemos] = useState<any[]>(initialRelations.demos);
  const [films, setFilms] = useState<any[]>(initialRelations.films);
  const [awards, setAwards] = useState<any[]>(initialRelations.awards);
  const [docs, setDocs] = useState<any[]>(initialRelations.docs);
  const projects: any[] = initialRelations.projects ?? [];
  const agents: { id: string; full_name: string; email: string | null }[] = initialRelations.agents ?? [];
  const [tagInput, setTagInput] = useState("");

  function field<K extends string>(k: K, v: any) {
    setC((prev: any) => ({ ...prev, [k]: v }));
    setDirty(true);
  }

  async function saveCore() {
    setSaving(true);
    const { error } = await supabase
      .from("composers")
      .update({
        full_name: c.full_name,
        roster_role: ((c as { roster_role?: "composer" | "artist" | "supervisor" | "specialist" | "curator" | "other" }).roster_role) ?? "composer",
        city: c.city,
        country: c.country,
        birth_year: c.birth_year,
        bio_short: c.bio_short,
        bio_long: c.bio_long,
        reel_url: c.reel_url,
        internal_notes: c.internal_notes,
        tags: c.tags ?? [],
        nif: c.nif,
        address: c.address,
        postal_code: c.postal_code,
        province: c.province,
        phone: c.phone,
        email: c.email,
        email_secondary: c.email_secondary,
        team_name: c.team_name,
        team_email: c.team_email,
        artistic_name: c.artistic_name,
        legal_name: c.legal_name,
        tier: c.tier,
        representation_status: c.representation_status ?? "activo",
        agent_person_id: c.agent_person_id,
        representation_start_date: c.representation_start_date,
        renewal_date: c.renewal_date,
        career_notes: c.career_notes,
        portal_url: c.portal_url,
      })
      .eq("id", c.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Ficha guardada");
    setDirty(false);
  }

  const activeYear = new Date().getFullYear();
  const activeProjects = projects.filter((p) => (p.year ?? activeYear) >= activeYear);
  const totalRevenue = projects.reduce((s, p) => s + Number(p.price_charged ?? 0), 0);
  const totalMargin = projects.reduce((s, p) => s + Number(p.net_margin ?? 0), 0);
  const portalLink = c.portal_url || `${typeof window !== "undefined" ? window.location.origin : ""}/me`;

  function copyPortal() {
    navigator.clipboard.writeText(portalLink).then(
      () => toast.success("Enlace del portal copiado"),
      () => toast.error("No se pudo copiar"),
    );
  }

  async function toggleStyle(id: string) {
    const next = new Set(styleIds);
    const exists = next.has(id);
    exists ? next.delete(id) : next.add(id);
    setStyleIds(next);
    if (exists) {
      await supabase.from("composer_styles").delete().eq("composer_id", c.id).eq("style_id", id);
    } else {
      await supabase.from("composer_styles").insert({ composer_id: c.id, style_id: id });
    }
  }
  async function toggleGenre(id: string) {
    const next = new Set(genreIds);
    const exists = next.has(id);
    exists ? next.delete(id) : next.add(id);
    setGenreIds(next);
    if (exists) {
      await supabase.from("composer_genres").delete().eq("composer_id", c.id).eq("genre_id", id);
    } else {
      await supabase.from("composer_genres").insert({ composer_id: c.id, genre_id: id });
    }
  }
  async function toggleLang(code: string) {
    const next = new Set(langCodes);
    const exists = next.has(code);
    exists ? next.delete(code) : next.add(code);
    setLangCodes(next);
    if (exists) {
      await supabase
        .from("composer_languages")
        .delete()
        .eq("composer_id", c.id)
        .eq("language_code", code);
    } else {
      await supabase
        .from("composer_languages")
        .insert({ composer_id: c.id, language_code: code });
    }
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if ((c.tags ?? []).includes(t)) return;
    field("tags", [...(c.tags ?? []), t]);
    setTagInput("");
  }
  function removeTag(t: string) {
    field("tags", (c.tags ?? []).filter((x: string) => x !== t));
  }

  async function deleteComposer() {
    if (!confirm(`¿Eliminar la ficha de ${c.full_name}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("composers").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Ficha eliminada");
    onDeleted();
  }

  const styleOpts = useMemo(
    () => catalogs.styles.map((s) => ({ id: s.id, label: s.label_es })),
    [catalogs.styles],
  );
  const genreOpts = useMemo(
    () => catalogs.genres.map((g) => ({ id: g.id, label: g.label_es })),
    [catalogs.genres],
  );
  const langOpts = useMemo(
    () => catalogs.languages.map((l) => ({ code: l.code, label: l.label_es })),
    [catalogs.languages],
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <p className="smallcaps text-muted-foreground">
          <Link to="/composers" className="hover:text-foreground">Roster</Link> · Ficha
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={deleteComposer}>
            <Trash2 className="mr-1 h-3 w-3" /> Eliminar
          </Button>
        </div>
      </div>

      <header className="mb-10 border-b border-border pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl">{c.artistic_name || c.full_name}</h1>
            {(c.legal_name || c.full_name) && (c.artistic_name && (c.legal_name || c.full_name) !== c.artistic_name) && (
              <p className="mt-1 text-sm text-muted-foreground">Nombre legal: {c.legal_name || c.full_name}</p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {[c.city, c.country].filter(Boolean).join(" · ") || "Sin localización"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {c.tier && <Badge variant="outline" className="rounded-sm">Tier {c.tier}</Badge>}
            <Badge variant="secondary" className="rounded-sm">
              {({ activo: "Activo", pausa: "En pausa", en_negociacion: "En negociación", finalizado: "Finalizado" } as Record<string, string>)[c.representation_status ?? "activo"]}
            </Badge>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="Proyectos activos" value={String(activeProjects.length)} />
        <KPI label="Proyectos totales" value={String(projects.length)} />
        <KPI label="Facturación histórica" value={`${totalRevenue.toLocaleString("es-ES")} €`} />
        <KPI label="Margen neto" value={`${totalMargin.toLocaleString("es-ES")} €`} />
      </section>

      {/* Representación */}
      <Section title="Representación">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre artístico">
            <Input value={c.artistic_name ?? ""} onChange={(e) => field("artistic_name", e.target.value || null)} />
          </Field>
          <Field label="Nombre legal">
            <Input value={c.legal_name ?? ""} onChange={(e) => field("legal_name", e.target.value || null)} />
          </Field>
          <Field label="Tier">
            <select
              className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm"
              value={c.tier ?? ""}
              onChange={(e) => field("tier", e.target.value || null)}
            >
              <option value="">—</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="desarrollo">Desarrollo</option>
            </select>
          </Field>
          <Field label="Estado">
            <select
              className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm"
              value={c.representation_status ?? "activo"}
              onChange={(e) => field("representation_status", e.target.value)}
            >
              <option value="activo">Activo</option>
              <option value="pausa">En pausa</option>
              <option value="en_negociacion">En negociación</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </Field>
          <Field label="Agente responsable">
            <select
              className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm"
              value={c.agent_person_id ?? ""}
              onChange={(e) => field("agent_person_id", e.target.value || null)}
            >
              <option value="">— Sin asignar —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}{a.email ? ` · ${a.email}` : ""}</option>
              ))}
            </select>
          </Field>
          <Field label="Fecha de inicio de representación">
            <Input
              type="date"
              value={c.representation_start_date ?? ""}
              onChange={(e) => field("representation_start_date", e.target.value || null)}
            />
          </Field>
          <Field label="Fecha de renovación">
            <Input
              type="date"
              value={c.renewal_date ?? ""}
              onChange={(e) => field("renewal_date", e.target.value || null)}
            />
          </Field>
          <Field label="Notas de carrera" className="sm:col-span-2">
            <Textarea
              rows={4}
              value={c.career_notes ?? ""}
              onChange={(e) => field("career_notes", e.target.value || null)}
              placeholder="Trayectoria, objetivos, hitos próximos, conversaciones abiertas…"
            />
          </Field>
        </div>
      </Section>

      {/* Proyectos activos */}
      <Section title="Proyectos activos">
        {activeProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin proyectos activos este año.</p>
        ) : (
          <ul className="space-y-2">
            {activeProjects.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between rounded-sm border border-border bg-card/50 px-4 py-3">
                <div>
                  <div className="text-sm">{p.production}</div>
                  <div className="text-xs text-muted-foreground">
                    {[p.production_type, p.director, p.platform, p.year].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {p.price_charged != null && (
                  <div className="text-sm text-muted-foreground">{Number(p.price_charged).toLocaleString("es-ES")} €</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Portal del representado */}
      <Section title="Portal del representado">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="URL personalizada del portal (opcional)" className="sm:col-span-2">
            <Input
              type="url"
              value={c.portal_url ?? ""}
              onChange={(e) => field("portal_url", e.target.value || null)}
              placeholder="https://… (si se deja vacío, se usa el portal interno /me)"
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-muted/40 px-4 py-3">
          <span className="smallcaps text-xs text-muted-foreground">Acceso</span>
          <code className="flex-1 truncate text-xs">{portalLink}</code>
          <Button type="button" size="sm" variant="outline" onClick={copyPortal}>
            <Copy className="mr-1 h-3 w-3" /> Copiar enlace
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <a href={portalLink} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-3 w-3" /> Abrir
            </a>
          </Button>
        </div>
        {c.owner_email ? (
          <p className="text-xs text-muted-foreground">
            Cuenta del representado: <strong>{c.owner_email}</strong>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Aún no hay cuenta vinculada. El representado podrá entrar al portal cuando se registre con un email asociado a esta ficha.
          </p>
        )}
      </Section>

      {/* Identidad */}
      <Section title="Identidad">
        <PhotoUploader
          composerId={c.id}
          photoPath={c.photo_path}
          onChange={(p) => field("photo_path", p)}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre completo">
            <Input value={c.full_name ?? ""} onChange={(e) => field("full_name", e.target.value)} />
          </Field>
          <Field label="Rol en el roster">
            <select
              className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm"
              value={(c as { roster_role?: string }).roster_role ?? "composer"}
              onChange={(e) => field("roster_role" as never, e.target.value as never)}
            >
              <option value="composer">Compositor</option>
              <option value="artist">Artista</option>
              <option value="supervisor">Supervisor musical</option>
              <option value="specialist">Especialista</option>
              <option value="curator">Curador musical</option>
              <option value="other">Otros</option>
            </select>
          </Field>
          <Field label="Año de nacimiento">
            <Input
              type="number"
              value={c.birth_year ?? ""}
              onChange={(e) => field("birth_year", e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
          <Field label="Bio breve (≤300)" className="sm:col-span-2">
            <Textarea
              maxLength={300}
              rows={2}
              value={c.bio_short ?? ""}
              onChange={(e) => field("bio_short", e.target.value || null)}
            />
          </Field>
          <Field label="Bio extendida" className="sm:col-span-2">
            <Textarea
              rows={6}
              value={c.bio_long ?? ""}
              onChange={(e) => field("bio_long", e.target.value || null)}
            />
          </Field>
        </div>
      </Section>

      {/* Galería */}
      <Section title="Galería fotográfica (máx. 12)">
        <PhotoGallery composerId={c.id} />
      </Section>

      {/* Datos fiscales y dirección */}
      <Section title="Datos fiscales y dirección">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="NIF / DNI">
            <Input value={c.nif ?? ""} onChange={(e) => field("nif", e.target.value || null)} />
          </Field>
          <Field label="Domicilio" className="sm:col-span-2">
            <Input
              value={c.address ?? ""}
              onChange={(e) => field("address", e.target.value || null)}
              placeholder="Calle, número, piso, puerta"
            />
          </Field>
          <Field label="Código postal">
            <Input value={c.postal_code ?? ""} onChange={(e) => field("postal_code", e.target.value || null)} />
          </Field>
          <Field label="Ciudad">
            <Input value={c.city ?? ""} onChange={(e) => field("city", e.target.value || null)} />
          </Field>
          <Field label="Provincia">
            <Input value={c.province ?? ""} onChange={(e) => field("province", e.target.value || null)} />
          </Field>
          <Field label="País">
            <Input value={c.country ?? ""} onChange={(e) => field("country", e.target.value || null)} />
          </Field>
        </div>
      </Section>

      {/* Contacto */}
      <Section title="Contacto">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Teléfono">
            <Input type="tel" value={c.phone ?? ""} onChange={(e) => field("phone", e.target.value || null)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={c.email ?? ""} onChange={(e) => field("email", e.target.value || null)} />
          </Field>
          <Field label="Email secundario">
            <Input type="email" value={c.email_secondary ?? ""} onChange={(e) => field("email_secondary", e.target.value || null)} />
          </Field>
        </div>
      </Section>

      {/* Equipo */}
      <Section title="Equipo / Representación">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre del equipo">
            <Input value={c.team_name ?? ""} onChange={(e) => field("team_name", e.target.value || null)} />
          </Field>
          <Field label="Email del equipo">
            <Input type="email" value={c.team_email ?? ""} onChange={(e) => field("team_email", e.target.value || null)} />
          </Field>
        </div>
      </Section>

      {/* Disponibilidad por periodos */}
      <Section title="Disponibilidad">
        <p className="text-xs text-muted-foreground">
          Periodos que se reflejan en el calendario del compositor y en el calendario general de Interesante Compañía.
        </p>
        <AvailabilityEditor composerId={c.id} />
      </Section>

      {/* Tarifa: histórico económico de proyectos */}
      <Section title="Tarifa — histórico económico">
        <p className="text-xs text-muted-foreground">
          Acumulado de proyectos pasados con detalle económico por producción.
        </p>
        <ProjectsHistoryEditor composerId={c.id} />
      </Section>

      {/* Reel */}
      <Section title="Reel principal">
        <Field label="URL (YouTube, Vimeo, SoundCloud…)">
          <Input
            type="url"
            value={c.reel_url ?? ""}
            onChange={(e) => field("reel_url", e.target.value || null)}
          />
        </Field>
      </Section>

      {/* Estilos / Géneros / Idiomas */}
      <Section title="Estilos musicales">
        <MultiChipSelect
          options={styleOpts}
          selected={styleIds}
          onToggle={toggleStyle}
          getKey={(o) => o.id!}
        />
      </Section>
      <Section title="Géneros audiovisuales">
        <MultiChipSelect
          options={genreOpts}
          selected={genreIds}
          onToggle={toggleGenre}
          getKey={(o) => o.id!}
        />
      </Section>
      <Section title="Idiomas">
        <MultiChipSelect
          options={langOpts}
          selected={langCodes}
          onToggle={toggleLang}
          getKey={(o) => o.code!}
        />
      </Section>

      {/* Tags */}
      <Section title="Tags libres">
        <div className="flex flex-wrap gap-1.5">
          {(c.tags ?? []).map((t: string) => (
            <Badge key={t} variant="outline" className="rounded-sm">
              {t}
              <button onClick={() => removeTag(t)} className="ml-2 text-muted-foreground hover:text-foreground">×</button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="Añadir tag y pulsar Enter"
            className="max-w-xs"
          />
          <Button type="button" size="sm" variant="outline" onClick={addTag}>Añadir</Button>
        </div>
      </Section>

      {/* Demos */}
      <Section>
        <RelationListEditor
          title="Demos"
          table="composer_demos"
          composerId={c.id}
          rows={demos}
          onChange={setDemos}
          newDefaults={{ title: "Nuevo demo" }}
          fields={[
            { key: "title", label: "Título" },
            { key: "category", label: "Categoría", placeholder: "p.ej. Drama, Acción" },
            { key: "url", label: "URL", type: "url" },
            { key: "duration_seconds", label: "Duración (s)", type: "number" },
            { key: "description", label: "Notas", type: "textarea", className: "sm:col-span-2" },
          ]}
        />
      </Section>

      {/* Filmografía */}
      <Section>
        <RelationListEditor
          title="Filmografía"
          table="composer_filmography"
          composerId={c.id}
          rows={films}
          onChange={setFilms}
          newDefaults={{ title: "Nuevo título", format: "feature" }}
          fields={[
            { key: "title", label: "Título" },
            { key: "year", label: "Año", type: "number" },
            { key: "director", label: "Dirección" },
            { key: "production_company", label: "Productora" },
            { key: "country", label: "País" },
            { key: "url", label: "URL", type: "url" },
          ]}
        />
      </Section>

      {/* Awards */}
      <Section>
        <RelationListEditor
          title="Premios y nominaciones"
          table="composer_awards"
          composerId={c.id}
          rows={awards}
          onChange={setAwards}
          newDefaults={{ title: "Nuevo premio" }}
          fields={[
            { key: "title", label: "Título" },
            { key: "year", label: "Año", type: "number" },
            { key: "note", label: "Nota", type: "textarea", className: "sm:col-span-2" },
          ]}
        />
      </Section>

      <Section title="Notas internas (solo IC)">
        <Textarea
          rows={5}
          value={c.internal_notes ?? ""}
          onChange={(e) => field("internal_notes", e.target.value || null)}
          placeholder="Información confidencial, contactos, condiciones…"
        />
      </Section>

      <Section title="Equipo asignado a este representado">
        <ComposerTeamEditor composerId={c.id} />
      </Section>

      {/* Documentos y materiales */}
      <Section>
        <RelationListEditor
          title="Documentos y materiales"
          table="composer_documents"
          composerId={c.id}
          rows={docs}
          onChange={setDocs}
          newDefaults={{ title: "Nuevo documento" }}
          fields={[
            { key: "title", label: "Título" },
            { key: "kind", label: "Tipo", placeholder: "p.ej. Contrato, Press kit, Rider, EPK" },
            { key: "url", label: "Enlace (Drive, Dropbox, web…)", type: "url", className: "sm:col-span-2" },
            { key: "storage_path", label: "Ruta de archivo interno", placeholder: "composer-assets/…", className: "sm:col-span-2" },
            { key: "notes", label: "Notas", type: "textarea", className: "sm:col-span-2" },
          ]}
        />
      </Section>

      <SaveButton floating onClick={saveCore} saving={saving} disabled={!dirty} title={dirty ? "Guardar cambios" : "Todo guardado"} />
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 py-8">
      {title && (
        <>
          <h2 className="font-display text-2xl">{title}</h2>
          <Separator />
        </>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-card/50 px-4 py-3">
      <div className="smallcaps text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl">{value}</div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}