export const MARKETING_LANGUAGES = ["es", "en", "ca", "fr", "pt", "other"] as const;
export type MarketingLanguage = (typeof MARKETING_LANGUAGES)[number];
export const MARKETING_LANGUAGE_LABEL: Record<MarketingLanguage, string> = {
  es: "Español",
  en: "Inglés",
  ca: "Català",
  fr: "Francés",
  pt: "Portugués",
  other: "Otro",
};

export const DECK_PURPOSES = ["corto", "largo", "generico", "por_cliente", "sector"] as const;
export type DeckPurpose = (typeof DECK_PURPOSES)[number];
export const DECK_PURPOSE_LABEL: Record<DeckPurpose, string> = {
  corto: "Corto (pitch rápido)",
  largo: "Largo (presentación completa)",
  generico: "Genérico",
  por_cliente: "Personalizado por cliente",
  sector: "Por sector",
};
export const DECK_PURPOSE_TONE: Record<DeckPurpose, string> = {
  corto: "border-amber-400/40 text-amber-300",
  largo: "border-indigo-400/40 text-indigo-300",
  generico: "border-slate-400/40 text-slate-300",
  por_cliente: "border-emerald-400/40 text-emerald-300",
  sector: "border-rose-400/40 text-rose-300",
};

export const OUTREACH_TEMPLATE_KINDS = [
  "cold",
  "follow_up",
  "propuesta_economica",
  "nda",
  "agradecimiento",
  "otro",
] as const;
export type OutreachTemplateKind = (typeof OUTREACH_TEMPLATE_KINDS)[number];
export const OUTREACH_TEMPLATE_KIND_LABEL: Record<OutreachTemplateKind, string> = {
  cold: "Cold outreach",
  follow_up: "Follow-up",
  propuesta_economica: "Propuesta económica",
  nda: "NDA",
  agradecimiento: "Agradecimiento",
  otro: "Otro",
};

export const PRESS_KIT_SCOPES = ["ic_global", "compositor"] as const;
export type PressKitScope = (typeof PRESS_KIT_SCOPES)[number];
export const PRESS_KIT_SCOPE_LABEL: Record<PressKitScope, string> = {
  ic_global: "IC global",
  compositor: "Compositor",
};

export const CASE_STUDY_VISIBILITIES = ["interna", "externa"] as const;
export type CaseStudyVisibility = (typeof CASE_STUDY_VISIBILITIES)[number];
export const CASE_STUDY_VISIBILITY_LABEL: Record<CaseStudyVisibility, string> = {
  interna: "Interna",
  externa: "Externa (compartible)",
};

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
}