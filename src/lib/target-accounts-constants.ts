export const TARGET_ACCOUNT_STATUSES = [
  "sin_contacto",
  "contactado",
  "reunion",
  "propuesta_enviada",
  "cliente_activo",
  "en_pausa",
  "descartado",
] as const;
export type TargetAccountStatus = (typeof TARGET_ACCOUNT_STATUSES)[number];

export const TARGET_ACCOUNT_STATUS_LABEL: Record<TargetAccountStatus, string> = {
  sin_contacto: "Sin contacto",
  contactado: "Contactado",
  reunion: "Reunión",
  propuesta_enviada: "Propuesta enviada",
  cliente_activo: "Cliente activo",
  en_pausa: "En pausa",
  descartado: "Descartado",
};

// Tailwind tone classes per status (semantic tokens)
export const TARGET_ACCOUNT_STATUS_TONE: Record<TargetAccountStatus, string> = {
  sin_contacto: "bg-muted text-muted-foreground border-border",
  contactado: "bg-secondary text-secondary-foreground border-border",
  reunion: "bg-accent text-accent-foreground border-border",
  propuesta_enviada: "bg-primary/15 text-primary border-primary/40",
  cliente_activo: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40 dark:text-emerald-300",
  en_pausa: "bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-300",
  descartado: "bg-destructive/10 text-destructive border-destructive/40",
};

export const TARGET_ACCOUNT_PRIORITIES = ["alta", "media", "baja"] as const;
export type TargetAccountPriority = (typeof TARGET_ACCOUNT_PRIORITIES)[number];

export const TARGET_ACCOUNT_PRIORITY_LABEL: Record<TargetAccountPriority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export const TARGET_ACCOUNT_PRIORITY_TONE: Record<TargetAccountPriority, string> = {
  alta: "bg-destructive/10 text-destructive border-destructive/40",
  media: "bg-secondary text-secondary-foreground border-border",
  baja: "bg-muted text-muted-foreground border-border",
};

export const TARGET_ACCOUNT_TYPES = [
  "roster",
  "productora",
  "plataforma",
  "otros",
] as const;
export type TargetAccountType = (typeof TARGET_ACCOUNT_TYPES)[number];

export const TARGET_ACCOUNT_TYPE_LABEL: Record<TargetAccountType, string> = {
  roster: "Roster",
  productora: "Productora",
  plataforma: "Plataforma",
  otros: "Otros",
};

export const TARGET_ACCOUNT_TYPE_TONE: Record<TargetAccountType, string> = {
  roster: "bg-primary/15 text-primary border-primary/40",
  productora: "bg-secondary text-secondary-foreground border-border",
  plataforma: "bg-accent text-accent-foreground border-border",
  otros: "bg-muted text-muted-foreground border-border",
};

export const TARGET_ACCOUNT_ROSTER_KINDS = [
  "composer",
  "artista",
  "productor_musical",
  "otros",
] as const;
export type TargetAccountRosterKind = (typeof TARGET_ACCOUNT_ROSTER_KINDS)[number];

export const TARGET_ACCOUNT_ROSTER_KIND_LABEL: Record<TargetAccountRosterKind, string> = {
  composer: "Compositor/a",
  artista: "Artista",
  productor_musical: "Productor/a musical",
  otros: "Otros",
};