export const PARTNER_TIPOS = ["Productora", "Plataforma", "Medio", "Institución"] as const;
export type PartnerTipo = (typeof PARTNER_TIPOS)[number];

export const PARTNER_SUBTIPOS: Record<PartnerTipo, string[]> = {
  Productora: [
    "Productora de cine",
    "Productora de televisión",
    "Productora de publicidad",
    "Productora de animación",
    "Productora de documental",
    "Productora internacional",
  ],
  Plataforma: [
    "Plataforma de streaming",
    "Cadena de televisión",
    "Plataforma internacional",
    "Plataforma local",
    "AVOD / FAST",
    "Otra plataforma",
  ],
  Medio: [
    "Cadena de televisión",
    "Radio",
    "Prensa escrita",
    "Revista",
    "Medio digital",
    "Podcast",
  ],
  Institución: [
    "Institución pública",
    "Fundación",
    "Asociación profesional",
    "Entidad de gestión",
    "Festival",
    "Escuela / Universidad",
    "Organismo internacional",
  ],
};

export const PARTNER_TIPO_APOYO = [
  "Financiación",
  "Subvenciones",
  "Difusión",
  "Formación",
  "Networking",
  "Distribución",
  "Producción",
  "Premios",
] as const;

export const PARTNER_AMBITOS = ["Local", "Nacional", "Internacional"] as const;
export type PartnerAmbito = (typeof PARTNER_AMBITOS)[number];

export const PARTNER_TIPO_TONE: Record<PartnerTipo, string> = {
  Productora: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  Plataforma: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  Medio: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  Institución: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

export type PartnerRecord = {
  id: string;
  tipo: PartnerTipo;
  subtipo: string | null;
  tipo_apoyo: string[] | null;
  ambito: PartnerAmbito | null;
  nombre: string;
  pais: string | null;
  ciudad: string | null;
  contacto_principal: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  website: string | null;
  relacion_ic: string | null;
  notas: string | null;
  updated_at: string | null;
};