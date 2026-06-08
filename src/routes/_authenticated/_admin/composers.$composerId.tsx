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
import { formatDateEs } from "@/lib/dates";
import { PhotoUploader } from "@/components/photo-uploader";
import { PhotoGallery } from "@/components/photo-gallery";
import { VideoGallery } from "@/components/video-gallery";
import { SocialActivityPanel } from "@/components/social-activity-panel";
import { MultiChipSelect } from "@/components/multi-chip-select";
import { RelationListEditor } from "@/components/relation-list-editor";
import { AvailabilityEditor } from "@/components/availability-editor";
import { ProjectsHistoryEditor } from "@/components/projects-history-editor";
import { ComposerTeamEditor } from "@/components/composer-team-editor";
import { ComposerChat } from "@/components/composer-chat";
import { toast } from "sonner";
import { Trash2, Copy, ExternalLink } from "lucide-react";
import { SaveButton } from "@/components/save-button";

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
      const [demos, films, awards, styles, genres, langs, docs, projects, agents, candidacies, productions, contracts] = await Promise.all([
        supabase.from("composer_demos").select("*").eq("composer_id", composerId).order("position"),
        supabase.from("composer_filmography").select("*").eq("composer_id", composerId).order("position"),
        supabase.from("composer_awards").select("*").eq("composer_id", composerId).order("position"),
        supabase.from("composer_styles").select("style_id").eq("composer_id", composerId),
        supabase.from("composer_genres").select("genre_id").eq("composer_id", composerId),
        supabase.from("composer_languages").select("language_code").eq("composer_id", composerId),
        supabase.from("composer_documents").select("*").eq("composer_id", composerId).order("position"),
        supabase.from("composer_projects").select("*").eq("composer_id", composerId).order("year", { ascending: false }),
        supabase.from("ic_team").select("id, full_name, email").eq("role", "ic_team").order("full_name"),
        (supabase as any)
          .from("opportunity_candidates")
          .select("id, note, created_at, opportunity:opportunities(id, title, statuses, partner_name, expected_close_date, estimated_value)")
          .eq("composer_id", composerId)
          .order("created_at", { ascending: false }),
        (async () => {
          const PROD_SELECT = "id, title, year, status, platform, director, premiere_date, delivery_date, fee_amount, ic_commission, ic_commission_pct, composer_id, billing_sprints:production_billing_sprints!production_billing_sprints_production_id_fkey(id, sprint_number, kind, label, amount, status, due_date, invoiced_date, paid_date, holded_invoice_ref, holded_url)";
          const [direct, viaAssign] = await Promise.all([
            supabase.from("productions").select(PROD_SELECT).eq("composer_id", composerId),
            (supabase as any)
              .from("production_assignments")
              .select(`production:productions(${PROD_SELECT})`)
              .eq("composer_id", composerId),
          ]);
          const map = new Map<string, any>();
          (direct.data ?? []).forEach((p: any) => map.set(p.id, p));
          ((viaAssign.data ?? []) as any[]).forEach((row: any) => {
            if (row.production) map.set(row.production.id, row.production);
          });
          const arr = Array.from(map.values()).sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
          return { data: arr, error: direct.error ?? viaAssign.error };
        })(),
        supabase
          .from("contracts")
          .select("id, title, contract_type, sign_status, signed_date, end_date, notice_date")
          .or(`composer_id.eq.${composerId},signer_composer_id.eq.${composerId}`)
          .order("signed_date", { ascending: false, nullsFirst: false }),
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
        candidacies: (candidacies as any).data ?? [],
        productions: productions.data ?? [],
        contracts: contracts.data ?? [],
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
  const candidacies: any[] = initialRelations.candidacies ?? [];
  const productionsRel: any[] = initialRelations.productions ?? [];
  const contractsRel: any[] = initialRelations.contracts ?? [];
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

  // "Proyectos activos" = producciones con estado >= contrato_firmado,
  // hasta 10 días naturales después del comunicado de estreno (premiere_date).
  const ACTIVE_PRODUCTION_STATUSES = new Set([
    "contrato_firmado",
    "visuales_entregados",
    "en_composicion",
    "en_produccion",
    "en_mezclas",
    "entrega_parcial",
    "entrega_total",
    "entregables_completados",
    "finalizada",
    "estrenada",
    "comunicado_estreno",
  ]);
  const todayMs = Date.now();
  const activeProductions = productionsRel.filter((p: any) => {
    if (!ACTIVE_PRODUCTION_STATUSES.has(p.status)) return false;
    if (!p.premiere_date) return true;
    const cutoff = new Date(p.premiere_date).getTime() + 10 * 24 * 60 * 60 * 1000;
    return todayMs <= cutoff;
  });
  const totalRevenue = projects.reduce((s, p) => s + Number(p.price_charged ?? 0), 0);
  const totalMargin = projects.reduce((s, p) => s + Number(p.net_margin ?? 0), 0);
  const portalLink = c.portal_url
    || `${typeof window !== "undefined" ? window.location.origin : ""}/portal?as=${c.id}`;

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
          <Button asChild size="sm" variant="outline">
            <Link to="/finance" search={{ composerId: c.id }}>Dashboard económico</Link>
          </Button>
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
        <KPI label="Proyectos activos" value={String(activeProductions.length)} />
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
              <option value="D">D</option>
              <option value="E">E</option>
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
        {activeProductions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin proyectos activos este año.</p>
        ) : (
          <ul className="space-y-2">
            {activeProductions.map((p: any) => (
              <li key={p.id} className="flex items-baseline justify-between rounded-sm border border-border bg-card/50 px-4 py-3">
                <div>
                  <div className="text-sm">
                    <Link to="/productions/$productionId" params={{ productionId: p.id }} className="hover:underline">
                      {p.title}
                    </Link>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[p.director, p.platform, p.year, p.status].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {p.fee_amount != null && (
                  <div className="text-sm text-muted-foreground">{Number(p.fee_amount).toLocaleString("es-ES")} €</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Oportunidades y relaciones */}
      <Section title="Oportunidades">
        {candidacies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no figura como candidato en ninguna oportunidad.</p>
        ) : (
          <ul className="space-y-2">
            {candidacies.map((c: any) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3 rounded-sm border border-border bg-card/50 px-4 py-3">
                <div className="min-w-0">
                  <Link to="/opportunities/$opportunityId" params={{ opportunityId: c.opportunity?.id }} className="text-sm hover:underline">
                    {c.opportunity?.title ?? "—"}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {[c.opportunity?.partner_name, (c.opportunity?.statuses ?? []).join(" · "), c.opportunity?.expected_close_date].filter(Boolean).join(" · ")}
                  </div>
                  {c.note && <div className="mt-1 text-xs text-muted-foreground">{c.note}</div>}
                </div>
                {c.opportunity?.estimated_value != null && (
                  <div className="text-sm text-muted-foreground whitespace-nowrap">{Number(c.opportunity.estimated_value).toLocaleString("es-ES")} €</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Producciones">
        {productionsRel.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin producciones asociadas.</p>
        ) : (
          <ul className="space-y-2">
            {productionsRel.map((p: any) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3 rounded-sm border border-border bg-card/50 px-4 py-3">
                <div className="min-w-0">
                  <Link to="/productions/$productionId" params={{ productionId: p.id }} className="text-sm hover:underline">{p.title}</Link>
                  <div className="text-xs text-muted-foreground">
                    {[p.status, p.platform, p.director, p.year].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {p.premiere_date ? `Estreno ${p.premiere_date}` : p.delivery_date ? `Entrega ${p.delivery_date}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Facturación">
        <ComposerBilling productions={productionsRel} composerId={c.id} />
      </Section>


      <Section title="Contratos">
        {contractsRel.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin contratos.</p>
        ) : (
          <ul className="space-y-2">
            {contractsRel.map((k: any) => (
              <li key={k.id} className="flex items-baseline justify-between gap-3 rounded-sm border border-border bg-card/50 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm">{k.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {[k.contract_type, k.sign_status].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {k.signed_date ? `Firmado ${k.signed_date}` : ""}
                  {k.end_date ? ` · Fin ${k.end_date}` : ""}
                </div>
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

      <Section title="Chat con el compositor">
        <ComposerChat composerId={c.id} />
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
          {(c as { roster_role?: string }).roster_role === "specialist" && (
            <Field label="Tipo de especialista">
              <Input
                value={(c as { specialist_subtype?: string | null }).specialist_subtype ?? ""}
                onChange={(e) => field("specialist_subtype" as never, (e.target.value || null) as never)}
                placeholder="Ej. sound designer, foley artist, ingeniero de mezcla…"
              />
            </Field>
          )}
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

      <Section title="Vídeos (máx. 12)">
        <VideoGallery composerId={c.id} />
      </Section>

      <Section title="Actividad en redes sociales">
        <SocialActivityPanel composerId={c.id} />
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

      <Section title="Equipo / Representación">
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

      <SaveButton floating onClick={saveCore} saving={saving} title={dirty ? "Guardar cambios" : "Guardar ficha"} />
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

function ComposerBilling({ productions, composerId }: { productions: any[]; composerId: string }) {
  const sprints = productions.flatMap((p) =>
    (p.billing_sprints ?? []).map((s: any) => ({ ...s, production_title: p.title, production_id: p.id })),
  );
  if (productions.length === 0) {
    return <p className="text-sm text-muted-foreground">Asigna al representado a una producción para ver su facturación.</p>;
  }
  if (sprints.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Ninguna producción tiene sprints de facturación todavía. Crea sprints desde la ficha de cada producción.
        </p>
        <ProductionFeeSummary productions={productions} />
        <Link to="/finance" search={{ composerId }} className="inline-block text-xs underline text-muted-foreground hover:text-foreground">
          Abrir dashboard económico completo →
        </Link>
      </div>
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  const totals = sprints.reduce(
    (acc: any, s: any) => {
      const a = Number(s.amount) || 0;
      acc.previsto += a;
      if (s.invoiced_date) acc.fact += a;
      if (s.paid_date) acc.cob += a;
      if (s.due_date && !s.invoiced_date && s.due_date < today) acc.venc += a;
      return acc;
    },
    { previsto: 0, fact: 0, cob: 0, venc: 0 },
  );
  sprints.sort((a: any, b: any) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="Previsto" value={`${totals.previsto.toLocaleString("es-ES")} €`} />
        <KPI label="Facturado" value={`${totals.fact.toLocaleString("es-ES")} €`} />
        <KPI label="Cobrado" value={`${totals.cob.toLocaleString("es-ES")} €`} />
        <KPI label="Vencido sin facturar" value={`${totals.venc.toLocaleString("es-ES")} €`} />
      </div>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Producción</th>
              <th className="px-3 py-2">Sprint</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2 text-right">Importe</th>
              <th className="px-3 py-2">Vencimiento</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Ref. Holded</th>
            </tr>
          </thead>
          <tbody>
            {sprints.map((s: any) => {
              const vencido = s.due_date && !s.invoiced_date && s.due_date < today;
              return (
                <tr key={s.id} className={`border-t border-border ${vencido ? "bg-amber-500/5" : ""}`}>
                  <td className="px-3 py-2">
                    <Link to="/productions/$productionId" params={{ productionId: s.production_id }} className="hover:underline">
                      {s.production_title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">#{s.sprint_number}{s.label ? ` · ${s.label}` : ""}</td>
                  <td className="px-3 py-2 text-xs">{s.kind === "comision" ? "Comisión IC" : s.kind === "trabajo" ? "Trabajo" : s.kind}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Number(s.amount ?? 0).toLocaleString("es-ES")} €</td>
                  <td className={`px-3 py-2 ${vencido ? "text-amber-600 dark:text-amber-400" : ""}`}>{formatDateEs(s.due_date)}</td>
                  <td className="px-3 py-2 text-xs">{s.status}</td>
                  <td className="px-3 py-2 text-xs">
                    {s.holded_url ? (
                      <a href={s.holded_url} target="_blank" rel="noreferrer" className="underline">
                        {s.holded_invoice_ref || "ver"}
                      </a>
                    ) : (
                      s.holded_invoice_ref || "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Link to="/finance" search={{ composerId }} className="inline-block text-xs underline text-muted-foreground hover:text-foreground">
        Abrir dashboard económico completo →
      </Link>
    </div>
  );
}

function ProductionFeeSummary({ productions }: { productions: any[] }) {
  const withFee = productions.filter((p) => p.fee_amount != null || p.ic_commission != null);
  if (withFee.length === 0) return null;
  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {withFee.map((p) => (
        <li key={p.id}>
          <span className="text-foreground">{p.title}</span> · Fee {Number(p.fee_amount ?? 0).toLocaleString("es-ES")} € · Comisión IC {Number(p.ic_commission ?? 0).toLocaleString("es-ES")} €
        </li>
      ))}
    </ul>
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