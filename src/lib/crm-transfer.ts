import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/spanish-films-crm";

/**
 * Traspasos entre CRMs (Roster ↔ Cuentas objetivo ↔ Oportunidades ↔ Productoras).
 * Cada función copia los datos ya introducidos para no tener que volver a teclearlos
 * y devuelve el id del registro (creado o ya existente).
 */
export type TransferResult = { id: string; existed: boolean } | null;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function joinNotes(parts: (string | null | undefined)[]) {
  const clean = parts.map((p) => (p ?? "").trim()).filter(Boolean);
  return clean.length ? clean.join("\n") : null;
}

async function findByName(
  table: "target_accounts" | "production_companies" | "composers" | "opportunities",
  column: "name" | "full_name" | "title",
  value: string,
): Promise<string | null> {
  const { data } = await supabase.from(table).select("id").ilike(column, value).limit(1).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

const ROLE_TO_ROSTER_KIND: Record<string, "composer" | "artista" | "productor_musical" | "otros"> = {
  composer: "composer",
  artist: "artista",
  supervisor: "otros",
  specialist: "otros",
  curator: "otros",
  other: "otros",
  ic_company: "otros",
};

const ROSTER_KIND_TO_ROLE: Record<string, "composer" | "artist" | "other"> = {
  composer: "composer",
  artista: "artist",
  productor_musical: "other",
  otros: "other",
};

export type ComposerLike = {
  id: string;
  full_name: string;
  artistic_name?: string | null;
  roster_role?: string | null;
  bio_short?: string | null;
  internal_notes?: string | null;
  tags?: string[] | null;
  portal_url?: string | null;
  reel_url?: string | null;
  prospect_next_action_date?: string | null;
  agent_person_id?: string | null;
};

export type AccountLike = {
  id: string;
  name: string;
  account_type: string;
  roster_kind?: string | null;
  sector?: string | null;
  website?: string | null;
  notes?: string | null;
  responsible_person_id?: string | null;
  production_company_id?: string | null;
  next_step?: string | null;
  next_step_date?: string | null;
};

export type CompanyLike = {
  id: string;
  name: string;
  website?: string | null;
  notes?: string | null;
  city?: string | null;
  country?: string | null;
  contact_name?: string | null;
  email?: string | null;
};

export type OpportunityLike = {
  id: string;
  title: string;
  kind?: string | null;
  partner_name?: string | null;
  partner_company_id?: string | null;
  responsible_person_id?: string | null;
  notes?: string | null;
  expected_close_date?: string | null;
};

/** Roster → Cuentas objetivo */
export async function composerToTargetAccount(c: ComposerLike): Promise<TransferResult> {
  const name = (c.artistic_name || c.full_name || "").trim();
  if (!name) return toast.error("La ficha no tiene nombre"), null;
  const existing = await findByName("target_accounts", "name", name);
  if (existing) {
    toast.info(`"${name}" ya está en Cuentas objetivo`);
    return { id: existing, existed: true };
  }
  const { data, error } = await supabase
    .from("target_accounts")
    .insert({
      name,
      account_type: "roster",
      roster_kind: ROSTER_KIND_FROM_ROLE(c.roster_role),
      website: c.portal_url ?? c.reel_url ?? null,
      sector: (c.tags ?? []).join(", ") || null,
      next_step_date: c.prospect_next_action_date ?? null,
      notes: joinNotes([c.bio_short, c.internal_notes, `Origen: ficha de roster "${c.full_name}"`]),
    })
    .select("id")
    .single();
  if (error || !data) return toast.error(error?.message ?? "No se pudo crear la cuenta"), null;
  toast.success(`Cuenta objetivo creada desde el roster: ${name}`);
  return { id: data.id, existed: false };
}

function ROSTER_KIND_FROM_ROLE(role: string | null | undefined) {
  return ROLE_TO_ROSTER_KIND[role ?? "other"] ?? "otros";
}

/** Roster → Oportunidades (crea la oportunidad y añade a la persona como candidata) */
export async function composerToOpportunity(c: ComposerLike): Promise<TransferResult> {
  const name = (c.artistic_name || c.full_name || "").trim();
  if (!name) return toast.error("La ficha no tiene nombre"), null;
  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      title: name,
      kind: "pitch",
      partner_name: name,
      detected_date: today(),
      expected_close_date: c.prospect_next_action_date ?? null,
      notes: joinNotes([c.bio_short, c.internal_notes, `Origen: ficha de roster "${c.full_name}"`]),
    })
    .select("id")
    .single();
  if (error || !data) return toast.error(error?.message ?? "No se pudo crear la oportunidad"), null;
  await supabase.from("opportunity_candidates").insert({ opportunity_id: data.id, composer_id: c.id });
  toast.success(`Oportunidad creada con ${name} como candidato/a`);
  return { id: data.id, existed: false };
}

