/** Catálogos del módulo de Pitches (/oportunidades/pitches). */

export const PITCH_TIPOS = [
  "Música original",
  "Sincronización",
  "Supervisión musical",
  "Asesoría",
  "Otro",
] as const;
export type PitchTipo = (typeof PITCH_TIPOS)[number];

export const PITCH_ESTADOS = [
  "En preparación",
  "Enviado",
  "En conversación",
  "Propuesta formal",
  "Ganado",
  "Perdido",
  "Pausado",
] as const;
export type PitchEstado = (typeof PITCH_ESTADOS)[number];

export const PITCH_ESTADO_CLASS: Record<string, string> = {
  "En preparación": "bg-muted text-muted-foreground",
  Enviado: "bg-sky-100 text-sky-900",
  "En conversación": "bg-amber-100 text-amber-900",
  "Propuesta formal": "bg-indigo-100 text-indigo-900",
  Ganado: "bg-emerald-100 text-emerald-900",
  Perdido: "bg-destructive/10 text-destructive",
  Pausado: "bg-zinc-200 text-zinc-700",
};

export const PITCH_ESTADOS_ABIERTOS: readonly string[] = [
  "En preparación",
  "Enviado",
  "En conversación",
  "Propuesta formal",
];