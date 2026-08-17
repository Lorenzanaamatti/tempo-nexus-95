export const PARTNER_CATEGORY_LABEL = {
  productora: "Productora",
  plataforma: "Plataforma",
  director: "Director",
  proveedor: "Proveedor",
  otro: "Otro",
} as const;

export type PartnerCategory = keyof typeof PARTNER_CATEGORY_LABEL;

export const PARTNER_CATEGORIES = Object.keys(PARTNER_CATEGORY_LABEL) as PartnerCategory[];

export const PARTNER_CATEGORY_TONE: Record<PartnerCategory, string> = {
  productora: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  plataforma: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  director: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  proveedor: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  otro: "bg-muted text-foreground",
};

export type PartnerRow = {
  key: string;
  id: string;
  category: PartnerCategory;
  name: string;
  city: string | null;
  country: string | null;
  contact: string | null;
  updatedAt: string | null;
};

export function partnerKey(category: PartnerCategory, id: string) {
  return `${category}__${id}`;
}

export function parsePartnerKey(key: string): { category: PartnerCategory; id: string } | null {
  const [cat, id] = key.split("__");
  if (!id || !PARTNER_CATEGORIES.includes(cat as PartnerCategory)) return null;
  return { category: cat as PartnerCategory, id };
}