/** Cuentas objetivo → Roster */
export async function targetAccountToComposer(a: AccountLike): Promise<TransferResult> {
  const name = a.name.trim();
  if (!name) return toast.error("La cuenta no tiene nombre"), null;
  const existing = await findByName("composers", "full_name", name);
  if (existing) {
    toast.info(`"${name}" ya tiene ficha en el roster`);
    return { id: existing, existed: true };
  }
  const { data, error } = await supabase
    .from("composers")
    .insert({
      full_name: name,
      slug: slugify(name),
      roster_role: ROSTER_KIND_TO_ROLE[a.roster_kind ?? "otros"] ?? "other",
      representation_status: "en_negociacion",
      portal_url: a.website ?? null,
      prospect_next_action_date: a.next_step_date ?? null,
      internal_notes: joinNotes([
        a.sector ? `Sector: ${a.sector}` : null,
        a.next_step ? `Próximo paso: ${a.next_step}` : null,
        a.notes,
        `Origen: cuenta objetivo "${a.name}"`,
      ]),
    })
    .select("id")
    .single();
  if (error || !data) return toast.error(error?.message ?? "No se pudo crear la ficha"), null;
  toast.success(`Ficha de roster creada desde la cuenta: ${name}`);
  return { id: data.id, existed: false };
}

/** Cuentas objetivo → Productoras (y deja la cuenta vinculada a la productora) */
export async function targetAccountToCompany(a: AccountLike): Promise<TransferResult> {
  const name = a.name.trim();
  if (!name) return toast.error("La cuenta no tiene nombre"), null;
  if (a.production_company_id) {
    toast.info("Esta cuenta ya está vinculada a una productora");
    return { id: a.production_company_id, existed: true };
  }
  const existing = await findByName("production_companies", "name", name);
  let companyId = existing;
  if (!companyId) {
    const { data, error } = await supabase
      .from("production_companies")
      .insert({
        name,
        website: a.website ?? null,
        notes: joinNotes([a.sector ? `Sector: ${a.sector}` : null, a.notes, `Origen: cuenta objetivo "${a.name}"`]),
      })
      .select("id")
      .single();
    if (error || !data) return toast.error(error?.message ?? "No se pudo crear la productora"), null;
    companyId = data.id;
  }
  await supabase.from("target_accounts").update({ production_company_id: companyId }).eq("id", a.id);
  toast.success(existing ? `Cuenta vinculada a la productora existente: ${name}` : `Productora creada: ${name}`);
  return { id: companyId, existed: Boolean(existing) };
}

/** Productoras → Cuentas objetivo */
export async function companyToTargetAccount(c: CompanyLike): Promise<TransferResult> {
  const name = c.name.trim();
  if (!name) return toast.error("La productora no tiene nombre"), null;
  const { data: linked } = await supabase
    .from("target_accounts")
    .select("id")
    .eq("production_company_id", c.id)
    .limit(1)
    .maybeSingle();
  if (linked) {
    toast.info(`"${name}" ya está en Cuentas objetivo`);
    return { id: linked.id, existed: true };
  }
  const { data, error } = await supabase
    .from("target_accounts")
    .insert({
      name,
      account_type: "productora",
      production_company_id: c.id,
      website: c.website ?? null,
      sector: [c.city, c.country].filter(Boolean).join(" · ") || null,
      notes: joinNotes([
        c.contact_name ? `Contacto: ${c.contact_name}` : null,
        c.email ? `Email: ${c.email}` : null,
        c.notes,
        `Origen: ficha de productora "${c.name}"`,
      ]),
    })
    .select("id")
    .single();
  if (error || !data) return toast.error(error?.message ?? "No se pudo crear la cuenta"), null;
  toast.success(`Cuenta objetivo creada desde la productora: ${name}`);
  return { id: data.id, existed: false };
}

