import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  SocialLinksEditor,
  SocialLinksBadges,
  type SocialLinks,
} from "@/components/social-links";
import { EntityDocumentsEditor } from "@/components/entity-documents-editor";
import { Building2, Receipt, Trophy, Users, Briefcase, Award, FileText, Calendar, Link2, Phone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/ic")({
  component: ICCompanyPage,
});

type CompanyProfile = {
  iban?: string;
  billing_email?: string;
  billing_terms?: string;
  payment_terms_days?: number | null;
  founded_year?: number | null;
  office_hours?: string;
  milestones?: { year: number | null; text: string }[];
};

type ICRow = {
  id: string;
  full_name: string;
  artistic_name: string | null;
  legal_name: string | null;
  nif: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  email_secondary: string | null;
  social_links: SocialLinks | null;
  company_profile: CompanyProfile | null;
};

function ICCompanyPage() {
  const qc = useQueryClient();
  const { data: ic, isLoading } = useQuery({
    queryKey: ["ic-company"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("composers")
        .select(
          "id, full_name, artistic_name, legal_name, nif, address, postal_code, city, province, country, phone, email, email_secondary, social_links, company_profile",
        )
        .eq("roster_role", "ic_company")
        .maybeSingle();
      if (error) throw error;
      return data as ICRow | null;
    },
  });

  if (isLoading) return <div className="p-10 font-display text-muted-foreground">Cargando ficha corporativa…</div>;
  if (!ic) return <div className="p-10 font-display text-muted-foreground">No se ha encontrado la ficha de Interesante Compañía.</div>;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-12">
      <header className="border-b border-border pb-6">
        <p className="smallcaps text-muted-foreground">Roster · Interesante Filmografía</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl flex items-center gap-3">
              <Building2 className="h-9 w-9 text-primary" />
              {ic.artistic_name || ic.full_name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Ficha corporativa de Interesante Compañía. Acumula la filmografía combinada del roster, KPIs anuales,
              premios agregados, partners recurrentes, equipo IC y todos los datos de contacto y facturación.
            </p>
          </div>
        </div>
      </header>

      <ICKpisSection />
      <ICCombinedFilmographySection icId={ic.id} />
      <ICAwardsAggregatedSection />
      <ICTopPartnersSection />
      <ICTeamSection />
      <ICContactBillingSection ic={ic} onSaved={() => qc.invalidateQueries({ queryKey: ["ic-company"] })} />
      <ICSocialSection ic={ic} onSaved={() => qc.invalidateQueries({ queryKey: ["ic-company"] })} />
      <ICMilestonesSection ic={ic} onSaved={() => qc.invalidateQueries({ queryKey: ["ic-company"] })} />
      <ICDocumentsSection icId={ic.id} />
    </div>
  );
}

/* ---------- Sections ---------- */