/** Productoras → Oportunidades */
export async function companyToOpportunity(c: CompanyLike): Promise<TransferResult> {
  const name = c.name.trim();
  if (!name) return toast.error("La productora no tiene nombre"), null;
  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      title: name,
      kind: "fichaje_productora",
      partner_company_id: c.id,
      partner_name: name,
      detected_date: today(),
      notes: joinNotes([
        c.contact_name ? `Contacto: ${c.contact_name}` : null,
        c.email ? `Email: ${c.email}` : null,
        c.notes,
        `Origen: ficha de productora "${c.name}"`,
      ]),
    })
    .select("id")
    .single();
  if (error || !data) return toast.error(error?.message ?? "No se pudo crear la oportunidad"), null;
  toast.success(`Oportunidad creada desde la productora: ${name}`);
  return { id: data.id, existed: false };
}

/** Oportunidades → Cuentas objetivo */
export async function opportunityToTargetAccount(o: OpportunityLike): Promise<TransferResult> {
  const name = (o.partner_name || o.title || "").trim();
  if (!name) return toast.error("La oportunidad no tiene nombre"), null;
  const existing = await findByName("target_accounts", "name", name);
  if (existing) {
    toast.info(`"${name}" ya está en Cuentas objetivo`);
    return { id: existing, existed: true };
  }
  const { data, error } = await supabase
    .from("target_accounts")
    .insert({
      name,
      account_type: o.partner_company_id ? "productora" : o.kind === "fichaje" ? "roster" : "otros",
      roster_kind: o.kind === "fichaje" ? "composer" : null,
      production_company_id: o.partner_company_id ?? null,
      responsible_person_id: o.responsible_person_id ?? null,
      next_step_date: o.expected_close_date ?? null,
      notes: joinNotes([o.notes, `Origen: oportunidad "${o.title}"`]),
    })
    .select("id")
    .single();
  if (error || !data) return toast.error(error?.message ?? "No se pudo crear la cuenta"), null;
  toast.success(`Cuenta objetivo creada desde la oportunidad: ${name}`);
  return { id: data.id, existed: false };
}

/** Oportunidades → Roster */
export async function opportunityToComposer(o: OpportunityLike): Promise<TransferResult> {
  const name = (o.partner_name || o.title || "").trim();
  if (!name) return toast.error("La oportunidad no tiene nombre"), null;
  const existing = await findByName("composers", "full_name", name);
  if (existing) {
    toast.info(`"${name}" ya tiene ficha en el roster`);
    return { id: existing, existed: true };
  }
  const { data, error } = await supabase
    .from("composers")
    .insert({
      full_name: name,
      slug: slugify(name),
      roster_role: "composer",
      representation_status: "en_negociacion",
      prospect_target_date: o.expected_close_date ?? null,
      internal_notes: joinNotes([o.notes, `Origen: oportunidad "${o.title}"`]),
    })
    .select("id")
    .single();
  if (error || !data) return toast.error(error?.message ?? "No se pudo crear la ficha"), null;
  toast.success(`Ficha de roster creada desde la oportunidad: ${name}`);
  return { id: data.id, existed: false };
}

/** Oportunidades → Productoras */
export async function opportunityToCompany(o: OpportunityLike): Promise<TransferResult> {
  const name = (o.partner_name || o.title || "").trim();
  if (!name) return toast.error("La oportunidad no tiene nombre"), null;
  if (o.partner_company_id) {
    toast.info("Esta oportunidad ya está vinculada a una productora");
    return { id: o.partner_company_id, existed: true };
  }
  const existing = await findByName("production_companies", "name", name);
  let companyId = existing;
  if (!companyId) {
    const { data, error } = await supabase
      .from("production_companies")
      .insert({ name, notes: joinNotes([o.notes, `Origen: oportunidad "${o.title}"`]) })
      .select("id")
      .single();
    if (error || !data) return toast.error(error?.message ?? "No se pudo crear la productora"), null;
    companyId = data.id;
  }
  await supabase.from("opportunities").update({ partner_company_id: companyId }).eq("id", o.id);
  toast.success(existing ? `Oportunidad vinculada a la productora: ${name}` : `Productora creada: ${name}`);
  return { id: companyId, existed: Boolean(existing) };
}