function SectionHeader({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between border-b border-border pb-2">
      <h2 className="flex items-center gap-2 font-display text-2xl">
        <Icon className="h-5 w-5 text-muted-foreground" />
        {title}
      </h2>
      {hint && <span className="smallcaps text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function fmtEur(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function ICKpisSection() {
  const year = new Date().getFullYear();
  const { data } = useQuery({
    queryKey: ["ic-kpis", year],
    queryFn: async () => {
      const [sprints, prods, opps, contracts, roster] = await Promise.all([
        (supabase as any).from("production_billing_sprints").select("amount, kind, due_date, invoiced_date"),
        (supabase as any).from("productions").select("id, status, year"),
        (supabase as any).from("opportunities").select("id, statuses"),
        (supabase as any).from("contracts").select("id, sign_status, signed_date"),
        supabase.from("composers").select("id, representation_status, roster_role"),
      ]);
      const ACTIVE = new Set([
        "compositor_confirmado","presupuesto_enviado","presupuesto_confirmado","contrato_enviado",
        "contrato_negociacion","contrato_firmado","visuales_entregados","en_composicion",
        "en_produccion","en_mezclas","entrega_parcial","entrega_total","entregables_completados",
      ]);
      const commissionThisYear = ((sprints.data ?? []) as any[])
        .filter((s) => s.kind === "comision")
        .filter((s) => {
          const d = s.invoiced_date || s.due_date;
          return d && new Date(d).getFullYear() === year;
        })
        .reduce((a, s) => a + Number(s.amount ?? 0), 0);
      const activeProds = ((prods.data ?? []) as any[]).filter((p) => ACTIVE.has(p.status)).length;
      const openOpps = ((opps.data ?? []) as any[]).filter((o) => {
        const s = (o.statuses ?? []) as string[];
        return !s.includes("cerrado") && !s.includes("descartado");
      }).length;
      const signed = ((contracts.data ?? []) as any[]).filter((c) => c.sign_status === "firmado").length;
      const activeRoster = ((roster.data ?? []) as any[]).filter(
        (c) => c.representation_status === "activo" && c.roster_role !== "ic_company",
      ).length;
      return { commissionThisYear, activeProds, openOpps, signed, activeRoster };
    },
  });

  return (
    <section>
      <SectionHeader icon={Receipt} title={`KPIs corporativos · ${year}`} hint="Datos automáticos" />
      <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-5">
        <Kpi label="Comisiones IC año" value={data ? fmtEur(data.commissionThisYear) : "—"} />
        <Kpi label="Producciones activas" value={String(data?.activeProds ?? "—")} />
        <Kpi label="Oportunidades abiertas" value={String(data?.openOpps ?? "—")} />
        <Kpi label="Contratos firmados" value={String(data?.signed ?? "—")} />
        <Kpi label="Roster activo" value={String(data?.activeRoster ?? "—")} />
      </div>
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-4">
      <p className="smallcaps text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
    </div>
  );
}

function ICCombinedFilmographySection({ icId }: { icId: string }) {
  const { data } = useQuery({
    queryKey: ["ic-combined-filmo"],
    queryFn: async () => {
      const [prods, filmo, sf] = await Promise.all([
        (supabase as any)
          .from("productions")
          .select("id, title, year, project_type, composers(full_name, artistic_name)")
          .order("year", { ascending: false, nullsFirst: false }),
        supabase
          .from("composer_filmography")
          .select("id, title, year, composer:composers(id, full_name, artistic_name)")
          .order("year", { ascending: false, nullsFirst: false }),
        supabase
          .from("spanish_films")
          .select("id, title, title_es, year")
          .order("year", { ascending: false, nullsFirst: false })
          .limit(500),
      ]);
      type Row = { key: string; title: string; year: number | null; kind: string; composer?: string | null; source: "Producción" | "Filmografía" | "Película ES" };
      const rows: Row[] = [];
      ((prods.data ?? []) as any[]).forEach((p) =>
        rows.push({
          key: "p-" + p.id,
          title: p.title,
          year: p.year ?? null,
          kind: p.project_type ?? "—",
          composer: p.composers?.artistic_name ?? p.composers?.full_name ?? null,
          source: "Producción",
        }),
      );
      ((filmo.data ?? []) as any[]).forEach((f) =>
        rows.push({
          key: "f-" + f.id,
          title: f.title,
          year: f.year ?? null,
          kind: "filmografía",
          composer: f.composer?.artistic_name ?? f.composer?.full_name ?? null,
          source: "Filmografía",
        }),
      );
      ((sf.data ?? []) as any[]).forEach((s) =>
        rows.push({
          key: "s-" + s.id,
          title: s.title_es || s.title,
          year: s.year ?? null,
          kind: "cine",
          composer: null,
          source: "Película ES",
        }),
      );
      rows.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      return rows;
    },
  });

  return (
    <section>
      <SectionHeader icon={Briefcase} title="Filmografía combinada del roster" hint={`${data?.length ?? 0} entradas`} />
      {!data?.length ? (
        <p className="text-sm text-muted-foreground">Sin entradas todavía.</p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left smallcaps text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Año</th>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Compositor/a</th>
                <th className="px-3 py-2">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 300).map((r) => (
                <tr key={r.key} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-xs">{r.year ?? "—"}</td>
                  <td className="px-3 py-2">{r.title}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.kind}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.composer ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="rounded-sm text-[10px]">{r.source}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 300 && (
            <p className="border-t border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Mostrando 300 de {data.length} entradas.
            </p>
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Reservado: <span className="font-mono">{icId.slice(0, 6)}…</span></p>
    </section>
  );
}

function ICAwardsAggregatedSection() {
  const { data } = useQuery({
    queryKey: ["ic-awards"],
    queryFn: async () => {
      const { data } = await supabase
        .from("composer_awards")
        .select("title, year, note, composer:composers(full_name, artistic_name)")
        .order("year", { ascending: false, nullsFirst: false });
      return data ?? [];
    },
  });
  const total = data?.length ?? 0;
  return (
    <section>
      <SectionHeader icon={Trophy} title="Premios y nominaciones (agregado)" hint={`${total} entradas`} />
      {!total ? (
        <p className="text-sm text-muted-foreground">Sin premios registrados todavía.</p>
      ) : (
        <ul className="divide-y divide-border rounded-sm border border-border text-sm">
          {(data ?? []).slice(0, 200).map((a: any, i: number) => (
            <li key={i} className="flex flex-wrap items-baseline justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">{a.title}</p>
                {a.note && <p className="text-xs text-muted-foreground">{a.note}</p>}
              </div>
              <p className="text-xs text-muted-foreground">
                {[a.composer?.artistic_name || a.composer?.full_name, a.year].filter(Boolean).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ICTopPartnersSection() {
  const { data } = useQuery({
    queryKey: ["ic-partners"],
    queryFn: async () => {
      const [prods, platforms, companies] = await Promise.all([
        (supabase as any).from("productions").select("platform_id, partner_company_id"),
        supabase.from("platforms").select("id, name"),
        supabase.from("production_companies").select("id, name"),
      ]);
      const platById = new Map<string, string>();
      (platforms.data ?? []).forEach((p: any) => platById.set(p.id, p.name));
      const compById = new Map<string, string>();
      (companies.data ?? []).forEach((c: any) => compById.set(c.id, c.name));
      const platCount = new Map<string, number>();
      const compCount = new Map<string, number>();
      ((prods.data ?? []) as any[]).forEach((p) => {
        if (p.platform_id) platCount.set(p.platform_id, (platCount.get(p.platform_id) ?? 0) + 1);
        if (p.partner_company_id) compCount.set(p.partner_company_id, (compCount.get(p.partner_company_id) ?? 0) + 1);
      });
      const topPlat = Array.from(platCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, n]) => ({ id, name: platById.get(id) ?? id, n }));
      const topComp = Array.from(compCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, n]) => ({ id, name: compById.get(id) ?? id, n }));
      return { topPlat, topComp };
    },
  });

  return (
    <section>
      <SectionHeader icon={Award} title="Partners recurrentes" hint="Top 10 por nº de producciones" />
      <div className="grid gap-6 md:grid-cols-2">
        <PartnersList label="Plataformas" items={data?.topPlat ?? []} linkTo="/platforms" />
        <PartnersList label="Productoras" items={data?.topComp ?? []} linkTo="/production-companies" />
      </div>
    </section>
  );
}

function PartnersList({ label, items, linkTo }: { label: string; items: { id: string; name: string; n: number }[]; linkTo: string }) {
  return (
    <div className="rounded-sm border border-border p-3">
      <p className="smallcaps mb-2 text-xs text-muted-foreground">{label}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin datos.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-1.5">
              <Link to={linkTo} className="hover:underline">{it.name}</Link>
              <span className="font-mono text-xs text-muted-foreground">{it.n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ICTeamSection() {
  const { data } = useQuery({
    queryKey: ["ic-team"],
    queryFn: async () => {
      const { data: people } = await supabase
        .from("people")
        .select("id, full_name, email, phone, role")
        .eq("role", "ic_team")
        .order("full_name");
      const ids = (people ?? []).map((p) => p.id);
      let fnsByPerson = new Map<string, string[]>();
      if (ids.length) {
        const { data: fns } = await supabase
          .from("person_ic_functions")
          .select("person_id, function")
          .in("person_id", ids);
        for (const f of fns ?? []) {
          const cur = fnsByPerson.get(f.person_id) ?? [];
          cur.push(f.function as string);
          fnsByPerson.set(f.person_id, cur);
        }
      }
      return (people ?? []).map((p) => ({ ...p, functions: fnsByPerson.get(p.id) ?? [] }));
    },
  });
  return (
    <section>
      <SectionHeader icon={Users} title="Equipo Interesante Compañía" hint={`${data?.length ?? 0} personas`} />
      {!data?.length ? (
        <p className="text-sm text-muted-foreground">Aún no hay miembros del equipo IC registrados.</p>
      ) : (
        <ul className="divide-y divide-border rounded-sm border border-border text-sm">
          {data.map((p: any) => (
            <li key={p.id} className="grid gap-2 px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-baseline">
              <div>
                <Link to="/people/$personId" params={{ personId: p.id }} className="font-display text-lg hover:underline">
                  {p.full_name}
                </Link>
                {p.functions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.functions.map((f: string) => (
                      <Badge key={f} variant="outline" className="rounded-sm text-[10px]">{f}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {p.email && <div>{p.email}</div>}
                {p.phone && <div>{p.phone}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ICContactBillingSection({ ic, onSaved }: { ic: ICRow; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: ic.full_name,
    artistic_name: ic.artistic_name ?? "",
    legal_name: ic.legal_name ?? "",
    nif: ic.nif ?? "",
    address: ic.address ?? "",
    postal_code: ic.postal_code ?? "",
    city: ic.city ?? "",
    province: ic.province ?? "",
    country: ic.country ?? "",
    phone: ic.phone ?? "",
    email: ic.email ?? "",
    email_secondary: ic.email_secondary ?? "",
  });
  const cp: CompanyProfile = ic.company_profile ?? {};
  const [profile, setProfile] = useState<CompanyProfile>({
    iban: cp.iban ?? "",
    billing_email: cp.billing_email ?? "",
    billing_terms: cp.billing_terms ?? "",
    payment_terms_days: cp.payment_terms_days ?? null,
    founded_year: cp.founded_year ?? null,
    office_hours: cp.office_hours ?? "",
    milestones: cp.milestones ?? [],
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("composers")
      .update({
        full_name: form.full_name,
        artistic_name: form.artistic_name || null,
        legal_name: form.legal_name || null,
        nif: form.nif || null,
        address: form.address || null,
        postal_code: form.postal_code || null,
        city: form.city || null,
        province: form.province || null,
        country: form.country || null,
        phone: form.phone || null,
        email: form.email || null,
        email_secondary: form.email_secondary || null,
        company_profile: { ...(ic.company_profile ?? {}), ...profile } as never,
      })
      .eq("id", ic.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Ficha guardada");
    onSaved();
  }

  return (
    <section>
      <SectionHeader icon={Phone} title="Contacto y facturación corporativa" />
      <div className="grid gap-4 md:grid-cols-2">
        <Labeled label="Nombre comercial"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Labeled>
        <Labeled label="Razón social"><Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} /></Labeled>
        <Labeled label="CIF / NIF"><Input value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} /></Labeled>
        <Labeled label="Año fundación"><Input type="number" value={profile.founded_year ?? ""} onChange={(e) => setProfile({ ...profile, founded_year: e.target.value ? Number(e.target.value) : null })} /></Labeled>
        <Labeled label="Dirección"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Labeled>
        <div className="grid grid-cols-2 gap-2">
          <Labeled label="Código postal"><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></Labeled>
          <Labeled label="Provincia"><Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} /></Labeled>
        </div>
        <Labeled label="Ciudad"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Labeled>
        <Labeled label="País"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Labeled>
        <Labeled label="Teléfono"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Labeled>
        <Labeled label="Horario oficina"><Input value={profile.office_hours ?? ""} onChange={(e) => setProfile({ ...profile, office_hours: e.target.value })} placeholder="L-V 10:00–18:00 (Madrid)" /></Labeled>
        <Labeled label="Email general"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Labeled>
        <Labeled label="Email secundario"><Input type="email" value={form.email_secondary} onChange={(e) => setForm({ ...form, email_secondary: e.target.value })} /></Labeled>
        <Labeled label="Email facturación"><Input type="email" value={profile.billing_email ?? ""} onChange={(e) => setProfile({ ...profile, billing_email: e.target.value })} /></Labeled>
        <Labeled label="IBAN"><Input value={profile.iban ?? ""} onChange={(e) => setProfile({ ...profile, iban: e.target.value })} placeholder="ES00 0000 …" /></Labeled>
        <Labeled label="Plazo de pago (días)"><Input type="number" value={profile.payment_terms_days ?? ""} onChange={(e) => setProfile({ ...profile, payment_terms_days: e.target.value ? Number(e.target.value) : null })} /></Labeled>
        <div className="md:col-span-2">
          <Labeled label="Condiciones de facturación / notas">
            <Textarea
              rows={3}
              value={profile.billing_terms ?? ""}
              onChange={(e) => setProfile({ ...profile, billing_terms: e.target.value })}
              placeholder="Forma de pago habitual, comisiones tipo, recargo equivalencia, etc."
            />
          </Labeled>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar ficha corporativa"}</Button>
      </div>
    </section>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="smallcaps text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function ICSocialSection({ ic, onSaved }: { ic: ICRow; onSaved: () => void }) {
  const [value, setValue] = useState<SocialLinks>(ic.social_links ?? {});
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(ic.social_links ?? {}), [ic.social_links]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("composers")
      .update({ social_links: value as never })
      .eq("id", ic.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Enlaces guardados");
    onSaved();
  }

  return (
    <section>
      <SectionHeader icon={Link2} title="Redes sociales y portales corporativos" />
      <SocialLinksBadges value={value} className="mb-4" />
      <SocialLinksEditor value={value} onChange={setValue} />
      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar enlaces"}</Button>
      </div>
    </section>
  );
}

function ICMilestonesSection({ ic, onSaved }: { ic: ICRow; onSaved: () => void }) {
  const [items, setItems] = useState<{ year: number | null; text: string }[]>(
    (ic.company_profile?.milestones ?? []) as { year: number | null; text: string }[],
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const next: CompanyProfile = { ...(ic.company_profile ?? {}), milestones: items };
    const { error } = await supabase
      .from("composers")
      .update({ company_profile: next as never })
      .eq("id", ic.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Hitos guardados");
    onSaved();
  }

  return (
    <section>
      <SectionHeader icon={Calendar} title="Hitos históricos de IC" hint="Para press kit y onboarding" />
      <ul className="space-y-2">
        {items.map((it, idx) => (
          <li key={idx} className="grid grid-cols-[80px_1fr_auto] items-center gap-2">
            <Input
              type="number"
              value={it.year ?? ""}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...it, year: e.target.value ? Number(e.target.value) : null };
                setItems(next);
              }}
              placeholder="Año"
            />
            <Input
              value={it.text}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...it, text: e.target.value };
                setItems(next);
              }}
              placeholder="Primer Goya · Apertura LATAM · Lanzamiento App…"
            />
            <Button variant="ghost" size="sm" onClick={() => setItems(items.filter((_, i) => i !== idx))}>✕</Button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => setItems([...items, { year: null, text: "" }])}>+ Añadir hito</Button>
        <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar hitos"}</Button>
      </div>
    </section>
  );
}

function ICDocumentsSection({ icId }: { icId: string }) {
  return (
    <section>
      <SectionHeader icon={FileText} title="Documentos corporativos" hint="Decks, NDA, plantillas legales…" />
      <EntityDocumentsEditor subjectType="composer" subjectId={icId} title="" />
    </section>
  );
}
